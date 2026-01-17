// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { opReturn as opreturnConfig } from 'config/opreturn';
import { chronik as chronikConfig } from 'config/chronik';
import { previewAddress } from 'helpers';
import { getStackArray } from 'ecash-lib';
import {
    getTypeAndHashFromOutputScript,
    encodeOutputScript,
    encodeCashAddress,
    decodeCashAddress,
} from 'ecashaddrjs';
import {
    decimalizeTokenAmount,
    undecimalizeTokenAmount,
    TokenUtxo,
    SlpDecimals,
    CashtabTx,
    toXec,
} from 'wallet';
import { ChronikClient, Tx, TokenTxType, GenesisInfo } from 'chronik-client';
import { CashtabCachedTokenInfo } from 'config/CashtabCache';
import appConfig from 'config/app';
import { opReturn } from 'config/opreturn';
import { scriptOps } from 'ecash-agora';
import { Script, fromHex, OP_0 } from 'ecash-lib';
import { getRenderedTokenType, RenderedTokenType } from 'token-protocols';
import { getEmppAppActions } from 'opreturn';
import { decimalizedTokenQtyToLocaleFormat } from 'formatting';

const CHRONIK_MAX_PAGE_SIZE = 200;

interface Alias {
    alias: string;
}
export const isAliasRegistered = (
    registeredAliases: Alias[],
    alias: string,
): boolean => {
    for (let i = 0; i < registeredAliases.length; i++) {
        if (
            registeredAliases[i].alias.toString().toLowerCase() ===
            alias.toLowerCase()
        ) {
            console.error(`Alias (${alias}) is registered`);
            return true;
        }
    }
    return false;
};

export enum XecTxType {
    Received = 'Received',
    Sent = 'Sent',
    Staking = 'Staking Reward',
    Coinbase = 'Coinbase Reward',
}

export enum ParsedTokenTxType {
    AgoraOffer = 'Agora Offer',
    AgoraCancel = 'Agora Cancel',
    AgoraBuy = 'Agora Buy',
    AgoraSale = 'Agora Sale',
    FanOut = 'Fan Out',
}

interface AliasAction {
    alias: string;
    address: string;
}
interface AirdropAction {
    tokenId: string;
    msg?: string;
}
interface PaybuttonAction {
    data: string;
    nonce: string;
}
interface NftoaAction {
    data: string;
    nonce: string;
}
interface EcashChatAction {
    msg: string;
}
interface PaywallAction {
    sharedArticleTxid: string;
}
interface EcashChatArticleReply {
    replyArticleTxid: string;
    msg: string;
}
interface CashtabMsgAction {
    msg: string;
}
export interface SolAddrAction {
    solAddr: string;
}
export interface XecxAction {
    minBalanceTokenSatoshisToReceivePaymentThisRound: number;
    eligibleTokenSatoshis: number;
    ineligibleTokenSatoshis: number;
    excludedHoldersCount: number;
}
export interface UnknownAction {
    stack: string;
    decoded: string;
}
export interface AppAction {
    lokadId: string;
    app: string;
    isValid?: boolean;
    action?:
        | AliasAction
        | AirdropAction
        | PaybuttonAction
        | NftoaAction
        | EcashChatAction
        | PaywallAction
        | EcashChatArticleReply
        | CashtabMsgAction
        | XecxAction
        | SolAddrAction
        | UnknownAction;
}

/**
 * Cashtab renders an action block for each token entry
 * We get everything we need for the render in this function
 * async and store in this interface so we keep rendering fast
 */
export interface ParsedTokenEntry {
    /**
     * tokenId for this token Entry
     */
    tokenId: string;
    /**
     * See getRenderedTokenType in token-protocols
     * Human-readable token type, i.e. "NFT" or "Collection"
     */
    renderedTokenType: RenderedTokenType;
    /**
     * Same as txType from chronik-client, except we will
     * occasionally overwrite SEND to be BURN if this
     * token entry burns tokens
     */
    renderedTxType: string;
    /**
     * The amount of tokenSatoshis associated with this tokenEntry
     * e.g. the amount sent, or the amount minted, or the amount burned,
     * or the amount purchased on agora, or the amount sold on agora
     *
     * Should be a bigint but jest can't stringify bigints, so we use a string
     * simpler handling
     */
    tokenSatoshis: string;
    /**
     * If this is a Collection token that is creating mint tokens,
     * parse how many are created
     */
    nftFanInputsCreated?: number;
}
export interface ParsedTx {
    recipients: string[];
    satoshisSent: number;
    stackArray: string[];
    xecTxType: XecTxType;
    appActions: AppAction[];
    replyAddress?: string;
    /**
     * Each token entry is associated with its own action, tokenId, token type, and quantity
     * Same length as tokenEntries of this tx
     */
    parsedTokenEntries: ParsedTokenEntry[];
}
/**
 * Parse a Tx object for rendering in Cashtab
 * @param tx Tx object from chronik-client
 * @param hashes array of wallet hashes, one for each path
 */
export const parseTx = (tx: Tx, hashes: string[]): ParsedTx => {
    const { inputs, outputs, isCoinbase, tokenEntries, txid } = tx;

    // Assign defaults
    let incoming = true;
    let stackArray: string[] = [];

    const destinationAddresses: Set<string> = new Set();

    // Parse inputs for incoming/outgoing status
    // Also parse for agora actions
    for (const hash of hashes) {
        // See if any of this txs inputs came from a hash in this wallet
        const thisInputInThisWallet = inputs.find(
            input =>
                typeof input.outputScript !== 'undefined' &&
                input.outputScript.includes(hash),
        );
        if (typeof thisInputInThisWallet !== 'undefined') {
            // If even one does, we call it an outgoing tx
            incoming = false;
            break;
        }
    }

    let isTokenTx = false;
    let isAgoraCancel = false;
    let isAgoraPurchase = false;
    let isAgoraAdSetup = false;
    let isAgoraOffer = false;
    for (const input of inputs) {
        if (typeof input.token !== 'undefined') {
            // Flag if we have any token inputs for XecTxType assignment
            isTokenTx = true;
            // If this is a token tx, iterate over inputs for Agora info
            try {
                const { type } = getTypeAndHashFromOutputScript(
                    // we try..catch for this not existing
                    // not good practice but we are just implementing ts here now, refactor later
                    input.outputScript as string,
                );
                if (type === 'p2sh') {
                    // Check if this is a cancellation
                    // See agora.ts from ecash-agora lib
                    // For now, I don't think it makes sense to have an 'isCanceled' method from ecash-agora
                    // This is a pretty specific application
                    const ops = scriptOps(
                        new Script(fromHex(input.inputScript)),
                    );
                    // isCanceled is always the last pushop (before redeemScript)
                    const opIsCanceled = ops[ops.length - 2];

                    const isCanceled = opIsCanceled === OP_0;

                    if (isCanceled) {
                        isAgoraCancel = true;
                    } else {
                        // We have a cashtab-created agora-offered input going to a Cashtab wallet
                        // Buy or sell depends on whether the XEC is sent or received
                        isAgoraPurchase = true;
                    }
                }
            } catch {
                console.error(
                    `Error in getTypeAndHashFromOutputScript(${input.outputScript}) from txid ${txid}`,
                );
                // Do not parse it as an agora tx
            }
            // We don't need to find any other inputs for this case
            continue;
        }
    }

    // Parse outputs
    let change = 0n;
    let outputSatoshis = 0n;
    let receivedSatoshis = 0n;
    let selfSendTx = true;

    for (const output of outputs) {
        const { outputScript, sats } = output;
        outputSatoshis += sats;
        if (outputScript.startsWith(opreturnConfig.opReturnPrefixHex)) {
            stackArray = getStackArray(outputScript);
            continue;
        }
        let walletIncludesThisOutputScript = false;
        for (const hash of hashes) {
            if (outputScript.includes(hash)) {
                walletIncludesThisOutputScript = true;
                change += sats;
                receivedSatoshis += sats;
            }
        }
        if (!walletIncludesThisOutputScript) {
            try {
                const destinationAddress = encodeOutputScript(outputScript);
                destinationAddresses.add(destinationAddress);
            } catch {
                // Skip non-address recipients
            }
            selfSendTx = false;
        }
    }

    // Parse app action
    const appActions: AppAction[] = [];
    if (stackArray.length !== 0) {
        const lokadId = stackArray[0];
        switch (lokadId) {
            case opReturn.appPrefixesHex.eToken: {
                // slpv1
                // Do nothing, handle this in token actions
                break;
            }
            case opReturn.opReserved: {
                // EMPP
                // spec: https://ecashbuilders.notion.site/eCash-Multi-Pushdata-Protocol-11e1b991071c4a77a3e948ba604859ac

                const emppActions = getEmppAppActions(stackArray);
                for (const emppAction of emppActions) {
                    appActions.push(emppAction);
                }
                break;
            }
            case opReturn.appPrefixesHex.aliasRegistration: {
                const app = 'alias';
                // Magic numbers per spec
                // https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/ecash-alias.md
                if (
                    stackArray[1] === '00' &&
                    typeof stackArray[2] !== 'undefined' &&
                    typeof stackArray[3] !== 'undefined' &&
                    stackArray[3].length === 42
                ) {
                    const addressTypeByte = stackArray[3].slice(0, 2);
                    let addressType: 'p2pkh' | 'p2sh';
                    if (addressTypeByte === '00') {
                        addressType = 'p2pkh';
                    } else if (addressTypeByte === '08') {
                        addressType = 'p2sh';
                    } else {
                        appActions.push({
                            app,
                            lokadId,
                            isValid: false,
                        });
                        break;
                    }
                    const aliasAddress = encodeCashAddress(
                        'ecash',
                        addressType,
                        stackArray[3].slice(1),
                    );
                    appActions.push({
                        app,
                        lokadId,
                        isValid: true,
                        action: {
                            alias: Buffer.from(stackArray[2], 'hex').toString(
                                'utf8',
                            ),
                            address: aliasAddress,
                        },
                    });
                    break;
                }
                appActions.push({ app, lokadId, isValid: false });
                break;
            }
            case opReturn.appPrefixesHex.airdrop: {
                const app = '🪂Airdrop';
                if (
                    typeof stackArray[1] !== 'undefined' &&
                    stackArray[1].length === 64
                ) {
                    // We have an on-spec airdrop tx if OP_RETURN prefix and tokenID at first push after prefix
                    const airdroppedTokenId = stackArray[1];
                    let airdropMsg = '';
                    if (typeof stackArray[2] !== 'undefined') {
                        // Legacy airdrop msg would be at [3] after cashtab msg prefix push
                        // on-spec airdrop msg would be at [2]
                        airdropMsg =
                            stackArray[2] === opReturn.appPrefixesHex.cashtab &&
                            typeof stackArray[3] !== 'undefined'
                                ? Buffer.from(stackArray[3], 'hex').toString(
                                      'utf8',
                                  )
                                : Buffer.from(stackArray[2], 'hex').toString(
                                      'utf8',
                                  );
                        const airdropAction: AirdropAction = {
                            tokenId: airdroppedTokenId,
                            msg: airdropMsg,
                        };
                        appActions.push({
                            app,
                            lokadId,
                            isValid: true,
                            action: airdropAction,
                        });
                        break;
                    }
                    const airdropAction: AirdropAction = {
                        tokenId: airdroppedTokenId,
                    };
                    appActions.push({
                        app,
                        lokadId,
                        isValid: true,
                        action: airdropAction,
                    });
                    break;
                }
                appActions.push({
                    app,
                    lokadId,
                    isValid: false,
                });
                break;
            }
            case opReturn.appPrefixesHex.cashtabEncrypted: {
                // Parsing is not supported but we do know the lokad
                const app = 'Cashtab Encrypted (deprecated)';
                appActions.push({ app, lokadId });
                break;
            }
            case opReturn.appPrefixesHex.swap: {
                // Parsing is not supported but we do know the lokad
                const app = 'SWaP';
                appActions.push({ app, lokadId });
                break;
            }
            case opReturn.appPrefixesHex.paybutton: {
                // PayButton tx
                // https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/paybutton.md
                const app = 'PayButton';
                if (
                    stackArray[1] === '00' &&
                    typeof stackArray[2] !== 'undefined' &&
                    typeof stackArray[3] !== 'undefined'
                ) {
                    // Valid PayButtonTx
                    appActions.push({
                        lokadId,
                        app,
                        isValid: true,
                        action: {
                            data:
                                stackArray[2] !== '00'
                                    ? Buffer.from(
                                          stackArray[2],
                                          'hex',
                                      ).toString('utf8')
                                    : '',
                            nonce: stackArray[3] !== '00' ? stackArray[3] : '',
                        },
                    });
                } else {
                    appActions.push({
                        app,
                        lokadId,
                        isValid: false,
                    });
                }
                break;
            }
            case opReturn.appPrefixesHex.nftoa: {
                // NFToa tx
                // https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/nftoa.md
                const app = 'NFToa';
                if (typeof stackArray[1] !== 'undefined') {
                    // Valid NFToaTx
                    appActions.push({
                        lokadId,
                        app,
                        isValid: true,
                        action: {
                            data: Buffer.from(stackArray[1], 'hex').toString(
                                'utf8',
                            ),
                            nonce:
                                typeof stackArray[2] !== 'undefined'
                                    ? stackArray[2]
                                    : '',
                        },
                    });
                } else {
                    appActions.push({
                        app,
                        lokadId,
                        isValid: false,
                    });
                }
                break;
            }
            case opReturn.appPrefixesHex.eCashChat: {
                const app = 'eCashChat';
                if (typeof stackArray[1] !== 'undefined') {
                    appActions.push({
                        app,
                        lokadId,
                        isValid: true,
                        action: {
                            msg: Buffer.from(stackArray[1], 'hex').toString(
                                'utf8',
                            ),
                        },
                    });
                } else {
                    appActions.push({
                        app,
                        lokadId,
                        isValid: false,
                    });
                }
                break;
            }
            case opReturn.appPrefixesHex.paywallPayment: {
                const app = 'Paywall';
                if (typeof stackArray[1] !== 'undefined') {
                    appActions.push({
                        app,
                        lokadId,
                        isValid: true,
                        action: { sharedArticleTxid: stackArray[1] },
                    });
                } else {
                    appActions.push({
                        app,
                        lokadId,
                        isValid: false,
                    });
                }
                break;
            }
            // eCashChat authentication txs consists of authPrefixHex + a random string
            // Other apps can use this same prefix followed by an authentication identifier of their choosing
            case opReturn.appPrefixesHex.authPrefixHex: {
                const app = 'Auth';
                appActions.push({ app, lokadId, isValid: true });
                break;
            }
            case opReturn.appPrefixesHex.eCashChatArticle: {
                let app = 'eCashChat Article';
                if (typeof stackArray[1] !== 'undefined') {
                    // If this is a reply to a blog post then index 2 is txid of article and index 3 is the reply
                    if (
                        stackArray[1] ===
                        opReturn.appPrefixesHex.eCashChatArticleReply
                    ) {
                        app += ' Reply';
                        if (stackArray.length === 4) {
                            appActions.push({
                                app,
                                lokadId,
                                isValid: true,
                                action: {
                                    replyArticleTxid: stackArray[2],
                                    msg: Buffer.from(
                                        stackArray[3],
                                        'hex',
                                    ).toString('utf8'),
                                },
                            });
                        } else {
                            appActions.push({
                                app,
                                lokadId,
                                isValid: false,
                            });
                        }
                    } else {
                        appActions.push({
                            app,
                            lokadId,
                            isValid: true,
                            // Still no action for this type, we just know article created
                        });
                    }
                } else {
                    appActions.push({
                        app,
                        lokadId,
                        isValid: false,
                    });
                }
                break;
            }
            case opReturn.appPrefixesHex.cashtab: {
                const app = 'Cashtab Msg';
                if (typeof stackArray[1] !== 'undefined') {
                    appActions.push({
                        app,
                        lokadId,
                        isValid: true,
                        action: {
                            msg: Buffer.from(stackArray[1], 'hex').toString(
                                'utf8',
                            ),
                        },
                    });
                } else {
                    appActions.push({ app, lokadId, isValid: false });
                }
                break;
            }
            default: {
                // Test for some sort of lokad id
                const LOKAD_BYTES_STR_LENGTH = 8;
                const hasLokad =
                    stackArray[0].length === LOKAD_BYTES_STR_LENGTH;
                const lokadId = hasLokad ? stackArray[0] : '';
                // Unsupported lokad prefixes or misc OP_RETURN msgs
                // e.g. a msg sent by ElectrumABC
                // Attempt to utf8 decode each push
                const decodedTest = [];
                for (const el of stackArray) {
                    decodedTest.push(Buffer.from(el, 'hex').toString('utf8'));
                }
                appActions.push({
                    lokadId,
                    app: hasLokad ? 'unknown' : 'none',
                    action: {
                        stack: stackArray.join(' '),
                        decoded: decodedTest.join(' '),
                    },
                });
                break;
            }
        }
    }

    const satoshisSent = selfSendTx
        ? outputSatoshis
        : isCoinbase
          ? change
          : incoming
            ? receivedSatoshis
            : outputSatoshis - change;

    // Parse for an SLP 1 agora ad setup tx
    // These are SLP1 SEND txs where
    // 1. token utxo is > dust
    // 2. recipient is p2sh address
    const recipients = Array.from(destinationAddresses);
    if (satoshisSent > appConfig.dustSats) {
        if (recipients.length === 1) {
            // Ad setup tx has 1 recipient

            // Ad setup tx has p2sh recipient
            const listingScript = recipients[0];
            try {
                const { type } = decodeCashAddress(listingScript);
                isAgoraAdSetup = type === 'p2sh' && isTokenTx;
            } catch (err) {
                console.error(
                    `Error in decodeCashAddress(${listingScript}, true)`,
                    err,
                );
                // No action, will be parsed as not AgoraAdSetup
            }
        }
    }

    // Parse for ALP agora listing tx
    if (!isAgoraAdSetup && !isAgoraCancel && !isAgoraPurchase) {
        // If this is not already classified as agora
        if (
            stackArray.length === 3 &&
            stackArray[0] === '50' &&
            stackArray[1].startsWith('41') &&
            stackArray[2].startsWith('534c5032')
        ) {
            // and this is an empp ALP and agora tx
            if (recipients.length >= 1) {
                try {
                    const { type } = decodeCashAddress(recipients[0]);
                    if (type === 'p2sh') {
                        isAgoraOffer = true;
                    }
                } catch (err) {
                    console.error(
                        `Error in decodeCashAddress(${recipients[0]}, true) while parsing for ALP listing tx`,
                        err,
                    );
                    // No action, will be parsed as not AgoraOffer
                }
            }
        }
    }

    let xecTxType: XecTxType = incoming ? XecTxType.Received : XecTxType.Sent;

    // Parse for specific transaction types based on the original logic
    if (isCoinbase) {
        const STAKING_REWARDS_FACTOR = 0.1;
        const STAKING_REWARDS_PADDING = 0.01;
        if (
            satoshisSent >=
                Math.floor(
                    (STAKING_REWARDS_FACTOR - STAKING_REWARDS_PADDING) *
                        Number(outputSatoshis),
                ) &&
            satoshisSent <=
                Math.floor(
                    (STAKING_REWARDS_FACTOR + STAKING_REWARDS_PADDING) *
                        Number(outputSatoshis),
                )
        ) {
            xecTxType = XecTxType.Staking;
        } else {
            xecTxType = XecTxType.Coinbase;
        }
    }

    const parsedTokenEntries: ParsedTokenEntry[] = [];
    for (const entry of tokenEntries) {
        const {
            tokenId,
            tokenType,
            txType,
            burnSummary,
            actualBurnAtoms,
            intentionalBurnAtoms,
        } = entry;

        const renderedTokenType = getRenderedTokenType(tokenType);
        let renderedTxType: TokenTxType | ParsedTokenTxType = txType;

        if (isAgoraAdSetup || isAgoraOffer) {
            renderedTxType = ParsedTokenTxType.AgoraOffer;
        }
        if (isAgoraCancel) {
            renderedTxType = ParsedTokenTxType.AgoraCancel;
        }

        if (isAgoraPurchase) {
            // If this wallet sent XEC in an agora purchase (incoming === false), it bought tokens
            // If this wallet received XEC in an agora purchase, it sold tokens
            renderedTxType = incoming
                ? ParsedTokenTxType.AgoraSale
                : ParsedTokenTxType.AgoraBuy;
        }

        let isFanOutTx = false;
        if (renderedTokenType === RenderedTokenType.COLLECTION) {
            if (txType === 'SEND') {
                // We assume collection txs that SEND are fan out txs, as this is the only
                // type of SEND action Cashtab supports for this token

                isFanOutTx = true;
                renderedTxType = ParsedTokenTxType.FanOut;
            }
        }

        const isUnintentionalBurn =
            burnSummary !== '' && actualBurnAtoms !== 0n;
        const isIntentionalBurn = intentionalBurnAtoms !== 0n;

        let agoraSaleTokenSatoshis = 0n;
        let tokenSatoshisTotal = 0n;
        let tokenSatoshisReceived = 0n; // Received or change
        let nftFanInputsCreated = 0;
        for (const output of outputs) {
            // Token output parsing
            if (typeof output.token !== 'undefined') {
                // Get the amount associated with this token entry
                // Per ChronikClient, we will always have amount as a string in
                // the token key of an output, see type Token
                tokenSatoshisTotal += output.token.atoms;

                // For sales of agora partial txs, we assume the amount sold
                // goes to a p2pkh address
                if (renderedTxType === ParsedTokenTxType.AgoraSale) {
                    const { type } = getTypeAndHashFromOutputScript(
                        output.outputScript,
                    );
                    if (type === 'p2pkh') {
                        agoraSaleTokenSatoshis += output.token.atoms;
                    }
                }
                for (const hash of hashes) {
                    if (output.outputScript.includes(hash)) {
                        tokenSatoshisReceived += output.token.atoms;

                        if (output.token.atoms === 1n) {
                            // Note that we increment this for all qty 1 outputs we see
                            // But only tx of type fan input will use this var
                            nftFanInputsCreated += 1;
                        }
                    }
                }
            }
        }
        let tokenSatoshis = 0n;
        // Determine the tokenSatoshis associated with this tokenEntry based on its type
        switch (renderedTxType) {
            case ParsedTokenTxType.AgoraSale: {
                tokenSatoshis = agoraSaleTokenSatoshis;
                break;
            }
            case ParsedTokenTxType.AgoraBuy: {
                tokenSatoshis = tokenSatoshisReceived;
                break;
            }
            case ParsedTokenTxType.AgoraCancel: {
                tokenSatoshis = tokenSatoshisTotal;
                break;
            }
            default: {
                switch (txType) {
                    case 'MINT':
                    case 'GENESIS': {
                        tokenSatoshis = tokenSatoshisTotal;
                        break;
                    }
                    case 'SEND': {
                        tokenSatoshis = incoming
                            ? tokenSatoshisReceived
                            : tokenSatoshisTotal - tokenSatoshisReceived;
                        break;
                    }
                    case 'BURN': {
                        tokenSatoshis = actualBurnAtoms;
                    }
                }
            }
        }
        if (isUnintentionalBurn || isIntentionalBurn) {
            // Overwrite txType of 'SEND' if tokens are burned
            renderedTxType = 'BURN';
            // Maybe this is a SEND tx, but if it burns unintentionally,
            // that is the more important info
            tokenSatoshis = actualBurnAtoms;
        }
        const parsedTokenEntry: ParsedTokenEntry = {
            tokenId,
            renderedTxType,
            renderedTokenType,
            tokenSatoshis: tokenSatoshis.toString(),
        };
        if (isFanOutTx) {
            parsedTokenEntry.nftFanInputsCreated = nftFanInputsCreated;
        }
        parsedTokenEntries.push(parsedTokenEntry);
    }

    let replyAddress: string | undefined;
    if (xecTxType === XecTxType.Received) {
        try {
            replyAddress = encodeOutputScript(inputs[0].outputScript as string);
        } catch {
            // replyAddress remains undefined
        }
    }

    const parsedTx: ParsedTx = {
        recipients: Array.from(destinationAddresses),
        satoshisSent: Number(satoshisSent),
        stackArray,
        xecTxType,
        appActions,
        parsedTokenEntries,
    };

    // Add possibly undefined key if present
    if (typeof replyAddress !== 'undefined') {
        parsedTx.replyAddress = replyAddress;
    }

    return parsedTx;
};

/**
 * For tx notifications, we want to show a msg that is as brief as possible
 * and summarizes the tx
 * Less info than what we render in tx history which the user has more time to browse
 *
 * Note that we return 'undefined' for txs where, for whatever reason, we do not want
 * to show a notification
 *
 * Right now, we return undefined for
 * - Creating agora listings
 * - Canceling agora listings
 * - Agora buys
 *
 * These cases are better covered (and tested) by the UI components that support these actions
 */
export const getTxNotificationMsg = (
    parsedTx: ParsedTx,
    fiatPrice: null | number,
    userLocale: string,
    selectedFiatTicker: string,
    genesisInfo?: GenesisInfo,
): string | undefined => {
    const {
        parsedTokenEntries,
        satoshisSent,
        replyAddress,
        recipients,
        xecTxType,
        appActions,
    } = parsedTx;

    // Prices in notifications
    // We want full precision
    // We want locale formatting
    // We want fiat price if available
    const xecSent = toXec(satoshisSent);
    const fiatSent = fiatPrice !== null ? xecSent * fiatPrice : null;
    const renderedAmount = `${xecSent.toLocaleString(userLocale, {
        maximumFractionDigits: appConfig.cashDecimals,
        minimumFractionDigits: appConfig.cashDecimals,
    })} XEC${
        fiatSent !== null
            ? ` (${`${new Intl.NumberFormat(userLocale, {
                  style: 'currency',
                  currency: selectedFiatTicker,
                  minimumFractionDigits: appConfig.cashDecimals,
                  maximumFractionDigits: appConfig.cashDecimals,
              }).format(fiatSent)} ${selectedFiatTicker}`})`
            : ''
    }`;

    /**
     * For a received tx, the "from" address is at the "replyAddress" key
     * We do not expect this to ever be undefined for a received tx, but include fallback in case
     *
     * For a sending tx, we render the "to" address is as recipients[0]
     * This can be undefined for self-send txs e.g. an agora cancel
     * Currently we do not render notifications that include an address for this type of tx
     * But we include the fallback to ensure never undefined
     *
     * Note we may have more than one to or from address, so these are shorthand
     * assumptions for the purpose of making useful + concise notifications
     */
    const toOrFromAddress =
        xecTxType === XecTxType.Received
            ? replyAddress || 'unknown'
            : recipients[0] || 'self';

    const renderedToOrFromAddress =
        toOrFromAddress === 'self' || toOrFromAddress === 'unknown'
            ? toOrFromAddress
            : previewAddress(toOrFromAddress);

    if (parsedTokenEntries.length === 0) {
        // If this is not a token tx
        if (appActions.length === 0) {
            // If this tx has no app actions
            switch (xecTxType) {
                case XecTxType.Received: {
                    return `Received ${renderedAmount} from ${renderedToOrFromAddress}`;
                }
                case XecTxType.Sent: {
                    return `Sent ${renderedAmount} to ${renderedToOrFromAddress}`;
                }
                case XecTxType.Staking: {
                    return `New staking reward: ${renderedAmount}`;
                }
                case XecTxType.Coinbase: {
                    return `New mining reward: ${renderedAmount}`;
                }
                default: {
                    // Should never happen
                    return `${xecTxType} ${renderedAmount}`;
                }
            }
        } else {
            // Not a token tx
            // Has app actions

            // For notifications, we parse only the first app action
            const notificationParsedAppAction = appActions[0];
            const { lokadId, isValid, action, app } =
                notificationParsedAppAction;
            switch (lokadId) {
                case opReturn.appPrefixesHex.airdrop: {
                    if (isValid) {
                        const { tokenId, msg } = action as AirdropAction;
                        return `${app}: ${xecTxType} ${renderedAmount} ${
                            xecTxType === 'Sent'
                                ? 'to holders of'
                                : `for holding`
                        } ${tokenId.slice(0, 5)}...${tokenId.slice(-5)}${
                            typeof msg !== 'undefined' ? ` | ${msg}` : ''
                        }`;
                    }
                    return `${xecTxType} ${renderedAmount} | Invalid ${app}`;
                }
                case opReturn.appPrefixesHex.paybutton: {
                    if (isValid) {
                        const { data } = action as PaybuttonAction;
                        // We do not include nonce in notification
                        return `${app}: ${xecTxType} ${renderedAmount}${
                            data !== '' ? ` | ${data}` : ''
                        }`;
                    }
                    return `${xecTxType} ${renderedAmount} | Invalid ${app}`;
                }
                case opReturn.appPrefixesHex.nftoa: {
                    if (isValid) {
                        const { data } = action as NftoaAction;
                        // We do not include nonce in notification
                        return `${app} | ${xecTxType} ${renderedAmount} | ${data}`;
                    }
                    return `${xecTxType} ${renderedAmount} | Invalid ${app}`;
                }
                case opReturn.appPrefixesHex.xecx: {
                    if (isValid) {
                        return `${app} | ${xecTxType} ${renderedAmount}`;
                    }
                    return `${xecTxType} ${renderedAmount} | Invalid ${app}`;
                }
                case opReturn.appPrefixesHex.swap: {
                    return `${xecTxType} ${renderedAmount} | ${app}`;
                }
                case opReturn.appPrefixesHex.eCashChat: {
                    if (isValid) {
                        const { msg } = action as EcashChatAction;
                        return `${app} | ${xecTxType} ${renderedAmount} | ${msg}`;
                    }
                    return `${xecTxType} ${renderedAmount} | Invalid ${app}`;
                }
                case opReturn.appPrefixesHex.paywallPayment: {
                    if (isValid) {
                        const { sharedArticleTxid } = action as PaywallAction;
                        return `${app} | ${xecTxType} ${renderedAmount} | ${sharedArticleTxid.slice(
                            0,
                            5,
                        )}...${sharedArticleTxid.slice(-5)}`;
                    }
                    return `${xecTxType} ${renderedAmount} | Invalid ${app}`;
                }
                case opReturn.appPrefixesHex.authPrefixHex: {
                    if (isValid) {
                        return `${app} | ${xecTxType} ${renderedAmount}`;
                    }
                    return `${xecTxType} ${renderedAmount} | Invalid ${app}`;
                }
                case opReturn.appPrefixesHex.eCashChatArticle: {
                    if (isValid) {
                        return `${app} | ${xecTxType} ${renderedAmount}`;
                    }
                    return `${xecTxType} ${renderedAmount} | Invalid ${app}`;
                }
                case opReturn.appPrefixesHex.cashtab: {
                    if (isValid) {
                        const { msg } = action as CashtabMsgAction;
                        return `${app} | ${xecTxType} ${renderedAmount} | ${msg}`;
                    }
                    return `${xecTxType} ${renderedAmount} | Invalid ${app}`;
                }
                default: {
                    if (app === 'unknown') {
                        // Then it has a lokadId, just not one we recognize
                        return `${xecTxType} ${renderedAmount} | Unrecognized LOKAD ${lokadId}`;
                    } else {
                        // Other unparsed OP_RETURN
                        const { decoded } = action as UnknownAction;
                        return `${xecTxType} ${renderedAmount} | Unparsed OP_RETURN: ${decoded}`;
                    }
                }
            }
        }
    } else {
        // Parse as token tx
        // We only parse the first tokenEntry for tx notifications
        const parsedTokenEntry = parsedTokenEntries[0];
        const {
            tokenId,
            renderedTokenType,
            renderedTxType,
            tokenSatoshis,
            nftFanInputsCreated,
        } = parsedTokenEntry;

        const renderedTokenQty =
            typeof genesisInfo !== 'undefined'
                ? `${decimalizedTokenQtyToLocaleFormat(
                      decimalizeTokenAmount(
                          tokenSatoshis,
                          genesisInfo.decimals as SlpDecimals,
                      ),
                      userLocale,
                  )} `
                : '';
        const renderedTicker =
            typeof genesisInfo !== 'undefined'
                ? `${
                      genesisInfo.tokenTicker !== ''
                          ? genesisInfo.tokenTicker
                          : genesisInfo.tokenName
                  }`
                : `${tokenId.slice(0, 5)}...${tokenId.slice(-5)}`;

        switch (renderedTxType) {
            case ParsedTokenTxType.AgoraOffer: {
                // Agora listing tx notification are handled by UI components that support listing
                return;
            }
            case ParsedTokenTxType.AgoraCancel: {
                // Agora cancel tx notifications are handled by UI components that support cancels
                return;
            }
            case ParsedTokenTxType.AgoraBuy: {
                // Agora purchase tx notifications are handled by UI components that support buys
                return;
            }
            case ParsedTokenTxType.AgoraSale: {
                // Sales are incoming txs, the user is not creating this from a UI component
                // Parse here
                return `Sold ${renderedTokenQty}${renderedTicker} for ${renderedAmount}`;
            }
            case ParsedTokenTxType.FanOut: {
                return `Created ${nftFanInputsCreated} NFT mint inputs for ${renderedTicker}`;
            }
            case 'SEND': {
                return `${
                    xecTxType === XecTxType.Received ? 'Received' : 'Sent'
                } ${renderedTokenQty}${renderedTicker}`;
            }
            case 'MINT': {
                return `🔨 Minted ${renderedTokenQty}${renderedTicker}`;
            }
            case 'BURN': {
                return `🔥 Burned ${renderedTokenQty}${renderedTicker}`;
            }
            case 'GENESIS': {
                if (renderedTokenType === RenderedTokenType.NFT) {
                    return `NFT | 👨‍🎨 Minted ${renderedTokenQty}${renderedTicker}`;
                }
                return `⚗️ Genesis | Created ${renderedTokenQty}${renderedTicker}`;
            }
            default: {
                // Should never happen
                return `${xecTxType} ${renderedAmount}`;
            }
        }
    }
};

/**
 * Get transaction history with pagination
 * - Parse txs for rendering in Cashtab
 * - Update cachedTokens with any new tokenIds
 * @param chronik chronik-client instance
 * @param address the address to get history for
 * @param cachedTokens the map stored at cashtabCache.tokens
 * @param page page number (0-based), defaults to 0
 * @param pageSize number of transactions per page, defaults to chronikConfig.txHistoryPageSize
 * @returns object with txs array and totalPages info
 */
export const getTransactionHistory = async (
    chronik: ChronikClient,
    address: string,
    cachedTokens: Map<string, CashtabCachedTokenInfo>,
    page: number = 0,
    pageSize: number = chronikConfig.txHistoryPageSize,
): Promise<{ txs: CashtabTx[]; numPages: number; numTxs: number }> => {
    // Get hash from address for parseTx
    const { hash } = decodeCashAddress(address);

    // Get transaction history from chronik
    const pageResponse = await chronik.address(address).history(page, pageSize);

    // For non-paginated requests, limit to pageSize
    const txsToProcess = pageResponse.txs;

    // Parse txs
    const history: CashtabTx[] = [];
    for (const tx of txsToProcess) {
        const { tokenEntries } = tx;

        // Get all tokenIds associated with this tx
        const tokenIds: Set<string> = new Set();
        for (const tokenEntry of tokenEntries) {
            tokenIds.add(tokenEntry.tokenId);
        }

        // Cache any tokenIds you do not have cached
        for (const tokenId of [...tokenIds]) {
            if (typeof cachedTokens.get(tokenId) === 'undefined') {
                // Add it to cache right here
                try {
                    const newTokenCacheInfo = await getTokenGenesisInfo(
                        chronik,
                        tokenId,
                    );
                    cachedTokens.set(tokenId, newTokenCacheInfo);
                } catch (err) {
                    // If you have an error getting the calculated token cache info, do not throw
                    // Could be some token out there that we do not parse properly with getTokenGenesisInfo
                    // Log it
                    // parseTx is tolerant to not having the info in cache
                    console.error(
                        `Error in getTokenGenesisInfo for tokenId ${tokenId}`,
                        err,
                    );
                }
            }
        }

        (tx as CashtabTx).parsed = parseTx(tx, [hash]);

        history.push(tx as CashtabTx);
    }

    const result = {
        txs: history,
        numTxs: pageResponse.numTxs,
        numPages: pageResponse.numPages,
    };

    return result;
};

/**
 * Get all info about a token used in Cashtab's token cache
 * @param chronik
 * @param tokenId
 */
export const getTokenGenesisInfo = async (
    chronik: ChronikClient,
    tokenId: string,
): Promise<CashtabCachedTokenInfo> => {
    // We can get timeFirstSeen, block, tokenType, and genesisInfo from the token() endpoint
    // If we call this endpoint before the genesis tx is confirmed, we will not get block
    // So, block does not need to be included

    const tokenInfo = await chronik.token(tokenId);
    const genesisTxInfo = await chronik.tx(tokenId);

    const { timeFirstSeen, genesisInfo, tokenType } = tokenInfo;
    const decimals = genesisInfo.decimals;

    // Initialize variables for determined quantities we want to cache

    /**
     * genesisSupply {string}
     * Quantity of token created at mint
     * Note: we may have genesisSupply at different genesisAddresses
     * We do not track this information, only total genesisSupply
     * Cached as a decimalized string, e.g. 0.000 if 0 with 3 decimal places
     * 1000.000000000 if one thousand with 9 decimal places
     */
    let genesisSupply = decimalizeTokenAmount('0', decimals as SlpDecimals);

    /**
     * genesisMintBatons {number}
     * Number of mint batons created in the genesis tx for this token
     */
    let genesisMintBatons = 0;

    /**
     * genesisOutputScripts {Set(<outputScript>)}
     * Address(es) where initial token supply was minted
     */
    const genesisOutputScripts: Set<string> = new Set();

    // Iterate over outputs
    for (const output of genesisTxInfo.outputs) {
        if (output.token?.tokenId === tokenId) {
            // If this output of this genesis tx is associated with this tokenId

            const { token, outputScript } = output;

            // Add its outputScript to genesisOutputScripts
            genesisOutputScripts.add(outputScript);

            const { isMintBaton, atoms } = token;

            if (isMintBaton) {
                // If it is a mintBaton, increment genesisMintBatons
                genesisMintBatons += 1;
            }

            // Increment genesisSupply
            // decimalizeTokenAmount, undecimalizeTokenAmount
            //genesisSupply = genesisSupply.plus(new BN(amount));

            genesisSupply = decimalizeTokenAmount(
                (
                    BigInt(
                        undecimalizeTokenAmount(
                            genesisSupply,
                            decimals as SlpDecimals,
                        ),
                    ) + atoms
                ).toString(),
                decimals as SlpDecimals,
            );
        }
    }

    const tokenCache: CashtabCachedTokenInfo = {
        tokenType,
        genesisInfo,
        timeFirstSeen,
        genesisSupply,
        // Return genesisOutputScripts as an array as we no longer require Set features
        genesisOutputScripts: [...genesisOutputScripts],
        genesisMintBatons,
    };
    if (typeof tokenInfo.block !== 'undefined') {
        // If the genesis tx is confirmed at the time we check
        tokenCache.block = tokenInfo.block;
    }

    if (tokenType.type === 'SLP_TOKEN_TYPE_NFT1_CHILD') {
        // If this is an SLP1 NFT
        // Get the groupTokenId
        // This is available from the .tx() call and will never change, so it should also be cached
        for (const tokenEntry of genesisTxInfo.tokenEntries) {
            const { txType } = tokenEntry;
            if (txType === 'GENESIS') {
                const { groupTokenId } = tokenEntry;
                tokenCache.groupTokenId = groupTokenId;
            }
        }
    }
    // Note: if it is not confirmed, we can update the cache later when we try to use this value

    return tokenCache;
};

/**
 * Get decimalized balance of every token held by a wallet
 * Update Cashtab's tokenCache if any tokens are uncached
 * @param chronik
 * @param slpUtxos array of token utxos from chronik
 * @param tokenCache Cashtab's token cache
 * @returns Map of tokenId => token balance as decimalized string
 * Also updates tokenCache
 */
export const getTokenBalances = async (
    chronik: ChronikClient,
    slpUtxos: TokenUtxo[],
    tokenCache: Map<string, CashtabCachedTokenInfo>,
): Promise<Map<string, string>> => {
    const walletStateTokens: Map<string, string> = new Map();
    for (const utxo of slpUtxos) {
        // Every utxo in slpUtxos will have a tokenId
        const { token } = utxo;
        const { tokenId, atoms } = token;
        // Is this token cached?
        let cachedTokenInfo = tokenCache.get(tokenId);
        if (typeof cachedTokenInfo === 'undefined') {
            // If we have not cached this token before, cache it
            // NB we do not handle chronik errors here; expectation is that callsite will handle chronik errors
            cachedTokenInfo = await getTokenGenesisInfo(chronik, tokenId);
            tokenCache.set(tokenId, cachedTokenInfo);
        }
        // Now decimals is available
        const decimals = cachedTokenInfo.genesisInfo.decimals;

        const tokenBalanceInMap = walletStateTokens.get(tokenId);

        // Update or initialize token balance as a decimalized string in walletStateTokens Map
        walletStateTokens.set(
            tokenId,
            typeof tokenBalanceInMap === 'undefined'
                ? decimalizeTokenAmount(
                      atoms.toString(),
                      decimals as SlpDecimals,
                  )
                : decimalizeTokenAmount(
                      (
                          BigInt(
                              undecimalizeTokenAmount(
                                  tokenBalanceInMap,
                                  decimals as SlpDecimals,
                              ),
                          ) + atoms
                      ).toString(),
                      decimals as SlpDecimals,
                  ),
        );
    }

    return walletStateTokens;
};

/**
 *
 * @param chronik
 * @param tokenId
 * @param pageSize usually 200, the chronik max, but accept a parameter to simplify unit testing
 * @returns
 */
export const getAllTxHistoryByTokenId = async (
    chronik: ChronikClient,
    tokenId: string,
    pageSize = CHRONIK_MAX_PAGE_SIZE,
): Promise<Tx[]> => {
    // We will throw an error if we get an error from chronik fetch
    const firstPageResponse = await chronik
        .tokenId(tokenId)
        // call with page=0 (to get first page) and max page size, as we want all the history
        .history(0, pageSize);
    const { txs, numPages } = firstPageResponse;
    // Get tx history from all pages
    // We start with i = 1 because we already have the data from page 0
    const tokenHistoryPromises = [];
    for (let i = 1; i < numPages; i += 1) {
        tokenHistoryPromises.push(
            new Promise<Tx[]>((resolve, reject) => {
                chronik
                    .tokenId(tokenId)
                    .history(i, CHRONIK_MAX_PAGE_SIZE)
                    .then(
                        result => {
                            resolve(result.txs);
                        },
                        err => {
                            reject(err);
                        },
                    );
            }),
        );
    }
    // Get rest of txHistory using Promise.all() to execute requests in parallel
    const restOfTxHistory = await Promise.all(tokenHistoryPromises);
    // Flatten so we have an array of tx objects, and not an array of arrays of tx objects
    const flatTxHistory = restOfTxHistory.flat();
    // Combine with the first page
    const allHistory = txs.concat(flatTxHistory);

    return allHistory;
};

/**
 * Get all child NFTs from a given parent tokenId
 * i.e. get all NFTs in an NFT collection *
 * @param parentTokenId
 * @param allParentTokenTxHistory
 */
export const getChildNftsFromParent = (
    parentTokenId: string,
    allParentTokenTxHistory: Tx[],
): string[] => {
    const childNftsFromThisParent = [];
    for (const tx of allParentTokenTxHistory) {
        // Check tokenEntries
        const { tokenEntries } = tx;
        for (const tokenEntry of tokenEntries) {
            const { txType } = tokenEntry;
            if (
                txType === 'GENESIS' &&
                typeof tokenEntry.groupTokenId !== 'undefined' &&
                tokenEntry.groupTokenId === parentTokenId
            ) {
                childNftsFromThisParent.push(tokenEntry.tokenId);
            }
        }
    }
    return childNftsFromThisParent;
};

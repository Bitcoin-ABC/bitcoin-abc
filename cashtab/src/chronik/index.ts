// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { opReturn as opreturnConfig } from 'config/opreturn';
import { chronik as chronikConfig } from 'config/chronik';
import { getStackArray } from 'ecash-script';
import {
    getTypeAndHashFromOutputScript,
    encodeOutputScript,
    encodeCashAddress,
    decodeCashAddress,
} from 'ecashaddrjs';
import {
    getHashes,
    decimalizeTokenAmount,
    undecimalizeTokenAmount,
    CashtabUtxo,
    CashtabWallet,
    TokenUtxo,
    NonTokenUtxo,
    SlpDecimals,
    CashtabTx,
} from 'wallet';
import {
    ChronikClient,
    TxHistoryPage,
    ScriptUtxo,
    Tx,
    BlockMetadata,
    TokenTxType,
} from 'chronik-client';
import { CashtabCachedTokenInfo } from 'config/CashtabCache';
import appConfig from 'config/app';
import { opReturn } from 'config/opreturn';
import { scriptOps } from 'ecash-agora';
import { Script, fromHex, OP_0 } from 'ecash-lib';
import { getRenderedTokenType, RenderedTokenType } from 'token-protocols';

const CHRONIK_MAX_PAGE_SIZE = 200;

export const getTxHistoryPage = async (
    chronik: ChronikClient,
    hash160: string,
    page = 0,
): Promise<void | TxHistoryPage> => {
    let txHistoryPage;
    try {
        txHistoryPage = await chronik
            .script('p2pkh', hash160)
            // Get the 25 most recent transactions
            .history(page, chronikConfig.txHistoryPageSize);
        return txHistoryPage;
    } catch (err) {
        console.error(`Error in getTxHistoryPage(${hash160})`, err);
    }
};

export const returnGetTxHistoryPagePromise = (
    chronik: ChronikClient,
    hash160: string,
    page = 0,
): Promise<TxHistoryPage> => {
    /* 
    Unlike getTxHistoryPage, this function will reject and 
    fail Promise.all() if there is an error in the chronik call
    */
    return new Promise((resolve, reject) => {
        chronik
            .script('p2pkh', hash160)
            .history(page, chronikConfig.txHistoryPageSize)
            .then(
                result => {
                    resolve(result);
                },
                err => {
                    reject(err);
                },
            );
    });
};

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

/**
 * Return a promise to fetch all utxos at an address (and add a 'path' key to them)
 * We need the path key so that we know which wif to sign this utxo with
 * If we add HD wallet support, we will need to add an address key, and change the structure of wallet.paths
 * @param chronik
 * @paramaddress
 * @param path
 */
export const returnGetPathedUtxosPromise = (
    chronik: ChronikClient,
    address: string,
    path: number,
): Promise<CashtabUtxo[]> => {
    return new Promise((resolve, reject) => {
        chronik
            .address(address)
            .utxos()
            .then(
                result => {
                    const cashtabUtxos: CashtabUtxo[] = result.utxos.map(
                        (utxo: ScriptUtxo) => ({
                            ...utxo,
                            path: path,
                        }),
                    );
                    resolve(cashtabUtxos);
                },
                err => {
                    reject(err);
                },
            );
    });
};

/**
 * Get all utxos for a given wallet
 * @param chronik
 * @param wallet a cashtab wallet
 * @returns
 */
export const getUtxos = async (
    chronik: ChronikClient,
    wallet: CashtabWallet,
): Promise<CashtabUtxo[]> => {
    const chronikUtxoPromises: Promise<CashtabUtxo[]>[] = [];
    wallet.paths.forEach((pathInfo, path) => {
        const thisPromise = returnGetPathedUtxosPromise(
            chronik,
            pathInfo.address,
            path,
        );
        chronikUtxoPromises.push(thisPromise);
    });
    const utxoResponsesByPath = await Promise.all(chronikUtxoPromises);
    const flatUtxos = utxoResponsesByPath.flat();
    return flatUtxos;
};

interface OrganizedUtxos {
    slpUtxos: TokenUtxo[];
    nonSlpUtxos: NonTokenUtxo[];
}
/**
 * Organize utxos by token and non-token
 * TODO deprecate this and use better coinselect methods
 * @param chronikUtxos
 */
export const organizeUtxosByType = (
    chronikUtxos: CashtabUtxo[],
): OrganizedUtxos => {
    const nonSlpUtxos = [];
    const slpUtxos = [];
    for (const utxo of chronikUtxos) {
        // Construct nonSlpUtxos and slpUtxos arrays
        if (typeof utxo.token !== 'undefined') {
            slpUtxos.push(utxo as TokenUtxo);
        } else {
            nonSlpUtxos.push(utxo as NonTokenUtxo);
        }
    }

    return { slpUtxos, nonSlpUtxos };
};

/**
 * Get just the tx objects from chronik history() responses
 * @param txHistoryOfAllAddresses
 * @returns
 */
export const flattenChronikTxHistory = (
    txHistoryOfAllAddresses: TxHistoryPage[],
) => {
    let flatTxHistoryArray: Tx[] = [];
    for (const txHistoryThisAddress of txHistoryOfAllAddresses) {
        flatTxHistoryArray = flatTxHistoryArray.concat(
            txHistoryThisAddress.txs,
        );
    }
    return flatTxHistoryArray;
};

interface ConfirmedTx extends Omit<Tx, 'block'> {
    block: BlockMetadata;
}

/**
 * Sort an array of chronik txs chronologically and return the first renderedCount of them
 * @param txs
 * @param renderedCount how many txs to return
 * @returns
 */
export const sortAndTrimChronikTxHistory = (
    txs: Tx[],
    renderedCount: number,
): Tx[] => {
    const unconfirmedTxs = [];
    const confirmedTxs: ConfirmedTx[] = [];
    for (const tx of txs) {
        if (typeof tx.block === 'undefined') {
            unconfirmedTxs.push(tx);
        } else {
            confirmedTxs.push(tx as ConfirmedTx);
        }
    }

    // Sort confirmed txs by blockheight, and then timeFirstSeen
    const sortedConfirmedTxHistoryArray = confirmedTxs.sort(
        (a, b) =>
            // We want more recent blocks i.e. higher blockheights to have earlier array indices
            b.block.height - a.block.height ||
            // For blocks with the same height, we want more recent timeFirstSeen i.e. higher timeFirstSeen to have earlier array indices
            b.timeFirstSeen - a.timeFirstSeen,
    );

    // Sort unconfirmed txs by timeFirstSeen
    const sortedUnconfirmedTxHistoryArray = unconfirmedTxs.sort(
        (a, b) => b.timeFirstSeen - a.timeFirstSeen,
    );

    // The unconfirmed txs are more recent, so they should be inserted into an array before the confirmed txs
    const sortedChronikTxHistoryArray = sortedUnconfirmedTxHistoryArray.concat(
        sortedConfirmedTxHistoryArray,
    );

    const trimmedAndSortedChronikTxHistoryArray =
        sortedChronikTxHistoryArray.splice(0, renderedCount);

    return trimmedAndSortedChronikTxHistoryArray;
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
interface UnknownAction {
    stack: string;
    decoded: string;
}
interface AppAction {
    lokadId: string;
    app: string;
    isValid?: boolean;
    action?:
        | AliasAction
        | AirdropAction
        | PaybuttonAction
        | EcashChatAction
        | PaywallAction
        | EcashChatArticleReply
        | CashtabMsgAction
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
    let stackArray = [];

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
            } catch (err) {
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
    let change = 0;
    let outputSatoshis = 0;
    let receivedSatoshis = 0;
    let selfSendTx = true;

    for (const output of outputs) {
        const { outputScript, value } = output;
        outputSatoshis += value;
        if (outputScript.startsWith(opreturnConfig.opReturnPrefixHex)) {
            stackArray = getStackArray(outputScript);
            continue;
        }
        let walletIncludesThisOutputScript = false;
        for (const hash of hashes) {
            if (outputScript.includes(hash)) {
                walletIncludesThisOutputScript = true;
                change += value;
                receivedSatoshis += value;
            }
        }
        if (!walletIncludesThisOutputScript) {
            try {
                const destinationAddress = encodeOutputScript(outputScript);
                destinationAddresses.add(destinationAddress);
            } catch (err) {
                // Skip non-address recipients
            }
            selfSendTx = false;
        }
    }

    // Parse app action
    const appActions = [];
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
                // For now, do nothing
                // ALP will be parsed by tokenEntries below
                // TODO parse EMPP app actions
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
                        outputSatoshis,
                ) &&
            satoshisSent <=
                Math.floor(
                    (STAKING_REWARDS_FACTOR + STAKING_REWARDS_PADDING) *
                        outputSatoshis,
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
            actualBurnAmount,
            intentionalBurn,
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
            burnSummary !== '' && actualBurnAmount !== '0';
        const isIntentionalBurn = intentionalBurn !== '0';

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
                tokenSatoshisTotal += BigInt(output.token.amount);

                // For sales of agora partial txs, we assume the amount sold
                // goes to a p2pkh address
                if (renderedTxType === ParsedTokenTxType.AgoraSale) {
                    const { type } = getTypeAndHashFromOutputScript(
                        output.outputScript,
                    );
                    if (type === 'p2pkh') {
                        agoraSaleTokenSatoshis += BigInt(output.token.amount);
                    }
                }
                for (const hash of hashes) {
                    if (output.outputScript.includes(hash)) {
                        tokenSatoshisReceived += BigInt(output.token.amount);

                        if (output.token.amount === '1') {
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
                        tokenSatoshis = BigInt(actualBurnAmount);
                    }
                }
            }
        }
        if (isUnintentionalBurn || isIntentionalBurn) {
            // Overwrite txType of 'SEND' if tokens are burned
            renderedTxType = 'BURN';
            // Maybe this is a SEND tx, but if it burns unintentionally,
            // that is the more important info
            tokenSatoshis = BigInt(actualBurnAmount);
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
        } catch (err) {
            // Handle error
        }
    }

    const parsedTx: ParsedTx = {
        recipients: Array.from(destinationAddresses),
        satoshisSent,
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
 * Get tx history of cashtab wallet
 * - Get tx history of each path in wallet
 * - sort by timeFirstSeen + block
 * - Trim to number of txs Cashtab renders
 * - Parse txs for rendering in Cashtab
 * - Update cachedTokens with any new tokenIds
 * @param chronik chronik-client instance
 * @param wallet cashtab wallet
 * @param cachedTokens the map stored at cashtabCache.tokens
 * @returns Tx[], each tx also has a 'parsed' key with other rendering info
 */
export const getHistory = async (
    chronik: ChronikClient,
    wallet: CashtabWallet,
    cachedTokens: Map<string, CashtabCachedTokenInfo>,
): Promise<CashtabTx[]> => {
    const txHistoryPromises: Promise<TxHistoryPage>[] = [];
    wallet.paths.forEach(pathInfo => {
        txHistoryPromises.push(chronik.address(pathInfo.address).history());
    });

    // Just throw an error if you get a chronik error
    // This will be handled in the update loop
    const txHistoryOfAllAddresses = await Promise.all(txHistoryPromises);

    const flatTxHistoryArray = flattenChronikTxHistory(txHistoryOfAllAddresses);
    const renderedTxs = sortAndTrimChronikTxHistory(
        flatTxHistoryArray,
        chronikConfig.txHistoryCount,
    );

    // Parse txs
    const history: CashtabTx[] = [];
    for (const tx of renderedTxs) {
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

        (tx as CashtabTx).parsed = parseTx(tx, getHashes(wallet));

        history.push(tx as CashtabTx);
    }

    return history;
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

            const { isMintBaton, amount } = token;
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
                    ) + BigInt(amount)
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
        const { tokenId, amount } = token;
        // Is this token cached?
        let cachedTokenInfo = tokenCache.get(tokenId);
        if (typeof cachedTokenInfo === 'undefined') {
            // If we have not cached this token before, cache it
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
                ? decimalizeTokenAmount(amount, decimals as SlpDecimals)
                : decimalizeTokenAmount(
                      (
                          BigInt(
                              undecimalizeTokenAmount(
                                  tokenBalanceInMap,
                                  decimals as SlpDecimals,
                              ),
                          ) + BigInt(amount)
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

// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Tx, TokenTxType } from 'chronik-client';
import {
    decodeCashAddress,
    encodeCashAddress,
    encodeOutputScript,
    getTypeAndHashFromOutputScript,
} from 'ecashaddrjs';
import { scriptOps } from 'ecash-agora';
import {
    Script,
    OP_0,
    decodeInputData,
    fromHex,
    getStackArray,
    toHex,
} from 'ecash-lib';
import appConfig from './constants/app';
import { opReturn } from './constants/opreturn';
import { getEmppAppAction, getEmppAppActions } from './empp';
import { getRenderedTokenType, RenderedTokenType } from './tokenProtocol';
import {
    AppAction,
    ParsedTokenEntry,
    ParsedTokenTxType,
    ParsedTx,
    XecTxType,
    AirdropAction,
    PowAction,
} from './types';

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
    let isBlitzPlay = false;
    const p2shInputDataAppActions: AppAction[] = [];
    for (const input of inputs) {
        // Check for P2SH input data (Blitzchips DICE/ROLL, etc.) on any P2SH input
        const outputScript = input.outputScript as string | undefined;
        const inputScript = input.inputScript as string | undefined;
        let isP2sh = false;
        if (typeof outputScript === 'string' && outputScript.length > 0) {
            try {
                const { type } = getTypeAndHashFromOutputScript(outputScript);
                isP2sh = type === 'p2sh';
            } catch {
                // Not a supported output script type
            }
        }
        if (
            isP2sh &&
            typeof inputScript === 'string' &&
            inputScript.length > 0
        ) {
            try {
                const decoded = decodeInputData(fromHex(inputScript));
                if (typeof decoded !== 'undefined') {
                    const inputDataRaw =
                        toHex(decoded.lokadId) + toHex(decoded.data);
                    const emppAction = getEmppAppAction(inputDataRaw);
                    if (typeof emppAction !== 'undefined') {
                        p2shInputDataAppActions.push(emppAction);
                    }
                    // P2SH input data tx - not Agora; skip Agora logic for token inputs
                    if (typeof input.token !== 'undefined') {
                        isTokenTx = true;
                        continue;
                    }
                }
            } catch {
                // Ignore parse errors
            }
        }

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
                    // Agora tx: Check if this is a cancellation
                    // See agora.ts from ecash-agora lib
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
        if (outputScript.startsWith(opReturn.opReturnPrefixHex)) {
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
            case opReturn.appPrefixesHex.alp: {
                // ALP token transaction - check for embedded EMPP data (DICE/ROLL)
                // Look through stackArray for DICE or ROLL lokad IDs
                // DICE/ROLL data may be embedded in any push after the ALP protocol identifier
                for (let i = 0; i < stackArray.length; i++) {
                    const push = stackArray[i];
                    // Check if this push starts with DICE or ROLL lokad ID (8 hex chars = 4 bytes)
                    if (push.length >= 8) {
                        const lokadId = push.slice(0, 8);
                        if (lokadId === opReturn.appPrefixesHex.dice) {
                            // Found DICE bet in ALP transaction
                            const emppAction = getEmppAppAction(push);
                            if (typeof emppAction !== 'undefined') {
                                appActions.push(emppAction);
                            }
                        } else if (lokadId === opReturn.appPrefixesHex.roll) {
                            // Found ROLL payout in ALP transaction
                            const emppAction = getEmppAppAction(push);
                            if (typeof emppAction !== 'undefined') {
                                appActions.push(emppAction);
                            }
                        } else if (lokadId === opReturn.appPrefixesHex.trophy) {
                            // Found everydayjackpot.com payout in ALP transaction
                            const emppAction = getEmppAppAction(push);
                            if (typeof emppAction !== 'undefined') {
                                appActions.push(emppAction);
                            }
                        }
                    }
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
                        appConfig.prefix,
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
            case opReturn.appPrefixesHex.dice:
            case opReturn.appPrefixesHex.roll: {
                // Blitzchips DICE/ROLL in standalone OP_RETURN (not EMPP)
                const emppAction = getEmppAppAction(stackArray.join(''));
                if (typeof emppAction !== 'undefined') {
                    appActions.push(emppAction);
                }
                break;
            }
            case opReturn.appPrefixesHex.pow: {
                const app = 'Proof of Writing';

                // stackArray[1] = version (bare OP_0 -> "00"), [2] = action (bare OP_N),
                // [3]/[4] = 32-byte pushes per the action table.
                if (stackArray[1] !== '00') {
                    appActions.push({ lokadId, app, isValid: false });
                    break;
                }

                const TYPES: Record<string, PowAction['type']> = {
                    '51': 'post', // OP_1
                    '52': 'reply', // OP_2
                    '53': 'quote', // OP_3
                    '54': 'repost', // OP_4
                    '55': 'like', // OP_5
                    '56': 'publish', // OP_6
                    '57': 'unlock', // OP_7
                    '58': 'auth', // OP_8
                    '59': 'handle', // OP_9
                    '5a': 'comment', // OP_10
                    '5b': 'comment_reply', // OP_11
                };
                const type = TYPES[stackArray[2]];
                if (typeof type === 'undefined') {
                    appActions.push({ lokadId, app, isValid: false });
                    break;
                }

                const is32 = (s?: string): s is string =>
                    typeof s === 'string' && s.length === 64;
                const is36 = (s?: string): s is string =>
                    typeof s === 'string' && s.length === 72;

                switch (type) {
                    case 'post':
                    case 'publish':
                    case 'comment': {
                        if (!is32(stackArray[3])) {
                            appActions.push({ lokadId, app, isValid: false });
                            break;
                        }
                        appActions.push({
                            lokadId,
                            app,
                            isValid: true,
                            action: { type, contentHash: stackArray[3] },
                        });
                        break;
                    }
                    case 'reply':
                    case 'quote':
                    case 'comment_reply': {
                        if (!is32(stackArray[3]) || !is32(stackArray[4])) {
                            appActions.push({ lokadId, app, isValid: false });
                            break;
                        }
                        appActions.push({
                            lokadId,
                            app,
                            isValid: true,
                            action: {
                                type,
                                targetTxid: stackArray[3],
                                contentHash: stackArray[4],
                            },
                        });
                        break;
                    }
                    case 'repost':
                    case 'like': {
                        if (!is32(stackArray[3])) {
                            appActions.push({ lokadId, app, isValid: false });
                            break;
                        }
                        appActions.push({
                            lokadId,
                            app,
                            isValid: true,
                            action: { type, targetTxid: stackArray[3] },
                        });
                        break;
                    }
                    case 'unlock': {
                        appActions.push({
                            lokadId,
                            app,
                            isValid: true,
                            action: { type },
                        });
                        break;
                    }
                    case 'auth':
                    case 'handle': {
                        if (!is36(stackArray[3])) {
                            appActions.push({ lokadId, app, isValid: false });
                            break;
                        }
                        appActions.push({
                            lokadId,
                            app,
                            isValid: true,
                            action: { type, nonce: stackArray[3] },
                        });
                        break;
                    }
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

    appActions.push(...p2shInputDataAppActions);

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
    // Distinguish CACHET bet from Agora list: Blitzchips uses 829 sats for the token output to P2SH.
    const BLITZCHIPS_TOKEN_UTXO_SATS = 829;
    const recipients = Array.from(destinationAddresses);
    if (satoshisSent > appConfig.dustSats) {
        if (recipients.length === 1) {
            // Ad setup tx has 1 recipient

            // Ad setup tx has p2sh recipient
            const listingScript = recipients[0];
            try {
                const { type } = decodeCashAddress(listingScript);
                if (type === 'p2sh' && isTokenTx) {
                    for (const output of outputs) {
                        if (
                            output.sats === BigInt(BLITZCHIPS_TOKEN_UTXO_SATS)
                        ) {
                            isBlitzPlay = true;
                            break;
                        }
                    }
                    if (!isBlitzPlay) {
                        isAgoraAdSetup = true;
                    }
                }
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
        if (isBlitzPlay) {
            renderedTxType = ParsedTokenTxType.BlitzPlay;
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

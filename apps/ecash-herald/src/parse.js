// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('../config');
const cashaddr = require('ecashaddrjs');
const { prepareStringForTelegramHTML } = require('./telegram');
const { formatPrice, returnAddressPreview } = require('./utils');
module.exports = {
    parseBlock: function (chronikBlockResponse) {
        const { blockInfo, txs } = chronikBlockResponse;
        const { hash } = blockInfo;
        const { height, numTxs } = blockInfo;

        // Parse coinbase string
        const coinbaseScript = txs[0].inputs[0].inputScript;
        const miner = module.exports.getMinerFromCoinbase(coinbaseScript);

        // Start with i=1 to skip Coinbase tx
        const parsedTxs = [];
        for (let i = 1; i < txs.length; i += 1) {
            parsedTxs.push(module.exports.parseTx(txs[i]));
        }
        return { hash, height, miner, numTxs, parsedTxs };
    },
    getMinerFromCoinbase: function (coinbaseHexString) {
        const knownMiners = config.knownMiners;
        let miner = 'unknown';
        // Iterate over known miners to find a match
        for (let i = 0; i < knownMiners.length; i += 1) {
            const testedMiner = knownMiners[i];
            const { coinbaseScript } = testedMiner;
            if (coinbaseHexString.includes(coinbaseScript)) {
                miner = testedMiner.miner;
            }
        }
        return miner;
    },
    parseTx: function (tx) {
        /* Parse an eCash tx as returned by chronik for newsworthy information
         * returns
         * { txid, genesisInfo, opReturnInfo }
         */

        const { txid, inputs, outputs, size } = tx;

        let isTokenTx = false;
        let genesisInfo = false;
        let opReturnInfo = false;

        /* Collect xecSendInfo for all txs, since all txs are XEC sends
         * You may later want to render xecSendInfo for tokenSends, appTxs, etc,
         * maybe on special conditions, e.g.a token send tx that also sends a bunch of xec
         */

        // xecSend parsing variables
        let xecSendingOutputScripts = new Set();
        let xecReceivingOutputs = new Map();
        let xecChangeOutputs = new Map();
        let xecInputAmountSats = 0;
        let xecOutputAmountSats = 0;

        if (tx.slpTxData !== null && typeof tx.slpTxData !== 'undefined') {
            isTokenTx = true;
            if (
                tx.slpTxData.slpMeta !== null &&
                typeof tx.slpTxData.slpMeta !== 'undefined' &&
                tx.slpTxData.genesisInfo !== null &&
                typeof tx.slpTxData.genesisInfo !== 'undefined' &&
                tx.slpTxData.slpMeta.txType === 'GENESIS'
            ) {
                genesisInfo = tx.slpTxData.genesisInfo;
            }
        }
        for (let i in inputs) {
            const thisInput = inputs[i];
            xecSendingOutputScripts.add(thisInput.outputScript);
            xecInputAmountSats += parseInt(thisInput.value);
        }

        // Iterate over outputs to check for OP_RETURN msgs
        for (let i = 0; i < outputs.length; i += 1) {
            const thisOutput = outputs[i];
            const value = parseInt(thisOutput.value);
            xecOutputAmountSats += value;
            // If this output script is the same as one of the sendingOutputScripts
            if (xecSendingOutputScripts.has(thisOutput.outputScript)) {
                // Then this XEC amount is change

                // Add outputScript and value to map
                // If this outputScript is already in xecChangeOutputs, increment its value
                xecChangeOutputs.set(
                    thisOutput.outputScript,
                    (xecChangeOutputs.get(thisOutput.outputScript) ?? 0) +
                        value,
                );
            } else {
                // Add an xecReceivingOutput

                // Add outputScript and value to map
                // If this outputScript is already in xecReceivingOutputs, increment its value
                xecReceivingOutputs.set(
                    thisOutput.outputScript,
                    (xecReceivingOutputs.get(thisOutput.outputScript) ?? 0) +
                        value,
                );
            }
            // Don't parse OP_RETURN values of etoken txs, this info is available from chronik
            if (
                thisOutput.outputScript.startsWith(
                    config.opReturn.opReturnPrefix,
                ) &&
                !isTokenTx
            ) {
                opReturnInfo = module.exports.parseOpReturn(
                    thisOutput.outputScript,
                );
            }
        }

        // Determine tx fee
        const txFee = xecInputAmountSats - xecOutputAmountSats;
        const satsPerByte = txFee / size;

        return {
            txid,
            genesisInfo,
            opReturnInfo,
            satsPerByte,
            xecSendingOutputScripts,
            xecChangeOutputs,
            xecReceivingOutputs,
        };
    },
    parseOpReturn: function (outputScript) {
        // Initialize required vars
        let app;
        let msg;

        // Determine if this is an OP_RETURN field
        const isOpReturn =
            outputScript.slice(0, 2) === config.opReturn.opReturnPrefix;
        if (!isOpReturn) {
            return false;
        }

        // Determine if this is a memo tx
        // Memo txs have a shorter prefix and require special processing
        const isMemoTx =
            outputScript.slice(2, 6) === config.opReturn.memo.prefix;
        if (isMemoTx) {
            // memo txs require special processing
            // Send the unprocessed remainder of the string to a specialized function
            return module.exports.parseMemoOutputScript(outputScript);
        }

        // Parse for app prefix
        // See https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/web/standards/op_return-prefix-guideline.md
        const hasAppPrefix =
            outputScript.slice(2, 4) ===
            config.opReturn.opReturnAppPrefixLength;

        if (hasAppPrefix) {
            const appPrefix = outputScript.slice(4, 12);
            if (Object.keys(config.opReturn.appPrefixes).includes(appPrefix)) {
                app = config.opReturn.appPrefixes[appPrefix];
            } else {
                app = 'unknown app';
            }
            switch (app) {
                case 'Cashtab Msg':
                    // For a Cashtab msg, the rest of the string will be parsed as an OP_RETURN msg
                    msg = module.exports.hexOpReturnToUtf8(
                        outputScript.slice(12),
                    );
                    break;
                case 'Alias':
                    // For an Alias Registration, the rest of the string will be parsed as an OP_RETURN msg
                    msg = module.exports.hexOpReturnToUtf8(
                        outputScript.slice(12),
                    );
                    break;
                case 'unknown':
                    // Parse the whole string less the 6a prefix, so we can see the unknown app prefix
                    msg = module.exports.hexOpReturnToUtf8(
                        outputScript.slice(2),
                    );
                    break;
                default:
                    // Parse the whole string less the 6a prefix, so we can see the unknown app prefix
                    msg = module.exports.hexOpReturnToUtf8(
                        outputScript.slice(2),
                    );
            }
        } else {
            app = 'no app';
            msg = module.exports.hexOpReturnToUtf8(outputScript.slice(2));
        }

        return { app, msg };
    },
    hexOpReturnToUtf8: function (hexStr) {
        /*
         * Accept as input an OP_RETURN hex string less the 6a prefix
         * String will have the form of 4c+bytelength+msg (? + 4c + bytelength + msg)
         */
        let hexStrLength = hexStr.length;
        let opReturnMsgArray = [];
        for (let i = 0; hexStrLength !== 0; i++) {
            // Check first byte for the message length or 4c + message length
            let byteValue = hexStr.slice(0, 2);
            let msgByteSize = 0;
            if (byteValue === config.opReturn.opPushDataOne) {
                // If this byte is 4c, then the next byte is the message byte size.
                // Retrieve the message byte size and convert from hex to decimal
                msgByteSize = parseInt(hexStr.substring(2, 4), 16);
                // Remove 4c + message byte size info from the beginning of hexStr
                hexStr = hexStr.slice(4);
            } else {
                // This byte is the length of an upcoming msg
                msgByteSize = parseInt(hexStr.substring(0, 2), 16);
                // Remove message byte size info from the beginning of hexStr
                hexStr = hexStr.slice(2);
            }
            // Use msgByteSize to parse the message
            const msgCharLength = 2 * msgByteSize;
            const message = hexStr.slice(0, msgCharLength);

            // Add to opReturnMsgArray
            opReturnMsgArray.push(Buffer.from(message, 'hex').toString('utf8'));

            // strip out the parsed message
            hexStr = hexStr.slice(msgCharLength);
            hexStrLength = hexStr.length;

            // Sometimes OP_RETURN will have a series of msgs
            // Return to beginning of loop with i=0 if there hexStr still has remaining unparsed characters
        }
        // If there are multiple messages, for example an unknown prefix, signify this with the | character
        return opReturnMsgArray.join('|');
    },
    parseMemoOutputScript: function (memoHexStr) {
        // Remove the memo prefix, already processed
        memoHexStr = memoHexStr.slice(6);
        // At the beginning of this function, we have already popped off '0d6d'
        let app = config.opReturn.memo.app;
        let msg = '';
        for (let i = 0; memoHexStr !== 0; i++) {
            // Get the memo action code
            // See https://memo.cash/protocol
            const actionCode = memoHexStr.slice(0, 2);
            // Remove actionCode from memoHexStr
            memoHexStr = memoHexStr.slice(2);
            switch (actionCode) {
                case '01' || '02' || '05' || '0a' || '0c' || '0d' || '0e':
                    // Action codes where the entire string may be parsed to utf8
                    msg += `${
                        config.opReturn.memo[actionCode]
                    }|${module.exports.hexOpReturnToUtf8(memoHexStr)}`;
                    break;
                default:
                    // parse the rest of the string like a normal op_return utf8 string
                    msg += `${
                        Object.keys(config.opReturn.memo).includes(actionCode)
                            ? config.opReturn.memo[actionCode]
                            : ''
                    }|${module.exports.hexOpReturnToUtf8(memoHexStr)}`;
            }
            return { app, msg };
        }
    },
    getBlockTgMessage: function (parsedBlock, coingeckoPrices) {
        const { hash, height, miner, numTxs, parsedTxs } = parsedBlock;

        // Define newsworthy types of txs in parsedTxs
        // These arrays will be used to present txs in batches by type
        const genesisTxTgMsgLines = [];
        const opReturnTxTgMsgLines = [];
        const xecSendTxTgMsgLines = [];

        // Iterate over parsedTxs to find anything newsworthy
        for (let i = 0; i < parsedTxs.length; i += 1) {
            const thisParsedTx = parsedTxs[i];
            const {
                txid,
                genesisInfo,
                opReturnInfo,
                satsPerByte,
                xecSendingOutputScripts,
                xecChangeOutputs,
                xecReceivingOutputs,
            } = thisParsedTx;
            if (genesisInfo) {
                // The txid of a genesis tx is the tokenId
                const tokenId = txid;
                let { tokenTicker, tokenName, tokenDocumentUrl } = genesisInfo;
                // Make sure tokenName does not contain telegram html escape characters
                tokenName = prepareStringForTelegramHTML(tokenName);
                // Make sure tokenName does not contain telegram html escape characters
                tokenTicker = prepareStringForTelegramHTML(tokenTicker);
                // Do not apply this parsing to tokenDocumentUrl, as this could change the URL
                // If this breaks the msg, so be it
                // Would only happen for bad URLs
                genesisTxTgMsgLines.push(
                    `<a href="${config.blockExplorer}/tx/${tokenId}">${tokenName}</a> (${tokenTicker}) <a href="${tokenDocumentUrl}">[doc]</a>`,
                );
                // This parsed tx has a tg msg line. Move on to the next one.
                continue;
            }
            if (opReturnInfo) {
                let { app, msg } = opReturnInfo;
                // Make sure the OP_RETURN msg does not contain telegram html escape characters
                msg = prepareStringForTelegramHTML(msg);
                opReturnTxTgMsgLines.push(
                    `<a href="${config.blockExplorer}/tx/${txid}">${app}:</a> ${msg}`,
                );
                // This parsed tx has a tg msg line. Move on to the next one.
                continue;
            }
            // Txs not parsed above are parsed as xec send txs

            /* We do the totalSatsSent calculation here in getBlockTgMsg and not above in parseTx
             * as it is only necessary to do for rendered txs
             */
            let totalSatsSent = 0;
            for (const satoshis of xecReceivingOutputs.values()) {
                totalSatsSent += satoshis;
            }
            // Convert sats to XEC. Round as decimals will not be rendered in msgs.
            const totalXecSent = parseFloat((totalSatsSent / 100).toFixed(0));

            // Clone xecReceivingOutputs so that you don't modify unit test mocks
            let xecReceivingAddressOutputs = new Map(xecReceivingOutputs);

            // Throw out OP_RETURN outputs for txs parsed as XEC send txs
            xecReceivingAddressOutputs.forEach((value, key, map) => {
                if (key.startsWith(config.opReturn.opReturnPrefix)) {
                    map.delete(key);
                }
            });

            let xecSendMsg;
            if (xecReceivingAddressOutputs.size === 0) {
                // self send tx
                let changeAmountSats = 0;
                for (const satoshis of xecChangeOutputs.values()) {
                    changeAmountSats += satoshis;
                }
                // Convert sats to XEC.
                const changeAmountXec = parseFloat(changeAmountSats / 100);
                xecSendMsg = `${xecSendingOutputScripts.size} ${
                    xecSendingOutputScripts.size > 1 ? 'addresses' : 'address'
                } <a href="${
                    config.blockExplorer
                }/tx/${txid}">sent</a> ${changeAmountXec} XEC to ${
                    xecSendingOutputScripts.size > 1 ? 'themselves' : 'itself'
                }`;
            } else {
                xecSendMsg = `${returnAddressPreview(
                    cashaddr.encodeOutputScript(
                        xecSendingOutputScripts.values().next().value,
                    ),
                )} <a href="${
                    config.blockExplorer
                }/tx/${txid}">sent</a> ${totalXecSent.toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                })} XEC to ${
                    xecReceivingAddressOutputs.keys().next().value ===
                    xecSendingOutputScripts.values().next().value
                        ? 'itself'
                        : returnAddressPreview(
                              cashaddr.encodeOutputScript(
                                  xecReceivingAddressOutputs.keys().next()
                                      .value,
                              ),
                          )
                }${
                    xecReceivingAddressOutputs.size > 1
                        ? ` and ${xecReceivingAddressOutputs.size - 1} others`
                        : ''
                } | ${satsPerByte.toFixed(2)} sats per byte`;
            }

            xecSendTxTgMsgLines.push(xecSendMsg);
        }

        // Build up message as an array, with each line as an entry
        let tgMsg = [];

        // Header
        // <height> | <numTxs> | <miner>
        tgMsg.push(
            `<a href="${
                config.blockExplorer
            }/block/${hash}">${height}</a> | ${numTxs} tx${
                numTxs > 1 ? `s` : ''
            } | ${miner}`,
        );

        // Display prices as set in config.js
        if (coingeckoPrices) {
            // Iterate over prices and add a line for each price in the object

            for (let i = 0; i < coingeckoPrices.length; i += 1) {
                const { fiat, ticker, price } = coingeckoPrices[i];
                const thisFormattedPrice = formatPrice(price, fiat);
                tgMsg.push(`1 ${ticker} = ${thisFormattedPrice}`);
            }
        }

        // Genesis txs
        if (genesisTxTgMsgLines.length > 0) {
            // Line break for new section
            tgMsg.push('');

            // 1 new eToken created:
            // or
            // <n> new eTokens created:
            tgMsg.push(
                `${genesisTxTgMsgLines.length} new eToken${
                    genesisTxTgMsgLines.length > 1 ? `s` : ''
                } created:`,
            );

            tgMsg = tgMsg.concat(genesisTxTgMsgLines);
        }

        // OP_RETURN txs
        if (opReturnTxTgMsgLines.length > 0) {
            // Line break for new section
            tgMsg.push('');

            // App txs:
            // or
            // App tx:
            tgMsg.push(`App tx${opReturnTxTgMsgLines.length > 1 ? `s` : ''}:`);

            // <appName> : <parsedAppData>
            // alias: newlyregisteredalias
            // Cashtab Msg: This is a Cashtab Msg
            tgMsg = tgMsg.concat(opReturnTxTgMsgLines);
        }

        // XEC txs
        if (xecSendTxTgMsgLines.length > 0) {
            // Line break for new section
            tgMsg.push('');

            // App txs:
            // or
            // App tx:
            tgMsg.push(
                `${xecSendTxTgMsgLines.length} eCash tx${
                    xecSendTxTgMsgLines.length > 1 ? `s` : ''
                }:`,
            );

            tgMsg = tgMsg.concat(xecSendTxTgMsgLines);
        }

        // Join array with newLine char, \n
        return tgMsg.join('\n');
    },
};

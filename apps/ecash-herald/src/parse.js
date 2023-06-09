// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('../config');
const opReturn = require('../constants/op_return');
const { consumeNextPush } = require('ecash-script');
const knownMinersJson = require('../constants/miners');
const { jsonReviver } = require('../src/utils');
const miners = JSON.parse(JSON.stringify(knownMinersJson), jsonReviver);
const cashaddr = require('ecashaddrjs');
const BigNumber = require('bignumber.js');
const {
    prepareStringForTelegramHTML,
    splitOverflowTgMsg,
} = require('./telegram');
const { formatPrice, returnAddressPreview } = require('./utils');
module.exports = {
    parseBlock: function (chronikBlockResponse) {
        const { blockInfo, txs } = chronikBlockResponse;
        const { hash } = blockInfo;
        const { height, numTxs } = blockInfo;

        // Parse coinbase string
        const coinbaseTx = txs[0];
        const miner = module.exports.getMinerFromCoinbaseTx(coinbaseTx, miners);

        // Start with i=1 to skip Coinbase tx
        const parsedTxs = [];
        for (let i = 1; i < txs.length; i += 1) {
            parsedTxs.push(module.exports.parseTx(txs[i]));
        }

        // Collect token info needed to parse token send txs
        const tokenIds = new Set(); // we only need each tokenId once
        for (let i = 0; i < parsedTxs.length; i += 1) {
            const thisParsedTx = parsedTxs[i];
            if (thisParsedTx.tokenSendInfo) {
                tokenIds.add(thisParsedTx.tokenSendInfo.tokenId);
            }
        }

        return { hash, height, miner, numTxs, parsedTxs, tokenIds };
    },
    getMinerFromCoinbaseTx: function (coinbaseTx, knownMiners) {
        // get coinbase inputScript
        const testedCoinbaseScript = coinbaseTx.inputs[0].inputScript;

        // When you find the miner, minerInfo will come from knownMiners
        let minerInfo = false;

        // First, check outputScripts for a known miner
        const { outputs } = coinbaseTx;
        for (let i = 0; i < outputs.length; i += 1) {
            const thisOutputScript = outputs[i].outputScript;
            if (knownMiners.has(thisOutputScript)) {
                minerInfo = knownMiners.get(thisOutputScript);
                break;
            }
        }

        if (!minerInfo) {
            // If you still haven't found minerInfo, test by known pattern of coinbase script
            // Possibly a known miner is using a new address
            knownMiners.forEach(knownMinerInfo => {
                const { coinbaseHexFragment } = knownMinerInfo;
                if (testedCoinbaseScript.includes(coinbaseHexFragment)) {
                    minerInfo = knownMinerInfo;
                }
            });
        }

        // At this point, if you haven't found the miner, you won't
        if (!minerInfo) {
            return 'unknown';
        }

        // If you have found the miner, parse coinbase hex for additional info
        switch (minerInfo.miner) {
            // This is available for ViaBTC and CK Pool
            // Use a switch statement to easily support adding future miners
            case 'ViaBTC':
            // Intentional fall-through so ViaBTC and CKPool have same parsing
            // es-lint ignore no-fallthrough
            case 'CK Pool': {
                /* For ViaBTC, the interesting info is between '/' characters
                 * i.e. /Mined by 260786/
                 * In ascii, these are encoded with '2f'
                 */
                const infoHexParts = testedCoinbaseScript.split('2f');

                // Because the characters before and after the info we are looking for could also
                // contain '2f', we need to find the right part

                // The right part is the one that comes immediately after coinbaseHexFragment
                let infoAscii = '';
                for (let i = 0; i < infoHexParts.length; i += 1) {
                    if (
                        infoHexParts[i].includes(minerInfo.coinbaseHexFragment)
                    ) {
                        // We want the next one, if it exists
                        if (i + 1 < infoHexParts.length) {
                            infoAscii = Buffer.from(
                                infoHexParts[i + 1],
                                'hex',
                            ).toString('ascii');
                        }
                        break;
                    }
                }

                if (infoAscii === 'mined by IceBerg') {
                    // CK Pool, mined by IceBerg
                    // If this is IceBerg, identify uniquely
                    // Iceberg is probably a solo miner using CK Pool software
                    return `IceBerg`;
                }

                // Return your improved 'miner' info
                // ViaBTC, Mined by 260786
                if (infoAscii.length === 0) {
                    // If you did not find anything interesting, just return the miner
                    return minerInfo.miner;
                }
                return `${minerInfo.miner}, ${infoAscii}`;
            }
            default: {
                // Unless the miner has specific parsing rules defined above, no additional info is available
                return minerInfo.miner;
            }
        }
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

        /* Token send parsing info
         *
         * Note that token send amounts received from chronik do not account for
         * token decimals. Decimalized amounts require token genesisInfo
         * decimals param to calculate
         */

        /* tokenSendInfo
         * `false` for txs that are not etoken send txs
         * an object containing info about the token send for token send txs
         */
        let tokenSendInfo = false;
        let tokenSendingOutputScripts = new Set();
        let tokenReceivingOutputs = new Map();
        let tokenChangeOutputs = new Map();
        let undecimalizedTokenInputAmount = new BigNumber(0);

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
            // Determine if this is an etoken genesis tx
            if (
                tx.slpTxData.slpMeta !== null &&
                typeof tx.slpTxData.slpMeta !== 'undefined' &&
                tx.slpTxData.genesisInfo !== null &&
                typeof tx.slpTxData.genesisInfo !== 'undefined' &&
                tx.slpTxData.slpMeta.txType === 'GENESIS'
            ) {
                genesisInfo = tx.slpTxData.genesisInfo;
            }
            // Determine if this is an etoken send tx
            if (
                tx.slpTxData.slpMeta !== null &&
                typeof tx.slpTxData.slpMeta !== 'undefined' &&
                tx.slpTxData.slpMeta.txType === 'SEND'
            ) {
                // Initialize tokenSendInfo as an object with the sent tokenId
                tokenSendInfo = { tokenId: tx.slpTxData.slpMeta.tokenId };
            }
        }
        for (let i in inputs) {
            const thisInput = inputs[i];
            xecSendingOutputScripts.add(thisInput.outputScript);
            xecInputAmountSats += parseInt(thisInput.value);
            // The input that sent the token utxos will have key 'slpToken'
            if (typeof thisInput.slpToken !== 'undefined') {
                // Add amount to undecimalizedTokenInputAmount
                undecimalizedTokenInputAmount =
                    undecimalizedTokenInputAmount.plus(
                        thisInput.slpToken.amount,
                    );
                // Collect the input outputScripts to identify change output
                tokenSendingOutputScripts.add(thisInput.outputScript);
            }
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
                thisOutput.outputScript.startsWith(opReturn.opReturnPrefix) &&
                !isTokenTx
            ) {
                opReturnInfo = module.exports.parseOpReturn(
                    thisOutput.outputScript.slice(2),
                );
            }
            // For etoken send txs, parse outputs for tokenSendInfo object
            if (typeof thisOutput.slpToken !== 'undefined') {
                // Check output script to confirm does not match tokenSendingOutputScript
                if (tokenSendingOutputScripts.has(thisOutput.outputScript)) {
                    // change
                    tokenChangeOutputs.set(
                        thisOutput.outputScript,
                        (
                            tokenChangeOutputs.get(thisOutput.outputScript) ??
                            new BigNumber(0)
                        ).plus(thisOutput.slpToken.amount),
                    );
                } else {
                    /* This is the sent token qty
                     *
                     * Add outputScript and undecimalizedTokenReceivedAmount to map
                     * If this outputScript is already in tokenReceivingOutputs, increment undecimalizedTokenReceivedAmount
                     * note that thisOutput.slpToken.amount is a string so you do not want to add it
                     * BigNumber library is required for token calculations
                     */
                    tokenReceivingOutputs.set(
                        thisOutput.outputScript,
                        (
                            tokenReceivingOutputs.get(
                                thisOutput.outputScript,
                            ) ?? new BigNumber(0)
                        ).plus(thisOutput.slpToken.amount),
                    );
                }
            }
        }

        // Determine tx fee
        const txFee = xecInputAmountSats - xecOutputAmountSats;
        const satsPerByte = txFee / size;

        // If this is a token send tx, return token send parsing info and not 'false' for tokenSendInfo
        if (tokenSendInfo) {
            tokenSendInfo.tokenChangeOutputs = tokenChangeOutputs;
            tokenSendInfo.tokenReceivingOutputs = tokenReceivingOutputs;
            tokenSendInfo.tokenSendingOutputScripts = tokenSendingOutputScripts;
        }

        return {
            txid,
            genesisInfo,
            opReturnInfo,
            satsPerByte,
            xecSendingOutputScripts,
            xecChangeOutputs,
            xecReceivingOutputs,
            tokenSendInfo,
        };
    },
    /**
     *
     * @param {string} opReturnHex an OP_RETURN outputScript with '6a' removed
     * @returns {object} {app, msg} an object with app and msg params used to generate msg
     */
    parseOpReturn: function (opReturnHex) {
        // Initialize required vars
        let app;
        let msg;

        // Get array of pushes
        let stack = { remainingHex: opReturnHex };
        let stackArray = [];
        while (stack.remainingHex.length > 0) {
            stackArray.push(consumeNextPush(stack));
        }

        // Get the protocolIdentifier, the first push
        const protocolIdentifier = stackArray[0];

        // Test for memo
        // Memo prefixes are special in that they are two bytes instead of the usual four
        // Also, memo has many prefixes, in that the action is also encoded in these two bytes
        if (
            protocolIdentifier.startsWith(opReturn.memo.prefix) &&
            protocolIdentifier.length === 4
        ) {
            // If the protocol identifier is two bytes long (4 characters), parse for memo tx
            // For now, send the same info to this function that it currently parses
            // TODO parseMemoOutputScript needs to be refactored to use ecash-script
            return module.exports.parseMemoOutputScript(stackArray);
        }

        // Test for other known apps with known msg processing methods
        switch (protocolIdentifier) {
            case opReturn.knownApps.cashtabMsg.prefix: {
                app = opReturn.knownApps.cashtabMsg.app;
                // For a Cashtab msg, the next push on the stack is the Cashtab msg
                // Cashtab msgs use utf8 encoding
                msg = prepareStringForTelegramHTML(
                    Buffer.from(stackArray[1], 'hex').toString('utf8'),
                );
                break;
            }
            default: {
                /**
                 * If you don't recognize protocolIdentifier, just translate with ASCII
                 * Will be easy to spot these msgs in the bot and add special parsing rules                 *
                 */
                app = 'unknown';
                msg = prepareStringForTelegramHTML(
                    Buffer.from(stackArray.join(''), 'hex').toString('ascii'),
                );
                break;
            }
        }

        return { app, msg };
    },
    /**
     * Parse a stackArray according to OP_RETURN rules to convert to a useful tg msg
     * @param {Array} stackArray an array containing a hex string for every push of this memo OP_RETURN outputScript
     * @returns {string} A useful string to describe this tx in a telegram msg
     */
    parseMemoOutputScript: function (stackArray) {
        let app = opReturn.memo.app;
        let msg = '';

        // Get the action code from stackArray[0]
        // For memo txs, this will be the last 2 characters of this initial push
        const actionCode = stackArray[0].slice(-2);

        if (Object.keys(opReturn.memo).includes(actionCode)) {
            // If you parse for this action code, include its description in the tg msg
            msg += opReturn.memo[actionCode];
            // Include a formatting spacer in between action code and newsworthy info
            msg += '|';
        }

        switch (actionCode) {
            case '01': // Set name <name> (1-217 bytes)
            case '02': // Post memo <message> (1-217 bytes)
            case '05': // Set profile text <text> (1-217 bytes)
            case '0d': // Topic Follow <topic_name> (1-214 bytes)
            case '0e': // Topic Unfollow <topic_name> (1-214 bytes)
                // Action codes with only 1 push after the protocol identifier
                // that is utf8 encoded

                // Include decoded utf8 msg
                // Make sure the OP_RETURN msg does not contain telegram html escape characters
                msg += prepareStringForTelegramHTML(
                    Buffer.from(stackArray[1], 'hex').toString('utf8'),
                );
                break;
            case '03':
                /**
                 * 03 - Reply to memo
                 * <tx_hash> (32 bytes)
                 * <message> (1-184 bytes)
                 */

                // The tx hash is in hex, not utf8 encoded
                // For now, we don't have much to do with this txid in a telegram bot

                // Link to the liked or reposted memo
                // Do not remove tg escape characters as you want this to parse
                msg += `<a href="${config.blockExplorer}/tx/${stackArray[1]}">memo</a>`;

                // Include a formatting spacer
                msg += '|';

                // Add the reply
                msg += prepareStringForTelegramHTML(
                    Buffer.from(stackArray[2], 'hex').toString('utf8'),
                );
                break;
            case '04':
                /**
                 * 04 - Like / tip memo <tx_hash> (32 bytes)
                 */

                // Link to the liked or reposted memo
                msg += `<a href="${config.blockExplorer}/tx/${stackArray[1]}">memo</a>`;
                break;
            case '0b': {
                // 0b - Repost memo <tx_hash> (32 bytes) <message> (0-184 bytes)

                // Link to the liked or reposted memo
                msg += `<a href="${config.blockExplorer}/tx/${stackArray[1]}">memo</a>`;

                // Include a formatting spacer
                msg += '|';

                // Add the msg
                msg += prepareStringForTelegramHTML(
                    Buffer.from(stackArray[2], 'hex').toString('utf8'),
                );

                break;
            }
            case '06':
            case '07':
            case '16':
            case '17': {
                /**
                 * Follow user - 06 <address> (20 bytes)
                 * Unfollow user - 07 <address> (20 bytes)
                 * Mute user - 16 <address> (20 bytes)
                 * Unmute user - 17 <address> (20 bytes)
                 */

                // The address is a hex-encoded hash160
                // all memo addresses are p2pkh
                const address = cashaddr.encode(
                    'ecash',
                    'P2PKH',
                    stackArray[1],
                );

                // Link to the address in the msg
                msg += `<a href="${
                    config.blockExplorer
                }/address/${address}">${returnAddressPreview(address)}</a>`;
                break;
            }
            case '0a': {
                // 01 - Set profile picture
                // <url> (1-217 bytes)

                // url is utf8 encoded stack[1]
                const url = Buffer.from(stackArray[1], 'hex').toString('utf8');
                // Link to it
                msg += `<a href="${url}">[img]</a>`;
                break;
            }
            case '0c': {
                /**
                 * 0c - Post Topic Message
                 * <topic_name> (1-214 bytes)
                 * <message> (1-[214-len(topic_name)] bytes)
                 */

                // Add the topic
                msg += prepareStringForTelegramHTML(
                    Buffer.from(stackArray[1], 'hex').toString('utf8'),
                );

                // Add a format spacer
                msg += '|';

                // Add the topic msg
                msg += prepareStringForTelegramHTML(
                    Buffer.from(stackArray[2], 'hex').toString('utf8'),
                );
                break;
            }
            case '10': {
                /**
                 * 10 - Create Poll
                 * <poll_type> (1 byte)
                 * <option_count> (1 byte)
                 * <question> (1-209 bytes)
                 * */

                // You only need the question here
                msg += prepareStringForTelegramHTML(
                    Buffer.from(stackArray[3], 'hex').toString('utf8'),
                );

                break;
            }
            case '13': {
                /**
                 * 13 Add poll option
                 * <poll_tx_hash> (32 bytes)
                 * <option> (1-184 bytes)
                 */

                // Only parse the option for now
                msg += prepareStringForTelegramHTML(
                    Buffer.from(stackArray[2], 'hex').toString('utf8'),
                );

                break;
            }
            case '14': {
                /**
                 * 14 - Poll Vote
                 * <poll_tx_hash> (32 bytes)
                 * <comment> (0-184 bytes)
                 */

                // We just want the comment
                msg += prepareStringForTelegramHTML(
                    Buffer.from(stackArray[2], 'hex').toString('utf8'),
                );

                break;
            }
            case '20':
            case '24':
            case '26': {
                /**
                 * 20 - Link request
                 * 24 - Send money
                 * 26 - Set address alias
                 * <address_hash> (20 bytes)
                 * <message> (1-194 bytes)
                 */

                // The address is a hex-encoded hash160
                // all memo addresses are p2pkh
                const address = cashaddr.encode(
                    'ecash',
                    'P2PKH',
                    stackArray[1],
                );

                // Link to the address in the msg
                msg += `<a href="${
                    config.blockExplorer
                }/address/${address}">${returnAddressPreview(address)}</a>`;

                // Add a format spacer
                msg += '|';

                // Add the msg
                msg += prepareStringForTelegramHTML(
                    Buffer.from(stackArray[2], 'hex').toString('utf8'),
                );
                break;
            }
            case '21':
            case '22':
            case '30':
            case '31':
            case '32':
            case '35': {
                /**
                 * https://github.com/memocash/mips/blob/master/mip-0009/mip-0009.md#specification
                 *
                 * These would require additional processing to get info about the specific tokens
                 * For now, not worth it. Just print the action.
                 *
                 * 21 - Link accept
                 * 22 - Link revoke
                 * 30 - Sell tokens
                 * 31 - Token buy offer
                 * 32 - Attach token sale signature
                 * 35 - Pin token post
                 */

                // Remove formatting spacer
                msg = msg.slice(0, -1);
                break;
            }

            default:
                msg += `Unknown memo action`;
        }
        return { app, msg };
    },
    getBlockTgMessage: function (parsedBlock, coingeckoPrices, tokenInfoMap) {
        const { hash, height, miner, numTxs, parsedTxs } = parsedBlock;

        // Define newsworthy types of txs in parsedTxs
        // These arrays will be used to present txs in batches by type
        const genesisTxTgMsgLines = [];
        const tokenSendTxTgMsgLines = [];
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
                tokenSendInfo,
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
                opReturnTxTgMsgLines.push(
                    `<a href="${config.blockExplorer}/tx/${txid}">${app}:</a> ${msg}`,
                );
                // This parsed tx has a tg msg line. Move on to the next one.
                continue;
            }
            // Only parse tokenSendInfo txs if you successfuly got tokenMapInfo from chronik
            if (tokenSendInfo && tokenInfoMap) {
                let {
                    tokenId,
                    tokenSendingOutputScripts,
                    tokenChangeOutputs,
                    tokenReceivingOutputs,
                } = tokenSendInfo;

                // Get token info from tokenInfoMap
                const thisTokenInfo = tokenInfoMap.get(tokenId);

                let { tokenTicker, tokenName, decimals } = thisTokenInfo;
                // Note: tokenDocumentUrl and tokenDocumentHash are also available from thisTokenInfo

                // Make sure tokenName does not contain telegram html escape characters
                tokenName = prepareStringForTelegramHTML(tokenName);
                // Make sure tokenName does not contain telegram html escape characters
                tokenTicker = prepareStringForTelegramHTML(tokenTicker);

                // Initialize tokenSendMsg
                let tokenSendMsg;

                // Parse token self-send txs
                if (tokenReceivingOutputs.size === 0) {
                    // self send tx
                    let undecimalizedTokenChangeAmount = new BigNumber(0);
                    for (const tokenChangeAmount of tokenChangeOutputs.values()) {
                        undecimalizedTokenChangeAmount =
                            undecimalizedTokenChangeAmount.plus(
                                tokenChangeAmount,
                            );
                    }
                    // Calculate true tokenChangeAmount using decimals
                    // Use decimals to calculate the sent amount as string
                    const decimalizedTokenChangeAmount = new BigNumber(
                        undecimalizedTokenChangeAmount,
                    )
                        .shiftedBy(-1 * decimals)
                        .toString();

                    // Self send tokenSendMsg
                    tokenSendMsg = `${tokenSendingOutputScripts.size} ${
                        tokenSendingOutputScripts.size > 1
                            ? 'addresses'
                            : 'address'
                    } <a href="${
                        config.blockExplorer
                    }/tx/${txid}">sent</a> ${decimalizedTokenChangeAmount} <a href="${
                        config.blockExplorer
                    }/tx/${tokenId}">${tokenTicker}</a> to ${
                        tokenSendingOutputScripts.size > 1
                            ? 'themselves'
                            : 'itself'
                    }`;
                } else {
                    // Normal token send tx
                    let undecimalizedTokenReceivedAmount = new BigNumber(0);
                    for (const tokenReceivedAmount of tokenReceivingOutputs.values()) {
                        undecimalizedTokenReceivedAmount =
                            undecimalizedTokenReceivedAmount.plus(
                                tokenReceivedAmount,
                            );
                    }
                    // Calculate true tokenReceivedAmount using decimals
                    // Use decimals to calculate the received amount as string
                    const decimalizedTokenReceivedAmount = new BigNumber(
                        undecimalizedTokenReceivedAmount,
                    )
                        .shiftedBy(-1 * decimals)
                        .toString();
                    tokenSendMsg = `${returnAddressPreview(
                        cashaddr.encodeOutputScript(
                            tokenSendingOutputScripts.values().next().value,
                        ),
                    )} <a href="${
                        config.blockExplorer
                    }/tx/${txid}">sent</a> ${decimalizedTokenReceivedAmount.toLocaleString(
                        'en-US',
                        {
                            minimumFractionDigits: decimals,
                        },
                    )} <a href="${
                        config.blockExplorer
                    }/tx/${tokenId}">${tokenTicker}</a> to ${returnAddressPreview(
                        cashaddr.encodeOutputScript(
                            tokenReceivingOutputs.keys().next().value,
                        ),
                    )}${
                        tokenReceivingOutputs.size > 1
                            ? ` and ${tokenReceivingOutputs.size - 1} others`
                            : ''
                    }`;
                }

                tokenSendTxTgMsgLines.push(tokenSendMsg);
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
                if (key.startsWith(opReturn.opReturnPrefix)) {
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

        // eToken Send txs
        if (tokenSendTxTgMsgLines.length > 0) {
            // Line break for new section
            tgMsg.push('');

            // 1 eToken send tx:
            // or
            // <n> eToken send txs:
            tgMsg.push(
                `${tokenSendTxTgMsgLines.length} eToken send tx${
                    tokenSendTxTgMsgLines.length > 1 ? `s` : ''
                }`,
            );

            tgMsg = tgMsg.concat(tokenSendTxTgMsgLines);
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

        return splitOverflowTgMsg(tgMsg);
    },
};

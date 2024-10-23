// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('../config');
const opReturn = require('../constants/op_return');
const { consume, consumeNextPush, swapEndianness } = require('ecash-script');
const knownMinersJson = require('../constants/miners');
const cachedTokenInfoMap = require('../constants/tokens');
const { jsonReviver, bigNumberAmountToLocaleString } = require('../src/utils');
const miners = JSON.parse(JSON.stringify(knownMinersJson), jsonReviver);
const cashaddr = require('ecashaddrjs');
const BigNumber = require('bignumber.js');
const {
    TOKEN_SERVER_OUTPUTSCRIPT,
    BINANCE_OUTPUTSCRIPT,
} = require('../constants/senders');
const {
    prepareStringForTelegramHTML,
    splitOverflowTgMsg,
} = require('./telegram');
const {
    formatPrice,
    satsToFormattedValue,
    returnAddressPreview,
    containsOnlyPrintableAscii,
} = require('./utils');
const lokadMap = require('../constants/lokad');

// Constants for SLP 1 token types as returned by chronik-client
const SLP_1_PROTOCOL_NUMBER = 1;
const SLP_1_NFT_COLLECTION_PROTOCOL_NUMBER = 129;
const SLP_1_NFT_PROTOCOL_NUMBER = 65;

// Miner fund output script
const minerFundOutputScript = 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087';

module.exports = {
    /**
     * Parse a finalized block for newsworthy information
     * @param {string} blockHash
     * @param {number} blockHeight
     * @param {Tx_InNode[]} txs
     */
    parseBlockTxs: function (blockHash, blockHeight, txs) {
        // Parse coinbase string
        const coinbaseTx = txs[0];
        const miner = module.exports.getMinerFromCoinbaseTx(
            coinbaseTx.inputs[0].inputScript,
            coinbaseTx.outputs,
            miners,
        );
        let staker = module.exports.getStakerFromCoinbaseTx(
            blockHeight,
            coinbaseTx.outputs,
        );
        try {
            staker.staker = cashaddr.encodeOutputScript(staker.staker);
        } catch (err) {
            staker.staker = 'script(' + staker.staker + ')';
        }

        // Start with i=1 to skip Coinbase tx
        let parsedTxs = [];
        for (let i = 1; i < txs.length; i += 1) {
            parsedTxs.push(module.exports.parseTx(txs[i]));
        }

        // Sort parsedTxs by totalSatsSent, highest to lowest
        parsedTxs = parsedTxs.sort((a, b) => {
            return b.totalSatsSent - a.totalSatsSent;
        });

        // Collect token info needed to parse token send txs
        const tokenIds = new Set(); // we only need each tokenId once
        // Collect outputScripts seen in this block to parse for balance
        let outputScripts = new Set();
        for (let i = 0; i < parsedTxs.length; i += 1) {
            const thisParsedTx = parsedTxs[i];
            if (thisParsedTx.tokenSendInfo) {
                tokenIds.add(thisParsedTx.tokenSendInfo.tokenId);
            }
            if (thisParsedTx.genesisInfo) {
                tokenIds.add(thisParsedTx.genesisInfo.tokenId);
            }
            if (thisParsedTx.tokenBurnInfo) {
                tokenIds.add(thisParsedTx.tokenBurnInfo.tokenId);
            }
            // Some OP_RETURN txs also have token IDs we need to parse
            // SWaP txs, (TODO: airdrop txs)
            if (
                thisParsedTx.opReturnInfo &&
                thisParsedTx.opReturnInfo.tokenId
            ) {
                tokenIds.add(thisParsedTx.opReturnInfo.tokenId);
            }
            const { xecSendingOutputScripts, xecReceivingOutputs } =
                thisParsedTx;

            // Only add the first sending and receiving output script,
            // As you will only render balance emojis for these
            outputScripts.add(xecSendingOutputScripts.values().next().value);

            // For receiving outputScripts, add the first that is not OP_RETURN
            // So, get an array of the outputScripts first
            const xecReceivingOutputScriptsArray = Array.from(
                xecReceivingOutputs.keys(),
            );
            for (let j = 0; j < xecReceivingOutputScriptsArray.length; j += 1) {
                if (
                    !xecReceivingOutputScriptsArray[j].startsWith(
                        opReturn.opReturnPrefix,
                    )
                ) {
                    outputScripts.add(xecReceivingOutputScriptsArray[j]);
                    // Exit loop after you've added the first non-OP_RETURN outputScript
                    break;
                }
            }
        }
        return {
            hash: blockHash,
            height: blockHeight,
            miner,
            staker,
            numTxs: txs.length,
            parsedTxs,
            tokenIds,
            outputScripts,
        };
    },
    getStakerFromCoinbaseTx: function (blockHeight, coinbaseOutputs) {
        const STAKING_ACTIVATION_HEIGHT = 818670;
        if (blockHeight < STAKING_ACTIVATION_HEIGHT) {
            // Do not parse for staking rwds if they are not expected to exist
            return false;
        }
        const STAKING_REWARDS_PERCENT = 10;
        const totalCoinbaseSats = coinbaseOutputs
            .map(output => parseInt(output.value))
            .reduce((prev, curr) => prev + curr, 0);
        for (let output of coinbaseOutputs) {
            const thisValue = parseInt(output.value);
            const minStakerValue = Math.floor(
                totalCoinbaseSats * STAKING_REWARDS_PERCENT * 0.01,
            );
            // In practice, the staking reward will almost always be the one that is exactly 10% of totalCoinbaseSats
            // Use a STAKER_PERCENT_PADDING range to exclude miner and ifp outputs
            const STAKER_PERCENT_PADDING = 1;
            const assumedMaxStakerValue = Math.floor(
                totalCoinbaseSats *
                    (STAKING_REWARDS_PERCENT + STAKER_PERCENT_PADDING) *
                    0.01,
            );
            if (
                thisValue >= minStakerValue &&
                thisValue <= assumedMaxStakerValue
            ) {
                return {
                    // Return the script, there is no guarantee that we can use
                    // an address to display this.
                    staker: output.outputScript,
                    reward: thisValue,
                };
            }
        }
        // If you don't find a staker, don't add it in msg. Can troubleshoot if see this in the app.
        // This can happen if a miner overpays rwds, underpays miner rwds
        return false;
    },
    getMinerFromCoinbaseTx: function (
        coinbaseScriptsig,
        coinbaseOutputs,
        knownMiners,
    ) {
        // When you find the miner, minerInfo will come from knownMiners
        let minerInfo = false;

        // First, check outputScripts for a known miner
        for (let i = 0; i < coinbaseOutputs.length; i += 1) {
            const thisOutputScript = coinbaseOutputs[i].outputScript;
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
                if (coinbaseScriptsig.includes(coinbaseHexFragment)) {
                    minerInfo = knownMinerInfo;
                }
            });
        }

        if (!minerInfo) {
            // We're still unable to identify the miner, so resort to
            // indentifying by the last chars of the payout address. For now
            // we assume the ordering of outputs such as the miner reward is at
            // the first position.
            const minerPayoutSript = coinbaseOutputs[0].outputScript;
            try {
                const minerAddress =
                    cashaddr.encodeOutputScript(minerPayoutSript);
                return `unknown, ...${minerAddress.slice(-4)}`;
            } catch (err) {
                console.log(
                    `Error converting miner payout script (${minerPayoutSript}) to eCash address`,
                    err,
                );
                // Give up
                return 'unknown';
            }
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
                const infoHexParts = coinbaseScriptsig.split('2f');

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

                if (infoAscii === 'mined by iceberg') {
                    // If the miner self identifies as iceberg, go with it
                    return `iceberg`;
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

        const { txid, inputs, outputs } = tx;

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

        // tokenBurn parsing variables
        let tokenBurnInfo = false;

        /* Collect xecSendInfo for all txs, since all txs are XEC sends
         * You may later want to render xecSendInfo for tokenSends, appTxs, etc,
         * maybe on special conditions, e.g.a token send tx that also sends a bunch of xec
         */

        // xecSend parsing variables
        let xecSendingOutputScripts = new Set();
        let xecReceivingOutputs = new Map();
        let xecInputAmountSats = 0;
        let xecOutputAmountSats = 0;
        let totalSatsSent = 0;
        let changeAmountSats = 0;

        if (
            tx.tokenStatus !== 'TOKEN_STATUS_NON_TOKEN' &&
            tx.tokenEntries.length > 0
        ) {
            isTokenTx = true;

            // We may have more than one token action in a given tx
            // chronik will reflect this by having multiple entries in the tokenEntries array

            // For now, just parse the first action
            // TODO handle txs with multiple tokenEntries
            const parsedTokenAction = tx.tokenEntries[0];

            const {
                tokenId,
                tokenType,
                txType,
                burnSummary,
                actualBurnAmount,
            } = parsedTokenAction;
            const { protocol, number } = tokenType;
            const isUnintentionalBurn =
                burnSummary !== '' && actualBurnAmount !== '0';

            // Get token type
            // TODO present the token type in msgs
            let parsedTokenType = '';
            switch (protocol) {
                case 'ALP': {
                    parsedTokenType = 'ALP';
                    break;
                }
                case 'SLP': {
                    if (number === SLP_1_PROTOCOL_NUMBER) {
                        parsedTokenType = 'SLP';
                    } else if (
                        number === SLP_1_NFT_COLLECTION_PROTOCOL_NUMBER
                    ) {
                        parsedTokenType = 'NFT Collection';
                    } else if (number === SLP_1_NFT_PROTOCOL_NUMBER) {
                        parsedTokenType = 'NFT';
                    }
                    break;
                }
                default: {
                    parsedTokenType = `${protocol} ${number}`;
                    break;
                }
            }

            switch (txType) {
                case 'GENESIS': {
                    // Note that NNG chronik provided genesisInfo in this tx
                    // Now we get it from chronik.token
                    // Initialize genesisInfo object with tokenId so it can be rendered into a msg later
                    genesisInfo = { tokenId };
                    break;
                }
                case 'SEND': {
                    if (isUnintentionalBurn) {
                        tokenBurnInfo = {
                            tokenId,
                            undecimalizedTokenBurnAmount: actualBurnAmount,
                        };
                    } else {
                        tokenSendInfo = {
                            tokenId,
                            parsedTokenType,
                            txType,
                        };
                    }
                    break;
                }
                // TODO handle MINT
                default: {
                    // For now, if we can't parse as above, this will be parsed as an eCash tx (or EMPP)
                    break;
                }
            }
        }
        for (const input of inputs) {
            xecSendingOutputScripts.add(input.outputScript);
            xecInputAmountSats += input.value;
            // The input that sent the token utxos will have key 'slpToken'
            if (typeof input.token !== 'undefined') {
                // Add amount to undecimalizedTokenInputAmount
                // TODO make sure this is for the correct tokenID
                // Could have mistakes in parsing ALP txs otherwise
                // For now, this is outside the scope of migration
                undecimalizedTokenInputAmount =
                    undecimalizedTokenInputAmount.plus(input.token.amount);
                // Collect the input outputScripts to identify change output
                tokenSendingOutputScripts.add(input.outputScript);
            }
        }

        // Iterate over outputs to check for OP_RETURN msgs
        for (const output of outputs) {
            const { value, outputScript } = output;
            xecOutputAmountSats += value;
            // If this output script is the same as one of the sendingOutputScripts
            if (xecSendingOutputScripts.has(outputScript)) {
                // Then this XEC amount is change
                changeAmountSats += value;
            } else {
                // Add an xecReceivingOutput

                // Add outputScript and value to map
                // If this outputScript is already in xecReceivingOutputs, increment its value
                xecReceivingOutputs.set(
                    outputScript,
                    (xecReceivingOutputs.get(outputScript) ?? 0) + value,
                );

                // Increment totalSatsSent
                totalSatsSent += value;
            }
            // Don't parse OP_RETURN values of etoken txs, this info is available from chronik
            if (
                outputScript.startsWith(opReturn.opReturnPrefix) &&
                !isTokenTx
            ) {
                opReturnInfo = module.exports.parseOpReturn(
                    outputScript.slice(2),
                );
            }
            // For etoken send txs, parse outputs for tokenSendInfo object
            if (typeof output.token !== 'undefined') {
                // TODO handle EMPP and potential token txs with multiple tokens involved
                // Check output script to confirm does not match tokenSendingOutputScript
                if (tokenSendingOutputScripts.has(outputScript)) {
                    // change
                    tokenChangeOutputs.set(
                        outputScript,
                        (
                            tokenChangeOutputs.get(outputScript) ??
                            new BigNumber(0)
                        ).plus(output.token.amount),
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
                        outputScript,
                        (
                            tokenReceivingOutputs.get(outputScript) ??
                            new BigNumber(0)
                        ).plus(output.token.amount),
                    );
                }
            }
        }

        // Determine tx fee
        const txFee = xecInputAmountSats - xecOutputAmountSats;

        // If this is a token send tx, return token send parsing info and not 'false' for tokenSendInfo
        if (tokenSendInfo) {
            tokenSendInfo.tokenChangeOutputs = tokenChangeOutputs;
            tokenSendInfo.tokenReceivingOutputs = tokenReceivingOutputs;
            tokenSendInfo.tokenSendingOutputScripts = tokenSendingOutputScripts;
        }

        // If this tx sent XEC to itself, reassign changeAmountSats to totalSatsSent
        // Need to do this to prevent self-send txs being sorted at the bottom of msgs
        if (xecReceivingOutputs.size === 0) {
            totalSatsSent = changeAmountSats;
        }

        return {
            txid,
            genesisInfo,
            opReturnInfo,
            txFee,
            xecSendingOutputScripts,
            xecReceivingOutputs,
            totalSatsSent,
            tokenSendInfo,
            tokenBurnInfo,
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
        let tokenId = false;

        // Get array of pushes
        let stack = { remainingHex: opReturnHex };
        let stackArray = [];
        while (stack.remainingHex.length > 0) {
            const { data } = consumeNextPush(stack);
            if (data !== '') {
                // You may have an empty push in the middle of a complicated tx for some reason
                // Mb some libraries erroneously create these
                // e.g. https://explorer.e.cash/tx/70c2842e1b2c7eb49ee69cdecf2d6f3cd783c307c4cbeef80f176159c5891484
                // has 4c000100 for last characters. 4c00 is just nothing.
                // But you want to know 00 and have the correct array index
                stackArray.push(data);
            }
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
            case opReturn.opReserved: {
                // Parse for empp OP_RETURN
                // Spec https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/chronik/bitcoinsuite-slp/src/empp/mod.rs
                return module.exports.parseMultipushStack(stackArray);
            }
            case opReturn.knownApps.alias.prefix: {
                app = opReturn.knownApps.alias.app;
                /*
                For now, parse and render alias txs by going through OP_RETURN
                When aliases are live, refactor to use alias-server for validation
                <protocolIdentifier> <version> <alias> <address type + hash>

                Only parse the msg if the tx is constructed correctly
                */
                msg =
                    stackArray.length === 4 && stackArray[1] === '00'
                        ? prepareStringForTelegramHTML(
                              Buffer.from(stackArray[2], 'hex').toString(
                                  'utf8',
                              ),
                          )
                        : 'Invalid alias registration';

                break;
            }
            case opReturn.knownApps.airdrop.prefix: {
                app = opReturn.knownApps.airdrop.app;

                // Initialize msg as empty string. Need tokenId info to complete.
                msg = '';

                // Airdrop tx has structure
                // <prefix> <tokenId>

                // Cashtab allows sending a cashtab msg with an airdrop
                // These look like
                // <prefix> <tokenId> <cashtabMsgPrefix> <msg>
                if (stackArray.length >= 2 && stackArray[1].length === 64) {
                    tokenId = stackArray[1];
                }
                break;
            }
            case opReturn.knownApps.cashtabMsg.prefix: {
                app = opReturn.knownApps.cashtabMsg.app;
                // For a Cashtab msg, the next push on the stack is the Cashtab msg
                // Cashtab msgs use utf8 encoding

                // Valid Cashtab Msg
                // <protocol identifier> <msg in utf8>
                msg =
                    stackArray.length >= 2
                        ? prepareStringForTelegramHTML(
                              Buffer.from(stackArray[1], 'hex').toString(
                                  'utf8',
                              ),
                          )
                        : `Invalid ${app}`;
                break;
            }
            case opReturn.knownApps.cashtabMsgEncrypted.prefix: {
                app = opReturn.knownApps.cashtabMsgEncrypted.app;
                // For an encrypted cashtab msg, you can't parse and display the msg
                msg = '';
                // You will add info about the tx when you build the msg
                break;
            }
            case opReturn.knownApps.fusionLegacy.prefix:
            case opReturn.knownApps.fusion.prefix: {
                /**
                 * Cash Fusion tx
                 * <protocolIdentifier> <sessionHash>
                 * https://github.com/cashshuffle/spec/blob/master/CASHFUSION.md
                 */
                app = opReturn.knownApps.fusion.app;
                // The session hash is not particularly interesting to users
                // Provide tx info in telegram prep function
                msg = '';
                break;
            }
            case opReturn.knownApps.swap.prefix: {
                // Swap txs require special parsing that should be done in getSwapTgMsg
                // We may need to get info about a token ID before we can
                // create a good msg
                app = opReturn.knownApps.swap.app;
                msg = '';

                if (
                    stackArray.length >= 3 &&
                    stackArray[1] === '01' &&
                    stackArray[2] === '01' &&
                    stackArray[3].length === 64
                ) {
                    // If this is a signal for buy or sell of a token, save the token id
                    // Ref https://github.com/vinarmani/swap-protocol/blob/master/swap-protocol-spec.md
                    // A buy or sell signal tx will have '01' at stackArray[1] and stackArray[2] and
                    // token id at stackArray[3]
                    tokenId = stackArray[3];
                }
                break;
            }
            case opReturn.knownApps.payButton.prefix: {
                app = opReturn.knownApps.payButton.app;
                // PayButton v0
                // https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/paybutton.md
                // <lokad> <OP_0> <data> <nonce>
                // The data could be interesting, ignore the rest
                if (stackArray.length >= 3) {
                    // Version byte is at index 1
                    const payButtonTxVersion = stackArray[1];
                    if (payButtonTxVersion !== '00') {
                        msg = `Unsupported version: 0x${payButtonTxVersion}`;
                    } else {
                        const dataPush = stackArray[2];
                        if (dataPush === '00') {
                            // Per spec, PayButton txs with no data push OP_0 in this position
                            msg = 'no data';
                        } else {
                            // Data is utf8 encoded
                            msg = prepareStringForTelegramHTML(
                                Buffer.from(stackArray[2], 'hex').toString(
                                    'utf8',
                                ),
                            );
                        }
                    }
                } else {
                    msg = '[off spec]';
                }
                break;
            }
            case opReturn.knownApps.paywall.prefix: {
                app = opReturn.knownApps.paywall.app;
                // https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/op_return-prefix-guideline.md
                // <lokad> <txid of the article this paywall is paying for>
                if (stackArray.length === 2) {
                    const articleTxid = stackArray[1];
                    if (
                        typeof articleTxid === 'undefined' ||
                        articleTxid.length !== 64
                    ) {
                        msg = `Invalid paywall article txid`;
                    } else {
                        msg = `<a href="${config.blockExplorer}/tx/${articleTxid}">Article paywall payment</a>`;
                    }
                } else {
                    msg = '[off spec paywall payment]';
                }
                break;
            }
            case opReturn.knownApps.authentication.prefix: {
                app = opReturn.knownApps.authentication.app;
                // https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/op_return-prefix-guideline.md
                // <lokad> <authentication identifier>
                if (stackArray.length === 2) {
                    const authenticationHex = stackArray[1];
                    if (authenticationHex === '00') {
                        msg = `Invalid eCashChat authentication identifier`;
                    } else {
                        msg = 'eCashChat authentication via dust tx';
                    }
                } else {
                    msg = '[off spec eCashChat authentication]';
                }
                break;
            }
            default: {
                // If you do not recognize the protocol identifier, just print the pushes in hex
                // If it is an app or follows a pattern, can be added later
                app = 'unknown';

                if (containsOnlyPrintableAscii(stackArray.join(''))) {
                    msg = prepareStringForTelegramHTML(
                        Buffer.from(stackArray.join(''), 'hex').toString(
                            'ascii',
                        ),
                    );
                } else {
                    // If you have non-ascii characters, print each push as a hex number
                    msg = '';
                    for (let i = 0; i < stackArray.length; i += 1) {
                        msg += `0x${stackArray[i]} `;
                    }
                    // Remove the last space
                    msg = msg.slice(0, -1);

                    // Trim the msg for Telegram to avoid 200+ char msgs
                    const unknownMaxChars = 20;
                    if (msg.length > unknownMaxChars) {
                        msg = msg.slice(0, unknownMaxChars) + '...';
                    }
                }

                break;
            }
        }

        return { app, msg, stackArray, tokenId };
    },
    /**
     * Parse an empp stack for a simplified slp v2 description
     * TODO expand for parsing other types of empp txs as specs or examples are known
     * @param {array} emppStackArray an array containing a hex string for every push of this memo OP_RETURN outputScript
     * @returns {object} {app, msg} used to compose a useful telegram msg describing the transaction
     */
    parseMultipushStack: function (emppStackArray) {
        // Note that an empp push may not necessarily include traditionally parsed pushes
        // i.e. consumeNextPush({remainingHex:<emppPush>}) may throw an error
        // For example, SLPv2 txs do not include a push for their prefix

        // So, parsing empp txs will require specific rules depending on the type of tx
        let msgs = [];

        // Start at i=1 because emppStackArray[0] is OP_RESERVED
        for (let i = 1; i < emppStackArray.length; i += 1) {
            if (
                emppStackArray[i].slice(0, 8) === opReturn.knownApps.slp2.prefix
            ) {
                // Parse string for slp v2
                const thisMsg = module.exports.parseSlpTwo(
                    emppStackArray[i].slice(8),
                );
                msgs.push(`${opReturn.knownApps.slp2.app}:${thisMsg}`);
            } else {
                // Since we don't know any spec or parsing rules for other types of EMPP pushes,
                // Just add an ASCII decode of the whole thing if you see one
                msgs.push(
                    `${'Unknown App:'}${Buffer.from(
                        emppStackArray[i],
                        'hex',
                    ).toString('ascii')}`,
                );
            }
            // Do not parse any other empp (haven't seen any in the wild, no existing specs to follow)
        }
        if (msgs.length > 0) {
            return { app: 'EMPP', msg: msgs.join('|') };
        }
    },
    /**
     * Stub method to parse slp two empps
     * @param {string} slpTwoPush a string of hex characters in an empp tx representing an slp2 push
     * @returns {string} For now, just the section type, if token type is correct
     */
    parseSlpTwo: function (slpTwoPush) {
        // Parse an empp push hex string with the SLP protocol identifier removed per SLP v2 spec
        // https://ecashbuilders.notion.site/SLPv2-a862a4130877448387373b9e6a93dd97

        let msg = '';

        // Create a stack to use ecash-script consume function
        // Note: slp2 parsing is not standard op_return parsing, varchar bytes just use a one-byte push
        // So, you can use the 'consume' function of ecash-script, but not consumeNextPush
        let stack = { remainingHex: slpTwoPush };

        // 1.3: Read token type
        // For now, this can only be 00. If not 00, unknown
        const tokenType = consume(stack, 1);

        if (tokenType !== '00') {
            msg += 'Unknown token type|';
        }

        // 1.4: Read section type
        // These are custom varchar per slp2 spec
        // <varchar byte hex> <section type>
        const sectionBytes = parseInt(consume(stack, 1), 16);
        // Note: these are encoded with push data, so you can use ecash-script

        const sectionType = Buffer.from(
            consume(stack, sectionBytes),
            'hex',
        ).toString('utf8');
        msg += sectionType;

        // Parsing differs depending on section type
        // Note that SEND and MINT have same parsing

        const TOKEN_ID_BYTES = 32;
        switch (sectionType) {
            case 'SEND':
            case 'MINT': {
                // Next up is tokenId
                const tokenId = swapEndianness(consume(stack, TOKEN_ID_BYTES));

                const cachedTokenInfo = cachedTokenInfoMap.get(tokenId);

                msg += `|<a href="${config.blockExplorer}/tx/${tokenId}">${
                    typeof cachedTokenInfo === 'undefined'
                        ? `${tokenId.slice(0, 3)}...${tokenId.slice(-3)}`
                        : prepareStringForTelegramHTML(
                              cachedTokenInfo.tokenTicker,
                          )
                }</a>`;

                const numOutputs = consume(stack, 1);
                // Iterate over number of outputs to get total amount sent
                // Note: this should be handled with an indexer, as we are not parsing for validity here
                // However, it's still useful information for the herald
                let totalAmountSent = 0;
                for (let i = 0; i < numOutputs; i += 1) {
                    totalAmountSent += parseInt(
                        swapEndianness(consume(stack, 6)),
                    );
                }
                msg +=
                    typeof cachedTokenInfo === 'undefined'
                        ? ''
                        : `|${bigNumberAmountToLocaleString(
                              totalAmountSent.toString(),
                              cachedTokenInfo.decimals,
                          )}`;
                break;
            }

            case 'GENESIS': {
                // TODO
                // Have not seen one of these in the wild yet
                break;
            }

            case 'BURN': {
                // TODO
                // Have seen some in the wild but not in spec
                break;
            }
        }
        // The rest of the parsing rules get quite complicated and should be handled in a dedicated library
        // or indexer
        return msg;
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
        // Test for msgs that are intended for non-XEC audience
        if (msg.includes('BCH')) {
            msg = `[check memo.cash for msg]`;
        }
        return { app, msg };
    },
    /**
     * Build a msg about an encrypted cashtab msg tx
     * @param {string} sendingAddress
     * @param {map} xecReceivingOutputs
     * @param {object} coingeckoPrices
     * @returns {string} msg
     */
    getEncryptedCashtabMsg: function (
        sendingAddress,
        xecReceivingOutputs,
        totalSatsSent,
        coingeckoPrices,
    ) {
        let displayedSentQtyString = satsToFormattedValue(
            totalSatsSent,
            coingeckoPrices,
        );

        // Remove OP_RETURNs from xecReceivingOutputs
        let receivingOutputscripts = [];
        for (const outputScript of xecReceivingOutputs.keys()) {
            if (!outputScript.startsWith(opReturn.opReturnPrefix)) {
                receivingOutputscripts.push(outputScript);
            }
        }

        let msgRecipientString = `${returnAddressPreview(
            cashaddr.encodeOutputScript(receivingOutputscripts[0]),
        )}`;
        if (receivingOutputscripts.length > 1) {
            // Subtract 1 because you have already rendered one receiving address
            msgRecipientString += ` and ${
                receivingOutputscripts.length - 1
            } other${receivingOutputscripts.length > 2 ? 's' : ''}`;
        }
        return `${returnAddressPreview(
            sendingAddress,
        )} sent an encrypted message and ${displayedSentQtyString} to ${msgRecipientString}`;
    },
    /**
     * Parse the stackArray of an airdrop tx to generate a useful telegram msg
     * @param {array} stackArray
     * @param {string} airdropSendingAddress
     * @param {Map} airdropRecipientsMap
     * @param {object} tokenInfo token info for the swapped token. optional. Bool False if API call failed.
     * @param {object} coingeckoPrices object containing price info from coingecko. Bool False if API call failed.
     * @returns {string} msg ready to send through Telegram API
     */
    getAirdropTgMsg: function (
        stackArray,
        airdropSendingAddress,
        airdropRecipientsMap,
        totalSatsAirdropped,
        tokenInfo,
        coingeckoPrices,
    ) {
        // stackArray for an airdrop tx will be
        // [airdrop_protocol_identifier, airdropped_tokenId, optional_cashtab_msg_protocol_identifier, optional_cashtab_msg]

        // Validate expected format
        if (stackArray.length < 2 || stackArray[1].length !== 64) {
            return `Invalid ${opReturn.knownApps.airdrop.app}`;
        }

        // get tokenId
        const tokenId = stackArray[1];

        // Intialize msg with preview of sending address
        let msg = `${returnAddressPreview(airdropSendingAddress)} airdropped `;

        let displayedAirdroppedQtyString = satsToFormattedValue(
            totalSatsAirdropped,
            coingeckoPrices,
        );

        // Add to msg
        msg += `${displayedAirdroppedQtyString} to ${airdropRecipientsMap.size} holders of `;

        if (tokenInfo) {
            // If API call to get tokenInfo was successful to tokenInfo !== false
            const { tokenTicker } = tokenInfo;

            // Link to token id
            msg += `<a href="${
                config.blockExplorer
            }/tx/${tokenId}">${prepareStringForTelegramHTML(tokenTicker)}</a>`;
        } else {
            // Note: tokenInfo is false if the API call to chronik fails
            // Link to token id
            msg += `<a href="${config.blockExplorer}/tx/${tokenId}">${
                tokenId.slice(0, 3) + '...' + tokenId.slice(-3)
            }</a>`;
        }
        // Add Cashtab msg if present
        if (
            stackArray.length > 3 &&
            stackArray[2] === opReturn.knownApps.cashtabMsg.prefix
        ) {
            msg += '|';
            msg += prepareStringForTelegramHTML(
                Buffer.from(stackArray[3], 'hex').toString('utf8'),
            );
        }
        return msg;
    },
    /**
     * Parse the stackArray of a SWaP tx according to spec to generate a useful telegram msg
     * @param {array} stackArray
     * @param {object} tokenInfo token info for the swapped token. optional.
     * @returns {string} msg ready to send through Telegram API
     */
    getSwapTgMsg: function (stackArray, tokenInfo) {
        // Intialize msg
        let msg = '';

        // Generic validation to handle possible txs with SWaP protocol identifier but unexpected stack
        if (stackArray.length < 3) {
            // If stackArray[1] and stackArray[2] do not exist
            return 'Invalid SWaP';
        }

        // SWaP txs are complex. Parse stackArray to build msg.
        // https://github.com/vinarmani/swap-protocol/blob/master/swap-protocol-spec.md

        // First, get swp_msg_class at stackArray[1]
        // 01 - A Signal
        // 02 - A payment
        const swp_msg_class = stackArray[1];

        // Second , get swp_msg_type at stackArray[2]
        // 01 - SLP Atomic Swap
        // 02 - Multi-Party Escrow
        // 03 - Threshold Crowdfunding
        const swp_msg_type = stackArray[2];

        // Build msg by class and type

        if (swp_msg_class === '01') {
            msg += 'Signal';
            msg += '|';
            switch (swp_msg_type) {
                case '01': {
                    msg += 'SLP Atomic Swap';
                    msg += '|';
                    /*
                    <token_id_bytes> <BUY_or_SELL_ascii> <rate_in_sats_int> 
                    <proof_of_reserve_int> <exact_utxo_vout_hash_bytes> <exact_utxo_index_int> 
                    <minimum_sats_to_exchange_int>

                    Note that <rate_in_sats_int> is in hex value in the spec example,
                    but some examples on chain appear to encode this value in ascii
                    */

                    if (tokenInfo) {
                        const { tokenTicker } = tokenInfo;

                        // Link to token id
                        msg += `<a href="${config.blockExplorer}/tx/${
                            stackArray[3]
                        }">${prepareStringForTelegramHTML(tokenTicker)}</a>`;
                        msg += '|';
                    } else {
                        // Note: tokenInfo is false if the API call to chronik fails
                        // Also false if tokenId is invalid for some reason
                        // Link to token id if valid
                        if (
                            stackArray.length >= 3 &&
                            stackArray[3].length === 64
                        ) {
                            msg += `<a href="${config.blockExplorer}/tx/${stackArray[3]}">Unknown Token</a>`;
                            msg += '|';
                        } else {
                            msg += 'Invalid tokenId|';
                        }
                    }

                    // buy or sell?
                    msg += Buffer.from(stackArray[4], 'hex').toString('ascii');

                    // Add price info if present
                    // price in XEC, must convert <rate_in_sats_int> from sats to XEC
                    if (stackArray.length >= 6) {
                        // In the wild, have seen some SWaP txs use ASCII for encoding rate_in_sats_int
                        // Make a determination. Spec does not indicate either way, though spec
                        // example does use hex.
                        // If stackArray[5] is more than 4 characters long, assume ascii encoding
                        let rate_in_sats_int;
                        if (stackArray[5].length > 4) {
                            rate_in_sats_int = parseInt(
                                Buffer.from(stackArray[5], 'hex').toString(
                                    'ascii',
                                ),
                            );
                        } else {
                            rate_in_sats_int = parseInt(stackArray[5], 16);
                        }

                        msg += ` for ${(
                            parseInt(rate_in_sats_int) / 100
                        ).toLocaleString('en-US', {
                            maximumFractionDigits: 2,
                        })} XEC`;
                    }

                    // Display minimum_sats_to_exchange_int
                    // Note: sometimes a SWaP tx will not have this info
                    if (stackArray.length >= 10) {
                        // In the wild, have seen some SWaP txs use ASCII for encoding minimum_sats_to_exchange_int
                        // Make a determination. Spec does not indicate either way, though spec
                        // example does use hex.
                        // If stackArray[9] is more than 4 characters long, assume ascii encoding
                        let minimum_sats_to_exchange_int;
                        if (stackArray[9].length > 4) {
                            minimum_sats_to_exchange_int = Buffer.from(
                                stackArray[9],
                                'hex',
                            ).toString('ascii');
                        } else {
                            minimum_sats_to_exchange_int = parseInt(
                                stackArray[9],
                                16,
                            );
                        }
                        msg += '|';
                        msg += `Min trade: ${(
                            parseInt(minimum_sats_to_exchange_int) / 100
                        ).toLocaleString('en-US', {
                            maximumFractionDigits: 2,
                        })} XEC`;
                    }
                    break;
                }
                case '02': {
                    msg += 'Multi-Party Escrow';
                    // TODO additional parsing
                    break;
                }
                case '03': {
                    msg += 'Threshold Crowdfunding';
                    // TODO additional parsing
                    break;
                }
                default: {
                    // Malformed SWaP tx
                    msg += 'Invalid SWaP';
                    break;
                }
            }
        } else if (swp_msg_class === '02') {
            msg += 'Payment';
            msg += '|';
            switch (swp_msg_type) {
                case '01': {
                    msg += 'SLP Atomic Swap';
                    // TODO additional parsing
                    break;
                }
                case '02': {
                    msg += 'Multi-Party Escrow';
                    // TODO additional parsing
                    break;
                }
                case '03': {
                    msg += 'Threshold Crowdfunding';
                    // TODO additional parsing
                    break;
                }
                default: {
                    // Malformed SWaP tx
                    msg += 'Invalid SWaP';
                    break;
                }
            }
        } else {
            // Malformed SWaP tx
            msg += 'Invalid SWaP';
        }
        return msg;
    },
    /**
     * Build a string formatted for Telegram's API using HTML encoding
     * @param {object} parsedBlock
     * @param {array or false} coingeckoPrices if no coingecko API error
     * @param {Map or false} tokenInfoMap if no chronik API error
     * @param {Map or false} addressInfoMap if no chronik API error
     * @returns {function} splitOverflowTgMsg(tgMsg)
     */
    getBlockTgMessage: function (
        parsedBlock,
        coingeckoPrices,
        tokenInfoMap,
        outputScriptInfoMap,
    ) {
        const { hash, height, miner, staker, numTxs, parsedTxs } = parsedBlock;
        const { emojis } = config;

        // Define newsworthy types of txs in parsedTxs
        // These arrays will be used to present txs in batches by type
        const genesisTxTgMsgLines = [];
        let cashtabTokenRewards = 0;
        let cashtabXecRewardTxs = 0;
        let cashtabXecRewardsTotalXec = 0;
        const tokenSendTxTgMsgLines = [];
        const tokenBurnTxTgMsgLines = [];
        const opReturnTxTgMsgLines = [];
        let xecSendTxTgMsgLines = [];

        // We do not get that much newsworthy value from a long list of individual token send txs
        // So, we organize token send txs by tokenId
        const tokenSendTxMap = new Map();

        // Iterate over parsedTxs to find anything newsworthy
        for (let i = 0; i < parsedTxs.length; i += 1) {
            const thisParsedTx = parsedTxs[i];
            const {
                txid,
                genesisInfo,
                opReturnInfo,
                txFee,
                xecSendingOutputScripts,
                xecReceivingOutputs,
                tokenSendInfo,
                tokenBurnInfo,
                totalSatsSent,
            } = thisParsedTx;

            if (genesisInfo && tokenInfoMap) {
                // The txid of a genesis tx is the tokenId
                const tokenId = txid;
                const genesisInfoForThisToken = tokenInfoMap.get(tokenId);
                let { tokenTicker, tokenName, tokenDocumentUrl } =
                    genesisInfoForThisToken;
                // Make sure tokenName does not contain telegram html escape characters
                tokenName = prepareStringForTelegramHTML(tokenName);
                // Make sure tokenName does not contain telegram html escape characters
                tokenTicker = prepareStringForTelegramHTML(tokenTicker);
                // Do not apply this parsing to tokenDocumentUrl, as this could change the URL
                // If this breaks the msg, so be it
                // Would only happen for bad URLs
                genesisTxTgMsgLines.push(
                    `${emojis.tokenGenesis}<a href="${config.blockExplorer}/tx/${tokenId}">${tokenName}</a> (${tokenTicker}) <a href="${tokenDocumentUrl}">[doc]</a>`,
                );
                // This parsed tx has a tg msg line. Move on to the next one.
                continue;
            }
            if (opReturnInfo) {
                let { app, msg, stackArray, tokenId } = opReturnInfo;
                let appEmoji = '';

                switch (app) {
                    case opReturn.memo.app: {
                        appEmoji = emojis.memo;
                        break;
                    }
                    case opReturn.knownApps.alias.app: {
                        appEmoji = emojis.alias;
                        break;
                    }
                    case opReturn.knownApps.payButton.app: {
                        appEmoji = emojis.payButton;
                        break;
                    }
                    case opReturn.knownApps.paywall.app: {
                        appEmoji = emojis.paywall;
                        break;
                    }
                    case opReturn.knownApps.authentication.app: {
                        appEmoji = emojis.authentication;
                        break;
                    }
                    case opReturn.knownApps.cashtabMsg.app: {
                        appEmoji = emojis.cashtabMsg;

                        const displayedSentAmount = satsToFormattedValue(
                            totalSatsSent,
                            coingeckoPrices,
                        );

                        const displayedTxFee = satsToFormattedValue(
                            txFee,
                            coingeckoPrices,
                        );

                        app += `, ${displayedSentAmount} for ${displayedTxFee}`;
                        break;
                    }
                    case opReturn.knownApps.cashtabMsgEncrypted.app: {
                        msg = module.exports.getEncryptedCashtabMsg(
                            cashaddr.encodeOutputScript(
                                xecSendingOutputScripts.values().next().value,
                            ), // Assume first input is sender
                            xecReceivingOutputs,
                            totalSatsSent,
                            coingeckoPrices,
                        );
                        appEmoji = emojis.cashtabEncrypted;
                        break;
                    }
                    case opReturn.knownApps.airdrop.app: {
                        msg = module.exports.getAirdropTgMsg(
                            stackArray,
                            cashaddr.encodeOutputScript(
                                xecSendingOutputScripts.values().next().value,
                            ), // Assume first input is sender
                            xecReceivingOutputs,
                            totalSatsSent,
                            tokenId && tokenInfoMap
                                ? tokenInfoMap.get(tokenId)
                                : false,
                            coingeckoPrices,
                        );
                        appEmoji = emojis.airdrop;
                        break;
                    }
                    case opReturn.knownApps.swap.app: {
                        msg = module.exports.getSwapTgMsg(
                            stackArray,
                            tokenId && tokenInfoMap
                                ? tokenInfoMap.get(tokenId)
                                : false,
                        );
                        appEmoji = emojis.swap;
                        break;
                    }
                    case opReturn.knownApps.fusion.app: {
                        // totalSatsSent is total amount fused
                        let displayedFusedQtyString = satsToFormattedValue(
                            totalSatsSent,
                            coingeckoPrices,
                        );

                        msg += `Fused ${displayedFusedQtyString} from ${xecSendingOutputScripts.size} inputs into ${xecReceivingOutputs.size} outputs`;
                        appEmoji = emojis.fusion;
                        break;
                    }
                    default: {
                        appEmoji = emojis.unknown;
                        break;
                    }
                }

                opReturnTxTgMsgLines.push(
                    `${appEmoji}<a href="${config.blockExplorer}/tx/${txid}">${app}:</a> ${msg}`,
                );
                // This parsed tx has a tg msg line. Move on to the next one.
                continue;
            }

            if (tokenSendInfo && tokenInfoMap && !tokenBurnInfo) {
                // If this is a token send tx that does not burn any tokens and you have tokenInfoMap
                let { tokenId, tokenChangeOutputs, tokenReceivingOutputs } =
                    tokenSendInfo;

                // Special handling for Cashtab rewards
                if (
                    // CACHET token id
                    tokenId ===
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1' &&
                    // outputScript of token-server
                    xecSendingOutputScripts.values().next().value ===
                        TOKEN_SERVER_OUTPUTSCRIPT
                ) {
                    cashtabTokenRewards += 1;
                    // No further parsing for this tx
                    continue;
                }

                // See if you already have info for txs from this token
                const tokenSendTxInfo = tokenSendTxMap.get(tokenId);
                if (typeof tokenSendTxInfo === 'undefined') {
                    // We don't have any other txs for this token, initialize an info object
                    // Get token info from tokenInfoMap
                    const thisTokenInfo = tokenInfoMap.get(tokenId);

                    let { tokenTicker, tokenName, decimals } = thisTokenInfo;
                    // Note: tokenDocumentUrl and tokenDocumentHash are also available from thisTokenInfo

                    // Make sure tokenName does not contain telegram html escape characters
                    tokenName = prepareStringForTelegramHTML(tokenName);
                    // Make sure tokenName does not contain telegram html escape characters
                    tokenTicker = prepareStringForTelegramHTML(tokenTicker);

                    // Initialize token outputs (could be receiving or change depending on tx type)
                    let tokenOutputs =
                        tokenReceivingOutputs.size === 0
                            ? tokenChangeOutputs
                            : tokenReceivingOutputs;

                    let undecimalizedTokenReceivedAmount = new BigNumber(0);
                    for (const tokenReceivedAmount of tokenOutputs.values()) {
                        undecimalizedTokenReceivedAmount =
                            undecimalizedTokenReceivedAmount.plus(
                                tokenReceivedAmount,
                            );
                    }

                    tokenSendTxMap.set(tokenId, {
                        sendTxs: 1,
                        tokenName,
                        tokenTicker,
                        decimals,
                        undecimalizedTokenReceivedAmount,
                    });
                } else {
                    // We do have other txs for this token, increment the tx count and amount sent
                    // Initialize token outputs (could be receiving or change depending on tx type)
                    let tokenOutputs =
                        tokenReceivingOutputs.size === 0
                            ? tokenChangeOutputs
                            : tokenReceivingOutputs;

                    let undecimalizedTokenReceivedAmount = new BigNumber(0);
                    for (const tokenReceivedAmount of tokenOutputs.values()) {
                        undecimalizedTokenReceivedAmount =
                            undecimalizedTokenReceivedAmount.plus(
                                tokenReceivedAmount,
                            );
                    }

                    tokenSendTxMap.set(tokenId, {
                        ...tokenSendTxInfo,
                        sendTxs: tokenSendTxInfo.sendTxs + 1,
                        undecimalizedTokenReceivedAmount:
                            tokenSendTxInfo.undecimalizedTokenReceivedAmount.plus(
                                undecimalizedTokenReceivedAmount,
                            ),
                    });
                }

                // This parsed tx has info needed to build a tg msg line. Move on to the next one.
                continue;
            }

            if (tokenBurnInfo && tokenInfoMap) {
                // If this is a token burn tx and you have tokenInfoMap
                const { tokenId, undecimalizedTokenBurnAmount } = tokenBurnInfo;

                if (
                    typeof tokenId !== 'undefined' &&
                    tokenInfoMap.has(tokenId)
                ) {
                    // Some txs may have tokenBurnInfo, but did not get tokenSendInfo
                    // e.g. 0bb7e38d7f3968d3c91bba2d7b32273f203bc8b1b486633485f76dc7416a3eca
                    // This is a token burn tx but it is not indexed as such and requires more sophisticated burn parsing
                    // So, for now, just parse txs like this as XEC sends

                    // Get token info from tokenInfoMap
                    const thisTokenInfo = tokenInfoMap.get(tokenId);
                    let { tokenTicker, decimals } = thisTokenInfo;

                    // Make sure tokenName does not contain telegram html escape characters
                    tokenTicker = prepareStringForTelegramHTML(tokenTicker);

                    // Calculate true tokenReceivedAmount using decimals
                    // Use decimals to calculate the burned amount as string
                    const decimalizedTokenBurnAmount =
                        bigNumberAmountToLocaleString(
                            undecimalizedTokenBurnAmount,
                            decimals,
                        );

                    const tokenBurningAddressStr = returnAddressPreview(
                        cashaddr.encodeOutputScript(
                            xecSendingOutputScripts.values().next().value,
                        ),
                    );

                    tokenBurnTxTgMsgLines.push(
                        `${emojis.tokenBurn}${tokenBurningAddressStr} <a href="${config.blockExplorer}/tx/${txid}">burned</a> ${decimalizedTokenBurnAmount} <a href="${config.blockExplorer}/tx/${tokenId}">${tokenTicker}</a> `,
                    );

                    // This parsed tx has a tg msg line. Move on to the next one.
                    continue;
                }
            }

            // Txs not parsed above are parsed as xec send txs

            const displayedSentAmount = satsToFormattedValue(
                totalSatsSent,
                coingeckoPrices,
            );

            const displayedTxFee = satsToFormattedValue(txFee, coingeckoPrices);

            // Clone xecReceivingOutputs so that you don't modify unit test mocks
            let xecReceivingAddressOutputs = new Map(xecReceivingOutputs);

            // Throw out OP_RETURN outputs for txs parsed as XEC send txs
            xecReceivingAddressOutputs.forEach((value, key, map) => {
                if (key.startsWith(opReturn.opReturnPrefix)) {
                    map.delete(key);
                }
            });

            // Get address balance emojis for rendered addresses
            // NB you are using xecReceivingAddressOutputs to avoid OP_RETURN outputScripts
            let xecSenderEmoji = '';
            let xecReceiverEmoji = '';

            if (outputScriptInfoMap) {
                // If you have information about address balances, get balance emojis
                const firstXecSendingOutputScript = xecSendingOutputScripts
                    .values()
                    .next().value;

                if (firstXecSendingOutputScript === TOKEN_SERVER_OUTPUTSCRIPT) {
                    cashtabXecRewardTxs += 1;
                    cashtabXecRewardsTotalXec += totalSatsSent;
                    continue;
                }

                const firstXecReceivingOutputScript = xecReceivingAddressOutputs
                    .keys()
                    .next().value;
                xecSenderEmoji = outputScriptInfoMap.has(
                    firstXecSendingOutputScript,
                )
                    ? outputScriptInfoMap.get(firstXecSendingOutputScript).emoji
                    : '';
                xecReceiverEmoji = outputScriptInfoMap.has(
                    firstXecReceivingOutputScript,
                )
                    ? outputScriptInfoMap.get(firstXecReceivingOutputScript)
                          .emoji
                    : '';
            }

            let xecSendMsg;
            if (xecReceivingAddressOutputs.size === 0) {
                // self send tx
                // In this case, totalSatsSent has already been assigned to changeAmountSats

                xecSendMsg = `${emojis.xecSend}<a href="${
                    config.blockExplorer
                }/tx/${txid}">${displayedSentAmount} for ${displayedTxFee}</a>${
                    xecSenderEmoji !== ''
                        ? ` ${xecSenderEmoji} ${
                              xecSendingOutputScripts.size > 1
                                  ? `${xecSendingOutputScripts.size} addresses`
                                  : returnAddressPreview(
                                        cashaddr.encodeOutputScript(
                                            xecSendingOutputScripts
                                                .values()
                                                .next().value,
                                        ),
                                    )
                          } ${config.emojis.arrowRight} ${
                              xecSendingOutputScripts.size > 1
                                  ? 'themselves'
                                  : 'itself'
                          }`
                        : ''
                }`;
            } else {
                xecSendMsg = `${emojis.xecSend}<a href="${
                    config.blockExplorer
                }/tx/${txid}">${displayedSentAmount} for ${displayedTxFee}</a>${
                    xecSenderEmoji !== '' || xecReceiverEmoji !== ''
                        ? ` ${xecSenderEmoji}${returnAddressPreview(
                              cashaddr.encodeOutputScript(
                                  xecSendingOutputScripts.values().next().value,
                              ),
                          )} ${config.emojis.arrowRight} ${
                              xecReceivingAddressOutputs.keys().next().value ===
                              xecSendingOutputScripts.values().next().value
                                  ? 'itself'
                                  : `${xecReceiverEmoji}${returnAddressPreview(
                                        cashaddr.encodeOutputScript(
                                            xecReceivingAddressOutputs
                                                .keys()
                                                .next().value,
                                        ),
                                    )}`
                          }${
                              xecReceivingAddressOutputs.size > 1
                                  ? ` and ${
                                        xecReceivingAddressOutputs.size - 1
                                    } other${
                                        xecReceivingAddressOutputs.size - 1 > 1
                                            ? 's'
                                            : ''
                                    }`
                                  : ''
                          }`
                        : ''
                }`;
            }

            xecSendTxTgMsgLines.push(xecSendMsg);
        }

        // Build up message as an array, with each line as an entry
        let tgMsg = [];

        // Header
        // <emojis.block><height> | <numTxs> | <miner>
        tgMsg.push(
            `${emojis.block}<a href="${
                config.blockExplorer
            }/block/${hash}">${height}</a> | ${numTxs} tx${
                numTxs > 1 ? `s` : ''
            } | ${miner}`,
        );

        // Halving countdown
        const HALVING_HEIGHT = 840000;
        const blocksLeft = HALVING_HEIGHT - height;
        if (blocksLeft > 0) {
            // countdown
            tgMsg.push(
                `⏰ ${blocksLeft.toLocaleString('en-US')} block${
                    blocksLeft !== 1 ? 's' : ''
                } until eCash halving`,
            );
        }
        if (height === HALVING_HEIGHT) {
            tgMsg.push(`🎉🎉🎉 eCash block reward reduced by 50% 🎉🎉🎉`);
        }

        // Staker
        // Staking rewards to <staker>
        if (staker) {
            // Get fiat amount of staking rwds
            tgMsg.push(
                `${emojis.staker}${satsToFormattedValue(
                    staker.reward,
                    coingeckoPrices,
                )} to <a href="${config.blockExplorer}/address/${
                    staker.staker
                }">${returnAddressPreview(staker.staker)}</a>`,
            );
        }

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
                `<b>${genesisTxTgMsgLines.length} new eToken${
                    genesisTxTgMsgLines.length > 1 ? `s` : ''
                } created</b>`,
            );

            tgMsg = tgMsg.concat(genesisTxTgMsgLines);
        }

        // Cashtab rewards
        if (cashtabTokenRewards > 0 || cashtabXecRewardTxs > 0) {
            tgMsg.push('');
            tgMsg.push(`<a href="https://cashtab.com/">Cashtab</a>`);
            if (cashtabTokenRewards > 0) {
                // 1 CACHET reward:
                // or
                // <n> CACHET rewards:
                tgMsg.push(
                    `<b>${cashtabTokenRewards}</b> <a href="${
                        config.blockExplorer
                    }/tx/aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1">CACHET</a> reward${
                        cashtabTokenRewards > 1 ? `s` : ''
                    }`,
                );
            }

            // Cashtab XEC rewards
            if (cashtabXecRewardTxs > 0) {
                // 1 new user received 42 XEC
                // or
                // <n> new users received <...>
                tgMsg.push(
                    `<b>${cashtabXecRewardTxs}</b> new user${
                        cashtabXecRewardTxs > 1 ? `s` : ''
                    } received <b>${satsToFormattedValue(
                        cashtabXecRewardsTotalXec,
                    )}</b>`,
                );
            }
        }
        if (tokenSendTxMap.size > 0) {
            // eToken Send txs
            // Line break for new section
            tgMsg.push('');

            // We include a 1-line summary for token send txs for each token ID
            tokenSendTxMap.forEach((tokenSendInfo, tokenId) => {
                const {
                    sendTxs,
                    tokenName,
                    tokenTicker,
                    decimals,
                    undecimalizedTokenReceivedAmount,
                } = tokenSendInfo;

                // Get decimalized receive amount
                const decimalizedTokenReceivedAmount =
                    bigNumberAmountToLocaleString(
                        undecimalizedTokenReceivedAmount.toString(),
                        decimals,
                    );

                tgMsg.push(
                    `${sendTxs} tx${
                        sendTxs > 1 ? `s` : ''
                    } sent ${decimalizedTokenReceivedAmount} <a href="${
                        config.blockExplorer
                    }/tx/${tokenId}">${tokenName} (${tokenTicker})</a>`,
                );
            });

            tgMsg = tgMsg.concat(tokenSendTxTgMsgLines);
        }

        // eToken burn txs
        if (tokenBurnTxTgMsgLines.length > 0) {
            // Line break for new section
            tgMsg.push('');

            // 1 eToken burn tx:
            // or
            // <n> eToken burn txs:
            tgMsg.push(
                `<b>${tokenBurnTxTgMsgLines.length} eToken burn tx${
                    tokenBurnTxTgMsgLines.length > 1 ? `s` : ''
                }</b>`,
            );

            tgMsg = tgMsg.concat(tokenBurnTxTgMsgLines);
        }

        // OP_RETURN txs
        if (opReturnTxTgMsgLines.length > 0) {
            // Line break for new section
            tgMsg.push('');

            // App txs
            // or
            // App tx
            tgMsg.push(
                `<b>${opReturnTxTgMsgLines.length} app tx${
                    opReturnTxTgMsgLines.length > 1 ? `s` : ''
                }</b>`,
            );

            // <appName> : <parsedAppData>
            // alias: newlyregisteredalias
            // Cashtab Msg: This is a Cashtab Msg
            tgMsg = tgMsg.concat(opReturnTxTgMsgLines);
        }

        // XEC txs
        const totalXecSendCount = xecSendTxTgMsgLines.length;
        if (totalXecSendCount > 0) {
            // Line break for new section
            tgMsg.push('');

            // Don't show more than config-adjustable amount of these txs
            if (totalXecSendCount > config.xecSendDisplayCount) {
                xecSendTxTgMsgLines = xecSendTxTgMsgLines.slice(
                    0,
                    config.xecSendDisplayCount,
                );
                xecSendTxTgMsgLines.push(
                    `...and <a href="${config.blockExplorer}/block/${hash}">${
                        totalXecSendCount - config.xecSendDisplayCount
                    } more</a>`,
                );
            }
            // 1 eCash tx
            // or
            // n eCash txs
            tgMsg.push(
                `<b>${totalXecSendCount} eCash tx${
                    totalXecSendCount > 1 ? `s` : ''
                }</b>`,
            );

            tgMsg = tgMsg.concat(xecSendTxTgMsgLines);
        }

        return splitOverflowTgMsg(tgMsg);
    },
    /**
     * Guess the reason why an block was invalidated by avalanche
     * @param {ChronikClient} chronik
     * @param {number} blockHeight
     * @param {object} coinbaseData
     * @param {object} memoryCache
     * @returns {string} reason
     */
    guessRejectReason: async function (
        chronik,
        blockHeight,
        coinbaseData,
        memoryCache,
    ) {
        // Let's guess the reject reason by looking for the common cases in order:
        //  1. Missing the miner fund output
        //  2. Missing the staking reward output
        //  3. Wrong staking reward winner
        //  4. Normal orphan (another block exists at the same height)
        //  5. RTT rejection
        if (typeof coinbaseData === 'undefined') {
            return undefined;
        }

        // 1. Missing the miner fund output
        // This output is a constant so it's easy to look for
        let hasMinerFundOuptut = false;
        for (let i = 0; i < coinbaseData.outputs.length; i += 1) {
            if (
                coinbaseData.outputs[i].outputScript === minerFundOutputScript
            ) {
                hasMinerFundOuptut = true;
                break;
            }
        }
        if (!hasMinerFundOuptut) {
            return 'missing miner fund output';
        }

        // 2. Missing the staking reward output
        // We checked for missing miner fund output already, so if there are
        // fewer than 3 outputs we are sure the staking reward is missing
        if (coinbaseData.outputs.length < 3) {
            return 'missing staking reward output';
        }

        // 3. Wrong staking reward winner
        const expectedWinner = await memoryCache.get(`${blockHeight}`);
        // We might have failed to fetch the expected winner for this block, in
        // which case we can't determine if staking reward is the likely cause.
        if (typeof expectedWinner !== 'undefined') {
            const { address, scriptHex } = expectedWinner;

            let stakingRewardOutputIndex = -1;
            for (let i = 0; i < coinbaseData.outputs.length; i += 1) {
                if (coinbaseData.outputs[i].outputScript === scriptHex) {
                    stakingRewardOutputIndex = i;
                    break;
                }
            }

            // We didn't find the expected staking reward output
            if (stakingRewardOutputIndex < 0) {
                const wrongWinner = module.exports.getStakerFromCoinbaseTx(
                    blockHeight,
                    coinbaseData.outputs,
                );

                if (wrongWinner !== false) {
                    // Try to show the eCash address and fallback to script hex
                    // if it is not possible.
                    if (typeof address !== 'undefined') {
                        try {
                            const wrongWinnerAddress =
                                cashaddr.encodeOutputScript(wrongWinner.staker);
                            return `wrong staking reward payout (${wrongWinnerAddress} instead of ${address})`;
                        } catch (err) {
                            // Fallthrough
                        }
                    }

                    return `wrong staking reward payout (${wrongWinner.staker} instead of ${scriptHex})`;
                }
            }
        }

        // 4. Normal orphan (another block exists at the same height)
        // If chronik returns a block at the same height, assume it orphaned
        // the current invalidated block. It's very possible the block is not
        // finalized yet so we have no better way to check it's actually what
        // happened.
        try {
            const blockAtSameHeight = await chronik.block(blockHeight);
            return `orphaned by block ${blockAtSameHeight.blockInfo.hash}`;
        } catch (err) {
            // Block not found, keep guessing
        }

        // 5. RTT rejection
        // FIXME There is currently no way to determine if the block was
        // rejected due to RTT violation.

        return 'unknown';
    },
    /**
     * Summarize an arbitrary array of chronik txs
     * Different logic vs "per block" herald msgs, as we are looking to
     * get meaningful info from more txs
     * We are interested in what txs were like over a certain time period
     * Not details of a particular block
     *
     * TODO
     * Biggest tx
     * Highest fee
     * Token dex volume
     * Biggest token sales
     * Whale alerts
     *
     * @param {number} now unix timestamp in seconds
     * @param {Tx[]} txs array of CONFIRMED Txs
     * @param {object} priceInfo { usd, usd_market_cap, usd_24h_vol, usd_24h_change }
     * @param {number} blockheight height of the most recently finalized block
     */
    summarizeTxHistory: function (now, txs, priceInfo) {
        const xecPriceUsd =
            typeof priceInfo !== 'undefined' ? priceInfo.usd : undefined;
        // Throw out any unconfirmed txs
        txs.filter(tx => tx.block !== 'undefined');

        // Sort by blockheight
        txs.sort((a, b) => a.block.height - b.block.height);
        const txCount = txs.length;
        // Get covered blocks
        // Note we add 1 as we include the block at index 0
        const blockCount =
            txs[txCount - 1].block.height - txs[0].block.height + 1;

        // Initialize objects useful for summarizing data

        // miner => blocks found
        const minerMap = new Map();

        // miner pools where we can parse individual miners
        let viaBtcBlocks = 0;
        const viabtcMinerMap = new Map();

        // stakerOutputScript => {count, reward}
        const stakerMap = new Map();

        // TODO more info about send txs
        // inputs[0].outputScript => {count, satoshisSent}
        // senderMap

        // lokad name => count
        const appTxMap = new Map();

        let totalStakingRewardSats = 0;
        let cashtabXecRewardCount = 0;
        let cashtabXecRewardSats = 0;
        let cashtabCachetRewardCount = 0;
        let binanceWithdrawalCount = 0;
        let binanceWithdrawalSats = 0;

        let tokenTxs = 0;
        let appTxs = 0;
        let unknownLokadTxs = 0;

        for (const tx of txs) {
            const { inputs, outputs, block, tokenEntries, isCoinbase } = tx;

            if (isCoinbase) {
                // Coinbase tx - get miner and staker info
                const miner = module.exports.getMinerFromCoinbaseTx(
                    tx.inputs[0].inputScript,
                    outputs,
                    miners,
                );
                if (miner.includes('ViaBTC')) {
                    viaBtcBlocks += 1;
                    // ViaBTC pool miner
                    let blocksFoundThisViaMiner = viabtcMinerMap.get(miner);
                    if (typeof blocksFoundThisViaMiner === 'undefined') {
                        viabtcMinerMap.set(miner, 1);
                    } else {
                        viabtcMinerMap.set(miner, blocksFoundThisViaMiner + 1);
                    }
                } else {
                    // Other miner
                    let blocksFoundThisMiner = minerMap.get(miner);
                    if (typeof blocksFoundThisMiner === 'undefined') {
                        minerMap.set(miner, 1);
                    } else {
                        minerMap.set(miner, blocksFoundThisMiner + 1);
                    }
                }

                const stakerInfo = module.exports.getStakerFromCoinbaseTx(
                    block.height,
                    outputs,
                );
                if (stakerInfo) {
                    // The coinbase tx may have no staker
                    // In thise case, we do not have any staking info to update

                    const { staker, reward } = stakerInfo;

                    totalStakingRewardSats += reward;

                    let stakingRewardsThisStaker = stakerMap.get(staker);
                    if (typeof stakingRewardsThisStaker === 'undefined') {
                        stakerMap.set(staker, { count: 1, reward });
                    } else {
                        stakingRewardsThisStaker.reward += reward;
                        stakingRewardsThisStaker.count += 1;
                    }
                }
                // No further analysis for this tx
                continue;
            }
            const senderOutputScript = inputs[0].outputScript;
            if (senderOutputScript === TOKEN_SERVER_OUTPUTSCRIPT) {
                // If this tx was sent by token-server
                if (tokenEntries.length > 0) {
                    // We assume all token txs sent by token-server are CACHET rewards
                    // CACHET reward
                    cashtabCachetRewardCount += 1;
                } else {
                    // XEC rwd
                    cashtabXecRewardCount += 1;
                    for (const output of outputs) {
                        const { value, outputScript } = output;
                        if (outputScript !== TOKEN_SERVER_OUTPUTSCRIPT) {
                            cashtabXecRewardSats += value;
                        }
                    }
                }
                // No further analysis for this tx
                continue;
            }
            if (senderOutputScript === BINANCE_OUTPUTSCRIPT) {
                // Tx sent by Binance
                // Make sure it's not just a utxo consolidation
                for (const output of outputs) {
                    const { value, outputScript } = output;
                    if (outputScript !== BINANCE_OUTPUTSCRIPT) {
                        // If we have an output that is not sending to the binance hot wallet
                        // Increment total value amount withdrawn
                        binanceWithdrawalSats += value;
                        // We also call this a withdrawal
                        // Note that 1 tx from the hot wallet may include more than 1 withdrawal
                        binanceWithdrawalCount += 1;
                    }
                }
            }

            // Other token actions
            if (tokenEntries.length > 0) {
                tokenTxs += 1;
                continue;
                /**
                 * Token tx
                 *
                 * Possibilities
                 *
                 * GENESIS, SEND, MINT, BURN
                 * agora list, agora ad prep, agora buy
                 *
                 * So first, check if it is agora-related or not
                 *
                 * ad prep example
                 * https://explorer.e.cash/tx/e7ca2e9e9c778f130206520eebfa7244c300ca95e90284782ed54a8b376406da
                 *
                 * listing example
                 * https://explorer.e.cash/tx/d142c4d3ee2fc09bca13314f9b5b1476b6bc3806f6db989b003e2d57a96c6cc5
                 */
                // Burn, mint, or genesis
                // send -- if output size is not dust and it's to a p2sh, call it ad prep tx
                // if output size dust and to a p2sh, call it a listing (mb a partial buy?)
            }
            const firstOutputScript = outputs[0].outputScript;
            const LOKAD_OPRETURN_STARTSWITH = '6a04';
            if (firstOutputScript.startsWith(LOKAD_OPRETURN_STARTSWITH)) {
                appTxs += 1;
                // We only parse minimally-pushed lokad ids

                // Get the lokadId (the 4-byte first push)
                const lokadId = firstOutputScript.slice(4, 12);

                // Add to map
                const countThisLokad = appTxMap.get(lokadId);
                appTxMap.set(
                    lokadId,
                    typeof countThisLokad === 'undefined'
                        ? 1
                        : countThisLokad + 1,
                );
            }
        }

        // Add ViaBTC as a single entity to minerMap
        minerMap.set(`ViaBTC`, viaBtcBlocks);
        // Sort miner map by blocks found
        const sortedMinerMap = new Map(
            [...minerMap.entries()].sort(
                (keyValueArrayA, keyValueArrayB) =>
                    keyValueArrayB[1] - keyValueArrayA[1],
            ),
        );
        const sortedStakerMap = new Map(
            [...stakerMap.entries()].sort(
                (keyValueArrayA, keyValueArrayB) =>
                    keyValueArrayB[1].count - keyValueArrayA[1].count,
            ),
        );

        // Build your msg
        const tgMsg = [];

        tgMsg.push(
            `<b>24 hours thru ${new Date(now * 1000).toLocaleTimeString(
                'en-GB',
                {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'UTC',
                },
            )}</b>`,
        );
        tgMsg.push(
            `${config.emojis.block}${blockCount.toLocaleString(
                'en-US',
            )} blocks`,
        );
        tgMsg.push(
            `${config.emojis.arrowRight}${txs.length.toLocaleString(
                'en-US',
            )} txs`,
        );
        tgMsg.push('');

        // Market summary
        if (typeof priceInfo !== 'undefined') {
            const { usd_market_cap, usd_24h_vol, usd_24h_change } = priceInfo;
            tgMsg.push(
                `${
                    usd_24h_change > 0
                        ? config.emojis.priceUp
                        : config.emojis.priceDown
                }<b>1 XEC = ${formatPrice(
                    xecPriceUsd,
                    'usd',
                )}</b> <i>(${usd_24h_change.toFixed(2)}%)</i>`,
            );
            tgMsg.push(
                `Trading volume: $${usd_24h_vol.toLocaleString('en-US', {
                    maximumFractionDigits: 0,
                })}`,
            );
            tgMsg.push(
                `Market cap: $${usd_market_cap.toLocaleString('en-US', {
                    maximumFractionDigits: 0,
                })}`,
            );
            tgMsg.push('');
        }

        // Top miners
        const MINERS_TO_SHOW = 3;
        tgMsg.push(
            `<b><i>${config.emojis.miner}${sortedMinerMap.size} miners found blocks</i></b>`,
        );
        tgMsg.push(`<u>Top ${MINERS_TO_SHOW}</u>`);

        const topMiners = [...sortedMinerMap.entries()].slice(
            0,
            MINERS_TO_SHOW,
        );
        for (let i = 0; i < topMiners.length; i += 1) {
            const count = topMiners[i][1];
            const pct = (100 * (count / blockCount)).toFixed(0);
            tgMsg.push(
                `${i + 1}. ${topMiners[i][0]}, ${count} <i>(${pct}%)</i>`,
            );
        }
        tgMsg.push('');

        const SATOSHIS_PER_XEC = 100;
        const totalStakingRewardsXec =
            totalStakingRewardSats / SATOSHIS_PER_XEC;
        const renderedTotalStakingRewards =
            typeof xecPriceUsd !== 'undefined'
                ? `$${(totalStakingRewardsXec * xecPriceUsd).toLocaleString(
                      'en-US',
                      {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                      },
                  )}`
                : `${totalStakingRewardsXec.toLocaleString('en-US', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                  })} XEC`;

        // Top stakers
        const STAKERS_TO_SHOW = 3;
        tgMsg.push(
            `<b><i>${config.emojis.staker}${sortedStakerMap.size} stakers earned ${renderedTotalStakingRewards}</i></b>`,
        );
        tgMsg.push(`<u>Top ${STAKERS_TO_SHOW}</u>`);
        const topStakers = [...sortedStakerMap.entries()].slice(
            0,
            STAKERS_TO_SHOW,
        );
        for (let i = 0; i < topStakers.length; i += 1) {
            const staker = topStakers[i];
            const count = staker[1].count;
            const pct = (100 * (count / blockCount)).toFixed(0);
            const addr = cashaddr.encodeOutputScript(staker[0]);
            tgMsg.push(
                `${i + 1}. ${`<a href="${
                    config.blockExplorer
                }/address/${addr}">${returnAddressPreview(addr)}</a>`}, ${
                    staker[1].count
                } <i>(${pct}%)</i>`,
            );
        }

        // Tx breakdown

        // Cashtab rewards
        if (cashtabXecRewardCount > 0 || cashtabCachetRewardCount > 0) {
            tgMsg.push('');
            tgMsg.push(`<a href="https://cashtab.com/">Cashtab</a>`);
            // Cashtab XEC rewards
            if (cashtabXecRewardCount > 0) {
                // 1 new user received 42 XEC
                // or
                // <n> new users received <...>
                tgMsg.push(
                    `${
                        config.emojis.gift
                    } <b>${cashtabXecRewardCount}</b> new user${
                        cashtabXecRewardCount > 1 ? `s` : ''
                    } received <b>${satsToFormattedValue(
                        cashtabXecRewardSats,
                    )}</b>`,
                );
            }
            if (cashtabCachetRewardCount > 0) {
                // 1 CACHET reward:
                // or
                // <n> CACHET rewards:
                tgMsg.push(
                    `${
                        config.emojis.tokenSend
                    } <b>${cashtabCachetRewardCount}</b> <a href="${
                        config.blockExplorer
                    }/tx/aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1">CACHET</a> reward${
                        cashtabCachetRewardCount > 1 ? `s` : ''
                    }`,
                );
            }
            tgMsg.push('');
        }

        if (tokenTxs > 0) {
            tgMsg.push(
                `${config.emojis.token} <b>${tokenTxs.toLocaleString(
                    'en-US',
                )}</b> token tx${tokenTxs > 1 ? 's' : ''}`,
            );
            tgMsg.push('');
        }

        if (appTxs > 0) {
            // Sort appTxMap by most common app txs
            const sortedAppTxMap = new Map(
                [...appTxMap.entries()].sort(
                    (keyValueArrayA, keyValueArrayB) =>
                        keyValueArrayB[1] - keyValueArrayA[1],
                ),
            );
            tgMsg.push(
                `${config.emojis.app} <b><i>${appTxs.toLocaleString(
                    'en-US',
                )} app tx${appTxs > 1 ? 's' : ''}</i></b>`,
            );
            sortedAppTxMap.forEach((count, lokadId) => {
                // Do we recognize this app?
                const supportedLokadApp = lokadMap.get(lokadId);
                if (typeof supportedLokadApp === 'undefined') {
                    unknownLokadTxs += count;
                    // Go to the next lokadId
                    return;
                }
                const { name, emoji, url } = supportedLokadApp;
                if (typeof url === 'undefined') {
                    tgMsg.push(
                        `${emoji} <b>${count.toLocaleString(
                            'en-US',
                        )}</b> ${name}${count > 1 ? 's' : ''}`,
                    );
                } else {
                    tgMsg.push(
                        `${emoji} <b>${count.toLocaleString(
                            'en-US',
                        )}</b> <a href="${url}">${name}${
                            count > 1 ? 's' : ''
                        }</a>`,
                    );
                }
            });
            // Add line for unknown txs
            if (unknownLokadTxs > 0) {
                tgMsg.push(
                    `${
                        config.emojis.unknown
                    } <b>${unknownLokadTxs.toLocaleString(
                        'en-US',
                    )}</b> Unknown app tx${unknownLokadTxs > 1 ? 's' : ''}`,
                );
            }
            tgMsg.push('');
        }

        if (binanceWithdrawalCount > 0) {
            // Binance hot wallet
            const binanceWithdrawalXec =
                binanceWithdrawalSats / SATOSHIS_PER_XEC;
            const renderedBinanceWithdrawalSats =
                typeof xecPriceUsd !== 'undefined'
                    ? `$${(binanceWithdrawalXec * xecPriceUsd).toLocaleString(
                          'en-US',
                          {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                          },
                      )}`
                    : `${binanceWithdrawalXec.toLocaleString('en-US', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                      })} XEC`;
            tgMsg.push(`${config.emojis.bank} <b><i>Binance</i></b>`);
            tgMsg.push(
                `<b>${binanceWithdrawalCount}</b> withdrawal${
                    binanceWithdrawalCount > 1 ? 's' : ''
                }, ${renderedBinanceWithdrawalSats}`,
            );
        }

        return splitOverflowTgMsg(tgMsg);
    },
};

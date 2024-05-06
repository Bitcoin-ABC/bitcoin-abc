// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const opReturn = require('../constants/op_return');
const unrevivedBlock = require('./mocks/block');
const minersJson = require('../constants/miners');
const minerTestFixtures = require('./fixtures/miners');
const stakerTestFixtures = require('./fixtures/stakers');
const { jsonReviver } = require('../src/utils');
const block = JSON.parse(JSON.stringify(unrevivedBlock), jsonReviver);
const miners = JSON.parse(JSON.stringify(minersJson), jsonReviver);
const memoOutputScripts = require('./mocks/memo');
const { consumeNextPush } = require('ecash-script');

const {
    parseBlock,
    getStakerFromCoinbaseTx,
    getMinerFromCoinbaseTx,
    parseMemoOutputScript,
    getBlockTgMessage,
    parseOpReturn,
    getSwapTgMsg,
    getAirdropTgMsg,
    getEncryptedCashtabMsg,
    parseMultipushStack,
    parseSlpTwo,
} = require('../src/parse');
const {
    swaps,
    airdrops,
    encryptedCashtabMsgs,
    slp2PushVectors,
    slp2TxVectors,
    aliasRegistrations,
    cashtabMsgs,
    payButtonTxs,
} = require('./mocks/appTxSamples');

describe('parse.js functions', function () {
    it('Parses the master test block', function () {
        const thisBlock = block;
        const {
            blockDetails,
            parsedBlock,
            coingeckoPrices,
            tokenInfoMap,
            outputScriptInfoMap,
            blockSummaryTgMsgs,
        } = thisBlock;
        assert.deepEqual(parseBlock(blockDetails), parsedBlock);
        assert.deepEqual(
            getBlockTgMessage(
                parsedBlock,
                coingeckoPrices,
                tokenInfoMap,
                outputScriptInfoMap,
            ),
            blockSummaryTgMsgs,
        );
    });
    it('parseOpReturn handles all types of SWaP txs', function () {
        for (let i = 0; i < swaps.length; i += 1) {
            const { hex, stackArray, tokenId } = swaps[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: opReturn.knownApps.swap.app,
                msg: '',
                stackArray,
                tokenId,
            });
        }
    });
    it('getSwapTgMsg handles all types of SWaP txs', function () {
        for (let i = 0; i < swaps.length; i += 1) {
            const { stackArray, msg, tokenInfo } = swaps[i];
            const result = getSwapTgMsg(stackArray, tokenInfo);
            assert.strictEqual(result, msg);
        }
    });
    it('parseOpReturn handles alias registration txs', function () {
        for (let i = 0; i < aliasRegistrations.length; i += 1) {
            const { hex, stackArray, msg } = aliasRegistrations[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: opReturn.knownApps.alias.app,
                msg,
                stackArray,
                tokenId: false,
            });
        }
    });
    it('parseOpReturn handles Cashtab Msgs', function () {
        for (let i = 0; i < cashtabMsgs.length; i += 1) {
            const { hex, stackArray, msg } = cashtabMsgs[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: opReturn.knownApps.cashtabMsg.app,
                msg,
                stackArray,
                tokenId: false,
            });
        }
    });
    it('parseOpReturn handles PayButton txs', function () {
        for (let i = 0; i < payButtonTxs.length; i += 1) {
            const { hex, stackArray, msg } = payButtonTxs[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: opReturn.knownApps.payButton.app,
                msg,
                stackArray,
                tokenId: false,
            });
        }
    });
    it('parseOpReturn handles airdrop txs with and without a cashtab msg', function () {
        for (let i = 0; i < airdrops.length; i += 1) {
            const { hex, stackArray, tokenId } = airdrops[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: opReturn.knownApps.airdrop.app,
                msg: '',
                stackArray,
                tokenId,
            });
        }
    });
    it('getAirdropMsg handles airdrop txs with and without a cashtab msg', function () {
        for (let i = 0; i < airdrops.length; i += 1) {
            const {
                stackArray,
                airdropSendingAddress,
                airdropRecipientsKeyValueArray,
                msg,
                msgApiFailure,
                tokenInfo,
                coingeckoPrices,
            } = airdrops[i];
            const xecReceivingOutputs = new Map(airdropRecipientsKeyValueArray);
            let totalSatsSent = 0;
            for (const satoshis of xecReceivingOutputs.values()) {
                totalSatsSent += satoshis;
            }
            const result = getAirdropTgMsg(
                stackArray,
                airdropSendingAddress,
                xecReceivingOutputs,
                totalSatsSent,
                tokenInfo,
                coingeckoPrices,
            );
            const resultApiFailure = getAirdropTgMsg(
                stackArray,
                airdropSendingAddress,
                xecReceivingOutputs,
                totalSatsSent,
                false,
                false,
            );
            assert.strictEqual(result, msg);
            assert.strictEqual(resultApiFailure, msgApiFailure);
        }
    });
    it('parseOpReturn handles encrypted cashtab msg txs', function () {
        for (let i = 0; i < encryptedCashtabMsgs.length; i += 1) {
            const { hex, stackArray } = encryptedCashtabMsgs[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: opReturn.knownApps.cashtabMsgEncrypted.app,
                msg: '',
                stackArray,
                tokenId: false,
            });
        }
    });
    it('getEncryptedCashtabMsg handles encrypted cashtab msg txs with and without price info', function () {
        for (let i = 0; i < encryptedCashtabMsgs.length; i += 1) {
            const {
                sendingAddress,
                xecReceivingOutputsKeyValueArray,
                msg,
                msgApiFailure,
                coingeckoPrices,
            } = encryptedCashtabMsgs[i];

            const xecReceivingOutputs = new Map(
                xecReceivingOutputsKeyValueArray,
            );
            let totalSatsSent = 0;
            for (const satoshis of xecReceivingOutputs.values()) {
                totalSatsSent += satoshis;
            }
            const result = getEncryptedCashtabMsg(
                sendingAddress,
                xecReceivingOutputs,
                totalSatsSent,
                coingeckoPrices,
            );
            const resultApiFailure = getEncryptedCashtabMsg(
                sendingAddress,
                xecReceivingOutputs,
                totalSatsSent,
                false,
            );
            assert.strictEqual(result, msg);
            assert.strictEqual(resultApiFailure, msgApiFailure);
        }
    });
    it('parseOpReturn handles slp2 txs', function () {
        for (let i = 0; i < slp2TxVectors.length; i += 1) {
            const { hex, msg } = slp2TxVectors[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: 'EMPP',
                msg,
            });
        }
    });
    it('parseMultipushStack handles a range of observed slp2 empp pushes', function () {
        for (let i = 0; i < slp2TxVectors.length; i += 1) {
            const { emppStackArray, msg } = slp2TxVectors[i];
            assert.deepEqual(parseMultipushStack(emppStackArray), {
                app: 'EMPP',
                msg,
            });
        }
    });
    it('parseSlpTwo handles a range of observed slp2 empp pushes', function () {
        for (let i = 0; i < slp2PushVectors.length; i += 1) {
            const { push, msg } = slp2PushVectors[i];

            assert.strictEqual(parseSlpTwo(push.slice(8)), msg);
        }
    });
    it('parseOpReturn recognizes legacy Cash Fusion prefix', function () {
        assert.deepEqual(
            parseOpReturn(
                '0446555a0020771c2fa0d402fe15ba0aa2e98660facf4a8ab6801b5baf3c0b08ced685dd85ed',
            ),
            {
                app: opReturn.knownApps.fusionLegacy.app,
                msg: '',
                tokenId: false,
                stackArray: [
                    '46555a00',
                    '771c2fa0d402fe15ba0aa2e98660facf4a8ab6801b5baf3c0b08ced685dd85ed',
                ],
            },
        );
    });
    it(`parseMemoOutputScript correctly parses all tested memo actions in memo.js`, function () {
        memoOutputScripts.map(memoTestObj => {
            const { outputScript, msg } = memoTestObj;
            // Get array of pushes
            let stack = { remainingHex: outputScript.slice(2) };
            let stackArray = [];
            while (stack.remainingHex.length > 0) {
                stackArray.push(consumeNextPush(stack).data);
            }
            assert.deepEqual(parseMemoOutputScript(stackArray), {
                app: opReturn.memo.app,
                msg,
            });
        });
    });
    it('getStakerFromCoinbaseTx parses miner for all test vectors', function () {
        for (let i = 0; i < stakerTestFixtures.length; i += 1) {
            const { coinbaseTx, staker } = stakerTestFixtures[i];

            assert.deepEqual(getStakerFromCoinbaseTx(coinbaseTx), staker);
        }
    });
    it('getMinerFromCoinbaseTx parses miner for all test vectors', function () {
        for (let i = 0; i < minerTestFixtures.length; i += 1) {
            const { parsed, coinbaseHex, payoutOutputScript } =
                minerTestFixtures[i];
            // Minimally mock the coinbase tx
            const thisCoinbaseTx = {
                inputs: [{ inputScript: coinbaseHex }],
                outputs: [{ outputScript: payoutOutputScript }],
            };

            assert.strictEqual(
                getMinerFromCoinbaseTx(thisCoinbaseTx, miners),
                parsed,
            );
        }
    });
});

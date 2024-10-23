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
const invalidatedBlocksTestFixtures = require('./fixtures/invalidatedBlocks');
const { jsonReviver } = require('../src/utils');
const block = JSON.parse(JSON.stringify(unrevivedBlock), jsonReviver);
const miners = JSON.parse(JSON.stringify(minersJson), jsonReviver);
const memoOutputScripts = require('./mocks/memo');
const { consumeNextPush } = require('ecash-script');
const { MockChronikClient } = require('../../../modules/mock-chronik-client');
const { caching } = require('cache-manager');

const {
    parseBlockTxs,
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
    guessRejectReason,
    summarizeTxHistory,
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
    paywallTxs,
    authenticationTxs,
} = require('./mocks/appTxSamples');
const dailyTxs = require('./mocks/dailyTxs');

describe('parse.js functions', function () {
    it('Parses the master test block', function () {
        const thisBlock = block;
        const {
            blockTxs,
            parsedBlock,
            coingeckoPrices,
            tokenInfoMap,
            outputScriptInfoMap,
            blockSummaryTgMsgs,
        } = thisBlock;
        assert.deepEqual(
            parseBlockTxs(parsedBlock.hash, parsedBlock.height, blockTxs),
            parsedBlock,
        );
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
    it('parseOpReturn handles paywall payment txs', function () {
        for (let i = 0; i < paywallTxs.length; i += 1) {
            const { hex, stackArray, msg } = paywallTxs[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: opReturn.knownApps.paywall.app,
                msg: msg,
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
    it('parseOpReturn handles authentication txs', function () {
        for (let i = 0; i < authenticationTxs.length; i += 1) {
            const { hex, stackArray, msg } = authenticationTxs[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: opReturn.knownApps.authentication.app,
                msg: msg,
                stackArray,
                tokenId: false,
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

            assert.deepEqual(
                getStakerFromCoinbaseTx(
                    coinbaseTx.block.height,
                    coinbaseTx.outputs,
                ),
                staker,
            );
        }
    });
    it('getMinerFromCoinbaseTx parses miner for all test vectors', function () {
        for (let i = 0; i < minerTestFixtures.length; i += 1) {
            const { parsed, coinbaseHex, payoutOutputScript } =
                minerTestFixtures[i];
            // Minimally mock the coinbase tx
            const inputScript = coinbaseHex;
            const outputs = [{ outputScript: payoutOutputScript }];

            assert.strictEqual(
                getMinerFromCoinbaseTx(inputScript, outputs, miners),
                parsed,
            );
        }
    });
    it('guessRejectReason returns the expected guess for all test vectors', async function () {
        for (let i = 0; i < invalidatedBlocksTestFixtures.length; i += 1) {
            const {
                height,
                coinbaseData,
                expectedRejectReason,
                expectedCacheData,
                mockedBlock,
            } = invalidatedBlocksTestFixtures[i];

            const mockedChronik = new MockChronikClient();
            mockedChronik.mockedResponses.block = mockedBlock;

            const testMemoryCache = await caching('memory', {
                max: 100,
                ttl: 60,
            });
            testMemoryCache.set(`${height}`, expectedCacheData);

            assert.strictEqual(
                await guessRejectReason(
                    mockedChronik,
                    height,
                    coinbaseData,
                    testMemoryCache,
                ),
                expectedRejectReason,
            );
        }
    });
    it('summarizeTxHistory summarizes a collection of txs across multiple blocks including fiat prices', function () {
        const mockUtcNewDayTimestampSeconds = 1728950400;
        assert.deepEqual(
            summarizeTxHistory(mockUtcNewDayTimestampSeconds, dailyTxs, {
                usd: 0.00003487,
                usd_market_cap: 689047177.8128564,
                usd_24h_vol: 5957332.9687223025,
                usd_24h_change: -0.3973642442197056,
            }),
            [
                '<b>15 Oct 2024</b>\n' +
                    '📦1,331 blocks\n' +
                    '➡️15 txs\n' +
                    '\n' +
                    '📉<b>1 XEC = $0.00003487</b> <i>(-0.40%)</i>\n' +
                    'Trading volume: $5,957,333\n' +
                    'Market cap: $689,047,178\n' +
                    '\n' +
                    '<b><i>⛏️3 miners found blocks</i></b>\n' +
                    '<u>Top 3</u>\n' +
                    '1. Mining-Dutch, 1 <i>(0%)</i>\n' +
                    '2. solopool.org, 1 <i>(0%)</i>\n' +
                    '3. ViaBTC, 1 <i>(0%)</i>\n' +
                    '\n' +
                    '<b><i>💰3 stakers earned $33</i></b>\n' +
                    '<u>Top 3</u>\n' +
                    '1. <a href="https://explorer.e.cash/address/ecash:qzs8hq2pj4hu5j09fdr5uhha3986h2mthvfp7362nu">qzs...2nu</a>, 1 <i>(0%)</i>\n' +
                    '2. <a href="https://explorer.e.cash/address/ecash:qr42c8c04tqndscfrdnl0rzterg0qdaegyjzt8egyg">qr4...gyg</a>, 1 <i>(0%)</i>\n' +
                    '3. <a href="https://explorer.e.cash/address/ecash:qqvhatumna957qu0je78dnc9pc7c7hu89crkq6k0cd">qqv...0cd</a>, 1 <i>(0%)</i>\n' +
                    '\n' +
                    '<a href="https://cashtab.com/">Cashtab</a>\n' +
                    '🎁 <b>1</b> new user received <b>42 XEC</b>\n' +
                    '🎟 <b>1</b> <a href="https://explorer.e.cash/tx/aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1">CACHET</a> reward\n' +
                    '\n' +
                    '🪙 <b>1</b> token tx\n' +
                    '\n' +
                    '📱 <b><i>8 app txs</i></b>\n' +
                    '🖋 <b>1</b> <a href="https://www.ecashchat.com/">Article/Reply tx</a>\n' +
                    '⚛️ <b>1</b> CashFusion\n' +
                    '🛒 <b>1</b> PayButton tx\n' +
                    '🪂 <b>1</b> Airdrop\n' +
                    '✏️ <b>1</b> Cashtab Msg\n' +
                    '💬 <b>1</b> <a href="https://www.ecashchat.com/">eCashChat tx</a>\n' +
                    '🔓 <b>1</b> eCashChat Auth\n' +
                    '💸 <b>1</b> Paywall tx\n' +
                    '\n' +
                    '🏦 <b><i>Binance</i></b>\n' +
                    '<b>1</b> withdrawal, $1',
            ],
        );
    });
    it('summarizeTxHistory summarizes a collection of txs across multiple blocks without fiat price', function () {
        const mockUtcNewDayTimestampSeconds = 1728950400;
        assert.deepEqual(
            summarizeTxHistory(mockUtcNewDayTimestampSeconds, dailyTxs),
            [
                '<b>15 Oct 2024</b>\n' +
                    '📦1,331 blocks\n' +
                    '➡️15 txs\n' +
                    '\n' +
                    '<b><i>⛏️3 miners found blocks</i></b>\n' +
                    '<u>Top 3</u>\n' +
                    '1. Mining-Dutch, 1 <i>(0%)</i>\n' +
                    '2. solopool.org, 1 <i>(0%)</i>\n' +
                    '3. ViaBTC, 1 <i>(0%)</i>\n' +
                    '\n' +
                    '<b><i>💰3 stakers earned 937,620 XEC</i></b>\n' +
                    '<u>Top 3</u>\n' +
                    '1. <a href="https://explorer.e.cash/address/ecash:qzs8hq2pj4hu5j09fdr5uhha3986h2mthvfp7362nu">qzs...2nu</a>, 1 <i>(0%)</i>\n' +
                    '2. <a href="https://explorer.e.cash/address/ecash:qr42c8c04tqndscfrdnl0rzterg0qdaegyjzt8egyg">qr4...gyg</a>, 1 <i>(0%)</i>\n' +
                    '3. <a href="https://explorer.e.cash/address/ecash:qqvhatumna957qu0je78dnc9pc7c7hu89crkq6k0cd">qqv...0cd</a>, 1 <i>(0%)</i>\n' +
                    '\n' +
                    '<a href="https://cashtab.com/">Cashtab</a>\n' +
                    '🎁 <b>1</b> new user received <b>42 XEC</b>\n' +
                    '🎟 <b>1</b> <a href="https://explorer.e.cash/tx/aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1">CACHET</a> reward\n' +
                    '\n' +
                    '🪙 <b>1</b> token tx\n' +
                    '\n' +
                    '📱 <b><i>8 app txs</i></b>\n' +
                    '🖋 <b>1</b> <a href="https://www.ecashchat.com/">Article/Reply tx</a>\n' +
                    '⚛️ <b>1</b> CashFusion\n' +
                    '🛒 <b>1</b> PayButton tx\n' +
                    '🪂 <b>1</b> Airdrop\n' +
                    '✏️ <b>1</b> Cashtab Msg\n' +
                    '💬 <b>1</b> <a href="https://www.ecashchat.com/">eCashChat tx</a>\n' +
                    '🔓 <b>1</b> eCashChat Auth\n' +
                    '💸 <b>1</b> Paywall tx\n' +
                    '\n' +
                    '🏦 <b><i>Binance</i></b>\n' +
                    '<b>1</b> withdrawal, 19,720 XEC',
            ],
        );
    });
});

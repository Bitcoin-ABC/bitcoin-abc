// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const opReturn = require('../constants/op_return');
const unrevivedBlocks = require('./mocks/blocks');
const minersJson = require('../constants/miners');
const minerTestFixtures = require('./fixtures/miners');
const { jsonReviver } = require('../src/utils');
const blocks = JSON.parse(JSON.stringify(unrevivedBlocks), jsonReviver);
const miners = JSON.parse(JSON.stringify(minersJson), jsonReviver);
const memoOutputScripts = require('./mocks/memo');
const { consumeNextPush } = require('ecash-script');

const {
    parseBlock,
    getMinerFromCoinbaseTx,
    parseMemoOutputScript,
    getBlockTgMessage,
    parseOpReturn,
    getSwapTgMsg,
} = require('../src/parse');
// https://github.com/vinarmani/swap-protocol/blob/master/swap-protocol-spec.md
const swapTxSamples = [
    // 0101 https://explorer.e.cash/tx/b03883ca0b106ea5e7113d6cbe46b9ec37ac6ba437214283de2d9cf2fbdc997f
    {
        hex: '045357500001010101204de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf0453454c4c02025801002090dfb75fef5f07e384df4703b853a2741b8e6f3ef31ef8e5187a17fb107547f801010100',
        msg: 'Signal|SLP Atomic Swap|<a href="https://explorer.e.cash/tx/4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf">SPICE</a>|SELL for 6 XEC|Min trade: 0 XEC',
        stackArray: [
            '53575000',
            '01',
            '01',
            '4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf',
            '53454c4c',
            '0258',
            '00',
            '90dfb75fef5f07e384df4703b853a2741b8e6f3ef31ef8e5187a17fb107547f8',
            '01',
            '00',
        ],
        tokenId:
            '4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf',
        tokenInfo: { tokenTicker: 'SPICE' },
    },
    // 0101 ascii example https://explorer.e.cash/tx/2308e1c36d8355edd86dd7d643da41994ab780c852fdfa8d032b1a337bf18bb6
    // Sell price is hex, min price is ascii
    {
        hex: '04535750000101010120fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa0453454c4c01320100202b08df65b0b265be60fbc3346c70729d1378ddfca66da8e6645b74e26d75e61501010831303030303030300100',
        msg: `Signal|SLP Atomic Swap|<a href="https://explorer.e.cash/tx/fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa">GRP</a>|SELL for 0.5 XEC|Min trade: 100,000 XEC`,
        stackArray: [
            '53575000',
            '01',
            '01',
            'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
            '53454c4c',
            '32',
            '00',
            '2b08df65b0b265be60fbc3346c70729d1378ddfca66da8e6645b74e26d75e615',
            '01',
            '3130303030303030', // ASCII for 10000000 or hex for 3,544,385,890,265,608,000, greater than total XEC supply
            '00', // Unknown extra info, seems like mb they mean for this to be 0 hex as the min sell amount
        ],
        tokenId:
            'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
        tokenInfo: { tokenTicker: 'GRP' },
    },
    // 0101 ascii 2, https://explorer.e.cash/tx/dfad6b85a8f0e4b338f4f3bc67d2b7f73fb27f82b6d71ad3e2be955643fe6e42
    // Both are ascii
    {
        hex: '04535750000101010120b46c6e0a485f0fade147696e54d3b523071860fd745fbfa97a515846bd3019a60453454c4c0434343030010020c2e13f79c49f8825832f57df10985ecdd6e28253cf589ffe28e4e95ece174629010204343430300100',
        msg: 'Signal|SLP Atomic Swap|<a href="https://explorer.e.cash/tx/b46c6e0a485f0fade147696e54d3b523071860fd745fbfa97a515846bd3019a6">BTCinu</a>|SELL for 44 XEC|Min trade: 44 XEC',
        stackArray: [
            '53575000',
            '01',
            '01',
            'b46c6e0a485f0fade147696e54d3b523071860fd745fbfa97a515846bd3019a6',
            '53454c4c',
            '34343030', // ASCII 4400
            '00',
            'c2e13f79c49f8825832f57df10985ecdd6e28253cf589ffe28e4e95ece174629',
            '02',
            '34343030', // ASCII 4400
            '00', // Unknown extra info, seems like mb they mean for this to be 0 hex as the min sell amount
        ],
        tokenId:
            'b46c6e0a485f0fade147696e54d3b523071860fd745fbfa97a515846bd3019a6',
        tokenInfo: { tokenTicker: 'BTCinu' },
    },
    // 0101 ascii 3, https://explorer.e.cash/tx/e52daad4006ab27b9e103c7ca0e58bd483f8c6c377ba5075cf7f412fbb272971
    // Recent gorbeious tx
    {
        hex: '04535750000101010120aebcae9afe88d61d8b8ed7b8c83c7c2a555583bf8f8591c94a2c9eb82f34816c0453454c4c093130303030303030300100206338e4674afaa2ef153187ae774ca5e26f0f3447e4dd398c9945b467056a28cf010201000566616c7365',
        msg: 'Signal|SLP Atomic Swap|<a href="https://explorer.e.cash/tx/aebcae9afe88d61d8b8ed7b8c83c7c2a555583bf8f8591c94a2c9eb82f34816c">GORB</a>|SELL for 1,000,000 XEC|Min trade: 0 XEC',
        stackArray: [
            '53575000',
            '01',
            '01',
            'aebcae9afe88d61d8b8ed7b8c83c7c2a555583bf8f8591c94a2c9eb82f34816c',
            '53454c4c',
            '313030303030303030', // ASCII 100,000,000
            '00',
            '6338e4674afaa2ef153187ae774ca5e26f0f3447e4dd398c9945b467056a28cf',
            '02',
            '00', // hex 00
            '66616c7365', // ASCII for 'false' ... does not match spec, mb used for something. Weird to do this in ASCII
        ],
        tokenId:
            'aebcae9afe88d61d8b8ed7b8c83c7c2a555583bf8f8591c94a2c9eb82f34816c',
        tokenInfo: { tokenTicker: 'GORB' },
    },
    // 0102 https://explorer.e.cash/tx/70c2842e1b2c7eb49ee69cdecf2d6f3cd783c307c4cbeef80f176159c5891484
    // Note, this example uses faulty pushdata at the end
    {
        hex: '045357500001010102202ee326cabee15bab127baad3aadbe39f18877933ea064203de5d08bba9654e69056a65746f6e0e657363726f772d706172656a617301002102f5515a2e17826c72011f608d2e8458580ea8cbaba3128abe7f4ae2df4d51572920b6919ed649c4710799cb01e2e66bf0fdb2eccee219fd8c4775d3a85431a9984f0101222102188904278ebf33059093f596a2697cf3668b3bec9a3a0c6408a455147ab3db934c000100',
        msg: 'Signal|Multi-Party Escrow',
        stackArray: [
            '53575000',
            '01',
            '02',
            '2ee326cabee15bab127baad3aadbe39f18877933ea064203de5d08bba9654e69',
            '6a65746f6e',
            '657363726f772d706172656a6173',
            '00',
            '02f5515a2e17826c72011f608d2e8458580ea8cbaba3128abe7f4ae2df4d515729',
            'b6919ed649c4710799cb01e2e66bf0fdb2eccee219fd8c4775d3a85431a9984f',
            '01',
            '2102188904278ebf33059093f596a2697cf3668b3bec9a3a0c6408a455147ab3db93',
            '00',
        ],
        tokenId: false,
        tokenInfo: false,
    },
    // 0103 https://explorer.e.cash/tx/565c84990aacfbd006d4ed2ee14bfb0f3bb27a84a6c9adcabccb6fb8e17e64c5
    {
        hex: '0453575000010101032668747470733a2f2f7377617063726f776466756e642e636f6d2f736f6d6563616d706169676e4502a0860100000000001976a914da74026d67264c0acfede38e8302704ef7d8cfb288acf0490200000000001976a914ac656e2dd5378ca9c45fd5cd44aa7da87c7bfa8288ac',
        msg: 'Signal|Threshold Crowdfunding',
        stackArray: [
            '53575000',
            '01',
            '03',
            '68747470733a2f2f7377617063726f776466756e642e636f6d2f736f6d6563616d706169676e',
            '02a0860100000000001976a914da74026d67264c0acfede38e8302704ef7d8cfb288acf0490200000000001976a914ac656e2dd5378ca9c45fd5cd44aa7da87c7bfa8288ac',
        ],
        tokenId: false,
        tokenInfo: false,
    },
    // 0201 N/A in spec, pending spotting in the wild
    // 0202 N/A in spec, pending spotting in the wild
    // 0203 N/A in spec, pending spotting in the wild
    // Malformed swap
    {
        hex: '045357500001010105204de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf0453454c4c02025801002090dfb75fef5f07e384df4703b853a2741b8e6f3ef31ef8e5187a17fb107547f801010100',
        msg: 'Signal|Malformed SWaP tx',
        stackArray: [
            '53575000',
            '01',
            '05', // instead of 01
            '4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf',
            '53454c4c',
            '0258',
            '00',
            '90dfb75fef5f07e384df4703b853a2741b8e6f3ef31ef8e5187a17fb107547f8',
            '01',
            '00',
        ],
        tokenId: false,
        tokenInfo: { tokenTicker: 'SPICE' },
    },
];

describe('parse.js functions', function () {
    it('All test blocks', function () {
        for (let i = 0; i < blocks.length; i += 1) {
            const thisBlock = blocks[i];
            const {
                blockDetails,
                parsedBlock,
                coingeckoPrices,
                tokenInfoMap,
                blockSummaryTgMsgs,
            } = thisBlock;
            assert.deepEqual(parseBlock(blockDetails), parsedBlock);
            assert.deepEqual(
                getBlockTgMessage(parsedBlock, coingeckoPrices, tokenInfoMap),
                blockSummaryTgMsgs,
            );
        }
    });
    it('parseOpReturn handles all types of SWaP txs', function () {
        for (let i = 0; i < swapTxSamples.length; i += 1) {
            const { hex, stackArray, tokenId } = swapTxSamples[i];
            assert.deepEqual(parseOpReturn(hex), {
                app: opReturn.knownApps.swap.app,
                msg: '',
                stackArray,
                tokenId,
            });
        }
    });
    it('getSwapTgMsg handles all types of SWaP txs', function () {
        for (let i = 0; i < swapTxSamples.length; i += 1) {
            const { stackArray, msg, tokenInfo } = swapTxSamples[i];
            const result = getSwapTgMsg(stackArray, tokenInfo);
            //console.log(`2`, result);
            assert.strictEqual(result, msg);
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
                stackArray.push(consumeNextPush(stack));
            }
            assert.deepEqual(parseMemoOutputScript(stackArray), {
                app: opReturn.memo.app,
                msg,
            });
        });
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

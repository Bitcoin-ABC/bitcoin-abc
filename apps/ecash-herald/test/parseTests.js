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
} = require('../src/parse');

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

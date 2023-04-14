// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const config = require('../config');
const blocks = require('./mocks/blocks');
const memoOutputScripts = require('./mocks/memo');

const {
    parseBlock,
    parseMemoOutputScript,
    getBlockTgMessage,
} = require('../src/parse');

describe('parse.js functions', function () {
    it('All test blocks', function () {
        for (let i = 0; i < blocks.length; i += 1) {
            const thisBlock = blocks[i];
            const { blockDetails, parsedBlock, coingeckoPrices, tgMsg } =
                thisBlock;
            assert.deepEqual(parseBlock(blockDetails), parsedBlock);
            assert.deepEqual(
                getBlockTgMessage(parsedBlock, coingeckoPrices),
                tgMsg,
            );
        }
    });
    it(`parseMemoOutputScript correctly parses all tested memo actions in memo.js`, function () {
        memoOutputScripts.map(memoTestObj => {
            const app = config.opReturn.memo.app;
            const { outputScript, parsed } = memoTestObj;
            assert.deepEqual(parseMemoOutputScript(outputScript), {
                app,
                msg: parsed,
            });
        });
    });
});

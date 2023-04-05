'use strict'
const assert = require('assert');
const config = require('../config');
const blocks = require('./mocks/blocks');
const { telegramHtmlStrings } = require('./mocks/templates');
const memoOutputScripts = require('./mocks/memo');

const {
    parseBlock,
    parseMemoOutputScript,
    getBlockTgMessage,
    prepareStringForTelegramHTML,
} = require('../src/parse');

describe('ecash-telegram-bot parses chronik block data and generates expected telegram msg', function () {
    it('All test blocks', function () {
        const blockNames = Object.keys(blocks);
        for (let i = 0; i < blockNames.length; i += 1) {
            const thisBlock = blocks[blockNames[i]];
            const { chronikData, parsed, tgHtml } = thisBlock;
            assert.deepEqual(parseBlock(chronikData), parsed);
            assert.deepEqual(getBlockTgMessage(parsed), tgHtml);
        }
    });

    it(`prepareStringForTelegramHTML replaces '<', '>', and '&' per specifications`, function () {
        const { safe, dangerous } = telegramHtmlStrings;
        assert.strictEqual(prepareStringForTelegramHTML(dangerous), safe);
    });
    it(`prepareStringForTelegramHTML does not change a string if it does not contain characters restricted by Telegram's API`, function () {
        const { noChangeExpected } = telegramHtmlStrings;
        assert.strictEqual(
            prepareStringForTelegramHTML(noChangeExpected),
            noChangeExpected,
        );
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

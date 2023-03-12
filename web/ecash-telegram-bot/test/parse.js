const assert = require('assert');
const {
    genesisBlock,
    etokenGenesisTx,
    buxTxs,
    cashtabMsg,
    multipleGenesis,
    htmlEscapeTest,
    cashtabMsgMulti,
} = require('./mocks/blocks');
const { telegramHtmlStrings } = require('./mocks/templates');

const {
    parseBlock,
    getBlockTgMessage,
    prepareStringForTelegramHTML,
} = require('../parse');

describe('ecash-telegram-bot parse.js chronik parsing functions', function () {
    it('Parses the genesis block', function () {
        assert.deepEqual(
            parseBlock(genesisBlock.chronikData),
            genesisBlock.parsed,
        );
    });
    it('Creates a tg message for the genesis block', function () {
        assert.deepEqual(
            getBlockTgMessage(genesisBlock.parsed),
            genesisBlock.tgHtml,
        );
    });
    it('Parses a block containing an etoken genesis tx', function () {
        assert.deepEqual(
            parseBlock(etokenGenesisTx.chronikData),
            etokenGenesisTx.parsed,
        );
    });
    it('Creates a tg message for a block containing an etoken genesis tx', function () {
        assert.deepEqual(
            getBlockTgMessage(etokenGenesisTx.parsed),
            etokenGenesisTx.tgHtml,
        );
    });
    it('Parses a block containing multiple etoken genesis txs', function () {
        assert.deepEqual(
            parseBlock(multipleGenesis.chronikData),
            multipleGenesis.parsed,
        );
    });
    it('Creates a tg message for a block containing multiple etoken genesis txs', function () {
        assert.deepEqual(
            getBlockTgMessage(multipleGenesis.parsed),
            multipleGenesis.tgHtml,
        );
    });
    it('Parses a block containing BUX etoken txs', function () {
        assert.deepEqual(parseBlock(buxTxs.chronikData), buxTxs.parsed);
    });
    it('Creates a tg message for a block containing BUX etoken txs', function () {
        assert.deepEqual(getBlockTgMessage(buxTxs.parsed), buxTxs.tgHtml);
    });
    it('Parses a block containing a Cashtab message tx', function () {
        assert.deepEqual(parseBlock(cashtabMsg.chronikData), cashtabMsg.parsed);
    });
    it('Creates a tg message for a block containing an etoken genesis tx', function () {
        assert.deepEqual(
            getBlockTgMessage(etokenGenesisTx.parsed),
            etokenGenesisTx.tgHtml,
        );
    });
    it('Parses a block containing genesis txs that require html escape processing', function () {
        assert.deepEqual(
            parseBlock(htmlEscapeTest.chronikData),
            htmlEscapeTest.parsed,
        );
    });
    it('Parses a block containing multiple Cashtab msg txs', function () {
        assert.deepEqual(
            parseBlock(cashtabMsgMulti.chronikData),
            cashtabMsgMulti.parsed,
        );
    });
    it('Creates a tg message for a block containing multiple Cashtab msg txs', function () {
        assert.deepEqual(
            getBlockTgMessage(cashtabMsgMulti.parsed),
            cashtabMsgMulti.tgHtml,
        );
    });
    it('Creates a tg message for a block containing genesis txs that require html escape processing', function () {
        assert.deepEqual(
            getBlockTgMessage(htmlEscapeTest.parsed),
            htmlEscapeTest.tgHtml,
        );
    });
    it(`prepareStringForTelegramHTML replaces '<', '>', and '&' per specifications`, function () {
        assert.strictEqual(
            prepareStringForTelegramHTML(telegramHtmlStrings.dangerous),
            telegramHtmlStrings.safe,
        );
    });
    it(`prepareStringForTelegramHTML does not change a string if it does not contain characters restricted by Telegram's API`, function () {
        assert.strictEqual(
            prepareStringForTelegramHTML(telegramHtmlStrings.noChangeExpected),
            telegramHtmlStrings.noChangeExpected,
        );
    });
});

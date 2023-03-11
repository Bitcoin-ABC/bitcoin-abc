const assert = require('assert');
const {
    genesisBlock,
    etokenGenesisTx,
    buxTxs,
    cashtabMsg,
    multipleGenesis,
} = require('./mocks/blocks');

const { parseBlock, getBlockTgMessage } = require('../parse');

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
});

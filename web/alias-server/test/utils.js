const assert = require('assert');
const {
    outputScriptToAddress,
    getValidAliasTxsToBeAddedToDb,
    generateReservedAliasTxArray,
} = require('../utils');
const reservedAliasTxs = require('./mocks/reservedAliasTxs');
const {
    validAliasesInDb,
    validAliasTxs,
    validAliasTxsToBeAddedToDb,
} = require('./mocks/utilsMocks');

describe('alias-server utils.js', function () {
    it('Converts a P2PKH output script to a valid P2PKH ecash: address', function () {
        assert.strictEqual(
            outputScriptToAddress(
                '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
            ),
            'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed',
        );
    });
    it('Converts a P2SH output script to a valid P2SH ecash: address', function () {
        assert.strictEqual(
            outputScriptToAddress(
                'a914c5e60aad8d98f298a76434750630dc1b46a2382187',
            ),
            'ecash:prz7vz4d3kv09x98vs682p3smsd5dg3cyykjye6grt',
        );
    });
    it('Returns false when input is invalid (in this case, an inputScript', function () {
        assert.strictEqual(
            outputScriptToAddress(
                '483045022100dfad6c871d101eade422ef6c1c8aca951a43c65c6dd7cccc44d56b04a6b1b60602200c82ac4c06523fdb7ee455f1903c95a37c6fc1bb2c35c080778b869bb63f8f784121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa4',
            ),
            false,
        );
    });
    it('Returns false when input is an empty string', function () {
        assert.strictEqual(outputScriptToAddress(''), false);
    });
    it('getValidAliasTxsToBeAddedToDb recognizes new aliases to be added to the database', function () {
        assert.deepEqual(
            getValidAliasTxsToBeAddedToDb(validAliasesInDb, validAliasTxs),
            validAliasTxsToBeAddedToDb,
        );
    });
    it('getValidAliasTxsToBeAddedToDb returns an empty array when no new aliases need to be added to the database', function () {
        assert.deepEqual(
            getValidAliasTxsToBeAddedToDb(validAliasesInDb, validAliasesInDb),
            [],
        );
    });
    it('getValidAliasTxsToBeAddedToDb returns an empty array when template data arrays of objects have the same length', function () {
        assert.deepEqual(
            getValidAliasTxsToBeAddedToDb(
                [{ alias: 'test' }, { alias: 'test1' }, { alias: 'test2' }],
                [{ alias: 'test' }, { alias: 'test1' }, { alias: 'test2' }],
            ),
            [],
        );
    });
    it('generateReservedAliasTxArray returns an array of reserved alias txs in the correct format', function () {
        assert.deepEqual(generateReservedAliasTxArray(), reservedAliasTxs);
    });
});

'use strict';
const assert = require('assert');
const {
    outputScriptToAddress,
    getValidAliasTxsToBeAddedToDb,
    generateReservedAliasTxArray,
    getAliasFromHex,
    getHexFromAlias,
    getAliasBytecount,
    isValidAliasString,
    removeUnconfirmedTxsFromTxHistory,
    getConfirmedTxsToBeAddedToDb,
} = require('../utils');
const reservedAliasTxs = require('./mocks/reservedAliasTxs');
const unconfirmedAliasTxs = require('./mocks/unconfirmedAliasTxs');
const {
    validAliasesInDb,
    validAliasTxs,
    validAliasTxsToBeAddedToDb,
    aliasHexConversions,
    validAliasStrings,
    invalidAliasStrings,
} = require('./mocks/utilsMocks');
const { testAddressAliases } = require('./mocks/aliasMocks');
const {
    confirmedTxHistoryInDb,
    allTxHistoryFromChronik,
    unconfirmedTxs,
    unconfirmedTxsAfterConfirmation,
} = require('./mocks/txHistoryMocks');

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
    it('Hexadecimal to utf8 encoding functions work forward and backward. Byte counts match hexadecimal bytes.', function () {
        for (let i = 0; i < aliasHexConversions.length; i += 1) {
            const { alias, aliasHex, aliasByteCount } = aliasHexConversions[i];
            assert.deepEqual(getHexFromAlias(alias), aliasHex);
            assert.deepEqual(getAliasFromHex(aliasHex), alias);
            assert.deepEqual(getAliasBytecount(alias), aliasByteCount);
        }
    });
    it('Recognizes lower case alphanumeric strings as valid alias strings', function () {
        for (let i = 0; i < validAliasStrings.length; i += 1) {
            const validAliasString = validAliasStrings[i];
            assert.deepEqual(isValidAliasString(validAliasString), true);
        }
    });
    it('Recognizes strings with characters other than lower case a-z or numbers 0-9 as invalid alias strings', function () {
        for (let i = 0; i < invalidAliasStrings.length; i += 1) {
            const invalidAliasString = invalidAliasStrings[i];
            assert.deepEqual(isValidAliasString(invalidAliasString), false);
        }
    });
    it('removeUnconfirmedTxsFromTxHistory removes unconfirmed txs from an array of chronik tx history', function () {
        assert.deepEqual(
            removeUnconfirmedTxsFromTxHistory(
                unconfirmedAliasTxs.concat(testAddressAliases.txHistory),
            ),
            testAddressAliases.txHistory,
        );
    });
    it('getConfirmedTxsToBeAddedToDb returns an empty array if chronik result and database result both have the same confirmed transactions and no unconfirmed transactions', function () {
        const confirmedTxsFromChronik = removeUnconfirmedTxsFromTxHistory(
            allTxHistoryFromChronik,
        );
        assert.deepEqual(
            getConfirmedTxsToBeAddedToDb(
                confirmedTxHistoryInDb,
                confirmedTxsFromChronik,
            ),
            [],
        );
    });
    it('getConfirmedTxsToBeAddedToDb returns expected array of uncached confirmed txs with 11 confirmed txs missing', function () {
        const confirmedTxs = removeUnconfirmedTxsFromTxHistory(
            unconfirmedTxsAfterConfirmation.concat(allTxHistoryFromChronik),
        );
        assert.deepEqual(
            getConfirmedTxsToBeAddedToDb(confirmedTxHistoryInDb, confirmedTxs),
            unconfirmedTxsAfterConfirmation,
        );
    });
    it('getConfirmedTxsToBeAddedToDb returns expected array of uncached confirmed txs with 136 confirmed txs missing', function () {
        /*
        Note
        The complicated array manipulations here were not originally in this diff
        However, storing all of the data structures raw led to mockTxHistory.js being almost 10 MB
        The trade-off of complicated math here was deemed distasteful yet worthwhile -- bytesofman
        */
        const confirmedTxs = removeUnconfirmedTxsFromTxHistory(
            unconfirmedTxsAfterConfirmation.concat(allTxHistoryFromChronik),
        );
        // Remove the most recent 125 of the 490 txs in confirmedTxHistoryInDb
        const confirmedTxHistoryInDbLess = confirmedTxHistoryInDb.slice(125);
        // Expected result is the most recent 136 confirmedTxs
        const expectedResult = confirmedTxs.slice(0, 136);
        assert.deepEqual(
            getConfirmedTxsToBeAddedToDb(
                confirmedTxHistoryInDbLess,
                confirmedTxs,
            ),
            expectedResult,
        );
    });
    it('getConfirmedTxsToBeAddedToDb returns an empty array if chronik result includes unconfirmed txs not present in the database but otherwise includes the same confirmed transactions', function () {
        const confirmedTxsFromChronik = removeUnconfirmedTxsFromTxHistory(
            unconfirmedTxs.concat(allTxHistoryFromChronik),
        );
        assert.deepEqual(
            getConfirmedTxsToBeAddedToDb(
                confirmedTxHistoryInDb,
                confirmedTxsFromChronik,
            ),
            [],
        );
    });
});

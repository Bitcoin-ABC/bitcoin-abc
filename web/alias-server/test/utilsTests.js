'use strict';
const assert = require('assert');
const {
    getValidAliasTxsToBeAddedToDb,
    generateReservedAliasTxArray,
    getAliasFromHex,
    getHexFromAlias,
    getAliasBytecount,
    isValidAliasString,
    removeUnconfirmedTxsFromTxHistory,
    getConfirmedTxsToBeAddedToDb,
} = require('../src/utils');
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

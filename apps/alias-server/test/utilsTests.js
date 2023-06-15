// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const {
    getAliasFromHex,
    getHexFromAlias,
    getAliasBytecount,
    isValidAliasString,
    removeUnconfirmedTxsFromTxHistory,
} = require('../src/utils');
const {
    aliasHexConversions,
    validAliasStrings,
    invalidAliasStrings,
} = require('./mocks/utilsMocks');
const { generated } = require('./mocks/aliasMocks');

describe('alias-server utils.js', function () {
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
        // First, clone the mock so that you are not modifying it in place
        const txHistoryWithSomeUnconfirmedTxs = JSON.parse(
            JSON.stringify(generated.txHistory),
        );

        // Then, delete the 'block' key of the most recent 3 txs
        // NB these do not include valid alias registrations
        delete txHistoryWithSomeUnconfirmedTxs[0].block; // db09c578d38f37bd9f2bb69eeb8ecb2e24c5be01aa2914f17d94759aadf71386
        delete txHistoryWithSomeUnconfirmedTxs[1].block; // c040ccdc46df2951b2ab0cd6d48cf9db7c518068d1f871e60379ee8ccd1caa0e
        delete txHistoryWithSomeUnconfirmedTxs[2].block; // 828201e4680e6617636193d3f2a319daab80a8cc5772b9a5b6e068de639f2d9c

        // Manually delete these txs from your expected result
        let expectedResult = JSON.parse(JSON.stringify(generated.txHistory));
        expectedResult.splice(0, 3);
        assert.deepEqual(
            removeUnconfirmedTxsFromTxHistory(txHistoryWithSomeUnconfirmedTxs),
            expectedResult,
        );
    });
});

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
    getOutputScriptFromAddress,
} = require('../src/utils');
const unconfirmedAliasTxs = require('./mocks/unconfirmedAliasTxs');
const {
    aliasHexConversions,
    validAliasStrings,
    invalidAliasStrings,
} = require('./mocks/utilsMocks');
const { testAddressAliases } = require('./mocks/aliasMocks');

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
        assert.deepEqual(
            removeUnconfirmedTxsFromTxHistory(
                unconfirmedAliasTxs.concat(testAddressAliases.txHistory),
            ),
            testAddressAliases.txHistory,
        );
    });
    // getOutputScriptFromAddress
    it('Returns expected outputScript for a p2pkh address', function () {
        assert.strictEqual(
            getOutputScriptFromAddress(
                'ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8',
            ),
            '76a914638568e36d0b5d7d49a6e99854caa27d9772b09388ac',
        );
    });
    it('Returns expected outputScript for a p2sh address', function () {
        assert.strictEqual(
            getOutputScriptFromAddress(
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
            ),
            'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
        );
    });
});

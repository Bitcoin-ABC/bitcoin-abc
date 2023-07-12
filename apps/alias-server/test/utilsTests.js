// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const {
    getXecPrice,
    getAliasFromHex,
    getHexFromAlias,
    getAliasBytecount,
    isValidAliasString,
    removeUnconfirmedTxsFromTxHistory,
    satsToFormattedValue,
} = require('../src/utils');
const {
    aliasHexConversions,
    validAliasStrings,
    invalidAliasStrings,
} = require('./mocks/utilsMocks');
const { generated } = require('./mocks/aliasMocks');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const mockXecPrice = 0.000033;

describe('alias-server utils.js', function () {
    it('getXecPrice returns price as a number', async function () {
        // Mock a successful API request
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });
        const mockResult = { ecash: { usd: 3.331e-5 } };
        mock.onGet().reply(200, mockResult);
        assert.strictEqual(await getXecPrice(), 3.331e-5);
    });
    it('getXecPrice returns false on API error', async function () {
        // Mock a successful API request
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });
        const mockResult = { error: 'API is down' };
        mock.onGet().reply(500, mockResult);
        assert.strictEqual(await getXecPrice(), false);
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
    it('satsToFormattedValue returns a 6-decimal formatted fiat amount if total fiat value is less than $0.00001', function () {
        assert.strictEqual(satsToFormattedValue(10, mockXecPrice), `$0.000003`);
    });
    it('satsToFormattedValue returns a 5-decimal formatted fiat amount if total fiat value is less than $0.0001', function () {
        assert.strictEqual(satsToFormattedValue(100, mockXecPrice), `$0.00003`);
    });
    it('satsToFormattedValue returns a 4-decimal formatted fiat amount if total fiat value is less than $0.001', function () {
        assert.strictEqual(satsToFormattedValue(1000, mockXecPrice), `$0.0003`);
    });
    it('satsToFormattedValue returns a 3-decimal formatted fiat amount if total fiat value is less than $0.01', function () {
        assert.strictEqual(satsToFormattedValue(10000, mockXecPrice), `$0.003`);
    });
    it('satsToFormattedValue returns a 2-decimal formatted fiat amount if total fiat value is less than $1', function () {
        assert.strictEqual(
            satsToFormattedValue(1000000, mockXecPrice),
            `$0.33`,
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount if total fiat value is less than $10', function () {
        assert.strictEqual(
            satsToFormattedValue(10000000, mockXecPrice),
            '$3.30',
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount if $100 < total fiat value < $1k', function () {
        assert.strictEqual(
            satsToFormattedValue(1234567890, mockXecPrice),
            '$407',
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount if $1k < total fiat value < $1M', function () {
        assert.strictEqual(
            satsToFormattedValue(55555555555, mockXecPrice),
            '$18k',
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount of $1M if $1M < total fiat value < $1B', function () {
        assert.strictEqual(
            satsToFormattedValue(3367973856209, mockXecPrice),
            '$1M',
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount if $1M < total fiat value < $1B', function () {
        assert.strictEqual(
            satsToFormattedValue(55555555555555, mockXecPrice),
            '$18M',
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount if  total fiat value > $1B', function () {
        assert.strictEqual(
            satsToFormattedValue(21000000000000000, mockXecPrice),
            '$7B',
        );
    });

    it('satsToFormattedValue returns a formatted XEC amount if coingeckoPrices is false', function () {
        assert.strictEqual(
            satsToFormattedValue(55555555555555, false),
            '556B XEC',
        );
    });
    it('satsToFormattedValue returns a USD amount with 7 decimal places if fiat qty is less than 0.000001', function () {
        assert.strictEqual(satsToFormattedValue(1, mockXecPrice), '$0.0000003');
    });
});

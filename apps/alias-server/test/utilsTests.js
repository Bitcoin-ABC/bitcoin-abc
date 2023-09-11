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
    splitTxsByConfirmed,
    satsToFormattedValue,
    getAliasPrice,
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
const config = require('../config');

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
    it('splitTxsByConfirmed returns confirmed and unconfirmed txs from an array of chronik tx history', function () {
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
        let confirmedTxs = JSON.parse(JSON.stringify(generated.txHistory));
        delete confirmedTxs[0].block; // db09c578d38f37bd9f2bb69eeb8ecb2e24c5be01aa2914f17d94759aadf71386
        delete confirmedTxs[1].block; // c040ccdc46df2951b2ab0cd6d48cf9db7c518068d1f871e60379ee8ccd1caa0e
        delete confirmedTxs[2].block; // 828201e4680e6617636193d3f2a319daab80a8cc5772b9a5b6e068de639f2d9c

        let unconfirmedTxs = confirmedTxs.splice(0, 3);
        assert.deepEqual(splitTxsByConfirmed(txHistoryWithSomeUnconfirmedTxs), {
            confirmedTxs,
            unconfirmedTxs,
        });
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
    it('getAliasPrice returns expected price and price expiration blockheight for an alias registered in the most recent price epoch', function () {
        const registrationBlockheight = 785000;
        const aliasLength = 15;
        const mockPrices = [
            {
                startHeight: registrationBlockheight,
                fees: {
                    1: 571,
                    2: 570,
                    3: 569,
                    4: 568,
                    5: 567,
                    6: 566,
                    7: 565,
                    8: 564,
                    9: 563,
                    10: 562,
                    11: 561,
                    12: 560,
                    13: 559,
                    14: 558,
                    15: 557,
                    16: 556,
                    17: 555,
                    18: 554,
                    19: 553,
                    20: 552,
                    21: 551,
                },
            },
        ];
        assert.deepEqual(
            getAliasPrice(mockPrices, aliasLength, registrationBlockheight),
            {
                registrationFeeSats: 557,
                priceExpirationHeight: null,
            },
        );

        // Also works for an unconfirmed tx
        assert.deepEqual(
            getAliasPrice(
                mockPrices,
                aliasLength,
                config.unconfirmedBlockheight,
            ),
            {
                registrationFeeSats: 557,
                priceExpirationHeight: null,
            },
        );
    });
    it('getAliasPrice throws an error if asked for a price of an undefined epoch', function () {
        const aliasLength = 15;
        const mockPrices = [
            {
                startHeight: 800000,
                fees: {
                    1: 571,
                    2: 570,
                    3: 569,
                    4: 568,
                    5: 567,
                    6: 566,
                    7: 565,
                    8: 564,
                    9: 563,
                    10: 562,
                    11: 561,
                    12: 560,
                    13: 559,
                    14: 558,
                    15: 557,
                    16: 556,
                    17: 555,
                    18: 554,
                    19: 553,
                    20: 552,
                    21: 551,
                },
            },
        ];
        const registrationBlockheight = 799999;

        assert.throws(() => {
            getAliasPrice(mockPrices, aliasLength, registrationBlockheight);
        }, new Error(`${registrationBlockheight} precedes alias protocol activation height`));
    });
    it('getAliasPrice throws an error if called with a prices object that does not cover the alias length', function () {
        const registrationBlockheight = 785000;
        const aliasLength = 15;
        const mockPrices = [
            {
                startHeight: registrationBlockheight,
                fees: {
                    1: 571,
                    2: 570,
                    3: 569,
                    4: 568,
                    5: 567,
                    6: 566,
                    7: 565,
                    8: 564,
                    9: 563,
                    10: 562,
                    11: 561,
                    12: 560,
                    13: 559,
                    14: 558,
                    16: 556,
                    17: 555,
                    18: 554,
                    19: 553,
                    20: 552,
                    21: 551,
                },
            },
        ];

        assert.throws(() => {
            getAliasPrice(mockPrices, aliasLength, registrationBlockheight);
        }, new Error(`fees[${aliasLength}] is undefined for ${registrationBlockheight}`));
    });
    it('getAliasPrice returns expected price and price expiration blockheight for an alias registered in a price epoch older than the most recent price epoch', function () {
        const registrationBlockheight = 750000;
        const aliasLength = 21;
        const mockPrices = [
            {
                startHeight: 785000,
                fees: {
                    1: 571,
                    2: 570,
                    3: 569,
                    4: 568,
                    5: 567,
                    6: 566,
                    7: 565,
                    8: 564,
                    9: 563,
                    10: 562,
                    11: 561,
                    12: 560,
                    13: 559,
                    14: 558,
                    15: 557,
                    16: 556,
                    17: 555,
                    18: 554,
                    19: 553,
                    20: 552,
                    21: 551,
                },
            },
            {
                startHeight: registrationBlockheight,
                fees: {
                    1: 1001,
                    2: 1002,
                    3: 1003,
                    4: 1004,
                    5: 1005,
                    6: 1006,
                    7: 1007,
                    8: 1008,
                    9: 1009,
                    10: 1010,
                    11: 1011,
                    12: 1012,
                    13: 1013,
                    14: 1014,
                    15: 1015,
                    16: 1016,
                    17: 1017,
                    18: 1018,
                    19: 1019,
                    20: 1020,
                    21: 1021,
                },
            },
        ];
        assert.deepEqual(
            getAliasPrice(mockPrices, aliasLength, registrationBlockheight),
            {
                registrationFeeSats: 1021,
                priceExpirationHeight: 785000, // the startheight of the next price epoch
            },
        );
    });
    it('getAliasPrice throws error if prices object is not properly sorted', function () {
        const registrationBlockheight = 786000;
        const aliasLength = 21;
        const mockPrices = [
            {
                startHeight: 750000,
                fees: {
                    1: 1001,
                    2: 1002,
                    3: 1003,
                    4: 1004,
                    5: 1005,
                    6: 1006,
                    7: 1007,
                    8: 1008,
                    9: 1009,
                    10: 1010,
                    11: 1011,
                    12: 1012,
                    13: 1013,
                    14: 1014,
                    15: 1015,
                    16: 1016,
                    17: 1017,
                    18: 1018,
                    19: 1019,
                    20: 1020,
                    21: 1021,
                },
            },
            {
                startHeight: 785000,
                fees: {
                    1: 571,
                    2: 570,
                    3: 569,
                    4: 568,
                    5: 567,
                    6: 566,
                    7: 565,
                    8: 564,
                    9: 563,
                    10: 562,
                    11: 561,
                    12: 560,
                    13: 559,
                    14: 558,
                    15: 557,
                    16: 556,
                    17: 555,
                    18: 554,
                    19: 553,
                    20: 552,
                    21: 551,
                },
            },
        ];

        assert.throws(() => {
            getAliasPrice(mockPrices, aliasLength, registrationBlockheight);
        }, new Error('alias price epochs must be sorted by startHeight, highest to lowest'));
    });
    it('getAliasPrice throws error if prices object is not properly sorted, even if the first two epochs are', function () {
        const registrationBlockheight = 790000;
        const aliasLength = 21;
        const mockPrices = [
            {
                startHeight: 785000,
                fees: {
                    1: 1001,
                    2: 1002,
                    3: 1003,
                    4: 1004,
                    5: 1005,
                    6: 1006,
                    7: 1007,
                    8: 1008,
                    9: 1009,
                    10: 1010,
                    11: 1011,
                    12: 1012,
                    13: 1013,
                    14: 1014,
                    15: 1015,
                    16: 1016,
                    17: 1017,
                    18: 1018,
                    19: 1019,
                    20: 1020,
                    21: 1021,
                },
            },
            {
                startHeight: 750000,
                fees: {
                    1: 571,
                    2: 570,
                    3: 569,
                    4: 568,
                    5: 567,
                    6: 566,
                    7: 565,
                    8: 564,
                    9: 563,
                    10: 562,
                    11: 561,
                    12: 560,
                    13: 559,
                    14: 558,
                    15: 557,
                    16: 556,
                    17: 555,
                    18: 554,
                    19: 553,
                    20: 552,
                    21: 551,
                },
            },
            {
                startHeight: 786000,
                fees: {
                    1: 2001,
                    2: 2002,
                    3: 2003,
                    4: 2004,
                    5: 2005,
                    6: 2006,
                    7: 2007,
                    8: 2008,
                    9: 2009,
                    10: 2010,
                    11: 2011,
                    12: 2012,
                    13: 2013,
                    14: 2014,
                    15: 2015,
                    16: 2016,
                    17: 2017,
                    18: 2018,
                    19: 2019,
                    20: 2020,
                    21: 2021,
                },
            },
        ];

        assert.throws(() => {
            getAliasPrice(mockPrices, aliasLength, registrationBlockheight);
        }, new Error('alias price epochs must be sorted by startHeight, highest to lowest'));
    });
});

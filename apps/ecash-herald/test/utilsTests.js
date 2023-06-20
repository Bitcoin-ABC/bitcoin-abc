// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const BigNumber = require('bignumber.js');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const config = require('../config');
const {
    returnAddressPreview,
    getCoingeckoPrices,
    formatPrice,
    jsonReplacer,
    jsonReviver,
    mapToKeyValueArray,
    formatXecAmount,
    satsToFormattedValue,
} = require('../src/utils');
const { addressPreviews, mockCoingeckoPrices } = require('./mocks/templates');

describe('ecash-telegram-bot utils.js functions', function () {
    it('returnAddressPreview converts a valid ecash: address into an abbreviated preview at various slice sizes', function () {
        for (let i = 0; i < addressPreviews.length; i += 1) {
            const { address, preview, sliceSize } = addressPreviews[i];
            assert.strictEqual(
                returnAddressPreview(address, sliceSize),
                preview,
            );
        }
    });
    it('getCoingeckoPrices returns object of expected shape for config API call', async function () {
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });

        const mockResult = {
            bitcoin: { usd: 28044.64857505 },
            ecash: { usd: 0.00003113 },
            ethereum: { usd: 1900.73166438 },
        };

        // Mock a successful API request
        mock.onGet().reply(200, mockResult);

        // Expected value will include ticker information
        const expectedCoingeckoPrices = [
            {
                fiat: 'usd',
                price: 0.00003113,
                ticker: 'XEC',
            },
            {
                fiat: 'usd',
                price: 28044.64857505,
                ticker: 'BTC',
            },
            {
                fiat: 'usd',
                price: 1900.73166438,
                ticker: 'ETH',
            },
        ];
        assert.deepEqual(await getCoingeckoPrices(config.priceApi), {
            coingeckoResponse: mockResult,
            coingeckoPrices: expectedCoingeckoPrices,
        });
    });
    it('getCoingeckoPrices returns object of expected shape for API call of custom config', async function () {
        const apiConfig = {
            apiBase: 'https://api.coingecko.com/api/v3/simple/price',
            cryptos: [
                { coingeckoSlug: 'ecash', ticker: 'XEC' },
                { coingeckoSlug: 'monero', ticker: 'XMR' },
                { coingeckoSlug: 'solana', ticker: 'SOL' },
            ],
            fiat: 'eur',
            precision: 8,
        };

        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });

        const mockResult = {
            ecash: { eur: 0.00003113 },
            monero: { eur: 107.64857505 },
            solana: { eur: 22.73166438 },
        };

        // Mock a successful API request
        mock.onGet().reply(200, mockResult);

        // Expected value will include ticker information
        const expectedCoingeckoPrices = [
            {
                fiat: 'eur',
                price: 0.00003113,
                ticker: 'XEC',
            },
            {
                fiat: 'eur',
                price: 107.64857505,
                ticker: 'XMR',
            },
            {
                fiat: 'eur',
                price: 22.73166438,
                ticker: 'SOL',
            },
        ];
        assert.deepEqual(await getCoingeckoPrices(apiConfig), {
            coingeckoResponse: mockResult,
            coingeckoPrices: expectedCoingeckoPrices,
        });
    });
    it('getCoingeckoPrices returns false if API returns error response', async function () {
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });

        const mockResult = {};

        // Mock an API error
        mock.onGet().reply(500, mockResult);

        assert.deepEqual(await getCoingeckoPrices(config.priceApi), false);
    });
    it('getCoingeckoPrices returns false if API returns object of unexpected shape', async function () {
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });

        const mockResult = {
            bitcoin: { usd: 28044.64857505 },
            ecash: { usd: 0.00003113 },
            monero: { usd: 153.21055216 },
        };

        // Mock a successful API request that returns data of unexpected shape
        mock.onGet().reply(200, mockResult);

        assert.deepEqual(await getCoingeckoPrices(config.priceApi), false);
    });
    it('getCoingeckoPrices returns false if API response is not of type object', async function () {
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });

        const mockResult = 'a string for some reason';

        // Mock a successful API request that returns data of unexpected shape
        mock.onGet().reply(200, mockResult);

        assert.deepEqual(await getCoingeckoPrices(config.priceApi), false);
    });
    it('formatPrice correctly formats a USD price greater than $10 and less than $100', async function () {
        assert.strictEqual(formatPrice(10.55303, 'usd'), `$10.55`);
    });
    it('formatPrice correctly formats a USD price greater than $1', async function () {
        assert.strictEqual(formatPrice(1.52303, 'usd'), `$1.52`);
    });
    it('formatPrice correctly formats a USD price less than $1', async function () {
        assert.strictEqual(formatPrice(0.000035123, 'usd'), `$0.00003512`);
    });
    it('formatPrice correctly formats a EUR price less than €1', async function () {
        assert.strictEqual(formatPrice(0.000035123, 'eur'), `€0.00003512`);
    });
    it('formatPrice correctly formats a GBP price greater than 100', async function () {
        assert.strictEqual(formatPrice(1523.134239, 'gbp'), `£1,523`);
    });
    it('formatPrice correctly formats a JPY price greater than ¥100', async function () {
        assert.strictEqual(formatPrice(100000.999923422, 'jpy'), `¥100,001`);
    });
    it('formatPrice omits a currency symbol if it cannot find it', async function () {
        assert.strictEqual(formatPrice(100000.999923422, 'cad'), `100,001`);
    });
    it('formatXecAmount returns a string with 2 decimal places if XEC amount < 10', async function () {
        assert.strictEqual(formatXecAmount(9.99), `9.99 XEC`);
    });
    it('formatXecAmount returns a string with no decimal places if XEC amount < 10 and round number', async function () {
        assert.strictEqual(formatXecAmount(9), `9 XEC`);
    });
    it('formatXecAmount returns a string with no decimal places if 10 <= XEC amount < 100', async function () {
        assert.strictEqual(formatXecAmount(12.51), `13 XEC`);
    });
    it('formatXecAmount returns a string with no decimal places if 100 < XEC amount <  1000', async function () {
        assert.strictEqual(formatXecAmount(125), `125 XEC`);
    });
    it('formatXecAmount returns a thousands string with no decimal places if 1000 < XEC amount < 1 million', async function () {
        assert.strictEqual(formatXecAmount(1000), `1k XEC`);
    });
    it('formatXecAmount returns a rounded thousands string with no decimal places if 1000 < XEC amount < 1 million', async function () {
        assert.strictEqual(formatXecAmount(555555.55), `556k XEC`);
    });
    it('formatXecAmount returns a string with no decimal places if XEC amount is 1 trillion', async function () {
        assert.strictEqual(formatXecAmount(1000000000000), `1T XEC`);
    });
    it('formatXecAmount returns a rounded thousands string with no decimal places if 1000 < XEC amount < 1 million', async function () {
        assert.strictEqual(formatXecAmount(555555.55), `556k XEC`);
    });
    it('formatXecAmount returns a rounded millions string with no decimal places if 1M < XEC amount < 1B', async function () {
        assert.strictEqual(formatXecAmount(555555555.55), `556M XEC`);
    });
    it('formatXecAmount returns a rounded billions string with no decimal places if 1B < XEC amount < 1T', async function () {
        assert.strictEqual(formatXecAmount(555555555555.55), `556B XEC`);
    });
    it('formatXecAmount returns a rounded trillions string with no decimal places if XEC amount > 1T', async function () {
        assert.strictEqual(formatXecAmount(55555555555555.55), `56T XEC`);
    });
    it('formatXecAmount returns a rounded trillions string with no decimal places if XEC amount > 1T', async function () {
        assert.strictEqual(formatXecAmount(19999999999999.99), `20T XEC`);
    });
    it('formatXecAmount returns a trillions string with no decimal places for max possible XEC amount', async function () {
        assert.strictEqual(formatXecAmount(21000000000000), `21T XEC`);
    });
    it('satsToFormattedValue returns a formatted XEC amount if total fiat value is less than $1', async function () {
        assert.strictEqual(
            satsToFormattedValue(100, mockCoingeckoPrices),
            `1 XEC`,
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount if total fiat value is less than $10', async function () {
        assert.strictEqual(
            satsToFormattedValue(10000000, mockCoingeckoPrices),
            '$3',
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount if $100 < total fiat value < $1k', async function () {
        assert.strictEqual(
            satsToFormattedValue(1234567890, mockCoingeckoPrices),
            '$370',
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount if $1k < total fiat value < $1M', async function () {
        assert.strictEqual(
            satsToFormattedValue(55555555555, mockCoingeckoPrices),
            '$17k',
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount of $1M if $1M < total fiat value < $1B', async function () {
        assert.strictEqual(
            satsToFormattedValue(3367973856209, mockCoingeckoPrices),
            '$1M',
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount if $1M < total fiat value < $1B', async function () {
        assert.strictEqual(
            satsToFormattedValue(55555555555555, mockCoingeckoPrices),
            '$17M',
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount if  total fiat value > $1B', async function () {
        assert.strictEqual(
            satsToFormattedValue(21000000000000000, mockCoingeckoPrices),
            '$6B',
        );
    });
    it('satsToFormattedValue returns a formatted fiat amount if £1M < total fiat value < £1B', async function () {
        const gbpPrices = [
            {
                fiat: 'gbp',
                price: 0.00003,
                ticker: 'XEC',
            },
        ];
        assert.strictEqual(
            satsToFormattedValue(55555555555555, gbpPrices),
            '£17M',
        );
    });
    it('satsToFormattedValue returns a formatted XEC amount if coingeckoPrices is false', async function () {
        assert.strictEqual(
            satsToFormattedValue(55555555555555, false),
            '556B XEC',
        );
    });
    it('jsonReplacer and jsonReviver can encode and decode a Map to and from JSON', async function () {
        const map = new Map([
            [1, 'one'],
            [2, 'two'],
            [3, 'three'],
        ]);

        const jsonText = JSON.stringify(map, jsonReplacer);
        const roundTrip = JSON.parse(jsonText, jsonReviver);

        assert.deepEqual(map, roundTrip);
    });
    it('jsonReplacer and jsonReviver can encode and decode Map containing a BigNumber', async function () {
        const bigNumberMap = new Map([
            [
                '76a9144c1efd024f560e4e1aaf4b62416cd1e82fbed24f88ac',
                new BigNumber(36),
            ],
            [
                '76a9144c1efd024f560e4e1aaf4b62416cd1e82fbed24f88ac',
                new BigNumber(72),
            ],
        ]);

        const jsonText = JSON.stringify(bigNumberMap, jsonReplacer);
        const roundTrip = JSON.parse(jsonText, jsonReviver);

        assert.deepEqual(bigNumberMap, roundTrip);
    });
    it('jsonReplacer and jsonReviver can encode and decode a Set to and from JSON', async function () {
        const set = new Set(['one', 'two', 'three']);

        const jsonText = JSON.stringify(set, jsonReplacer);
        const roundTrip = JSON.parse(jsonText, jsonReviver);

        assert.deepEqual(set, roundTrip);
    });
    it('jsonReplacer and jsonReviver can encode and decode an object including a Set and a Map to and from JSON', async function () {
        const map = new Map([
            [1, 'one'],
            [2, 'two'],
            [3, 'three'],
        ]);
        const set = new Set(['one', 'two', 'three']);

        const jsonText = JSON.stringify({ map, set }, jsonReplacer);
        const roundTrip = JSON.parse(jsonText, jsonReviver);

        assert.deepEqual({ map, set }, roundTrip);
    });
    it('mapToKeyValueArray converts a map to a key value array and back to the same map', async function () {
        const map = new Map([
            [1, 'one'],
            [2, 'two'],
            [3, 'three'],
        ]);

        const kvArray = mapToKeyValueArray(map);

        const roundTrip = new Map(kvArray);

        assert.deepEqual(map, roundTrip);
    });
});

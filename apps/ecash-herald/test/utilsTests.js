// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const config = require('../config');
const {
    returnAddressPreview,
    getCoingeckoPrices,
    formatPrice,
} = require('../src/utils');
const { addressPreviews } = require('./mocks/templates');

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
        assert.deepEqual(
            await getCoingeckoPrices(config.priceApi),
            expectedCoingeckoPrices,
        );
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
        assert.deepEqual(
            await getCoingeckoPrices(apiConfig),
            expectedCoingeckoPrices,
        );
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
});

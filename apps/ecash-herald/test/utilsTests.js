'use strict';
const assert = require('assert');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const config = require('../config');
const { returnAddressPreview, getCoingeckoPrices } = require('../src/utils');
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

        assert.deepEqual(await getCoingeckoPrices(config.priceApi), mockResult);
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
});

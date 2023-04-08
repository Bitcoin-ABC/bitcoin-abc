// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const mockSecrets = require('../secrets.sample');
const { handleAppStartup } = require('../src/events');
const { MockChronikClient } = require('./mocks/chronikMock');
const MockAdapter = require('axios-mock-adapter');
const axios = require('axios');

describe('alias-server events.js', async function () {
    it('handleAppStartup calls handleBlockConnected with tipHeight and completes function if block is avalanche finalized', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const mockBlockchaininfoResponse = {
            tipHash:
                '00000000000000000ce690f27bc92c46863337cc9bd5b7c20aec094854db26e3',
            tipHeight: 786878,
        };

        // Tell mockedChronik what response we expect
        mockedChronik.setMock('blockchainInfo', {
            input: null,
            output: mockBlockchaininfoResponse,
        });

        // Mock avalanche RPC call
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });
        // Mock response for rpc return of true for isfinalblock method
        mock.onPost().reply(200, {
            result: true,
            error: null,
            id: 'isfinalblock',
        });

        const db = null;
        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;

        const result = await handleAppStartup(
            mockedChronik,
            db,
            telegramBot,
            channelId,
            avalancheRpc,
        );

        assert.deepEqual(
            result,
            `Alias registrations updated to block ${mockBlockchaininfoResponse.tipHash} at height ${mockBlockchaininfoResponse.tipHeight}`,
        );
    });
    it('handleAppStartup calls handleBlockConnected with tipHeight and returns false if block is not avalanche finalized', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const mockBlockchaininfoResponse = {
            tipHash:
                '00000000000000000ce690f27bc92c46863337cc9bd5b7c20aec094854db26e3',
            tipHeight: 786878,
        };

        // Tell mockedChronik what response we expect
        mockedChronik.setMock('blockchainInfo', {
            input: null,
            output: mockBlockchaininfoResponse,
        });

        // Mock avalanche RPC call
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });
        // Mock response for rpc return of true for isfinalblock method
        mock.onPost().reply(200, {
            result: false,
            error: null,
            id: 'isfinalblock',
        });

        const db = null;
        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;

        const result = await handleAppStartup(
            mockedChronik,
            db,
            telegramBot,
            channelId,
            avalancheRpc,
        );

        assert.deepEqual(result, false);
    });
    it('handleAppStartup returns false on chronik error', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        // Response of bad format
        const mockBlockchaininfoResponse = {
            tipHashNotHere:
                '00000000000000000ce690f27bc92c46863337cc9bd5b7c20aec094854db26e3',
            tipHeightNotHere: 786878,
        };

        // Tell mockedChronik what response we expect
        mockedChronik.setMock('blockchainInfo', {
            input: null,
            output: mockBlockchaininfoResponse,
        });

        // Function will not get to RPC call, no need for axios mock

        const db = null;
        const telegramBot = null;
        const channelId = null;
        const { avalancheRpc } = mockSecrets;

        const result = await handleAppStartup(
            mockedChronik,
            db,
            telegramBot,
            channelId,
            avalancheRpc,
        );

        assert.deepEqual(result, false);
    });
});

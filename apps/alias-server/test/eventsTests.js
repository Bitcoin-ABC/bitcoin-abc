// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const { handleAppStartup } = require('../src/events');
const { MockChronikClient } = require('./mocks/chronikMock');

describe('alias-server events.js', async function () {
    it('handleAppStartup calls handleBlockConnected with tipHeight', async function () {
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

        const db = null;
        const telegramBot = null;
        const channelId = null;

        const result = await handleAppStartup(
            mockedChronik,
            db,
            telegramBot,
            channelId,
        );

        assert.deepEqual(
            result,
            `Alias registrations updated to block ${mockBlockchaininfoResponse.tipHash} at height ${mockBlockchaininfoResponse.tipHeight}`,
        );
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

        const db = null;
        const telegramBot = null;
        const channelId = null;

        const result = await handleAppStartup(
            mockedChronik,
            db,
            telegramBot,
            channelId,
        );

        assert.deepEqual(result, false);
    });
});

// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const { main } = require('../src/main');
const { MockChronikClient } = require('../../../modules/mock-chronik-client');
const { MockTelegramBot, mockChannelId } = require('./mocks/telegramBotMock');

describe('ecash-herald main.js', async function () {
    it('main() starts the app on successful websocket connection', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        const telegramBot = MockTelegramBot;
        const channelId = mockChannelId;

        await main(mockedChronik, telegramBot, channelId);

        // Confirm websocket opened
        assert.strictEqual(mockedChronik.wsWaitForOpenCalled, true);
    });
});

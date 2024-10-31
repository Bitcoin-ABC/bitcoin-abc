// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import assert from 'assert';
import { main } from '../src/main';
import { MockChronikClient } from '../../../modules/mock-chronik-client';
import { MockTelegramBot, mockChannelId } from './mocks/telegramBotMock';

describe('ecash-herald main.js', async function () {
    it('main() starts the app on successful websocket connection', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        const channelId = mockChannelId;

        await main(mockedChronik, new MockTelegramBot(), channelId);

        // Confirm websocket opened
        assert.strictEqual(mockedChronik.wsWaitForOpenCalled, true);
    });
});

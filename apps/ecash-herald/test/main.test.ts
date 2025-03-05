// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import assert from 'assert';
import { main } from '../src/main';
import {
    MockChronikClient,
    MockWsEndpoint,
} from '../../../modules/mock-chronik-client';
import { MockTelegramBot, mockChannelId } from './mocks/telegramBotMock';
import { ChronikClient } from 'chronik-client';

describe('ecash-herald main.js', function () {
    it('main() starts the app on successful websocket connection', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        const channelId = mockChannelId;

        const ws = await main(
            mockedChronik as unknown as ChronikClient,
            new MockTelegramBot(),
            channelId,
        );

        // Confirm websocket opened
        assert.strictEqual((ws as MockWsEndpoint).waitForOpenCalled, true);
    });
});

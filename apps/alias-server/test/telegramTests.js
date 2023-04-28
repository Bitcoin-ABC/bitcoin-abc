// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const { MockTelegramBot, mockChannelId } = require('./mocks/telegramBotMock');
const { returnTelegramBotSendMessagePromise } = require('../src/telegram');

describe('alias-server telegram.js', async function () {
    const testTgMsgOptions = {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    };
    let testTelegramBot;
    beforeEach(async () => {
        // Initialize db before each unit test
        testTelegramBot = new MockTelegramBot();
    });
    it('returnTelegramBotSendMessagePromise constructs promises to send a telegram message', async function () {
        // Create array of promises
        const tgMsgPromises = [];
        const testMsgOne = 'Test Message One';
        const testMsgTwo = 'Test Message Two';
        tgMsgPromises.push(
            returnTelegramBotSendMessagePromise(
                testTelegramBot,
                mockChannelId,
                testMsgOne,
                testTgMsgOptions,
            ),
        );
        tgMsgPromises.push(
            returnTelegramBotSendMessagePromise(
                testTelegramBot,
                mockChannelId,
                testMsgTwo,
                testTgMsgOptions,
            ),
        );
        const testMsgSentResult = await Promise.all(tgMsgPromises);
        assert.deepEqual(testMsgSentResult, [
            {
                channelId: mockChannelId,
                msg: testMsgOne,
                options: testTgMsgOptions,
                success: true,
            },
            {
                channelId: mockChannelId,
                msg: testMsgTwo,
                options: testTgMsgOptions,
                success: true,
            },
        ]);
    });
});

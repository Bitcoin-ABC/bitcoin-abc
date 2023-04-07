// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const config = require('../config');
const blocks = require('./mocks/blocks');

const { handleBlockConnected } = require('../src/events');
const { MockChronikClient } = require('./mocks/chronikMock');
const { MockTelegramBot, mockChannelId } = require('./mocks/telegramBotMock');

describe('ecash-herald events.js', async function () {
    it('handleBlockConnected creates and sends a telegram msg for all mocked blocks', async function () {
        const wsTestAddress =
            'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient(wsTestAddress, []);

        const blockNames = Object.keys(blocks);
        for (let i = 0; i < blockNames.length; i += 1) {
            const thisBlock = blocks[blockNames[i]];
            const thisBlockHash = thisBlock.chronikData.blockInfo.hash;
            const thisBlockChronikBlockResponse = thisBlock.chronikData;

            // Tell mockedChronik what response we expect
            mockedChronik.setBlock(
                thisBlockHash,
                thisBlockChronikBlockResponse,
            );
            const thisBlockExpectedMsg = thisBlock.tgHtml;

            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;

            const result = await handleBlockConnected(
                mockedChronik,
                telegramBot,
                channelId,
                thisBlockHash,
            );

            // Check that sendMessage was called successfully
            assert.strictEqual(telegramBot.messageSent, true);

            // Check that the correct msg info was sent
            assert.deepEqual(result, {
                success: true,
                channelId,
                msg: thisBlockExpectedMsg,
                options: config.tgMsgOptions,
            });
        }
    });
    it('handleBlockConnected sends desired backup msg if it encounters an error in message creation', async function () {
        const wsTestAddress =
            'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient(wsTestAddress, []);

        const blockNames = Object.keys(blocks);
        for (let i = 0; i < blockNames.length; i += 1) {
            const thisBlock = blocks[blockNames[i]];
            const thisBlockHash = thisBlock.chronikData.blockInfo.hash;

            // Tell mockedChronik to give a bad response for blockdetails
            mockedChronik.setBlock(thisBlockHash, null);

            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;

            const result = await handleBlockConnected(
                mockedChronik,
                telegramBot,
                channelId,
                thisBlockHash,
            );

            // Check that sendMessage was called successfully
            assert.strictEqual(telegramBot.messageSent, true);

            // Expect the backup msg
            const expectedMsg = `New Block Found\n\n${thisBlockHash}\n\n[explorer](https://explorer.e.cash/block/${thisBlockHash})`;

            // Check that the correct msg info was sent
            assert.deepEqual(result, {
                success: true,
                channelId,
                msg: expectedMsg,
                options: config.tgMsgOptions,
            });
        }
    });
    it('handleBlockConnected returns false if it encounters an error in telegram bot sendMessage routine', async function () {
        const wsTestAddress =
            'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient(wsTestAddress, []);

        const blockNames = Object.keys(blocks);
        for (let i = 0; i < blockNames.length; i += 1) {
            const thisBlock = blocks[blockNames[i]];
            const thisBlockHash = thisBlock.chronikData.blockInfo.hash;

            // Tell mockedChronik to give a bad response for blockdetails
            mockedChronik.setBlock(thisBlockHash, null);

            const telegramBot = new MockTelegramBot();
            telegramBot.setExpectedError(
                'sendMessage',
                'Error: message failed to send',
            );
            const channelId = mockChannelId;

            const result = await handleBlockConnected(
                mockedChronik,
                telegramBot,
                channelId,
                thisBlockHash,
            );

            // Check that sendMessage was not called successfully
            assert.strictEqual(telegramBot.messageSent, false);

            // Check that the correct msg info was sent
            assert.deepEqual(result, false);
        }
    });
});

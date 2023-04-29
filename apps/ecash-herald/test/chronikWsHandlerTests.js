// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const config = require('../config');
const cashaddr = require('ecashaddrjs');
const blocks = require('./mocks/blocks');
const {
    initializeWebsocket,
    parseWebsocketMessage,
} = require('../src/chronikWsHandler');
const { MockChronikClient } = require('./mocks/chronikMock');
const { MockTelegramBot, mockChannelId } = require('./mocks/telegramBotMock');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

describe('ecash-herald chronikWsHandler.js', async function () {
    it('initializeWebsocket returns expected websocket object for a p2pkh address', async function () {
        const wsTestAddress =
            'ecash:qp3c268rd5946l2f5m5es4x25f7ewu4sjvpy52pqa8';
        const { type, hash } = cashaddr.decode(wsTestAddress, true);
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        const result = await initializeWebsocket(
            mockedChronik,
            wsTestAddress,
            telegramBot,
            channelId,
        );

        // Confirm websocket opened
        assert.strictEqual(mockedChronik.wsWaitForOpenCalled, true);
        // Confirm subscribe was called on expected type and hash
        assert.deepEqual(mockedChronik.wsSubscribeCalled, true);
        assert.deepEqual(result._subs, [
            { scriptType: type, scriptPayload: hash },
        ]);
    });
    it('initializeWebsocket returns expected websocket object for a p2sh address', async function () {
        const wsTestAddress =
            'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';
        const { type, hash } = cashaddr.decode(wsTestAddress, true);
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        const result = await initializeWebsocket(
            mockedChronik,
            wsTestAddress,
            telegramBot,
            channelId,
        );

        // Confirm websocket opened
        assert.strictEqual(mockedChronik.wsWaitForOpenCalled, true);
        // Confirm subscribe was called on expected type and hash
        assert.deepEqual(mockedChronik.wsSubscribeCalled, true);
        assert.deepEqual(result._subs, [
            { scriptType: type, scriptPayload: hash },
        ]);
    });
    it('parseWebsocketMessage returns false for a msg other than BlockConnected', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const thisBlock = blocks[0];
        const thisBlockHash = thisBlock.blockDetails.blockInfo.hash;
        const thisBlockChronikBlockResponse = thisBlock.blockDetails;

        // Tell mockedChronik what response we expect for chronik.block(thisBlockHash)
        mockedChronik.setMock('block', {
            input: thisBlockHash,
            output: thisBlockChronikBlockResponse,
        });

        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        const unsupportedWebsocketMsgs = [
            {
                type: 'AddedToMempool',
            },
            {
                type: 'Confirmed',
            },
            {
                type: 'SomeUnknownType',
            },
        ];

        for (let i = 0; i < unsupportedWebsocketMsgs.length; i += 1) {
            const thisUnsupportedMsg = unsupportedWebsocketMsgs[i];
            const result = await parseWebsocketMessage(
                mockedChronik,
                thisUnsupportedMsg,
                telegramBot,
                channelId,
            );

            // Check that sendMessage was not called
            assert.strictEqual(telegramBot.messageSent, false);

            assert.deepEqual(result, false);
        }
    });
    it('parseWebsocketMessage creates and sends a telegram msg with prices for all mocked blocks on successful price API call', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        for (let i = 0; i < blocks.length; i += 1) {
            const thisBlock = blocks[i];
            const thisBlockHash = thisBlock.blockDetails.blockInfo.hash;
            const thisBlockChronikBlockResponse = thisBlock.blockDetails;

            // Tell mockedChronik what response we expect for chronik.block(thisBlockHash)
            mockedChronik.setMock('block', {
                input: thisBlockHash,
                output: thisBlockChronikBlockResponse,
            });
            const thisBlockExpectedMsgs = thisBlock.blockSummaryTgMsgs;

            // Mock a chronik websocket msg of correct format
            const mockWsMsg = {
                type: 'BlockConnected',
                blockHash: thisBlockHash,
            };
            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;

            // Mock coingecko price response
            // onNoMatch: 'throwException' helps to debug if mock is not being used
            const mock = new MockAdapter(axios, {
                onNoMatch: 'throwException',
            });

            const mockResult = thisBlock.coingeckoResponse;

            // Mock a successful API request
            mock.onGet().reply(200, mockResult);

            const result = await parseWebsocketMessage(
                mockedChronik,
                mockWsMsg,
                telegramBot,
                channelId,
            );

            // Build expected array of successful msg returns
            let msgSuccessArray = [];
            for (let i = 0; i < thisBlockExpectedMsgs.length; i += 1) {
                msgSuccessArray.push({
                    success: true,
                    channelId,
                    msg: thisBlockExpectedMsgs[i],
                    options: config.tgMsgOptions,
                });
            }

            // Check that the correct msg info was sent
            assert.deepEqual(result, msgSuccessArray);
        }
    });
    it('parseWebsocketMessage creates and sends a telegram msg without prices for all mocked blocks on failed price API call', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        for (let i = 0; i < blocks.length; i += 1) {
            const thisBlock = blocks[i];
            const thisBlockHash = thisBlock.blockDetails.blockInfo.hash;
            const thisBlockChronikBlockResponse = thisBlock.blockDetails;

            // Tell mockedChronik what response we expect for chronik.block(thisBlockHash)
            mockedChronik.setMock('block', {
                input: thisBlockHash,
                output: thisBlockChronikBlockResponse,
            });
            const thisBlockExpectedMsgs =
                thisBlock.blockSummaryTgMsgsPriceFailure;

            // Mock a chronik websocket msg of correct format
            const mockWsMsg = {
                type: 'BlockConnected',
                blockHash: thisBlockHash,
            };
            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;

            // Mock coingecko price response
            // onNoMatch: 'throwException' helps to debug if mock is not being used
            const mock = new MockAdapter(axios, {
                onNoMatch: 'throwException',
            });

            // Mock a failed API request
            mock.onGet().reply(500, { error: 'error' });

            const result = await parseWebsocketMessage(
                mockedChronik,
                mockWsMsg,
                telegramBot,
                channelId,
            );

            // Build expected array of successful msg returns
            let msgSuccessArray = [];
            for (let i = 0; i < thisBlockExpectedMsgs.length; i += 1) {
                msgSuccessArray.push({
                    success: true,
                    channelId,
                    msg: thisBlockExpectedMsgs[i],
                    options: config.tgMsgOptions,
                });
            }

            // Check that sendMessage was called successfully
            assert.strictEqual(telegramBot.messageSent, true);

            // Check that the correct msg info was sent
            assert.deepEqual(result, msgSuccessArray);
        }
    });
    it('parseWebsocketMessage returns false if telegram msg fails to send', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        for (let i = 0; i < blocks.length; i += 1) {
            const thisBlock = blocks[i];
            const thisBlockHash = thisBlock.blockDetails.blockInfo.hash;
            const thisBlockChronikBlockResponse = thisBlock.blockDetails;

            // Tell mockedChronik what response we expect for chronik.block(thisBlockHash)
            mockedChronik.setMock('block', {
                input: thisBlockHash,
                output: thisBlockChronikBlockResponse,
            });

            // Mock a chronik websocket msg of correct format
            const mockWsMsg = {
                type: 'BlockConnected',
                blockHash: thisBlockHash,
            };
            const telegramBot = new MockTelegramBot();
            telegramBot.setExpectedError(
                'sendMessage',
                'Error: message failed to send',
            );
            const channelId = mockChannelId;

            const result = await parseWebsocketMessage(
                mockedChronik,
                mockWsMsg,
                telegramBot,
                channelId,
            );

            // Check that the function returns false
            assert.strictEqual(result, false);
        }
    });
});

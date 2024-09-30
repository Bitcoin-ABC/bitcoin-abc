// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const config = require('../config');
const unrevivedBlock = require('./mocks/block');
const { jsonReviver, getCoingeckoApiUrl } = require('../src/utils');
const block = JSON.parse(JSON.stringify(unrevivedBlock), jsonReviver);
const blockInvalidated = require('./mocks/blockInvalidated');
const cashaddr = require('ecashaddrjs');
const {
    handleBlockConnected,
    handleBlockFinalized,
    handleBlockInvalidated,
} = require('../src/events');
const { MockChronikClient } = require('../../../modules/mock-chronik-client');
const { MockTelegramBot, mockChannelId } = require('./mocks/telegramBotMock');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const { caching } = require('cache-manager');
const FakeTimers = require('@sinonjs/fake-timers');

describe('ecash-herald events.js', async function () {
    let memoryCache;
    before(async () => {
        const CACHE_TTL = 2 * config.waitForFinalizationMsecs;
        memoryCache = await caching('memory', {
            max: 100,
            ttl: CACHE_TTL,
        });
    });

    let clock;
    beforeEach(() => {
        clock = FakeTimers.install();
    });
    afterEach(() => {
        // Restore timers
        clock.uninstall();
    });
    it('handleBlockConnected creates and sends a tg msg that the block was not avalanche finalized if the block was not finalized within expected timeframe', async function () {
        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        handleBlockConnected(
            telegramBot,
            channelId,
            '000000000000000000000000000000000000000000000000000000000000000000000000',
            800000,
            memoryCache,
        );
        // The message is not sent
        assert.strictEqual(telegramBot.messageSent, false);

        // Advance timer
        await clock.tickAsync(config.waitForFinalizationMsecs + 1);

        // A message was sent
        assert.strictEqual(telegramBot.messageSent, true);
    });
    it('handleBlockConnected does not send an "avalanche not finalized" msg if the block is avalanche finalized within the expected timeframe', async function () {
        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        const MOCK_INCOMING_BLOCKHEIGHT = 800000;
        const MOCK_INCOMING_BLOCKHASH =
            '000000000000000000000000000000000000000000000000000000000000000000000000';

        handleBlockConnected(
            telegramBot,
            channelId,
            MOCK_INCOMING_BLOCKHASH,
            MOCK_INCOMING_BLOCKHEIGHT,
            memoryCache,
        );
        // The message is not sent
        assert.strictEqual(telegramBot.messageSent, false);

        // Set the block status in cache to finalized
        await memoryCache.set(
            `${MOCK_INCOMING_BLOCKHEIGHT}${MOCK_INCOMING_BLOCKHASH}`,
            'BLK_FINALIZED',
        );

        // Advance timer
        await clock.tickAsync(config.waitForFinalizationMsecs + 1);

        // No message sent
        assert.strictEqual(telegramBot.messageSent, false);
    });
    it('handleBlockFinalized creates and sends a telegram msg with price and token send info for mocked block if api call succeeds', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const thisBlock = block;

        // Tell mockedChronik what response we expect for chronik.block(thisBlockHash)
        mockedChronik.setTxHistoryByBlock(
            thisBlock.parsedBlock.height,
            thisBlock.blockTxs,
        );

        // Tell mockedChronik what response we expect for chronik.script(type, hash).utxos
        const { outputScriptInfoMap } = thisBlock;
        outputScriptInfoMap.forEach((info, outputScript) => {
            let { type, hash } =
                cashaddr.getTypeAndHashFromOutputScript(outputScript);
            type = type.toLowerCase();
            const { utxos } = info;
            mockedChronik.setScript(type, hash);
            mockedChronik.setUtxos(type, hash, { outputScript, utxos });
        });

        // Tell mockedChronik what response we expect for chronik.tx
        const { parsedBlock, tokenInfoMap } = thisBlock;
        const { tokenIds } = parsedBlock;
        // Will only have chronik call if the set is not empty
        if (tokenIds.size > 0) {
            // Instead of saving all the chronik responses as mocks, which would be very large
            // Just set them as mocks based on tokenInfoMap, which contains the info we need
            tokenIds.forEach(tokenId => {
                mockedChronik.setMock('token', {
                    input: tokenId,
                    output: {
                        genesisInfo: tokenInfoMap.get(tokenId),
                    },
                });
            });
        }

        const thisBlockExpectedMsgs = thisBlock.blockSummaryTgMsgs;

        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        // Mock coingecko price response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        const mockResult = thisBlock.coingeckoResponse;

        // Mock a successful API request
        mock.onGet(getCoingeckoApiUrl(config)).reply(200, mockResult);

        const result = await handleBlockFinalized(
            mockedChronik,
            telegramBot,
            channelId,
            thisBlock.parsedBlock.hash,
            thisBlock.parsedBlock.height,
            memoryCache,
        );

        // Check that sendMessage was called successfully
        assert.strictEqual(telegramBot.messageSent, true);

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
    });
    it('handleBlockFinalized creates and sends a telegram msg without price or token info for mocked block if api calls fail', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const thisBlock = block;

        // Tell mockedChronik what response we expect for chronik.block(thisBlockHash)
        mockedChronik.setTxHistoryByBlock(
            thisBlock.parsedBlock.height,
            thisBlock.blockTxs,
        );

        // Tell mockedChronik what response we expect for chronik.tx
        const { parsedBlock, tokenInfoMap } = thisBlock;
        const { tokenIds } = parsedBlock;
        // Will only have chronik call if the set is not empty
        if (tokenIds.size > 0) {
            // Instead of saving all the chronik responses as mocks, which would be very large
            // Just set them as mocks based on tokenInfoMap, which contains the info we need
            let index = 0;
            tokenIds.forEach(tokenId => {
                // If this is the first one, set an error response
                if (index === 0) {
                    mockedChronik.setMock('token', {
                        input: tokenId,
                        output: new Error('some error'),
                    });
                } else {
                    index += 1;
                    mockedChronik.setMock('token', {
                        input: tokenId,
                        output: {
                            genesisInfo: tokenInfoMap.get(tokenId),
                        },
                    });
                }
            });
        }
        const thisBlockExpectedMsgs = thisBlock.blockSummaryTgMsgsApiFailure;

        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        // Mock coingecko price response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        // Mock a failed API request
        mock.onGet(getCoingeckoApiUrl(config)).reply(500, { error: 'error' });

        const result = await handleBlockFinalized(
            mockedChronik,
            telegramBot,
            channelId,
            thisBlock.parsedBlock.hash,
            thisBlock.parsedBlock.height,
            memoryCache,
        );

        // Check that sendMessage was called successfully
        assert.strictEqual(telegramBot.messageSent, true);

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
    });
    it('handleBlockFinalized sends desired backup msg if it encounters an error in message creation', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const thisBlock = block;

        // Tell mockedChronik what response we expect for chronik.block(thisBlockHash)
        mockedChronik.setTxHistoryByBlock(
            thisBlock.parsedBlock.height,
            new Error('error getting block'),
        );

        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        const result = await handleBlockFinalized(
            mockedChronik,
            telegramBot,
            channelId,
            thisBlock.parsedBlock.hash,
            thisBlock.parsedBlock.height,
            memoryCache,
        );

        // Check that sendMessage was called successfully
        assert.strictEqual(telegramBot.messageSent, true);

        // Expect the backup msg
        const expectedMsg = `New Block Found\n\n${thisBlock.parsedBlock.height.toLocaleString(
            'en-US',
        )}\n\n${
            thisBlock.parsedBlock.hash
        }\n\n<a href="https://explorer.e.cash/block/${
            thisBlock.parsedBlock.hash
        }">explorer</a>`;

        // Check that the correct msg info was sent
        assert.deepEqual(result, {
            success: true,
            channelId,
            msg: expectedMsg,
            options: config.tgMsgOptions,
        });
    });
    it('handleBlockFinalized returns false if it encounters an error in telegram bot sendMessage routine', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const thisBlock = block;

        // Tell mockedChronik what response we expect for chronik.block(thisBlockHash)
        mockedChronik.setTxHistoryByBlock(
            thisBlock.parsedBlock.height,
            thisBlock.blockTxs,
        );

        // Tell mockedChronik what response we expect for chronik.token
        const { parsedBlock, tokenInfoMap } = thisBlock;
        const { tokenIds } = parsedBlock;
        // Will only have chronik call if the set is not empty
        if (tokenIds.size > 0) {
            // Instead of saving all the chronik responses as mocks, which would be very large
            // Just set them as mocks based on tokenInfoMap, which contains the info we need
            let index = 0;
            tokenIds.forEach(tokenId => {
                // If this is the first one, set an error response
                if (index === 0) {
                    mockedChronik.setMock('token', {
                        input: tokenId,
                        output: new Error('some error'),
                    });
                } else {
                    index += 1;
                    mockedChronik.setMock('token', {
                        input: tokenId,
                        output: {
                            genesisInfo: tokenInfoMap.get(tokenId),
                        },
                    });
                }
            });
        }

        const telegramBot = new MockTelegramBot();
        telegramBot.setExpectedError(
            'sendMessage',
            'Error: message failed to send',
        );
        const channelId = mockChannelId;

        const result = await handleBlockFinalized(
            mockedChronik,
            telegramBot,
            channelId,
            thisBlock.parsedBlock.hash,
            thisBlock.parsedBlock.height,
            memoryCache,
        );

        // Check that the correct msg info was sent
        assert.deepEqual(result, false);
    });
    it('handleBlockInvalidated creates and sends a telegram msg upon invalidated blocks', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const thisBlock = block;

        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        const result = await handleBlockInvalidated(
            mockedChronik,
            telegramBot,
            channelId,
            thisBlock.blockTxs[0].block.hash,
            thisBlock.blockTxs[0].block.height,
            thisBlock.blockTxs[0].block.timestamp,
            {
                scriptsig: thisBlock.blockTxs[0].inputs[0].inputScript,
                outputs: thisBlock.blockTxs[0].outputs,
            },
            memoryCache,
        );

        // Check that sendMessage was called successfully
        assert.strictEqual(telegramBot.messageSent, true);

        let msgSuccess = {
            success: true,
            channelId,
            msg: blockInvalidated.tgMsg,
            options: config.tgMsgOptions,
        };

        // Check that the correct msg info was sent
        assert.deepEqual(result, msgSuccess);
    });
});

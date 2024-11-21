// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import assert from 'assert';
import config from '../config';
import secrets from '../secrets';
import cashaddr from 'ecashaddrjs';
import unrevivedBlock from './mocks/block';
import { jsonReviver, getCoingeckoApiUrl } from '../src/utils';
import { blockInvalidedTgMsg } from './mocks/blockInvalidated';
import {
    initializeWebsocket,
    parseWebsocketMessage,
} from '../src/chronikWsHandler';
import { MockChronikClient } from '../../../modules/mock-chronik-client';
import { MockTelegramBot, mockChannelId } from './mocks/telegramBotMock';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { caching, MemoryCache } from 'cache-manager';
import { WsMsgClient } from 'chronik-client';
import { StoredMock } from '../src/events';
const block: StoredMock = JSON.parse(
    JSON.stringify(unrevivedBlock),
    jsonReviver,
);

describe('ecash-herald chronikWsHandler.js', async function () {
    let memoryCache: MemoryCache;
    before(async () => {
        const CACHE_TTL = config.cacheTtlMsecs;
        memoryCache = await caching('memory', {
            max: 100,
            ttl: CACHE_TTL,
        });
    });
    it('initializeWebsocket returns expected websocket object for a p2pkh address', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        const result = await initializeWebsocket(
            mockedChronik,
            telegramBot,
            channelId,
            memoryCache,
        );

        // Confirm websocket opened
        assert.strictEqual(mockedChronik.wsWaitForOpenCalled, true);
        // Confirm subscribed to blocks
        assert.deepEqual(result.subs.blocks, true);
    });
    it('initializeWebsocket returns expected websocket object for a p2sh address', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();
        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        const result = await initializeWebsocket(
            mockedChronik,
            telegramBot,
            channelId,
            memoryCache,
        );

        // Confirm websocket opened
        assert.strictEqual(mockedChronik.wsWaitForOpenCalled, true);
        // Confirm subscribed to blocks
        assert.deepEqual(result.subs.blocks, true);
    });
    it('parseWebsocketMessage returns false for a msg other than BLK_CONNECTED, BLK_FINALIZED or BLK_INVALIDATED', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const thisBlock = block;

        // Tell mockedChronik what response we expect for chronik.block(thisBlockHash)
        mockedChronik.setTxHistoryByBlock(
            thisBlock.parsedBlock.height,
            thisBlock.blockTxs,
        );

        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        const unsupportedWebsocketMsgs = [
            {
                msgType: 'BLK_DISCONNECTED',
            },
        ];

        for (let i = 0; i < unsupportedWebsocketMsgs.length; i += 1) {
            const thisUnsupportedMsg = unsupportedWebsocketMsgs[i];
            const result = await parseWebsocketMessage(
                mockedChronik,
                thisUnsupportedMsg as WsMsgClient,
                telegramBot,
                channelId,
                memoryCache,
            );

            // Check that sendMessage was not called
            assert.strictEqual(telegramBot.messageSent, false);

            assert.deepEqual(result, false);
        }
    });
    it('parseWebsocketMessage creates and sends a telegram msg with prices and token send info for mocked block on successful API calls', async function () {
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
            const { type, hash } =
                cashaddr.getTypeAndHashFromOutputScript(outputScript);
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

        // Mock a chronik websocket msg of correct format
        const mockWsMsg = {
            msgType: 'BLK_FINALIZED',
            blockHash: thisBlock.parsedBlock.hash,
            blockHeight: thisBlock.parsedBlock.height,
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
        mock.onGet(getCoingeckoApiUrl(config)).reply(200, mockResult);

        // Mock a successful staking reward API request
        mock.onGet(config.stakingRewardApiUrl).reply(200, {
            nextBlockHeight: thisBlock.parsedBlock.height + 1,
            scriptHex: thisBlock.blockTxs[0].outputs[2].outputScript,
            address: cashaddr.encodeOutputScript(
                thisBlock.blockTxs[0].outputs[2].outputScript,
            ),
        });

        // Mock a successful staker info request
        mock.onGet(
            `https://coin.dance/api/stakers/${secrets.prod.stakerApiKey}`,
        ).reply(200, thisBlock.activeStakers);

        const result = await parseWebsocketMessage(
            mockedChronik,
            mockWsMsg as WsMsgClient,
            telegramBot,
            channelId,
            memoryCache,
        );

        // Build expected array of successful msg returns
        const msgSuccessArray = [];
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
    it('parseWebsocketMessage creates and sends a telegram msg without prices or token send info for mocked block on failed API calls', async function () {
        // Initialize chronik mock with successful blockTxs call
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
                    mockedChronik.setMock('tx', {
                        input: tokenId,
                        output: {
                            genesisInfo: tokenInfoMap.get(tokenId),
                        },
                    });
                }
            });
        }
        const thisBlockExpectedMsgs = thisBlock.blockSummaryTgMsgsApiFailure;

        // Mock a chronik websocket msg of correct format
        const mockWsMsg = {
            msgType: 'BLK_FINALIZED',
            blockHash: thisBlock.parsedBlock.hash,
            blockHeight: thisBlock.parsedBlock.height,
        };
        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        // Mock coingecko price response
        // onNoMatch: 'throwException' helps to debug if mock is not being used
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });

        // Mock a failed API request
        mock.onGet(getCoingeckoApiUrl(config)).reply(500, { error: 'error' });

        // Mock a successful staking reward API request
        mock.onGet(config.stakingRewardApiUrl).reply(200, {
            nextBlockHeight: thisBlock.parsedBlock.height + 1,
            scriptHex: thisBlock.blockTxs[0].outputs[2].outputScript,
            address: cashaddr.encodeOutputScript(
                thisBlock.blockTxs[0].outputs[2].outputScript,
            ),
        });

        const result = await parseWebsocketMessage(
            mockedChronik,
            mockWsMsg as WsMsgClient,
            telegramBot,
            channelId,
            memoryCache,
        );

        // Build expected array of successful msg returns
        const msgSuccessArray = [];
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
    });
    it('parseWebsocketMessage returns false if telegram msg fails to send', async function () {
        // Initialize chronik mock with successful blockTxs call
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

        // Mock a chronik websocket msg of correct format
        const mockWsMsg = {
            type: 'BLK_FINALIZED',
            blockHash: thisBlock.parsedBlock.hash,
            blockHeight: thisBlock.parsedBlock.height,
        };
        const telegramBot = new MockTelegramBot();
        telegramBot.setExpectedError(
            'sendMessage',
            'Error: message failed to send',
        );
        const channelId = mockChannelId;

        // Mock a successful staking reward API request
        const mock = new MockAdapter(axios, {
            onNoMatch: 'throwException',
        });
        mock.onGet(config.stakingRewardApiUrl).reply(200, {
            nextBlockHeight: thisBlock.parsedBlock.height + 1,
            scriptHex: thisBlock.blockTxs[0].outputs[2].outputScript,
            address: cashaddr.encodeOutputScript(
                thisBlock.blockTxs[0].outputs[2].outputScript,
            ),
        });

        const result = await parseWebsocketMessage(
            mockedChronik,
            mockWsMsg as WsMsgClient,
            telegramBot,
            channelId,
            memoryCache,
        );

        // Check that the function returns false
        assert.strictEqual(result, false);
    });
    it('parseWebsocketMessage creates and sends a telegram msg for invalidated blocks', async function () {
        // Initialize chronik mock
        const mockedChronik = new MockChronikClient();

        const thisBlock = block;

        // Mock a chronik websocket msg of correct format
        const mockWsMsg = {
            msgType: 'BLK_INVALIDATED',
            blockHash: thisBlock.blockTxs[0].block!.hash,
            blockHeight: thisBlock.blockTxs[0].block!.height,
            blockTimestamp: thisBlock.blockTxs[0].block!.timestamp,
            coinbaseData: {
                scriptsig: thisBlock.blockTxs[0].inputs[0].inputScript,
                outputs: thisBlock.blockTxs[0].outputs,
            },
        };
        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        const result = await parseWebsocketMessage(
            mockedChronik,
            mockWsMsg as WsMsgClient,
            telegramBot,
            channelId,
            memoryCache,
        );

        assert.strictEqual(telegramBot.messageSent, true);

        const msgSuccess = {
            success: true,
            channelId,
            msg: blockInvalidedTgMsg,
            options: config.tgMsgOptions,
        };

        // Check that the correct msg info was sent
        assert.deepEqual(result, msgSuccess);
    });
});

// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import assert from 'assert';
import config from '../config';
import secrets from '../secrets';
import unrevivedBlock from './mocks/block';
import { jsonReviver, getCoingeckoApiUrl } from '../src/utils';
import { blockInvalidedTgMsg } from './mocks/blockInvalidated';
import cashaddr from 'ecashaddrjs';
import {
    handleBlockFinalized,
    handleBlockInvalidated,
    StoredMock,
} from '../src/events';
import { MockChronikClient } from '../../../modules/mock-chronik-client';
import { MockTelegramBot, mockChannelId } from './mocks/telegramBotMock';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { caching, MemoryCache } from 'cache-manager';
import FakeTimers, { InstalledClock } from '@sinonjs/fake-timers';
import { ChronikClient, TokenInfo } from 'chronik-client';
const block: StoredMock = JSON.parse(
    JSON.stringify(unrevivedBlock),
    jsonReviver,
);

describe('ecash-herald events.js', async function () {
    let memoryCache: MemoryCache;
    before(async () => {
        const CACHE_TTL = config.cacheTtlMsecs;
        memoryCache = await caching('memory', {
            max: 100,
            ttl: CACHE_TTL,
        });
    });

    let clock: InstalledClock;
    beforeEach(() => {
        clock = FakeTimers.install();
    });
    afterEach(() => {
        // Restore timers
        clock.uninstall();
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
            const { type, hash } =
                cashaddr.getTypeAndHashFromOutputScript(outputScript);
            const { utxos } = info;
            mockedChronik.setUtxosByScript(
                type as 'p2pkh' | 'p2sh',
                hash,
                utxos,
            );
        });

        // Tell mockedChronik what response we expect for chronik.tx
        const { parsedBlock, tokenInfoMap } = thisBlock;
        const { tokenIds } = parsedBlock;
        // Will only have chronik call if the set is not empty
        if (tokenIds.size > 0) {
            // Instead of saving all the chronik responses as mocks, which would be very large
            // Just set them as mocks based on tokenInfoMap, which contains the info we need
            tokenIds.forEach(tokenId => {
                mockedChronik.setToken(tokenId, {
                    genesisInfo: tokenInfoMap.get(tokenId),
                } as TokenInfo);
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

        // Mock a successful staker info request
        mock.onGet(
            `https://coin.dance/api/stakers/${secrets.prod.stakerApiKey}`,
        ).reply(200, thisBlock.activeStakers);

        const result = await handleBlockFinalized(
            mockedChronik as unknown as ChronikClient,
            telegramBot,
            channelId,
            thisBlock.parsedBlock.hash,
            thisBlock.parsedBlock.height,
            memoryCache,
        );

        // Check that sendMessage was called successfully
        assert.strictEqual(telegramBot.messageSent, true);

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
                    mockedChronik.setToken(tokenId, new Error('some error'));
                } else {
                    index += 1;
                    mockedChronik.setToken(tokenId, {
                        genesisInfo: tokenInfoMap.get(tokenId),
                    } as TokenInfo);
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
            mockedChronik as unknown as ChronikClient,
            telegramBot,
            channelId,
            thisBlock.parsedBlock.hash,
            thisBlock.parsedBlock.height,
            memoryCache,
        );

        // Check that sendMessage was called successfully
        assert.strictEqual(telegramBot.messageSent, true);

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
            mockedChronik as unknown as ChronikClient,
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
                    mockedChronik.setToken(tokenId, new Error('some error'));
                } else {
                    index += 1;
                    mockedChronik.setToken(tokenId, {
                        genesisInfo: tokenInfoMap.get(tokenId),
                    } as TokenInfo);
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
            mockedChronik as unknown as ChronikClient,
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
            mockedChronik as unknown as ChronikClient,
            telegramBot,
            channelId,
            thisBlock.blockTxs[0].block!.hash,
            thisBlock.blockTxs[0].block!.height,
            thisBlock.blockTxs[0].block!.timestamp,
            {
                scriptsig: thisBlock.blockTxs[0].inputs[0].inputScript,
                outputs: thisBlock.blockTxs[0].outputs,
            },
            memoryCache,
        );

        // Check that sendMessage was called successfully
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

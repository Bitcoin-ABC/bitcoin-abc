// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * sendMsgByBlockheight.ts
 *
 * A script to allow developer to generate and broadcast an ecash-herald message
 * by blockheight
 *
 * Use cases
 * - Developing and testing a feature that is not in any of the current test blocks
 * - Proof of concept for future version of app where you may want to send "missed" msgs
 *   if the app is down for some period of time
 *
 * Example use
 *
 * Send msg to test channel for default blockheight (genesis block)
 * node scripts/sendMsgByBlock.js
 *
 * Send msg to test channel for blockheight 700000
 * node scripts/sendMsgByBlock.js 700000
 */

import { handleBlockFinalized } from '../src/events';
import { sendBlockSummary } from '../src/telegram';
import { getCoingeckoApiUrl } from '../src/utils';
import config from '../config';
import { ChronikClient } from 'chronik-client';
import secrets from '../secrets';
import TelegramBot from 'node-telegram-bot-api';
import { caching } from 'cache-manager';
import { StoredMock } from '../src/events';
import mockStakers from '../test/mocks/stakers';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// Default to the genesis block
let height = 0;

// Use live API for axios calls and not mocks
// Default to false as it doesn't take much testing to rate limit coingecko API
let liveApi = false;

// Look for blockheight specified from command line
if (process.argv && typeof process.argv[2] !== 'undefined') {
    // user input if available, commas removed
    height = parseInt(process.argv[2].replace(/,/g, ''));
    if (typeof process.argv[3] !== 'undefined' && process.argv[3] === 'true') {
        liveApi = true;
        console.log(`Sending msg with live API calls`);
    }
}

const chronik = new ChronikClient(config.chronik);
const { dev } = secrets;
const { botId, channelId } = dev.telegram;
const telegramBotDev = new TelegramBot(botId, { polling: true });

async function sendMsgByBlock(
    chronik: ChronikClient,
    telegramBot: TelegramBot,
    channelId: string,
    height: number,
) {
    // Need cache to pass to function
    const CACHE_TTL = 2 * config.cacheTtlMsecs;
    const memoryCache = await caching('memory', {
        max: 100,
        ttl: CACHE_TTL,
    });
    // We do not need this value if we are not using the live API
    let hash = height.toString();
    if (!liveApi) {
        // Mock price API
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });
        const mockResult = {
            bitcoin: { usd: 25000.0 },
            ecash: { usd: 0.00003333 },
            ethereum: { usd: 1900.0 },
        };
        // coingecko prices
        mock.onGet(getCoingeckoApiUrl(config)).reply(200, mockResult);
        // staking
        mock.onGet(
            `https://coin.dance/api/stakers/${secrets.prod.stakerApiKey}`,
        ).reply(200, mockStakers);
    } else {
        // Get hash if we are using live API calls

        const block = await chronik.block(height);
        hash = block.blockInfo.hash;
    }

    const returnedMocks = (await handleBlockFinalized(
        chronik,
        telegramBot,
        channelId,
        hash,
        height,
        memoryCache,
        true,
    )) as StoredMock;

    const { blockSummaryTgMsgs, blockSummaryTgMsgsApiFailure } = returnedMocks;

    // Send msg with successful price API call
    await sendBlockSummary(blockSummaryTgMsgs, telegramBot, channelId, height);

    // Send msg with failed price API call
    await sendBlockSummary(
        blockSummaryTgMsgsApiFailure,
        telegramBot,
        channelId,
    );

    console.log(
        '\x1b[32m%s\x1b[0m',
        `✔ Sent telegram msg for block ${height.toLocaleString()}`,
    );

    process.exit(0);
}

sendMsgByBlock(chronik, telegramBotDev, channelId, height);

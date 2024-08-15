// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const { caching } = require('cache-manager');

/**
 * sendMsgByBlockheight.js
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

// App functions
const { handleBlockFinalized } = require('../src/events');
const { sendBlockSummary } = require('../src/telegram');
const { getCoingeckoApiUrl } = require('../src/utils');

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

// Initialize chronik
const config = require('../config');
const { ChronikClient } = require('chronik-client');
const chronik = new ChronikClient(config.chronik);

// Initialize telegram bot to send msgs to dev channel
const secrets = require('../secrets');
const TelegramBot = require('node-telegram-bot-api');
const { dev } = secrets;
const { botId, channelId } = dev.telegram;
// Create a bot that uses 'polling' to fetch new updates
const telegramBotDev = new TelegramBot(botId, { polling: true });

// Mock price API call to prevent rate limiting during testing
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

async function sendMsgByBlock(chronik, telegramBot, channelId, height) {
    // Need cache to pass to function
    const CACHE_TTL = 2 * config.waitForFinalizationMsecs;
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
        mock.onGet(getCoingeckoApiUrl(config)).reply(200, mockResult);
    } else {
        // Get hash if we are using live API calls

        const block = await chronik.block(height);
        hash = block.blockInfo.hash;
    }

    const returnedMocks = await handleBlockFinalized(
        chronik,
        telegramBot,
        channelId,
        hash,
        height,
        memoryCache,
        true,
    );

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

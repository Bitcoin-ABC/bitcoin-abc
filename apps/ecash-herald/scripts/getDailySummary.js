// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Useful script for sending a summary of the 144 blocks
 * preceding an arbitrary blockheight
 *
 * node scripts/getDailySummary.ts will build and send a summary tg msg to
 * the channel configured in secrets.dev
 *
 * specify blockheight
 * node scripts/getDailySummary 800000
 */

'use strict';
// Initialize chronik
const config = require('../config');
const { ChronikClient } = require('chronik-client');
const chronik = new ChronikClient(config.chronik);
const { getAllBlockTxs } = require('../src/chronik');
const { summarizeTxHistory } = require('../src/parse');
const { getCoingeckoPrices } = require('../src/utils');
const { sendBlockSummary } = require('../src/telegram');
// Initialize telegram bot to send msgs to dev channel
const secrets = require('../secrets');
const TelegramBot = require('node-telegram-bot-api');
const { dev } = secrets;
const { botId, channelId } = dev.telegram;
// Create a bot that uses 'polling' to fetch new updates
const telegramBotDev = new TelegramBot(botId, { polling: true });

// Default to the commonly seen slp2 token
const blockheight =
    process.argv && typeof process.argv[2] !== 'undefined'
        ? process.argv[2]
        : false;

const getDailySummary = async (blockheight, telegramBot, channelId) => {
    // Get price info for tg msg, if available
    const { coingeckoPrices } = await getCoingeckoPrices(config.priceApi);
    let price;
    if (typeof coingeckoPrices !== 'undefined') {
        price = coingeckoPrices[0].price;
    }

    if (blockheight === false) {
        // If blockheight is not specified, get chaintip
        blockheight = (await chronik.blockchainInfo()).tipHeight;
    }

    console.log(
        `Sending daily summary for 144 blocks ending in ${blockheight}`,
    );

    const BLOCKS_TO_CHECK = 144;

    const startHeight = blockheight - BLOCKS_TO_CHECK;

    const getAllBlockTxPromises = [];
    for (let i = 1; i <= BLOCKS_TO_CHECK; i += 1) {
        getAllBlockTxPromises.push(getAllBlockTxs(chronik, startHeight + i));
    }

    const allBlockTxs = (await Promise.all(getAllBlockTxPromises)).flat();

    const dailySummaryTgMsgs = summarizeTxHistory(
        blockheight,
        allBlockTxs,
        price,
    );

    // Send msg with successful price API call
    await sendBlockSummary(dailySummaryTgMsgs, telegramBot, channelId, 'daily');

    process.exit(0);
};

getDailySummary(blockheight, telegramBotDev, channelId);

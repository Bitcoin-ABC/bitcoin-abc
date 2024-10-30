// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Useful script for sending a summary of on-chain activity over a 24-hour period
 *
 * Could be easily adapted to summarize other time windows
 *
 * node scripts/getDailySummary.js will build and send a summary tg msg to
 * the channel configured in secrets.dev
 *
 * specify timestamp
 * node scripts/getDailySummary 1729031373
 */

'use strict';
// Initialize chronik
const config = require('../config');
const { ChronikClient } = require('chronik-client');
const axios = require('axios');
const {
    getAllBlockTxs,
    getBlocksAgoFromChaintipByTimestamp,
    getTokenInfoMap,
} = require('../src/chronik');
const { summarizeTxHistory } = require('../src/parse');
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

const chronik = new ChronikClient(config.chronik);

/**
 * Build a summary of eCash onchain activity over the last 24 hours
 * @param {number | undefined} timestamp unix timestamp in seconds
 * @param {object} telegramBot
 * @param {number} channelId
 */
const getDailySummary = async (timestamp, telegramBot, channelId) => {
    // Get price info for tg msg, if available
    let priceInfo;
    try {
        priceInfo = (
            await axios.get(
                `https://api.coingecko.com/api/v3/simple/price?ids=ecash&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
            )
        ).data.ecash;
    } catch (err) {
        console.error(`Error getting daily summary price info`, err);
    }

    if (timestamp === false) {
        // If timestamp is not specified, use right now
        timestamp = Math.floor(Date.now() / 1000);
    }

    console.log(`Sending daily summary thru ${new Date(timestamp * 1000)}`);

    // Get blocks that will include last 24 hrs of txs
    const SECONDS_PER_DAY = 86400;
    const { startBlockheight, chaintip } =
        await getBlocksAgoFromChaintipByTimestamp(
            chronik,
            timestamp,
            SECONDS_PER_DAY,
        );

    const getAllBlockTxPromises = [];
    for (let i = startBlockheight; i <= chaintip; i += 1) {
        getAllBlockTxPromises.push(getAllBlockTxs(chronik, i));
    }

    const allBlockTxs = (await Promise.all(getAllBlockTxPromises)).flat();

    const tokensToday = new Set();
    for (const tx of allBlockTxs) {
        const { tokenEntries } = tx;
        for (const tokenEntry of tokenEntries) {
            const { tokenId, groupTokenId } = tokenEntry;
            tokensToday.add(tokenId);
            if (typeof groupTokenId !== 'undefined') {
                // We want the groupTokenId info even if we only have child txs in this window
                tokensToday.add(groupTokenId);
            }
        }
    }
    // Get all the token info of tokens from today
    const tokenInfoMap = await getTokenInfoMap(chronik, tokensToday);

    console.log(`${allBlockTxs.length} txs from blocks in the window`);

    // We only want txs in the specified window
    // NB coinbase txs have timeFirstSeen of 0. We include all of them as the block
    // timestamps are in the window
    const timeFirstSeenTxs = allBlockTxs.filter(
        tx =>
            (tx.timeFirstSeen > timestamp - SECONDS_PER_DAY &&
                tx.timeFirstSeen <= timestamp) ||
            tx.isCoinbase,
    );
    console.log(
        `${timeFirstSeenTxs.length} txs in the window by timeFirstSeen`,
    );
    const dailySummaryTgMsgs = summarizeTxHistory(
        timestamp,
        timeFirstSeenTxs,
        tokenInfoMap,
        priceInfo,
    );

    // Send msg with successful price API call
    await sendBlockSummary(dailySummaryTgMsgs, telegramBot, channelId, 'daily');

    process.exit(0);
};

getDailySummary(blockheight, telegramBotDev, channelId);

// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('./config');
const { ChronikClient } = require('chronik-client');
// Initialize chronik on app startup
const chronik = new ChronikClient(config.chronik);
// Initialize telegram bot on app startup
const secrets = require('./secrets');
const TelegramBot = require('node-telegram-bot-api');
const { botId, channelId, dailyChannelId } = secrets.prod.telegram;
const cron = require('cron');
// Create a bot that uses 'polling' to fetch new updates
const telegramBot = new TelegramBot(botId, { polling: true });
const { main } = require('./src/main');
const { handleUtcMidnight } = require('./src/events');

// Cron job for daily summaries
const job = new cron.CronJob(
    // see https://www.npmjs.com/package/cron
    // seconds[0-59] minutes[0-59] hours[0-23] day-of-month[1-31] month[1-12] day-of-week[0-7]
    '0 0 0 * * *', // cronTime
    () => handleUtcMidnight(chronik, telegramBot, dailyChannelId), // onTick
    null, // onComplete
    false, // start
    'UTC', // timeZone
);
job.start();

main(chronik, telegramBot, channelId);

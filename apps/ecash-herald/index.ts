// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChronikClient } from 'chronik-client';
import { CronJob } from 'cron';
import TelegramBot from 'node-telegram-bot-api';
import secrets from './secrets';
import config from './config';
import { main } from './src/main';
import { handleUtcMidnight } from './src/events';

// Initialize telegram bot on app startup
const { botId, channelId, dailyChannelId } = secrets.prod.telegram;
const telegramBot = new TelegramBot(botId, { polling: true });

// Initialize chronik on app startup
const chronik = new ChronikClient(config.chronik);

// Cron job for daily summaries
const job = new CronJob(
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

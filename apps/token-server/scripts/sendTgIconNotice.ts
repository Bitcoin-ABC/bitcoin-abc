// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * sendTgIconNotice.ts
 * Send a test Telegram message to see what the icon notice msgs will look like
 */

import 'dotenv/config';

import { Bot } from 'grammy';
import { alertNewTokenIcon } from '../src/telegram';
import { getEnv } from '../src/env';

const env = getEnv();
const telegramBot = new Bot(env.telegramBotToken);

// Set defaults for testing message format
const TOKEN_INFO = {
    name: 'Test Token',
    ticker: 'TEST',
    decimals: 0,
    url: 'https://cashtab.com/',
    genesisQty: '1000000000',
    tokenId: '1111111111111111111111111111111111111111111111111111111111111111',
};

alertNewTokenIcon(telegramBot, env.telegramChannelId, TOKEN_INFO)
    .then(result => {
        console.log(
            '\x1b[32m%s\x1b[0m',
            `✔ Successfully sent Telegram message to ${result.sender_chat?.title}`,
        );
        process.exit(0);
    })
    .catch(err => {
        console.log('\x1b[31m%s\x1b[0m', `Error sending Telegram message`, err);
        process.exit(1);
    });

// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { config } from 'dotenv';

config();

if (!process.env.TELEGRAM_BOT_TOKEN) {
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
}
if (!process.env.TELEGRAM_CHANNEL_ID) {
    process.env.TELEGRAM_CHANNEL_ID = 'test-channel-id';
}
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/token_server';
}

// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('./config');
const { initializeWebsocket } = require('./src/websocket');
const { ChronikClient } = require('chronik-client');
// Initialize chronik on app startup
const chronik = new ChronikClient(config.chronik);
// Initialize telegram bot on app startup
const { telegramBot, channelId } = require('./src/telegram');

async function main() {
    // Initialize websocket connection
    const telegramBotWebsocket = await initializeWebsocket(
        chronik,
        config.ifpAddress,
        telegramBot,
        channelId,
    );

    if (
        telegramBotWebsocket &&
        telegramBotWebsocket._subs &&
        telegramBotWebsocket._subs[0]
    ) {
        const subscribedHash160 = telegramBotWebsocket._subs[0].scriptPayload;
        console.log(`Websocket subscribed to ${subscribedHash160}`);
    }
}

main();

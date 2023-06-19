// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('./config');
const aliasConstants = require('./constants/alias');
const secrets = require('./secrets');
const { main } = require('./src/main');

// Initialize ChronikClient on app startup
const { ChronikClient } = require('chronik-client');
const chronik = new ChronikClient(config.chronik);

// Intialize MongoClient on app startup
const { MongoClient } = require('mongodb');
const aliasServerMongoClient = new MongoClient(config.database.connectionUrl);

// Initialize TelegramBot on app startup
const TelegramBot = require('node-telegram-bot-api');
const { botId, channelId } = secrets.telegram;
const telegramBot = new TelegramBot(botId, {
    polling: true,
});

main(
    aliasServerMongoClient,
    chronik,
    aliasConstants.registrationAddress,
    telegramBot,
    channelId,
    secrets.avalancheRpc,
);

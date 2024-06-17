// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('./config');
const aliasConstants = require('./constants/alias');
const secrets = require('./secrets');
const { main, cleanup } = require('./src/main');
const { initializeDb } = require('./src/db');
const { startServer } = require('./src/app');

// Initialize ChronikClient on app startup
const { ChronikClient } = require('chronik-client');
const chronik = new ChronikClient(config.chronik);

// Intialize MongoClient on app startup
const { MongoClient } = require('mongodb');
const aliasServerMongoClient = new MongoClient(config.database.connectionUrl);

// Use node-cache to store tipHeight in cache
const NodeCache = require('node-cache');
const cache = new NodeCache();

// Initialize TelegramBot on app startup
const TelegramBot = require('node-telegram-bot-api');
const { botId, channelId } = secrets.telegram;
const telegramBot = new TelegramBot(botId, {
    polling: true,
});

// Initialize database
initializeDb(aliasServerMongoClient).then(
    db => {
        // Start the express app (server with API endpoints)
        const server = startServer(db, config.express.port);

        // Start the indexer
        main(
            db,
            cache,
            chronik,
            aliasConstants.registrationAddress,
            telegramBot,
            channelId,
        );

        // Gracefully shut down on app termination
        process.on('SIGTERM', () => {
            // kill <pid> from terminal
            cleanup(server, aliasServerMongoClient, cache);
        });
        process.on('SIGINT', () => {
            // ctrl + c in nodejs
            cleanup(server, aliasServerMongoClient, cache);
        });
    },
    err => {
        console.log(`Error initializing database`, err);
        process.exit(1);
    },
);

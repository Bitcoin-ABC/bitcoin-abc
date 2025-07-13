// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import config from './config';
import secrets from './secrets';
import 'dotenv/config';
import { startExpressServer } from './src/routes';
import { initializeTelegramBot } from './src/telegram';
import fs from 'fs';
import { MongoClient } from 'mongodb';
import { initializeDb } from './src/db';

// Connect to database
// Connection URL (default)
const MONGODB_URL = `mongodb://${secrets.prod.db.username}:${secrets.prod.db.password}@${secrets.prod.db.containerName}:${secrets.prod.db.port}`;
const client = new MongoClient(MONGODB_URL);
// Check if database exists

// Initialize websocket connection and log incoming blocks
initializeDb(client).then(
    db => {
        // Initialize telegramBot
        const telegramBot = initializeTelegramBot(
            secrets.prod.botId,
            secrets.prod.approvedMods,
            fs,
            db,
        );

        // Start the express app to expose API endpoints
        const server = startExpressServer(config.port, db, telegramBot, fs);
        console.log(`Express server started on port ${config.port}`);

        // Gracefully shut down on app termination
        process.on('SIGTERM', () => {
            // kill <pid> from terminal
            server.close();
            console.log('token-server shut down by SIGTERM');
            // Shut down the telegram bot
            telegramBot.stopPolling();

            // Shut down the database
            client.close().then(() => {
                console.log('MongoDB connection closed');
                // Shut down token-server in non-error condition
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            // ctrl + c in nodejs
            server.close();
            console.log('token-server shut down by ctrl+c');
            // Shut down the telegram bot
            telegramBot.stopPolling();

            // Shut down the database
            client.close().then(() => {
                console.log('MongoDB connection closed');
                // Shut down token-server in non-error condition
                process.exit(0);
            });
        });
    },
    err => {
        console.log(`Error initializing database`, err);
        // Shut down the database
        client.close().then(() => {
            console.log('MongoDB connection closed');
            // Shut down token-server in error condition
            process.exit(1);
        });
    },
);

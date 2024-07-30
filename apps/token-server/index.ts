// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import config from './config';
import secrets from './secrets';
import 'dotenv/config';
import { startExpressServer } from './src/routes';
import { ChronikClientNode } from 'chronik-client';
import { initializeTelegramBot } from './src/telegram';
import fs from 'fs';
import { Ecc, initWasm } from 'ecash-lib';

// Connect to available in-node chronik servers
const chronik = new ChronikClientNode(config.chronikUrls);

// Initialize websocket connection and log incoming blocks
initWasm().then(
    () => {
        const ecc = new Ecc();
        // Initialize telegramBot
        const telegramBot = initializeTelegramBot(
            secrets.prod.botId,
            secrets.prod.approvedMods,
            fs,
        );

        // Start the express app to expose API endpoints
        const server = startExpressServer(
            config.port,
            chronik,
            telegramBot,
            fs,
            ecc,
        );
        console.log(`Express server started on port ${config.port}`);

        // Gracefully shut down on app termination
        process.on('SIGTERM', () => {
            // kill <pid> from terminal
            server.close();
            console.log('token-server shut down by SIGTERM');
            // Shut down the telegram bot
            telegramBot.stopPolling();
            process.exit(0);
        });

        process.on('SIGINT', () => {
            // ctrl + c in nodejs
            server.close();
            console.log('token-server shut down by ctrl+c');
            // Shut down the telegram bot
            telegramBot.stopPolling();
            process.exit(0);
        });
    },
    err => {
        console.log(`Error initializing websocket in token-server`, err);
        // Shut down in error condition
        process.exit(1);
    },
);

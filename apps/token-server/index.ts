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

/**
 * Main startup function
 */
async function main(): Promise<void> {
    try {
        // Initialize database
        const db = await initializeDb(client);
        console.log('Database initialized');

        // Initialize telegramBot
        const telegramBot = initializeTelegramBot(
            secrets.prod.botId,
            secrets.prod.approvedMods,
            fs,
            db,
        );

        // Start polling
        telegramBot.start();
        console.log('Telegram bot started polling');

        // Start the express app to expose API endpoints
        const server = startExpressServer(config.port, db, telegramBot, fs);
        console.log(`Express server started on port ${config.port}`);

        // Graceful shutdown function
        const gracefulShutdown = async (): Promise<void> => {
            console.log('Shutting down token-server gracefully...');
            try {
                // Stop accepting new connections
                server.close(() => {
                    console.log('Express server closed');
                });

                // Stop bot polling (this ends the polling loop cleanly)
                await telegramBot.stop();
                console.log('Telegram bot stopped polling');

                // Close database connection
                await client.close();
                console.log('MongoDB connection closed');

                process.exit(0);
            } catch (err) {
                console.error('Error during graceful shutdown:', err);
                process.exit(1);
            }
        };

        // Listen for Docker's stop signals
        process.on('SIGTERM', gracefulShutdown); // Docker sends this on `docker stop`
        process.on('SIGINT', gracefulShutdown); // For manual Ctrl+C

        console.log('🎉 token-server startup completed successfully!');
    } catch (err) {
        console.error('Failed to start token-server:', err);
        try {
            await client.close();
        } catch (closeErr) {
            console.error('Error closing database connection:', closeErr);
        }
        process.exit(1);
    }
}

// Start the application
main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

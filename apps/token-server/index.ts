// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import 'dotenv/config';

import config from './config';
import { startExpressServer } from './src/routes';
import {
    initializeTelegramBot,
    prepareTelegramBotForPolling,
    startTelegramBotPolling,
} from './src/telegram';
import fs from 'fs';
import { Pool } from 'pg';
import { initDb, initializeDb } from './src/db';
import { getEnv } from './src/env';

const env = getEnv();
let pool: Pool | undefined;

/**
 * Main startup function
 */
async function main(): Promise<void> {
    try {
        pool = await initDb(env.databaseUrl);
        await initializeDb(pool);
        console.log('Database initialized');

        const telegramBot = initializeTelegramBot(
            env.telegramBotToken,
            env.approvedMods,
            fs,
            pool,
        );

        await prepareTelegramBotForPolling(telegramBot);
        startTelegramBotPolling(telegramBot);

        const server = startExpressServer(
            config.port,
            pool,
            telegramBot,
            fs,
            env.telegramChannelId,
        );
        console.log(`Express server started on port ${config.port}`);

        const gracefulShutdown = async (): Promise<void> => {
            console.log('Shutting down token-server gracefully...');
            try {
                server.close(() => {
                    console.log('Express server closed');
                });

                await telegramBot.stop();
                console.log('Telegram bot stopped polling');

                if (pool) {
                    await pool.end();
                    console.log('PostgreSQL connection closed');
                }

                process.exit(0);
            } catch (err) {
                console.error('Error during graceful shutdown:', err);
                process.exit(1);
            }
        };

        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

        console.log('🎉 token-server startup completed successfully!');
    } catch (err) {
        console.error('Failed to start token-server:', err);
        try {
            if (pool) {
                await pool.end();
            }
        } catch (closeErr) {
            console.error('Error closing database connection:', closeErr);
        }
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import 'dotenv/config';

import { ChronikClient } from 'chronik-client';
import { createApp } from './src/app';
import { assertPushTablesExist, getEnv, initDb } from './src/env';
import { initPushFirebaseFromEnv } from './src/services/pushFirebase';
import { initPushAddressWs } from './src/websockets/pushAddressWs';

async function main(): Promise<void> {
    const env = getEnv();
    const pool = await initDb(env.databaseConnectionString);
    await assertPushTablesExist(pool);

    initPushFirebaseFromEnv();

    const chronik = new ChronikClient(env.chronikUrls);
    await initPushAddressWs(chronik, pool);

    const app = createApp(pool);
    const server = app.listen(env.port, () => {
        console.info(
            `notifications-server listening on port ${env.port} (${env.nodeEnv})`,
        );
    });

    const shutdown = async (): Promise<void> => {
        console.info('Shutting down notifications-server...');
        server.close();
        await pool.end();
        process.exit(0);
    };

    process.on('SIGTERM', () => {
        void shutdown();
    });
    process.on('SIGINT', () => {
        void shutdown();
    });
}

main().catch(error => {
    console.error('Failed to start notifications-server:', error);
    process.exit(1);
});

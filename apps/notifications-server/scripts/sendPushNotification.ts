// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import dotenv from 'dotenv';
dotenv.config();

import { initDb } from '../src/env';
import { initPushFirebaseFromEnv } from '../src/services/pushFirebase';
import { sendPushToActiveAddress } from '../src/services/pushNotificationService';

/**
 * Manually send a push notification to all devices for an active_address.
 *
 * Usage:
 *   npx tsx scripts/sendPushNotification.ts ecash:q... "Title" "Body"
 */
async function main(): Promise<void> {
    const [activeAddress, title, body] = process.argv.slice(2);

    if (!activeAddress || !title || !body) {
        throw new Error(
            'Usage: npx tsx scripts/sendPushNotification.ts <active_address> <title> <body>',
        );
    }

    const databaseUrl = process.env.DATABASE_CONNECTION_STRING;
    if (!databaseUrl) {
        throw new Error(
            'DATABASE_CONNECTION_STRING environment variable is required',
        );
    }

    initPushFirebaseFromEnv();
    const pool = await initDb(databaseUrl);

    try {
        const result = await sendPushToActiveAddress(pool, {
            activeAddress,
            notificationType: 'manual',
            title,
            body,
            data: {
                source: 'script',
            },
        });

        console.log(JSON.stringify(result, null, 2));
    } finally {
        await pool.end();
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});

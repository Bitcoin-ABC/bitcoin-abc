// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Coordinator process entry: load `.env`, bind, exit on SIGINT / SIGTERM.
 * Run via `pnpm start:coordinator` (compiled) or `pnpm dev:coordinator`.
 */
import 'dotenv/config';

import {
    CoordinatorConfigError,
    startCoordinatorFromEnv,
} from './coordinator.js';

async function main(): Promise<void> {
    const started = await startCoordinatorFromEnv(
        process.env,
        process.argv.slice(2),
        {
            log: line => {
                console.log(line);
            },
        },
    );

    let stopping = false;
    const shutdown = async (signal: string): Promise<void> => {
        if (stopping) {
            process.exit(1);
        }
        stopping = true;
        try {
            console.error(`alp-fusion coordinator stopping (${signal})`);
            await started.coordinator.close();
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`alp-fusion coordinator close failed: ${message}`);
            process.exitCode = 1;
        }
        process.exit();
    };

    process.on('SIGINT', () => {
        void shutdown('SIGINT');
    });
    process.on('SIGTERM', () => {
        void shutdown('SIGTERM');
    });
}

try {
    await main();
} catch (err) {
    if (err instanceof CoordinatorConfigError && err.exitCode === 0) {
        console.log(err.message);
        process.exit(0);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    process.exit(err instanceof CoordinatorConfigError ? err.exitCode : 1);
}

// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Participant process entry: load `.env`, join, exit on SIGINT / SIGTERM.
 * Run via `pnpm start:participant` (compiled) or `pnpm dev:participant`.
 */
import 'dotenv/config';

import {
    ParticipantConfigError,
    runParticipant,
    startParticipantFromEnv,
} from './participant.js';

async function main(): Promise<void> {
    const started = await startParticipantFromEnv(
        process.env,
        process.argv.slice(2),
        {
            log: line => {
                console.log(line);
            },
        },
    );

    let stopping = false;
    const shutdown = (signal: string): void => {
        if (stopping) {
            process.exit(1);
        }
        stopping = true;
        console.error(`alp-fusion participant stopping (${signal})`);
        started.client.stop();
    };

    process.on('SIGINT', () => {
        shutdown('SIGINT');
    });
    process.on('SIGTERM', () => {
        shutdown('SIGTERM');
    });

    try {
        await runParticipant(started);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(message);
    }
}

try {
    await main();
} catch (err) {
    if (err instanceof ParticipantConfigError && err.exitCode === 0) {
        console.log(err.message);
        process.exit(0);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    process.exit(err instanceof ParticipantConfigError ? err.exitCode : 1);
}

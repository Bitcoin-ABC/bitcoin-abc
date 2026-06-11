// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Look up blacklist status for a tokenId in Neon PostgreSQL.
 *
 * Usage:
 *   tsx scripts/getBlacklistStatus.ts [tokenId]
 *
 * Requires DATABASE_URL in the environment or .env file.
 */

import 'dotenv/config';

import { initDb, getOneBlacklistEntry } from '../src/db';
import { isValidTokenId } from '../src/validation';

const DEFAULT_TOKEN_ID =
    '07b7d124659d00045607c85cfb10d338b04bf5d046b2700960394defc0eb999b';

const main = async (): Promise<void> => {
    const tokenId = process.argv[2] ?? DEFAULT_TOKEN_ID;

    if (!isValidTokenId(tokenId)) {
        throw new Error(`Invalid tokenId: ${tokenId}`);
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is required');
    }

    const pool = await initDb(databaseUrl);

    try {
        const entry = await getOneBlacklistEntry(pool, tokenId);

        if (entry) {
            console.log(
                JSON.stringify(
                    {
                        status: 'success',
                        isBlacklisted: true,
                        entry,
                    },
                    null,
                    2,
                ),
            );
        } else {
            console.log(
                JSON.stringify(
                    {
                        status: 'success',
                        isBlacklisted: false,
                    },
                    null,
                    2,
                ),
            );
        }
    } finally {
        await pool.end();
    }
};

main().catch(err => {
    console.error(err);
    process.exit(1);
});

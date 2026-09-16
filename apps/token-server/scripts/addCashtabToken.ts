// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Add one cashtab_tokens row from Chronik metadata.
 *
 * Usage (from apps/token-server):
 *   pnpm exec tsx scripts/addCashtabToken.ts <tokenId>
 *
 * Requires DATABASE_URL in the environment or .env file.
 * Skips insert if the tokenId is already in cashtab_tokens.
 */

import 'dotenv/config';

import { ChronikClient, ConnectionStrategy } from 'chronik-client';
import config from '../config';
import { initDb } from '../src/db';
import { cashtabTokenExists, insertCashtabToken } from '../src/cashtabTokens';
import { getCashtabTokenMetadata } from '../src/tokenMetadata';
import {
    isValidMinterAddress,
    isValidSupplyType,
    isValidTokenId,
    isValidTokenType,
} from '../src/validation';

const getChronikClient = async (): Promise<ChronikClient> => {
    return ChronikClient.useStrategy(
        ConnectionStrategy.ClosestFirst,
        config.chronikUrls,
    );
};

const main = async (): Promise<void> => {
    const tokenId = process.argv[2];

    if (typeof tokenId !== 'string' || !isValidTokenId(tokenId)) {
        throw new Error('Usage: tsx scripts/addCashtabToken.ts <tokenId>');
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is required');
    }

    const pool = await initDb(databaseUrl);

    try {
        if (await cashtabTokenExists(pool, tokenId)) {
            console.log(
                JSON.stringify(
                    {
                        status: 'skipped',
                        reason: 'already_exists',
                        tokenId,
                    },
                    null,
                    2,
                ),
            );
            return;
        }

        const chronik = await getChronikClient();
        const metadata = await getCashtabTokenMetadata(chronik, tokenId);

        if (
            !isValidMinterAddress(metadata.minterAddress) ||
            !isValidTokenType(metadata.tokenType) ||
            !isValidSupplyType(metadata.supplyType)
        ) {
            throw new Error(
                `Chronik metadata failed validation for ${tokenId}`,
            );
        }

        await insertCashtabToken(pool, metadata);

        console.log(
            JSON.stringify(
                {
                    status: 'inserted',
                    ...metadata,
                },
                null,
                2,
            ),
        );
    } finally {
        await pool.end();
    }
};

main().catch(err => {
    console.error(err);
    process.exit(1);
});

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

import { ChronikClient, ConnectionStrategy, TokenType } from 'chronik-client';
import { encodeCashAddress, getTypeAndHashFromOutputScript } from 'ecashaddrjs';
import { initDb } from '../src/db';
import {
    CashtabTokenMetadata,
    cashtabTokenExists,
    insertCashtabToken,
} from '../src/cashtabTokens';
import {
    isValidMinterAddress,
    isValidSupplyType,
    isValidTokenId,
    isValidTokenType,
} from '../src/validation';

const CHRONIK_URLS = [
    'https://chronik-native2.fabien.cash',
    'https://chronik-native3.fabien.cash',
    'https://chronik-native1.fabien.cash',
];

const getChronikClient = async (): Promise<ChronikClient> => {
    return ChronikClient.useStrategy(
        ConnectionStrategy.ClosestFirst,
        CHRONIK_URLS,
    );
};

const outputScriptToAddress = (outputScript: string): string => {
    const { type, hash } = getTypeAndHashFromOutputScript(outputScript);
    return encodeCashAddress('ecash', type, hash);
};

const tokenTypeToString = (tokenType: TokenType): string => {
    return tokenType.type;
};

const getMintVaultMinterAddress = (
    tokenId: string,
    genesisTx: Awaited<ReturnType<ChronikClient['tx']>>,
): string => {
    const firstInput = genesisTx.inputs[0];
    if (
        typeof firstInput === 'undefined' ||
        typeof firstInput.outputScript !== 'string'
    ) {
        throw new Error(
            `No input[0] outputScript for mint vault tokenId ${tokenId}`,
        );
    }
    return outputScriptToAddress(firstInput.outputScript);
};

const getCashtabTokenMetadata = async (
    chronik: ChronikClient,
    tokenId: string,
): Promise<CashtabTokenMetadata> => {
    const tokenInfo = await chronik.token(tokenId);
    const genesisTx = await chronik.tx(tokenId);
    const tokenType = tokenTypeToString(tokenInfo.tokenType);

    if (tokenType === 'SLP_TOKEN_TYPE_MINT_VAULT') {
        return {
            tokenId,
            minterAddress: getMintVaultMinterAddress(tokenId, genesisTx),
            tokenType,
            supplyType: 'VARIABLE',
        };
    }

    let genesisMintBatons = 0;
    let minterAddress: string | undefined;
    let mintBatonAddress: string | undefined;

    for (const output of genesisTx.outputs) {
        if (output.token?.tokenId !== tokenId) {
            continue;
        }

        const { isMintBaton, atoms } = output.token;

        if (isMintBaton) {
            genesisMintBatons += 1;
            if (typeof mintBatonAddress === 'undefined') {
                mintBatonAddress = outputScriptToAddress(output.outputScript);
            }
            continue;
        }

        if (atoms > 0n && typeof minterAddress === 'undefined') {
            minterAddress = outputScriptToAddress(output.outputScript);
        }
    }

    if (typeof minterAddress === 'undefined') {
        if (typeof mintBatonAddress !== 'undefined') {
            minterAddress = mintBatonAddress;
        } else {
            throw new Error(
                `No genesis supply or mint baton output found for tokenId ${tokenId}`,
            );
        }
    }

    return {
        tokenId,
        minterAddress,
        tokenType,
        supplyType: genesisMintBatons > 0 ? 'VARIABLE' : 'FIXED',
    };
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

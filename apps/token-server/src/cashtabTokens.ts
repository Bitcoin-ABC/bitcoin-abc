// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Pool } from 'pg';

export type SupplyType = 'FIXED' | 'VARIABLE';

export interface CashtabTokenMetadata {
    tokenId: string;
    minterAddress: string;
    tokenType: string;
    supplyType: SupplyType;
}

type Queryable = Pick<Pool, 'query'>;

/**
 * Insert or update a cashtab_tokens row.
 */
export const upsertCashtabToken = async (
    pool: Queryable,
    metadata: CashtabTokenMetadata,
): Promise<void> => {
    await pool.query(
        `INSERT INTO cashtab_tokens (token_id, minter_address, token_type, supply_type)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (token_id) DO UPDATE SET
           minter_address = EXCLUDED.minter_address,
           token_type = EXCLUDED.token_type,
           supply_type = EXCLUDED.supply_type,
           updated_at = NOW()`,
        [
            metadata.tokenId,
            metadata.minterAddress,
            metadata.tokenType,
            metadata.supplyType,
        ],
    );
};

/**
 * Return true if cashtab_tokens already has a row for tokenId.
 */
export const cashtabTokenExists = async (
    pool: Queryable,
    tokenId: string,
): Promise<boolean> => {
    const result = await pool.query(
        'SELECT 1 FROM cashtab_tokens WHERE token_id = $1',
        [tokenId],
    );
    return result.rowCount !== null && result.rowCount > 0;
};

/**
 * Insert a cashtab_tokens row. Fails if token_id already exists.
 */
export const insertCashtabToken = async (
    pool: Queryable,
    metadata: CashtabTokenMetadata,
): Promise<void> => {
    await pool.query(
        `INSERT INTO cashtab_tokens (token_id, minter_address, token_type, supply_type)
         VALUES ($1, $2, $3, $4)`,
        [
            metadata.tokenId,
            metadata.minterAddress,
            metadata.tokenType,
            metadata.supplyType,
        ],
    );
};

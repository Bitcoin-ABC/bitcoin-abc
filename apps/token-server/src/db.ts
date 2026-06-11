// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface BlacklistEntry {
    /** tokenId of blacklisted token */
    tokenId: string;
    /** A short explanation of why this token was blacklisted, e.g. "impersonating tether" */
    reason: string;
    /**
     * When this token was added to the blacklist
     * We use number instead of Date as the API returns JSON
     */
    timestamp: number;
    /** string describing who added this token to the blacklist */
    addedBy: string;
}

interface BlacklistRow {
    token_id: string;
    reason: string;
    timestamp: string | number;
    added_by: string;
}

const rowToEntry = (row: BlacklistRow): BlacklistEntry => ({
    tokenId: row.token_id,
    reason: row.reason,
    timestamp: Number(row.timestamp),
    addedBy: row.added_by,
});

const initialBlacklistTokens = [
    {
        tokenId:
            '09c53c9a9fe0df2cb729dd6f99f2b836c59b842d6652becd85658e277caab611',
        reason: 'Impersonates Blazer (site that runs poker tournaments)',
    },
    {
        tokenId:
            '9c662233f8553e72ab3848a37d72fbc3f894611aae43033cde707213a537bba0',
        reason: 'Impersonates BUX stablecoin',
    },
    {
        tokenId:
            '6dcb149e77a8f86a85d2fb8505dadb194994a922102fcea6309f2818de9ee173',
        reason: 'Impersonating a USD stablecoin',
    },
    {
        tokenId:
            '059308a0d6ef0443d8bd014ac85f830d98780b1ce53bc2326680ed27e99803f6',
        reason: 'Impersonating a USD stablecoin',
    },
    {
        tokenId:
            '2a328dbe125bd0ef8d199b2b4f20ce84bb36a7c0d12246668163a6077d4f494b',
        reason: 'Impersonating a USD stablecoin',
    },
    {
        tokenId:
            '3387978c85f382632ecb5cdc23c4912c4c22688790d9264f84c3c1351c049719',
        reason: 'Impersonating a USD stablecoin',
    },
    {
        tokenId:
            '07da70e787181ac67a34f9292b4e13a93cd081e4ca540a8ddafe4cc86ee26e2d',
        reason: 'Impersonating a USD stablecoin',
    },
    {
        tokenId:
            '4e56e9bedfb654560eb1917b2e2fa40473cf26a8a9a0f84e0b0e91a9cce1df65',
        reason: 'Impersonating a USD stablecoin',
    },
    {
        tokenId:
            '2a33476bcd30bfbc5e57fb33da26f641020a53c925db7394e6d3b8eecf82e2ec',
        reason: 'Impersonating a USD stablecoin',
    },
    {
        tokenId:
            'b69dcc90c72e852e1dc712704cb376e588cee6266a51e647c61a724c00625cc8',
        reason: 'Impersonating a USD stablecoin',
    },
    {
        tokenId:
            '7c14895521c158798478a64d146f67f22e1c8c5b962422ed47636fda71d82f1d',
        reason: 'Impersonating Meta and attempting to use their logo',
    },
    {
        tokenId:
            '6f231d49fefd938a9a6b4e6b93d14c7127e11bd5621056eb9c6528164b9d7ce0',
        reason: 'Impersonating Meta and attempting to use their logo',
    },
    {
        tokenId:
            'a6a16ac38d37e35c9f9eb81e9014827cef9da105a94607ec16a2c6e76224d098',
        reason: 'Impersonating corporate brand using their logo',
    },
    {
        tokenId:
            'db2e95abe66f6b1f21a860a177b7a73565182185a99b6043b5183f59df7ecfbf',
        reason: 'Impersonating corporate brand using their logo',
    },
    {
        tokenId:
            '4c008a1cd5002063d2942daed16ff0e118bc3e41c7c0a4155ac096ee5a389c21',
        reason: 'Impersonating RAIPAY',
    },
];
const initialBlacklist = initialBlacklistTokens.map(item => ({
    ...item,
    timestamp: Math.round(new Date(1730090292122).getTime() / 1000),
    addedBy: 'Initial Setup',
}));
export { initialBlacklist };

/**
 * Initialize Neon PostgreSQL database pool
 *
 * DATABASE_URL should include `sslmode=verify-full` for Neon (see env.sample).
 */
export const initDb = async (connectionString: string): Promise<Pool> => {
    let pool: Pool | undefined;
    try {
        pool = new Pool({ connectionString });
        await pool.query('SELECT NOW()');
        console.log('Database connected.');
        return pool;
    } catch (err) {
        console.error('Error connecting to database:', err);
        if (pool) {
            await pool.end();
        }
        throw err;
    }
};

/**
 * Initialize database schema from schema.sql file
 */
export const initSchema = async (pool: Pool): Promise<void> => {
    const schemaPath = join(process.cwd(), 'schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf-8');
    await pool.query(schemaSql);
    console.log('Database schema initialized.');
};

/**
 * Seed the blacklist when the table is empty
 */
export const seedBlacklist = async (
    pool: Pool,
    blacklist = initialBlacklist,
): Promise<void> => {
    const countResult = await pool.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM blacklist',
    );
    const blacklistedTokenCount = Number.parseInt(
        countResult.rows[0].count,
        10,
    );

    if (blacklistedTokenCount === 0) {
        for (const entry of blacklist) {
            await pool.query(
                `INSERT INTO blacklist (token_id, reason, timestamp, added_by)
                 VALUES ($1, $2, $3, $4)`,
                [entry.tokenId, entry.reason, entry.timestamp, entry.addedBy],
            );
        }
        console.log(`${blacklist.length} tokens inserted into blacklist`);
    } else {
        console.log(
            `Blacklist table exists and includes ${blacklistedTokenCount} tokens. Continuing token-server startup...`,
        );
    }
};

/**
 * Initialize schema and seed the blacklist when empty
 */
export const initializeDb = async (
    pool: Pool,
    blacklist = initialBlacklist,
): Promise<Pool> => {
    await initSchema(pool);
    await seedBlacklist(pool, blacklist);
    return pool;
};

export const getBlacklistedTokenIds = async (pool: Pool): Promise<string[]> => {
    const result = await pool.query<{ token_id: string }>(
        'SELECT token_id FROM blacklist ORDER BY token_id',
    );
    return result.rows.map(row => row.token_id);
};

export const getOneBlacklistEntry = async (
    pool: Pool,
    tokenId: string,
): Promise<BlacklistEntry | null> => {
    const result = await pool.query<BlacklistRow>(
        `SELECT token_id, reason, timestamp, added_by
         FROM blacklist
         WHERE token_id = $1`,
        [tokenId],
    );

    if (result.rows.length === 0) {
        return null;
    }

    return rowToEntry(result.rows[0]);
};

export const insertBlacklistEntry = async (
    pool: Pool,
    tokenId: string,
    entryData: Omit<BlacklistEntry, 'tokenId'>,
): Promise<void> => {
    await pool.query(
        `INSERT INTO blacklist (token_id, reason, timestamp, added_by)
         VALUES ($1, $2, $3, $4)`,
        [tokenId, entryData.reason, entryData.timestamp, entryData.addedBy],
    );
};

export const removeBlacklistEntry = async (
    pool: Pool,
    tokenId: string,
): Promise<{ rowCount: number }> => {
    const result = await pool.query(
        'DELETE FROM blacklist WHERE token_id = $1',
        [tokenId],
    );
    return { rowCount: result.rowCount ?? 0 };
};

export const resetBlacklist = async (pool: Pool): Promise<void> => {
    await pool.query('TRUNCATE blacklist');
};

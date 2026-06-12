// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Pool } from 'pg';
import { newDb } from 'pg-mem';

/**
 * Create an in-memory PostgreSQL pool for tests
 */
export const createTestPool = async (): Promise<Pool> => {
    const db = newDb();
    const { Pool: PgMemPool } = db.adapters.createPg();
    const pool = new PgMemPool();

    // pg-mem does not support inline PRIMARY KEY / NOT NULL in CREATE TABLE
    await pool.query(`
        CREATE TABLE IF NOT EXISTS blacklist (
            token_id text,
            reason text,
            timestamp bigint,
            added_by text
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS cashtab_tokens (
            token_id text UNIQUE,
            minter_address text,
            token_type text,
            supply_type text,
            created_at timestamptz,
            updated_at timestamptz,
            is_verified boolean
        );
    `);

    return pool as Pool;
};

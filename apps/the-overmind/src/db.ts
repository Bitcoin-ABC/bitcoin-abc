// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Initialize Neon PostgreSQL database pool
 */
export const initDb = async (connectionString: string): Promise<Pool> => {
    const poolConfig = {
        connectionString,
        ssl: { rejectUnauthorized: false },
    };

    let pool: Pool | undefined;
    try {
        pool = new Pool(poolConfig);
        await pool.query('SELECT NOW()');
        console.info('Database connected.');
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
    try {
        // Read schema.sql from the project root
        // Use process.cwd() to get the project root, which works regardless of where code is compiled
        const schemaPath = join(process.cwd(), 'schema.sql');
        const schemaSql = readFileSync(schemaPath, 'utf-8');

        // Execute the schema
        await pool.query(schemaSql);
        console.info('Database schema initialized.');
    } catch (err) {
        console.error('Error initializing database schema:', err);
        throw err;
    }
};

/**
 * Create a user action table for a specific user
 * Table name: user_actions_<user_tg_id>
 * @param pool - Database connection pool
 * @param userTgId - Telegram user ID
 */
export const createUserActionTable = async (
    pool: Pool,
    userTgId: number,
): Promise<void> => {
    // Validate userTgId is a valid number
    if (!Number.isInteger(userTgId) || userTgId <= 0) {
        throw new Error(`Invalid user_tg_id: ${userTgId}`);
    }

    const tableName = `user_actions_${userTgId}`;
    // Use quote_ident to safely quote the table name
    // Note: PostgreSQL doesn't allow parameters for table names, so we validate userTgId is numeric
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
            id SERIAL PRIMARY KEY,
            action TEXT NOT NULL,
            txid TEXT,
            msg_id INTEGER,
            emoji TEXT, 
            occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `;

    try {
        await pool.query(createTableQuery);
        console.info(`User action table created: ${tableName}`);
    } catch (err) {
        console.error(`Error creating user action table ${tableName}:`, err);
        throw err;
    }
};

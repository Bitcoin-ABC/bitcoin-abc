// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Pool } from 'pg';

export type Env = {
    port: number;
    nodeEnv: string;
    databaseConnectionString: string;
    chronikUrls: string[];
    firebaseServiceAccountPath: string | undefined;
};

const parseCsv = (value: string | undefined): string[] =>
    (value ?? '')
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);

export const getEnv = (): Env => {
    const databaseConnectionString = process.env.DATABASE_CONNECTION_STRING;
    if (!databaseConnectionString) {
        throw new Error('DATABASE_CONNECTION_STRING is required');
    }

    const chronikUrls = parseCsv(process.env.CHRONIK_URLS);
    if (chronikUrls.length === 0) {
        throw new Error('CHRONIK_URLS is required');
    }

    return {
        port: Number.parseInt(process.env.PORT ?? '3020', 10),
        nodeEnv: process.env.NODE_ENV ?? 'development',
        databaseConnectionString,
        chronikUrls,
        firebaseServiceAccountPath:
            process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() || undefined,
    };
};

export const initDb = async (connectionString: string): Promise<Pool> => {
    const pool = new Pool({ connectionString });
    await pool.query('SELECT 1');
    console.info('Database connected.');
    return pool;
};

export const assertPushTablesExist = async (pool: Pool): Promise<void> => {
    const result = await pool.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = current_schema()
           AND table_name IN ('push_device_tokens')`,
    );
    const names = new Set(result.rows.map(row => row.table_name));
    const required = ['push_device_tokens'];
    const missing = required.filter(name => !names.has(name));
    if (missing.length > 0) {
        throw new Error(
            `notifications-server DB missing push tables: ${missing.join(', ')}; apply schema.sql`,
        );
    }
};

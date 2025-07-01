// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { Pool, PoolClient } from 'pg';
import { DatabaseConfig } from '../types';
import logger from '../utils/logger';

class DatabaseConnection {
    private pool: Pool;
    private static instance: DatabaseConnection;

    private constructor(config: DatabaseConfig) {
        const databaseUrl = process.env.DATABASE_URL;
        this.pool = databaseUrl
            ? new Pool({
                  connectionString: databaseUrl,
                  ssl: databaseUrl.includes('sslmode=require')
                      ? { rejectUnauthorized: false }
                      : undefined,
              })
            : new Pool({
                  host: config.host,
                  port: config.port,
                  database: config.database,
                  user: config.user,
                  password: config.password,
                  max: 20,
                  idleTimeoutMillis: 30000,
                  connectionTimeoutMillis: 2000,
              });

        this.pool.on('error', (err: Error) => {
            logger.error('Unexpected error on idle client', err);
        });
    }

    public static getInstance(config: DatabaseConfig): DatabaseConnection {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection(config);
        }
        return DatabaseConnection.instance;
    }

    public async getClient(): Promise<PoolClient> {
        return await this.pool.connect();
    }

    public async query(text: string, params?: any[]): Promise<any> {
        const client = await this.getClient();
        try {
            const result = await client.query(text, params);
            return result;
        } finally {
            client.release();
        }
    }

    public async transaction<T>(
        callback: (client: PoolClient) => Promise<T>,
    ): Promise<T> {
        const client = await this.getClient();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    public async close(): Promise<void> {
        await this.pool.end();
    }

    public async testConnection(): Promise<boolean> {
        try {
            await this.query('SELECT NOW()');
            logger.info('Database connection successful');
            return true;
        } catch (error) {
            logger.error('Database connection failed:', error);
            return false;
        }
    }
}

export default DatabaseConnection;

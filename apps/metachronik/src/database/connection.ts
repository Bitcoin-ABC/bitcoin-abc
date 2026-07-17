// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { Pool, PoolClient } from 'pg';
import { DatabaseConfig } from '../types';
import logger from '../utils/logger';

const DEFAULT_STATEMENT_TIMEOUT_MS = 300000; // 5 minutes
export const DEFAULT_MERGE_STATEMENT_TIMEOUT_MS = 3600000; // 1 hour

/** Session advisory lock keys for singleton metachronik indexer */
const INDEXER_LOCK_KEY1 = 1836016749; // 'meta'
const INDEXER_LOCK_KEY2 = 1668187503; // 'chro'

interface PgClientWithConnection extends PoolClient {
    connection?: {
        stream?: {
            destroy: () => void;
        };
    };
}

class DatabaseConnection {
    private pool: Pool;
    private static instance: DatabaseConnection;
    private activeClient: PoolClient | null = null;
    private lockClient: PoolClient | null = null;
    private readonly defaultStatementTimeoutMs: number;

    private constructor(config: DatabaseConfig) {
        const parsedTimeout = parseInt(
            process.env.STATEMENT_TIMEOUT_MS ||
                String(DEFAULT_STATEMENT_TIMEOUT_MS),
            10,
        );
        this.defaultStatementTimeoutMs = Number.isFinite(parsedTimeout)
            ? parsedTimeout
            : DEFAULT_STATEMENT_TIMEOUT_MS;
        const statementTimeoutMs = this.defaultStatementTimeoutMs;
        const databaseUrl = process.env.DATABASE_URL;
        this.pool = databaseUrl
            ? new Pool({
                  connectionString: databaseUrl,
                  ssl: databaseUrl.includes('sslmode=require')
                      ? { rejectUnauthorized: false }
                      : undefined,
                  max: 20,
                  idleTimeoutMillis: 30000,
                  connectionTimeoutMillis: 10000,
                  // Keep sockets warm so Neon is less likely to drop idle conns
                  keepAlive: true,
              })
            : new Pool({
                  host: config.host,
                  port: config.port,
                  database: config.database,
                  user: config.user,
                  password: config.password,
                  max: 20,
                  idleTimeoutMillis: 30000,
                  connectionTimeoutMillis: 10000,
                  keepAlive: true,
              });

        this.pool.on('connect', (client: PoolClient) => {
            client
                .query(`SET statement_timeout = ${statementTimeoutMs}`)
                .catch(err =>
                    logger.warn('Failed to set statement_timeout:', err),
                );
        });

        this.pool.on('error', (err: Error) => {
            logger.error('Unexpected error on idle client', err);
        });

        logger.info(
            `Database pool configured with statement_timeout=${statementTimeoutMs}ms`,
        );
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
        this.activeClient = client;
        try {
            return await client.query(text, params);
        } finally {
            if (this.activeClient === client) {
                this.activeClient = null;
            }
            client.release();
        }
    }

    public async cancelActiveQuery(): Promise<void> {
        const client = this.activeClient as PgClientWithConnection | null;
        if (!client) {
            return;
        }
        try {
            // pg@8 removed Client.cancel(); destroy the socket to abort the query
            client.connection?.stream?.destroy();
            logger.info('Aborted in-flight database query');
        } catch (error) {
            logger.warn('Failed to abort active database query:', error);
        }
    }

    /**
     * Try to acquire a session-level advisory lock on a dedicated connection.
     * Only one metachronik indexer may hold this lock at a time.
     */
    public async acquireInstanceLock(): Promise<boolean> {
        if (this.lockClient) {
            return true;
        }

        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'SELECT pg_try_advisory_lock($1, $2) AS acquired',
                [INDEXER_LOCK_KEY1, INDEXER_LOCK_KEY2],
            );
            if (!result.rows[0]?.acquired) {
                client.release();
                return false;
            }
            // If Neon drops this idle connection, handle the error here so it
            // does not surface as an unhandled 'error' event and crash the app.
            // Clearing lockClient lets ensureInstanceLock re-acquire later.
            client.on('error', (err: Error) => {
                logger.warn(
                    `Indexer lock connection error (will re-acquire): ${err.message}`,
                );
                this.lockClient = null;
                try {
                    client.release();
                } catch {
                    // already released/destroyed
                }
            });
            this.lockClient = client;
            logger.info('Acquired indexer instance lock');
            return true;
        } catch (error) {
            client.release();
            throw error;
        }
    }

    /**
     * Re-acquire the instance lock if it was lost due to a dropped connection.
     * Returns true if the lock is currently held.
     */
    public async ensureInstanceLock(): Promise<boolean> {
        if (this.lockClient) {
            return true;
        }
        logger.info('Instance lock not held, attempting to re-acquire...');
        return this.acquireInstanceLock();
    }

    public async releaseInstanceLock(): Promise<void> {
        if (!this.lockClient) {
            return;
        }
        try {
            await this.lockClient.query('SELECT pg_advisory_unlock($1, $2)', [
                INDEXER_LOCK_KEY1,
                INDEXER_LOCK_KEY2,
            ]);
        } catch (error) {
            logger.warn('Failed to release indexer instance lock:', error);
        } finally {
            try {
                this.lockClient?.release();
            } catch {
                // already released/destroyed
            }
            this.lockClient = null;
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

    /**
     * Run a transaction with an extended statement_timeout (for staging merges).
     */
    public async transactionWithStatementTimeout<T>(
        timeoutMs: number,
        callback: (client: PoolClient) => Promise<T>,
    ): Promise<T> {
        const client = await this.getClient();
        try {
            await client.query(`SET statement_timeout = ${timeoutMs}`);
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            try {
                await client.query(
                    `SET statement_timeout = ${this.defaultStatementTimeoutMs}`,
                );
            } catch {
                // connection may already be dead
            }
            client.release();
        }
    }

    public async close(): Promise<void> {
        await this.cancelActiveQuery();
        await this.releaseInstanceLock();
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

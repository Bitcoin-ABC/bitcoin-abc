// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { CashtabStorage } from '../types';

/**
 * Minimal, late-bound wrapper around Capacitor SQLite to avoid
 * pulling Capacitor into web/extension bundles.
 */
function getSQLite() {
    const w = (globalThis as any).window || (globalThis as any);
    const CapacitorInstance =
        (w as any).Capacitor || (globalThis as any).Capacitor;
    if (!CapacitorInstance) {
        throw new Error('Capacitor not available');
    }
    const SQLite = CapacitorInstance.Plugins?.CapacitorSQLite;
    if (!SQLite) {
        throw new Error('Capacitor SQLite plugin not available');
    }
    return SQLite;
}

export class AndroidStorageAdapter implements CashtabStorage {
    private availabilityChecked = false;
    private availability = false;
    private db: any = null;
    private initPromise: Promise<void> | null = null; // For lazy init
    private readonly dbName = 'cashtab.db';
    private readonly tableName = 'key_value_store';

    constructor() {
        // Lazy init on construction; resolves on first use
        this.initPromise = this.initializeDatabase();
    }

    private async initializeDatabase(): Promise<void> {
        const SQLite = getSQLite();
        const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(
                () => reject(new Error('Database connection timeout')),
                10000,
            );
        });

        try {
            await Promise.race([
                this._initializeDatabase(SQLite),
                timeoutPromise,
            ]);
        } catch (error) {
            console.error('Database initialization failed:', error);
            this.availability = false;
            throw error; // Propagate to fail operations
        }
        this.availability = true;
    }

    private async _initializeDatabase(SQLite: any): Promise<void> {
        console.log('Starting database initialization'); // Added log
        try {
            // Try createConnection (preferred for reusability)
            console.log('Attempting createConnection');
            this.db = await SQLite.createConnection({
                database: this.dbName,
                version: 1, // Add version for potential migrations
                encrypted: false, // Enable if needed via config
                mode: 'no-encryption',
                readonly: false,
            });
            console.log('createConnection succeeded; opening');
            await this.db.open();
        } catch (connError) {
            console.warn(
                'createConnection failed; falling back to direct open:',
                connError,
            );
            // Fallback to direct plugin usage (as in original code)
            this.db = SQLite;
            try {
                console.log('Attempting direct open');
                await this.db.open({ database: this.dbName });
                console.log('Direct open succeeded');
            } catch (openError) {
                console.error('Direct open failed:', openError);
                throw openError; // Fail if both attempts error
            }
        }

        // Create table once (works for both modes)
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await this.executeQuery(createTableQuery, []); // Use helper for consistency
        console.log('Table created/verified');
    }

    // Helper for execute (handles connection vs. direct modes)
    private async executeQuery(
        statement: string,
        values: any[] = [],
    ): Promise<any> {
        if (this.db === getSQLite()) {
            // Direct mode
            return this.db.execute({
                database: this.dbName,
                statements: statement,
                values,
            });
        } else {
            // Connection mode
            return this.db.execute(statement, values);
        }
    }

    // Helper for run (parameterized, handles modes)
    private async runQuery(statement: string, values: any[]): Promise<any> {
        if (this.db === getSQLite()) {
            // Direct mode
            return this.db.run({
                database: this.dbName,
                statement,
                values,
            });
        } else {
            // Connection mode
            return this.db.run(statement, values);
        }
    }

    // Helper for query (handles modes)
    private async queryData(
        statement: string,
        values: any[] = [],
    ): Promise<any> {
        if (this.db === getSQLite()) {
            // Direct mode
            return this.db.query({
                database: this.dbName,
                statement,
                values,
            });
        } else {
            // Connection mode
            return this.db.query(statement, values);
        }
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.initPromise) {
            throw new Error('Initialization not started');
        }
        await this.initPromise;
        if (!this.availability) {
            throw new Error('SQLite storage is not available');
        }
    }

    async setItem<T>(key: string, value: T): Promise<void> {
        await this.ensureInitialized();
        const serializedValue =
            typeof value === 'string' ? value : JSON.stringify(value);
        try {
            await this.runQuery(
                `INSERT OR REPLACE INTO ${this.tableName} (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
                [key, serializedValue],
            );
        } catch (error) {
            console.error('SQLite setItem error:', error);
            throw new Error(
                `Failed to store item: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`,
            );
        }
    }

    async getItem<T>(key: string): Promise<T | null> {
        await this.ensureInitialized();
        try {
            const result = await this.queryData(
                `SELECT value FROM ${this.tableName} WHERE key = ?`,
                [key],
            );
            if (result.values && result.values.length > 0) {
                const value = result.values[0].value;
                try {
                    return JSON.parse(value) as T;
                } catch {
                    return value as T;
                }
            }
            return null;
        } catch (error) {
            console.error('SQLite getItem error:', error);
            return null;
        }
    }

    async removeItem(key: string): Promise<void> {
        await this.ensureInitialized();
        await this.runQuery(`DELETE FROM ${this.tableName} WHERE key = ?`, [
            key,
        ]);
    }

    async clear(): Promise<void> {
        await this.ensureInitialized();
        await this.executeQuery(`DELETE FROM ${this.tableName}`);
    }

    async keys(): Promise<string[]> {
        await this.ensureInitialized();
        const result = await this.queryData(
            `SELECT key FROM ${this.tableName}`,
        );
        return result.values ? result.values.map((row: any) => row.key) : [];
    }

    async isAvailable(): Promise<boolean> {
        if (this.availabilityChecked) return this.availability;
        try {
            await this.ensureInitialized();
            await this.queryData('SELECT 1');
            this.availability = true;
        } catch (error) {
            console.warn('SQLite availability check failed:', error); // Enhanced log
            this.availability = false;
        }
        this.availabilityChecked = true;
        return this.availability;
    }

    async getStorageInfo(): Promise<{
        quota: number;
        usage: number;
        available: number;
    }> {
        return {
            quota: -1, // Unknown (device-dependent)
            usage: -1, // not worth another plugin for this info, hard to get in logs
            available: -1, // Unknown
        };
    }
}

export const createAndroidStorage = (): CashtabStorage => {
    return new AndroidStorageAdapter();
};

// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { CashtabStorage } from '../types';

/**
 * android storage adaptor for Cashtab
 *
 * This is designed to support existing Cashtab storage types, which are key-value
 * based for web use (indexedDb for web and chrome.storage for extension)
 *
 * How it works
 * 1. We use android sqlite to store all data except the "wallets" key. This data can be of
 *    arbitrary size, as it contains things like tx history and cached token information.
 * 2. We use hardware-encrypted android secure storage to store only the "wallets" key,
 *    which contains wallet mnemonics, private keys, and wif.
 *
 * This is a simplified approach that stores the entire "wallets" key in secure storage
 * and everything else in SQLite, without any data splitting or reconstruction.
 */

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

/**
 * Minimal, late-bound wrapper around Capacitor Secure Storage to avoid
 * pulling Capacitor into web/extension bundles.
 */
function getSecureStorage() {
    const w = (globalThis as any).window || (globalThis as any);
    const CapacitorInstance =
        (w as any).Capacitor || (globalThis as any).Capacitor;
    if (!CapacitorInstance) {
        throw new Error('Capacitor not available');
    }

    const SecureStorage = CapacitorInstance.Plugins?.SecureStorage;
    if (!SecureStorage) {
        throw new Error('Capacitor Secure Storage plugin not available');
    }
    return SecureStorage;
}

export class AndroidStorageAdapter implements CashtabStorage {
    private availabilityChecked = false;
    private availability = false;
    private db: any = null;
    private secureStorage: any = null;
    private readonly dbName = 'cashtab.db';
    private readonly tableName = 'key_value_store';
    private readonly secureStoragePrefix = 'cashtab_secure_';

    constructor() {
        // Don't initialize immediately - wait for first use
        this.availability = false;
        this.availabilityChecked = false;
    }

    private async initializeDatabase(): Promise<void> {
        try {
            // Get plugins with correct names
            const SQLite = getSQLite();
            const SecureStorage = getSecureStorage();

            // Initialize secure storage for private keys
            this.secureStorage = SecureStorage;

            // Initialize SQLite
            this.db = SQLite;

            // Create connection
            try {
                await this.db.createConnection({
                    database: this.dbName,
                    version: 1,
                    encrypted: false,
                    mode: 'no-encryption',
                    readonly: false,
                });
            } catch (error) {
                console.error(
                    'AndroidStorageAdapter: SQLite connection creation failed:',
                    error,
                );
                throw error;
            }

            try {
                await this.db.open({ database: this.dbName });
            } catch (error) {
                console.error(
                    'AndroidStorageAdapter: SQLite database opening failed:',
                    error,
                );
                throw error;
            }

            // Only create table if we have a working SQLite connection
            if (this.db) {
                const createTableQuery = `
                    CREATE TABLE IF NOT EXISTS ${this.tableName} (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `;
                try {
                    await this.executeQuery(createTableQuery, []);
                } catch (error) {
                    console.error(
                        'AndroidStorageAdapter: Table creation failed:',
                        error,
                    );
                    throw error;
                }
            }

            this.availability = true;
        } catch (error) {
            console.error(
                'AndroidStorageAdapter: Database initialization failed:',
                error,
            );
            this.availability = false;
            throw error; // Re-throw to ensure the error is propagated
        }
    }

    private async executeQuery(
        statement: string,
        values: any[] = [],
    ): Promise<any> {
        return this.db!.execute({
            database: this.dbName,
            statements: statement,
            values,
        });
    }

    private async runQuery(statement: string, values: any[]): Promise<any> {
        return this.db!.run({
            database: this.dbName,
            statement,
            values,
        });
    }

    private async queryData(
        statement: string,
        values: any[] = [],
    ): Promise<any> {
        return this.db!.query({
            database: this.dbName,
            statement,
            values,
        });
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.availabilityChecked) {
            const isAvailable = await this._checkAvailability();
            if (!isAvailable) {
                console.error(
                    'AndroidStorageAdapter: Database not available after initialization',
                );
                throw new Error(
                    'AndroidStorageAdapter: Database initialization failed',
                );
            }
        }

        if (!this.availability) {
            console.error(
                'AndroidStorageAdapter: Database not available after initialization',
            );
            throw new Error(
                'AndroidStorageAdapter: Database initialization failed',
            );
        }
    }

    /**
     * Generate a secure storage key for wallet data
     */
    private getSecureKey(): string {
        return `${this.secureStoragePrefix}wallets`;
    }

    async setItem<T>(key: string, value: T): Promise<void> {
        await this.ensureInitialized();

        if (key === 'wallets') {
            // Store entire wallets data in secure storage
            const serializedValue = JSON.stringify(value);
            const secureKey = this.getSecureKey();

            try {
                await this.secureStorage.internalSetItem({
                    prefixedKey: secureKey,
                    data: serializedValue,
                    sync: false,
                    access: 0, // whenUnlocked
                });
            } catch (error) {
                console.error(
                    'AndroidStorageAdapter: Secure Storage set error for wallets:',
                    error,
                );
                throw error;
            }
        } else {
            // Store all other data in SQLite
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
    }

    async getItem<T>(key: string): Promise<T | null> {
        await this.ensureInitialized();

        if (key === 'wallets') {
            // Get wallets data from secure storage
            try {
                const secureKey = this.getSecureKey();
                const result = await this.secureStorage.internalGetItem({
                    prefixedKey: secureKey,
                    sync: false,
                });

                if (result.data) {
                    return JSON.parse(result.data) as T;
                }
                return null;
            } catch (error) {
                console.error(
                    'Secure storage getItem error for wallets:',
                    error,
                );
                return null;
            }
        } else {
            // Get all other data from SQLite
            if (!this.db) {
                console.error(
                    `SQLite not available, returning null for key: ${key}`,
                );
                return null;
            }

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
    }

    async removeItem(key: string): Promise<void> {
        await this.ensureInitialized();

        if (key === 'wallets') {
            // Remove wallets data from secure storage
            const secureKey = this.getSecureKey();
            try {
                await this.secureStorage.internalRemoveItem({
                    prefixedKey: secureKey,
                    sync: false,
                });
            } catch (error) {
                console.warn(`Failed to remove secure data for wallets`, error);
            }
        } else {
            // Remove from SQLite
            await this.runQuery(`DELETE FROM ${this.tableName} WHERE key = ?`, [
                key,
            ]);
        }
    }

    /**
     * NB we do not use this method in Cashtab, but we do use it in testing
     * and it is part of the CashtabStorage interface.
     */
    async clear(): Promise<void> {
        await this.ensureInitialized();

        // Clear wallets from secure storage
        const secureKey = this.getSecureKey();
        try {
            await this.secureStorage.internalRemoveItem({
                prefixedKey: secureKey,
                sync: false,
            });
        } catch (error) {
            console.warn(`Failed to clear secure data for wallets`, error);
        }

        // Clear all other data from SQLite
        await this.runQuery(`DELETE FROM ${this.tableName}`, []);
    }

    /**
     * NB we do not use this method in Cashtab, but we do use it in testing
     * and it is part of the CashtabStorage interface.
     */
    async keys(): Promise<string[]> {
        await this.ensureInitialized();
        const result = await this.queryData(
            `SELECT key FROM ${this.tableName}`,
        );
        return result.values ? result.values.map((row: any) => row.key) : [];
    }

    async isAvailable(): Promise<boolean> {
        if (this.availabilityChecked) {
            return this.availability;
        }

        // Add a timeout to prevent hanging
        let timeoutId: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<boolean>(resolve => {
            timeoutId = setTimeout(() => {
                console.warn('Storage availability check timed out');
                if (!this.availabilityChecked) {
                    this.availability = false;
                    this.availabilityChecked = true;
                }
                resolve(false);
            }, 2000);
        });

        try {
            const result = await Promise.race([
                this._checkAvailability(),
                timeoutPromise,
            ]);

            // Clear the timeout if availability check completed
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            return result;
        } catch (error) {
            // Clear the timeout if there was an error
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            console.warn(
                'AndroidStorageAdapter: Storage availability check failed:',
                error,
            );
            if (!this.availabilityChecked) {
                this.availability = false;
                this.availabilityChecked = true;
            }
            return false;
        }
    }

    private async _checkAvailability(): Promise<boolean> {
        try {
            // Get plugins
            const SQLite = getSQLite();
            const SecureStorage = getSecureStorage();

            if (!SQLite || !SecureStorage) {
                this.availability = false;
                this.availabilityChecked = true;
                return false;
            }

            // Actually initialize the database
            await this.initializeDatabase();

            this.availability = true;
            this.availabilityChecked = true;
            return true;
        } catch (error) {
            console.error(
                'AndroidStorageAdapter: Database availability check failed:',
                error,
            );
            this.availability = false;
            this.availabilityChecked = true;
            return false;
        }
    }

    async getStorageInfo(): Promise<{
        quota: number;
        usage: number;
        available: number;
    }> {
        // For Android, we use SQLite (unlimited) + Secure Storage (hardware encrypted)
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

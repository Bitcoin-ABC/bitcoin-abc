// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { CashtabStorage } from '../types';
import { CashtabWallet, StoredCashtabState } from 'wallet';
import { StoredCashtabWallet } from 'helpers';

/**
 * android storage adaptor for Cashtab
 *
 * This is designed to support existing Cashtab storage types, which are key-value
 * based for web use (indexedDb for web and chrome.storage for extension)
 *
 * We anticipate migrating to a sqlite based storage system in the future, but step one is
 * implementing the existing architecture on android.
 *
 * How it works
 * 1. We use android sqlite to store data that does not contain private keys. This data can be of
 *    arbitrary size, as it contains things like tx history and cached token information. So, we
 *    cannot simply store it all in encrypted SharedPreferences, which may evict data if you are
 *    over about 1MB
 * 2. We use hardware-encrypted android secure storage to store data associated with private keys,
 *    i.e. wallet mnemonics, private keys, and wif.
 *
 * This adaptor splits out the data stored at the "wallets" key of Cashtab into SanitizedCashtabWallet[],
 * which goes into sqlite, and SecureWalletData (private keys), which goes into secure storage. When Cashtab
 * writes data, we deconstruct the wallets to store in this way. When Cashtab reads data, we reconstruct
 * the wallets that Cashtab expects.
 *
 * Future optimizations
 * - We should simplify secure storage and minimize its reads and writes.
 * - We are not using sqlite for optimal queries. Instead, we are shoving in existing key-value patterns
 *   into sqlite as this is where we have more room to run on android. Going forward, Cashtab web and
 *   extension should be refactored to use sqlite with optimized queries, and the android adaptor should
 *   be extended to support this.
 *
 * These optimizations are pending the implementation of ecash-wallet in Cashtab and the implementation of
 * sqlite in Cashtab web and extension.
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

/**
 * Interface for sanitized wallet data (without private keys, mnemonics, and wif)
 */
interface SanitizedCashtabPathInfo {
    address: string;
    hash: string;
    pk: number[];
}

interface SanitizedCashtabWallet {
    name: string;
    paths: Array<[number, SanitizedCashtabPathInfo]>;
    state: StoredCashtabState;
}

/**
 * Interface for secure storage data (private keys, mnemonics, and wif)
 */
interface SecurePathData {
    sk: number[];
    wif: string;
}

interface SecureWalletData {
    mnemonic: string;
    securePaths: Map<number, SecurePathData>; // path -> {sk, wif} mapping
}

/**
 * Interface for serializable secure wallet data (for JSON storage)
 */
interface SerializableSecureWalletData {
    mnemonic: string;
    securePaths: Array<[number, { sk: number[]; wif: string }]>;
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
     * Convert a StoredCashtabWallet to a sanitized version without private keys and mnemonics
     */
    private sanitizeWallet(
        wallet: StoredCashtabWallet,
    ): SanitizedCashtabWallet {
        const sanitizedPaths: Array<[number, SanitizedCashtabPathInfo]> =
            wallet.paths.map(([path, pathInfo]) => [
                path,
                {
                    address: pathInfo.address,
                    hash: pathInfo.hash,
                    pk: pathInfo.pk,
                },
            ]);

        return {
            name: wallet.name,
            paths: sanitizedPaths,
            state: wallet.state,
        };
    }

    /**
     * Extract secure data (mnemonic, private keys, and wif) from a wallet
     */
    private extractSecureData(wallet: StoredCashtabWallet): SecureWalletData {
        const securePaths = new Map<number, SecurePathData>();

        wallet.paths.forEach(([path, pathInfo]) => {
            securePaths.set(path, {
                sk: pathInfo.sk,
                wif: pathInfo.wif,
            });
        });

        return {
            mnemonic: wallet.mnemonic,
            securePaths,
        };
    }

    /**
     * Reconstruct a full wallet from sanitized data and secure data
     */
    private reconstructWallet(
        sanitizedWallet: SanitizedCashtabWallet,
        secureData: SecureWalletData,
    ): any {
        const reconstructedPaths: Array<[number, any]> = [];

        // Process array format paths
        sanitizedWallet.paths.forEach(([path, pathInfo]) => {
            const securePathData = secureData.securePaths.get(path);
            if (!securePathData) {
                // Not expected to happen, satisfies ts
                throw new Error(`Missing secure data for path ${path}`);
            }

            reconstructedPaths.push([
                path,
                {
                    address: pathInfo.address,
                    hash: pathInfo.hash,
                    wif: securePathData.wif,
                    pk: pathInfo.pk,
                    sk: securePathData.sk,
                },
            ]);
        });

        return {
            name: sanitizedWallet.name,
            mnemonic: secureData.mnemonic,
            paths: reconstructedPaths,
            state: sanitizedWallet.state,
        };
    }

    /**
     * Generate a secure storage key for all wallet data
     */
    private getSecureKey(): string {
        return `${this.secureStoragePrefix}wallets`;
    }

    async setItem<T>(key: string, value: T): Promise<void> {
        await this.ensureInitialized();
        // Special handling for wallet data - split into sanitized and secure storage
        if (key === 'wallets' && Array.isArray(value)) {
            const wallets: StoredCashtabWallet[] =
                value as StoredCashtabWallet[];

            // Store sanitized wallets in SQLite
            const sanitizedWallets = wallets.map(wallet =>
                this.sanitizeWallet(wallet),
            );

            const serializedSanitizedWallets = JSON.stringify(sanitizedWallets);

            await this.runQuery(
                `INSERT OR REPLACE INTO ${this.tableName} (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
                [key, serializedSanitizedWallets],
            );

            // Store secure data (mnemonics and private keys) in secure storage
            const allSecureData: {
                [walletName: string]: SerializableSecureWalletData;
            } = {};

            for (const wallet of wallets) {
                const secureData = this.extractSecureData(wallet);

                if (
                    !secureData.securePaths ||
                    !(secureData.securePaths instanceof Map)
                ) {
                    // Not expected to happen, satisfies ts
                    console.error(
                        'Invalid securePaths in secureData:',
                        secureData.securePaths,
                    );
                    throw new Error('Invalid securePaths in secureData');
                }

                const serializableSecurePaths: Array<
                    [number, { sk: number[]; wif: string }]
                > = Array.from(secureData.securePaths.entries()).map(
                    ([path, securePathData]) => [
                        path,
                        {
                            sk: securePathData.sk,
                            wif: securePathData.wif,
                        },
                    ],
                );

                allSecureData[wallet.name] = {
                    mnemonic: secureData.mnemonic,
                    securePaths: serializableSecurePaths,
                };
            }

            const serializedAllSecureData = JSON.stringify(allSecureData);
            const secureKey = this.getSecureKey();

            try {
                // Try to use the internal API with the correct parameter format
                await this.secureStorage.internalSetItem({
                    prefixedKey: secureKey,
                    data: serializedAllSecureData,
                    sync: false,
                    access: 0, // whenUnlocked
                });
            } catch (error) {
                console.error(
                    'AndroidStorageAdapter: Secure Storage set error for all secure data:',
                    error,
                );
                throw error;
            }
        } else {
            // For data with no private key info, i.e. anything that is not wallets, store directly in sqlite

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
        // Special handling for wallet data - reconstruct from sanitized and secure storage
        if (key === 'wallets') {
            let sanitizedWalletsData: string | null = null;

            if (this.db) {
                // Try to get sanitized data from SQLite
                try {
                    const result = await this.queryData(
                        `SELECT value FROM ${this.tableName} WHERE key = ?`,
                        [key],
                    );
                    if (result.values && result.values.length > 0) {
                        sanitizedWalletsData = result.values[0].value;
                    }
                } catch (err) {
                    console.error(
                        'AndroidStorageAdapter: SQLite query failed:',
                        err,
                    );
                }
            }

            if (!sanitizedWalletsData) {
                return null;
            }

            try {
                const sanitizedWallets: SanitizedCashtabWallet[] =
                    key === 'wallets'
                        ? JSON.parse(sanitizedWalletsData)
                        : [JSON.parse(sanitizedWalletsData)]; // Single wallet case

                // Reconstruct full wallets by combining with secure data
                const reconstructedWallets: CashtabWallet[] = [];

                for (const sanitizedWallet of sanitizedWallets) {
                    try {
                        // Get all secure data from single key
                        const secureKey = this.getSecureKey();

                        const result = await this.secureStorage.internalGetItem(
                            {
                                prefixedKey: secureKey,
                                sync: false,
                            },
                        );
                        const allSecureDataString = result.data;

                        if (allSecureDataString) {
                            const allSecureDataParsed =
                                JSON.parse(allSecureDataString);

                            const walletSecureData =
                                allSecureDataParsed[sanitizedWallet.name];
                            if (walletSecureData) {
                                // Convert securePaths array back to Map
                                const securePathsMap = new Map<
                                    number,
                                    SecurePathData
                                >();
                                walletSecureData.securePaths.forEach(
                                    ([path, pathData]: [
                                        number,
                                        { sk: number[]; wif: string },
                                    ]) => {
                                        const bytes = pathData.sk;
                                        securePathsMap.set(path, {
                                            sk: bytes,
                                            wif: pathData.wif,
                                        });
                                    },
                                );

                                const secureData: SecureWalletData = {
                                    mnemonic: walletSecureData.mnemonic,
                                    securePaths: securePathsMap,
                                };

                                const reconstructedWallet =
                                    this.reconstructWallet(
                                        sanitizedWallet,
                                        secureData,
                                    );

                                reconstructedWallets.push(reconstructedWallet);
                            } else {
                                console.error(
                                    `Secure data not found for wallet: ${sanitizedWallet.name}`,
                                );
                                throw new Error(
                                    `Wallet data appears to be corrupted. Secure data missing for wallet "${sanitizedWallet.name}". Please restore from backup or contact support.`,
                                );
                            }
                        } else {
                            console.error(
                                `No secure data found for any wallets`,
                            );
                            throw new Error(
                                'Wallet data appears to be corrupted. Private keys and mnemonics are missing from secure storage. Please restore from backup or contact support.',
                            );
                        }
                    } catch (error) {
                        console.error(
                            `Failed to reconstruct wallet ${sanitizedWallet.name}:`,
                            error,
                        );
                        console.error(
                            `Error stack:`,
                            error instanceof Error
                                ? error.stack
                                : 'No stack trace',
                        );
                        // Re-throw the error so it bubbles up
                        throw error;
                    }
                }

                return reconstructedWallets as T;
            } catch (error) {
                console.error(
                    `Error reconstructing wallets for ${key}:`,
                    error,
                );
                // Re-throw the error so the caller can handle it
                throw error;
            }
        } else {
            // For non-wallet data, retrieve normally from SQLite

            // If SQLite is not available, return null for new user
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
        // Special handling for wallet data - remove both sanitized and secure data
        if (key === 'wallets') {
            // Remove the single secure key for all wallets
            const secureKey = this.getSecureKey();
            try {
                await this.secureStorage.internalRemoveItem({
                    prefixedKey: secureKey,
                    sync: false,
                });
            } catch (error) {
                console.warn(`Failed to remove secure data for wallets`, error);
            }
        }

        // Remove from SQLite
        await this.runQuery(`DELETE FROM ${this.tableName} WHERE key = ?`, [
            key,
        ]);
    }

    /**
     * NB we do not use this method in Cashtab, but we do use it in testing
     * and it is part of the CashtabStorage interface.
     */
    async clear(): Promise<void> {
        await this.ensureInitialized();
        // Clear all secure storage keys
        const keys = await this.keys();
        for (const key of keys) {
            if (key === 'wallets') {
                await this.removeItem(key); // This will handle both sanitized and secure data
            } else {
                await this.removeItem(key);
            }
        }
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

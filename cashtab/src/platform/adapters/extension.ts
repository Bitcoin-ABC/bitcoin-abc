// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { CashtabStorage } from '../types';
import { migrateFromLocalforageIfNeeded } from './extensionMigration';
import { getChromeAPI, isChromeExtensionContext } from '../types/chrome';

/**
 * Extension storage adapter using chrome.storage.local
 * This provides more persistent storage than web storage for browser extensions
 */
export class ExtensionStorageAdapter implements CashtabStorage {
    private isAvailableCache: boolean | null = null;

    async setItem<T>(key: string, value: T): Promise<void> {
        if (!(await this.isAvailable())) {
            throw new Error('Extension storage is not available');
        }

        try {
            const chrome = getChromeAPI();
            await chrome.storage.local.set({
                [key]: value,
            });
        } catch (error) {
            console.error(`Failed to store item with key ${key}:`, error);
            throw new Error(
                `Extension storage failed: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`,
            );
        }
    }

    async getItem<T>(key: string): Promise<T | null> {
        if (!(await this.isAvailable())) {
            return null;
        }

        try {
            const chrome = getChromeAPI();
            const result = await chrome.storage.local.get([key]);
            let value = result[key];

            // Reactive migration
            // If we find nothing in a get request, this is either a new Cashtab user with no
            // data or this is an existing user on an extension version before 4.32.0 where
            // data was stored in localforage
            if (value === undefined || value === null) {
                if (key === 'wallets') {
                    // It's only the wallets key check on startup where we would want to migrate
                    console.info(
                        'No Cashtab wallet data found in extension storage, checking localforage for migration',
                    );
                    // Try to migrate from localforage if this is a fresh extension storage
                    const migrationResult =
                        await migrateFromLocalforageIfNeeded();
                    if (
                        migrationResult.success &&
                        migrationResult.migratedKeys.includes('wallets')
                    ) {
                        // Re-fetch after migration
                        const newResult = await chrome.storage.local.get([key]);
                        value = newResult[key];
                    }
                }

                if (value === undefined || value === null) {
                    return null;
                }
            }

            return value as T;
        } catch (error) {
            console.error(`Failed to retrieve item with key ${key}:`, error);
            // For backwards compatibility, return null on error rather than throwing
            return null;
        }
    }

    async removeItem(key: string): Promise<void> {
        if (!(await this.isAvailable())) {
            throw new Error('Extension storage is not available');
        }

        try {
            const chrome = getChromeAPI();
            await chrome.storage.local.remove([key]);
        } catch (error) {
            console.error(`Failed to remove item with key ${key}:`, error);
            throw new Error(
                `Extension remove failed: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`,
            );
        }
    }

    async clear(): Promise<void> {
        if (!(await this.isAvailable())) {
            throw new Error('Extension storage is not available');
        }

        try {
            const chrome = getChromeAPI();
            await chrome.storage.local.clear();
        } catch (error) {
            console.error('Failed to clear extension storage:', error);
            throw new Error(
                `Extension clear failed: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`,
            );
        }
    }

    async keys(): Promise<string[]> {
        if (!(await this.isAvailable())) {
            return [];
        }

        try {
            const chrome = getChromeAPI();
            const result = await chrome.storage.local.get(null);
            return Object.keys(result);
        } catch (error) {
            console.error('Failed to get extension storage keys:', error);
            return [];
        }
    }

    async isAvailable(): Promise<boolean> {
        // Cache the result since extension availability doesn't change during runtime
        if (this.isAvailableCache !== null) {
            return this.isAvailableCache;
        }

        try {
            if (!isChromeExtensionContext()) {
                this.isAvailableCache = false;
                return false;
            }

            // Test storage availability by trying to get storage quota
            const chrome = getChromeAPI();
            await chrome.storage.local.getBytesInUse();
            this.isAvailableCache = true;
            return true;
        } catch {
            this.isAvailableCache = false;
            return false;
        }
    }

    async getStorageInfo(): Promise<{
        quota?: number;
        usage?: number;
        available?: number;
    }> {
        if (!(await this.isAvailable())) {
            return {};
        }

        try {
            const chrome = getChromeAPI();
            const usage = await chrome.storage.local.getBytesInUse();
            // Extension has unlimitedStorage permission, so only report usage

            return {
                usage,
            };
        } catch (error) {
            console.warn('Could not get extension storage info:', error);
            return {};
        }
    }
}

/**
 * Factory function to create extension storage adapter
 */
export const createExtensionStorage = (): CashtabStorage => {
    return new ExtensionStorageAdapter();
};

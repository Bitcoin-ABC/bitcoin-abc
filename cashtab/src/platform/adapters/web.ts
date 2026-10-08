// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import localforage from 'localforage';
import { CashtabStorage } from '../types';

/**
 * Web storage adapter using localforage
 * This wraps the existing localforage implementation that Cashtab currently uses
 */
export class WebStorageAdapter implements CashtabStorage {
    async setItem<T>(key: string, value: T): Promise<void> {
        try {
            await localforage.setItem(key, value);
        } catch (error) {
            console.error(`Failed to store item with key ${key}:`, error);
            throw new Error(
                `Storage failed: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`,
            );
        }
    }

    async getItem<T>(key: string): Promise<T | null> {
        try {
            const value = await localforage.getItem<T>(key);
            return value;
        } catch (error) {
            console.error(`Failed to retrieve item with key ${key}:`, error);
            // For backwards compatibility, return null on error rather than throwing
            return null;
        }
    }

    async removeItem(key: string): Promise<void> {
        try {
            await localforage.removeItem(key);
        } catch (error) {
            console.error(`Failed to remove item with key ${key}:`, error);
            throw new Error(
                `Remove failed: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`,
            );
        }
    }

    async clear(): Promise<void> {
        try {
            await localforage.clear();
        } catch (error) {
            console.error('Failed to clear storage:', error);
            throw new Error(
                `Clear failed: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`,
            );
        }
    }

    async keys(): Promise<string[]> {
        try {
            return await localforage.keys();
        } catch (error) {
            console.error('Failed to get storage keys:', error);
            return [];
        }
    }

    /**
     * One IndexedDB read of every pair.
     */
    async entries(): Promise<[string, unknown][]> {
        await localforage.ready();
        const dbInfo = (
            localforage as unknown as {
                _dbInfo?: { db?: IDBDatabase; storeName?: string };
            }
        )._dbInfo;
        const db = dbInfo?.db;
        const storeName = dbInfo?.storeName;
        if (
            db === undefined ||
            storeName === undefined ||
            typeof db.transaction !== 'function'
        ) {
            return this.entriesByKey();
        }
        // transaction() throws InvalidStateError when the connection is closing.
        // The Promise executor would reject that, and boot would fail with no fallback.
        let tx: IDBTransaction;
        try {
            tx = db.transaction(storeName, 'readonly');
        } catch (error) {
            console.error('Bulk storage read failed to open:', error);
            return this.entriesByKey();
        }
        return new Promise((resolve, reject) => {
            const objectStore = tx.objectStore(storeName);
            const keysRequest = objectStore.getAllKeys();
            const valuesRequest = objectStore.getAll();
            tx.oncomplete = () => {
                const keys = keysRequest.result;
                const values = valuesRequest.result;
                resolve(keys.map((key, index) => [String(key), values[index]]));
            };
            tx.onerror = () => {
                reject(tx.error ?? new Error('Failed to read storage entries'));
            };
            // Abort can fire without onerror when the database closes.
            tx.onabort = () => {
                reject(tx.error ?? new Error('Storage entries read aborted'));
            };
        });
    }

    private async entriesByKey(): Promise<[string, unknown][]> {
        const keys = await this.keys();
        const pairs: [string, unknown][] = [];
        for (const key of keys) {
            pairs.push([key, await localforage.getItem(key)]);
        }
        return pairs;
    }

    async isAvailable(): Promise<boolean> {
        try {
            // Test storage availability by trying to store and retrieve a test value
            const testKey = '__cashtab_storage_test__';
            const testValue = 'test';

            await localforage.setItem(testKey, testValue);
            const retrieved = await localforage.getItem(testKey);
            await localforage.removeItem(testKey);

            return retrieved === testValue;
        } catch {
            return false;
        }
    }

    async getStorageInfo(): Promise<{
        quota?: number;
        usage?: number;
        available?: number;
    }> {
        try {
            // Try to get storage quota information if available
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                return {
                    quota: estimate.quota,
                    usage: estimate.usage,
                    available:
                        estimate.quota && estimate.usage
                            ? estimate.quota - estimate.usage
                            : undefined,
                };
            }
        } catch (error) {
            console.warn('Could not get storage estimate:', error);
        }

        return {};
    }
}

/**
 * Factory function to create web storage adapter
 */
export const createWebStorage = (): CashtabStorage => {
    return new WebStorageAdapter();
};

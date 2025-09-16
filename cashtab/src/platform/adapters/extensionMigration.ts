// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Extension Storage Migration
 *
 * Migrates existing extension users from localforage + chrome.storage.sync
 * to the new unified chrome.storage.local approach
 */

import localforage from 'localforage';
import { getChromeAPI } from '../types/chrome';
import { SUPPORTED_CASHTAB_STORAGE_KEYS } from 'config/storage';
import type { LegacyCashtabWallet, StoredCashtabWallet } from 'wallet';

// Use the canonical storage keys list that includes legacy keys (savedWallets, wallet)

/**
 * Type definition for migration result
 */
export interface MigrationResult {
    success: boolean;
    migratedKeys: string[];
    errors: string[];
}

/**
 * Type definition for storage values that can be migrated
 */
type StorageValue =
    | (StoredCashtabWallet | LegacyCashtabWallet)[]
    | Record<string, unknown>
    | unknown[]
    | string
    | number
    | boolean
    | null;

/**
 * Check if we have data in localforage that could be migrated
 * This is only called when chrome.storage.local is empty/minimal
 */
const hasLocalforageData = async (): Promise<boolean> => {
    console.info('Checking localforage for data to migrate');
    try {
        // Only migrate if we have required keys: cashtabCache, wallets
        // This means we handle any legacy wallet migration in localforage before moving that to chrome.storage.local
        const requiredKeys = ['cashtabCache', 'wallets'];

        for (const key of requiredKeys) {
            const value = await localforage.getItem<StorageValue>(key);
            if (value === null) {
                return false; // Missing required key, don't migrate
            }
            console.info(`Found ${key} in localforage`);
        }
        return true; // All required keys present, safe to migrate
    } catch (error) {
        console.warn('Error checking localforage data:', error);
        return false;
    }
};

/**
 * Reactive migration: Check if chrome.storage.local is empty/minimal and if so,
 * migrate from localforage if data exists there
 */
export const migrateFromLocalforageIfNeeded =
    async (): Promise<MigrationResult> => {
        try {
            const chrome = getChromeAPI();

            // Check what's currently in chrome.storage.local
            const existingData = await chrome.storage.local.get(['wallets']);
            const hasWallets =
                existingData.wallets &&
                Array.isArray(existingData.wallets) &&
                existingData.wallets.length > 0;

            // If we already have wallet data, no migration needed
            if (hasWallets) {
                return {
                    success: true,
                    migratedKeys: [],
                    errors: [],
                };
            }

            // Check if we have data in localforage to migrate
            if (!(await hasLocalforageData())) {
                console.info(
                    'No data in localforage to migrate, skipping migration',
                );
                return {
                    success: true,
                    migratedKeys: [],
                    errors: [],
                };
            }

            console.info(
                'No wallet data in chrome.storage.local but found data in localforage, migrating...',
            );
            return await migrateExtensionStorage();
        } catch (error) {
            console.error('Error during reactive migration check:', error);
            return {
                success: false,
                migratedKeys: [],
                errors: [
                    error instanceof Error ? error.message : 'Unknown error',
                ],
            };
        }
    };

/**
 * Migrate data from localforage to chrome.storage.local
 * Note we do not migrate legacy keys
 * Note we do not do any JSON revival; we store in chrome local same as localforage
 */
export const migrateExtensionStorage = async (): Promise<MigrationResult> => {
    const migratedKeys: string[] = [];
    const errors: string[] = [];

    try {
        const chrome = getChromeAPI();
        console.info('Starting extension storage migration...');

        // Migrate all non-legacy keys
        const LEGACY_KEYS = ['wallet', 'savedWallets'];

        for (const key of SUPPORTED_CASHTAB_STORAGE_KEYS) {
            if (LEGACY_KEYS.includes(key)) {
                // We do not migrate legacy keys
                continue;
            }
            try {
                const value = await localforage.getItem<StorageValue>(key);
                if (value !== null) {
                    // Migrate to chrome.storage.local
                    await chrome.storage.local.set({
                        [key]: value,
                    });
                    migratedKeys.push(key);
                    console.info(`Migrated ${key} to chrome.storage.local`);
                }
            } catch (error) {
                const errorMsg = `Failed to migrate ${key}: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`;
                console.error(errorMsg);
                errors.push(errorMsg);
            }
        }

        // Mark migration as complete
        console.info(
            `Extension storage migration completed. Migrated ${migratedKeys.length} keys.`,
        );

        return {
            success: errors.length === 0,
            migratedKeys,
            errors,
        };
    } catch (error) {
        const errorMsg = `Migration failed: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`;
        console.error(errorMsg);
        return {
            success: false,
            migratedKeys,
            errors: [...errors, errorMsg],
        };
    }
};

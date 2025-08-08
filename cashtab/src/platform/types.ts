// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Platform detection interface
 */
export interface PlatformInfo {
    isWeb: boolean;
    isExtension: boolean;
    platform: 'web' | 'extension';
}

/**
 * Unified storage interface that all platform adapters must implement
 * This abstracts the differences between localforage, chrome.storage, and Capacitor Storage
 */
export interface CashtabStorage {
    /**
     * Store a value
     * @param key Storage key
     * @param value Value to store (will be JSON stringified if not already a string)
     */
    setItem<T>(key: string, value: T): Promise<void>;

    /**
     * Retrieve a value
     * @param key Storage key
     * @returns Stored value or null if not found
     */
    getItem<T>(key: string): Promise<T | null>;

    /**
     * Remove a value
     * @param key Storage key
     */
    removeItem(key: string): Promise<void>;

    /**
     * Clear all storage
     */
    clear(): Promise<void>;

    /**
     * Get all keys
     */
    keys(): Promise<string[]>;

    /**
     * Check if storage is available and working
     */
    isAvailable(): Promise<boolean>;

    /**
     * Get storage info (size, usage, etc.)
     */
    getStorageInfo?(): Promise<{
        quota?: number;
        usage?: number;
        available?: number;
    }>;
}

/**
 * Storage adapter factory function type
 */
export type StorageAdapterFactory = () => CashtabStorage;

/**
 * Platform-specific storage configuration
 */
export interface PlatformStorageConfig {
    adapter: StorageAdapterFactory;
    isPersistent: boolean;
    maxSize?: number;
    description: string;
}

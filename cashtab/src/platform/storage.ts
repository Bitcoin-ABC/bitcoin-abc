// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { CashtabStorage, PlatformStorageConfig } from './types';
import { platformInfo } from './detection';
import { createWebStorage } from './adapters/web';
import { createExtensionStorage } from './adapters/extension';
import { createAndroidStorage } from './adapters/android';

/**
 * Storage configuration for each platform
 */
const PLATFORM_STORAGE_CONFIG: Record<string, PlatformStorageConfig> = {
    'web': {
        adapter: createWebStorage,
        isPersistent: false, // Can be cleared by browser
        // Note: Not encrypted, relies on browser security
        description: 'IndexedDB via localforage with localStorage fallback',
    },
    'extension': {
        adapter: createExtensionStorage,
        isPersistent: true, // More persistent than web storage
        // Note: Not encrypted, but isolated from web context
        description: 'Chrome extension storage (chrome.storage.local)',
    },
    'capacitor-android': {
        adapter: createAndroidStorage,
        isPersistent: true,
        description: 'SQLite Database (unlimited storage)',
    },
};

/**
 * Get the storage configuration for the current platform
 */
export const getCurrentStorageConfig = (): PlatformStorageConfig => {
    const config = PLATFORM_STORAGE_CONFIG[platformInfo.platform];
    if (!config) {
        console.warn(
            `No storage config found for platform: ${platformInfo.platform}, falling back to web`,
        );
        return PLATFORM_STORAGE_CONFIG.web;
    }
    return config;
};

/**
 * Create the appropriate storage adapter for the current platform
 */
export const createPlatformStorage = (): CashtabStorage => {
    const config = getCurrentStorageConfig();
    console.info(
        `Initializing ${platformInfo.platform} storage: ${config.description}`,
    );

    try {
        return config.adapter();
    } catch (error) {
        console.error(
            `Failed to create ${platformInfo.platform} storage:`,
            error,
        );
        console.warn('Falling back to web storage');
        return createWebStorage();
    }
};

/**
 * Global storage instance
 * This is the main storage interface that should be used throughout Cashtab
 */
let storageInstance: CashtabStorage | null = null;

/**
 * Get the global storage instance
 * This ensures we use the same storage adapter throughout the app
 */
export const getStorage = (): CashtabStorage => {
    if (!storageInstance) {
        storageInstance = createPlatformStorage();
    }
    return storageInstance;
};

/**
 * Initialize storage and verify it's working
 * This should be called during app startup
 */
export const initializeStorage = async (): Promise<{
    success: boolean;
    platform: string;
    config: PlatformStorageConfig;
    storageInfo?: any;
    error?: string;
}> => {
    const config = getCurrentStorageConfig();

    try {
        const storage = getStorage();
        const isAvailable = await storage.isAvailable();

        if (!isAvailable) {
            throw new Error('Storage is not available');
        }

        const storageInfo = await storage.getStorageInfo?.();

        console.info(
            `Storage initialized successfully on ${platformInfo.platform}`,
        );
        console.info(
            `Storage config:`,
            JSON.stringify(
                {
                    env: platformInfo.platform,
                    persistent: config.isPersistent,
                    description: config.description,
                },
                null,
                2,
            ),
        );

        if (storageInfo) {
            console.info(
                `Storage info:`,
                JSON.stringify(
                    {
                        quota:
                            storageInfo.quota === -1
                                ? 'Unknown'
                                : `${storageInfo.quota} bytes`,
                        usage:
                            storageInfo.usage === -1
                                ? 'Unknown'
                                : `${storageInfo.usage} bytes`,
                        available:
                            storageInfo.available === -1
                                ? 'Unknown'
                                : `${storageInfo.available} bytes`,
                    },
                    null,
                    2,
                ),
            );
        }

        return {
            success: true,
            platform: platformInfo.platform,
            config,
            storageInfo,
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
        console.error(
            `Failed to initialize storage on ${platformInfo.platform}:`,
            error,
        );

        return {
            success: false,
            platform: platformInfo.platform,
            config,
            error: errorMessage,
        };
    }
};

/**
 * Helper functions for storage operations
 */
export const storage = {
    /**
     * Get an item from storage
     */
    get: <T>(key: string): Promise<T | null> => {
        return getStorage().getItem<T>(key);
    },

    /**
     * Set an item in storage
     */
    set: <T>(key: string, value: T): Promise<void> => {
        return getStorage().setItem(key, value);
    },

    /**
     * Remove an item from storage
     */
    remove: (key: string): Promise<void> => {
        return getStorage().removeItem(key);
    },

    /**
     * Clear all storage
     */
    clear: (): Promise<void> => {
        return getStorage().clear();
    },

    /**
     * Get all storage keys
     */
    keys: (): Promise<string[]> => {
        return getStorage().keys();
    },

    /**
     * Check if storage is available
     */
    isAvailable: (): Promise<boolean> => {
        return getStorage().isAvailable();
    },
};

// Export the storage instance for direct access when needed
export { getStorage as storage_direct };
export { platformInfo } from './detection';

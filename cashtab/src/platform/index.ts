// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Platform abstraction layer for Cashtab
 *
 * This module provides a unified interface for platform-specific functionality
 * including storage, device capabilities, and platform detection.
 *
 * Usage:
 *   import { storage, platformInfo, initializeStorage } from 'platform';
 *
 *   // Use storage throughout the app
 *   await storage.set('key', value);
 *   const value = await storage.get('key');
 *
 *   // Check platform
 *   if (platformInfo.isExtension) {
 *     // Extension-specific logic
 *   }
 */

// Core platform functionality
export {
    platformInfo,
    detectPlatform,
    isPlatform,
    isWebPlatform,
    isExtensionPlatform,
} from './detection';

// Storage functionality
export {
    storage,
    getStorage,
    initializeStorage,
    getCurrentStorageConfig,
    createPlatformStorage,
} from './storage';

// Types
export type {
    PlatformInfo,
    CashtabStorage,
    PlatformStorageConfig,
    StorageAdapterFactory,
} from './types';

// Platform adapters (for advanced usage)
export { createWebStorage } from './adapters/web';
export { createExtensionStorage } from './adapters/extension';
export { createAndroidStorage } from './adapters/android';

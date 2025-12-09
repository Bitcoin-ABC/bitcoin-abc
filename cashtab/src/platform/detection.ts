// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { PlatformInfo } from './types';

/**
 * Detect the current platform and return platform information
 */
export const detectPlatform = (): PlatformInfo => {
    // Detect Capacitor Android environment
    // We check for Capacitor globals without importing to avoid bundling on web
    const isCapacitorAndroid = (() => {
        try {
            const w = (globalThis as any).window || (globalThis as any);
            const Capacitor =
                (w as any).Capacitor || (globalThis as any).Capacitor;
            const capPlatform =
                Capacitor?.getPlatform?.() || Capacitor?.platform;
            return capPlatform === 'android';
        } catch {
            return false;
        }
    })();
    // Check if we're in a browser extension environment
    const isExtension = !!(
        typeof (globalThis as any).chrome !== 'undefined' &&
        (globalThis as any).chrome.runtime &&
        (globalThis as any).chrome.runtime.id
    );

    // Web is the default when not extension or capacitor android
    const isWeb = !isExtension && !isCapacitorAndroid;

    // Determine primary platform identifier
    const platform: PlatformInfo['platform'] = isExtension
        ? 'extension'
        : isCapacitorAndroid
          ? 'capacitor-android'
          : 'web';

    return {
        isWeb,
        isExtension,
        platform,
    };
};

/**
 * Global platform information
 * This is calculated once and cached
 */
export const platformInfo = detectPlatform();

/**
 * Type guard to check if we're in a specific platform
 */
export const isPlatform = (targetPlatform: string): boolean => {
    return platformInfo.platform === targetPlatform;
};

/**
 * Helper functions for common platform checks
 */
export const isWebPlatform = (): boolean => platformInfo.isWeb;
export const isExtensionPlatform = (): boolean => platformInfo.isExtension;

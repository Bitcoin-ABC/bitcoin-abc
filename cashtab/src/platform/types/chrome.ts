// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Chrome Extension Storage API type definitions
 */

export interface ChromeStorageLocal {
    get(keys: string | string[] | null): Promise<Record<string, unknown>>;
    set(items: Record<string, unknown>): Promise<void>;
    remove(keys: string | string[]): Promise<void>;
    clear(): Promise<void>;
    getBytesInUse(keys?: string | string[]): Promise<number>;
}

export interface ChromeStorageSync {
    get(keys: string | string[] | null): Promise<Record<string, unknown>>;
    set(items: Record<string, unknown>): Promise<void>;
    remove(keys: string | string[]): Promise<void>;
    clear(): Promise<void>;
}

export interface ChromeStorage {
    local: ChromeStorageLocal;
    sync: ChromeStorageSync;
}

export interface ChromeTabs {
    sendMessage(tabId: number, message: unknown): Promise<void>;
    query(queryInfo: {
        active?: boolean;
        currentWindow?: boolean;
    }): Promise<ChromeTab[]>;
}

export interface ChromeTab {
    id?: number;
    url?: string;
    title?: string;
}

export interface ChromeRuntime {
    onMessage: {
        addListener(callback: (message: unknown) => void): void;
    };
    sendMessage(message: unknown): Promise<void>;
}

export interface ChromeAPI {
    storage: ChromeStorage;
    tabs: ChromeTabs;
    runtime: ChromeRuntime;
}

/**
 * Global chrome object type for extension context
 */
export interface GlobalThis {
    chrome?: ChromeAPI;
}

/**
 * Type guard to check if chrome API is available
 */
export function isChromeExtensionContext(): boolean {
    return (
        typeof globalThis !== 'undefined' &&
        'chrome' in globalThis &&
        globalThis.chrome !== undefined
    );
}

/**
 * Get chrome API with proper typing
 */
export function getChromeAPI(): ChromeAPI {
    if (!isChromeExtensionContext()) {
        throw new Error('Chrome API not available - not in extension context');
    }
    return (globalThis as GlobalThis).chrome!;
}

// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * All supported Cashtab storage keys for localforage and chrome.storage.local
 * Includes both current and legacy keys to ensure complete migration
 */
export const SUPPORTED_CASHTAB_STORAGE_KEYS = [
    'cashtabCache',
    'contactList',
    'savedWallets', // Legacy key (pre-1.6.0)
    'settings',
    'wallet', // Legacy key (pre-1.6.0)
    'wallets',
] as const;

export type CashtabStorageKey = (typeof SUPPORTED_CASHTAB_STORAGE_KEYS)[number];

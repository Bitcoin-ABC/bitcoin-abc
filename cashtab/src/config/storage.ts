// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Fixed keys copied from legacy extension localforage.
 * `wallets` is the pre-migration array. After migration each wallet lives at
 * `wallet/<address>`, which is dynamic and must not be added here.
 * `walletsMigrated` is also omitted so a marker cannot be copied before the
 * per-wallet records exist.
 */
export const SUPPORTED_CASHTAB_STORAGE_KEYS = [
    'cashtabCache',
    'contactList',
    'settings',
    'wallets',
] as const;

/** Legacy single-array wallet list. Kept until a follow-up removes it. */
export const LEGACY_WALLETS_STORAGE_KEY = 'wallets';

/**
 * Set after the legacy array has been copied into per-wallet records.
 * While this is true, a later `wallets` array is ignored.
 */
export const WALLETS_MIGRATED_STORAGE_KEY = 'walletsMigrated';

/** Prefix for one stored wallet. The rest of the key is the wallet address. */
export const WALLET_RECORD_PREFIX = 'wallet/';

/**
 * Storage key for a single wallet record.
 * @param address stable wallet address (BIP44 receive index 0)
 */
export const walletRecordKey = (address: string): string =>
    `${WALLET_RECORD_PREFIX}${address}`;

/**
 * True when a storage key holds one wallet record.
 * @param key storage key
 */
export const isWalletRecordKey = (key: string): boolean =>
    key.startsWith(WALLET_RECORD_PREFIX);

export type CashtabStorageKey = (typeof SUPPORTED_CASHTAB_STORAGE_KEYS)[number];

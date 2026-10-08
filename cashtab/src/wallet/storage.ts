// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { isValidStoredCashtabWallet } from 'validation';
import type { StoredCashtabWallet } from 'wallet';
import {
    LEGACY_WALLETS_STORAGE_KEY,
    WALLET_RECORD_PREFIX,
    WALLETS_MIGRATED_STORAGE_KEY,
    isWalletRecordKey,
    walletRecordKey,
} from 'config/storage';

export {
    LEGACY_WALLETS_STORAGE_KEY,
    WALLET_RECORD_PREFIX,
    WALLETS_MIGRATED_STORAGE_KEY,
    isWalletRecordKey,
    walletRecordKey,
};

/**
 * Minimal key-value store used by Cashtab's platform storage and by tests.
 */
export interface WalletStore {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    remove(key: string): Promise<void>;
    keys(): Promise<string[]>;
}

/**
 * Adapt localforage (getItem/setItem) to {@link WalletStore}.
 * @param store localforage or a compatible driver
 */
export const asWalletStore = (store: {
    getItem: <T>(key: string) => Promise<T | null>;
    setItem: <T>(key: string, value: T) => Promise<unknown>;
    removeItem: (key: string) => Promise<unknown>;
    keys: () => Promise<string[]>;
}): WalletStore => ({
    get: key => store.getItem(key),
    set: async (key, value) => {
        await store.setItem(key, value);
    },
    remove: async key => {
        await store.removeItem(key);
    },
    keys: () => store.keys(),
});

/**
 * True when value is a StoredCashtabWallet this module will persist.
 * @param value untrusted storage entry
 */
const isStoredWallet = (value: unknown): value is StoredCashtabWallet => {
    if (value === null || typeof value !== 'object') {
        return false;
    }
    return isValidStoredCashtabWallet(value as StoredCashtabWallet);
};

/**
 * Read every per-wallet record. Invalid entries are skipped.
 * There is no fixed cap; the result length is the number of records stored.
 * @param store wallet storage
 */
export const readWalletRecords = async (
    store: WalletStore,
): Promise<StoredCashtabWallet[]> => {
    const keys = await store.keys();
    const wallets: StoredCashtabWallet[] = [];
    for (const key of keys) {
        if (!isWalletRecordKey(key)) {
            continue;
        }
        const wallet = await store.get<unknown>(key);
        if (isStoredWallet(wallet)) {
            wallets.push(wallet);
        }
    }
    return wallets;
};

/**
 * Wallet records already present in a bulk storage snapshot.
 * @param snapshot key to stored value
 */
const walletsFromSnapshot = (
    snapshot: Map<string, unknown>,
): StoredCashtabWallet[] => {
    const wallets: StoredCashtabWallet[] = [];
    for (const [key, value] of snapshot) {
        if (!isWalletRecordKey(key) || !isStoredWallet(value)) {
            continue;
        }
        wallets.push(value);
    }
    return wallets;
};

/**
 * Split a legacy `wallets` array into one record per address.
 *
 * The array is applied only while the migration marker is unset, and only
 * for addresses that do not already have a record. After the marker is set,
 * a reappearing array (an old tab, or a repeated extension import) is
 * ignored and does not change existing records.
 *
 * The legacy key stays on disk. A follow-up removes it once this schema has
 * been in the field. Records are written before the marker is set, so a
 * crash mid-way retries by filling whatever is still missing. An entry this
 * version cannot store stays in the legacy key. The marker is still set, so
 * a later boot does not write a deleted wallet back from that key.
 *
 * Pass a snapshot from one bulk read so boot does not scan keys one by one.
 * @param store wallet storage
 * @param snapshot optional bulk read of the store
 */
export const migrateLegacyWallets = async (
    store: WalletStore,
    snapshot?: Map<string, unknown>,
): Promise<StoredCashtabWallet[]> => {
    const read = async <T>(key: string): Promise<T | null> => {
        if (snapshot) {
            return snapshot.has(key) ? (snapshot.get(key) as T) : null;
        }
        return store.get<T>(key);
    };
    const migrated = await read<boolean>(WALLETS_MIGRATED_STORAGE_KEY);

    if (migrated === true) {
        return snapshot
            ? walletsFromSnapshot(snapshot)
            : readWalletRecords(store);
    }

    const legacy = await read<unknown>(LEGACY_WALLETS_STORAGE_KEY);

    let unmigrated = !Array.isArray(legacy) && legacy !== null;
    if (Array.isArray(legacy)) {
        const existing = new Set(
            (snapshot ? [...snapshot.keys()] : await store.keys()).filter(key =>
                isWalletRecordKey(key),
            ),
        );
        for (const entry of legacy) {
            if (!isStoredWallet(entry)) {
                unmigrated = true;
                continue;
            }
            const key = walletRecordKey(entry.address);
            if (existing.has(key)) {
                continue;
            }
            await store.set(key, entry);
            snapshot?.set(key, entry);
            existing.add(key);
        }
    }

    if (unmigrated) {
        console.warn('Legacy wallets contained entries that were not migrated');
    }

    await store.set(WALLETS_MIGRATED_STORAGE_KEY, true);
    snapshot?.set(WALLETS_MIGRATED_STORAGE_KEY, true);
    return snapshot ? walletsFromSnapshot(snapshot) : readWalletRecords(store);
};

/**
 * Persist one wallet. Other wallet records are left untouched.
 * @param store wallet storage
 * @param wallet wallet to write
 */
export const saveWalletRecord = async (
    store: WalletStore,
    wallet: StoredCashtabWallet,
): Promise<void> => {
    if (!isStoredWallet(wallet)) {
        throw new Error('Refusing to store an invalid wallet');
    }
    await store.set(walletRecordKey(wallet.address), wallet);
};

/**
 * Remove one wallet record.
 * @param store wallet storage
 * @param address wallet address
 */
export const deleteWalletRecord = async (
    store: WalletStore,
    address: string,
): Promise<void> => {
    await store.remove(walletRecordKey(address));
};

/**
 * Advance HD indexes on one wallet record.
 * The stored index never moves backward. Returns null when nothing was written.
 * @param store wallet storage
 * @param address HD wallet address
 * @param receiveIndex next unused receive index from the live wallet
 * @param changeIndex next unused change index from the live wallet
 */
export const persistHdIndexes = async (
    store: WalletStore,
    address: string,
    receiveIndex: number,
    changeIndex: number,
): Promise<StoredCashtabWallet | null> => {
    const stored = await store.get<unknown>(walletRecordKey(address));
    if (!isStoredWallet(stored) || stored.hd !== true) {
        return null;
    }
    const nextReceive = Math.max(stored.receiveIndex ?? 0, receiveIndex);
    const nextChange = Math.max(stored.changeIndex ?? 0, changeIndex);
    if (
        stored.receiveIndex === nextReceive &&
        stored.changeIndex === nextChange
    ) {
        return null;
    }
    const updated: StoredCashtabWallet = {
        ...stored,
        receiveIndex: nextReceive,
        changeIndex: nextChange,
    };
    await store.set(walletRecordKey(address), updated);
    return updated;
};

/**
 * Active address to open.
 * A missing or unknown active address falls back to the first wallet by name.
 * An empty list returns null.
 * @param wallets stored wallets
 * @param activeWalletAddress address currently marked active, if any
 */
export const resolveActiveWalletAddress = (
    wallets: StoredCashtabWallet[],
    activeWalletAddress: string | null,
): string | null => {
    if (wallets.length === 0) {
        return null;
    }
    if (
        activeWalletAddress !== null &&
        wallets.some(wallet => wallet.address === activeWalletAddress)
    ) {
        return activeWalletAddress;
    }
    return [...wallets].sort((a, b) => a.name.localeCompare(b.name))[0].address;
};

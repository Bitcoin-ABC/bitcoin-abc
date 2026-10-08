// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { createCashtabWallet, generateMnemonic } from 'wallet';
import {
    LEGACY_WALLETS_STORAGE_KEY,
    WALLETS_MIGRATED_STORAGE_KEY,
    deleteWalletRecord,
    migrateLegacyWallets,
    persistHdIndexes,
    readWalletRecords,
    resolveActiveWalletAddress,
    saveWalletRecord,
    walletRecordKey,
    type WalletStore,
} from 'wallet/storage';

const memoryStore = (): WalletStore => {
    const data = new Map<string, unknown>();
    return {
        get: async <T>(key: string): Promise<T | null> => {
            if (!data.has(key)) {
                return null;
            }
            return data.get(key) as T;
        },
        set: async <T>(key: string, value: T): Promise<void> => {
            data.set(key, structuredClone(value));
        },
        remove: async (key: string): Promise<void> => {
            data.delete(key);
        },
        keys: async (): Promise<string[]> => [...data.keys()],
    };
};

const addressesOf = (wallets: { address: string }[]): string[] =>
    wallets.map(wallet => wallet.address).sort();

describe('wallet storage migration', () => {
    it('splits a legacy wallets array into one record per address', async () => {
        const alpha = createCashtabWallet(generateMnemonic(), 'alpha');
        const bravo = createCashtabWallet(generateMnemonic(), 'bravo');
        const charlie = createCashtabWallet(generateMnemonic(), 'charlie');
        const delta = createCashtabWallet(generateMnemonic(), 'delta');
        const store = memoryStore();
        const legacy = [alpha, bravo, charlie, delta];
        await store.set(LEGACY_WALLETS_STORAGE_KEY, legacy);

        const loaded = await migrateLegacyWallets(store);

        expect(addressesOf(loaded)).toEqual(
            addressesOf([alpha, bravo, charlie, delta]),
        );
        expect(await store.get(LEGACY_WALLETS_STORAGE_KEY)).toEqual(legacy);
        expect(await store.get(WALLETS_MIGRATED_STORAGE_KEY)).toBe(true);
        expect(await store.get(walletRecordKey(alpha.address))).toEqual(alpha);
        expect(await store.get(walletRecordKey(delta.address))).toEqual(delta);
    });

    it('keeps the legacy array when an entry cannot be migrated', async () => {
        const alpha = createCashtabWallet(generateMnemonic(), 'alpha');
        const unrecognized = { name: 'not a wallet', mnemonic: 'keep me' };
        const store = memoryStore();
        const legacy = [alpha, unrecognized];
        await store.set(LEGACY_WALLETS_STORAGE_KEY, legacy);

        const loaded = await migrateLegacyWallets(store);

        expect(addressesOf(loaded)).toEqual(addressesOf([alpha]));
        expect(await store.get(walletRecordKey(alpha.address))).toEqual(alpha);
        expect(await store.get(LEGACY_WALLETS_STORAGE_KEY)).toEqual(legacy);
        expect(await store.get(WALLETS_MIGRATED_STORAGE_KEY)).toBe(true);

        await deleteWalletRecord(store, alpha.address);
        const reloaded = await migrateLegacyWallets(store);

        expect(reloaded).toEqual([]);
        expect(await store.get(walletRecordKey(alpha.address))).toBeNull();
        expect(await store.get(LEGACY_WALLETS_STORAGE_KEY)).toEqual(legacy);
    });

    it('keeps a legacy value that is not an array', async () => {
        const store = memoryStore();
        const legacy = { mnemonic: 'not an array' };
        await store.set(LEGACY_WALLETS_STORAGE_KEY, legacy);

        const loaded = await migrateLegacyWallets(store);

        expect(loaded).toEqual([]);
        expect(await store.get(LEGACY_WALLETS_STORAGE_KEY)).toEqual(legacy);
        expect(await store.get(WALLETS_MIGRATED_STORAGE_KEY)).toBe(true);
    });

    it('fills only missing records when a previous migration was interrupted', async () => {
        const alpha = createCashtabWallet(generateMnemonic(), 'alpha');
        const bravo = createCashtabWallet(generateMnemonic(), 'bravo');
        const alreadySaved = {
            ...alpha,
            name: 'alpha renamed',
            hd: true as const,
            accountNumber: 0,
            receiveIndex: 4,
            changeIndex: 2,
        };
        const store = memoryStore();
        const legacy = [{ ...alpha, receiveIndex: 1 }, bravo];
        await store.set(walletRecordKey(alpha.address), alreadySaved);
        await store.set(LEGACY_WALLETS_STORAGE_KEY, legacy);

        const loaded = await migrateLegacyWallets(store);

        expect(await store.get(walletRecordKey(alpha.address))).toEqual(
            alreadySaved,
        );
        expect(await store.get(walletRecordKey(bravo.address))).toEqual(bravo);
        expect(addressesOf(loaded)).toEqual(addressesOf([alreadySaved, bravo]));
        expect(await store.get(LEGACY_WALLETS_STORAGE_KEY)).toEqual(legacy);
        expect(await store.get(WALLETS_MIGRATED_STORAGE_KEY)).toBe(true);
    });

    it('ignores a legacy array once migration has completed', async () => {
        const alpha = createCashtabWallet(generateMnemonic(), 'alpha');
        const bravo = createCashtabWallet(generateMnemonic(), 'bravo');
        const ghost = createCashtabWallet(generateMnemonic(), 'ghost');
        const store = memoryStore();
        const legacy = [alpha, ghost];
        await store.set(WALLETS_MIGRATED_STORAGE_KEY, true);
        await store.set(walletRecordKey(alpha.address), alpha);
        await store.set(walletRecordKey(bravo.address), bravo);
        await store.set(LEGACY_WALLETS_STORAGE_KEY, legacy);

        const loaded = await migrateLegacyWallets(store);

        expect(addressesOf(loaded)).toEqual(addressesOf([alpha, bravo]));
        expect(await store.get(walletRecordKey(ghost.address))).toBeNull();
        expect(await store.get(LEGACY_WALLETS_STORAGE_KEY)).toEqual(legacy);
    });

    it('marks a fresh profile migrated without creating wallet records', async () => {
        const store = memoryStore();

        const loaded = await migrateLegacyWallets(store);

        expect(loaded).toEqual([]);
        expect(await store.get(WALLETS_MIGRATED_STORAGE_KEY)).toBe(true);
        expect(await store.keys()).toEqual([WALLETS_MIGRATED_STORAGE_KEY]);
    });

    it('saves and deletes one wallet without rewriting the others', async () => {
        const alpha = createCashtabWallet(generateMnemonic(), 'alpha');
        const bravo = createCashtabWallet(generateMnemonic(), 'bravo');
        const charlie = createCashtabWallet(generateMnemonic(), 'charlie');
        const store = memoryStore();
        await migrateLegacyWallets(store);

        await saveWalletRecord(store, alpha);
        await saveWalletRecord(store, bravo);
        await saveWalletRecord(store, charlie);
        await deleteWalletRecord(store, bravo.address);

        const loaded = await readWalletRecords(store);
        expect(addressesOf(loaded)).toEqual(addressesOf([alpha, charlie]));
        expect(await store.get(LEGACY_WALLETS_STORAGE_KEY)).toBeNull();
    });

    it('advances HD indexes on that wallet only and never moves them backward', async () => {
        const hd = createCashtabWallet(generateMnemonic(), 'hd', { hd: true });
        const other = createCashtabWallet(generateMnemonic(), 'other');
        const store = memoryStore();
        await saveWalletRecord(store, hd);
        await saveWalletRecord(store, other);

        const advanced = await persistHdIndexes(store, hd.address, 5, 1);
        expect(advanced).toEqual({
            ...hd,
            receiveIndex: 5,
            changeIndex: 1,
        });

        const rewound = await persistHdIndexes(store, hd.address, 3, 0);
        expect(rewound).toBeNull();
        expect(await store.get(walletRecordKey(hd.address))).toEqual({
            ...hd,
            receiveIndex: 5,
            changeIndex: 1,
        });
        expect(await store.get(walletRecordKey(other.address))).toEqual(other);
    });

    it('falls back to the first wallet by name when the active address is missing', () => {
        const alpha = createCashtabWallet(generateMnemonic(), 'alpha');
        const bravo = createCashtabWallet(generateMnemonic(), 'bravo');

        expect(resolveActiveWalletAddress([bravo, alpha], null)).toBe(
            alpha.address,
        );
        expect(resolveActiveWalletAddress([bravo, alpha], bravo.address)).toBe(
            bravo.address,
        );
        expect(
            resolveActiveWalletAddress([bravo, alpha], 'ecash:not-stored'),
        ).toBe(alpha.address);
        expect(resolveActiveWalletAddress([], 'ecash:not-stored')).toBeNull();
    });
});

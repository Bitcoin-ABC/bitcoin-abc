// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { AndroidStorageAdapter } from '../android';
import { StoredCashtabWallet } from 'wallet';

// Mock Capacitor SQLite
const mockSQLite = {
    createConnection: jest.fn().mockResolvedValue({
        open: jest.fn().mockResolvedValue(undefined),
        execute: jest.fn().mockResolvedValue({}),
        run: jest.fn().mockResolvedValue({}),
        query: jest.fn().mockResolvedValue({ values: [] }),
    }),
    open: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn().mockResolvedValue({}),
    run: jest.fn().mockResolvedValue({}),
    query: jest.fn().mockResolvedValue({ values: [] }),
};

// Mock Capacitor Secure Storage
const mockSecureStorage = {
    internalSetItem: jest.fn().mockResolvedValue(undefined),
    internalGetItem: jest.fn().mockResolvedValue({ data: null }),
    internalRemoveItem: jest.fn().mockResolvedValue(undefined),
};

// Mock Capacitor
const mockCapacitor = {
    Plugins: {
        CapacitorSQLite: mockSQLite,
        SecureStorage: mockSecureStorage,
    },
};

// Mock global Capacitor
(globalThis as any).Capacitor = mockCapacitor;

describe('AndroidStorageAdapter', () => {
    let adapter: AndroidStorageAdapter;

    beforeEach(async () => {
        jest.clearAllMocks();

        // Mock successful initialization
        mockSQLite.createConnection.mockResolvedValue({
            open: jest.fn().mockResolvedValue(undefined),
            execute: jest.fn().mockResolvedValue({}),
            run: jest.fn().mockResolvedValue({}),
            query: jest.fn().mockResolvedValue({ values: [] }),
        });

        adapter = new AndroidStorageAdapter();

        // Wait for initialization to complete
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterEach(async () => {
        // Clean up any stored data
        await adapter.clear();
    });

    describe('Basic Functionality', () => {
        it('should initialize successfully', async () => {
            expect(adapter).toBeDefined();
            const isAvailable = await adapter.isAvailable();
            expect(isAvailable).toBe(true);
        });

        it('should store and retrieve non-wallet data', async () => {
            const testData = { key: 'value', number: 123 };

            // Mock database operations
            mockSQLite.run.mockResolvedValue({});
            mockSQLite.query.mockResolvedValue({
                values: [{ value: JSON.stringify(testData) }],
            });

            await adapter.setItem('test-key', testData);
            const retrievedData = await adapter.getItem<typeof testData>(
                'test-key',
            );

            expect(retrievedData).toEqual(testData);
        });
    });

    describe('Wallet Storage with Secure Storage', () => {
        const mockWallet: StoredCashtabWallet = {
            name: 'Test Wallet',
            mnemonic: 'test mnemonic phrase twelve words long',
            address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
            hash: '3a5fb236934ec078b4507c303d3afd82067f8fc1',
            pk: '031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
            sk: '512d34d3b8f4d269219fd087c80e22b0212769227226dd6b23966cf0aa2f167f',
        };

        it('should store wallet data in secure storage', async () => {
            // Store wallet
            await adapter.setItem('wallets', [mockWallet]);

            // Verify secure storage was called with the entire wallets data
            expect(mockSecureStorage.internalSetItem).toHaveBeenCalledWith({
                prefixedKey: 'cashtab_secure_wallets',
                data: JSON.stringify([mockWallet]),
                sync: false,
                access: 0,
            });
        });

        it('should retrieve wallet data from secure storage', async () => {
            // Mock secure storage to return wallet data
            mockSecureStorage.internalGetItem.mockResolvedValue({
                data: JSON.stringify([mockWallet]),
            });

            // Retrieve wallet
            const retrievedWallets = await adapter.getItem<
                StoredCashtabWallet[]
            >('wallets');

            // Verify the wallet was retrieved correctly
            expect(retrievedWallets).toBeDefined();
            expect(retrievedWallets).toHaveLength(1);
            expect(retrievedWallets![0].name).toBe('Test Wallet');
            expect(retrievedWallets![0].mnemonic).toBe(
                'test mnemonic phrase twelve words long',
            );
            expect(retrievedWallets![0].address).toBe(
                'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
            );
        });

        it('should return null when no wallet data exists', async () => {
            // Mock secure storage to return null (no data)
            mockSecureStorage.internalGetItem.mockResolvedValue({ data: null });

            // Retrieve wallet
            const retrievedWallets = await adapter.getItem<
                StoredCashtabWallet[]
            >('wallets');

            // Should return null when no data exists
            expect(retrievedWallets).toBeNull();
        });
    });
});

// Separate describe block for error handling to avoid initialization conflicts
describe('AndroidStorageAdapter Error Handling', () => {
    it('should handle SQLite errors gracefully', async () => {
        // Create a separate adapter instance for error testing
        const errorAdapter = new AndroidStorageAdapter();

        // Wait for initialization to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Mock SQLite to throw an error
        mockSQLite.run.mockRejectedValue(new Error('SQLite error'));

        // Test that the error is properly caught and re-thrown
        await expect(errorAdapter.setItem('test-key', 'value')).rejects.toThrow(
            'Failed to store item: SQLite error',
        );
    });
});

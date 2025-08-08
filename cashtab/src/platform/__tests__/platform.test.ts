// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Tests for platform abstraction layer
 * These tests ensure that our storage abstraction works correctly
 * and that platform detection functions as expected
 */

import { detectPlatform } from '../index';

// Mock localforage for testing
jest.mock('localforage', () => ({
    config: jest.fn(),
    setItem: jest.fn().mockResolvedValue(undefined),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    keys: jest.fn().mockResolvedValue([]),
}));

describe('Platform Detection', () => {
    beforeEach(() => {
        // Clear any global state
        delete (globalThis as any).chrome;
        delete (global as any).window;
    });

    it('detects web platform correctly', () => {
        // Set up web environment
        (global as any).window = {};

        const platform = detectPlatform();

        expect(platform.isWeb).toBe(true);
        expect(platform.isExtension).toBe(false);
        expect(platform.platform).toBe('web');
    });

    it('detects extension platform correctly', () => {
        // Set up extension environment
        (global as any).window = {};
        (globalThis as any).chrome = {
            runtime: {
                id: 'test-extension-id',
            },
            storage: {
                local: {},
            },
        };

        const platform = detectPlatform();

        expect(platform.isWeb).toBe(false);
        expect(platform.isExtension).toBe(true);
        expect(platform.platform).toBe('extension');
    });
});

describe('Storage Abstraction', () => {
    beforeEach(() => {
        // Reset to web environment for storage tests
        delete (globalThis as any).chrome;
        (global as any).window = {};
        jest.clearAllMocks();
        jest.resetModules(); // Reset modules to clear cached storage instance
    });

    it('initializes storage successfully', async () => {
        const localforage = require('localforage');
        // Mock a successful storage test
        localforage.setItem.mockResolvedValueOnce(undefined);
        localforage.getItem.mockResolvedValueOnce('test');
        localforage.removeItem.mockResolvedValueOnce(undefined);

        const {
            initializeStorage: freshInitializeStorage,
        } = require('../index');
        const result = await freshInitializeStorage();

        expect(result.success).toBe(true);
        expect(result.platform).toBe('web');
        expect(result.config).toBeDefined();
        expect(result.config.description).toContain('IndexedDB');
    });

    it('can store and retrieve values', async () => {
        const localforage = require('localforage');
        localforage.getItem.mockResolvedValue('test-value');

        const { storage: freshStorage } = require('../index');
        await freshStorage.set('test-key', 'test-value');
        const result = await freshStorage.get('test-key');

        expect(localforage.setItem).toHaveBeenCalledWith(
            'test-key',
            'test-value',
        );
        expect(localforage.getItem).toHaveBeenCalledWith('test-key');
        expect(result).toBe('test-value');
    });

    it('can remove values', async () => {
        const localforage = require('localforage');

        const { storage: freshStorage } = require('../index');
        await freshStorage.remove('test-key');

        expect(localforage.removeItem).toHaveBeenCalledWith('test-key');
    });

    it('can clear all storage', async () => {
        const localforage = require('localforage');

        const { storage: freshStorage } = require('../index');
        await freshStorage.clear();

        expect(localforage.clear).toHaveBeenCalled();
    });

    it('can get all keys', async () => {
        const localforage = require('localforage');
        localforage.keys.mockResolvedValue(['key1', 'key2']);

        const { storage: freshStorage } = require('../index');
        const keys = await freshStorage.keys();

        expect(localforage.keys).toHaveBeenCalled();
        expect(keys).toEqual(['key1', 'key2']);
    });

    it('handles storage errors gracefully', async () => {
        const localforage = require('localforage');
        localforage.setItem.mockRejectedValue(new Error('Storage full'));

        const { storage: freshStorage } = require('../index');
        await expect(
            freshStorage.set('test-key', 'test-value'),
        ).rejects.toThrow('Storage failed');
    });
});

describe('Extension Storage', () => {
    beforeEach(() => {
        // Set up extension environment
        (global as any).window = {};
        (globalThis as any).chrome = {
            runtime: {
                id: 'test-extension-id',
            },
            storage: {
                local: {
                    set: jest.fn().mockResolvedValue(undefined),
                    get: jest.fn().mockResolvedValue({}),
                    remove: jest.fn().mockResolvedValue(undefined),
                    clear: jest.fn().mockResolvedValue(undefined),
                    getBytesInUse: jest.fn().mockResolvedValue(1000),
                },
            },
        };
        jest.clearAllMocks();
    });

    it('uses extension storage when in extension environment', async () => {
        // Reset modules to clear any cached storage instances
        jest.resetModules();

        // Mock a successful chrome storage test - use mockResolvedValue for multiple calls
        const chrome = (globalThis as any).chrome;
        chrome.storage.local.getBytesInUse.mockResolvedValue(0);

        const {
            initializeStorage: freshInitializeStorage,
        } = require('../index');
        const result = await freshInitializeStorage();

        expect(result.success).toBe(true);
        expect(result.platform).toBe('extension');
        expect(result.config.description).toContain('Chrome extension storage');
    });

    it('can store and retrieve values in extension', async () => {
        // First reset the storage instance to pick up the new extension environment
        jest.resetModules();
        const { storage: extensionStorage } = require('../index');

        const chrome = (globalThis as any).chrome;
        chrome.storage.local.get.mockResolvedValue({
            'test-key': 'test-value',
        });
        chrome.storage.local.getBytesInUse.mockResolvedValue(0);

        await extensionStorage.set('test-key', 'test-value');
        const result = await extensionStorage.get('test-key');

        expect(chrome.storage.local.set).toHaveBeenCalledWith({
            'test-key': 'test-value',
        });
        expect(chrome.storage.local.get).toHaveBeenCalledWith(['test-key']);
        expect(result).toBe('test-value');
    });
});

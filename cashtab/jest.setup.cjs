// Copyright (c) 2024-2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/* eslint-env jest */

// Mock the JSON wordlist import for Jest
// This ensures Jest can properly resolve the JSON import from ecash-lib
jest.mock('ecash-lib/wordlists/english.json', () => {
    const path = require('path');
    const fs = require('fs');
    // Resolve the actual JSON file path
    const jsonPath = path.resolve(
        __dirname,
        '../modules/ecash-lib/wordlists/english.json',
    );
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(jsonContent);
}, { virtual: false });

/**
 * Mock ResizeObserver class as this is not available in JSDOM
 * Need to mock so that react-tooltip does not break tests
 */
const mockResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

global.ResizeObserver = mockResizeObserver;

process.env.VITE_RECAPTCHA_V3_SITE_KEY =
    process.env.VITE_RECAPTCHA_V3_SITE_KEY || 'mock-recaptcha-v3-site-key';

// Mock import.meta.env for Vite environment variables in tests
Object.defineProperty(globalThis, 'import', {
    value: {
        meta: {
            env: {
                VITE_BUILD_ENV: process.env.VITE_BUILD_ENV || '',
                VITE_GOOGLE_ANALYTICS: process.env.VITE_GOOGLE_ANALYTICS || '',
                VITE_RECAPTCHA_SITE_KEY:
                    process.env.VITE_RECAPTCHA_SITE_KEY || '',
                VITE_RECAPTCHA_V3_SITE_KEY:
                    process.env.VITE_RECAPTCHA_V3_SITE_KEY ||
                    'mock-recaptcha-v3-site-key',
                VITE_VERSION: process.env.VITE_VERSION || '',
                VITE_TESTNET: process.env.VITE_TESTNET || 'false',
                VITE_NOTIFICATIONS_SERVER_URL:
                    process.env.VITE_NOTIFICATIONS_SERVER_URL ||
                    'https://push.etokens.cash',
            },
        },
    },
    writable: true,
});

// Copyright (c) 2024-2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/* eslint-env jest */

/**
 * Unfortunately swiperjs has a lot of potential jest errors
 * Was not able to troubleshoot
 * Representative dead end:
 * https://github.com/nolimits4web/swiper/discussions/5218
 * Anyway, we do not need to test swiperjs
 */
jest.mock('swiper/react', () => ({
    Swiper: ({ children }) => children,
    SwiperSlide: ({ children }) => children,
}));

jest.mock('swiper/css', () => jest.fn());
jest.mock('swiper/css/navigation', () => jest.fn());
jest.mock('swiper/css/pagination', () => jest.fn());
jest.mock('swiper/modules', () => jest.fn());

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

// Mock import.meta.env for Vite environment variables in tests
Object.defineProperty(globalThis, 'import', {
    value: {
        meta: {
            env: {
                VITE_BUILD_ENV: process.env.VITE_BUILD_ENV || '',
                VITE_GOOGLE_ANALYTICS: process.env.VITE_GOOGLE_ANALYTICS || '',
                VITE_RECAPTCHA_SITE_KEY:
                    process.env.VITE_RECAPTCHA_SITE_KEY || '',
                VITE_VERSION: process.env.VITE_VERSION || '',
                VITE_TESTNET: process.env.VITE_TESTNET || 'false',
            },
        },
    },
    writable: true,
});

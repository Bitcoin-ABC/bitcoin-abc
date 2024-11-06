// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Mock bip39.generateMnemonic() so we can have a consistent test for wallet name
jest.mock('bip39', () => ({
    __esModule: true,
    ...jest.requireActual('bip39'),
    generateMnemonic: jest.fn(
        () =>
            'grant grass sock faculty behave guitar pepper tiger sustain task occur soon',
    ),
}));

// Mock a valid sideshift object in window
window.sideshift = {
    show: jest.fn(),
    hide: jest.fn(),
    addEventListener: jest.fn(),
};

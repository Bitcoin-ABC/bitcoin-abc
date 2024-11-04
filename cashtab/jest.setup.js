// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

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

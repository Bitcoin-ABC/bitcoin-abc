// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

const mockTokenCache = new Map();

mockTokenCache.set(
    '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
    {
        tokenTicker: 'BEAR',
        tokenName: 'BearNip',
        url: 'https://cashtab.com/',
        decimals: 0,
        hash: '',
    },
);

mockTokenCache.set(
    'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
    {
        tokenTicker: 'CTD',
        tokenName: 'Cashtab Dark',
        url: 'https://cashtab.com/',
        decimals: 0,
        hash: '',
    },
);

export const mockCashtabCache = { tokens: mockTokenCache };

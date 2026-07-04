// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import CashtabCache from 'config/CashtabCache';

/**
 * Build mockCashtabCache
 * Valid shape of cashtabCache as of 2.9.0
 */
export const mockCashtabCache = new CashtabCache([
    [
        '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
        {
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'BEAR',
                tokenName: 'BearNip',
                url: 'https://cashtab.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 782665,
                hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
                timestamp: 1678408305,
            },
            genesisSupply: '4444',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    ],
    [
        'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
        {
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'CTD',
                tokenName: 'Cashtab Dark',
                url: 'https://cashtab.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 726043,
                hash: '00000000000000000182db32e000171006b7b7820181676b5fd8f29cc90d2b9c',
                timestamp: 1644455332,
            },
            genesisSupply: '10000',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    ],
]);

/**
 * Build mockCashtabCacheNoBlocks
 * Valid shape of cashtabCache as of 2.9.0
 * We may or may not have block in cache
 */
export const mockCashtabCacheNoBlocks = new CashtabCache([
    [
        '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
        {
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'BEAR',
                tokenName: 'BearNip',
                url: 'https://cashtab.com/',
                decimals: 0,
                hash: '',
            },
            genesisSupply: '4444',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    ],
    [
        'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
        {
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'CTD',
                tokenName: 'Cashtab Dark',
                url: 'https://cashtab.com/',
                decimals: 0,
                hash: '',
            },
            genesisSupply: '10000',
            genesisOutputScripts: [
                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            ],
            genesisMintBatons: 0,
        },
    ],
]);

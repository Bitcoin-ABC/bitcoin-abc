// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { mockCashtabCache } from 'helpers/fixtures/mocks';
// Test vectors for helper functions

export default {
    isMobile: {
        expectedReturns: [
            {
                description: 'Navigator is undefined',
                navigator: undefined,
                result: false,
            },
            {
                description: 'Navigator.userAgentData is undefined',
                navigator: { otherStuff: true },
                result: false,
            },
            {
                description:
                    'Desktop device on browser with userAgentData support',
                navigator: { userAgentData: { mobile: false } },
                result: false,
            },
            {
                description:
                    'Mobile device on browser with userAgentData support',
                navigator: { userAgentData: { mobile: true } },
                result: true,
            },
        ],
    },
    cashtabCacheToJSON: {
        expectedReturns: [
            {
                description:
                    'Converts cashtabCache with populated token cache to JSON for storage',
                cashtabCache: mockCashtabCache,
                cashtabCacheJson: {
                    tokens: [
                        [
                            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                            {
                                decimals: 0,
                                hash: '',
                                tokenName: 'BearNip',
                                tokenTicker: 'BEAR',
                                url: 'https://cashtab.com/',
                            },
                        ],
                        [
                            'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
                            {
                                decimals: 0,
                                hash: '',
                                tokenName: 'Cashtab Dark',
                                tokenTicker: 'CTD',
                                url: 'https://cashtab.com/',
                            },
                        ],
                    ],
                },
            },
            {
                description:
                    'Converts cashtabCache with empty token cache to JSON for storage',
                cashtabCache: { tokens: new Map() },
                cashtabCacheJson: { tokens: [] },
            },
        ],
    },
};

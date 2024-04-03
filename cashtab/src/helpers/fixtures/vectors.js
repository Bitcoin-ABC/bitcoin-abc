// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    mockCashtabCache,
    emptyCashtabWalletJson,
    emptyCashtabWalletMultiPathJson,
    cashtabWalletMultiPathWithTokensJson,
} from 'helpers/fixtures/mocks';
import CashtabCache, {
    UNKNOWN_TOKEN_ID,
    UNKNOWN_TOKEN_CACHED_INFO,
} from 'config/CashtabCache';
import {
    mockCacheWalletWithXecAndTokens,
    mockCachedInfoCashtabDark,
    walletWithXecAndTokens_pre_2_1_0,
    walletWithXecAndTokens_pre_2_9_0,
    validSavedWallets_pre_2_1_0,
    validSavedWallets_pre_2_9_0,
} from 'components/App/fixtures/mocks';
import appConfig from 'config/app';
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
    getUserLocale: {
        expectedReturns: [
            {
                description: 'navigator is undefined',
                navigator: undefined,
                result: appConfig.defaultLocale,
            },
            {
                description: 'navigator.language is undefined',
                navigator: { otherStuff: true },
                result: appConfig.defaultLocale,
            },
            {
                description:
                    'navigator.language is defined and not the default',
                navigator: { language: 'fr-FR' },
                result: 'fr-FR',
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
                        [UNKNOWN_TOKEN_ID, UNKNOWN_TOKEN_CACHED_INFO],
                        [
                            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                            mockCacheWalletWithXecAndTokens,
                        ],
                        [
                            'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
                            mockCachedInfoCashtabDark,
                        ],
                    ],
                },
            },
            {
                description:
                    'Converts cashtabCache with empty token cache to JSON for storage',
                cashtabCache: new CashtabCache(),
                cashtabCacheJson: {
                    tokens: [[UNKNOWN_TOKEN_ID, UNKNOWN_TOKEN_CACHED_INFO]],
                },
            },
        ],
    },
    cashtabWalletToJSON: {
        expectedReturns: [
            {
                description: 'Newly created Cashtab wallet',
                cashtabWallet: {
                    ...emptyCashtabWalletJson,
                    paths: new Map(emptyCashtabWalletJson.paths),
                    state: {
                        ...emptyCashtabWalletJson.state,
                        tokens: new Map(emptyCashtabWalletJson.state.tokens),
                    },
                },
                cashtabWalletJSON: emptyCashtabWalletJson,
            },
            {
                description: 'Pre-2.1.0 wallet is unchanged',
                cashtabWallet: walletWithXecAndTokens_pre_2_1_0,
                cashtabWalletJSON: walletWithXecAndTokens_pre_2_1_0,
            },
            {
                description: 'Pre-2.9.0 wallet is unchanged',
                cashtabWallet: walletWithXecAndTokens_pre_2_9_0,
                cashtabWalletJSON: walletWithXecAndTokens_pre_2_9_0,
            },
            {
                description: 'Cashtab wallet with multiple paths',
                cashtabWallet: {
                    ...emptyCashtabWalletMultiPathJson,
                    paths: new Map(emptyCashtabWalletMultiPathJson.paths),
                    state: {
                        ...emptyCashtabWalletMultiPathJson.state,
                        tokens: new Map(
                            emptyCashtabWalletMultiPathJson.state.tokens,
                        ),
                    },
                },
                cashtabWalletJSON: emptyCashtabWalletMultiPathJson,
            },
            {
                description:
                    'Cashtab wallet with multiple paths and tokens in state',
                cashtabWallet: {
                    ...cashtabWalletMultiPathWithTokensJson,
                    paths: new Map(cashtabWalletMultiPathWithTokensJson.paths),
                    state: {
                        ...cashtabWalletMultiPathWithTokensJson.state,
                        tokens: new Map(
                            cashtabWalletMultiPathWithTokensJson.state.tokens,
                        ),
                    },
                },
                cashtabWalletJSON: cashtabWalletMultiPathWithTokensJson,
            },
        ],
    },
    cashtabWalletsToJSON: {
        expectedReturns: [
            {
                description: 'Newly created Cashtab wallets',
                cashtabWallets: [
                    {
                        ...emptyCashtabWalletJson,
                        paths: new Map(emptyCashtabWalletJson.paths),
                        state: {
                            ...emptyCashtabWalletJson.state,
                            tokens: new Map(
                                emptyCashtabWalletJson.state.tokens,
                            ),
                        },
                    },
                    {
                        ...emptyCashtabWalletJson,
                        paths: new Map(emptyCashtabWalletJson.paths),
                        state: {
                            ...emptyCashtabWalletJson.state,
                            tokens: new Map(
                                emptyCashtabWalletJson.state.tokens,
                            ),
                        },
                    },
                ],
                cashtabWalletsJSON: [
                    emptyCashtabWalletJson,
                    emptyCashtabWalletJson,
                ],
            },
            {
                description: 'Pre-2.1.0 wallets are unchanged',
                cashtabWallets: validSavedWallets_pre_2_1_0,
                cashtabWalletsJSON: validSavedWallets_pre_2_1_0,
            },
            {
                description: 'Pre-2.9.0 wallets are unchanged',
                cashtabWallets: validSavedWallets_pre_2_9_0,
                cashtabWalletsJSON: validSavedWallets_pre_2_9_0,
            },
            {
                description: 'Cashtab wallets with multiple paths',
                cashtabWallets: [
                    {
                        ...emptyCashtabWalletMultiPathJson,
                        paths: new Map(emptyCashtabWalletMultiPathJson.paths),
                        state: {
                            ...emptyCashtabWalletMultiPathJson.state,
                            tokens: new Map(
                                emptyCashtabWalletMultiPathJson.state.tokens,
                            ),
                        },
                    },
                    {
                        ...emptyCashtabWalletMultiPathJson,
                        paths: new Map(emptyCashtabWalletMultiPathJson.paths),
                        state: {
                            ...emptyCashtabWalletMultiPathJson.state,
                            tokens: new Map(
                                emptyCashtabWalletMultiPathJson.state.tokens,
                            ),
                        },
                    },
                ],
                cashtabWalletsJSON: [
                    emptyCashtabWalletMultiPathJson,
                    emptyCashtabWalletMultiPathJson,
                ],
            },
            {
                description:
                    'Cashtab wallets with multiple paths and tokens in state',
                cashtabWallets: [
                    {
                        ...cashtabWalletMultiPathWithTokensJson,
                        paths: new Map(
                            cashtabWalletMultiPathWithTokensJson.paths,
                        ),
                        state: {
                            ...cashtabWalletMultiPathWithTokensJson.state,
                            tokens: new Map(
                                cashtabWalletMultiPathWithTokensJson.state.tokens,
                            ),
                        },
                    },
                    {
                        ...cashtabWalletMultiPathWithTokensJson,
                        paths: new Map(
                            cashtabWalletMultiPathWithTokensJson.paths,
                        ),
                        state: {
                            ...cashtabWalletMultiPathWithTokensJson.state,
                            tokens: new Map(
                                cashtabWalletMultiPathWithTokensJson.state.tokens,
                            ),
                        },
                    },
                ],
                cashtabWalletsJSON: [
                    cashtabWalletMultiPathWithTokensJson,
                    cashtabWalletMultiPathWithTokensJson,
                ],
            },
        ],
    },
};

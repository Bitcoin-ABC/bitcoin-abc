// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { mockCashtabCache } from 'helpers/fixtures/mocks';
import CashtabCache, {
    UNKNOWN_TOKEN_ID,
    UNKNOWN_TOKEN_CACHED_INFO,
} from 'config/CashtabCache';
import {
    mockCacheWalletWithXecAndTokens,
    mockCachedInfoCashtabDark,
} from 'components/App/fixtures/mocks';
import { Script } from 'ecash-lib';
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
    isAndroidMobileWebUserAgent: {
        expectedReturns: [
            {
                description: 'Navigator is undefined',
                navigator: undefined,
                result: false,
            },
            {
                description: 'Non-Android user agent',
                navigator: {
                    userAgent:
                        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
                    userAgentData: { mobile: true },
                },
                result: false,
            },
            {
                description:
                    'Android tablet-style UA without Mobile and no userAgentData',
                navigator: {
                    userAgent:
                        'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                },
                result: false,
            },
            {
                description:
                    'Android phone with userAgentData.mobile and Chrome UA',
                navigator: {
                    userAgent:
                        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
                    userAgentData: { mobile: true },
                },
                result: true,
            },
            {
                description:
                    'Android phone UA without userAgentData (fallback: Mobile token)',
                navigator: {
                    userAgent:
                        'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
                },
                result: true,
            },
            {
                description:
                    'Android desktop mode (userAgentData.mobile false)',
                navigator: {
                    userAgent:
                        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                    userAgentData: { mobile: false },
                },
                result: false,
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
    getMultisendTargetOutputs: {
        expectedReturns: [
            {
                description: 'Airdrop',
                userMultisendInput: `ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr,150\necash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035,50\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6,150\necash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj,4400\necash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly,50\necash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m,200`,
                targetOutputs: [
                    {
                        script: Script.fromAddress(
                            'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
                        ),
                        sats: 15000n,
                    },
                    {
                        script: Script.fromAddress(
                            'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                        ),
                        sats: 5000n,
                    },
                    {
                        script: Script.fromAddress(
                            'ecash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6',
                        ),
                        sats: 15000n,
                    },
                    {
                        script: Script.fromAddress(
                            'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                        ),
                        sats: 440000n,
                    },
                    {
                        script: Script.fromAddress(
                            'ecash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly',
                        ),
                        sats: 5000n,
                    },
                    {
                        script: Script.fromAddress(
                            'ecash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m',
                        ),
                        sats: 20000n,
                    },
                ],
            },
            {
                description:
                    'Multisend format with extra space around address and value',
                userMultisendInput: `   ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr   ,   150\n   ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035 ,     50       `,
                targetOutputs: [
                    {
                        script: Script.fromAddress(
                            'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
                        ),
                        sats: 15000n,
                    },
                    {
                        script: Script.fromAddress(
                            'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                        ),
                        sats: 5000n,
                    },
                ],
            },
            {
                description: 'One address in multi format',
                userMultisendInput: `ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr,150`,
                targetOutputs: [
                    {
                        script: Script.fromAddress(
                            'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
                        ),
                        sats: 15000n,
                    },
                ],
            },
            {
                description: 'Multisend including a non-integer JS result',
                userMultisendInput: `ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr,151.52\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6,151.52\necash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj,4444.44\necash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly,50.51\necash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m,202.02`,
                targetOutputs: [
                    {
                        script: Script.fromAddress(
                            'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
                        ),
                        sats: 15152n,
                    },
                    {
                        script: Script.fromAddress(
                            'ecash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6',
                        ),
                        sats: 15152n,
                    },
                    {
                        script: Script.fromAddress(
                            'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                        ),
                        sats: 444444n,
                    },
                    {
                        script: Script.fromAddress(
                            'ecash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly',
                        ),
                        sats: 5051n,
                    },
                    {
                        script: Script.fromAddress(
                            'ecash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m',
                        ),
                        sats: 20202n,
                    },
                ],
            },
        ],
    },
};

// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

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
};

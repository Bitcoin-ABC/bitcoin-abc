// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { walletWithXecAndTokens } from 'components/fixtures/mocks';

export default {
    initializeCashtabStateForTests: {
        expectedReturns: [
            {
                description: 'Wallet with xec and tokens',
                wallet: walletWithXecAndTokens,
            },
        ],
    },
};

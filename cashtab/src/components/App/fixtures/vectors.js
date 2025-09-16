// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    walletWithXecAndTokens_pre_2_1_0,
    walletWithXecAndTokensActive,
    validActiveWallets,
} from 'components/App/fixtures/mocks';

export default {
    initializeCashtabStateAtLegacyWalletKeysForTests: {
        expectedReturns: [
            {
                description: 'Wallet with xec and tokens',
                wallet: walletWithXecAndTokens_pre_2_1_0,
            },
        ],
    },
    initializeCashtabStateForTests: {
        expectedReturns: [
            {
                description: 'Wallet with xec and tokens',
                wallets: [walletWithXecAndTokensActive],
            },
            {
                description: 'Multiple wallets',
                wallets: [walletWithXecAndTokensActive, ...validActiveWallets],
            },
        ],
    },
};

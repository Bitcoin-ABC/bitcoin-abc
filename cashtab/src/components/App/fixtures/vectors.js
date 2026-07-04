// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    walletWithXecAndTokensActive,
    validActiveWallets,
} from 'components/App/fixtures/mocks';

export default {
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

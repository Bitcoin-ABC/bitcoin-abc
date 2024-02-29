// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { walletWithXecAndTokens } from 'components/fixtures/mocks';
export const aliasAddressTwoRegisteredOnePending = {
    registered: [
        {
            alias: 'chicken555',
            address: `${walletWithXecAndTokens.Path1899.cashAddress}`,
            txid: 'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d',
            blockheight: 792417,
        },
        {
            alias: 'chicken666',
            address: `${walletWithXecAndTokens.Path1899.cashAddress}`,
            txid: 'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d',
            blockheight: 792416,
        },
    ],
    pending: [
        {
            alias: 'chicken444',
            address: `${walletWithXecAndTokens.Path1899.cashAddress}`,
            txid: 'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d',
            blockheight: 792418,
        },
    ],
};
export const aliasAddressOneRegisteredNoPending = {
    registered: [
        {
            alias: 'chicken555',
            address: `${walletWithXecAndTokens.Path1899.cashAddress}`,
            txid: 'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d',
            blockheight: 792417,
        },
    ],
    pending: [],
};
export const aliasAddressNoRegisteredOnePending = {
    registered: [],
    pending: [
        {
            alias: 'chicken444',
            address: `${walletWithXecAndTokens.Path1899.cashAddress}`,
            txid: 'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d',
            blockheight: 792418,
        },
    ],
};
export const aliasPricesResp = {
    note: 'alias-server is in beta and these prices are not finalized.',
    prices: [
        {
            startHeight: 785000,
            fees: {
                1: 558,
                2: 557,
                3: 556,
                4: 555,
                5: 554,
                6: 553,
                7: 552,
                8: 551,
                9: 551,
                10: 551,
                11: 551,
                12: 551,
                13: 551,
                14: 551,
                15: 551,
                16: 551,
                17: 551,
                18: 551,
                19: 551,
                20: 551,
                21: 551,
            },
        },
    ],
};

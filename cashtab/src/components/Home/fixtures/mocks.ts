// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ActiveCashtabWallet } from 'wallet';

export const walletWithZeroBalanceZeroHistory: ActiveCashtabWallet = {
    mnemonic:
        'beauty shoe decline spend still weird slot snack coach flee between paper',
    name: 'Transaction Fixtures',
    pk: '031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
    hash: '3a5fb236934ec078b4507c303d3afd82067f8fc1',
    address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
    sk: '512d34d3b8f4d269219fd087c80e22b0212769227226dd6b23966cf0aa2f167f',
    state: {
        balanceSats: 0,
        slpUtxos: [],
        nonSlpUtxos: [],
        tokens: new Map(),
    },
};

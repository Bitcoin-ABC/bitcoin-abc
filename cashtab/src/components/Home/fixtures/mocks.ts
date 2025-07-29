// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { fromHex } from 'ecash-lib';
import { CashtabWallet, CashtabWalletPaths } from 'wallet';

export const walletWithZeroBalanceZeroHistory: CashtabWallet = {
    mnemonic:
        'beauty shoe decline spend still weird slot snack coach flee between paper',
    name: 'Transaction Fixtures',
    paths: new Map([
        [
            145,
            {
                hash: 'a28f8852f868f88e71ec666c632d6f86e978f046',
                address: 'ecash:qz3glzzjlp503rn3a3nxccedd7rwj78sgczljhvzv3',
                wif: 'L2HnC8ZT5JuwVFjrAjJUBs2tmmBoxdVa1MVCJccqV8S9YPoR1NuZ',
                sk: fromHex(
                    '9747c0c6a6b4a1025b222a79ccad3df7330cbf3e6731de58500f865d0370b861',
                ),
                pk: fromHex(
                    '03939a29fd67fa602926637a82f53e1826696353613cac03e34160f040ae2dfcb5',
                ),
            },
        ],
        [
            245,
            {
                pk: fromHex(
                    '03f73fe2631da9732f2480debbc7ff8d99c5c06764e0f5095b789ff190788bee72',
                ),
                hash: '600efb12a6f813eccf13171a8bc62055212d8d6c',
                address: 'ecash:qpsqa7cj5mup8mx0zvt34z7xyp2jztvdds67wajntk',
                wif: 'L3ndnMkn4574McqhPujguusu48NrmeLUgWYMkRpYQGLXDGAwGmPq',
                sk: fromHex(
                    'c3f637ba1e3cdd10cace41350058a3698c5bd413b69a358a2a2b955843ea043c',
                ),
            },
        ],
        [
            1899,
            {
                pk: fromHex(
                    '031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
                ),
                hash: '3a5fb236934ec078b4507c303d3afd82067f8fc1',
                address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                wif: 'KywWPgaLDwvW1tWUtUvs13jgqaaWMoNANLVYoKcK9Ddbpnch7Cmw',
                sk: fromHex(
                    '512d34d3b8f4d269219fd087c80e22b0212769227226dd6b23966cf0aa2f167f',
                ),
            },
        ],
    ]) as CashtabWalletPaths,
    state: {
        balanceSats: 0,
        slpUtxos: [],
        nonSlpUtxos: [],
        tokens: new Map(),
        parsedTxHistory: [],
    },
};

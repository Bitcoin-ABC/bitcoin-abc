// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export const validXecAirdropExclusionList =
    'ecash:qrqgwxnaxlfagezvr2zj4s9yee6rrs96dyguh7zsvk,' +
    'ecash:qzsha6zk9m0f3hlfe5q007zdwnzvn3vwuuzel2lfzv,' +
    'ecash:qqlkyzmeupf7q8t2ttf2u8xgyk286pg4wyz0v403dj,' +
    'ecash:qz2taa43tljkvnvkeqv9pyx337hmg0zclqfqjrqst4,' +
    'ecash:qp0hlj26nwjpk9c3f0umjz7qmwpzfh0fhckq4zj9s6';

export const invalidXecAirdropExclusionListPrefixless =
    'ecash:qrqgwxnaxlfagezvr2zj4s9yee6rrs96dyguh7zsvk,' +
    'ecash:qzsha6zk9m0f3hlfe5q007zdwnzvn3vwuuzel2lfzv,' +
    'ecash:qqlkyzmeupf7q8t2ttf2u8xgyk286pg4wyz0v403dj,' +
    'ecash:qz2taa43tljkvnvkeqv9pyx337hmg0zclqfqjrqst4,' +
    'qp0hlj26nwjpk9c3f0umjz7qmwpzfh0fhckq4zj9s6';

export const invalidXecAirdropExclusionList =
    'ecash:qrqgwxnaxlfagezvr2zj4s9yee6rrs96dyguh7zsvk,' +
    'ecash:qzsha6zk9m0f3hlfe5q007zdwnzvn3vwuuzel2lfzv,' +
    'ecash:qqlqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqyz0v403dj,' +
    'ecash:qz2taa43tljkvnvkeqv9pyx337hmg0zclqfqjrqst4,' +
    'ecash:qp0hlj26nwjpk9c3f0umjz7qmwpzfh0fhckq4zj9s6';

export const validWalletJson = {
    mnemonic: 'one two three four five six seven eight nine ten eleven twelve',
    name: 'test',
    address: 'string',
    hash: 'string',
    wif: 'string',
    sk: 'string',
    pk: 'string',
    state: {
        balanceSats: 0,
        nonSlpUtxos: [],
        slpUtxos: [],
        tokens: [],
        parsedTxHistory: [],
    },
};

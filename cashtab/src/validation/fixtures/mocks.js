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

export const validWalletPre_2_1_0 = {
    mnemonic: 'one two three four five six seven eight nine ten eleven twelve',
    name: 'test',
    Path145: {
        cashAddress: 'ecash:',
        fundingWif: '',
        hash160: 'present',
        publicKey: 'present',
    },
    Path245: {
        cashAddress: 'ecash:',
        fundingWif: '',
        hash160: 'present',
        publicKey: 'present',
    },
    Path1899: {
        cashAddress: 'ecash:',
        fundingWif: '',
        hash160: 'present',
        publicKey: 'present',
    },
    state: {
        balances: { totalBalance: '10.00', totalBalanceInSatoshis: '1000' },
        nonSlpUtxos: [],
        slpUtxos: [],
        tokens: [],
    },
};

export const validWalletJson = {
    mnemonic: 'one two three four five six seven eight nine ten eleven twelve',
    name: 'test',
    paths: [[1899, { address: 'string', hash: 'string', wif: 'string' }]],
    state: {
        balanceSats: 0,
        nonSlpUtxos: [],
        slpUtxos: [],
        tokens: [],
    },
};

export const validWalletJsonMultiPath = {
    mnemonic: 'one two three four five six seven eight nine ten eleven twelve',
    name: 'test',
    paths: [
        [1899, { address: 'string', hash: 'string', wif: 'string' }],
        [145, { address: 'string', hash: 'string', wif: 'string' }],
    ],
    state: {
        balanceSats: 1000,
        nonSlpUtxos: [],
        slpUtxos: [],
        tokens: [],
    },
};

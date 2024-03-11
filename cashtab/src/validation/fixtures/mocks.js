// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export const validXecAirdropList =
    'ecash:qrqgwxnaxlfagezvr2zj4s9yee6rrs96dyguh7zsvk,7\n' +
    'ecash:qzsha6zk9m0f3hlfe5q007zdwnzvn3vwuuzel2lfzv,67\n' +
    'ecash:qqlkyzmeupf7q8t2ttf2u8xgyk286pg4wyz0v403dj,4376\n' +
    'ecash:qz2taa43tljkvnvkeqv9pyx337hmg0zclqfqjrqst4,673728\n' +
    'ecash:qp0hlj26nwjpk9c3f0umjz7qmwpzfh0fhckq4zj9s6,23673\n';

export const invalidXecAirdropList =
    'ecash:qrqgwxnaxlfagezvr2zj4s9yee6rrs96dyguh7zsvk,7\n' +
    'ecash:qzsha6zk9m0f3hlfe5q007zdwnzvn3vwuuzel2lfzv,3\n' +
    'ecash:qqlkyzmeupf7q8t2ttf2u8xgyk286pg4wyz0v403dj,4376\n' +
    'ecash:qz2taa43tljkvnvkeqv9pyx337hmg0zclqfqjrqst4,673728\n' +
    'ecash:qp0hlj26nwjpk9c3f0umjz7qmwpzfh0fhckq4zj9s6,23673\n';

export const invalidXecAirdropListMultipleInvalidValues =
    'ecash:qrqgwxnaxlfagezvr2zj4s9yee6rrs96dyguh7zsvk,7\n' +
    'ecash:qzsha6zk9m0f3hlfe5q007zdwnzvn3vwuuzel2lfzv,3,3,4\n' +
    'ecash:qqlkyzmeupf7q8t2ttf2u8xgyk286pg4wyz0v403dj,4,1,2\n' +
    'ecash:qz2taa43tljkvnvkeqv9pyx337hmg0zclqfqjrqst4,673728\n' +
    'ecash:qp0hlj26nwjpk9c3f0umjz7qmwpzfh0fhckq4zj9s6,23673\n';

export const invalidXecAirdropListMultipleValidValues =
    'ecash:qrqgwxnaxlfagezvr2zj4s9yee6rrs96dyguh7zsvk,7\n' +
    'ecash:qzsha6zk9m0f3hlfe5q007zdwnzvn3vwuuzel2lfzv,8,9,44\n' +
    'ecash:qqlkyzmeupf7q8t2ttf2u8xgyk286pg4wyz0v403dj,4376,43,1212\n' +
    'ecash:qz2taa43tljkvnvkeqv9pyx337hmg0zclqfqjrqst4,673728\n' +
    'ecash:qp0hlj26nwjpk9c3f0umjz7qmwpzfh0fhckq4zj9s6,23673\n';

export const validXecAirdropExclusionList =
    'ecash:qrqgwxnaxlfagezvr2zj4s9yee6rrs96dyguh7zsvk,' +
    'ecash:qzsha6zk9m0f3hlfe5q007zdwnzvn3vwuuzel2lfzv,' +
    'ecash:qqlkyzmeupf7q8t2ttf2u8xgyk286pg4wyz0v403dj,' +
    'ecash:qz2taa43tljkvnvkeqv9pyx337hmg0zclqfqjrqst4,' +
    'ecash:qp0hlj26nwjpk9c3f0umjz7qmwpzfh0fhckq4zj9s6';

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

export const validWallet = {
    mnemonic: 'one two three four five six seven eight nine ten eleven twelve',
    name: 'test',
    paths: [{ path: 1899, address: 'string', hash: 'string', wif: 'string' }],
    state: {
        balanceSats: 1000,
        nonSlpUtxos: [],
        slpUtxos: [],
        tokens: [],
    },
};

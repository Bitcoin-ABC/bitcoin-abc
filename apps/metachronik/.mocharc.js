// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

module.exports = {
    'require': ['ts-node/register'],
    'extension': ['ts'],
    'spec': 'src/**/*.test.ts',
    'timeout': 10000,
    'node-option': [
        'experimental-specifier-resolution=node',
        'loader=ts-node/esm',
    ],
};

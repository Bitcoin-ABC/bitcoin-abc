// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
module.exports = {
    require: ['mocha-suppress-logs', 'ts-node/register'],
    extensions: ['ts'],
    spec: ['src/**/*.test.ts'],
};

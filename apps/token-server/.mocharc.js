// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
module.exports = {
    require: ['mocha-suppress-logs', 'ts-node/register'],
    extensions: ['ts'],
    spec: ['src/**/*.test.ts'],
    timeout: 30000, // 30 seconds per test (MongoDB memory server may need time to start)
    exit: true, // Force exit after tests complete (prevents hanging on open handles)
};

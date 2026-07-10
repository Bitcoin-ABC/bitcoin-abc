// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
module.exports = {
    require: ['mocha-suppress-logs'],
    import: 'tsx',
    extensions: ['ts'],
    spec: ['src/**/*.test.ts'],
    timeout: 30000,
    exit: true,
};

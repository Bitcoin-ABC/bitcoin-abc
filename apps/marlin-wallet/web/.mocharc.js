// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
module.exports = {
    import: ['tsx'],
    extensions: ['ts'],
    spec: ['test/**/*.test.ts'],
    timeout: 3600,
    exit: true,
    require: ['mocha-suppress-logs'],
};

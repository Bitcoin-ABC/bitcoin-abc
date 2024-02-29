// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const { createHash } = require('crypto');

module.exports = env => {
    const hash = createHash('md5');
    hash.update(JSON.stringify(env));

    return hash.digest('hex');
};

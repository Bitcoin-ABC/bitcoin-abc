// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const { consume, consumeNextPush, getStackArray } = require('./src/script');
const { isHexString, swapEndianness } = require('./src/utils');
module.exports = {
    consume,
    consumeNextPush,
    getStackArray,
    isHexString,
    swapEndianness,
};

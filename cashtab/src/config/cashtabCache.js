// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Default cashtab cache object used for validation and initialization of new wallets without a cache
const defaultCashtabCache = {
    tokens: new Map(),
};

export default defaultCashtabCache;

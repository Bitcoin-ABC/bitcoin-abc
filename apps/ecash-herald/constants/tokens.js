// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';

/**
 * tokens.js
 *
 * A map of token data to limit chronik token calls
 * Opportunity to improve the app by making this a database
 * However primary driver here is to cover slp2 tokens which are not yet indexed and readily add-able
 */

const cachedTokenInfoMap = new Map();
cachedTokenInfoMap.set(
    'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
    {
        name: 'Credo In Unum Deo',
        ticker: 'CRD',
        url: 'https://crd.network/token',
        data: '',
        authPubKey: '',
        decimals: 4,
        numMintBatons: 1,
    },
);

module.exports = cachedTokenInfoMap;

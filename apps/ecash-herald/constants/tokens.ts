// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { GenesisInfo } from 'chronik-client';
/**
 * tokens.js
 *
 * A map of token data to limit chronik token calls
 * Opportunity to improve the app by making this a database
 * However primary driver here is to cover slp2 tokens which are not yet indexed and readily add-able
 */

type TokenInfoMap = Map<string, GenesisInfo>;
const cachedTokenInfoMap: TokenInfoMap = new Map();
cachedTokenInfoMap.set(
    'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
    {
        tokenTicker: 'CRD',
        tokenName: 'Credo In Unum Deo',
        url: 'https://crd.network/token',
        decimals: 4,
        authPubkey:
            '0334b744e6338ad438c92900c0ed1869c3fd2c0f35a4a9b97a88447b6e2b145f10',
    },
);

export default cachedTokenInfoMap;

// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Default cashtab cache object used for validation and initialization of new wallets without a cache
// We include an info object for unknown token id "0000000000000000000000000000000000000000000000000000000000000000"
// We may come across utxos with this tokenId as it may be returned by chronik, however
// we cannot get chronik.tx(UNKNOWN_TOKEN_ID) or chronik.token(UNKNOWN_TOKEN_ID)
import { TokenType, GenesisInfo, BlockMetadata } from 'chronik-client';

export interface CashtabCachedTokenInfo {
    tokenType: TokenType;
    timeFirstSeen: number;
    genesisInfo: GenesisInfo;
    block?: BlockMetadata;
    genesisSupply: string;
    genesisMintBatons: number;
    genesisOutputScripts: string[];
    groupTokenId?: string;
}

interface CashtabCacheInterface {
    tokens: Map<string, CashtabCachedTokenInfo>;
}

export const UNKNOWN_TOKEN_ID =
    '0000000000000000000000000000000000000000000000000000000000000000';
export const UNKNOWN_TOKEN_CACHED_INFO: CashtabCachedTokenInfo = {
    tokenType: {
        protocol: 'SLP',
        type: 'SLP_TOKEN_TYPE_UNKNOWN',
        number: 0,
    },
    timeFirstSeen: 0,
    genesisInfo: {
        tokenTicker: 'UNKNOWN',
        tokenName: 'UNKNOWN',
        url: 'UNKNOWN',
        decimals: 0,
        hash: 'UNKNOWN',
    },
    block: {
        height: 0,
        hash: 'UNKNOWN',
        timestamp: 0,
    },
    genesisSupply: '0',
    genesisMintBatons: 0,
    genesisOutputScripts: [],
};

class CashtabCache implements CashtabCacheInterface {
    tokens: Map<string, CashtabCachedTokenInfo>;
    constructor(tokens = new Map()) {
        const defaultTokensCache = new Map([
            [UNKNOWN_TOKEN_ID, UNKNOWN_TOKEN_CACHED_INFO],
        ]);
        this.tokens = new Map([...defaultTokensCache, ...tokens]);
    }
}

export default CashtabCache;

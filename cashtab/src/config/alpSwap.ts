// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/** Pair promoted on Agora when alp-dex lists it. */
export interface FeaturedAgoraSwapPair {
    tokenIdA: string;
    tokenIdB: string;
    tickerA: string;
    tickerB: string;
}

/** Staked XEC (XECX) — same id as cashtab token whitelist. */
export const XECX_TOKEN_ID =
    'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4';

/** Firma — same id as constants/tokens FIRMA.tokenId. */
export const FIRMA_TOKEN_ID =
    '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0';

/**
 * AlpSwap against standalone alp-dex (no coordinator).
 * Discovery, quotes, templates, and settle use the first URL today.
 */
export const alpSwap = {
    baseUrls: ['https://lp.alpswap.com'],
    /**
     * Agora "Swaps" rows. Only render a pair when alp-dex /status
     * lists it (see featuredPairsListedOnStatus).
     */
    featuredAgoraPairs: [
        {
            tokenIdA: XECX_TOKEN_ID,
            tokenIdB: FIRMA_TOKEN_ID,
            tickerA: 'XECX',
            tickerB: 'FIRMA',
        },
    ] as FeaturedAgoraSwapPair[],
    /**
     * Shown when the exchange cannot be reached. The underlying error
     * is logged to the console, not the UI.
     */
    unavailableMessage: 'AlpSwap is temporarily unavailable',
    /** Debounce for size quotes while typing amounts */
    quoteDebounceMs: 500,
    /**
     * Abort hung /status, quote, and settle fetches. Long enough for
     * alp-dex's wallet queue (fuel / sign / broadcast).
     */
    requestTimeoutMs: 60_000,
};

/**
 * First configured alp-dex node.
 */
export const alpSwapBaseUrl = (): string => {
    const url = alpSwap.baseUrls[0];
    if (url === undefined) {
        throw new Error('alpSwap.baseUrls must include at least one URL');
    }
    return url;
};

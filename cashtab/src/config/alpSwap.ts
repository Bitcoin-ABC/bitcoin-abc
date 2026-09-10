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
    /**
     * Quotes at or above this price-impact percent require an explicit
     * accept before settle. The swap is still allowed.
     */
    highPriceImpactPct: 5,
};

/**
 * True when a quote's price impact meets or exceeds
 * {@link alpSwap.highPriceImpactPct}.
 */
export const isHighPriceImpact = (priceImpactPct: number): boolean => {
    if (!Number.isFinite(priceImpactPct)) {
        return false;
    }
    return priceImpactPct >= alpSwap.highPriceImpactPct;
};

/**
 * Implied fiat-per-XEC from an XECX↔FIRMA to-per-from rate.
 * XECX is treated as 1 XEC; FIRMA is scaled by `firmaPrice` (fiat per 1 FIRMA).
 */
export const fiatPerXecFromDexRate = (
    toPerFrom: number,
    fromTokenId: string,
    toTokenId: string,
    firmaPrice: number,
): number | null => {
    if (!Number.isFinite(toPerFrom) || toPerFrom <= 0) {
        return null;
    }
    if (!Number.isFinite(firmaPrice) || firmaPrice <= 0) {
        return null;
    }
    const from = fromTokenId.toLowerCase();
    const to = toTokenId.toLowerCase();
    const xecx = XECX_TOKEN_ID.toLowerCase();
    const firma = FIRMA_TOKEN_ID.toLowerCase();
    let firmaPerXecx: number;
    if (from === xecx && to === firma) {
        firmaPerXecx = toPerFrom;
    } else if (from === firma && to === xecx) {
        firmaPerXecx = 1 / toPerFrom;
    } else {
        return null;
    }
    return firmaPerXecx * firmaPrice;
};

/**
 * Implied fiat-per-XEC from the two human qtys on an XECX↔FIRMA fill.
 * Always FIRMA/XECX (USD per XEC), regardless of which token is from vs to.
 */
export const fiatPerXecFromPairQtys = (
    fromTokenId: string,
    toTokenId: string,
    fromQty: number,
    toQty: number,
    firmaPrice: number,
): number | null => {
    if (!Number.isFinite(fromQty) || !Number.isFinite(toQty)) {
        return null;
    }
    if (!Number.isFinite(firmaPrice) || firmaPrice <= 0) {
        return null;
    }
    const from = fromTokenId.toLowerCase();
    const to = toTokenId.toLowerCase();
    const xecx = XECX_TOKEN_ID.toLowerCase();
    const firma = FIRMA_TOKEN_ID.toLowerCase();
    let xecxQty: number;
    let firmaQty: number;
    if (from === xecx && to === firma) {
        xecxQty = fromQty;
        firmaQty = toQty;
    } else if (from === firma && to === xecx) {
        xecxQty = toQty;
        firmaQty = fromQty;
    } else {
        return null;
    }
    if (!(xecxQty > 0) || !(firmaQty > 0)) {
        return null;
    }
    return (firmaQty / xecxQty) * firmaPrice;
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

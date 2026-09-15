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
     * Live seller+slush book. alp-dex advertises this as `bookWs` on
     * GET /api/v1/status (WS upgrade, same host as baseUrls).
     */
    bookWsPath: '/api/v1/book',
    /** Delay before reopening the book socket after an unexpected close. */
    bookWsReconnectMs: 2_000,
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

/** Treat |pct| below this as in line with CoinGecko. */
export const DEX_VS_MARKET_INLINE_PCT = 0.05;

export type DexVsMarketSide = 'above' | 'below' | 'inline';
export type DexDealDirection = 'sell-xecx' | 'buy-xecx';

export interface DexVsMarket {
    pctAbs: number;
    vsMarket: DexVsMarketSide;
    /** Sell XECX when DEX FIRMA/XEC is above CoinGecko (XEC is rich on DEX). */
    deal: DexDealDirection | null;
}

/**
 * Implied FIRMA-per-XEC from an XECX↔FIRMA to-per-from rate.
 * XECX is treated as 1 XEC.
 */
export const firmaPerXecFromDexRate = (
    toPerFrom: number,
    fromTokenId: string,
    toTokenId: string,
): number | null => {
    if (!Number.isFinite(toPerFrom) || toPerFrom <= 0) {
        return null;
    }
    const from = fromTokenId.toLowerCase();
    const to = toTokenId.toLowerCase();
    const xecx = XECX_TOKEN_ID.toLowerCase();
    const firma = FIRMA_TOKEN_ID.toLowerCase();
    if (from === xecx && to === firma) {
        return toPerFrom;
    }
    if (from === firma && to === xecx) {
        return 1 / toPerFrom;
    }
    return null;
};

/**
 * Implied FIRMA-per-XEC from the two human qtys on an XECX↔FIRMA fill.
 * Always FIRMA/XECX, regardless of which token is from vs to.
 */
export const firmaPerXecFromPairQtys = (
    fromTokenId: string,
    toTokenId: string,
    fromQty: number,
    toQty: number,
): number | null => {
    if (!Number.isFinite(fromQty) || !Number.isFinite(toQty)) {
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
    return firmaQty / xecxQty;
};

/**
 * CoinGecko XEC fiat price expressed as FIRMA per XEC.
 */
export const firmaPerXecFromMarket = (
    fiatPrice: number,
    firmaPrice: number,
): number | null => {
    if (!Number.isFinite(fiatPrice) || fiatPrice <= 0) {
        return null;
    }
    if (!Number.isFinite(firmaPrice) || firmaPrice <= 0) {
        return null;
    }
    return fiatPrice / firmaPrice;
};

/**
 * How far the DEX FIRMA/XEC rate sits from CoinGecko, and which swap
 * direction is the better deal.
 */
export const dexVsMarket = (
    dexFirmaPerXec: number,
    marketFirmaPerXec: number,
): DexVsMarket | null => {
    if (!Number.isFinite(dexFirmaPerXec) || dexFirmaPerXec <= 0) {
        return null;
    }
    if (!Number.isFinite(marketFirmaPerXec) || marketFirmaPerXec <= 0) {
        return null;
    }
    const pct =
        ((dexFirmaPerXec - marketFirmaPerXec) / marketFirmaPerXec) * 100;
    const pctAbs = Math.abs(pct);
    if (pctAbs < DEX_VS_MARKET_INLINE_PCT) {
        return { pctAbs, vsMarket: 'inline', deal: null };
    }
    if (pct > 0) {
        return { pctAbs, vsMarket: 'above', deal: 'sell-xecx' };
    }
    return { pctAbs, vsMarket: 'below', deal: 'buy-xecx' };
};

const formatDiscountPct = (pct: number): string => {
    if (Math.abs(pct - Math.round(pct)) < 0.05) {
        return String(Math.round(pct));
    }
    return pct.toFixed(1);
};

/**
 * Signed AlpDex vs CoinGecko percent, e.g. `-84.1%` or `+20%`.
 */
export const formatDexVsMarketPct = (cmp: DexVsMarket): string => {
    const body = formatDiscountPct(cmp.pctAbs);
    if (cmp.vsMarket === 'above') {
        return `+${body}%`;
    }
    if (cmp.vsMarket === 'below') {
        return `-${body}%`;
    }
    return `${body}%`;
};

export interface AlignAmmToSpotTrade {
    fromTicker: 'XECX' | 'FIRMA';
    toTicker: 'XECX' | 'FIRMA';
    fromQty: number;
    toQty: number;
}

/**
 * Constant-product trade that moves XECX↔FIRMA reserves to CoinGecko
 * FIRMA-per-XEC. No-fee; the unique size that sets pool price to spot.
 */
export const alignAmmToSpotTrade = (
    xecxReserveAtoms: string,
    firmaReserveAtoms: string,
    xecxDecimals: number,
    firmaDecimals: number,
    marketFirmaPerXec: number,
): AlignAmmToSpotTrade | null => {
    if (!Number.isInteger(xecxDecimals) || !Number.isInteger(firmaDecimals)) {
        return null;
    }
    if (!Number.isFinite(marketFirmaPerXec) || marketFirmaPerXec <= 0) {
        return null;
    }
    const xecxQty = Number(xecxReserveAtoms) / 10 ** xecxDecimals;
    const firmaQty = Number(firmaReserveAtoms) / 10 ** firmaDecimals;
    if (!(xecxQty > 0) || !(firmaQty > 0)) {
        return null;
    }
    const k = xecxQty * firmaQty;
    const xecxTarget = Math.sqrt(k / marketFirmaPerXec);
    const firmaTarget = Math.sqrt(k * marketFirmaPerXec);
    if (!Number.isFinite(xecxTarget) || !Number.isFinite(firmaTarget)) {
        return null;
    }
    if (!(xecxTarget > 0) || !(firmaTarget > 0)) {
        return null;
    }
    const dXecx = xecxTarget - xecxQty;
    const dFirma = firmaTarget - firmaQty;
    if (Math.abs(dXecx) / xecxQty < 1e-6) {
        return null;
    }
    if (dXecx > 0) {
        return {
            fromTicker: 'XECX',
            toTicker: 'FIRMA',
            fromQty: dXecx,
            toQty: -dFirma,
        };
    }
    return {
        fromTicker: 'FIRMA',
        toTicker: 'XECX',
        fromQty: dFirma,
        toQty: -dXecx,
    };
};

/**
 * Human-unit XECX and FIRMA balances from `/price` reserve atoms.
 */
export const humanReservesFromAtoms = (
    xecxReserveAtoms: string,
    firmaReserveAtoms: string,
    xecxDecimals: number,
    firmaDecimals: number,
): { xecx: number; firma: number } | null => {
    if (!Number.isInteger(xecxDecimals) || !Number.isInteger(firmaDecimals)) {
        return null;
    }
    const xecx = Number(xecxReserveAtoms) / 10 ** xecxDecimals;
    const firma = Number(firmaReserveAtoms) / 10 ** firmaDecimals;
    if (!(xecx > 0) || !(firma > 0)) {
        return null;
    }
    return { xecx, firma };
};

/**
 * Implied FIRMA-per-XECX from pool reserve atoms. Independent of swap
 * direction — flipping XECX↔FIRMA must not change this price.
 */
export const firmaPerXecFromReserves = (
    xecxReserveAtoms: string,
    firmaReserveAtoms: string,
    xecxDecimals: number,
    firmaDecimals: number,
): number | null => {
    const qty = humanReservesFromAtoms(
        xecxReserveAtoms,
        firmaReserveAtoms,
        xecxDecimals,
        firmaDecimals,
    );
    if (qty === null) {
        return null;
    }
    return qty.firma / qty.xecx;
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
    if (!Number.isFinite(firmaPrice) || firmaPrice <= 0) {
        return null;
    }
    const firmaPerXec = firmaPerXecFromDexRate(
        toPerFrom,
        fromTokenId,
        toTokenId,
    );
    if (firmaPerXec === null) {
        return null;
    }
    return firmaPerXec * firmaPrice;
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
    if (!Number.isFinite(firmaPrice) || firmaPrice <= 0) {
        return null;
    }
    const firmaPerXec = firmaPerXecFromPairQtys(
        fromTokenId,
        toTokenId,
        fromQty,
        toQty,
    );
    if (firmaPerXec === null) {
        return null;
    }
    return firmaPerXec * firmaPrice;
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

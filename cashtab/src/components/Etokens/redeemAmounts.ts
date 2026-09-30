// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { DEX_VS_MARKET_INLINE_PCT } from 'config/alpSwap';

export type RedeemTokenKind = 'xecx' | 'firma';

/** Redeem destination switch: instant XEC vs AlpSwap FIRMA-market path. */
export type RedeemOutput = 'xec' | 'firma';

/** Same percent shortcuts as Agora buy (no slider on redeem). */
export const REDEEM_PERCENT_OPTIONS = [25, 50, 75] as const;

/**
 * Floor `balance * percent / 100` to token decimals.
 * Returns null when the result is not a positive finite amount.
 */
export const redeemAmountForPercent = (
    balance: number,
    percent: number,
    decimals: number,
): number | null => {
    if (
        !Number.isFinite(balance) ||
        !Number.isFinite(percent) ||
        balance <= 0 ||
        percent <= 0 ||
        percent > 100 ||
        !Number.isInteger(decimals) ||
        decimals < 0 ||
        decimals > 9
    ) {
        return null;
    }
    const factor = 10 ** decimals;
    const amount =
        Math.floor((balance * percent * factor) / 100 + 1e-9) / factor;
    if (!(amount > 0) || amount > balance) {
        return null;
    }
    return amount;
};

/**
 * Convert an AlpDex AMM to-per-from rate for the redeem direction into
 * FIRMA-per-XECX for comparison with spot / XECUSD.
 */
export const firmaPerXecFromRedeemAmmRate = (
    kind: RedeemTokenKind,
    effectiveRate: number,
): number | null => {
    if (!Number.isFinite(effectiveRate) || effectiveRate <= 0) {
        return null;
    }
    if (kind === 'xecx') {
        // XECX → FIRMA: to-per-from is FIRMA per XECX
        return effectiveRate;
    }
    // FIRMA → XECX: to-per-from is XECX per FIRMA
    return 1 / effectiveRate;
};

/**
 * FIRMA-per-XECX from an AMM redeem quote.
 *
 * Prefers `effectiveRate`. When alp-dex returns 0 for small to-per-from
 * rates (observed on XECX→FIRMA), fall back to amountOut / amountIn.
 */
export const firmaPerXecFromRedeemAmmQuote = (
    kind: RedeemTokenKind,
    quote: {
        effectiveRate: number;
        amountIn: number;
        amountOut: number;
    },
): number | null => {
    let toPerFrom = quote.effectiveRate;
    if (
        !(toPerFrom > 0) &&
        Number.isFinite(quote.amountIn) &&
        Number.isFinite(quote.amountOut) &&
        quote.amountIn > 0 &&
        quote.amountOut > 0
    ) {
        toPerFrom = quote.amountOut / quote.amountIn;
    }
    return firmaPerXecFromRedeemAmmRate(kind, toPerFrom);
};

export interface RedeemOutputRate {
    /** e.g. `1 XECX = 1 XEC` */
    rateLine: string;
    /** Fiat value of that rate using XECUSD, when available. */
    fiatPerUnit: number | null;
    /** AlpDex price impact for a size quote, when available. */
    impactPct: number | null;
}

export interface RedeemOutputRates {
    xec: RedeemOutputRate | null;
    firma: RedeemOutputRate | null;
    /** Which switch option is the better deal, or similar / unknown. */
    best: RedeemOutput | 'similar' | null;
    /** True until we have the rates needed to render both sides. */
    loading: boolean;
    /** True while a size quote for the current redeem qty is in flight. */
    firmaRateLoading: boolean;
}

const formatRateQty = (rate: number, locale: string): string => {
    if (rate >= 1) {
        return rate.toLocaleString(locale, { maximumSignificantDigits: 6 });
    }
    return rate.toLocaleString(locale, { maximumSignificantDigits: 2 });
};

/**
 * Rates for the XEC / FIRMA redeem switch, valued with XECUSD (`fiatPrice`).
 *
 * - XEC: instant Agora redeem
 * - FIRMA: AlpSwap path (XECX→FIRMA or FIRMA→XECX), using a size quote
 *   (`alpSizeFirmaPerXec`) when available so slippage is reflected
 */
export const getRedeemOutputRates = ({
    kind,
    alpDexFirmaPerXec,
    alpSizeFirmaPerXec,
    alpSizeQuoteLoading,
    priceImpactPct,
    firmaBidPriceXec,
    fiatPrice,
    firmaInFiat,
    alpDexLoaded,
    userLocale,
}: {
    kind: RedeemTokenKind;
    alpDexFirmaPerXec: number | null;
    /** Size-effective FIRMA-per-XECX from AMM quote; preferred over spot. */
    alpSizeFirmaPerXec: number | null;
    alpSizeQuoteLoading: boolean;
    priceImpactPct: number | null;
    firmaBidPriceXec: number | null;
    fiatPrice: number | null;
    /** Fiat currency units per 1 FIRMA (1 for USD). */
    firmaInFiat: number | null;
    /** False while the AlpDex spot request is in flight. */
    alpDexLoaded: boolean;
    userLocale: string;
}): RedeemOutputRates => {
    const hasFiat =
        typeof fiatPrice === 'number' &&
        Number.isFinite(fiatPrice) &&
        fiatPrice > 0;
    const hasFirmaFiat =
        firmaInFiat !== null && Number.isFinite(firmaInFiat) && firmaInFiat > 0;
    const spotAlp =
        alpDexFirmaPerXec !== null &&
        Number.isFinite(alpDexFirmaPerXec) &&
        alpDexFirmaPerXec > 0
            ? alpDexFirmaPerXec
            : null;
    const sizeAlp =
        alpSizeFirmaPerXec !== null &&
        Number.isFinite(alpSizeFirmaPerXec) &&
        alpSizeFirmaPerXec > 0
            ? alpSizeFirmaPerXec
            : null;
    // Prefer size quote so Best deal tracks slippage; fall back to spot.
    const effectiveAlp = sizeAlp ?? spotAlp;
    const impact =
        sizeAlp !== null &&
        priceImpactPct !== null &&
        Number.isFinite(priceImpactPct)
            ? priceImpactPct
            : null;

    if (kind === 'xecx') {
        // XEC path is always 1:1 — never block on CoinGecko. Best deal needs
        // XECUSD (+ FIRMA fiat) to compare; omit the flare when missing.
        const loading = !alpDexLoaded;
        const xec: RedeemOutputRate = {
            rateLine: '1 XECX = 1 XEC',
            fiatPerUnit: hasFiat ? fiatPrice : null,
            impactPct: null,
        };
        const firma: RedeemOutputRate | null =
            effectiveAlp !== null
                ? {
                      rateLine: `1 XECX = ${formatRateQty(
                          effectiveAlp,
                          userLocale,
                      )} FIRMA`,
                      fiatPerUnit: hasFirmaFiat
                          ? effectiveAlp * firmaInFiat
                          : null,
                      impactPct: impact,
                  }
                : null;

        let best: RedeemOutputRates['best'] = null;
        if (
            !alpSizeQuoteLoading &&
            hasFiat &&
            hasFirmaFiat &&
            xec.fiatPerUnit !== null &&
            firma !== null &&
            firma.fiatPerUnit !== null
        ) {
            const pct =
                ((firma.fiatPerUnit - xec.fiatPerUnit) / xec.fiatPerUnit) * 100;
            if (Math.abs(pct) < DEX_VS_MARKET_INLINE_PCT) {
                best = 'similar';
            } else {
                best = pct > 0 ? 'firma' : 'xec';
            }
        }

        return {
            xec,
            firma,
            best,
            loading,
            firmaRateLoading: alpSizeQuoteLoading,
        };
    }

    // FIRMA page: need bid for XEC path and AlpDex for FIRMA (AlpSwap) path.
    // Do not block on CoinGecko — compare bid XEC vs AlpSwap XECX when needed.
    const hasBid =
        firmaBidPriceXec !== null &&
        Number.isFinite(firmaBidPriceXec) &&
        firmaBidPriceXec > 0;
    const loading = !alpDexLoaded || !hasBid;

    // FIRMA redeem compares XEC amounts only — never show a USD line.
    const xec: RedeemOutputRate | null = hasBid
        ? {
              rateLine: `1 FIRMA = ${formatRateQty(
                  firmaBidPriceXec,
                  userLocale,
              )} XEC`,
              fiatPerUnit: null,
              impactPct: null,
          }
        : null;

    const alpXecxPerFirma = effectiveAlp !== null ? 1 / effectiveAlp : null;
    const firma: RedeemOutputRate | null =
        alpXecxPerFirma !== null
            ? {
                  rateLine: `1 FIRMA = ${formatRateQty(
                      alpXecxPerFirma,
                      userLocale,
                  )} XECX`,
                  fiatPerUnit: null,
                  impactPct: impact,
              }
            : null;

    let best: RedeemOutputRates['best'] = null;
    if (!alpSizeQuoteLoading && hasBid && alpXecxPerFirma !== null) {
        // XECX ≈ XEC; compare XEC received at bid vs XECX from AlpSwap.
        const pct =
            ((alpXecxPerFirma - firmaBidPriceXec) / firmaBidPriceXec) * 100;
        if (Math.abs(pct) < DEX_VS_MARKET_INLINE_PCT) {
            best = 'similar';
        } else {
            best = pct > 0 ? 'firma' : 'xec';
        }
    }

    return {
        xec,
        firma,
        best,
        loading,
        firmaRateLoading: alpSizeQuoteLoading,
    };
};

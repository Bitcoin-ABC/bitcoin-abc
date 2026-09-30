// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    firmaPerXecFromRedeemAmmQuote,
    firmaPerXecFromRedeemAmmRate,
    getRedeemOutputRates,
    redeemAmountForPercent,
} from 'components/Etokens/redeemAmounts';

describe('redeemAmountForPercent', () => {
    it('floors balance percent to token decimals', () => {
        expect(redeemAmountForPercent(100, 25, 2)).toBe(25);
        expect(redeemAmountForPercent(100, 50, 2)).toBe(50);
        expect(redeemAmountForPercent(100, 75, 2)).toBe(75);
        expect(redeemAmountForPercent(10_000.99, 25, 2)).toBe(2500.24);
    });

    it('returns null for invalid inputs', () => {
        expect(redeemAmountForPercent(0, 25, 2)).toBeNull();
        expect(redeemAmountForPercent(100, 0, 2)).toBeNull();
        expect(redeemAmountForPercent(0.001, 25, 2)).toBeNull();
    });
});

describe('firmaPerXecFromRedeemAmmRate', () => {
    it('passes through XECX→FIRMA effective rate as FIRMA-per-XECX', () => {
        expect(firmaPerXecFromRedeemAmmRate('xecx', 0.000004)).toBe(0.000004);
    });

    it('inverts FIRMA→XECX effective rate to FIRMA-per-XECX', () => {
        expect(firmaPerXecFromRedeemAmmRate('firma', 250_000)).toBeCloseTo(
            0.000004,
        );
    });
});

describe('firmaPerXecFromRedeemAmmQuote', () => {
    it('falls back to amountOut/amountIn when XECX→FIRMA effectiveRate is 0', () => {
        // Live alp-dex returns effectiveRate 0 for XECX→FIRMA even when
        // amountIn/amountOut are populated.
        expect(
            firmaPerXecFromRedeemAmmQuote('xecx', {
                effectiveRate: 0,
                amountIn: 31_000_000,
                amountOut: 243.5323,
            }),
        ).toBeCloseTo(243.5323 / 31_000_000);
    });

    it('prefers a positive effectiveRate over amounts', () => {
        expect(
            firmaPerXecFromRedeemAmmQuote('firma', {
                effectiveRate: 117520.73,
                amountIn: 50,
                amountOut: 5_876_036.82,
            }),
        ).toBeCloseTo(1 / 117520.73);
    });
});

describe('getRedeemOutputRates', () => {
    const baseXecx = {
        kind: 'xecx' as const,
        alpDexFirmaPerXec: 0.000036,
        alpSizeFirmaPerXec: null,
        alpSizeQuoteLoading: false,
        priceImpactPct: null,
        firmaBidPriceXec: null,
        fiatPrice: 0.00003,
        firmaInFiat: 1,
        alpDexLoaded: true,
        userLocale: 'en-US',
    };

    it('marks FIRMA as best deal for XECX when AlpSwap beats XECUSD', () => {
        const rates = getRedeemOutputRates(baseXecx);
        expect(rates.loading).toBe(false);
        expect(rates.best).toBe('firma');
        expect(rates.xec?.rateLine).toBe('1 XECX = 1 XEC');
        expect(rates.firma?.rateLine).toContain('FIRMA');
    });

    it('marks XEC as best deal for XECX when AlpSwap is below XECUSD', () => {
        const rates = getRedeemOutputRates({
            ...baseXecx,
            alpDexFirmaPerXec: 0.00000478,
        });
        expect(rates.best).toBe('xec');
    });

    it('prefers size quote over spot so slippage can flip Best deal', () => {
        // Spot would favor FIRMA, but a large size quote slips below XECUSD
        const rates = getRedeemOutputRates({
            ...baseXecx,
            alpDexFirmaPerXec: 0.000036,
            alpSizeFirmaPerXec: 0.00002,
            priceImpactPct: 44.4,
        });
        expect(rates.best).toBe('xec');
        expect(rates.firma?.rateLine).toContain('0.00002');
        expect(rates.firma?.impactPct).toBeCloseTo(44.4);
    });

    it('hides Best deal while a size quote is loading', () => {
        const rates = getRedeemOutputRates({
            ...baseXecx,
            alpSizeQuoteLoading: true,
        });
        expect(rates.best).toBeNull();
        expect(rates.firmaRateLoading).toBe(true);
    });

    it('marks FIRMA (AlpSwap) best for FIRMA when XECX out beats the bid', () => {
        const rates = getRedeemOutputRates({
            kind: 'firma',
            alpDexFirmaPerXec: 0.000004,
            alpSizeFirmaPerXec: null,
            alpSizeQuoteLoading: false,
            priceImpactPct: null,
            firmaBidPriceXec: 200_000,
            fiatPrice: 0.000005,
            firmaInFiat: 1,
            alpDexLoaded: true,
            userLocale: 'en-US',
        });
        expect(rates.best).toBe('firma');
        expect(rates.firma?.rateLine).toContain('XECX');
        expect(rates.xec?.rateLine).toContain('XEC');
        // FIRMA redeem compares XEC amounts only — no USD lines
        expect(rates.xec?.fiatPerUnit).toBeNull();
        expect(rates.firma?.fiatPerUnit).toBeNull();
    });

    it('is loading until AlpDex spot has loaded', () => {
        expect(
            getRedeemOutputRates({
                ...baseXecx,
                alpDexFirmaPerXec: null,
                alpDexLoaded: false,
            }).loading,
        ).toBe(true);
    });

    it('loads XECX rates without CoinGecko and omits Best deal', () => {
        const rates = getRedeemOutputRates({
            ...baseXecx,
            fiatPrice: null,
            firmaInFiat: null,
        });
        expect(rates.loading).toBe(false);
        expect(rates.best).toBeNull();
        expect(rates.xec?.rateLine).toBe('1 XECX = 1 XEC');
        expect(rates.firma?.rateLine).toContain('FIRMA');
    });
});

// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    alpSwap,
    alignAmmToSpotTrade,
    dexVsMarket,
    fiatPerXecFromDexRate,
    formatDexVsMarketPct,
    fiatPerXecFromPairQtys,
    firmaPerXecFromDexRate,
    firmaPerXecFromMarket,
    firmaPerXecFromPairQtys,
    firmaPerXecFromReserves,
    FIRMA_TOKEN_ID,
    isHighPriceImpact,
    XECX_TOKEN_ID,
} from 'config/alpSwap';
import {
    statusUrl,
    inventoryUrl,
    spotPriceUrl,
    ammQuoteUrl,
    swapTemplateUrl,
    settleUrl,
    roundSwapQty,
    dexUtxoAtoms,
    uniqueTokenIdsFromPairs,
    toTokenIdsForFrom,
    findPair,
    alpSwapPairPath,
    featuredPairsListedOnStatus,
    statusListedPairsUnusable,
    marketPairsFromDirected,
    defaultDirectionForMarket,
    exactInCoversFeeOutputs,
    minExactInQtyForFeeOutputs,
    minExactInQtyForReceiveAtom,
    minExactInQtyForReceiveAtomFromReserves,
    exactInReceivesAtLeastOneAtom,
    displaySwapFeePct,
    splitExactInTotalAtoms,
    cpExactInOutAtoms,
    pairReservesMatch,
    minExactOutQtyForFeeOutputs,
    toPerFromRateFromReserveAtoms,
    resolveToPerFromRate,
    receivingOutputAtoms,
    minPriceLegForFeeOutputs,
    priceLegCoversFeeOutputs,
    formatSwapQty,
    feeOutputAtoms,
    exactInPriceLeg,
    pairsFromStatus,
    utxoQtyByTokenIdFromStatus,
    liquidityTotalsFromInventory,
    fetchStatus,
    settleSwap,
    TradablePair,
    StatusResponse,
} from 'services/alpSwapService';

const TOKEN_A =
    '488fb8fb66ce0a0a3800b83720d45b7d5acd5337b4aba71d63590708bfb4688c';
const TOKEN_B =
    '4b7ac96d8348e48d7935bddb5d3cd1352f5e8f02a1ce4b6091cb63473b27056c';

const pairs: TradablePair[] = [
    {
        fromTokenId: TOKEN_A,
        toTokenId: TOKEN_B,
        fromDecimals: 4,
        toDecimals: 2,
    },
    {
        fromTokenId: TOKEN_B,
        toTokenId: TOKEN_A,
        fromDecimals: 2,
        toDecimals: 4,
    },
];

const status: StatusResponse = {
    status: 'OK',
    swapAddress: 'ecash:qpz4yqv604tupwczvrez5fpetxs7cxdeuvcwznu9xh',
    slushAddress: 'ecash:qphplaceholderxxxxxxxxxxxxxxxxxxxxxxx',
    feeAddress: 'ecash:qqk7skx0u94avx4znwfj2ryv49plngf855v32pfn3c',
    postage: { sats: '1000' },
    platformFeeEnabled: false,
    tradedTokens: [
        { tokenId: TOKEN_A, decimals: 4, utxoQty: 1 },
        { tokenId: TOKEN_B, decimals: 2, utxoQty: 1 },
        {
            tokenId:
                'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
            decimals: 2,
            utxoQty: 1_000_000,
        },
    ],
    tradedPairs: [
        {
            aTokenId: TOKEN_A,
            bTokenId: TOKEN_B,
            feePct: 0.01,
            aUtxoQty: 1,
            bUtxoQty: 1,
        },
    ],
};

describe('alpSwapService helpers', () => {
    it('requires a manual accept at or above the high price-impact threshold', () => {
        expect(alpSwap.highPriceImpactPct).toBe(5);
        expect(isHighPriceImpact(4.99)).toBe(false);
        expect(isHighPriceImpact(5)).toBe(true);
        expect(isHighPriceImpact(17.61)).toBe(true);
        expect(isHighPriceImpact(Number.NaN)).toBe(false);
    });

    it('converts XECX↔FIRMA rates to FIRMA per XEC in both directions', () => {
        expect(
            firmaPerXecFromDexRate(
                0.00000478351,
                XECX_TOKEN_ID,
                FIRMA_TOKEN_ID,
            ),
        ).toBeCloseTo(0.00000478351);
        expect(
            firmaPerXecFromDexRate(209052, FIRMA_TOKEN_ID, XECX_TOKEN_ID),
        ).toBeCloseTo(1 / 209052);
        expect(firmaPerXecFromDexRate(1, TOKEN_A, TOKEN_B)).toBeNull();
    });

    it('prices FIRMA per XECX from reserves without a swap direction', () => {
        expect(
            firmaPerXecFromReserves('20905200000', '10000000', 2, 4),
        ).toBeCloseTo(0.00000478351);
        expect(firmaPerXecFromReserves('0', '10000000', 2, 4)).toBeNull();
    });

    it('prices an XECX↔FIRMA fill as FIRMA per XEC from the two qtys', () => {
        expect(
            firmaPerXecFromPairQtys(
                XECX_TOKEN_ID,
                FIRMA_TOKEN_ID,
                44_977_308.59,
                200,
            ),
        ).toBeCloseTo(200 / 44_977_308.59);
        expect(
            firmaPerXecFromPairQtys(
                FIRMA_TOKEN_ID,
                XECX_TOKEN_ID,
                200,
                38_953_822.12,
            ),
        ).toBeCloseTo(200 / 38_953_822.12);
        expect(firmaPerXecFromPairQtys(TOKEN_A, TOKEN_B, 2, 0.98)).toBeNull();
    });

    it('converts CoinGecko fiat per XEC to FIRMA per XEC', () => {
        expect(firmaPerXecFromMarket(0.00003, 1)).toBeCloseTo(0.00003);
        expect(firmaPerXecFromMarket(0.000024, 0.8)).toBeCloseTo(0.00003);
        expect(firmaPerXecFromMarket(0, 1)).toBeNull();
        expect(firmaPerXecFromMarket(0.00003, 0)).toBeNull();
    });

    it('compares DEX FIRMA/XEC to CoinGecko and names the deal direction', () => {
        expect(dexVsMarket(0.00000478351, 0.00003)).toEqual({
            pctAbs: expect.closeTo(84.054966, 5),
            vsMarket: 'below',
            deal: 'buy-xecx',
        });
        expect(dexVsMarket(0.000036, 0.00003)).toEqual({
            pctAbs: 20,
            vsMarket: 'above',
            deal: 'sell-xecx',
        });
        expect(dexVsMarket(0.00003, 0.00003)).toEqual({
            pctAbs: 0,
            vsMarket: 'inline',
            deal: null,
        });
        expect(dexVsMarket(0, 0.00003)).toBeNull();
        expect(
            formatDexVsMarketPct({
                pctAbs: 84.054966,
                vsMarket: 'below',
                deal: 'buy-xecx',
            }),
        ).toBe('-84.1%');
        expect(
            formatDexVsMarketPct({
                pctAbs: 20,
                vsMarket: 'above',
                deal: 'sell-xecx',
            }),
        ).toBe('+20%');
        expect(
            formatDexVsMarketPct({
                pctAbs: 0,
                vsMarket: 'inline',
                deal: null,
            }),
        ).toBe('0%');
    });

    it('sizes the constant-product trade that aligns AMM FIRMA/XEC with spot', () => {
        const xecxAtoms = '20905200000';
        const firmaAtoms = '10000000';
        const trade = alignAmmToSpotTrade(xecxAtoms, firmaAtoms, 2, 4, 0.00003);
        expect(trade).not.toBeNull();
        expect(trade?.fromTicker).toBe('FIRMA');
        expect(trade?.toTicker).toBe('XECX');
        expect(trade?.fromQty).toBeCloseTo(1504.3083, 3);
        expect(trade?.toQty).toBeCloseTo(125575057.08, 1);
        expect(
            alignAmmToSpotTrade(xecxAtoms, firmaAtoms, 2, 4, 1000 / 209052000),
        ).toBeNull();
        expect(alignAmmToSpotTrade('0', firmaAtoms, 2, 4, 0.00003)).toBeNull();
    });

    it('converts XECX↔FIRMA rates to fiat per XEC in both directions', () => {
        expect(
            fiatPerXecFromDexRate(
                0.00000478351,
                XECX_TOKEN_ID,
                FIRMA_TOKEN_ID,
                1,
            ),
        ).toBeCloseTo(0.00000478351);
        expect(
            fiatPerXecFromDexRate(209052, FIRMA_TOKEN_ID, XECX_TOKEN_ID, 1),
        ).toBeCloseTo(1 / 209052);
        expect(
            fiatPerXecFromDexRate(
                0.00000478351,
                XECX_TOKEN_ID,
                FIRMA_TOKEN_ID,
                2,
            ),
        ).toBeCloseTo(0.00000956702);
        expect(fiatPerXecFromDexRate(1, TOKEN_A, TOKEN_B, 1)).toBeNull();
    });

    it('prices an XECX↔FIRMA fill as fiat per XEC from the two qtys', () => {
        expect(
            fiatPerXecFromPairQtys(
                XECX_TOKEN_ID,
                FIRMA_TOKEN_ID,
                44_977_308.59,
                200,
                1,
            ),
        ).toBeCloseTo(200 / 44_977_308.59);
        expect(
            fiatPerXecFromPairQtys(
                FIRMA_TOKEN_ID,
                XECX_TOKEN_ID,
                200,
                38_953_822.12,
                1,
            ),
        ).toBeCloseTo(200 / 38_953_822.12);
        expect(
            fiatPerXecFromPairQtys(
                FIRMA_TOKEN_ID,
                XECX_TOKEN_ID,
                200,
                38_953_822.12,
                1,
            ),
        ).toBeLessThan(0.001);
        expect(fiatPerXecFromPairQtys(TOKEN_A, TOKEN_B, 2, 0.98, 1)).toBeNull();
    });

    it('builds standalone alp-dex URLs', () => {
        expect(statusUrl('https://lp.alpswap.com')).toBe(
            'https://lp.alpswap.com/api/v1/status',
        );
        expect(inventoryUrl('https://lp.alpswap.com')).toBe(
            'https://lp.alpswap.com/api/v1/swap/inventory',
        );
        expect(spotPriceUrl(TOKEN_A, TOKEN_B)).toBe(
            `https://lp.alpswap.com/api/v1/swap/${TOKEN_A}/${TOKEN_B}/price`,
        );
        expect(ammQuoteUrl(TOKEN_A, TOKEN_B, '1')).toBe(
            `https://lp.alpswap.com/api/v1/swap/${TOKEN_A}/${TOKEN_B}/amm/1`,
        );
        expect(
            swapTemplateUrl(TOKEN_A, TOKEN_B, {
                from: '1',
                feePct: 0.01,
            }),
        ).toBe(
            `https://lp.alpswap.com/api/v1/swap/${TOKEN_A}/${TOKEN_B}?from=1&feePct=0.01`,
        );
        expect(settleUrl(TOKEN_A, TOKEN_B)).toBe(
            `https://lp.alpswap.com/api/v1/swap/${TOKEN_A}/${TOKEN_B}`,
        );
    });

    it('aborts alp-dex fetches after 60s and maps TimeoutError', async () => {
        const timeoutSpy = jest.spyOn(AbortSignal, 'timeout');
        global.fetch = jest.fn(async () => {
            const err = new Error('The operation was aborted');
            err.name = 'TimeoutError';
            throw err;
        }) as jest.Mock;
        await expect(fetchStatus()).rejects.toThrow(
            'AlpSwap request timed out',
        );
        expect(timeoutSpy).toHaveBeenCalledWith(alpSwap.requestTimeoutMs);
        expect(alpSwap.requestTimeoutMs).toBe(60_000);

        (global.fetch as jest.Mock).mockImplementation(async () => ({
            ok: true,
            json: async () => ({ success: false, error: 'nope' }),
        }));
        await expect(
            settleSwap(TOKEN_A, TOKEN_B, {
                serializedTxHex: '00',
                prePostageInputSats: '546',
                tokenId: TOKEN_B,
                atoms: '1',
            }),
        ).rejects.toThrow('nope');
        expect(timeoutSpy).toHaveBeenCalledWith(alpSwap.requestTimeoutMs);
        timeoutSpy.mockRestore();
        delete (global as { fetch?: typeof fetch }).fetch;
    });

    it('rounds qty to the token genesis decimals for alp-dex query params', () => {
        expect(roundSwapQty(1, 4)).toBe('1');
        expect(roundSwapQty(1.23456, 4)).toBe('1.2345');
        expect(roundSwapQty(1.23456, 2)).toBe('1.23');
        expect(roundSwapQty(1.9, 0)).toBe('1');
        expect(roundSwapQty(0.1, 4)).toBe('0.1');
        expect(() => roundSwapQty(0, 4)).toThrow('positive');
        expect(() => roundSwapQty(-1, 4)).toThrow('positive');
        expect(() => roundSwapQty(1, 10)).toThrow('decimals');
    });

    it('computes DEX UTXO atoms from decimals and utxoQty', () => {
        expect(dexUtxoAtoms(4, 20)).toBe(200000n);
        expect(dexUtxoAtoms(2, 20)).toBe(2000n);
        expect(dexUtxoAtoms(0, 20)).toBe(20n);
        expect(dexUtxoAtoms(2, 1)).toBe(100n);
        expect(dexUtxoAtoms(2, 1_000_000)).toBe(100_000_000n);
    });

    it('maps catalog fields from /api/v1/status and /inventory', () => {
        const directed = pairsFromStatus(status);
        expect(directed).toHaveLength(2);
        expect(directed[0].fromTokenId).toBe(TOKEN_A);
        expect(directed[0].toTokenId).toBe(TOKEN_B);
        expect(directed[0].fromDecimals).toBe(4);
        expect(directed[0].toDecimals).toBe(2);
        expect(directed[0].feePct).toBe(0.01);
        expect(utxoQtyByTokenIdFromStatus(status)).toEqual({
            [TOKEN_A]: 1,
            [TOKEN_B]: 1,
            c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4: 1_000_000,
        });
        expect(
            liquidityTotalsFromInventory({
                [TOKEN_A]: '5000',
                [TOKEN_B]: '12.5',
            }),
        ).toEqual({
            [TOKEN_A]: 5000,
            [TOKEN_B]: 12.5,
        });
    });

    it('derives token lists and pairs', () => {
        expect(uniqueTokenIdsFromPairs(pairs)).toEqual([TOKEN_A, TOKEN_B]);
        expect(toTokenIdsForFrom(pairs, TOKEN_A)).toEqual([TOKEN_B]);
        expect(findPair(pairs, TOKEN_A, TOKEN_B)?.fromDecimals).toBe(4);
        expect(findPair(pairs, TOKEN_A, TOKEN_A)).toBeUndefined();
        expect(alpSwapPairPath(TOKEN_A, TOKEN_B)).toBe(
            `/alpswap?from=${TOKEN_A}&to=${TOKEN_B}`,
        );
    });

    it('filters featured Agora pairs to those listed with feePct and utxoQty', () => {
        const featured = alpSwap.featuredAgoraPairs;
        expect(featured).toHaveLength(1);
        expect(featuredPairsListedOnStatus(featured, status)).toEqual([]);
        expect(
            featuredPairsListedOnStatus(featured, {
                tradedTokens: [
                    {
                        tokenId: featured[0].tokenIdA,
                        decimals: 2,
                        utxoQty: 1,
                    },
                    {
                        tokenId: featured[0].tokenIdB,
                        decimals: 4,
                        utxoQty: 1,
                    },
                ],
                tradedPairs: [
                    {
                        aTokenId: featured[0].tokenIdB,
                        bTokenId: featured[0].tokenIdA,
                        feePct: 0.01,
                        aUtxoQty: 1,
                        bUtxoQty: 1,
                    },
                ],
            }),
        ).toEqual(featured);
        expect(
            featuredPairsListedOnStatus(featured, {
                tradedTokens: [
                    {
                        tokenId: featured[0].tokenIdA,
                        decimals: 2,
                    },
                    {
                        tokenId: featured[0].tokenIdB,
                        decimals: 4,
                    },
                ],
                tradedPairs: [
                    {
                        aTokenId: featured[0].tokenIdB,
                        bTokenId: featured[0].tokenIdA,
                        feePct: 0.01,
                    },
                ],
            }),
        ).toEqual([]);
        expect(
            featuredPairsListedOnStatus(featured, { tradedPairs: undefined }),
        ).toEqual([]);
    });

    it('skips /status pairs that omit feePct or utxoQty', () => {
        expect(
            pairsFromStatus({
                tradedTokens: [
                    { tokenId: TOKEN_A, decimals: 4 },
                    { tokenId: TOKEN_B, decimals: 2 },
                ],
                tradedPairs: [
                    {
                        aTokenId: TOKEN_A,
                        bTokenId: TOKEN_B,
                        feePct: 0.01,
                    },
                ],
            }),
        ).toEqual([]);
        expect(
            statusListedPairsUnusable({
                tradedTokens: [
                    { tokenId: TOKEN_A, decimals: 4 },
                    { tokenId: TOKEN_B, decimals: 2 },
                ],
                tradedPairs: [
                    {
                        aTokenId: TOKEN_A,
                        bTokenId: TOKEN_B,
                        feePct: 0.01,
                    },
                ],
            }),
        ).toBe(true);
        expect(statusListedPairsUnusable(status)).toBe(false);
        expect(
            statusListedPairsUnusable({ tradedTokens: [], tradedPairs: [] }),
        ).toBe(false);
    });

    it('collapses directed pairs into undirected markets', () => {
        const markets = marketPairsFromDirected(pairs);
        expect(markets).toHaveLength(1);
        expect(markets[0].key).toBe(`${TOKEN_A}:${TOKEN_B}`);
        expect(markets[0].tokenIdA).toBe(TOKEN_A);
        expect(markets[0].tokenIdB).toBe(TOKEN_B);
        expect(markets[0].decimalsA).toBe(4);
        expect(markets[0].decimalsB).toBe(2);

        expect(
            marketPairsFromDirected([
                {
                    fromTokenId: TOKEN_B,
                    toTokenId: TOKEN_A,
                    fromDecimals: 2,
                    toDecimals: 4,
                },
            ]),
        ).toHaveLength(1);
    });

    it('picks default direction for a market', () => {
        const [market] = marketPairsFromDirected(pairs);
        expect(defaultDirectionForMarket(pairs, market)).toEqual({
            fromTokenId: TOKEN_A,
            toTokenId: TOKEN_B,
        });

        expect(
            defaultDirectionForMarket(
                [
                    {
                        fromTokenId: TOKEN_B,
                        toTokenId: TOKEN_A,
                        fromDecimals: 2,
                        toDecimals: 4,
                    },
                ],
                market,
            ),
        ).toEqual({
            fromTokenId: TOKEN_B,
            toTokenId: TOKEN_A,
        });

        expect(
            defaultDirectionForMarket(
                [
                    {
                        fromTokenId: 'aa'.repeat(32),
                        toTokenId: 'bb'.repeat(32),
                        fromDecimals: 0,
                        toDecimals: 0,
                    },
                ],
                market,
            ),
        ).toBeNull();
    });

    it('requires a higher min exact-in qty for low-decimal from-tokens', () => {
        const makerFeePct = 0.01;
        // Standalone alp-dex: no coordinator platform fee.
        const platformFeePct = 0;

        // 0.1 GUNS (2dp): maker fee rounds to 0 atoms — reject
        expect(
            exactInCoversFeeOutputs(0.1, 2, makerFeePct, platformFeePct),
        ).toBe(false);
        // 1 GUNS (2dp) and 1 BUTTER (4dp): maker fee ≥ 1 atom
        expect(exactInCoversFeeOutputs(1, 2, makerFeePct, platformFeePct)).toBe(
            true,
        );
        expect(exactInCoversFeeOutputs(1, 4, makerFeePct, platformFeePct)).toBe(
            true,
        );

        const minGuns = minExactInQtyForFeeOutputs(
            2,
            makerFeePct,
            platformFeePct,
        );
        expect(minGuns).toBeGreaterThan(0.1);
        expect(minGuns).toBeLessThanOrEqual(1);
        expect(
            exactInCoversFeeOutputs(minGuns, 2, makerFeePct, platformFeePct),
        ).toBe(true);
        expect(
            exactInCoversFeeOutputs(
                minGuns - 0.01,
                2,
                makerFeePct,
                platformFeePct,
            ),
        ).toBe(false);
        expect(formatSwapQty(minGuns, 2)).toBe('0.51');

        const price = exactInPriceLeg(1, makerFeePct, platformFeePct);
        expect(feeOutputAtoms(price, makerFeePct, 2)).toBe(1n);
        expect(feeOutputAtoms(price, makerFeePct, 4)).toBe(99n);
    });

    it('computes min exact-out receive qty from fee floor and rate', () => {
        const makerFeePct = 0.01;
        const platformFeePct = 0;
        const fromDecimals = 4;
        const toDecimals = 2;
        const toPerFromRate = 149032;

        const minPrice = minPriceLegForFeeOutputs(
            fromDecimals,
            makerFeePct,
            platformFeePct,
        );
        expect(minPrice).toBeGreaterThan(0.005);
        expect(minPrice).toBeLessThan(0.006);

        const minTo = minExactOutQtyForFeeOutputs(
            toDecimals,
            fromDecimals,
            makerFeePct,
            platformFeePct,
            toPerFromRate,
        );
        expect(minTo).toBeGreaterThan(100);
        expect(minTo).toBeCloseTo(minPrice * toPerFromRate, 1);
        expect(
            priceLegCoversFeeOutputs(
                minTo / toPerFromRate,
                fromDecimals,
                makerFeePct,
                platformFeePct,
            ),
        ).toBe(true);
        expect(
            priceLegCoversFeeOutputs(
                1 / toPerFromRate,
                fromDecimals,
                makerFeePct,
                platformFeePct,
            ),
        ).toBe(false);
        expect(formatSwapQty(minTo, toDecimals)).toBe('752.54');
    });

    it('formatSwapQty keeps integer trailing zeros for 0-decimal tokens', () => {
        expect(formatSwapQty(1200, 0)).toBe('1200');
        expect(formatSwapQty(12, 0)).toBe('12');
        expect(formatSwapQty(1.2, 2)).toBe('1.2');
    });

    it('recovers a tiny XECX→FIRMA rate from reserve atoms when encoded rate is 0', () => {
        const xecx =
            'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4';
        const firma =
            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0';
        const reserves = {
            [xecx]: '49930120824',
            [firma]: '33814928',
        };
        expect(
            toPerFromRateFromReserveAtoms(
                reserves[xecx],
                reserves[firma],
                2,
                4,
            ),
        ).toBeCloseTo(3381.4928 / 499301208.24, 12);
        expect(
            resolveToPerFromRate(0, reserves, xecx, firma, 2, 4),
        ).toBeCloseTo(3381.4928 / 499301208.24, 12);
        expect(
            resolveToPerFromRate(147657.03, reserves, firma, xecx, 4, 2),
        ).toBe(147657.03);
    });

    it('requires enough XECX to receive at least 1 FIRMA atom', () => {
        const rate = 3381.4928 / 499301208.24;
        const minQty = minExactInQtyForReceiveAtom(2, 4, 0.01, 0, rate);
        expect(minQty).toBeGreaterThan(14);
        expect(minQty).toBeLessThanOrEqual(15);
        expect(formatSwapQty(minQty, 2)).toBe('14.92');
        const net = exactInPriceLeg(minQty, 0.01, 0);
        expect(net * rate).toBeGreaterThanOrEqual(0.0001);
        expect(exactInPriceLeg(minQty - 0.01, 0.01, 0) * rate).toBeLessThan(
            0.0001,
        );
    });

    it('uses CP floor from reserves so 14.86 XECX cannot mint 1 FIRMA atom', () => {
        const fromReserve = '49930120824';
        const toReserve = '33814928';
        const minQty = minExactInQtyForReceiveAtomFromReserves(
            fromReserve,
            toReserve,
            2,
            0.01,
        );
        expect(formatSwapQty(minQty, 2)).toBe('14.92');
        expect(
            exactInReceivesAtLeastOneAtom(
                14.86,
                2,
                0.01,
                fromReserve,
                toReserve,
            ),
        ).toBe(false);
        expect(
            exactInReceivesAtLeastOneAtom(
                14.91,
                2,
                0.01,
                fromReserve,
                toReserve,
            ),
        ).toBe(false);
        expect(
            exactInReceivesAtLeastOneAtom(
                14.92,
                2,
                0.01,
                fromReserve,
                toReserve,
            ),
        ).toBe(true);
        const split = splitExactInTotalAtoms(1486n, 0.01);
        expect(split.priceLegAtoms).toBe(1471n);
        expect(cpExactInOutAtoms(1471n, 49930120824n, 33814928n)).toBe(0n);
        expect(cpExactInOutAtoms(1477n, 49930120824n, 33814928n)).toBe(1n);
    });

    it('pairReservesMatch compares book vs REST atom strings', () => {
        const book = { [TOKEN_A]: '36907066', [TOKEN_B]: '45875909906' };
        expect(
            pairReservesMatch(
                book,
                { [TOKEN_A]: '36907066', [TOKEN_B]: '45875909906' },
                TOKEN_A,
                TOKEN_B,
            ),
        ).toBe(true);
        expect(
            pairReservesMatch(
                book,
                { [TOKEN_A]: '36907066', [TOKEN_B]: '1' },
                TOKEN_A,
                TOKEN_B,
            ),
        ).toBe(false);
        expect(pairReservesMatch(book, undefined, TOKEN_A, TOKEN_B)).toBe(
            false,
        );
    });

    it('shows realized fee/total when atom rounding blows up the pair feePct', () => {
        // Min FIRMA→XECX at 0.3%: 1 fee atom / 168 = 0.595%
        expect(displaySwapFeePct(0.003, 0.0167, 0.0001)).toBeCloseTo(
            0.0001 / 0.0168,
            8,
        );
        // Large trade: leftover 1 atom is < 0.05pp from 1% — keep pair fee
        expect(displaySwapFeePct(0.01, 0.990099, 0.009901)).toBe(0.01);
        expect(displaySwapFeePct(0.003)).toBe(0.003);
    });

    it('treats a 0-atom buyer receive output as empty', () => {
        expect(
            receivingOutputAtoms(
                [
                    {
                        tokenId: TOKEN_A,
                        atoms: '99',
                        script: '76a914aa',
                    },
                    { tokenId: TOKEN_B, atoms: '0' },
                ],
                TOKEN_B,
            ),
        ).toBe(0n);
        expect(
            receivingOutputAtoms([{ tokenId: TOKEN_B, atoms: '6' }], TOKEN_B),
        ).toBe(6n);
    });
});

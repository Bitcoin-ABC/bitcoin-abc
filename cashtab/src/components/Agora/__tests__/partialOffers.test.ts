// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { toHex } from 'ecash-lib';
import {
    findFillableOfferIndex,
    prepareBuyableOffers,
} from 'components/Agora/partialOffers';
import {
    agoraOfferCachetAffordable,
    agoraOfferCachetAlphaOne,
    agoraOfferCachetAlphaTwo,
    agoraOfferCachetAlphaUnacceptable,
    agoraOfferCachetUnaffordable,
    agoraPartialAlphaWallet,
    agoraPartialBetaMoreBalanceWallet,
} from 'components/Agora/fixtures/mocks';

const CACHET_TOKEN_ID =
    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1';

describe('prepareBuyableOffers', () => {
    it('sorts by spot price ascending and marks unaffordable offers', () => {
        const walletPkHex = toHex(agoraPartialAlphaWallet.pk);
        // Alpha wallet cannot afford the unaffordable offer's min
        const prepared = prepareBuyableOffers(
            [agoraOfferCachetUnaffordable, agoraOfferCachetAffordable],
            CACHET_TOKEN_ID,
            Number(agoraPartialAlphaWallet.state.balanceSats),
            walletPkHex,
        );
        expect(prepared.length).toBe(2);
        // Affordable (cheaper / smaller) should come first when prices differ;
        // at minimum both flags are set and unaffordable is flagged.
        const unaffordable = prepared.find(
            o => o.outpoint.txid === agoraOfferCachetUnaffordable.outpoint.txid,
        );
        const affordable = prepared.find(
            o => o.outpoint.txid === agoraOfferCachetAffordable.outpoint.txid,
        );
        expect(unaffordable?.isUnaffordable).toBe(true);
        expect(affordable?.isUnaffordable).toBe(false);
        // Spot prices are set for depth / selection
        expect(prepared[0].spotPriceNanoSatsPerTokenSat).toBeDefined();
        expect(
            Number(prepared[0].spotPriceNanoSatsPerTokenSat) <=
                Number(prepared[1].spotPriceNanoSatsPerTokenSat),
        ).toBe(true);
    });

    it('drops unacceptable offers that are not from the active wallet', () => {
        const walletPkHex = toHex(agoraPartialBetaMoreBalanceWallet.pk);
        const prepared = prepareBuyableOffers(
            [agoraOfferCachetAlphaUnacceptable, agoraOfferCachetAlphaOne],
            CACHET_TOKEN_ID,
            Number(agoraPartialBetaMoreBalanceWallet.state.balanceSats),
            walletPkHex,
        );
        expect(
            prepared.some(
                o =>
                    o.outpoint.txid ===
                    agoraOfferCachetAlphaUnacceptable.outpoint.txid,
            ),
        ).toBe(false);
        expect(
            prepared.some(
                o => o.outpoint.txid === agoraOfferCachetAlphaOne.outpoint.txid,
            ),
        ).toBe(true);
    });

    it('keeps an unacceptable offer when the active wallet is the maker', () => {
        const makerPkHex = toHex(
            agoraOfferCachetAlphaUnacceptable.variant.params.makerPk,
        );
        const prepared = prepareBuyableOffers(
            [agoraOfferCachetAlphaUnacceptable],
            CACHET_TOKEN_ID,
            1_000_000_000,
            makerPkHex,
        );
        expect(prepared.length).toBe(1);
        expect(prepared[0].isUnacceptable).toBe(true);
    });
});

describe('findFillableOfferIndex', () => {
    it('selects a later offer when the cheapest cannot fill the quantity', () => {
        const walletPkHex = toHex(agoraPartialBetaMoreBalanceWallet.pk);
        const prepared = prepareBuyableOffers(
            [agoraOfferCachetAffordable, agoraOfferCachetAlphaTwo],
            CACHET_TOKEN_ID,
            Number(agoraPartialBetaMoreBalanceWallet.state.balanceSats),
            walletPkHex,
        );
        // 150 tokens — larger than affordable's max in the DeepLinkBuy tests
        const quantityAtoms = 15000n;
        const { index, sizeFillableExists } = findFillableOfferIndex(
            prepared,
            quantityAtoms,
            Number(agoraPartialBetaMoreBalanceWallet.state.balanceSats),
            walletPkHex,
        );
        expect(sizeFillableExists).toBe(true);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(prepared[index].token.atoms).toBeGreaterThanOrEqual(
            quantityAtoms,
        );
    });
});

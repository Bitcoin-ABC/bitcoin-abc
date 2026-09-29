// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { fromHex, toHex } from 'ecash-lib';
import { AgoraOffer, AgoraPartial } from 'ecash-agora';
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
    agoraOfferXecxAlphaOne,
    agoraPartialAlphaWallet,
    agoraPartialBetaMoreBalanceWallet,
} from 'components/Agora/fixtures/mocks';
import appConfig from 'config/app';

const CACHET_TOKEN_ID =
    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1';

const XECX_TOKEN_ID = appConfig.vipTokens.xecx.tokenId;

/** Third-party XECX listing (not the official minter). */
const agoraPartialXecxThirdParty = new AgoraPartial({
    dustSats: 546n,
    enforcedLockTime: 1385162239,
    minAcceptedScaledTruncAtoms: 1875000n,
    numSatsTruncBytes: 1,
    numAtomsTruncBytes: 1,
    scaledTruncAtomsPerTruncSat: 5n,
    scriptLen: 194,
    tokenId: XECX_TOKEN_ID,
    tokenProtocol: 'ALP',
    atomsScaleFactor: 5n,
    tokenType: 0,
    truncAtoms: 175289017n,
    makerPk: fromHex(agoraPartialAlphaWallet.pk),
});
const agoraOfferXecxThirdParty = new AgoraOffer({
    outpoint: {
        txid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        outIdx: 2,
    },
    status: 'OPEN',
    token: {
        atoms: 44873988352n,
        isMintBaton: false,
        tokenId: XECX_TOKEN_ID,
        tokenType: {
            number: 0,
            protocol: 'ALP',
            type: 'ALP_TOKEN_TYPE_STANDARD',
        },
    },
    txBuilderInput: {
        prevOut: {
            outIdx: 2,
            txid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        },
        signData: {
            redeemScript: agoraPartialXecxThirdParty.script(),
            sats: 546n,
        },
    },
    variant: {
        type: 'PARTIAL',
        params: agoraPartialXecxThirdParty,
    },
});

describe('prepareBuyableOffers', () => {
    it('sorts by spot price ascending and marks unaffordable offers', () => {
        // Offers are made by alpha; view as beta with alpha's low balance so
        // the unaffordable min is out of reach for a non-maker buyer.
        const walletPkHex = agoraPartialBetaMoreBalanceWallet.pk;
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
        const walletPkHex = agoraPartialBetaMoreBalanceWallet.pk;
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

    it('keeps official XECX minter offers for buyers', () => {
        const prepared = prepareBuyableOffers(
            [agoraOfferXecxAlphaOne],
            XECX_TOKEN_ID,
            Number(agoraPartialBetaMoreBalanceWallet.state.balanceSats),
            agoraPartialBetaMoreBalanceWallet.pk,
        );
        expect(prepared.length).toBe(1);
        expect(prepared[0].outpoint.txid).toBe(
            agoraOfferXecxAlphaOne.outpoint.txid,
        );
    });

    it('drops third-party XECX offers for buyers', () => {
        const prepared = prepareBuyableOffers(
            [agoraOfferXecxThirdParty, agoraOfferXecxAlphaOne],
            XECX_TOKEN_ID,
            Number(agoraPartialBetaMoreBalanceWallet.state.balanceSats),
            agoraPartialBetaMoreBalanceWallet.pk,
        );
        expect(prepared.length).toBe(1);
        expect(prepared[0].outpoint.txid).toBe(
            agoraOfferXecxAlphaOne.outpoint.txid,
        );
    });

    it('keeps the active wallet own XECX listing even when not the minter', () => {
        const prepared = prepareBuyableOffers(
            [agoraOfferXecxThirdParty],
            XECX_TOKEN_ID,
            Number(agoraPartialAlphaWallet.state.balanceSats),
            agoraPartialAlphaWallet.pk,
        );
        expect(prepared.length).toBe(1);
        expect(prepared[0].outpoint.txid).toBe(
            agoraOfferXecxThirdParty.outpoint.txid,
        );
    });
});

describe('findFillableOfferIndex', () => {
    it('selects a later offer when the cheapest cannot fill the quantity', () => {
        const walletPkHex = agoraPartialBetaMoreBalanceWallet.pk;
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

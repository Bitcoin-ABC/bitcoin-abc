// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Shared prepare/select helpers for Agora PARTIAL offers.
 *
 * Used by OrderBook (in-app buy UI) and DeepLinkBuy (BUY deep-link confirm).
 * Keeps XECX / FIRMA / unaffordable / sort rules in one place.
 */

import { toHex } from 'ecash-lib';
import { AgoraOffer, AgoraPartial } from 'ecash-agora';
import appConfig from 'config/app';
import { FIRMA, FIRMA_MINTER_PK_HEX } from 'constants/tokens';

export interface PartialOffer extends AgoraOffer {
    variant: {
        type: 'PARTIAL';
        params: AgoraPartial;
    };
    /**
     * Calculated value
     * Allows us to render depth at the price of this order, like most
     * exchange orderbooks
     */
    depthPercent?: number;
    spotPriceNanoSatsPerTokenSat?: bigint;
    /**
     * It is possible for an Agora offer to be "unacceptable" if
     * the min accepted tokens is greater than the total offered tokens.
     * Cashtab UI (should) prevent this from ever happening, i.e. we have
     * validation checks for creation and accepting offers, though likely
     * we have some missed edge cases that must be cleaned up.
     * But even if we prevent this in Cashtab, anyone could make this kind of offer.
     * We do not want buyers to see these offers. But we do want the makers to see them
     * and know they need to be canceled.
     */
    isUnacceptable: boolean;
    /**
     * Indicates if the user cannot afford even the minimum buy amount for this offer
     * These offers are still shown to the user but visually indicated as unaffordable
     */
    isUnaffordable: boolean;
    /**
     * Cumulative quantity of token available on the market
     * In units of base tokens (aka "token satoshis") so we
     * can decide to render when decimals are available
     * Used to render tooltip for exchange-like UX
     *
     * e.g. if you have 3 offers
     * - Cheapest sells 10
     * - Next cheapest sells 20
     * - Most expensive sells 30
     *
     * cumulativeBaseTokens will be 10 for the cheapest, (10+20=30) for the next cheapest,
     * and (10+20+30) 60 for the most expensive
     */
    cumulativeBaseTokens?: bigint;
}

/**
 * Filter and sort active partial offers for buying:
 * drop unacceptable non-maker offers, apply XECX/FIRMA rules, mark
 * unaffordable, cheapest first.
 *
 * OrderBook adds depthPercent / cumulativeBaseTokens after this returns.
 */
export const prepareBuyableOffers = (
    activeOffers: AgoraOffer[],
    tokenId: string,
    balanceSats: number,
    walletPkHex: string,
): PartialOffer[] => {
    const rendered: PartialOffer[] = [];
    for (const offer of activeOffers) {
        const activeOffer = offer as PartialOffer;
        const maxOfferTokens = activeOffer.token.atoms;
        const minOfferTokens = activeOffer.variant.params.minAcceptedAtoms();
        const isMakerThisOffer =
            walletPkHex === toHex(activeOffer.variant.params.makerPk);
        // Always set the flag so later filters never see undefined. Drop
        // unacceptable offers from other makers; keep our own so the user can
        // still see (and cancel) a broken listing.
        activeOffer.isUnacceptable = minOfferTokens > maxOfferTokens;
        if (activeOffer.isUnacceptable && !isMakerThisOffer) {
            continue;
        }

        const askedSats = activeOffer.askedSats(maxOfferTokens);
        // XECX: only show 1:1 spot offers to buyers; makers still see their
        // own off-peg listings (cancel path).
        if (
            tokenId === appConfig.vipTokens.xecx.tokenId &&
            !isMakerThisOffer &&
            askedSats !== maxOfferTokens
        ) {
            continue;
        }
        // FIRMA: buyers only see the official minter's offers; makers still
        // see their own.
        if (
            tokenId === FIRMA.tokenId &&
            !isMakerThisOffer &&
            toHex(activeOffer.variant.params.makerPk) !== FIRMA_MINTER_PK_HEX
        ) {
            continue;
        }

        activeOffer.isUnaffordable =
            activeOffer.askedSats(minOfferTokens) > balanceSats &&
            !isMakerThisOffer;

        activeOffer.spotPriceNanoSatsPerTokenSat =
            (askedSats * BigInt(1e9)) / maxOfferTokens;
        rendered.push(activeOffer);
    }

    rendered.sort((a, b) => {
        const spotPriceDiff =
            Number(a.spotPriceNanoSatsPerTokenSat) -
            Number(b.spotPriceNanoSatsPerTokenSat);
        if (spotPriceDiff !== 0) {
            return spotPriceDiff;
        }
        return (
            Number(a.variant.params.minAcceptedAtoms()) -
            Number(b.variant.params.minAcceptedAtoms())
        );
    });
    return rendered;
};

/**
 * Cheapest non-maker, acceptable offer that can fill quantityAtoms and that
 * the user can afford. Used by DeepLinkBuy when the link specifies a quantity.
 */
export const findFillableOfferIndex = (
    offers: PartialOffer[],
    quantityAtoms: bigint,
    balanceSats: number,
    walletPkHex: string,
): { index: number; sizeFillableExists: boolean } => {
    let sizeFillableExists = false;
    const index = offers.findIndex(offer => {
        const { params } = offer.variant;
        if (offer.isUnacceptable) {
            return false;
        }
        if (walletPkHex === toHex(params.makerPk)) {
            return false;
        }
        const minAtoms = params.minAcceptedAtoms();
        const maxAtoms = offer.token.atoms;
        if (quantityAtoms < minAtoms || quantityAtoms > maxAtoms) {
            return false;
        }
        const preparedAtoms = params.prepareAcceptedAtoms(quantityAtoms);
        if (preparedAtoms < minAtoms || preparedAtoms > maxAtoms) {
            return false;
        }
        sizeFillableExists = true;
        return Number(offer.askedSats(preparedAtoms)) <= balanceSats;
    });
    return { index, sizeFillableExists };
};

// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { DEFAULT_DUST_SATS } from 'ecash-lib';
import { POSTAGE_SATS } from '../constants';
import type { TradedTokens } from '../tokens/tradedTokens';

/** Minimal seller UTXO shape for inventory classification. */
export type SellerUtxoLike = {
    outpoint: { txid: string; outIdx: number };
    sats: bigint;
    token?: {
        tokenId: string;
        atoms: bigint;
        isMintBaton: boolean;
    };
};

export type ClassifiedSellerUtxos = {
    /** Exact-size traded-token UTXOs — fill-eligible. */
    fillEligible: SellerUtxoLike[];
    /** XEC-only postage stamps (`POSTAGE_SATS`). */
    postage: SellerUtxoLike[];
    /** Fungible traded tokens at the wrong atom size → reshape via slush. */
    wrongSizedTraded: SellerUtxoLike[];
    /**
     * Non-traded fungible tokens and odd (non-postage) XEC at/above dust → fee.
     * Mint batons are never included (left untouched).
     */
    misc: SellerUtxoLike[];
    /**
     * XEC-only UTXOs below `DEFAULT_DUST_SATS`.
     *
     * Not expected in normal operation (nodes reject creating sub-dust outs).
     * Tracked separately for logging; maintain still burns them as fee with misc.
     */
    belowDust: SellerUtxoLike[];
    /** Mint batons — never spent by inventory automation. */
    skippedBatons: SellerUtxoLike[];
};

export const isPostageStamp = (
    utxo: SellerUtxoLike,
    postageSats: bigint = POSTAGE_SATS,
): boolean => utxo.token === undefined && utxo.sats === postageSats;

export const isExactInventory = (
    utxo: SellerUtxoLike,
    tokenId: string,
    utxoAtoms: bigint,
): boolean => {
    const token = utxo.token;
    if (token === undefined || token.isMintBaton) {
        return false;
    }
    return (
        token.tokenId.toLowerCase() === tokenId.toLowerCase() &&
        token.atoms === utxoAtoms
    );
};

/**
 * Partition seller UTXOs for the maintain loop in SPEC.md
 * (“Inventory automation”).
 *
 * Fill-eligible = exact configured inventory size only. Batons are skipped
 * entirely (not misc, not wrong-sized).
 */
export const classifySellerUtxos = (
    utxos: Iterable<SellerUtxoLike>,
    tradedTokens: TradedTokens,
): ClassifiedSellerUtxos => {
    const fillEligible: SellerUtxoLike[] = [];
    const postage: SellerUtxoLike[] = [];
    const wrongSizedTraded: SellerUtxoLike[] = [];
    const misc: SellerUtxoLike[] = [];
    const belowDust: SellerUtxoLike[] = [];
    const skippedBatons: SellerUtxoLike[] = [];

    for (const utxo of utxos) {
        const token = utxo.token;
        if (token !== undefined && token.isMintBaton) {
            skippedBatons.push(utxo);
            continue;
        }

        if (isPostageStamp(utxo)) {
            postage.push(utxo);
            continue;
        }

        if (token === undefined) {
            // Sub-dust XEC should not appear on seller in normal operation.
            if (utxo.sats < DEFAULT_DUST_SATS) {
                belowDust.push(utxo);
            } else {
                misc.push(utxo);
            }
            continue;
        }

        const traded = tradedTokens.get(token.tokenId.toLowerCase());
        if (traded === undefined) {
            misc.push(utxo);
            continue;
        }

        if (token.atoms === traded.utxoAtoms) {
            fillEligible.push(utxo);
        } else {
            wrongSizedTraded.push(utxo);
        }
    }

    return {
        fillEligible,
        postage,
        wrongSizedTraded,
        misc,
        belowDust,
        skippedBatons,
    };
};

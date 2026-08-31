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

/**
 * Same-size fungible UTXOs at or above this count look like leftover
 * inventory from a pair this node used to trade. Do not sweep them.
 */
export const FORMER_INVENTORY_MIN_UTXOS = 10;

export type FormerInventoryPile = {
    tokenId: string;
    atoms: bigint;
    utxoCount: number;
};

/**
 * Count desc, then tokenId, then atoms — so two same-size piles of one
 * token stay in a stable order for {@link formerInventoryKey}.
 */
export const compareFormerInventoryPiles = (
    a: FormerInventoryPile,
    b: FormerInventoryPile,
): number => {
    if (b.utxoCount !== a.utxoCount) {
        return b.utxoCount - a.utxoCount;
    }
    const tokenCmp = a.tokenId.localeCompare(b.tokenId);
    if (tokenCmp !== 0) {
        return tokenCmp;
    }
    if (a.atoms === b.atoms) {
        return 0;
    }
    return a.atoms < b.atoms ? -1 : 1;
};

/**
 * Dedup key for former-inventory Telegram. Empty when there are no piles
 * so a later reappearance notifies again.
 */
export const formerInventoryKey = (piles: FormerInventoryPile[]): string =>
    piles
        .map(pile => `${pile.tokenId}:${pile.atoms}:${pile.utxoCount}`)
        .join('|');

/**
 * Hold back same-size token piles that look like former inventory.
 * Odd XEC and singleton / small token leftovers stay in `toSweep`.
 */
export const splitMiscFromFormerInventory = (
    misc: SellerUtxoLike[],
    minUtxos: number = FORMER_INVENTORY_MIN_UTXOS,
): {
    toSweep: SellerUtxoLike[];
    formerInventory: FormerInventoryPile[];
} => {
    if (!Number.isSafeInteger(minUtxos) || minUtxos < 1) {
        throw new Error(
            `minUtxos must be a positive safe integer (got ${minUtxos})`,
        );
    }

    const tokenGroups = new Map<string, SellerUtxoLike[]>();
    const xec: SellerUtxoLike[] = [];
    for (const utxo of misc) {
        const token = utxo.token;
        if (token === undefined || token.isMintBaton) {
            xec.push(utxo);
            continue;
        }
        const key = `${token.tokenId.toLowerCase()}:${token.atoms.toString()}`;
        const group = tokenGroups.get(key);
        if (group === undefined) {
            tokenGroups.set(key, [utxo]);
        } else {
            group.push(utxo);
        }
    }

    const toSweep = [...xec];
    const formerInventory: FormerInventoryPile[] = [];
    for (const group of tokenGroups.values()) {
        const token = group[0]?.token;
        if (token === undefined) {
            continue;
        }
        if (group.length >= minUtxos) {
            formerInventory.push({
                tokenId: token.tokenId.toLowerCase(),
                atoms: token.atoms,
                utxoCount: group.length,
            });
            continue;
        }
        toSweep.push(...group);
    }

    formerInventory.sort(compareFormerInventoryPiles);

    return { toSweep, formerInventory };
};

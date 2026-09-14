// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { Wallet } from 'ecash-wallet';
import type { ParsedTradedConfig } from '../config/tradedConfig';
import { pairSpotPrices } from '../pricing/quotes';
import { pricingReserveAtoms } from '../pricing/reserves';
import type { TradedTokens } from '../tokens/tradedTokens';

/** One allowlisted pair’s seller+slush book (same atoms as GET /price). */
export type BookPairSnapshot = {
    aTokenId: string;
    bTokenId: string;
    feePct: number;
    reserves: Record<string, string>;
    spotAtoB: string;
    spotBtoA: string;
};

/**
 * In-memory CP book for every configured pair.
 *
 * `type` is fixed so Cashtab can ignore future message kinds.
 */
export type BookSnapshot = {
    type: 'book';
    timestamp: string;
    pairs: BookPairSnapshot[];
};

/**
 * Seller+slush atom sums and both directed spots for each pair.
 *
 * Empty reserves use `n/a` spots (same as {@link pairSpotPrices}); GET
 * `/price` still 400s those pairs.
 */
export const bookSnapshot = (
    seller: Wallet,
    slush: Wallet,
    tradedConfig: ParsedTradedConfig,
    tradedTokens: TradedTokens,
    timestamp: string = new Date().toISOString(),
): BookSnapshot => {
    const pairs: BookPairSnapshot[] = [];
    for (const pair of tradedConfig.pairs) {
        const tokenA = tradedTokens.get(pair.tokenIdA);
        const tokenB = tradedTokens.get(pair.tokenIdB);
        if (tokenA === undefined || tokenB === undefined) {
            continue;
        }
        const reserveA = pricingReserveAtoms(
            seller.utxos,
            slush.utxos,
            pair.tokenIdA,
        );
        const reserveB = pricingReserveAtoms(
            seller.utxos,
            slush.utxos,
            pair.tokenIdB,
        );
        const { spotAtoB, spotBtoA } = pairSpotPrices(
            reserveA,
            reserveB,
            tokenA.decimals,
            tokenB.decimals,
        );
        pairs.push({
            aTokenId: pair.tokenIdA,
            bTokenId: pair.tokenIdB,
            feePct: pair.feePct,
            reserves: {
                [pair.tokenIdA]: reserveA.toString(),
                [pair.tokenIdB]: reserveB.toString(),
            },
            spotAtoB,
            spotBtoA,
        });
    }
    return { type: 'book', timestamp, pairs };
};

// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { assertTokenId } from '../methods/tokenId';

/** Undirected allowlisted pair (tokenIdA < tokenIdB lexicographically) */
export type TradedPair = {
    tokenIdA: string;
    tokenIdB: string;
    /** Maker fee as decimal (e.g. 0.01 = 1%) for both directions */
    feePct: number;
};

/** Canonical undirected pair key: `min:max` (validates like canonicalizePair). */
export const pairKey = (tokenIdA: string, tokenIdB: string): string => {
    const a = assertTokenId(tokenIdA);
    const b = assertTokenId(tokenIdB);
    if (a === b) {
        throw new Error('Pair token ids must differ');
    }
    return a < b ? `${a}:${b}` : `${b}:${a}`;
};

/**
 * Canonicalize an undirected pair (lexicographic tokenIdA < tokenIdB).
 * `feePct` is a placeholder 0 — callers overwrite from config.
 */
export const canonicalizePair = (
    tokenIdA: string,
    tokenIdB: string,
): TradedPair => {
    const a = assertTokenId(tokenIdA);
    const b = assertTokenId(tokenIdB);
    if (a === b) {
        throw new Error('Pair token ids must differ');
    }
    return a < b
        ? { tokenIdA: a, tokenIdB: b, feePct: 0 }
        : { tokenIdA: b, tokenIdB: a, feePct: 0 };
};

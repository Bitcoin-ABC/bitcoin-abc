// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/** 64-char hex ALP token ID */
const TOKEN_ID_RE = /^[0-9a-f]{64}$/i;

/**
 * Return true if `value` looks like a 64-hex ALP token id.
 */
export const isTokenId = (value: string): boolean => {
    return TOKEN_ID_RE.test(value);
};

/**
 * Trim, lowercase, and validate a token id.
 * @throws if not a 64-hex ALP token id
 */
export const assertTokenId = (value: string): string => {
    const trimmed = value.trim().toLowerCase();
    if (!isTokenId(trimmed)) {
        throw new Error(
            `Invalid tokenId "${value}": expected 64-character hex ALP token id`,
        );
    }
    return trimmed;
};

/**
 * Validate two distinct token ids for a directed swap.
 * @throws if either id is invalid or both are equal
 */
export const assertDistinctTokenPair = (
    fromTokenId: string,
    toTokenId: string,
): { fromTokenId: string; toTokenId: string } => {
    const from = assertTokenId(fromTokenId);
    const to = assertTokenId(toTokenId);
    if (from === to) {
        throw new Error('fromTokenId and toTokenId must differ');
    }
    return { fromTokenId: from, toTokenId: to };
};

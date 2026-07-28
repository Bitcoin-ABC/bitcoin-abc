// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/** Minimal UTXO shape needed to sum fungible token atoms. */
export type TokenUtxoLike = {
    token?: {
        tokenId: string;
        atoms: bigint;
        isMintBaton: boolean;
    };
};

/**
 * Sum fungible atoms for `tokenId` across UTXOs (mint batons excluded).
 */
export const sumFungibleAtoms = (
    utxos: Iterable<TokenUtxoLike>,
    tokenId: string,
): bigint => {
    const id = tokenId.toLowerCase();
    let sum = 0n;
    for (const utxo of utxos) {
        const token = utxo.token;
        if (token === undefined || token.isMintBaton) {
            continue;
        }
        if (token.tokenId.toLowerCase() !== id) {
            continue;
        }
        sum += token.atoms;
    }
    return sum;
};

/**
 * Pricing reserves = seller + slush fungible atom sums for one token.
 */
export const pricingReserveAtoms = (
    sellerUtxos: Iterable<TokenUtxoLike>,
    slushUtxos: Iterable<TokenUtxoLike>,
    tokenId: string,
): bigint => {
    return (
        sumFungibleAtoms(sellerUtxos, tokenId) +
        sumFungibleAtoms(slushUtxos, tokenId)
    );
};

export type PairReserves = {
    fromTokenId: string;
    toTokenId: string;
    reserveIn: bigint;
    reserveOut: bigint;
};

/**
 * Directed pair reserves for a from→to swap (seller + slush).
 *
 * Walks each UTXO iterable once so one-shot iterables (generators) still
 * contribute to both sides of the pair.
 */
export const pairPricingReserves = (
    sellerUtxos: Iterable<TokenUtxoLike>,
    slushUtxos: Iterable<TokenUtxoLike>,
    fromTokenId: string,
    toTokenId: string,
): PairReserves => {
    const normalizedFromTokenId = fromTokenId.toLowerCase();
    const normalizedToTokenId = toTokenId.toLowerCase();
    if (normalizedFromTokenId === normalizedToTokenId) {
        throw new Error('Pair token ids must differ');
    }
    let reserveIn = 0n;
    let reserveOut = 0n;

    for (const utxos of [sellerUtxos, slushUtxos]) {
        for (const utxo of utxos) {
            const token = utxo.token;
            if (token === undefined || token.isMintBaton) {
                continue;
            }
            const id = token.tokenId.toLowerCase();
            if (id === normalizedFromTokenId) {
                reserveIn += token.atoms;
            }
            if (id === normalizedToTokenId) {
                reserveOut += token.atoms;
            }
        }
    }

    return {
        fromTokenId: normalizedFromTokenId,
        toTokenId: normalizedToTokenId,
        reserveIn,
        reserveOut,
    };
};

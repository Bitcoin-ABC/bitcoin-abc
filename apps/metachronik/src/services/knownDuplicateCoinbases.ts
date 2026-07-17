// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * The only duplicate txids on the Bitcoin chain (pre-BIP30/BIP34 coinbases).
 * Identical coinbase bytes in different blocks share a txid; our utxos PK
 * (txid, vout) keeps the first occurrence only — repeat blocks must not
 * credit balance again.
 *
 * @see scripts/README.md
 */
export interface KnownDuplicateCoinbase {
    txid: string;
    /** Block heights where this coinbase appears (ascending). */
    heights: readonly number[];
    outputScript: string;
    subsidySats: bigint;
}

export const KNOWN_DUPLICATE_COINBASES: readonly KnownDuplicateCoinbase[] = [
    {
        txid: 'e3bf3d07d4b0375638d5f1db5255fe07ba2c4cb067cd81b84ee974b6585fb468',
        heights: [91722, 91880],
        outputScript:
            '4104124b212f5416598a92ccec88819105179dcb2550d571842601492718273fe0f2179a9695096bff94cd99dcccdea7cd9bd943bfca8fea649cac963411979a33e9ac',
        subsidySats: 5000000000n,
    },
    {
        txid: 'd5d27987d2a3dfc724e359870c6644b40e497bdc0589a033220fe15429d88599',
        heights: [91812, 91842],
        outputScript:
            '41046896ecfc449cb8560594eb7f413f199deb9b4e5d947a142e7dc7d2de0b811b8e204833ea2a2fd9d4c7b153a8ca7661d0a0b7fc981df1f42f55d64b26b3da1e9cac',
        subsidySats: 5000000000n,
    },
];

/** First height where a known duplicate coinbase appears (91722). */
export const KNOWN_DUPLICATE_COINBASE_FIRST_HEIGHT = Math.min(
    ...KNOWN_DUPLICATE_COINBASES.flatMap(e => e.heights),
);

/**
 * True when this block is a repeat appearance of a historic duplicate coinbase
 * (not the first height where that txid was mined).
 */
export function isKnownDuplicateCoinbaseRepeat(
    txid: string,
    blockHeight: number,
): boolean {
    for (const entry of KNOWN_DUPLICATE_COINBASES) {
        if (entry.txid !== txid) {
            continue;
        }
        const [firstHeight] = entry.heights;
        return (
            blockHeight !== firstHeight && entry.heights.includes(blockHeight)
        );
    }
    return false;
}

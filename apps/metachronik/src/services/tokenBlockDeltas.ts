// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/** Per-token supply change in one block (from Chronik tokenEntries + outputs). */
export interface TokenBlockDelta {
    tokenId: string;
    genesisAtoms: bigint;
    mintAtoms: bigint;
    burnAtoms: bigint;
}

interface DeltaBucket {
    genesisAtoms: bigint;
    mintAtoms: bigint;
    burnAtoms: bigint;
}

/**
 * Collect per-token genesis, mint, and burn atom deltas for a block.
 * Burns use actualBurnAtoms from tokenEntries (intentionalBurnAtoms is the
 * declared amount; for intentional burns Chronik sets both equal — do not sum).
 * Genesis/mint volumes sum non-baton output.token atoms for matching entries.
 */
export function collectTokenBlockDeltas(blockTxs: any[]): TokenBlockDelta[] {
    const deltas = new Map<string, DeltaBucket>();

    const bucket = (tokenId: string): DeltaBucket => {
        let b = deltas.get(tokenId);
        if (!b) {
            b = { genesisAtoms: 0n, mintAtoms: 0n, burnAtoms: 0n };
            deltas.set(tokenId, b);
        }
        return b;
    };

    const sumNonBatonOutputAtoms = (tx: any, tokenId: string): bigint => {
        let total = 0n;
        if (!tx.outputs) {
            return total;
        }
        for (const output of tx.outputs) {
            if (
                output.token?.tokenId === tokenId &&
                !output.token.isMintBaton
            ) {
                total += BigInt(output.token.atoms ?? 0);
            }
        }
        return total;
    };

    for (const tx of blockTxs) {
        if (!tx.tokenEntries || tx.tokenEntries.length === 0) {
            continue;
        }

        for (const entry of tx.tokenEntries) {
            if (!entry || entry.isInvalid) {
                continue;
            }
            const tokenId: string = entry.tokenId;
            if (!tokenId) {
                continue;
            }

            const b = bucket(tokenId);
            b.burnAtoms += BigInt(entry.actualBurnAtoms ?? 0);

            if (entry.txType === 'GENESIS') {
                b.genesisAtoms += sumNonBatonOutputAtoms(tx, tokenId);
            } else if (entry.txType === 'MINT') {
                b.mintAtoms += sumNonBatonOutputAtoms(tx, tokenId);
            }
        }
    }

    const result: TokenBlockDelta[] = [];
    for (const [tokenId, b] of deltas) {
        if (b.genesisAtoms === 0n && b.mintAtoms === 0n && b.burnAtoms === 0n) {
            continue;
        }
        result.push({
            tokenId,
            genesisAtoms: b.genesisAtoms,
            mintAtoms: b.mintAtoms,
            burnAtoms: b.burnAtoms,
        });
    }
    return result;
}

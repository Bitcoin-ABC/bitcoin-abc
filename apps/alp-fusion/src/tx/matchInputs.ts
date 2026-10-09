// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Reconcile fusion input claims with the coins Chronik actually indexes.
 *
 * Component `tokenAtoms` are not consensus. A participant can claim atoms
 * a UTXO does not have; the fused SEND is then built from those claims.
 * Chronik colors from the real inputs, fails the section, and burns every
 * real atom of that token. Callers must run this before signing.
 */
import { asBytes } from '../protocol/components.js';
import { decodeComponent } from '../protocol/messages.js';

/** Token coloring on one Chronik tx output. */
export interface FusionChainToken {
    tokenId: string;
    tokenType: { protocol: string };
    atoms: bigint;
    isMintBaton: boolean;
}

/** One output from {@link FusionChain.tx}. */
export interface FusionChainOutput {
    sats: bigint;
    spentBy?: { txid: string; outIdx: number };
    token?: FusionChainToken;
}

/**
 * Chronik `tx()` (or a test double) used to read the coins a round spends.
 */
export interface FusionChain {
    tx(txid: string): Promise<{ outputs: FusionChainOutput[] } | undefined>;
}

function asRecord(value: unknown, name: string): Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${name}: expected object`);
    }
    return value as Record<string, unknown>;
}

function outpointKey(txid: string, outIdx: number): string {
    return `${txid}:${outIdx}`;
}

function describeToken(token: FusionChainToken | undefined): string {
    if (token === undefined) {
        return 'no token';
    }
    if (token.isMintBaton) {
        return `mint baton ${token.tokenId}`;
    }
    return `${token.tokenType.protocol} ${token.tokenId} ${token.atoms} atoms`;
}

function claimedAtoms(input: Record<string, unknown>): bigint {
    if (input.tokenAtoms === undefined) {
        return 0n;
    }
    if (typeof input.tokenAtoms !== 'bigint') {
        throw new Error('input.tokenAtoms: expected bigint');
    }
    return input.tokenAtoms;
}

/**
 * Throw unless every input component's sats and token atoms match Chronik.
 *
 * Fuel (no claimed atoms) must be an unspent non-token output. A token
 * input must be an unspent ALP output of `tokenId` with the same atom
 * count. Missing, spent, or mismatched coins are rejected.
 *
 * @param chronik - Source of `tx(txid)` output data
 * @param tokenId - Round token id (64-char hex)
 * @param componentBytes - Shared covert components, including inputs
 */
export async function assertFusionInputsMatchChain(
    chronik: FusionChain,
    tokenId: string,
    componentBytes: Uint8Array[],
): Promise<void> {
    const want = tokenId.toLowerCase();
    for (const raw of componentBytes) {
        const dec = decodeComponent(Buffer.from(raw));
        if (!dec.input) {
            continue;
        }
        const input = asRecord(dec.input, 'component.input');
        const txid = asBytes(input.prevTxid, 'input.prevTxid')
            .toString('hex')
            .toLowerCase();
        const outIdx = input.prevIndex;
        if (
            typeof outIdx !== 'number' ||
            !Number.isInteger(outIdx) ||
            outIdx < 0
        ) {
            throw new Error('input.prevIndex: expected integer');
        }
        if (typeof input.sats !== 'bigint') {
            throw new Error('input.sats: expected bigint');
        }
        const key = outpointKey(txid, outIdx);
        const atoms = claimedAtoms(input);
        let tx: { outputs: FusionChainOutput[] } | undefined;
        try {
            tx = await chronik.tx(txid);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(`fusion input ${key}: ${message}`);
        }
        const output = tx?.outputs[outIdx];
        if (output === undefined) {
            throw new Error(`fusion input ${key}: output not found`);
        }
        if (output.spentBy !== undefined) {
            throw new Error(`fusion input ${key}: output is spent`);
        }
        if (output.sats !== input.sats) {
            throw new Error(
                `fusion input ${key}: claimed ${input.sats} sats, chain has ${output.sats}`,
            );
        }
        if (atoms === 0n) {
            if (output.token !== undefined) {
                throw new Error(
                    `fusion input ${key}: fuel output carries ${describeToken(output.token)}`,
                );
            }
            continue;
        }
        const token = output.token;
        const matches =
            token !== undefined &&
            !token.isMintBaton &&
            token.tokenType.protocol === 'ALP' &&
            token.tokenId.toLowerCase() === want &&
            token.atoms === atoms;
        if (!matches) {
            throw new Error(
                `fusion input ${key}: claimed ${atoms} atoms, chain has ${describeToken(token)}`,
            );
        }
    }
}

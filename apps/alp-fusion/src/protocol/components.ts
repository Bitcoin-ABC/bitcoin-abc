// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Encode / decode CashFusion-shaped {@link Component} blobs for a wire round.
 *
 * `saltedComponentHash` is still `sha256(componentBytes)` for assemble
 * matching. Pedersen / blind-auth live in `commit.ts`.
 */
import { randomBytes } from 'node:crypto';

import {
    DEFAULT_DUST_SATS,
    fromHex,
    sha256,
    shaRmd160,
    Script,
    toHex,
    type OutPoint,
} from 'ecash-lib';

import type { PlayerContribution } from '../coordinator/types.js';
import type {
    FusionFuelInput,
    FusionTokenInput,
    FusionTokenOutput,
} from '../tx/types.js';

import { encodeComponent, decodeComponent } from './messages.js';

/** Compressed-pubkey-sized dummy point for unverified Pedersen fields. */
export const DUMMY_POINT = Buffer.alloc(33, 2);

/**
 * Token / fuel input plus the compressed pubkey that unlocks it.
 * Script must be P2PKH of `shaRmd160(pubkey)`.
 */
export interface WireTokenInput extends FusionTokenInput {
    pubkey: Uint8Array;
}

export interface WireFuelInput extends FusionFuelInput {
    pubkey: Uint8Array;
}

/** One player's fuseable coins for a networked round. */
export interface WireContribution {
    tokenInputs: WireTokenInput[];
    tokenOutputs: FusionTokenOutput[];
    fuelInputs?: WireFuelInput[];
}

/**
 * Require `value` to be bytes (Buffer / Uint8Array).
 */
export function asBytes(value: unknown, name: string): Buffer {
    if (Buffer.isBuffer(value)) {
        return value;
    }
    if (value instanceof Uint8Array) {
        return Buffer.from(value);
    }
    throw new Error(`${name}: expected bytes`);
}

/**
 * `sha256` of the encoded component — matches `saltedComponentHash` for this slice.
 */
export function componentCommitment(componentBytes: Uint8Array): Uint8Array {
    return sha256(componentBytes);
}

/**
 * BE hex txid (assemble string form) ↔ 32-byte `prev_txid`.
 */
export function outpointTxidBytes(prevOut: OutPoint): Buffer {
    if (typeof prevOut.txid === 'string') {
        return Buffer.from(fromHex(prevOut.txid.toLowerCase()));
    }
    return Buffer.from(prevOut.txid);
}

function assertPubkeyMatchesScript(
    pubkey: Uint8Array,
    script: Script,
    label: string,
): void {
    if (pubkey.length !== 33) {
        throw new Error(`${label}: pubkey must be 33-byte compressed`);
    }
    const expected = Script.p2pkh(shaRmd160(pubkey));
    if (!Buffer.from(expected.bytecode).equals(Buffer.from(script.bytecode))) {
        throw new Error(`${label}: script is not P2PKH(shaRmd160(pubkey))`);
    }
}

/**
 * Encode one player's inputs/outputs as `Component` protobuf blobs.
 */
export function contributionToComponents(contrib: WireContribution): Buffer[] {
    if (contrib.tokenInputs.length === 0) {
        throw new Error('at least one token input required');
    }
    if (contrib.tokenOutputs.length === 0) {
        throw new Error('at least one token output required');
    }
    const out: Buffer[] = [];
    for (const inp of contrib.tokenInputs) {
        assertPubkeyMatchesScript(inp.pubkey, inp.script, 'token input');
        out.push(
            encodeComponent({
                saltCommitment: sha256(randomBytes(32)),
                input: {
                    prevTxid: outpointTxidBytes(inp.prevOut),
                    prevIndex: inp.prevOut.outIdx,
                    pubkey: Buffer.from(inp.pubkey),
                    sats: inp.sats,
                    tokenAtoms: inp.atoms,
                },
            }),
        );
    }
    for (const fuel of contrib.fuelInputs ?? []) {
        assertPubkeyMatchesScript(fuel.pubkey, fuel.script, 'fuel input');
        if (fuel.atoms !== 0n) {
            throw new Error('fuel input atoms must be 0');
        }
        out.push(
            encodeComponent({
                saltCommitment: sha256(randomBytes(32)),
                input: {
                    prevTxid: outpointTxidBytes(fuel.prevOut),
                    prevIndex: fuel.prevOut.outIdx,
                    pubkey: Buffer.from(fuel.pubkey),
                    sats: fuel.sats,
                },
            }),
        );
    }
    for (const tout of contrib.tokenOutputs) {
        out.push(
            encodeComponent({
                saltCommitment: sha256(randomBytes(32)),
                output: {
                    scriptpubkey: Buffer.from(tout.script.bytecode),
                    sats: tout.sats ?? DEFAULT_DUST_SATS,
                    tokenAtoms: tout.atoms,
                },
            }),
        );
    }
    return out;
}

function asRecord(value: unknown, name: string): Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${name}: expected object`);
    }
    return value as Record<string, unknown>;
}

function decodeInputComponent(
    input: Record<string, unknown>,
    tokenId: string,
): { token?: FusionTokenInput; fuel?: FusionFuelInput } {
    const pubkey = asBytes(input.pubkey, 'input.pubkey');
    const prevTxid = asBytes(input.prevTxid, 'input.prevTxid');
    const prevIndex = input.prevIndex;
    if (typeof prevIndex !== 'number' || !Number.isInteger(prevIndex)) {
        throw new Error('input.prevIndex: expected integer');
    }
    if (typeof input.sats !== 'bigint') {
        throw new Error('input.sats: expected bigint');
    }
    const script = Script.p2pkh(shaRmd160(pubkey));
    const prevOut: OutPoint = { txid: toHex(prevTxid), outIdx: prevIndex };
    const tokenAtoms = input.tokenAtoms;
    if (tokenAtoms === undefined || tokenAtoms === 0n) {
        return {
            fuel: {
                prevOut,
                sats: input.sats,
                script,
                atoms: 0n,
            },
        };
    }
    if (typeof tokenAtoms !== 'bigint') {
        throw new Error('input.tokenAtoms: expected bigint');
    }
    return {
        token: {
            prevOut,
            sats: input.sats,
            script,
            tokenId,
            atoms: tokenAtoms,
        },
    };
}

/**
 * Rebuild a {@link PlayerContribution} from covert-submitted component blobs.
 */
export function componentsToContribution(
    playerId: string,
    tokenId: string,
    componentBytes: Uint8Array[],
): PlayerContribution {
    const tokenInputs: FusionTokenInput[] = [];
    const fuelInputs: FusionFuelInput[] = [];
    const tokenOutputs: FusionTokenOutput[] = [];
    for (const raw of componentBytes) {
        const dec = decodeComponent(Buffer.from(raw));
        if (dec.input) {
            const parsed = decodeInputComponent(
                asRecord(dec.input, 'component.input'),
                tokenId,
            );
            if (parsed.token) {
                tokenInputs.push(parsed.token);
            } else if (parsed.fuel) {
                fuelInputs.push(parsed.fuel);
            }
            continue;
        }
        if (dec.output) {
            const output = asRecord(dec.output, 'component.output');
            const scriptpubkey = asBytes(
                output.scriptpubkey,
                'output.scriptpubkey',
            );
            if (typeof output.sats !== 'bigint') {
                throw new Error('output.sats: expected bigint');
            }
            if (typeof output.tokenAtoms !== 'bigint') {
                throw new Error(
                    'output.tokenAtoms: expected bigint token output',
                );
            }
            tokenOutputs.push({
                script: new Script(scriptpubkey),
                atoms: output.tokenAtoms,
                sats: output.sats,
            });
            continue;
        }
        // blank — ignored for assemble
    }
    return {
        playerId,
        tokenInputs,
        tokenOutputs,
        fuelInputs: fuelInputs.length > 0 ? fuelInputs : undefined,
    };
}

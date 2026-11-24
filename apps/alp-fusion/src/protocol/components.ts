// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Encode / decode CashFusion-shaped {@link Component} blobs for a wire round.
 *
 * `saltedComponentHash` is `sha256(salt || component)`. The salt stays with
 * the committer. Pedersen / blind-auth live in `commit.ts`.
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
    FusionXecOutput,
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
    /** Optional seckey — required to sign this input after assemble. */
    sk?: Uint8Array;
}

export interface WireFuelInput extends FusionFuelInput {
    pubkey: Uint8Array;
    /** Optional seckey — required to sign this input after assemble. */
    sk?: Uint8Array;
}

/** One player's fuseable coins for a networked round. */
export interface WireContribution {
    tokenInputs: WireTokenInput[];
    tokenOutputs: FusionTokenOutput[];
    fuelInputs?: WireFuelInput[];
    /** Uncolored XEC change (not colored by the ALP SEND). */
    xecOutputs?: FusionXecOutput[];
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
 * Commitment the coordinator stores for one component.
 * `salt` is 32 bytes and is not part of `component`, so a covert reveal
 * cannot be matched back to this hash.
 */
export function saltedComponentHash(
    salt: Uint8Array,
    component: Uint8Array,
): Uint8Array {
    if (salt.length !== 32) {
        throw new Error(`salt must be 32 bytes, got ${salt.length}`);
    }
    const buf = new Uint8Array(32 + component.length);
    buf.set(salt, 0);
    buf.set(component, 32);
    return sha256(buf);
}

/** One encoded component plus the salt that must not leave the committer. */
export interface EncodedComponent {
    salt: Buffer;
    component: Buffer;
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

function encodeSalted(
    fields: Parameters<typeof encodeComponent>[0],
): EncodedComponent {
    const salt = randomBytes(32);
    return {
        salt,
        component: encodeComponent({
            ...fields,
            saltCommitment: sha256(salt),
        }),
    };
}

/**
 * Encode one player's inputs/outputs as salted `Component` protobuf blobs.
 * Callers that commit must keep `salt` and pass it to `buildPlayerCommit`.
 */
export function encodeContribution(
    contrib: WireContribution,
): EncodedComponent[] {
    if (contrib.tokenInputs.length === 0) {
        throw new Error('at least one token input required');
    }
    if (contrib.tokenOutputs.length === 0) {
        throw new Error('at least one token output required');
    }
    const out: EncodedComponent[] = [];
    for (const inp of contrib.tokenInputs) {
        assertPubkeyMatchesScript(inp.pubkey, inp.script, 'token input');
        out.push(
            encodeSalted({
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
            encodeSalted({
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
            encodeSalted({
                output: {
                    scriptpubkey: Buffer.from(tout.script.bytecode),
                    sats: tout.sats ?? DEFAULT_DUST_SATS,
                    tokenAtoms: tout.atoms,
                },
            }),
        );
    }
    for (const xec of contrib.xecOutputs ?? []) {
        out.push(
            encodeSalted({
                output: {
                    scriptpubkey: Buffer.from(xec.script.bytecode),
                    sats: xec.sats,
                },
            }),
        );
    }
    return out;
}

/**
 * Encode one player's inputs/outputs as `Component` protobuf blobs.
 * Drops the salts. Use {@link encodeContribution} when committing.
 */
export function contributionToComponents(contrib: WireContribution): Buffer[] {
    return encodeContribution(contrib).map(item => item.component);
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
    const xecOutputs: FusionXecOutput[] = [];
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
            const tokenAtoms = output.tokenAtoms;
            if (tokenAtoms === undefined || tokenAtoms === 0n) {
                xecOutputs.push({
                    script: new Script(scriptpubkey),
                    sats: output.sats,
                });
                continue;
            }
            if (typeof tokenAtoms !== 'bigint') {
                throw new Error('output.tokenAtoms: expected bigint');
            }
            tokenOutputs.push({
                script: new Script(scriptpubkey),
                atoms: tokenAtoms,
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
        xecOutputs: xecOutputs.length > 0 ? xecOutputs : undefined,
    };
}

// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Dual Pedersen commitments and CashFusion-shaped blind-auth for a wire round.
 *
 * PlayerCommit opens sats to `excessFee` and token atoms to `0` (conservation).
 * Covert components must carry a Schnorr sig of `sha256(component)` under the
 * round pubkey (unblinded client-side from BlindSigResponses).
 *
 * Chronik, tx signing, and blame proofs stay out of scope.
 */
import { randomBytes } from 'node:crypto';

import {
    addScalars,
    BlindSignatureRequest,
    buildBlindSigRequests,
    Ecc,
    PedersenSetup,
    randomScalarBytes,
    sha256,
    toHex,
    verifyCommitmentSum,
    type PedersenCommitment,
} from 'ecash-lib';

import { asBytes } from './components.js';
import { PEDERSEN_H_SATS, PEDERSEN_H_TOKEN } from './constants.js';
import {
    decodeComponent,
    decodeInitialCommitment,
    encodeInitialCommitment,
} from './messages.js';

const ecc = new Ecc();

let satsSetup: PedersenSetup | undefined;
let tokenSetup: PedersenSetup | undefined;

/**
 * Pedersen setup for XEC (sats) amounts — Electrum CashFusion H.
 */
export function satsPedersenSetup(): PedersenSetup {
    satsSetup ??= new PedersenSetup(PEDERSEN_H_SATS);
    return satsSetup;
}

/**
 * Pedersen setup for ALP token atoms — domain-separated from sats.
 */
export function tokenPedersenSetup(): PedersenSetup {
    tokenSetup ??= new PedersenSetup(PEDERSEN_H_TOKEN);
    return tokenSetup;
}

/**
 * Electrum `size_of_input`: signed input size (141 for compressed P2PKH).
 */
export function sizeOfInput(pubkey: Uint8Array): number {
    if (pubkey.length < 2 || pubkey.length > 75) {
        throw new Error('sizeOfInput: pubkey length');
    }
    return 108 + pubkey.length;
}

/**
 * Electrum `size_of_output`: 9 + script length (34 for P2PKH).
 */
export function sizeOfOutput(script: Uint8Array): number {
    if (script.length >= 253) {
        throw new Error('sizeOfOutput: script too long');
    }
    return 9 + script.length;
}

/**
 * Electrum `component_fee`: ceil(size * feerate / 1000) with feerate in sat/kB.
 */
export function componentFee(size: number, feerate: bigint): bigint {
    if (size < 0) {
        throw new Error('componentFee: size must be >= 0');
    }
    if (feerate < 0n) {
        throw new Error('componentFee: feerate must be >= 0');
    }
    return (BigInt(size) * feerate + 999n) / 1000n;
}

/**
 * Sats / atom amounts committed by one encoded {@link Component}.
 * Inputs: `+amount`. Outputs: `-amount`. Blanks: 0.
 *
 * Electrum also folds per-component fees into the sats commitment; that
 * lands with blame proofs. This slice commits raw amounts so excessFee
 * stays a uint64 (fee-adjusted totals are often negative in unsigned
 * fixtures).
 */
export function componentCommitAmounts(
    component: Uint8Array,
    _feerate: bigint,
): { sats: bigint; atoms: bigint } {
    const dec = decodeComponent(Buffer.from(component));
    if (dec.input) {
        const input = asRecord(dec.input, 'component.input');
        const sats = asBigInt(input.sats, 'input.sats');
        const atoms =
            input.tokenAtoms === undefined
                ? 0n
                : asBigInt(input.tokenAtoms, 'input.tokenAtoms');
        return { sats, atoms };
    }
    if (dec.output) {
        const output = asRecord(dec.output, 'component.output');
        const sats = asBigInt(output.sats, 'output.sats');
        const atoms =
            output.tokenAtoms === undefined
                ? 0n
                : asBigInt(output.tokenAtoms, 'output.tokenAtoms');
        return { sats: -sats, atoms: -atoms };
    }
    return { sats: 0n, atoms: 0n };
}

export interface BuiltPlayerCommit {
    initialCommitments: Buffer[];
    excessFee: bigint;
    satsPedersenTotalNonce: Uint8Array;
    tokenPedersenTotalNonce: Uint8Array;
    randomNumberCommitment: Uint8Array;
    blindSigRequests: Uint8Array[];
    requests: BlindSignatureRequest[];
    /** `sha256(component)` hex — assemble matching key for this slice. */
    hashes: string[];
}

/**
 * Build PlayerCommit fields and blind-sig requests for `components`.
 */
export function buildPlayerCommit(
    components: Uint8Array[],
    roundPubkey: Uint8Array,
    blindNoncePoints: Uint8Array[],
    feerate: bigint,
): BuiltPlayerCommit {
    if (components.length === 0) {
        throw new Error('buildPlayerCommit: at least one component');
    }
    if (blindNoncePoints.length < components.length) {
        throw new Error('buildPlayerCommit: not enough blind nonce points');
    }
    const satsCommits: PedersenCommitment[] = [];
    const tokenCommits: PedersenCommitment[] = [];
    const initialCommitments: Buffer[] = [];
    const hashes: string[] = [];
    let excessFee = 0n;
    let tokenTotal = 0n;

    for (const raw of components) {
        const amounts = componentCommitAmounts(raw, feerate);
        excessFee += amounts.sats;
        tokenTotal += amounts.atoms;
        const satsC = satsPedersenSetup().commit(amounts.sats);
        const tokenC = tokenPedersenSetup().commit(amounts.atoms);
        satsCommits.push(satsC);
        tokenCommits.push(tokenC);
        const hash = sha256(raw);
        hashes.push(toHex(hash));
        initialCommitments.push(
            encodeInitialCommitment({
                saltedComponentHash: Buffer.from(hash),
                satsCommitment: Buffer.from(satsC.point),
                tokenCommitment: Buffer.from(tokenC.point),
                communicationKey: Buffer.from(
                    ecc.derivePubkey(randomScalarBytes()),
                ),
            }),
        );
    }
    if (tokenTotal !== 0n) {
        throw new Error(
            `buildPlayerCommit: token atoms not conserved (${tokenTotal})`,
        );
    }
    if (excessFee < 0n) {
        throw new Error(`buildPlayerCommit: negative excessFee (${excessFee})`);
    }
    const satsNonce = sumNonces(satsCommits.map(c => c.nonce));
    const tokenNonce = sumNonces(tokenCommits.map(c => c.nonce));

    const { requests, eValues } = buildBlindSigRequests(
        roundPubkey,
        blindNoncePoints.slice(0, components.length),
        components,
    );
    return {
        initialCommitments,
        excessFee,
        satsPedersenTotalNonce: satsNonce,
        tokenPedersenTotalNonce: tokenNonce,
        randomNumberCommitment: sha256(randomBytes(32)),
        blindSigRequests: eValues,
        requests,
        hashes,
    };
}

export interface VerifyPlayerCommitOpts {
    minExcessFee: bigint;
    maxExcessFee: bigint;
    maxComponents: number;
}

export interface VerifiedPlayerCommit {
    hashes: string[];
    eValues: Uint8Array[];
    excessFee: bigint;
}

/**
 * Check PlayerCommit counts, dual Pedersen openings, and blind-request shape.
 */
export function verifyPlayerCommit(
    payload: Record<string, unknown>,
    opts: VerifyPlayerCommitOpts,
): VerifiedPlayerCommit {
    const rawCommits = payload.initialCommitments;
    if (!Array.isArray(rawCommits) || rawCommits.length === 0) {
        throw new Error('playercommit: initialCommitments required');
    }
    if (rawCommits.length > opts.maxComponents) {
        throw new Error('playercommit: too many commitments');
    }
    const rawReqs = payload.blindSigRequests;
    if (!Array.isArray(rawReqs) || rawReqs.length !== rawCommits.length) {
        throw new Error('playercommit: blind sig request count');
    }
    if (typeof payload.excessFee !== 'bigint') {
        throw new Error('playercommit: excessFee: expected bigint');
    }
    if (
        payload.excessFee < opts.minExcessFee ||
        payload.excessFee > opts.maxExcessFee
    ) {
        throw new Error('playercommit: excessFee out of range');
    }
    const satsNonce = asBytes(
        payload.satsPedersenTotalNonce,
        'satsPedersenTotalNonce',
    );
    const tokenNonce = asBytes(
        payload.tokenPedersenTotalNonce,
        'tokenPedersenTotalNonce',
    );
    const randCommit = asBytes(
        payload.randomNumberCommitment,
        'randomNumberCommitment',
    );
    if (
        satsNonce.length !== 32 ||
        tokenNonce.length !== 32 ||
        randCommit.length !== 32
    ) {
        throw new Error('playercommit: nonce/commitment must be 32 bytes');
    }

    const hashes: string[] = [];
    const satsPoints: Uint8Array[] = [];
    const tokenPoints: Uint8Array[] = [];
    for (const item of rawCommits) {
        const decoded = decodeInitialCommitment(
            asBytes(item, 'initialCommitment'),
        );
        const hash = asBytes(
            decoded.saltedComponentHash,
            'saltedComponentHash',
        );
        if (hash.length !== 32) {
            throw new Error(
                'playercommit: saltedComponentHash must be 32 bytes',
            );
        }
        hashes.push(toHex(hash));
        satsPoints.push(asBytes(decoded.satsCommitment, 'satsCommitment'));
        tokenPoints.push(asBytes(decoded.tokenCommitment, 'tokenCommitment'));
    }

    if (
        !verifyCommitmentSum(
            satsPedersenSetup(),
            satsPoints,
            payload.excessFee,
            satsNonce,
        )
    ) {
        throw new Error('playercommit: sats Pedersen mismatch');
    }
    if (
        !verifyCommitmentSum(tokenPedersenSetup(), tokenPoints, 0n, tokenNonce)
    ) {
        throw new Error('playercommit: token Pedersen mismatch');
    }

    const eValues = rawReqs.map((item, i) => {
        const e = asBytes(item, `blindSigRequests[${i}]`);
        if (e.length !== 32) {
            throw new Error('playercommit: blind sig request must be 32 bytes');
        }
        return e;
    });
    return { hashes, eValues, excessFee: payload.excessFee };
}

/**
 * Electrum `assert len(msg.scalars) == len(blindsigrequests)` before unblind.
 */
export function readBlindSigScalars(
    scalarRaw: unknown,
    expected: number,
): Uint8Array[] {
    if (!Array.isArray(scalarRaw)) {
        throw new Error('BlindSigResponses.scalars: expected array');
    }
    if (scalarRaw.length !== expected) {
        throw new Error(
            `BlindSigResponses.scalars: expected ${expected}, got ${scalarRaw.length}`,
        );
    }
    return scalarRaw.map((item, i) =>
        asBytes(item, `BlindSigResponses.scalars[${i}]`),
    );
}

/**
 * Verify a covert component Schnorr sig under `roundPubkey`.
 *
 * @returns the component bytes
 */
export function verifyCovertComponent(
    payload: Record<string, unknown>,
    roundPubkey: Uint8Array,
): Buffer {
    const component = asBytes(payload.component, 'covert.component');
    const signature = asBytes(payload.signature, 'covert.signature');
    if (signature.length !== 64) {
        throw new Error('covert: signature must be 64 bytes');
    }
    if (roundPubkey.length !== 33) {
        throw new Error('covert: round pubkey must be 33 bytes');
    }
    const advertised = payload.roundPubkey;
    if (advertised !== undefined) {
        const advertisedPk = asBytes(advertised, 'covert.roundPubkey');
        if (!advertisedPk.equals(Buffer.from(roundPubkey))) {
            throw new Error('covert: round pubkey mismatch');
        }
    }
    ecc.schnorrVerify(signature, sha256(component), roundPubkey);
    return component;
}

/**
 * Sum 32-byte nonces mod n. Does not start from the zero scalar —
 * `seckeyAdd(0, x)` is invalid and would drop the first nonce.
 */
function sumNonces(nonces: Uint8Array[]): Uint8Array {
    if (nonces.length === 0) {
        return new Uint8Array(32);
    }
    return nonces
        .slice(1)
        .reduce((acc, nonce) => addScalars(acc, nonce), nonces[0]);
}

function asRecord(value: unknown, name: string): Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${name}: expected object`);
    }
    return value as Record<string, unknown>;
}

function asBigInt(value: unknown, name: string): bigint {
    if (typeof value !== 'bigint') {
        throw new Error(`${name}: expected bigint`);
    }
    return value;
}

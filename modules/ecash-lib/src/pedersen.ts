// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Ecc } from './ecc.js';
import {
    CURVE_ORDER,
    modCurveOrder,
    randomScalarBytes,
    scalarToBytes,
} from './eccScalar.js';
import { bytesToScalar, equalBytes, zeroBytes } from './io/array.js';
import { fromHex } from './io/hex.js';

const ecc = new Ecc();
const SCALAR_ONE = fromHex(
    '0000000000000000000000000000000000000000000000000000000000000001',
);

export class NonceRangeError extends Error {
    constructor(message = 'Invalid Pedersen nonce') {
        super(message);
        this.name = 'NonceRangeError';
    }
}

export class InsecureHPoint extends Error {
    constructor(message = 'InsecureHPoint') {
        super(message);
        this.name = 'InsecureHPoint';
    }
}

/** Sum of commitment points is the point at infinity (cannot be serialized). */
export class ResultAtInfinity extends Error {
    constructor(message = 'ResultAtInfinity') {
        super(message);
        this.name = 'ResultAtInfinity';
    }
}

export interface PedersenCommitment {
    amount: bigint;
    /** 32-byte nonce scalar (may be zero for aggregate openings) */
    nonce: Uint8Array;
    /** Compressed (33-byte) commitment point */
    point: Uint8Array;
    /** Uncompressed (65-byte) commitment point */
    pointUncompressed: Uint8Array;
}

/**
 * Pedersen setup for commitments C = nonce*G + amount*H (same algebra as
 * Electrum ABC).
 *
 * Rejects insecure H with a known discrete log vs G:
 * - H = -G (HG at infinity), same as Electrum
 * - H = G (then C = (nonce+amount)G and binding is lost)
 *
 * Callers supply a nothing-up-my-sleeve H (Electrum/ALP fixed domain strings).
 * This API does not derive H itself.
 *
 * Implementation detail: we store H and H+G and evaluate the equivalent form
 *   C = (a - k)*H + k*(H + G)
 * so the amount scalar multiply is blinded by the nonce (see Electrum
 * `Commitment._calc_initial`). Expand to recover C = k*G + a*H.
 *
 * Fresh nonces from {@link commit} are in [1, n). A zero nonce is accepted when
 * supplied explicitly (e.g. aggregate openings where nonces cancel): then
 * C = amount*H. The (amount, nonce) = (0, 0) opening is the identity and cannot
 * be serialized as a point — use {@link verifyCommitmentSum} for that case.
 */
export class PedersenSetup {
    /** Compressed H */
    readonly H: Uint8Array;
    /** Compressed H+G */
    readonly HG: Uint8Array;

    constructor(H: Uint8Array) {
        // Accept compressed (33) or uncompressed (65), same as Electrum ABC.
        let compressed: Uint8Array;
        if (H.length === 33) {
            try {
                ecc.uncompressPk(H); // validate
            } catch {
                throw new Error('H could not be parsed');
            }
            compressed = H;
        } else if (H.length === 65 && H[0] === 0x04) {
            try {
                compressed = ecc.compressPk(H);
            } catch {
                throw new Error('H could not be parsed');
            }
        } else {
            throw new Error('H could not be parsed');
        }
        if (equalBytes(compressed, ecc.derivePubkey(SCALAR_ONE))) {
            throw new InsecureHPoint('H = G');
        }
        try {
            // HG = H + G. Fails if H = -G (result at infinity).
            this.HG = ecc.pubkeyAdd(compressed, SCALAR_ONE);
        } catch {
            throw new InsecureHPoint();
        }
        this.H = new Uint8Array(compressed);
    }

    commit(amount: bigint, nonce?: Uint8Array): PedersenCommitment {
        const amountMod = modCurveOrder(amount);
        const amountBytes = scalarToBytes(amountMod);

        let k: Uint8Array;
        if (nonce === undefined) {
            // Fresh nonce in [1, n) — never zero.
            k = randomScalarBytes();
        } else {
            if (nonce.length !== 32) {
                throw new NonceRangeError('nonce must be 32 bytes');
            }
            const kn = bytesToScalar(nonce);
            if (kn < 0n || kn >= CURVE_ORDER) {
                throw new NonceRangeError();
            }
            k = new Uint8Array(nonce);

            // Zero nonce: C = a*H (aggregate opening when nonces cancel).
            // For independent random nonces this is ~2^-256 unlikely; it is
            // expected when deliberately summing complementary nonces.
            // libsecp rejects 0*P, so this path is explicit.
            if (kn === 0n) {
                if (amountMod === 0n) {
                    throw new ResultAtInfinity(
                        'commitment at infinity (zero amount and nonce)',
                    );
                }
                const point = ecc.pubkeyMul(this.H, amountBytes);
                return {
                    amount,
                    nonce: k,
                    point,
                    pointUncompressed: ecc.uncompressPk(point),
                };
            }
        }

        // Electrum amount blinding: C = (a-k)*H + k*(H+G).
        const kHG = ecc.pubkeyMul(this.HG, k);
        let point = kHG;
        const negK = ecc.seckeyNegate(k);
        let aMinusK: Uint8Array | undefined;
        try {
            // seckeyAdd = secp256k1 seckey tweak add: (a + b) mod n.
            // Here: (a - k) mod n. Throws when the result is 0 (invalid seckey),
            // i.e. when (a - k) ≡ 0 (mod n) — Electrum's a_k == 0 fast path.
            // For uniform random k that is ~2^-256 unlikely (a ≡ k mod n).
            aMinusK = ecc.seckeyAdd(negK, amountBytes);
        } catch {
            // (a - k) ≡ 0 (mod n): C = k*(H+G) only (point already kHG).
        } finally {
            zeroBytes(negK);
        }

        if (aMinusK !== undefined) {
            try {
                const akH = ecc.pubkeyMul(this.H, aMinusK);
                try {
                    point = ecc.pubkeyCombine(kHG, akH);
                } catch {
                    // Point at infinity ⇒ discrete log of H is known.
                    throw new InsecureHPoint();
                }
            } finally {
                zeroBytes(aMinusK);
            }
        }

        return {
            amount,
            nonce: k,
            point,
            pointUncompressed: ecc.uncompressPk(point),
        };
    }
}

/** Compress and validate a commitment point (33-byte compressed or 65-byte). */
function normalizeCommitmentPoint(p: Uint8Array): Uint8Array {
    if (p.length === 65) {
        if (p[0] !== 0x04) {
            throw new Error('Invalid uncompressed commitment point');
        }
        const compressed = ecc.compressPk(p);
        // compressPk only packs bytes; require a valid curve point.
        ecc.uncompressPk(compressed);
        return compressed;
    }
    if (p.length === 33) {
        if (p[0] !== 0x02 && p[0] !== 0x03) {
            throw new Error('Invalid compressed commitment point');
        }
        ecc.uncompressPk(p);
        return p;
    }
    throw new Error('Invalid commitment point length');
}

export function addCommitmentPoints(points: Uint8Array[]): Uint8Array {
    if (points.length === 0) {
        throw new Error('No points to add');
    }
    // Validate each point before combining so malformed input is not mistaken
    // for the point at infinity.
    const compressed = points.map(normalizeCommitmentPoint);
    let sum: Uint8Array;
    try {
        sum = compressed
            .slice(1)
            .reduce((acc, p) => ecc.pubkeyCombine(acc, p), compressed[0]);
    } catch {
        throw new ResultAtInfinity();
    }
    return ecc.uncompressPk(sum);
}

/**
 * Verify that commitments open to (totalAmount, totalNonce).
 * Returns a boolean (does not throw for the identity aggregate): when the
 * points sum to infinity, the only valid opening is amount ≡ 0 and nonce = 0.
 * Ill-formed commitments or nonce always return false (never true).
 */
export function verifyCommitmentSum(
    setup: PedersenSetup,
    commitments: Uint8Array[],
    totalAmount: bigint,
    totalNonce: Uint8Array,
): boolean {
    if (totalNonce.length !== 32) {
        return false;
    }
    const amountMod = modCurveOrder(totalAmount);
    const nonceIsZero = bytesToScalar(totalNonce) === 0n;

    let sum: Uint8Array;
    try {
        sum = addCommitmentPoints(commitments);
    } catch (e) {
        // Genuine infinity only after points were validated.
        if (e instanceof ResultAtInfinity) {
            return nonceIsZero && amountMod === 0n;
        }
        return false;
    }

    // Claimed (0, 0) opening but the sum is a concrete point.
    if (nonceIsZero && amountMod === 0n) {
        return false;
    }

    try {
        const expected = setup.commit(totalAmount, totalNonce);
        return equalBytes(sum, expected.pointUncompressed);
    } catch {
        return false;
    }
}

/**
 * Sum two 32-byte seckeys/nonces mod n (wasm seckeyAdd).
 * When (a + b) ≡ 0 (mod n), seckeyAdd throws — return canonical zero.
 */
export function addScalars(a: Uint8Array, b: Uint8Array): Uint8Array {
    try {
        return ecc.seckeyAdd(a, b);
    } catch {
        // (a + b) ≡ 0 (mod n)
        return new Uint8Array(32);
    }
}

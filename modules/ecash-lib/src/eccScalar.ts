// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { bytesToScalar } from './io/array.js';

/** secp256k1 group order n. */
export const CURVE_ORDER =
    0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

/** Reduce `n` into [0, CURVE_ORDER). */
export function modCurveOrder(n: bigint): bigint {
    const r = n % CURVE_ORDER;
    return r < 0n ? r + CURVE_ORDER : r;
}

/** Big-endian 32-byte encoding of a scalar reduced into [0, n). */
export function scalarToBytes(n: bigint): Uint8Array {
    let x = modCurveOrder(n);
    const out = new Uint8Array(32);
    for (let i = 31; i >= 0; i--) {
        out[i] = Number(x & 0xffn);
        x >>= 8n;
    }
    return out;
}

/**
 * Cryptographically random 32-byte scalar in [1, n).
 * Rejection sampling — no modular reduction of the RNG output (avoids bias).
 */
export function randomScalarBytes(): Uint8Array {
    const buf = new Uint8Array(32);
    for (;;) {
        crypto.getRandomValues(buf);
        const n = bytesToScalar(buf);
        if (n > 0n && n < CURVE_ORDER) {
            return buf;
        }
    }
}

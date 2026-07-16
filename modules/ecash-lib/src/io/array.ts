// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Byte-array equality without early-exit in the compare loop.
 * Not a substitute for `crypto.timingSafeEqual` where available; JS cannot
 * give strict constant-time guarantees (GC, etc.).
 */
export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
    const len = a.length;
    if (len !== b.length) {
        return false;
    }
    let diff = 0;
    for (let i = 0; i < len; i++) {
        diff |= a[i]! ^ b[i]!;
    }
    return diff === 0;
}

/** Overwrite a buffer with zeros (best-effort secret clearing). */
export function zeroBytes(buf: Uint8Array): void {
    buf.fill(0);
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
    let len = 0;
    for (const p of parts) {
        len += p.length;
    }
    const out = new Uint8Array(len);
    let offset = 0;
    for (const p of parts) {
        out.set(p, offset);
        offset += p.length;
    }
    return out;
}

/** Interpret bytes as a big-endian unsigned integer. */
export function bytesToScalar(buf: Uint8Array): bigint {
    let n = 0n;
    for (const b of buf) {
        n = (n << 8n) + BigInt(b);
    }
    return n;
}

/** Big-endian uint32. Throws if `n` is not an integer in [0, 2^32). */
export function u32ToBe(n: number): Uint8Array {
    if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) {
        throw new Error(`u32ToBe: expected integer in [0, 2^32), got ${n}`);
    }
    const out = new Uint8Array(4);
    new DataView(out.buffer).setUint32(0, n, false);
    return out;
}

/** Big-endian uint64. Throws if `n` is not an integer in [0, 2^64). */
export function bigintToU64Be(n: bigint): Uint8Array {
    if (n < 0n || n > 0xffffffffffffffffn) {
        throw new Error(
            `bigintToU64Be: expected integer in [0, 2^64), got ${n}`,
        );
    }
    const out = new Uint8Array(8);
    new DataView(out.buffer).setBigUint64(0, n, false);
    return out;
}

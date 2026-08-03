// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/** 2^32 — width of one Uint32 lane / mulberry32 output scale. */
const UINT32_RANGE = 0x1_0000_0000;

/**
 * 2^53 — Number mantissa integer precision; scale 53 random bits into [0, 1).
 */
const UNIT_INTERVAL_DENOM = 0x20_0000_0000_0000;

/**
 * Uniform unit interval from crypto.getRandomValues (53 bits of entropy).
 * Throws if the buffer is somehow empty (avoids silent NaN in Fisher–Yates).
 */
export function cryptoUnitInterval(): number {
    const buf = new Uint32Array(2);
    crypto.getRandomValues(buf);
    const a = buf[0];
    const b = buf[1];
    if (a === undefined || b === undefined) {
        throw new Error('crypto.getRandomValues failed');
    }
    // 21 high bits + 32 low bits = 53 (JS Number safe-integer width).
    const n = (a >>> 11) * UINT32_RANGE + b;
    return n / UNIT_INTERVAL_DENOM;
}

/**
 * Deterministic unit-interval PRNG (mulberry32). Only for test-seeded
 * shuffles (`RoundConfig.shuffleSeed` under `NODE_ENV=test`).
 */
export function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
    };
}

/** Fisher–Yates with a caller-supplied unit-interval RNG. */
export function shuffleInPlace<T>(arr: T[], rand: () => number): void {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j]!;
        arr[j] = tmp!;
    }
}

/** Fisher–Yates using {@link cryptoUnitInterval}. */
export function shuffleInPlaceCrypto<T>(arr: T[]): void {
    shuffleInPlace(arr, cryptoUnitInterval);
}

// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ValidationError } from '../methods/errors';

/**
 * Constant-product AMM helpers (atom units, bigint floor/ceil).
 *
 * Exact-in:  amountOut = amountIn * reserveOut / (reserveIn + amountIn)
 * Exact-out: amountIn  = ceil(amountOut * reserveIn / (reserveOut - amountOut))
 *
 * Maker / platform fees are applied outside these helpers (see SPEC.md).
 */

const assertPositiveAtoms = (value: bigint, label: string): void => {
    if (value <= 0n) {
        throw new ValidationError(`${label} must be positive (got ${value})`);
    }
};

const assertNonNegativeAtoms = (value: bigint, label: string): void => {
    if (value < 0n) {
        throw new ValidationError(
            `${label} must be non-negative (got ${value})`,
        );
    }
};

/** Ceil division for positive bigints: ceil(num / den). */
export const ceilDiv = (num: bigint, den: bigint): bigint => {
    if (den <= 0n) {
        throw new ValidationError(
            `ceilDiv denominator must be positive (got ${den})`,
        );
    }
    if (num < 0n) {
        throw new ValidationError(
            `ceilDiv numerator must be non-negative (got ${num})`,
        );
    }
    return (num + den - 1n) / den;
};

/**
 * Exact-in CP output atoms (floor division).
 */
export const cpExactInAmountOut = (
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
): bigint => {
    assertPositiveAtoms(amountIn, 'amountIn');
    assertNonNegativeAtoms(reserveIn, 'reserveIn');
    assertNonNegativeAtoms(reserveOut, 'reserveOut');
    if (reserveIn === 0n || reserveOut === 0n) {
        throw new ValidationError('CP reserves must be positive for exact-in');
    }
    return (amountIn * reserveOut) / (reserveIn + amountIn);
};

/**
 * Exact-out CP input atoms (ceil division).
 * `amountOut` must be strictly less than `reserveOut`.
 */
export const cpExactOutAmountIn = (
    amountOut: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
): bigint => {
    assertPositiveAtoms(amountOut, 'amountOut');
    assertNonNegativeAtoms(reserveIn, 'reserveIn');
    assertNonNegativeAtoms(reserveOut, 'reserveOut');
    if (reserveIn === 0n || reserveOut === 0n) {
        throw new ValidationError('CP reserves must be positive for exact-out');
    }
    if (amountOut >= reserveOut) {
        throw new ValidationError(
            `amountOut ${amountOut} must be less than reserveOut ${reserveOut}`,
        );
    }
    return ceilDiv(amountOut * reserveIn, reserveOut - amountOut);
};

/**
 * Maker fee atoms on top of a price-leg input (`feePct` in `[0, 1]`).
 * Uses a 1e9 fixed-point scale derived from the config number.
 */
export const makerFeeAtoms = (
    priceLegAtoms: bigint,
    feePct: number,
): bigint => {
    assertNonNegativeAtoms(priceLegAtoms, 'priceLegAtoms');
    if (!Number.isFinite(feePct) || feePct < 0 || feePct > 1) {
        throw new ValidationError(`feePct must be in [0, 1] (got ${feePct})`);
    }
    if (feePct === 0 || priceLegAtoms === 0n) {
        return 0n;
    }
    const scale = 1_000_000_000;
    const feeScaled = BigInt(Math.round(feePct * scale));
    return (priceLegAtoms * feeScaled) / BigInt(scale);
};

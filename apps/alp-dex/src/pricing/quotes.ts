// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ValidationError } from '../methods/errors';

import { assertDecimals, atomsToDecimalizedQty } from '../methods/atoms';
import { cpExactInAmountOut, cpExactOutAmountIn, makerFeeAtoms } from './cp';
import type { PairReserves } from './reserves';

export type ExactInQuote = {
    amountIn: bigint;
    amountOut: bigint;
    makerFee: bigint;
    /** Total `fromToken` atoms the taker spends (price leg + maker fee). */
    totalFromAtoms: bigint;
    reserveIn: bigint;
    reserveOut: bigint;
};

export type ExactOutQuote = {
    amountOut: bigint;
    amountIn: bigint;
    makerFee: bigint;
    totalFromAtoms: bigint;
    reserveIn: bigint;
    reserveOut: bigint;
};

/**
 * Spot price in human `toToken` units per 1 whole `fromToken` unit
 * (floored via bigint), using genesis decimals.
 */
export const spotToPerWholeFrom = (
    reserveFrom: bigint,
    reserveTo: bigint,
    decimalsFrom: number,
    decimalsTo: number,
): string => {
    assertDecimals(decimalsFrom);
    assertDecimals(decimalsTo);
    if (reserveFrom <= 0n) {
        throw new ValidationError(
            `spot requires positive from-reserve (got ${reserveFrom})`,
        );
    }
    if (reserveTo < 0n) {
        throw new ValidationError(
            `spot requires non-negative to-reserve (got ${reserveTo})`,
        );
    }
    const atomsToPerWholeFrom =
        (reserveTo * 10n ** BigInt(decimalsFrom)) / reserveFrom;
    return atomsToDecimalizedQty(atomsToPerWholeFrom, decimalsTo);
};

export type PairSpots = {
    spotAtoB: string;
    spotBtoA: string;
};

/**
 * Both directed spot prices for an undirected pair, or `n/a` / `n/a` when
 * either reserve is empty. Both sides come from the same reserve ratio
 * (B/A is the reciprocal direction of A/B).
 */
export const pairSpotPrices = (
    reserveA: bigint,
    reserveB: bigint,
    decimalsA: number,
    decimalsB: number,
): PairSpots => {
    if (reserveA === 0n || reserveB === 0n) {
        return { spotAtoB: 'n/a', spotBtoA: 'n/a' };
    }
    return {
        spotAtoB: spotToPerWholeFrom(reserveA, reserveB, decimalsA, decimalsB),
        spotBtoA: spotToPerWholeFrom(reserveB, reserveA, decimalsB, decimalsA),
    };
};

/**
 * Exact-in quote: `amountIn` is the CP price-leg input; maker fee is on top.
 */
export const quoteExactIn = (
    amountIn: bigint,
    reserves: PairReserves,
    feePct: number,
): ExactInQuote => {
    const amountOut = cpExactInAmountOut(
        amountIn,
        reserves.reserveIn,
        reserves.reserveOut,
    );
    const makerFee = makerFeeAtoms(amountIn, feePct);
    return {
        amountIn,
        amountOut,
        makerFee,
        totalFromAtoms: amountIn + makerFee,
        reserveIn: reserves.reserveIn,
        reserveOut: reserves.reserveOut,
    };
};

/**
 * Exact-out quote: required CP price-leg input for `amountOut`, plus maker fee.
 */
export const quoteExactOut = (
    amountOut: bigint,
    reserves: PairReserves,
    feePct: number,
): ExactOutQuote => {
    const amountIn = cpExactOutAmountIn(
        amountOut,
        reserves.reserveIn,
        reserves.reserveOut,
    );
    const makerFee = makerFeeAtoms(amountIn, feePct);
    return {
        amountOut,
        amountIn,
        makerFee,
        totalFromAtoms: amountIn + makerFee,
        reserveIn: reserves.reserveIn,
        reserveOut: reserves.reserveOut,
    };
};

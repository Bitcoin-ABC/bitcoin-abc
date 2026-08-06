// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ValidationError } from '../methods/errors';

import {
    assertDecimals,
    atomsToDecimalizedQty,
    decimalizedQtyToAtoms,
} from '../methods/atoms';
import { quoteExactIn, quoteExactOut, spotToPerWholeFrom } from './quotes';
import type { PairReserves } from './reserves';

/** Mid-tx output the taker must include (buyer receive has no script). */
export type SwapOutput = {
    tokenId: string;
    atoms: string;
    script?: string;
};

export type QuoteTemplate = {
    /** Price-leg `fromToken` human qty. */
    price: string;
    /** Maker fee `fromToken` human qty. */
    fee: string;
    /**
     * Effective rate for this size: human `toToken` per 1 whole `fromToken`
     * (decimal string; genesis decimals, same as `spotToPerWholeFrom`).
     */
    rate: string;
    /** Spot rate before size impact (same units / encoding as `rate`). */
    spotRate: string;
    /**
     * Approximate size impact vs spot, as a percent.
     * Discovery UX only — settle validates atoms, not this float.
     */
    priceImpactPct: number;
    feePct: number;
    /** Always 0 until coordinator opt-in. */
    platformFee: string;
    platformFeePct: number;
    platformFeeAddress: string | null;
    outputs: SwapOutput[];
    slushScript: string;
};

const FEE_SCALE = 1_000_000_000n;

/**
 * Effective human rate (to per 1 whole from) for a filled size, via bigint
 * floor division — same encoding as `spotToPerWholeFrom`.
 */
export const effectiveRateToPerWholeFrom = (
    amountInAtoms: bigint,
    amountOutAtoms: bigint,
    decimalsFrom: number,
    decimalsTo: number,
): string => {
    assertDecimals(decimalsFrom);
    assertDecimals(decimalsTo);
    if (amountInAtoms <= 0n) {
        throw new ValidationError(
            `effective rate requires positive amountIn (got ${amountInAtoms})`,
        );
    }
    if (amountOutAtoms < 0n) {
        throw new ValidationError(
            `effective rate requires non-negative amountOut (got ${amountOutAtoms})`,
        );
    }
    const atomsToPerWholeFrom =
        (amountOutAtoms * 10n ** BigInt(decimalsFrom)) / amountInAtoms;
    return atomsToDecimalizedQty(atomsToPerWholeFrom, decimalsTo);
};

/**
 * Percent impact of effective vs spot for discovery UX.
 * Not used in settle validation.
 */
export const priceImpactPct = (
    spotRate: string,
    effectiveRate: string,
): number => {
    const spot = Number(spotRate);
    const effective = Number(effectiveRate);
    if (!Number.isFinite(spot) || !Number.isFinite(effective) || spot === 0) {
        return 0;
    }
    return ((spot - effective) / spot) * 100;
};

/**
 * Split a total exact-in `fromToken` atom payment into price-leg + maker fee
 * (fee on top of the leg).
 *
 * Price leg is floored from `total / (1 + feePct)`. Any leftover atoms from
 * that floor (and from a floored `makerFeeAtoms` that would undershoot) go to
 * the fee out so `priceLegAtoms + feeAtoms === totalFromAtoms` always.
 */
export const splitExactInTotalAtoms = (
    totalFromAtoms: bigint,
    feePct: number,
): { priceLegAtoms: bigint; feeAtoms: bigint } => {
    if (totalFromAtoms <= 0n) {
        throw new ValidationError(
            `totalFromAtoms must be positive (got ${totalFromAtoms})`,
        );
    }
    if (!Number.isFinite(feePct) || feePct < 0 || feePct >= 1) {
        throw new ValidationError(`feePct must be in [0, 1) (got ${feePct})`);
    }
    if (feePct === 0) {
        return { priceLegAtoms: totalFromAtoms, feeAtoms: 0n };
    }
    const feeScaled = BigInt(Math.round(feePct * Number(FEE_SCALE)));
    const priceLegAtoms =
        (totalFromAtoms * FEE_SCALE) / (FEE_SCALE + feeScaled);
    if (priceLegAtoms <= 0n) {
        throw new ValidationError(
            `exact-in total ${totalFromAtoms} too small for feePct ${feePct}`,
        );
    }
    return {
        priceLegAtoms,
        feeAtoms: totalFromAtoms - priceLegAtoms,
    };
};

/**
 * Build settleable mid-tx outs (SPEC.md output schema, no platform fee yet).
 */
export const buildSwapOutputs = (
    fromTokenId: string,
    toTokenId: string,
    priceLegAtoms: bigint,
    feeAtoms: bigint,
    toTokenAtomsOut: bigint,
    slushScriptHex: string,
    feeScriptHex: string,
): SwapOutput[] => {
    const outputs: SwapOutput[] = [
        {
            tokenId: fromTokenId,
            atoms: priceLegAtoms.toString(),
            script: slushScriptHex,
        },
    ];
    if (feeAtoms > 0n) {
        outputs.push({
            tokenId: fromTokenId,
            script: feeScriptHex,
            atoms: feeAtoms.toString(),
        });
    }
    outputs.push({
        tokenId: toTokenId,
        atoms: toTokenAtomsOut.toString(),
    });
    return outputs;
};

const templateBody = (
    priceLegAtoms: bigint,
    feeAtoms: bigint,
    toTokenAtomsOut: bigint,
    reserves: PairReserves,
    feePct: number,
    decimalsFrom: number,
    decimalsTo: number,
    fromTokenId: string,
    toTokenId: string,
    slushScriptHex: string,
    feeScriptHex: string,
): QuoteTemplate => {
    const spotRate = spotToPerWholeFrom(
        reserves.reserveIn,
        reserves.reserveOut,
        decimalsFrom,
        decimalsTo,
    );
    const rate = effectiveRateToPerWholeFrom(
        priceLegAtoms,
        toTokenAtomsOut,
        decimalsFrom,
        decimalsTo,
    );
    return {
        price: atomsToDecimalizedQty(priceLegAtoms, decimalsFrom),
        fee: atomsToDecimalizedQty(feeAtoms, decimalsFrom),
        rate,
        spotRate,
        priceImpactPct: priceImpactPct(spotRate, rate),
        feePct,
        platformFee: '0',
        platformFeePct: 0,
        platformFeeAddress: null,
        outputs: buildSwapOutputs(
            fromTokenId,
            toTokenId,
            priceLegAtoms,
            feeAtoms,
            toTokenAtomsOut,
            slushScriptHex,
            feeScriptHex,
        ),
        slushScript: slushScriptHex,
    };
};

/**
 * Exact-in template: `qty` is total `fromToken` the taker pays (price + fee).
 */
export const exactInTemplate = (
    qty: string,
    reserves: PairReserves,
    feePct: number,
    decimalsFrom: number,
    decimalsTo: number,
    fromTokenId: string,
    toTokenId: string,
    slushScriptHex: string,
    feeScriptHex: string,
): QuoteTemplate => {
    const totalFromAtoms = decimalizedQtyToAtoms(qty, decimalsFrom);
    if (totalFromAtoms <= 0n) {
        throw new ValidationError('qty must be a positive number');
    }
    const { priceLegAtoms, feeAtoms } = splitExactInTotalAtoms(
        totalFromAtoms,
        feePct,
    );
    const quote = quoteExactIn(priceLegAtoms, reserves, feePct);
    return templateBody(
        priceLegAtoms,
        feeAtoms,
        quote.amountOut,
        reserves,
        feePct,
        decimalsFrom,
        decimalsTo,
        fromTokenId,
        toTokenId,
        slushScriptHex,
        feeScriptHex,
    );
};

/**
 * Exact-out template: `qty` is `toToken` the taker wants to receive.
 * Maker fee is on top of the CP price-leg input.
 */
export const exactOutTemplate = (
    qty: string,
    reserves: PairReserves,
    feePct: number,
    decimalsFrom: number,
    decimalsTo: number,
    fromTokenId: string,
    toTokenId: string,
    slushScriptHex: string,
    feeScriptHex: string,
): QuoteTemplate => {
    const toAtoms = decimalizedQtyToAtoms(qty, decimalsTo);
    if (toAtoms <= 0n) {
        throw new ValidationError('qty must be a positive number');
    }
    const quote = quoteExactOut(toAtoms, reserves, feePct);
    return templateBody(
        quote.amountIn,
        quote.makerFee,
        toAtoms,
        reserves,
        feePct,
        decimalsFrom,
        decimalsTo,
        fromTokenId,
        toTokenId,
        slushScriptHex,
        feeScriptHex,
    );
};

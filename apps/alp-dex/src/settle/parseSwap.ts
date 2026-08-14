// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    Address,
    DEFAULT_DUST_SATS,
    SEND_STR,
    Tx,
    parseAlp,
    parseEmppScript,
} from 'ecash-lib';
import { SETTLE_BAND_BPS } from '../constants';
import { ValidationError } from '../methods/errors';
import { makerFeeAtoms } from '../pricing/cp';
import { splitExactInTotalAtoms } from '../pricing/templates';

export type ParsedPartiallySignedSwap = {
    outputs: Array<{
        tokenId: string;
        atoms: bigint;
        script: string;
    }>;
    fromTokenId: string;
    toTokenId: string;
    /** Maker (LP) fee atoms in from-token */
    feeInFromAtoms: bigint;
    /** Aggregator platform fee atoms in from-token (0 when absent) */
    platformFeeInFromAtoms: bigint;
    atomsFrom: bigint;
    atomsTo: bigint;
    /**
     * Atom ratio on the price leg: Number(atomsTo) / Number(priceLeg).
     * Prefer {@link ValidationConfig.expectedToAtoms} for band checks.
     */
    effectiveRate: number;
};

export type ValidationConfig = {
    slushScriptHex: string;
    feeScriptHex: string;
    sellerScriptHex: string;
    /**
     * Legacy rate band (±1%). Ignored when {@link expectedToAtoms} is set.
     */
    currentRate: number;
    /**
     * Preferred CP band: validate `atomsTo` against this expected amount (±
     * {@link SETTLE_BAND_BPS}).
     */
    expectedToAtoms?: bigint;
    /** When set with platformFeePct > 0, require a matching platform-fee output */
    platformFeeScriptHex?: string | null;
    platformFeePct?: number;
    /** Expected platform fee atoms; required when platformFeePct > 0 */
    expectedPlatformFeeAtoms?: bigint;
    /**
     * Configured pair maker fee. When set, maker fee outs must match
     * {@link assertMakerFeeAtoms} against this pct (0 means no maker fee out).
     */
    makerFeePct?: number;
};

export type ParseSwapOptions = {
    /** When set, a mid fromToken output paying this script is the platform fee */
    platformFeeScriptHex?: string | null;
};

/**
 * Extract the taker address from the buyer output of a parsed swap.
 */
export const extractUserAddress = (
    parsedSwap: ParsedPartiallySignedSwap,
): string => {
    try {
        const buyerOutput = parsedSwap.outputs.find(
            output => output.tokenId === parsedSwap.toTokenId,
        );
        if (buyerOutput !== undefined) {
            return Address.fromScriptHex(buyerOutput.script).toString();
        }
    } catch (addrError) {
        console.error('Failed to extract user address:', addrError);
    }
    return 'Unknown';
};

/**
 * True when fee atoms match exact-out `makerFeeAtoms` or exact-in
 * `splitExactInTotalAtoms` leftover-to-fee policy for this price leg.
 *
 * Exact-in templates set `feeAtoms = total - priceLeg`, which can be
 * `makerFeeAtoms(priceLeg) + 1` (floor leftover) or `>= 1` when the floored
 * maker fee on the price leg is 0.
 */
export const assertMakerFeeAtoms = (
    priceLegAtoms: bigint,
    feeAtoms: bigint,
    feePct: number,
): void => {
    if (feePct === 0) {
        if (feeAtoms !== 0n) {
            throw new ValidationError(
                'Unexpected maker fee when pair feePct is 0',
            );
        }
        return;
    }
    if (feeAtoms <= 0n) {
        throw new ValidationError(
            'Maker fee output required when pair feePct > 0',
        );
    }
    const expected = makerFeeAtoms(priceLegAtoms, feePct);
    if (feeAtoms === expected) {
        return;
    }
    // Exact-in leftover-to-fee: reconstruct total and re-split.
    try {
        const total = priceLegAtoms + feeAtoms;
        const split = splitExactInTotalAtoms(total, feePct);
        if (
            split.priceLegAtoms === priceLegAtoms &&
            split.feeAtoms === feeAtoms
        ) {
            return;
        }
    } catch {
        // fall through
    }
    throw new ValidationError(
        `Maker fee atoms mismatch: got ${feeAtoms}, ` +
            `expected ${expected} (or exact-in leftover split for price leg ` +
            `${priceLegAtoms})`,
    );
};

/**
 * Parse a postage-ready ALP swap tx (EMPP/ALP sends) into mid-tx outs.
 *
 * @throws {ValidationError} if the tx cannot be parsed as a swap
 */
export const parsePartiallySignedSwap = (
    tx: Tx,
    options: ParseSwapOptions = {},
): ParsedPartiallySignedSwap => {
    if (tx.outputs.length < 3) {
        throw new ValidationError(
            `Invalid swap transaction: expected at least 3 outputs, got ${tx.outputs.length}`,
        );
    }

    let emppPushes;
    try {
        emppPushes = parseEmppScript(tx.outputs[0].script);
    } catch (error) {
        throw new ValidationError(
            `Failed to parse EMPP script: ${
                error instanceof Error ? error.message : String(error)
            }`,
        );
    }

    if (!emppPushes || emppPushes.length === 0) {
        throw new ValidationError('Invalid OP_RETURN: no EMPP pushes found');
    }

    const outputAtomsMap = new Map<number, bigint>();
    const outputTokenIdMap = new Map<number, string>();

    for (const push of emppPushes) {
        let alpResult;
        try {
            alpResult = parseAlp(push);
        } catch (error) {
            throw new ValidationError(
                `Invalid swap: malformed ALP EMPP push: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }
        if (alpResult === undefined) {
            // Non-ALP EMPP pushes are ignored.
            continue;
        }
        // GENESIS / MINT / BURN / UNKNOWN must not ride along on settle.
        if (alpResult.txType !== SEND_STR) {
            throw new ValidationError(
                `Invalid swap: only ALP SEND sections are allowed, got ${alpResult.txType}`,
            );
        }
        if (!alpResult.tokenId || !alpResult.sendAtomsArray) {
            throw new ValidationError(
                'Invalid swap: ALP SEND section missing tokenId or amounts',
            );
        }
        for (
            let arrayIdx = 0;
            arrayIdx < alpResult.sendAtomsArray.length;
            arrayIdx++
        ) {
            const atoms = alpResult.sendAtomsArray[arrayIdx];
            if (atoms && atoms > 0n) {
                const outIdx = arrayIdx + 1;
                if (outIdx >= tx.outputs.length) {
                    throw new ValidationError(
                        `Invalid swap: ALP send amount at index ${arrayIdx} has no matching output`,
                    );
                }
                if (outputAtomsMap.has(outIdx)) {
                    throw new ValidationError(
                        `Invalid swap: overlapping ALP amounts for output ${outIdx}`,
                    );
                }
                outputAtomsMap.set(outIdx, atoms);
                outputTokenIdMap.set(outIdx, alpResult.tokenId);
            }
        }
    }

    // Token outs must be dust; OP_RETURN must be 0. Inflated sats would make
    // addFuelAndSign fund the gap from LP postage into taker-controlled outs.
    if (tx.outputs[0].sats !== 0n) {
        throw new ValidationError(
            `Invalid swap: OP_RETURN must have 0 sats, got ${tx.outputs[0].sats}`,
        );
    }
    for (let outIdx = 1; outIdx < tx.outputs.length; outIdx++) {
        const atoms = outputAtomsMap.get(outIdx) || 0n;
        const sats = tx.outputs[outIdx].sats;
        if (atoms > 0n) {
            if (sats !== DEFAULT_DUST_SATS) {
                throw new ValidationError(
                    `Invalid swap: token output ${outIdx} must be dust ` +
                        `(${DEFAULT_DUST_SATS} sats), got ${sats}`,
                );
            }
        } else if (sats !== 0n) {
            throw new ValidationError(
                `Invalid swap: non-token output ${outIdx} must have 0 sats, got ${sats}`,
            );
        }
    }

    let fromTokenId: string | undefined;
    let toTokenId: string | undefined;

    for (let outIdx = 1; outIdx < tx.outputs.length; outIdx++) {
        const tokenId = outputTokenIdMap.get(outIdx);
        if (tokenId !== undefined && fromTokenId === undefined) {
            fromTokenId = tokenId;
            break;
        }
    }

    for (let outIdx = 1; outIdx < tx.outputs.length; outIdx++) {
        const tokenId = outputTokenIdMap.get(outIdx);
        if (
            tokenId !== undefined &&
            tokenId !== fromTokenId &&
            toTokenId === undefined
        ) {
            toTokenId = tokenId;
            break;
        }
    }

    if (fromTokenId === undefined) {
        throw new ValidationError(
            'Invalid swap: could not determine fromToken',
        );
    }
    if (toTokenId === undefined) {
        throw new ValidationError('Invalid swap: could not determine toToken');
    }

    for (const [outIdx, tokenId] of outputTokenIdMap) {
        const atoms = outputAtomsMap.get(outIdx) || 0n;
        if (atoms > 0n && tokenId !== fromTokenId && tokenId !== toTokenId) {
            throw new ValidationError(
                `Invalid swap: unexpected token ${tokenId} at output ${outIdx}`,
            );
        }
    }

    let atomsTokenSoldToSlush = 0n;
    let atomsTokenSoldToSlushIdx = 0;
    let atomsTokenBoughtToBuyer = 0n;
    let atomsTokenBoughtToBuyerIdx = 0;
    const midFromFeeOuts: Array<{
        idx: number;
        atoms: bigint;
        script: string;
    }> = [];

    for (let outIdx = 1; outIdx < tx.outputs.length; outIdx++) {
        const tokenId = outputTokenIdMap.get(outIdx);
        const atoms = outputAtomsMap.get(outIdx) || 0n;

        if (tokenId === fromTokenId && atoms > 0n) {
            if (atomsTokenSoldToSlush === 0n) {
                atomsTokenSoldToSlush = atoms;
                atomsTokenSoldToSlushIdx = outIdx;
            } else if (atomsTokenBoughtToBuyer === 0n) {
                midFromFeeOuts.push({
                    idx: outIdx,
                    atoms,
                    script: tx.outputs[outIdx].script.toHex(),
                });
            }
        } else if (tokenId === toTokenId && atoms > 0n) {
            if (atomsTokenBoughtToBuyer === 0n) {
                atomsTokenBoughtToBuyer = atoms;
                atomsTokenBoughtToBuyerIdx = outIdx;
            }
        } else if (tokenId !== undefined && atoms > 0n) {
            throw new ValidationError(
                `Invalid swap: unexpected token ${tokenId} at output ${outIdx}`,
            );
        }
    }

    if (atomsTokenSoldToSlush === 0n) {
        throw new ValidationError(
            'Invalid swap: no tokens sold to slush (first fromToken output is zero)',
        );
    }
    if (atomsTokenBoughtToBuyer === 0n) {
        throw new ValidationError(
            'Invalid swap: no tokens bought by buyer (first toToken output is zero)',
        );
    }

    const platformScript = options.platformFeeScriptHex ?? null;
    let atomsTokenSoldToFee = 0n;
    let atomsTokenSoldToFeeIdx = 0;
    let atomsPlatformFee = 0n;
    let atomsPlatformFeeIdx = 0;

    for (const feeOut of midFromFeeOuts) {
        if (platformScript && feeOut.script === platformScript) {
            if (atomsPlatformFee > 0n) {
                throw new ValidationError(
                    'Invalid swap: multiple platform fee outputs',
                );
            }
            atomsPlatformFee = feeOut.atoms;
            atomsPlatformFeeIdx = feeOut.idx;
        } else {
            if (atomsTokenSoldToFee > 0n) {
                throw new ValidationError(
                    'Invalid swap: multiple maker fee outputs',
                );
            }
            atomsTokenSoldToFee = feeOut.atoms;
            atomsTokenSoldToFeeIdx = feeOut.idx;
        }
    }

    const atomsFrom =
        atomsTokenSoldToSlush + atomsTokenSoldToFee + atomsPlatformFee;
    const effectiveRate =
        Number(atomsTokenBoughtToBuyer) / Number(atomsTokenSoldToSlush);

    const outputs: Array<{ tokenId: string; atoms: bigint; script: string }> =
        [];

    outputs.push({
        tokenId: fromTokenId,
        atoms: atomsTokenSoldToSlush,
        script: tx.outputs[atomsTokenSoldToSlushIdx].script.toHex(),
    });

    if (atomsTokenSoldToFee > 0n && atomsTokenSoldToFeeIdx > 0) {
        outputs.push({
            tokenId: fromTokenId,
            atoms: atomsTokenSoldToFee,
            script: tx.outputs[atomsTokenSoldToFeeIdx].script.toHex(),
        });
    }

    if (atomsPlatformFee > 0n && atomsPlatformFeeIdx > 0) {
        outputs.push({
            tokenId: fromTokenId,
            atoms: atomsPlatformFee,
            script: tx.outputs[atomsPlatformFeeIdx].script.toHex(),
        });
    }

    outputs.push({
        tokenId: toTokenId,
        atoms: atomsTokenBoughtToBuyer,
        script: tx.outputs[atomsTokenBoughtToBuyerIdx].script.toHex(),
    });

    for (
        let outIdx = atomsTokenBoughtToBuyerIdx + 1;
        outIdx < tx.outputs.length;
        outIdx++
    ) {
        const tokenId = outputTokenIdMap.get(outIdx);
        const atoms = outputAtomsMap.get(outIdx) || 0n;
        if (!tokenId || atoms === 0n) {
            continue;
        }
        outputs.push({
            tokenId,
            atoms,
            script: tx.outputs[outIdx].script.toHex(),
        });
    }

    return {
        outputs,
        fromTokenId,
        toTokenId,
        feeInFromAtoms: atomsTokenSoldToFee,
        platformFeeInFromAtoms: atomsPlatformFee,
        atomsFrom,
        atomsTo: atomsTokenBoughtToBuyer,
        effectiveRate,
    };
};

/**
 * Validate parsed swap schema, maker/platform fees, and CP / rate band.
 *
 * @throws {ValidationError} on any validation failure
 */
export const validatePartiallySignedTx = (
    parsedSwap: ParsedPartiallySignedSwap,
    config: ValidationConfig,
): void => {
    const hasMakerFee = parsedSwap.feeInFromAtoms > 0n;
    const makerFeeConfigured = config.makerFeePct !== undefined;
    const platformEnabled =
        (config.platformFeePct ?? 0) > 0 &&
        Boolean(config.platformFeeScriptHex) &&
        config.expectedPlatformFeeAtoms !== undefined;
    const hasPlatformFee = parsedSwap.platformFeeInFromAtoms > 0n;

    if (config.expectedToAtoms !== undefined) {
        const expected = config.expectedToAtoms;
        if (expected <= 0n) {
            throw new ValidationError('expectedToAtoms must be positive');
        }
        const bps = 10_000n;
        const lower = (expected * (bps - SETTLE_BAND_BPS)) / bps;
        const upper = (expected * (bps + SETTLE_BAND_BPS) + (bps - 1n)) / bps;
        if (parsedSwap.atomsTo < lower || parsedSwap.atomsTo > upper) {
            throw new ValidationError(
                `atomsTo ${parsedSwap.atomsTo} outside ±${SETTLE_BAND_BPS} bps of ` +
                    `expectedToAtoms ${expected} (bounds ${lower}-${upper})`,
            );
        }
    } else {
        const expectedRate = config.currentRate;
        const rateLowerBound = expectedRate * 0.99;
        const rateUpperBound = expectedRate * 1.01;
        if (
            parsedSwap.effectiveRate < rateLowerBound ||
            parsedSwap.effectiveRate > rateUpperBound
        ) {
            throw new ValidationError(
                `effectiveRate ${parsedSwap.effectiveRate} outside ±1% of ` +
                    `expected ${expectedRate}`,
            );
        }
    }

    const feeOutputCount = (hasMakerFee ? 1 : 0) + (hasPlatformFee ? 1 : 0);
    const minOutputs = 2 + feeOutputCount;
    const maxOutputs = minOutputs + 2;
    if (
        parsedSwap.outputs.length < minOutputs ||
        parsedSwap.outputs.length > maxOutputs
    ) {
        throw new ValidationError(
            `Expected ${minOutputs}-${maxOutputs} mid-tx outputs, got ${parsedSwap.outputs.length}`,
        );
    }

    const reservedScripts = new Set([
        config.slushScriptHex,
        config.sellerScriptHex,
        config.feeScriptHex,
    ]);
    if (config.platformFeeScriptHex) {
        reservedScripts.add(config.platformFeeScriptHex);
    }

    const txOutput1 = parsedSwap.outputs[0];
    if (
        txOutput1.tokenId !== parsedSwap.fromTokenId ||
        txOutput1.script !== config.slushScriptHex
    ) {
        throw new ValidationError(
            'Output 0 must be fromToken price leg to slush',
        );
    }

    let nextIdx = 1;

    if (makerFeeConfigured) {
        const feePct = config.makerFeePct ?? 0;
        try {
            assertMakerFeeAtoms(
                txOutput1.atoms,
                parsedSwap.feeInFromAtoms,
                feePct,
            );
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new ValidationError(
                error instanceof Error ? error.message : String(error),
            );
        }
        if (feePct === 0) {
            if (hasMakerFee) {
                throw new ValidationError(
                    'Unexpected maker fee when pair feePct is 0',
                );
            }
        } else {
            if (!hasMakerFee) {
                throw new ValidationError(
                    'Maker fee output required but missing',
                );
            }
            const txMakerFee = parsedSwap.outputs[nextIdx];
            if (
                !txMakerFee ||
                txMakerFee.tokenId !== parsedSwap.fromTokenId ||
                txMakerFee.script !== config.feeScriptHex ||
                txMakerFee.atoms !== parsedSwap.feeInFromAtoms
            ) {
                throw new ValidationError(
                    'Maker fee output missing or invalid (wrong script/token/atoms)',
                );
            }
            nextIdx += 1;
        }
    } else if (hasMakerFee) {
        const txMakerFee = parsedSwap.outputs[nextIdx];
        if (
            !txMakerFee ||
            txMakerFee.tokenId !== parsedSwap.fromTokenId ||
            txMakerFee.script !== config.feeScriptHex ||
            txMakerFee.atoms !== parsedSwap.feeInFromAtoms
        ) {
            throw new ValidationError(
                'Maker fee output missing or invalid (wrong script/token/atoms)',
            );
        }
        nextIdx += 1;
    }

    if (platformEnabled) {
        if (!hasPlatformFee) {
            throw new ValidationError(
                'Platform fee output required but missing',
            );
        }
        const txPlatformFee = parsedSwap.outputs[nextIdx];
        if (
            !txPlatformFee ||
            txPlatformFee.tokenId !== parsedSwap.fromTokenId ||
            txPlatformFee.script !== config.platformFeeScriptHex ||
            txPlatformFee.atoms !== parsedSwap.platformFeeInFromAtoms
        ) {
            throw new ValidationError('Platform fee output missing or invalid');
        }
        if (txPlatformFee.atoms !== config.expectedPlatformFeeAtoms) {
            throw new ValidationError(
                `Platform fee amount mismatch: got ${txPlatformFee.atoms}, ` +
                    `expected ${config.expectedPlatformFeeAtoms}`,
            );
        }
        nextIdx += 1;
    } else if (hasPlatformFee) {
        throw new ValidationError(
            'Unexpected platform fee output when platform fee is disabled',
        );
    }

    const txBuyerOutput = parsedSwap.outputs[nextIdx];
    if (!txBuyerOutput || txBuyerOutput.tokenId !== parsedSwap.toTokenId) {
        throw new ValidationError('Buyer output must be toToken');
    }
    if (reservedScripts.has(txBuyerOutput.script)) {
        throw new ValidationError(
            'Buyer output must not pay slush, seller, fee, or platform fee',
        );
    }

    const requiredOutputs = nextIdx + 1;
    const toTokenChangeIndex = requiredOutputs;
    const fromTokenChangeIndex = requiredOutputs + 1;

    if (parsedSwap.outputs.length === requiredOutputs) {
        return;
    }

    if (parsedSwap.outputs.length === requiredOutputs + 1) {
        const optionalOutput = parsedSwap.outputs[requiredOutputs];
        if (
            optionalOutput.tokenId === parsedSwap.toTokenId &&
            optionalOutput.script === config.slushScriptHex
        ) {
            return;
        }
        if (
            optionalOutput.tokenId === parsedSwap.fromTokenId &&
            !reservedScripts.has(optionalOutput.script)
        ) {
            return;
        }
        throw new ValidationError(
            'Optional output does not match expected change pattern',
        );
    }

    if (parsedSwap.outputs.length === requiredOutputs + 2) {
        const optionalToChangeToSlush = parsedSwap.outputs[toTokenChangeIndex];
        const optionalFromChangeToBuyer =
            parsedSwap.outputs[fromTokenChangeIndex];

        if (
            optionalToChangeToSlush.tokenId !== parsedSwap.toTokenId ||
            optionalToChangeToSlush.script !== config.slushScriptHex
        ) {
            throw new ValidationError('Optional toToken change must pay slush');
        }

        if (optionalFromChangeToBuyer.tokenId !== parsedSwap.fromTokenId) {
            throw new ValidationError(
                'Optional fromToken change must be fromToken',
            );
        }
        if (reservedScripts.has(optionalFromChangeToBuyer.script)) {
            throw new ValidationError(
                'Optional fromToken change must not pay reserved scripts',
            );
        }
        return;
    }

    throw new ValidationError('Unexpected number of mid-tx outputs');
};

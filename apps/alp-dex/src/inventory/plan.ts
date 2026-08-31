// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ALP_POLICY_MAX_OUTPUTS } from 'ecash-lib';
import { POSTAGE_SATS } from '../constants';

/** Fund postage only when seller has fewer than this many stamps. */
export const POSTAGE_STAMP_TARGET = 1000;

/**
 * Max exact-size inventory UTXOs per slush→seller fund action.
 * `ALP_POLICY_MAX_OUTPUTS - 1` leaves room for token change so `build()`
 * stays a single SEND (29 recipient outs + change exceeds the ALP cap and
 * forces a chained token send).
 */
export const INVENTORY_FUND_BATCH = ALP_POLICY_MAX_OUTPUTS - 1;

/**
 * Max slush→seller fund txs per token per maintain pass. Remaining units
 * stay on slush (still pricing reserve) for the next scheduled pass so one
 * reshape cannot monopolize the settle queue.
 */
export const INVENTORY_FUND_MAX_BATCHES_PER_TOKEN = 8;

/**
 * Max seller UTXOs per misc→fee action. A 9006-input tx exceeds
 * `MAX_TX_SERSIZE`; wallet auto-consolidate then re-selects the original
 * `requiredUtxos` (now partly spent) and used to crash on `.sats`.
 */
export const MISC_SWEEP_BATCH = 400;

/** Fixed stamp count to create when under target and slush can fund it. */
export const POSTAGE_FUND_BATCH = 1000;

/**
 * Throws if `count` is not a safe integer or is negative.
 * Returns whether `count` is at least `min` (callers treat false as "no action").
 *
 * @param min - Inclusive lower bound. Defaults to `1` so zero returns false
 * instead of throwing. Pass `0` when zero should return true (e.g. remaining
 * inventory units).
 */
export const assertPositiveCountOrNone = (
    count: number,
    name: string,
    min: number = 1,
): boolean => {
    if (!Number.isSafeInteger(count)) {
        throw new Error(`${name} must be a safe integer (got ${count})`);
    }
    if (count < 0) {
        throw new Error(`${name} must not be negative (got ${count})`);
    }
    return count >= min;
};

/**
 * How many exact-size inventory UTXOs can be funded from `atoms`.
 * Leftover atoms stay on slush as change.
 */
export const inventoryUnitCount = (
    atoms: bigint,
    utxoAtoms: bigint,
): number => {
    if (utxoAtoms <= 0n) {
        throw new Error(`utxoAtoms must be positive (got ${utxoAtoms})`);
    }
    if (atoms < 0n) {
        throw new Error(`atoms must be non-negative (got ${atoms})`);
    }
    const quotient = atoms / utxoAtoms;
    if (quotient > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error(
            `inventoryUnitCount overflow: ${quotient} exceeds Number.MAX_SAFE_INTEGER`,
        );
    }
    return Number(quotient);
};

/**
 * How many inventory UTXOs to mint in the next fund action.
 * Caps at {@link INVENTORY_FUND_BATCH} so alp-dex does not ask
 * ecash-wallet to chain thousands of ALP outputs in one `build()`.
 */
export const inventoryFundBatchCount = (remainingUnits: number): number => {
    assertPositiveCountOrNone(remainingUnits, 'remainingUnits', 0);
    return Math.min(INVENTORY_FUND_BATCH, remainingUnits);
};

/**
 * Postage stamps to create this pass: a full {@link POSTAGE_FUND_BATCH} when
 * seller is under {@link POSTAGE_STAMP_TARGET} and slush XEC covers
 * `batch * postage` plus a crude fee headroom; otherwise 0.
 *
 * Wallet `build()` is authoritative for fees — this only avoids pointless
 * underfunded builds.
 */
export const postageFundBatchCount = (
    availableStamps: number,
    spendableSats: bigint,
    batch: number = POSTAGE_FUND_BATCH,
    target: number = POSTAGE_STAMP_TARGET,
    postageSats: bigint = POSTAGE_SATS,
): number => {
    if (!Number.isSafeInteger(availableStamps) || availableStamps < 0) {
        throw new Error(
            `availableStamps must be a non-negative safe integer (got ${availableStamps})`,
        );
    }
    if (!Number.isSafeInteger(batch) || batch <= 0) {
        throw new Error(`batch must be a positive safe integer (got ${batch})`);
    }
    if (!Number.isSafeInteger(target) || target < 0) {
        throw new Error(
            `target must be a non-negative safe integer (got ${target})`,
        );
    }
    if (spendableSats < 0n) {
        throw new Error(
            `spendableSats must be non-negative (got ${spendableSats})`,
        );
    }
    if (postageSats <= 0n) {
        throw new Error(`postageSats must be positive (got ${postageSats})`);
    }
    if (availableStamps >= target) {
        return 0;
    }
    // 1000 XEC (100_000 sats) headroom for a ~34 kB 1000-out P2PKH postage
    // tx — not exact.
    const feeHeadroomSats = 100_000n;
    const need = BigInt(batch) * postageSats + feeHeadroomSats;
    if (spendableSats < need) {
        return 0;
    }
    return batch;
};

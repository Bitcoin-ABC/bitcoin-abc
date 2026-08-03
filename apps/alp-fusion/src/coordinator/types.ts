// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type {
    FusionFuelInput,
    FusionTokenInput,
    FusionTokenOutput,
} from '../tx/types.js';

/** Player identity for an in-process round (not a network session). */
export type PlayerId = string;

/**
 * What one player brings to a one-shot round.
 * Token outs are shuffled with other players' outs before assemble.
 */
export interface PlayerContribution {
    playerId: PlayerId;
    tokenInputs: FusionTokenInput[];
    tokenOutputs: FusionTokenOutput[];
    /** Pure-XEC fuel (`atoms: 0n`). Optional if another player funds fees. */
    fuelInputs?: FusionFuelInput[];
}

export interface RoundConfig {
    tokenId: string;
    atomTier: bigint;
    /** Defaults to DEFAULT_FEE_SATS_PER_KB. */
    feePerKb?: bigint;
    /**
     * Deterministic Fisher–Yates seed for output shuffle. **Test-only**:
     * rejected unless `NODE_ENV=test`. Omit in production (crypto shuffle).
     */
    shuffleSeed?: number;
}

export type RoundPhase = 'collecting' | 'assembled' | 'failed';

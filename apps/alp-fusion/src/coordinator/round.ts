// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * One-shot in-process round: collect per-player contributions, shuffle token
 * outputs, assemble an unsigned fused ALP SEND via {@link assembleAlpSend}.
 *
 * Out of scope for this slice: network messages, blind auth, signing, broadcast,
 * covert/Tor, chained rounds.
 */
import { DEFAULT_FEE_SATS_PER_KB, toHexRev, type OutPoint } from 'ecash-lib';

import { assembleAlpSend, type AssembledAlpSend } from '../tx/assemble.js';
import type {
    FusionFuelInput,
    FusionTokenInput,
    FusionTokenOutput,
} from '../tx/types.js';

import { cryptoUnitInterval, mulberry32, shuffleInPlace } from './random.js';
import type {
    PlayerContribution,
    PlayerId,
    RoundConfig,
    RoundPhase,
} from './types.js';

/** Canonical key: BE hex txid + outIdx (matches assembleAlpSend). */
function outpointKey(prevOut: OutPoint): string {
    const txid =
        typeof prevOut.txid === 'string'
            ? prevOut.txid.toLowerCase()
            : toHexRev(prevOut.txid);
    return `${txid}:${prevOut.outIdx}`;
}

export class OneShotRound {
    readonly tokenId: string;
    readonly atomTier: bigint;
    readonly playerIds: readonly PlayerId[];
    readonly feePerKb: bigint;

    private readonly expected = new Set<PlayerId>();
    private readonly contributions = new Map<PlayerId, PlayerContribution>();
    private readonly shuffleSeed: number | undefined;
    private phase: RoundPhase = 'collecting';
    private assembled: AssembledAlpSend | undefined;
    private failure: string | undefined;

    constructor(config: RoundConfig, playerIds: PlayerId[]) {
        if (playerIds.length < 2) {
            throw new Error('OneShotRound needs at least 2 players');
        }
        const uniq = new Set(playerIds);
        if (uniq.size !== playerIds.length) {
            throw new Error('duplicate playerIds');
        }
        this.tokenId = config.tokenId;
        this.atomTier = config.atomTier;
        this.feePerKb = config.feePerKb ?? DEFAULT_FEE_SATS_PER_KB;
        if (
            config.shuffleSeed !== undefined &&
            process.env.NODE_ENV !== 'test'
        ) {
            throw new Error('shuffleSeed is only allowed when NODE_ENV=test');
        }
        this.shuffleSeed = config.shuffleSeed;
        this.playerIds = [...playerIds];
        for (const id of playerIds) {
            this.expected.add(id);
        }
    }

    getPhase(): RoundPhase {
        return this.phase;
    }

    getAssembled(): AssembledAlpSend | undefined {
        return this.assembled;
    }

    getFailure(): string | undefined {
        return this.failure;
    }

    /** Submit one player's inputs/outputs. Throws if wrong phase or duplicate. */
    submitContribution(contrib: PlayerContribution): void {
        if (this.phase !== 'collecting') {
            throw new Error(`cannot submit in phase ${this.phase}`);
        }
        if (!this.expected.has(contrib.playerId)) {
            throw new Error(`player ${contrib.playerId} is not in this round`);
        }
        if (this.contributions.has(contrib.playerId)) {
            throw new Error(`player ${contrib.playerId} already contributed`);
        }
        if (contrib.tokenInputs.length === 0) {
            throw new Error(
                `player ${contrib.playerId}: at least one token input required`,
            );
        }
        if (contrib.tokenOutputs.length === 0) {
            throw new Error(
                `player ${contrib.playerId}: at least one token output required`,
            );
        }
        for (const inp of contrib.tokenInputs) {
            if (inp.tokenId !== this.tokenId) {
                throw new Error(`player ${contrib.playerId}: tokenId mismatch`);
            }
        }
        this.contributions.set(contrib.playerId, contrib);
    }

    /** True when every expected player has contributed. */
    isFullyCollected(): boolean {
        return this.contributions.size === this.expected.size;
    }

    /**
     * Assemble the unsigned fused tx. Requires all contributions.
     * On policy/fee failure, phase becomes `failed` and the error is rethrown.
     */
    assemble(): AssembledAlpSend {
        if (this.phase === 'assembled' && this.assembled) {
            return this.assembled;
        }
        if (this.phase === 'failed') {
            throw new Error(this.failure ?? 'round failed');
        }
        if (!this.isFullyCollected()) {
            throw new Error(
                `missing contributions: ${this.contributions.size}/${this.expected.size}`,
            );
        }

        try {
            const tokenInputs: FusionTokenInput[] = [];
            const fuelInputs: FusionFuelInput[] = [];
            const tokenOutputs: FusionTokenOutput[] = [];
            const seenOutpoints = new Set<string>();

            for (const id of this.playerIds) {
                const c = this.contributions.get(id)!;
                for (const inp of [...c.tokenInputs, ...(c.fuelInputs ?? [])]) {
                    const key = outpointKey(inp.prevOut);
                    if (seenOutpoints.has(key)) {
                        throw new Error(
                            `duplicate input ${key} across contributions`,
                        );
                    }
                    seenOutpoints.add(key);
                }
                tokenInputs.push(...c.tokenInputs);
                tokenOutputs.push(...c.tokenOutputs);
                if (c.fuelInputs) {
                    fuelInputs.push(...c.fuelInputs);
                }
            }

            const rand =
                this.shuffleSeed === undefined
                    ? cryptoUnitInterval
                    : mulberry32(this.shuffleSeed);
            shuffleInPlace(tokenOutputs, rand);

            const assembled = assembleAlpSend({
                tokenId: this.tokenId,
                tokenInputs,
                fuelInputs,
                tokenOutputs,
                feePerKb: this.feePerKb,
            });
            this.assembled = assembled;
            this.phase = 'assembled';
            return assembled;
        } catch (e) {
            this.phase = 'failed';
            this.failure = e instanceof Error ? e.message : String(e);
            throw e;
        }
    }
}

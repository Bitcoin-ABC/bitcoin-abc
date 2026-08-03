// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * In-process one-shot helpers: {@link OneShotClient} registers and submits a
 * contribution for one player; {@link runOneShotRound} is the harness that
 * takes a ready pool, applies contributions, and returns the assembled
 * unsigned tx.
 *
 * No TCP/TLS, Chronik, or signing — those land in follow-up diffs.
 */
import type { AssembledAlpSend } from '../tx/assemble.js';
import { OneShotRound } from '../coordinator/round.js';
import { PoolMatcher, type ReadyPool } from '../coordinator/pool.js';
import type {
    PlayerContribution,
    PlayerId,
    RoundConfig,
} from '../coordinator/types.js';

export interface OneShotJoinResult {
    ready: ReadyPool;
    round: OneShotRound;
    assembled: AssembledAlpSend;
}

/**
 * Thin per-player facade over {@link PoolMatcher.register} and
 * {@link OneShotRound.submitContribution}. Does not wait for pool readiness
 * or assemble the tx — use {@link runOneShotRound} (or call those steps
 * yourself) for that.
 */
export class OneShotClient {
    constructor(
        readonly playerId: PlayerId,
        readonly matcher: PoolMatcher,
    ) {}

    register(tokenId: string, atomTier: bigint): { key: string; size: number } {
        return this.matcher.register({
            playerId: this.playerId,
            tokenId,
            atomTier,
        });
    }

    contribute(
        round: OneShotRound,
        contrib: Omit<PlayerContribution, 'playerId'>,
    ): void {
        round.submitContribution({ ...contrib, playerId: this.playerId });
    }
}

/**
 * Test/harness helper: after all players are registered, open a round, apply
 * contributions in `playerIds` order, assemble, return the result.
 * Requires exactly one contribution per ready player (no extras / duplicates).
 */
export function runOneShotRound(
    matcher: PoolMatcher,
    config: RoundConfig,
    contributions: PlayerContribution[],
): OneShotJoinResult {
    const ready = matcher.takeReady(config.tokenId, config.atomTier);
    const readySet = new Set(ready.playerIds);
    const byId = new Map<PlayerId, PlayerContribution>();
    for (const contribution of contributions) {
        if (!readySet.has(contribution.playerId)) {
            throw new Error(
                `unexpected contribution for player ${contribution.playerId}`,
            );
        }
        if (byId.has(contribution.playerId)) {
            throw new Error(
                `duplicate contribution for player ${contribution.playerId}`,
            );
        }
        byId.set(contribution.playerId, contribution);
    }
    for (const id of ready.playerIds) {
        if (!byId.has(id)) {
            throw new Error(`missing contribution for player ${id}`);
        }
    }
    const round = new OneShotRound(config, ready.playerIds);
    for (const id of ready.playerIds) {
        round.submitContribution(byId.get(id)!);
    }
    const assembled = round.assemble();
    return { ready, round, assembled };
}

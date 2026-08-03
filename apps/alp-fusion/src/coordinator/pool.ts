// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * In-process pool matcher: players register for a `(tokenId, atomTier)` key;
 * when `minPlayers` is reached the pool is ready to open a one-shot round.
 *
 * No network, Tor, or protobuf — correctness scaffolding for later wire work.
 */
import { DEFAULT_MIN_PLAYERS } from '../protocol/constants.js';
import { poolKey, tokenIdToBytes } from '../protocol/hash.js';

import { shuffleInPlaceCrypto } from './random.js';
import type { PlayerId } from './types.js';

export { DEFAULT_MIN_PLAYERS };

export interface PoolRegistration {
    playerId: PlayerId;
    /** 64-char hex token ID (Chronik / assembleAlpSend form). */
    tokenId: string;
    atomTier: bigint;
}

function keyFor(tokenId: string, atomTier: bigint): string {
    return poolKey(tokenIdToBytes(tokenId), atomTier);
}

export interface ReadyPool {
    key: string;
    tokenId: string;
    atomTier: bigint;
    playerIds: PlayerId[];
}

export class PoolMatcher {
    private readonly pools = new Map<string, PoolRegistration[]>();
    private readonly minPlayers: number;

    constructor(minPlayers = DEFAULT_MIN_PLAYERS) {
        if (!Number.isSafeInteger(minPlayers) || minPlayers < 2) {
            throw new Error('minPlayers must be an integer >= 2');
        }
        this.minPlayers = minPlayers;
    }

    /**
     * Register a player for a pool. Idempotent: if already registered for that
     * key, return the current size without growing the pool.
     */
    register(reg: PoolRegistration): { key: string; size: number } {
        if (!reg.playerId) {
            throw new Error('playerId is required');
        }
        const key = keyFor(reg.tokenId, reg.atomTier);
        const list = this.pools.get(key) ?? [];
        if (list.some(p => p.playerId === reg.playerId)) {
            return { key, size: list.length };
        }
        // Snapshot so callers cannot mutate playerId / pool fields after register.
        list.push({ ...reg });
        this.pools.set(key, list);
        return { key, size: list.length };
    }

    size(tokenId: string, atomTier: bigint): number {
        return this.pools.get(keyFor(tokenId, atomTier))?.length ?? 0;
    }

    /** True when at least minPlayers are waiting for this pool key. */
    isReady(tokenId: string, atomTier: bigint): boolean {
        return this.size(tokenId, atomTier) >= this.minPlayers;
    }

    /**
     * Shuffle waiters, take minPlayers into a round, leave the rest for later.
     * Shuffle so registration order does not dictate playerIds / input order.
     */
    takeReady(tokenId: string, atomTier: bigint): ReadyPool {
        const key = keyFor(tokenId, atomTier);
        const list = this.pools.get(key) ?? [];
        if (list.length < this.minPlayers) {
            throw new Error(
                `pool ${key} not ready: ${list.length} < ${this.minPlayers}`,
            );
        }
        shuffleInPlaceCrypto(list);
        const taken = list.splice(0, this.minPlayers);
        if (list.length === 0) {
            this.pools.delete(key);
        } else {
            this.pools.set(key, list);
        }
        return {
            key,
            tokenId,
            atomTier,
            playerIds: taken.map(p => p.playerId),
        };
    }
}

// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import {
    DEFAULT_MIN_PLAYERS,
    PoolMatcher,
} from '../../src/coordinator/pool.js';

const TOKEN_ID =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('PoolMatcher', () => {
    it('registers players and becomes ready at minPlayers', () => {
        const m = new PoolMatcher(2);
        expect(m.isReady(TOKEN_ID, 1000n)).to.equal(false);
        m.register({ playerId: 'a', tokenId: TOKEN_ID, atomTier: 1000n });
        expect(m.isReady(TOKEN_ID, 1000n)).to.equal(false);
        m.register({ playerId: 'b', tokenId: TOKEN_ID, atomTier: 1000n });
        expect(m.isReady(TOKEN_ID, 1000n)).to.equal(true);
    });

    it('duplicate registration is idempotent', () => {
        const m = new PoolMatcher(2);
        const first = m.register({
            playerId: 'a',
            tokenId: TOKEN_ID,
            atomTier: 1n,
        });
        const again = m.register({
            playerId: 'a',
            tokenId: TOKEN_ID,
            atomTier: 1n,
        });
        expect(again).to.deep.equal(first);
        expect(m.size(TOKEN_ID, 1n)).to.equal(1);
    });

    it('snapshots registration so callers cannot mutate after register', () => {
        const m = new PoolMatcher(2);
        const reg = {
            playerId: 'alice',
            tokenId: TOKEN_ID,
            atomTier: 1n,
        };
        m.register(reg);
        reg.playerId = 'eve';
        // Mutating the caller's object must not change the stored snapshot;
        // re-registering as alice stays idempotent (still size 1).
        expect(
            m.register({
                playerId: 'alice',
                tokenId: TOKEN_ID,
                atomTier: 1n,
            }).size,
        ).to.equal(1);
        m.register({ playerId: 'bob', tokenId: TOKEN_ID, atomTier: 1n });
        const ready = m.takeReady(TOKEN_ID, 1n);
        expect(ready.playerIds).to.have.members(['alice', 'bob']);
        expect(ready.playerIds).to.have.length(2);
    });

    it('takeReady shuffles then removes only minPlayers', () => {
        const m = new PoolMatcher(2);
        m.register({ playerId: 'a', tokenId: TOKEN_ID, atomTier: 5n });
        m.register({ playerId: 'b', tokenId: TOKEN_ID, atomTier: 5n });
        m.register({ playerId: 'c', tokenId: TOKEN_ID, atomTier: 5n });
        const ready = m.takeReady(TOKEN_ID, 5n);
        expect(ready.playerIds).to.have.length(2);
        expect(['a', 'b', 'c']).to.include.members(ready.playerIds);
        expect(m.size(TOKEN_ID, 5n)).to.equal(1);
        expect(m.isReady(TOKEN_ID, 5n)).to.equal(false);
        const taken = new Set(ready.playerIds);
        const leftover = ['a', 'b', 'c'].filter(id => !taken.has(id));
        expect(leftover).to.have.length(1);
    });

    it('isolates pools by tokenId and atomTier', () => {
        const m = new PoolMatcher(2);
        m.register({ playerId: 'a', tokenId: TOKEN_ID, atomTier: 1n });
        m.register({ playerId: 'tier-2', tokenId: TOKEN_ID, atomTier: 2n });
        m.register({
            playerId: 'b',
            tokenId: 'ff'.repeat(32),
            atomTier: 1n,
        });
        expect(m.isReady(TOKEN_ID, 1n)).to.equal(false);
        m.register({ playerId: 'c', tokenId: TOKEN_ID, atomTier: 1n });
        expect(m.isReady(TOKEN_ID, 1n)).to.equal(true);
        expect(m.isReady(TOKEN_ID, 2n)).to.equal(false);
        expect(m.isReady('ff'.repeat(32), 1n)).to.equal(false);
    });

    it('rejects non-integer minPlayers', () => {
        expect(() => new PoolMatcher(2.5)).to.throw(/integer/);
        expect(() => new PoolMatcher(NaN)).to.throw(/integer/);
        expect(() => new PoolMatcher(1)).to.throw(/integer/);
    });

    it('defaults to DEFAULT_MIN_PLAYERS (privacy floor, not 2)', () => {
        const m = new PoolMatcher();
        for (let i = 0; i < DEFAULT_MIN_PLAYERS - 1; i++) {
            m.register({
                playerId: `p${i}`,
                tokenId: TOKEN_ID,
                atomTier: 1n,
            });
        }
        expect(m.isReady(TOKEN_ID, 1n)).to.equal(false);
        m.register({
            playerId: `p${DEFAULT_MIN_PLAYERS - 1}`,
            tokenId: TOKEN_ID,
            atomTier: 1n,
        });
        expect(m.isReady(TOKEN_ID, 1n)).to.equal(true);
        expect(DEFAULT_MIN_PLAYERS).to.be.at.least(8);
    });
});

// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { FormerInventoryNotify } from '../src/inventory/formerInventoryNotify';
import type { FormerInventoryPile } from '../src/inventory/classify';

const TOKEN_A = 'aa'.repeat(32);
const TOKEN_B = 'bb'.repeat(32);

const pile = (
    tokenId: string,
    atoms: bigint,
    utxoCount: number,
): FormerInventoryPile => ({
    tokenId,
    atoms,
    utxoCount,
});

describe('FormerInventoryNotify', () => {
    it('sends once for unchanged piles, retries after failure', () => {
        const notify = new FormerInventoryNotify();
        const piles = [pile(TOKEN_A, 100n, 10)];

        const failed = notify.begin('startup', piles);
        assert.ok(failed);
        notify.complete(failed, false);
        const retry = notify.begin('scheduled', piles);
        assert.ok(retry);
        assert.strictEqual(retry.key, failed.key);
        assert.notStrictEqual(retry.generation, failed.generation);
        notify.complete(retry, true);

        assert.strictEqual(notify.begin('scheduled', piles), null);
    });

    it('skips a second send while the same key is in flight', () => {
        const notify = new FormerInventoryNotify();
        const piles = [pile(TOKEN_A, 100n, 10)];
        const first = notify.begin('startup', piles);
        assert.ok(first);
        assert.strictEqual(notify.begin('scheduled', piles), null);
        notify.complete(first, true);
        assert.strictEqual(notify.begin('scheduled', piles), null);
    });

    it('resets on empty so a reappearance notifies again', () => {
        const notify = new FormerInventoryNotify();
        const piles = [pile(TOKEN_A, 100n, 10)];
        const first = notify.begin('startup', piles);
        assert.ok(first);
        notify.complete(first, true);
        assert.strictEqual(notify.begin('scheduled', []), null);
        const again = notify.begin('scheduled', piles);
        assert.ok(again);
        assert.strictEqual(again.key, first.key);
    });

    it('ignores a stale success after piles were cleared', () => {
        const notify = new FormerInventoryNotify();
        const piles = [pile(TOKEN_A, 100n, 10)];
        const first = notify.begin('startup', piles);
        assert.ok(first);
        assert.strictEqual(notify.begin('scheduled', []), null);
        notify.complete(first, true);
        const again = notify.begin('scheduled', piles);
        assert.ok(again);
    });

    it('ignores a stale success after a newer notify started', () => {
        const notify = new FormerInventoryNotify();
        const pilesA = [pile(TOKEN_A, 100n, 10)];
        const pilesB = [pile(TOKEN_B, 50n, 12)];
        const sendA = notify.begin('startup', pilesA);
        assert.ok(sendA);
        const sendB = notify.begin('scheduled', pilesB);
        assert.ok(sendB);
        notify.complete(sendA, true);
        assert.strictEqual(notify.begin('scheduled', pilesB), null);
        notify.complete(sendB, true);
        assert.strictEqual(notify.begin('scheduled', pilesB), null);
        const againA = notify.begin('scheduled', pilesA);
        assert.ok(againA);
    });
});

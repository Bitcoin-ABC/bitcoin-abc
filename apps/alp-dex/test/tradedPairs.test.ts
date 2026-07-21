// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { canonicalizePair, pairKey } from '../src/config/tradedPairs';

const TOKEN_A = 'aa'.repeat(32);
const TOKEN_B = 'bb'.repeat(32);

describe('tradedPairs', () => {
    it('canonicalizes undirected order', () => {
        const pair = canonicalizePair(TOKEN_B, TOKEN_A);
        assert.strictEqual(pair.tokenIdA, TOKEN_A);
        assert.strictEqual(pair.tokenIdB, TOKEN_B);
        assert.strictEqual(pairKey(TOKEN_B, TOKEN_A), `${TOKEN_A}:${TOKEN_B}`);
    });

    it('rejects same-token pairs', () => {
        assert.throws(() => canonicalizePair(TOKEN_A, TOKEN_A), /must differ/);
        assert.throws(() => pairKey(TOKEN_A, TOKEN_A), /must differ/);
    });

    it('pairKey validates and normalizes like canonicalizePair', () => {
        assert.strictEqual(
            pairKey(`  ${TOKEN_B.toUpperCase()}  `, TOKEN_A),
            `${TOKEN_A}:${TOKEN_B}`,
        );
        assert.throws(
            () => pairKey('not-a-token', TOKEN_A),
            /64-character hex/,
        );
    });
});

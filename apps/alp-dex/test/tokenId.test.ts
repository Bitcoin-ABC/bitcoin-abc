// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import {
    assertDistinctTokenPair,
    assertTokenId,
    isTokenId,
} from '../src/methods/tokenId';

const TOKEN_A = 'aa'.repeat(32);
const TOKEN_B = 'bb'.repeat(32);

describe('tokenId', () => {
    it('isTokenId / assertTokenId accept 64-hex and lowercase', () => {
        assert.strictEqual(isTokenId(TOKEN_A), true);
        assert.strictEqual(assertTokenId(TOKEN_A.toUpperCase()), TOKEN_A);
        assert.strictEqual(assertTokenId(`  ${TOKEN_A}  `), TOKEN_A);
    });

    it('reject invalid token ids', () => {
        assert.strictEqual(isTokenId('short'), false);
        assert.throws(() => assertTokenId('not-hex'), /64-character hex/);
        assert.throws(() => assertTokenId('gg'.repeat(32)), /64-character hex/);
    });

    it('assertDistinctTokenPair requires two different ids', () => {
        assert.deepStrictEqual(assertDistinctTokenPair(TOKEN_A, TOKEN_B), {
            fromTokenId: TOKEN_A,
            toTokenId: TOKEN_B,
        });
        assert.throws(
            () => assertDistinctTokenPair(TOKEN_A, TOKEN_A),
            /must differ/,
        );
    });
});

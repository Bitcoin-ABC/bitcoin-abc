// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import {
    ceilDiv,
    cpExactInAmountOut,
    cpExactOutAmountIn,
    makerFeeAtoms,
} from '../src/pricing/cp';
import {
    pairSpotPrices,
    quoteExactIn,
    quoteExactOut,
    spotToPerWholeFrom,
} from '../src/pricing/quotes';
import {
    pairPricingReserves,
    pricingReserveAtoms,
    sumFungibleAtoms,
} from '../src/pricing/reserves';

const TOKEN_A = 'aa'.repeat(32);
const TOKEN_B = 'bb'.repeat(32);

describe('pricing CP math', () => {
    it('exact-in matches SPEC floor formula', () => {
        // amountOut = 100 * 200 / (100 + 100) = 100
        assert.strictEqual(cpExactInAmountOut(100n, 100n, 200n), 100n);
        // 50 * 200 / (100 + 50) = 10000/150 = 66
        assert.strictEqual(cpExactInAmountOut(50n, 100n, 200n), 66n);
    });

    it('exact-out uses ceil division', () => {
        assert.strictEqual(ceilDiv(10n, 3n), 4n);
        assert.strictEqual(ceilDiv(9n, 3n), 3n);
        // Inverse of exact-in 50→66 on 100/200 pool: ceil(66*100/(200-66))=50
        const amountIn = cpExactOutAmountIn(66n, 100n, 200n);
        assert.strictEqual(amountIn, 50n);
        assert.strictEqual(cpExactInAmountOut(amountIn, 100n, 200n), 66n);
    });

    it('rejects empty pools, zero amounts, and draining the out reserve', () => {
        assert.throws(() => cpExactInAmountOut(1n, 0n, 100n), /positive/);
        assert.throws(() => cpExactInAmountOut(1n, 100n, 0n), /positive/);
        assert.throws(() => cpExactInAmountOut(0n, 100n, 100n), /amountIn/);
        assert.throws(() => cpExactInAmountOut(-1n, 100n, 100n), /amountIn/);
        assert.throws(() => cpExactOutAmountIn(1n, 0n, 100n), /positive/);
        assert.throws(() => cpExactOutAmountIn(0n, 100n, 100n), /amountOut/);
        assert.throws(() => cpExactOutAmountIn(100n, 100n, 100n), /less than/);
        assert.throws(() => cpExactOutAmountIn(101n, 100n, 100n), /less than/);
        assert.throws(() => ceilDiv(1n, 0n), /denominator/);
        assert.throws(() => ceilDiv(-1n, 1n), /numerator/);
    });

    it('makerFeeAtoms scales feePct on the price leg', () => {
        assert.strictEqual(makerFeeAtoms(1_000_000n, 0.01), 10_000n);
        assert.strictEqual(makerFeeAtoms(100n, 0), 0n);
        assert.strictEqual(makerFeeAtoms(0n, 0.01), 0n);
        assert.throws(() => makerFeeAtoms(1n, 1.5), /feePct/);
        assert.throws(() => makerFeeAtoms(1n, -0.01), /feePct/);
        assert.throws(() => makerFeeAtoms(-1n, 0.01), /non-negative/);
    });
});

describe('pricing reserves', () => {
    it('sums fungible atoms and skips batons / other tokens', () => {
        const utxos = [
            {
                token: {
                    tokenId: TOKEN_A,
                    atoms: 20n,
                    isMintBaton: false,
                },
            },
            {
                token: {
                    tokenId: TOKEN_A,
                    atoms: 5n,
                    isMintBaton: false,
                },
            },
            {
                token: {
                    tokenId: TOKEN_A,
                    atoms: 0n,
                    isMintBaton: true,
                },
            },
            {
                token: {
                    tokenId: TOKEN_B,
                    atoms: 99n,
                    isMintBaton: false,
                },
            },
            {},
        ];
        assert.strictEqual(sumFungibleAtoms(utxos, TOKEN_A), 25n);
        assert.strictEqual(sumFungibleAtoms(utxos, TOKEN_B), 99n);
    });

    it('pricingReserveAtoms adds seller + slush', () => {
        const seller = [
            {
                token: {
                    tokenId: TOKEN_A,
                    atoms: 10n,
                    isMintBaton: false,
                },
            },
        ];
        const slush = [
            {
                token: {
                    tokenId: TOKEN_A,
                    atoms: 3n,
                    isMintBaton: false,
                },
            },
        ];
        assert.strictEqual(pricingReserveAtoms(seller, slush, TOKEN_A), 13n);
        const pair = pairPricingReserves(seller, slush, TOKEN_A, TOKEN_B);
        assert.strictEqual(pair.reserveIn, 13n);
        assert.strictEqual(pair.reserveOut, 0n);
    });

    it('pairPricingReserves rejects same-token pairs', () => {
        assert.throws(
            () => pairPricingReserves([], [], TOKEN_A, TOKEN_A),
            /must differ/,
        );
    });

    it('pairPricingReserves works with one-shot generator iterables', () => {
        function* sellerOnce() {
            yield {
                token: {
                    tokenId: TOKEN_A,
                    atoms: 10n,
                    isMintBaton: false,
                },
            };
            yield {
                token: {
                    tokenId: TOKEN_B,
                    atoms: 40n,
                    isMintBaton: false,
                },
            };
        }
        function* slushOnce() {
            yield {
                token: {
                    tokenId: TOKEN_A,
                    atoms: 3n,
                    isMintBaton: false,
                },
            };
            yield {
                token: {
                    tokenId: TOKEN_B,
                    atoms: 7n,
                    isMintBaton: false,
                },
            };
        }
        const pair = pairPricingReserves(
            sellerOnce(),
            slushOnce(),
            TOKEN_A,
            TOKEN_B,
        );
        assert.strictEqual(pair.reserveIn, 13n);
        assert.strictEqual(pair.reserveOut, 47n);
    });
});

describe('pricing quotes', () => {
    it('spot is human to-per-from using genesis decimals', () => {
        // 200 to-atoms / 100 from-atoms, both 0 decimals → spot 2
        assert.strictEqual(spotToPerWholeFrom(100n, 200n, 0, 0), '2');
        // from decimals 2, to decimals 0: 200 * 100 / 100 = 200 → "200"
        assert.strictEqual(spotToPerWholeFrom(100n, 200n, 2, 0), '200');
        // from 0, to 2: 20000 / 100 = 200 atoms of to → "2"
        assert.strictEqual(spotToPerWholeFrom(100n, 20000n, 0, 2), '2');
    });

    it('spotToPerWholeFrom rejects empty or negative reserves', () => {
        assert.throws(() => spotToPerWholeFrom(0n, 100n, 0, 0), /positive/);
        assert.throws(() => spotToPerWholeFrom(-1n, 100n, 0, 0), /positive/);
        assert.throws(
            () => spotToPerWholeFrom(100n, -1n, 0, 0),
            /non-negative/,
        );
    });

    it('pairSpotPrices returns both directions or n/a when either reserve is empty', () => {
        // 1 decimal on each side so the B→A reciprocal (0.5) is representable.
        assert.deepStrictEqual(pairSpotPrices(100n, 200n, 1, 1), {
            spotAtoB: '2',
            spotBtoA: '0.5',
        });
        assert.deepStrictEqual(pairSpotPrices(0n, 200n, 0, 0), {
            spotAtoB: 'n/a',
            spotBtoA: 'n/a',
        });
        assert.deepStrictEqual(pairSpotPrices(100n, 0n, 0, 0), {
            spotAtoB: 'n/a',
            spotBtoA: 'n/a',
        });
    });

    it('quoteExactIn / quoteExactOut attach maker fee on top', () => {
        const reserves = {
            fromTokenId: TOKEN_A,
            toTokenId: TOKEN_B,
            reserveIn: 100n,
            reserveOut: 200n,
        };
        const qIn = quoteExactIn(50n, reserves, 0.01);
        assert.strictEqual(qIn.amountOut, 66n);
        // 50 * 1% floors to 0 atoms at 1e9 fixed-point scale.
        assert.strictEqual(qIn.makerFee, 0n);
        const qIn2 = quoteExactIn(10_000n, reserves, 0.01);
        assert.strictEqual(qIn2.makerFee, 100n);
        assert.strictEqual(qIn2.totalFromAtoms, 10_100n);

        const qOut = quoteExactOut(66n, reserves, 0.01);
        assert.strictEqual(qOut.amountIn, 50n);
        assert.strictEqual(qOut.makerFee, 0n);
        assert.strictEqual(qOut.totalFromAtoms, 50n);
    });

    it('quotes reject empty reserves and draining the out reserve', () => {
        const empty = {
            fromTokenId: TOKEN_A,
            toTokenId: TOKEN_B,
            reserveIn: 0n,
            reserveOut: 200n,
        };
        assert.throws(() => quoteExactIn(1n, empty, 0), /positive/);
        assert.throws(
            () =>
                quoteExactOut(
                    200n,
                    {
                        fromTokenId: TOKEN_A,
                        toTokenId: TOKEN_B,
                        reserveIn: 100n,
                        reserveOut: 200n,
                    },
                    0,
                ),
            /less than/,
        );
    });
});

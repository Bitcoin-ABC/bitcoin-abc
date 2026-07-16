// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Includes Electrum ABC CashFusion cases from
 * electrumabc_plugins/fusion/tests/test_pedersen.py (same cases, not fixed vectors).
 */
import { expect } from 'chai';

import { Ecc } from './ecc.js';
import { CURVE_ORDER, modCurveOrder, scalarToBytes } from './eccScalar.js';
import { equalBytes } from './io/array.js';
import { fromHex, toHex } from './io/hex.js';
import { strToBytes } from './io/str.js';
import {
    addCommitmentPoints,
    addScalars,
    PedersenSetup,
    verifyCommitmentSum,
} from './pedersen.js';
import './initWasm.js';

const ecc = new Ecc();
const SCALAR_ONE = fromHex(
    '0000000000000000000000000000000000000000000000000000000000000001',
);

describe('Pedersen', () => {
    // TestBadSetup
    it('rejects H = G (InsecureHPoint)', () => {
        expect(() => new PedersenSetup(ecc.derivePubkey(SCALAR_ONE))).to.throw(
            /H = G/,
        );
    });

    it('rejects H = -G compressed (InsecureHPoint)', () => {
        expect(
            () =>
                new PedersenSetup(
                    fromHex(
                        '0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
                    ),
                ),
        ).to.throw(/InsecureHPoint/);
    });

    it('rejects H = -G uncompressed (InsecureHPoint)', () => {
        expect(
            () =>
                new PedersenSetup(
                    fromHex(
                        '0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798b7c52588d95c3b9aa25b0403f1eef75702e84bb7597aabe663b82f6f04ef2777',
                    ),
                ),
        ).to.throw(/InsecureHPoint/);
    });

    it('rejects a non-point H', () => {
        expect(
            () =>
                new PedersenSetup(
                    fromHex(
                        '030000000000000000000000000000000000000000000000000000000000000007',
                    ),
                ),
        ).to.throw(/could not be parsed/);
    });

    // TestNormal
    it('sum of commitments equals manual commit (compressed + uncompressed)', () => {
        const setup = new PedersenSetup(
            strToBytes('\x02The scalar for this x is unknown'),
        );
        const commit0 = setup.commit(0n);
        const commit5 = setup.commit(5n);
        const commit10m = setup.commit(-10n);

        const sumNonce = addScalars(
            addScalars(commit0.nonce, commit5.nonce),
            commit10m.nonce,
        );
        const sumUncompressed = addCommitmentPoints([
            commit0.pointUncompressed,
            commit5.pointUncompressed,
            commit10m.pointUncompressed,
        ]);
        const manual = setup.commit(-5n, sumNonce);

        expect(equalBytes(sumUncompressed, manual.pointUncompressed)).to.equal(
            true,
        );
        expect(
            equalBytes(ecc.compressPk(sumUncompressed), manual.point),
        ).to.equal(true);
        expect(
            modCurveOrder(commit0.amount + commit5.amount + commit10m.amount),
        ).to.equal(modCurveOrder(manual.amount));
        expect(equalBytes(sumNonce, manual.nonce)).to.equal(true);
    });

    it('verifyCommitmentSum accepts a valid total', () => {
        const setup = new PedersenSetup(
            strToBytes('\x02CashFusion gives us fungibility.'),
        );
        const c1 = setup.commit(100n);
        const c2 = setup.commit(-40n);
        const nonce = addScalars(c1.nonce, c2.nonce);
        expect(
            verifyCommitmentSum(
                setup,
                [c1.pointUncompressed, c2.pointUncompressed],
                60n,
                nonce,
            ),
        ).to.equal(true);
    });

    it('verifyCommitmentSum rejects a tampered total', () => {
        const setup = new PedersenSetup(
            strToBytes('\x02ALP Fusion gives us fungibility.'),
        );
        const c1 = setup.commit(1000n);
        const c2 = setup.commit(-400n);
        const nonce = addScalars(c1.nonce, c2.nonce);
        expect(
            verifyCommitmentSum(
                setup,
                [c1.pointUncompressed, c2.pointUncompressed],
                601n,
                nonce,
            ),
        ).to.equal(false);
    });

    it('addScalars returns zero for complementary nonces; zero-nonce opening works', () => {
        const setup = new PedersenSetup(
            strToBytes('\x02CashFusion gives us fungibility.'),
        );
        const k = scalarToBytes(7n);
        const kInv = scalarToBytes(CURVE_ORDER - 7n);
        const sum = addScalars(k, kInv);
        expect(toHex(sum)).to.equal('00'.repeat(32));

        const c1 = setup.commit(50n, k);
        const c2 = setup.commit(25n, kInv);
        expect(
            verifyCommitmentSum(
                setup,
                [c1.pointUncompressed, c2.pointUncompressed],
                75n,
                sum,
            ),
        ).to.equal(true);
    });

    it('verifyCommitmentSum accepts the identity aggregate (0, 0)', () => {
        const setup = new PedersenSetup(
            strToBytes('\x02CashFusion gives us fungibility.'),
        );
        const k = scalarToBytes(9n);
        const kInv = scalarToBytes(CURVE_ORDER - 9n);
        const c1 = setup.commit(40n, k);
        const c2 = setup.commit(-40n, kInv);
        const zero = new Uint8Array(32);
        expect(
            verifyCommitmentSum(
                setup,
                [c1.pointUncompressed, c2.pointUncompressed],
                0n,
                zero,
            ),
        ).to.equal(true);
        // Non-cancelling points must not verify as identity.
        expect(
            verifyCommitmentSum(setup, [c1.pointUncompressed], 0n, zero),
        ).to.equal(false);
    });

    it('verifyCommitmentSum rejects ill-formed commitments (never true)', () => {
        const setup = new PedersenSetup(
            strToBytes('\x02CashFusion gives us fungibility.'),
        );
        const zero = new Uint8Array(32);
        // Garbage / wrong length must not be treated as the identity aggregate.
        expect(
            verifyCommitmentSum(setup, [new Uint8Array(33)], 0n, zero),
        ).to.equal(false);
        expect(
            verifyCommitmentSum(setup, [new Uint8Array(16)], 0n, zero),
        ).to.equal(false);
        expect(
            verifyCommitmentSum(
                setup,
                [
                    fromHex(
                        '030000000000000000000000000000000000000000000000000000000000000007',
                    ),
                ],
                0n,
                zero,
            ),
        ).to.equal(false);
        expect(
            verifyCommitmentSum(
                setup,
                [fromHex('04' + '00'.repeat(64))],
                0n,
                zero,
            ),
        ).to.equal(false);
        // Bad nonce length.
        expect(
            verifyCommitmentSum(
                setup,
                [setup.commit(1n).pointUncompressed],
                1n,
                new Uint8Array(31),
            ),
        ).to.equal(false);
    });
});

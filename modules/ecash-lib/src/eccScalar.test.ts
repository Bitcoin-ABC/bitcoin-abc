// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import {
    CURVE_ORDER,
    modCurveOrder,
    randomScalarBytes,
    scalarToBytes,
} from './eccScalar.js';
import { bytesToScalar } from './io/array.js';
import { toHex } from './io/hex.js';

describe('eccScalar', () => {
    it('modCurveOrder reduces negative values into [0, n)', () => {
        expect(modCurveOrder(-1n)).to.equal(CURVE_ORDER - 1n);
        expect(modCurveOrder(CURVE_ORDER + 5n)).to.equal(5n);
    });

    it('scalarToBytes is 32-byte big-endian', () => {
        expect(toHex(scalarToBytes(1n))).to.equal('00'.repeat(31) + '01');
        expect(bytesToScalar(scalarToBytes(CURVE_ORDER - 1n))).to.equal(
            CURVE_ORDER - 1n,
        );
    });

    it('randomScalarBytes is in [1, n)', () => {
        for (let i = 0; i < 20; i++) {
            const bytes = randomScalarBytes();
            expect(bytes).to.have.lengthOf(32);
            const n = bytesToScalar(bytes);
            expect(n >= 1n).to.equal(true);
            expect(n < CURVE_ORDER).to.equal(true);
        }
    });
});

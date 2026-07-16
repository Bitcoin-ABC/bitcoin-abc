// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import {
    bigintToU64Be,
    bytesToScalar,
    concatBytes,
    equalBytes,
    u32ToBe,
} from './array.js';
import { fromHex, toHex } from './hex.js';

describe('io/array', () => {
    it('equalBytes', () => {
        expect(equalBytes(fromHex('0102'), fromHex('0102'))).to.equal(true);
        expect(equalBytes(fromHex('0102'), fromHex('0103'))).to.equal(false);
        expect(equalBytes(fromHex('01'), fromHex('0102'))).to.equal(false);
    });

    it('concatBytes', () => {
        expect(toHex(concatBytes(fromHex('aa'), fromHex('bbcc')))).to.equal(
            'aabbcc',
        );
    });

    it('bytesToScalar / u32ToBe / bigintToU64Be', () => {
        expect(bytesToScalar(fromHex('00000100'))).to.equal(256n);
        expect(toHex(u32ToBe(0x01020304))).to.equal('01020304');
        expect(toHex(bigintToU64Be(0x0102030405060708n))).to.equal(
            '0102030405060708',
        );
    });

    it('u32ToBe and bigintToU64Be reject out-of-range values', () => {
        expect(() => u32ToBe(-1)).to.throw(/u32ToBe/);
        expect(() => u32ToBe(0x100000000)).to.throw(/u32ToBe/);
        expect(() => bigintToU64Be(-1n)).to.throw(/bigintToU64Be/);
        expect(() => bigintToU64Be(0x10000000000000000n)).to.throw(
            /bigintToU64Be/,
        );
    });
});

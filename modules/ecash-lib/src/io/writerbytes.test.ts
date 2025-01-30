// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { fromHex } from './hex.js';
import { WriterBytes } from './writerbytes.js';

const wrote = (size: number, fn: (writer: WriterBytes) => void) => {
    const writer = new WriterBytes(size);
    fn(writer);
    return writer.data;
};

describe('WriterBytes', () => {
    it('WriterBytes.put* one', () => {
        expect(wrote(1, writer => writer.putU8(0xde))).to.deep.equal(
            fromHex('de'),
        );
        expect(wrote(2, writer => writer.putU16(0xdead))).to.deep.equal(
            fromHex('adde'),
        );
        expect(wrote(4, writer => writer.putU32(0xdeadbeef))).to.deep.equal(
            fromHex('efbeadde'),
        );
        expect(
            wrote(8, writer => writer.putU64(0xdeadbeef0badcafen)),
        ).to.deep.equal(fromHex('fecaad0befbeadde'));
        expect(
            wrote(3, writer => writer.putBytes(fromHex('abcdef'))),
        ).to.deep.equal(fromHex('abcdef'));
    });
    it('WriterBytes.put* multiple', () => {
        const writer = new WriterBytes(17);
        writer.putU8(0x44);
        writer.putU16(0x0201);
        writer.putU32(0x06050403);
        writer.putU64(0x0e0d0c0b0a090807n);
        writer.putBytes(fromHex('0f10'));
        expect(writer.data).to.deep.equal(
            fromHex('440102030405060708090a0b0c0d0e0f10'),
        );
    });
    it('WriterBytes.put* multiple big-endian', () => {
        const writer = new WriterBytes(17);
        writer.putU8(0x44);
        writer.putU16(0x0201, 'BE');
        writer.putU32(0x06050403, 'BE');
        writer.putU64(0x0e0d0c0b0a090807n, 'BE');
        writer.putBytes(fromHex('0f10'));
        expect(writer.data).to.deep.equal(
            fromHex('440201060504030e0d0c0b0a0908070f10'),
        );
    });
    it('WriterBytes.put* failure', () => {
        expect(() => wrote(0, writer => writer.putU8(0))).to.throw(
            'Not enough bytes: Tried writing 1 byte(s), but only 0 byte(s) have been pre-allocated',
        );
        expect(() => wrote(1, writer => writer.putU16(0))).to.throw(
            'Not enough bytes: Tried writing 2 byte(s), but only 1 byte(s) have been pre-allocated',
        );
        expect(() => wrote(3, writer => writer.putU32(0))).to.throw(
            'Not enough bytes: Tried writing 4 byte(s), but only 3 byte(s) have been pre-allocated',
        );
        expect(() => wrote(7, writer => writer.putU64(0n))).to.throw(
            'Not enough bytes: Tried writing 8 byte(s), but only 7 byte(s) have been pre-allocated',
        );
        expect(() =>
            wrote(2, writer => writer.putBytes(new Uint8Array(3))),
        ).to.throw(
            'Not enough bytes: Tried writing 3 byte(s), but only 2 byte(s) have been pre-allocated',
        );
    });
});

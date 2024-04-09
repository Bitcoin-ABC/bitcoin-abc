// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { fromHex } from './hex.js';
import { WriterLength } from './writerlength.js';

const wrote = (fn: (writer: WriterLength) => void) => {
    const writer = new WriterLength();
    fn(writer);
    return writer.length;
};

describe('WriterLength', () => {
    it('WriterLength.put* one', () => {
        expect(wrote(writer => writer.putU8(0xde))).to.deep.equal(1);
        expect(wrote(writer => writer.putU16(0xdead))).to.deep.equal(2);
        expect(wrote(writer => writer.putU32(0xdeadbeef))).to.deep.equal(4);
        expect(
            wrote(writer => writer.putU64(0xdeadbeef0badcafen)),
        ).to.deep.equal(8);
        expect(
            wrote(writer => writer.putBytes(fromHex('abcdef'))),
        ).to.deep.equal(3);
    });
    it('WriterLength.put* multiple', () => {
        const writer = new WriterLength();
        writer.putU8(0x44);
        writer.putU16(0x0201);
        writer.putU32(0x06050403);
        writer.putU64(0x0e0d0c0b0a090807n);
        writer.putBytes(fromHex('0f10'));
        expect(writer.length).to.deep.equal(17);
    });
});

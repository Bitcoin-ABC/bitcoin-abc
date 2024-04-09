// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { Bytes } from './bytes.js';
import { fromHex } from './hex.js';
import { readVarSize, writeVarSize } from './varsize.js';
import { WriterBytes } from './writerbytes.js';

describe('VARINT', () => {
    it('readVarSize', () => {
        for (let i = 0; i < 0xfd; ++i) {
            expect(readVarSize(new Bytes(new Uint8Array([i])))).to.equal(i);
        }
        expect(readVarSize(new Bytes(fromHex('fdadde')))).to.equal(0xdead);
        expect(readVarSize(new Bytes(fromHex('feefbeadde')))).to.equal(
            0xdeadbeef,
        );
        expect(readVarSize(new Bytes(fromHex('fffecaad0befbeadde')))).to.equal(
            0xdeadbeef0badcafen,
        );
    });
    it('readVarSize failure', () => {
        expect(() => readVarSize(new Bytes(new Uint8Array([])))).to.throw(
            'Not enough bytes: Tried reading 1 byte(s), but there are only 0 byte(s) left',
        );
        expect(() => readVarSize(new Bytes(fromHex('fd00')))).to.throw(
            'Not enough bytes: Tried reading 2 byte(s), but there are only 1 byte(s) left',
        );
        expect(() => readVarSize(new Bytes(fromHex('fe010203')))).to.throw(
            'Not enough bytes: Tried reading 4 byte(s), but there are only 3 byte(s) left',
        );
        expect(() =>
            readVarSize(new Bytes(fromHex('ff01020304050607'))),
        ).to.throw(
            'Not enough bytes: Tried reading 8 byte(s), but there are only 7 byte(s) left',
        );
    });
    it('writeVarSize 0x00-0xfc', () => {
        for (let i = 0; i < 0xfd; ++i) {
            const writer = new WriterBytes(1);
            writeVarSize(i, writer);
            expect(writer.data).to.deep.equal(new Uint8Array([i]));
        }
    });
    it('writeVarSize 0xfd', () => {
        for (const num of [0x100, 0x101, 0x1111, 0xffff]) {
            const writer = new WriterBytes(3);
            writeVarSize(num, writer);
            expect(writer.data).to.deep.equal(
                new Uint8Array([0xfd, num & 0xff, (num & 0xff00) >> 8]),
            );
        }
    });
    it('writeVarSize 0xfe', () => {
        for (const num of [0x10000, 0x10001, 0x11111111, 0xffffffff]) {
            const writer = new WriterBytes(5);
            writeVarSize(num, writer);
            expect(writer.data).to.deep.equal(
                new Uint8Array([
                    0xfe,
                    num & 0xff,
                    (num & 0xff00) >> 8,
                    (num & 0xff0000) >> 16,
                    (num & 0xff000000) >> 24,
                ]),
            );
        }
    });
    it('writeVarSize 0xff', () => {
        for (const num of [
            0x100000000n,
            0x100000001n,
            0x1111111111111111n,
            0xffffffffffffffffn,
        ]) {
            const writer = new WriterBytes(9);
            writeVarSize(num, writer);
            expect(writer.data).to.deep.equal(
                new Uint8Array([
                    0xff,
                    Number(num & 0xffn),
                    Number((num & 0xff00n) >> 8n),
                    Number((num & 0xff0000n) >> 16n),
                    Number((num & 0xff000000n) >> 24n),
                    Number((num & 0xff00000000n) >> 32n),
                    Number((num & 0xff0000000000n) >> 40n),
                    Number((num & 0xff000000000000n) >> 48n),
                    Number((num & 0xff00000000000000n) >> 56n),
                ]),
            );
        }
    });
    it('writeVarSize failure', () => {
        expect(() => writeVarSize(0, new WriterBytes(0))).to.throw(
            'Not enough bytes: Tried writing 1 byte(s), but only 0 byte(s) have been pre-allocated',
        );
        expect(() => writeVarSize(0xfd, new WriterBytes(2))).to.throw(
            'Not enough bytes: Tried writing 2 byte(s), but only 1 byte(s) have been pre-allocated',
        );
        expect(() => writeVarSize(0x10000, new WriterBytes(4))).to.throw(
            'Not enough bytes: Tried writing 4 byte(s), but only 3 byte(s) have been pre-allocated',
        );
        expect(() => writeVarSize(0x100000000, new WriterBytes(8))).to.throw(
            'Not enough bytes: Tried writing 8 byte(s), but only 7 byte(s) have been pre-allocated',
        );
        expect(() =>
            writeVarSize(0x10000000000000000n, new WriterBytes(0)),
        ).to.throw('Integer too big for VarSize');
    });
});

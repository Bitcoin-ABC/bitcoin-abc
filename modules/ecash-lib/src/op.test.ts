// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import {
    OP_0,
    OP_1,
    OP_16,
    OP_1NEGATE,
    OP_2,
    OP_3,
    OP_CHECKSIG,
    OP_CODESEPARATOR,
    OP_DUP,
    OP_EQUAL,
    OP_EQUALVERIFY,
    OP_HASH160,
    OP_PUSHDATA1,
    OP_PUSHDATA2,
    OP_PUSHDATA4,
} from './opcode.js';
import { isPushOp, pushBytesOp, pushNumberOp, readOp, writeOp } from './op.js';
import { fromHex, toHex } from './io/hex.js';
import { Bytes } from './io/bytes.js';
import { WriterBytes } from './io/writerbytes.js';

const wrote = (size: number, fn: (writer: WriterBytes) => void) => {
    const writer = new WriterBytes(size);
    fn(writer);
    return writer.data;
};

describe('Op', () => {
    it('isPushOp', () => {
        expect(isPushOp(null)).to.equal(false);
        expect(isPushOp(OP_CODESEPARATOR)).to.equal(false);
        expect(isPushOp(10)).to.equal(false);
        expect(isPushOp({})).to.equal(false);
        expect(isPushOp({ data: null })).to.equal(false);
        expect(isPushOp({ opcode: null })).to.equal(false);
        expect(isPushOp({ opcode: null, data: null })).to.equal(false);
        expect(isPushOp({ opcode: 1, data: null })).to.equal(false);
        expect(isPushOp({ opcode: null, data: new Uint8Array(1) })).to.equal(
            false,
        );
        expect(isPushOp({ opcode: 1, data: new Uint8Array(1) })).to.equal(true);
    });
    it('Op.readOp all opcodes 0x00-0xff', () => {
        // 00 is returned as just a single opcode, not as a PushOp
        expect(readOp(new Bytes(fromHex('00')))).to.equal(OP_0);

        // Test all single-byte pushops
        for (let opcode = 1; opcode <= 0x4b; ++opcode) {
            const encoded = new Uint8Array([opcode, ...Array(opcode).keys()]);
            const data = new Uint8Array([...Array(opcode).keys()]);
            expect(readOp(new Bytes(encoded))).to.deep.equal({
                opcode,
                data,
            });
        }

        // OP_PUSHDATAn pushops
        expect(readOp(new Bytes(fromHex('4c03456789')))).to.deep.equal({
            opcode: 0x4c,
            data: fromHex('456789'),
        });
        expect(readOp(new Bytes(fromHex('4d0300456789')))).to.deep.equal({
            opcode: 0x4d,
            data: fromHex('456789'),
        });
        expect(readOp(new Bytes(fromHex('4e03000000456789')))).to.deep.equal({
            opcode: 0x4e,
            data: fromHex('456789'),
        });

        // Non-pushop opcodes
        for (let opcode = 0x4f; opcode <= 0xff; ++opcode) {
            expect(readOp(new Bytes(new Uint8Array([opcode])))).to.equal(
                opcode,
            );
        }
    });
    it('Op.readOp P2PKH', () => {
        const bytes = new Bytes(
            fromHex('76a914012345678901234567890123456789012345678988ac'),
        );
        expect(readOp(bytes)).to.equal(OP_DUP);
        expect(readOp(bytes)).to.equal(OP_HASH160);
        expect(readOp(bytes)).to.deep.equal({
            opcode: 20,
            data: fromHex('0123456789012345678901234567890123456789'),
        });
        expect(readOp(bytes)).to.equal(OP_EQUALVERIFY);
        expect(readOp(bytes)).to.equal(OP_CHECKSIG);
    });
    it('Op.readOp P2SH', () => {
        const bytes = new Bytes(
            fromHex('a914abcdeabcdeabcdeabcdeabcdeabcdeabcdeabcde87'),
        );
        expect(readOp(bytes)).to.equal(OP_HASH160);
        expect(readOp(bytes)).to.deep.equal({
            opcode: 20,
            data: fromHex('abcdeabcdeabcdeabcdeabcdeabcdeabcdeabcde'),
        });
        expect(readOp(bytes)).to.equal(OP_EQUAL);
    });
    it('Op.readOp failure', () => {
        expect(() => readOp(new Bytes(fromHex('01')))).to.throw(
            'Not enough bytes: Tried reading 1 byte(s), but there are only 0 byte(s) left',
        );
        expect(() => readOp(new Bytes(fromHex('0200')))).to.throw(
            'Not enough bytes: Tried reading 2 byte(s), but there are only 1 byte(s) left',
        );
        expect(() => readOp(new Bytes(fromHex('4c')))).to.throw(
            'Not enough bytes: Tried reading 1 byte(s), but there are only 0 byte(s) left',
        );
        expect(() => readOp(new Bytes(fromHex('4d00')))).to.throw(
            'Not enough bytes: Tried reading 2 byte(s), but there are only 1 byte(s) left',
        );
    });
    it('Op.writeOp all opcodes 0x00-0xff', () => {
        expect(wrote(1, writer => writeOp(OP_0, writer))).to.deep.equal(
            fromHex('00'),
        );
        expect(
            wrote(1, writer =>
                writeOp({ opcode: 0, data: new Uint8Array() }, writer),
            ),
        ).to.deep.equal(fromHex('00'));

        // Test all single-byte pushops
        for (let opcode = 1; opcode <= 0x4b; ++opcode) {
            const encoded = new Uint8Array([opcode, ...Array(opcode).keys()]);
            const data = new Uint8Array([...Array(opcode).keys()]);
            expect(
                wrote(opcode + 1, writer => writeOp({ opcode, data }, writer)),
            ).to.deep.equal(encoded);
        }

        // OP_PUSHDATAn pushops
        expect(
            wrote(5, writer =>
                writeOp(
                    {
                        opcode: 0x4c,
                        data: fromHex('456789'),
                    },
                    writer,
                ),
            ),
        ).to.deep.equal(fromHex('4c03456789'));
        expect(
            wrote(6, writer =>
                writeOp(
                    {
                        opcode: 0x4d,
                        data: fromHex('456789'),
                    },
                    writer,
                ),
            ),
        ).to.deep.equal(fromHex('4d0300456789'));
        expect(
            wrote(8, writer =>
                writeOp(
                    {
                        opcode: 0x4e,
                        data: fromHex('456789'),
                    },
                    writer,
                ),
            ),
        ).to.deep.equal(fromHex('4e03000000456789'));

        // Non-pushop opcodes
        for (let opcode = 0x4f; opcode <= 0xff; ++opcode) {
            expect(wrote(1, writer => writeOp(opcode, writer))).to.deep.equal(
                new Uint8Array([opcode]),
            );
        }
    });
    it('Op.writeOp P2PKH', () => {
        const writer = new WriterBytes(25);
        writeOp(OP_DUP, writer);
        writeOp(OP_HASH160, writer);
        writeOp({ opcode: 20, data: new Uint8Array(20) }, writer);
        writeOp(OP_EQUALVERIFY, writer);
        writeOp(OP_CHECKSIG, writer);
        expect(toHex(writer.data)).to.be.equal(
            '76a914000000000000000000000000000000000000000088ac',
        );
    });
    it('Op.writeOp P2SH', () => {
        const writer = new WriterBytes(23);
        writeOp(OP_HASH160, writer);
        writeOp({ opcode: 20, data: new Uint8Array(20) }, writer);
        writeOp(OP_EQUAL, writer);
        expect(toHex(writer.data)).to.be.equal(
            'a914000000000000000000000000000000000000000087',
        );
    });
    it('Op.writeOp failure', () => {
        expect(() => writeOp(OP_1, new WriterBytes(0))).to.throw(
            'Not enough bytes: Tried writing 1 byte(s), but only 0 byte(s) have been pre-allocated',
        );

        expect(() =>
            writeOp(
                { opcode: OP_PUSHDATA1, data: new Uint8Array() },
                new WriterBytes(0),
            ),
        ).to.throw(
            'Not enough bytes: Tried writing 1 byte(s), but only 0 byte(s) have been pre-allocated',
        );

        expect(() =>
            writeOp(
                { opcode: OP_CHECKSIG, data: new Uint8Array() },
                new WriterBytes(100),
            ),
        ).to.throw('Not a pushop opcode: 0xac');

        expect(() =>
            writeOp(
                { opcode: 2, data: new Uint8Array() },
                new WriterBytes(100),
            ),
        ).to.throw(
            'Inconsistent PushOp, claims to push 2 bytes but actually has 0 bytes attached',
        );
    });
    it('pushBytesOp', () => {
        // single push opcodes
        expect(pushBytesOp(new Uint8Array())).to.equal(OP_0);
        expect(pushBytesOp(new Uint8Array([1]))).to.equal(OP_1);
        expect(pushBytesOp(new Uint8Array([2]))).to.equal(OP_2);
        expect(pushBytesOp(new Uint8Array([3]))).to.equal(OP_3);
        expect(pushBytesOp(new Uint8Array([16]))).to.equal(OP_16);
        expect(pushBytesOp(new Uint8Array([0x81]))).to.equal(OP_1NEGATE);

        expect(pushBytesOp(new Uint8Array([1, 0]))).to.deep.equal({
            opcode: 2,
            data: new Uint8Array([1, 0]),
        });
        expect(pushBytesOp(new Uint8Array([16, 0]))).to.deep.equal({
            opcode: 2,
            data: new Uint8Array([16, 0]),
        });
        expect(pushBytesOp(new Uint8Array([0x81, 0]))).to.deep.equal({
            opcode: 2,
            data: new Uint8Array([0x81, 0]),
        });

        expect(pushBytesOp(new Uint8Array([0]))).to.deep.equal({
            opcode: 1,
            data: new Uint8Array([0]),
        });
        expect(pushBytesOp(new Uint8Array([17]))).to.deep.equal({
            opcode: 1,
            data: new Uint8Array([17]),
        });
        expect(pushBytesOp(new Uint8Array([0x80]))).to.deep.equal({
            opcode: 1,
            data: new Uint8Array([0x80]),
        });
        expect(pushBytesOp(new Uint8Array([0xff]))).to.deep.equal({
            opcode: 1,
            data: new Uint8Array([0xff]),
        });

        for (let size = 2; size <= 0x4b; ++size) {
            expect(pushBytesOp(new Uint8Array(size))).to.deep.equal({
                opcode: size,
                data: new Uint8Array(size),
            });
        }

        expect(pushBytesOp(new Uint8Array(0x4c))).to.deep.equal({
            opcode: OP_PUSHDATA1,
            data: new Uint8Array(0x4c),
        });
        expect(pushBytesOp(new Uint8Array(0xff))).to.deep.equal({
            opcode: OP_PUSHDATA1,
            data: new Uint8Array(0xff),
        });
        expect(pushBytesOp(new Uint8Array(0x100))).to.deep.equal({
            opcode: OP_PUSHDATA2,
            data: new Uint8Array(0x100),
        });
        expect(pushBytesOp(new Uint8Array(0xffff))).to.deep.equal({
            opcode: OP_PUSHDATA2,
            data: new Uint8Array(0xffff),
        });
        expect(pushBytesOp(new Uint8Array(0x10000))).to.deep.equal({
            opcode: OP_PUSHDATA4,
            data: new Uint8Array(0x10000),
        });
    });
    it('pushNumberOp', () => {
        expect(pushNumberOp(0x00)).to.deep.equal(OP_0);
        expect(pushNumberOp(0x01)).to.deep.equal(OP_1);
        expect(pushNumberOp(-0x01)).to.deep.equal(OP_1NEGATE);
        expect(pushNumberOp(0x02)).to.deep.equal(OP_2);
        expect(pushNumberOp(0x7f)).to.deep.equal({
            opcode: 1,
            data: new Uint8Array([0x7f]),
        });
        expect(pushNumberOp(0x80)).to.deep.equal({
            opcode: 2,
            data: new Uint8Array([0x80, 0x00]),
        });
        expect(pushNumberOp(-0xff)).to.deep.equal({
            opcode: 2,
            data: new Uint8Array([0xff, 0x80]),
        });
        expect(pushNumberOp(0x0100)).to.deep.equal({
            opcode: 2,
            data: new Uint8Array([0x00, 0x01]),
        });
        expect(pushNumberOp(0x7fff)).to.deep.equal({
            opcode: 2,
            data: new Uint8Array([0xff, 0x7f]),
        });
        expect(pushNumberOp(-0x010000)).to.deep.equal({
            opcode: 3,
            data: new Uint8Array([0x00, 0x00, 0x81]),
        });
        expect(pushNumberOp(0xffffff)).to.deep.equal({
            opcode: 4,
            data: new Uint8Array([0xff, 0xff, 0xff, 0x00]),
        });
        expect(pushNumberOp(0x80000000)).to.deep.equal({
            opcode: 5,
            data: new Uint8Array([0x00, 0x00, 0x00, 0x80, 0x00]),
        });
        expect(pushNumberOp(-0xffffffff)).to.deep.equal({
            opcode: 5,
            data: new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x80]),
        });
        expect(pushNumberOp(0x010000000000)).to.deep.equal({
            opcode: 6,
            data: new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x01]),
        });
        expect(pushNumberOp(0x0775f05a074000n)).to.deep.equal({
            opcode: 7,
            data: new Uint8Array([0x00, 0x40, 0x07, 0x5a, 0xf0, 0x75, 0x07]),
        });
    });
});

// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import {
    OP_0,
    OP_1,
    OP_CHECKSIG,
    OP_CODESEPARATOR,
    OP_DUP,
    OP_EQUAL,
    OP_EQUALVERIFY,
    OP_HASH160,
    OP_PUSHDATA1,
} from './opcode.js';
import { isPushOp, readOp, writeOp } from './op.js';
import { Bytes, WriterBytes, fromHex, toHex } from './index.js';

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
});

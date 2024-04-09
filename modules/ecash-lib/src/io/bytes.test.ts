// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { Bytes } from './bytes.js';
import { fromHex } from './hex.js';

describe('Bytes', () => {
    it('Bytes.read* one', () => {
        expect(new Bytes(fromHex('de')).readU8()).to.equal(0xde);
        expect(new Bytes(fromHex('adde')).readU16()).to.equal(0xdead);
        expect(new Bytes(fromHex('efbeadde')).readU32()).to.equal(0xdeadbeef);
        expect(new Bytes(fromHex('fecaad0befbeadde')).readU64()).to.equal(
            0xdeadbeef0badcafen,
        );
        expect(new Bytes(fromHex('abcdef')).readBytes(3)).to.deep.equal(
            fromHex('abcdef'),
        );
    });
    it('Bytes.read* multiple', () => {
        const bytes = new Bytes(fromHex('000102030405060708090a0b0c0d0e0f10'));
        expect(bytes.idx).to.equal(0);
        expect(bytes.readU8()).to.equal(0x00);
        expect(bytes.idx).to.equal(1);
        expect(bytes.readU16()).to.equal(0x0201);
        expect(bytes.idx).to.equal(3);
        expect(bytes.readU32()).to.equal(0x06050403);
        expect(bytes.idx).to.equal(7);
        expect(bytes.readU64()).to.equal(0x0e0d0c0b0a090807n);
        expect(bytes.idx).to.equal(15);
        expect(bytes.readBytes(2)).to.deep.equal(fromHex('0f10'));
    });
    it('Bytes.read* failure', () => {
        const bytes = new Bytes(fromHex('000102030405060708090a0b0c0d0e0f10'));
        bytes.readBytes(bytes.data.length);
        expect(() => bytes.readU8()).to.throw(
            'Not enough bytes: Tried reading 1 byte(s), but there are only 0 byte(s) left',
        );
        bytes.idx -= 1; // rewind 1 byte to test error msg
        expect(() => bytes.readU16()).to.throw(
            'Not enough bytes: Tried reading 2 byte(s), but there are only 1 byte(s) left',
        );
        expect(() => bytes.readU32()).to.throw(
            'Not enough bytes: Tried reading 4 byte(s), but there are only 1 byte(s) left',
        );
        expect(() => bytes.readU64()).to.throw(
            'Not enough bytes: Tried reading 8 byte(s), but there are only 1 byte(s) left',
        );
        expect(() => bytes.readBytes(5)).to.throw(
            'Not enough bytes: Tried reading 5 byte(s), but there are only 1 byte(s) left',
        );
    });
});

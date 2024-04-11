// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import {
    ALL_ANYONECANPAY_BIP143,
    ALL_ANYONECANPAY_LEGACY,
    ALL_BIP143,
    ALL_LEGACY,
    NONE_ANYONECANPAY_BIP143,
    NONE_ANYONECANPAY_LEGACY,
    NONE_BIP143,
    NONE_LEGACY,
    SINGLE_ANYONECANPAY_BIP143,
    SINGLE_ANYONECANPAY_LEGACY,
    SINGLE_BIP143,
    SINGLE_LEGACY,
    SigHashType,
} from './sigHashType.js';

describe('SigHashType', () => {
    it('SigHashType.fromInt', () => {
        // Exhaustively test 0x00-0xff
        expect(SigHashType.fromInt(0x00)).to.equal(undefined);
        expect(SigHashType.fromInt(0x01)).to.deep.equal(ALL_LEGACY);
        expect(SigHashType.fromInt(0x02)).to.deep.equal(NONE_LEGACY);
        expect(SigHashType.fromInt(0x03)).to.deep.equal(SINGLE_LEGACY);
        for (let i = 0x04; i <= 0x40; ++i) {
            expect(SigHashType.fromInt(i)).to.equal(undefined);
        }
        expect(SigHashType.fromInt(0x41)).to.deep.equal(ALL_BIP143);
        expect(SigHashType.fromInt(0x42)).to.deep.equal(NONE_BIP143);
        expect(SigHashType.fromInt(0x43)).to.deep.equal(SINGLE_BIP143);
        for (let i = 0x44; i <= 0x80; ++i) {
            expect(SigHashType.fromInt(i)).to.equal(undefined);
        }
        expect(SigHashType.fromInt(0x81)).to.deep.equal(
            ALL_ANYONECANPAY_LEGACY,
        );
        expect(SigHashType.fromInt(0x82)).to.deep.equal(
            NONE_ANYONECANPAY_LEGACY,
        );
        expect(SigHashType.fromInt(0x83)).to.deep.equal(
            SINGLE_ANYONECANPAY_LEGACY,
        );
        for (let i = 0x84; i <= 0xc0; ++i) {
            expect(SigHashType.fromInt(i)).to.equal(undefined);
        }
        expect(SigHashType.fromInt(0xc1)).to.deep.equal(
            ALL_ANYONECANPAY_BIP143,
        );
        expect(SigHashType.fromInt(0xc2)).to.deep.equal(
            NONE_ANYONECANPAY_BIP143,
        );
        expect(SigHashType.fromInt(0xc3)).to.deep.equal(
            SINGLE_ANYONECANPAY_BIP143,
        );
        for (let i = 0xc4; i <= 0xff; ++i) {
            expect(SigHashType.fromInt(i)).to.equal(undefined);
        }
        // Any bits above 0xff not allowed
        expect(SigHashType.fromInt(0x101)).to.equal(undefined);
        expect(SigHashType.fromInt(0x10001)).to.equal(undefined);
        expect(SigHashType.fromInt(0x10000001)).to.equal(undefined);
        expect(SigHashType.fromInt(0x1000000000001)).to.equal(undefined);
        expect(SigHashType.fromInt(Infinity)).to.equal(undefined);
        expect(SigHashType.fromInt(NaN)).to.equal(undefined);
    });

    it('SigHashType.toInt', () => {
        expect(ALL_LEGACY.toInt()).to.equal(0x01);
        expect(NONE_LEGACY.toInt()).to.equal(0x02);
        expect(SINGLE_LEGACY.toInt()).to.equal(0x03);
        expect(ALL_BIP143.toInt()).to.equal(0x41);
        expect(NONE_BIP143.toInt()).to.equal(0x42);
        expect(SINGLE_BIP143.toInt()).to.equal(0x43);
        expect(ALL_ANYONECANPAY_LEGACY.toInt()).to.equal(0x81);
        expect(NONE_ANYONECANPAY_LEGACY.toInt()).to.equal(0x82);
        expect(SINGLE_ANYONECANPAY_LEGACY.toInt()).to.equal(0x83);
        expect(ALL_ANYONECANPAY_BIP143.toInt()).to.equal(0xc1);
        expect(NONE_ANYONECANPAY_BIP143.toInt()).to.equal(0xc2);
        expect(SINGLE_ANYONECANPAY_BIP143.toInt()).to.equal(0xc3);
    });
});

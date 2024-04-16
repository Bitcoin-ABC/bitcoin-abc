// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import fs from 'node:fs/promises';

import { fromHex, toHex } from './io/hex.js';
import { Script } from './script.js';
import { SignData, Tx, TxInput } from './tx.js';
import { SighashPreimage, UnsignedTx } from './unsignedTx.js';
import { sha256d } from './hash.js';
import {
    ALL_ANYONECANPAY_BIP143,
    ALL_BIP143,
    ALL_LEGACY,
    NONE_ANYONECANPAY_BIP143,
    NONE_BIP143,
    SINGLE_ANYONECANPAY_BIP143,
    SINGLE_BIP143,
} from './sigHashType.js';
import { initWasm } from './ecc.js';

const TX = new Tx({
    version: 0xfacefeed,
    inputs: [
        {
            prevOut: {
                txid: '0123456789abcdef99887766554433220000000000000000f1e2d3c4b5a69788',
                outIdx: 0xdeadbeef,
            },
            script: new Script(),
            sequence: 0x87654321,
            signData: {
                value: 0x123456789,
                outputScript: new Script(fromHex('abacadaeafb0abac')),
            },
        },
        {
            prevOut: {
                txid: new Uint8Array([...Array(32).keys()]),
                outIdx: 0x76757473,
            },
            script: new Script(),
            sequence: 0x10605,
            signData: {
                value: 0x9876,
                redeemScript: new Script(fromHex('ab778899ac55')),
            },
        },
    ],
    outputs: [
        {
            value: 0x2134,
            script: new Script(fromHex('1133557799')),
        },
        {
            value: 0x8079685746352413n,
            script: new Script(fromHex('564738291092837465')),
        },
        {
            value: 0,
            script: new Script(fromHex('6a68656c6c6f')),
        },
    ],
    locktime: 0xf00dbabe,
});

const VERSION_HEX = 'edfecefa';

const PREVOUT0_HEX =
    '8897a6b5c4d3e2f100000000000000002233445566778899efcdab8967452301' +
    'efbeadde';
const PREVOUT1_HEX =
    '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f' +
    '73747576';
const SEQUENCE0_HEX = '21436587';
const SEQUENCE1_HEX = '05060100';
const VALUE0_HEX = '8967452301000000';
const VALUE1_HEX = '7698000000000000';

const OUTPUT0_HEX = '3421000000000000' + '051133557799';
const OUTPUT1_HEX = '1324354657687980' + '09564738291092837465';
const OUTPUT2_HEX = '0000000000000000' + '066a68656c6c6f';
const OUTPUTS_HEX = OUTPUT0_HEX + OUTPUT1_HEX + OUTPUT2_HEX;

const LOCKTIME_HEX = 'beba0df0';

describe('UnsignedTx', async () => {
    // Can't use `fetch` for local file so we have to read it using `fs`
    await initWasm(fs.readFile('./src/ffi/ecash_lib_wasm_bg.wasm'));

    it('UnsignedTx.dummyFromTx', () => {
        const dummy = UnsignedTx.dummyFromTx(new Tx());
        expect(dummy.prevoutsHash).to.deep.equal(new Uint8Array(32));
        expect(dummy.sequencesHash).to.deep.equal(new Uint8Array(32));
        expect(dummy.outputsHash).to.deep.equal(new Uint8Array(32));
    });
    it('UnsignedTx.fromTx empty', () => {
        const unsigned = UnsignedTx.fromTx(new Tx());
        const emptyHash = sha256d(new Uint8Array());
        expect(unsigned.prevoutsHash).to.deep.equal(emptyHash);
        expect(unsigned.sequencesHash).to.deep.equal(emptyHash);
        expect(unsigned.outputsHash).to.deep.equal(emptyHash);
    });
    it('UnsignedTx.fromTx', () => {
        const unsigned = UnsignedTx.fromTx(TX);
        expect(unsigned.prevoutsHash).to.deep.equal(
            sha256d(fromHex(PREVOUT0_HEX + PREVOUT1_HEX)),
        );
        expect(unsigned.sequencesHash).to.deep.equal(
            sha256d(fromHex(SEQUENCE0_HEX + SEQUENCE1_HEX)),
        );
        expect(unsigned.outputsHash).to.deep.equal(
            sha256d(fromHex(OUTPUTS_HEX)),
        );
    });

    it('UnsignedTxInput.sigHashPreimage ALL', () => {
        const unsigned = UnsignedTx.fromTx(TX);

        expect(unsigned.inputAt(0).sigHashPreimage(ALL_BIP143)).to.deep.equal({
            bytes: fromHex(
                VERSION_HEX +
                    toHex(sha256d(fromHex(PREVOUT0_HEX + PREVOUT1_HEX))) +
                    toHex(sha256d(fromHex(SEQUENCE0_HEX + SEQUENCE1_HEX))) +
                    PREVOUT0_HEX +
                    '08abacadaeafb0abac' +
                    VALUE0_HEX +
                    SEQUENCE0_HEX +
                    toHex(sha256d(fromHex(OUTPUTS_HEX))) +
                    LOCKTIME_HEX +
                    '41000000',
            ),
            scriptCode: TX.inputs[0].signData!.outputScript,
            redeemScript: TX.inputs[0].signData!.outputScript,
        } as SighashPreimage);

        expect(unsigned.inputAt(1).sigHashPreimage(ALL_BIP143)).to.deep.equal({
            bytes: fromHex(
                VERSION_HEX +
                    toHex(sha256d(fromHex(PREVOUT0_HEX + PREVOUT1_HEX))) +
                    toHex(sha256d(fromHex(SEQUENCE0_HEX + SEQUENCE1_HEX))) +
                    PREVOUT1_HEX +
                    '06ab778899ac55' +
                    VALUE1_HEX +
                    SEQUENCE1_HEX +
                    toHex(sha256d(fromHex(OUTPUTS_HEX))) +
                    LOCKTIME_HEX +
                    '41000000',
            ),
            scriptCode: TX.inputs[1].signData!.redeemScript,
            redeemScript: TX.inputs[1].signData!.redeemScript,
        } as SighashPreimage);
    });

    it('UnsignedTxInput.sigHashPreimage ALL|ANYONECANPAY', () => {
        const unsigned = UnsignedTx.fromTx(TX);

        expect(
            unsigned.inputAt(0).sigHashPreimage(ALL_ANYONECANPAY_BIP143),
        ).to.deep.equal({
            bytes: fromHex(
                VERSION_HEX +
                    '00'.repeat(64) +
                    PREVOUT0_HEX +
                    '08abacadaeafb0abac' +
                    VALUE0_HEX +
                    SEQUENCE0_HEX +
                    toHex(sha256d(fromHex(OUTPUTS_HEX))) +
                    LOCKTIME_HEX +
                    'c1000000',
            ),
            scriptCode: TX.inputs[0].signData!.outputScript,
            redeemScript: TX.inputs[0].signData!.outputScript,
        } as SighashPreimage);

        expect(
            unsigned.inputAt(1).sigHashPreimage(ALL_ANYONECANPAY_BIP143),
        ).to.deep.equal({
            bytes: fromHex(
                VERSION_HEX +
                    '00'.repeat(64) +
                    PREVOUT1_HEX +
                    '06ab778899ac55' +
                    VALUE1_HEX +
                    SEQUENCE1_HEX +
                    toHex(sha256d(fromHex(OUTPUTS_HEX))) +
                    LOCKTIME_HEX +
                    'c1000000',
            ),
            scriptCode: TX.inputs[1].signData!.redeemScript,
            redeemScript: TX.inputs[1].signData!.redeemScript,
        } as SighashPreimage);
    });

    it('UnsignedTxInput.sigHashPreimage NONE', () => {
        const unsigned = UnsignedTx.fromTx(TX);

        expect(unsigned.inputAt(0).sigHashPreimage(NONE_BIP143)).to.deep.equal({
            bytes: fromHex(
                VERSION_HEX +
                    toHex(sha256d(fromHex(PREVOUT0_HEX + PREVOUT1_HEX))) +
                    '00'.repeat(32) +
                    PREVOUT0_HEX +
                    '08abacadaeafb0abac' +
                    VALUE0_HEX +
                    SEQUENCE0_HEX +
                    '00'.repeat(32) +
                    LOCKTIME_HEX +
                    '42000000',
            ),
            scriptCode: TX.inputs[0].signData!.outputScript,
            redeemScript: TX.inputs[0].signData!.outputScript,
        } as SighashPreimage);

        expect(unsigned.inputAt(1).sigHashPreimage(NONE_BIP143)).to.deep.equal({
            bytes: fromHex(
                VERSION_HEX +
                    toHex(sha256d(fromHex(PREVOUT0_HEX + PREVOUT1_HEX))) +
                    '00'.repeat(32) +
                    PREVOUT1_HEX +
                    '06ab778899ac55' +
                    VALUE1_HEX +
                    SEQUENCE1_HEX +
                    '00'.repeat(32) +
                    LOCKTIME_HEX +
                    '42000000',
            ),
            scriptCode: TX.inputs[1].signData!.redeemScript,
            redeemScript: TX.inputs[1].signData!.redeemScript,
        } as SighashPreimage);
    });

    it('UnsignedTxInput.sigHashPreimage NONE|ANYONECANPAY', () => {
        const unsigned = UnsignedTx.fromTx(TX);

        expect(
            unsigned.inputAt(0).sigHashPreimage(NONE_ANYONECANPAY_BIP143),
        ).to.deep.equal({
            bytes: fromHex(
                VERSION_HEX +
                    '00'.repeat(64) +
                    PREVOUT0_HEX +
                    '08abacadaeafb0abac' +
                    VALUE0_HEX +
                    SEQUENCE0_HEX +
                    '00'.repeat(32) +
                    LOCKTIME_HEX +
                    'c2000000',
            ),
            scriptCode: TX.inputs[0].signData!.outputScript,
            redeemScript: TX.inputs[0].signData!.outputScript,
        } as SighashPreimage);

        expect(
            unsigned.inputAt(1).sigHashPreimage(NONE_ANYONECANPAY_BIP143),
        ).to.deep.equal({
            bytes: fromHex(
                VERSION_HEX +
                    '00'.repeat(64) +
                    PREVOUT1_HEX +
                    '06ab778899ac55' +
                    VALUE1_HEX +
                    SEQUENCE1_HEX +
                    '00'.repeat(32) +
                    LOCKTIME_HEX +
                    'c2000000',
            ),
            scriptCode: TX.inputs[1].signData!.redeemScript,
            redeemScript: TX.inputs[1].signData!.redeemScript,
        } as SighashPreimage);
    });

    it('UnsignedTxInput.sigHashPreimage SINGLE', () => {
        const unsigned = UnsignedTx.fromTx(TX);

        expect(
            unsigned.inputAt(0).sigHashPreimage(SINGLE_BIP143),
        ).to.deep.equal({
            bytes: fromHex(
                VERSION_HEX +
                    toHex(sha256d(fromHex(PREVOUT0_HEX + PREVOUT1_HEX))) +
                    '00'.repeat(32) +
                    PREVOUT0_HEX +
                    '08abacadaeafb0abac' +
                    VALUE0_HEX +
                    SEQUENCE0_HEX +
                    toHex(sha256d(fromHex(OUTPUT0_HEX))) +
                    LOCKTIME_HEX +
                    '43000000',
            ),
            scriptCode: TX.inputs[0].signData!.outputScript,
            redeemScript: TX.inputs[0].signData!.outputScript,
        } as SighashPreimage);

        expect(
            unsigned.inputAt(1).sigHashPreimage(SINGLE_BIP143),
        ).to.deep.equal({
            bytes: fromHex(
                VERSION_HEX +
                    toHex(sha256d(fromHex(PREVOUT0_HEX + PREVOUT1_HEX))) +
                    '00'.repeat(32) +
                    PREVOUT1_HEX +
                    '06ab778899ac55' +
                    VALUE1_HEX +
                    SEQUENCE1_HEX +
                    toHex(sha256d(fromHex(OUTPUT1_HEX))) +
                    LOCKTIME_HEX +
                    '43000000',
            ),
            scriptCode: TX.inputs[1].signData!.redeemScript,
            redeemScript: TX.inputs[1].signData!.redeemScript,
        } as SighashPreimage);

        // If there's no corresponding output, hashOutputs will be 000...000
        const unsignedTooFewOutputs = UnsignedTx.fromTx(
            new Tx({
                ...TX,
                outputs: [],
            }),
        );
        expect(
            unsignedTooFewOutputs.inputAt(0).sigHashPreimage(SINGLE_BIP143),
        ).to.deep.equal({
            bytes: fromHex(
                VERSION_HEX +
                    toHex(sha256d(fromHex(PREVOUT0_HEX + PREVOUT1_HEX))) +
                    '00'.repeat(32) +
                    PREVOUT0_HEX +
                    '08abacadaeafb0abac' +
                    VALUE0_HEX +
                    SEQUENCE0_HEX +
                    '00'.repeat(32) +
                    LOCKTIME_HEX +
                    '43000000',
            ),
            scriptCode: TX.inputs[0].signData!.outputScript,
            redeemScript: TX.inputs[0].signData!.outputScript,
        } as SighashPreimage);
    });

    it('UnsignedTxInput.sigHashPreimage SINGLE|ANYONECANPAY', () => {
        const unsigned = UnsignedTx.fromTx(TX);

        expect(
            unsigned.inputAt(0).sigHashPreimage(SINGLE_ANYONECANPAY_BIP143),
        ).to.deep.equal({
            bytes: fromHex(
                VERSION_HEX +
                    '00'.repeat(64) +
                    PREVOUT0_HEX +
                    '08abacadaeafb0abac' +
                    VALUE0_HEX +
                    SEQUENCE0_HEX +
                    toHex(sha256d(fromHex(OUTPUT0_HEX))) +
                    LOCKTIME_HEX +
                    'c3000000',
            ),
            scriptCode: TX.inputs[0].signData!.outputScript,
            redeemScript: TX.inputs[0].signData!.outputScript,
        } as SighashPreimage);

        expect(
            unsigned.inputAt(1).sigHashPreimage(SINGLE_ANYONECANPAY_BIP143),
        ).to.deep.equal({
            bytes: fromHex(
                VERSION_HEX +
                    '00'.repeat(64) +
                    PREVOUT1_HEX +
                    '06ab778899ac55' +
                    VALUE1_HEX +
                    SEQUENCE1_HEX +
                    toHex(sha256d(fromHex(OUTPUT1_HEX))) +
                    LOCKTIME_HEX +
                    'c3000000',
            ),
            scriptCode: TX.inputs[1].signData!.redeemScript,
            redeemScript: TX.inputs[1].signData!.redeemScript,
        } as SighashPreimage);
    });

    it('UnsignedTxInput.sigHashPreimage OP_CODESEPARATOR', () => {
        const unsigned = UnsignedTx.fromTx(TX);
        expect(
            unsigned.inputAt(0).sigHashPreimage(ALL_BIP143, 0),
        ).to.deep.equal({
            bytes: fromHex(
                VERSION_HEX +
                    toHex(sha256d(fromHex(PREVOUT0_HEX + PREVOUT1_HEX))) +
                    toHex(sha256d(fromHex(SEQUENCE0_HEX + SEQUENCE1_HEX))) +
                    PREVOUT0_HEX +
                    '07acadaeafb0abac' +
                    VALUE0_HEX +
                    SEQUENCE0_HEX +
                    toHex(sha256d(fromHex(OUTPUTS_HEX))) +
                    LOCKTIME_HEX +
                    '41000000',
            ),
            scriptCode: new Script(fromHex('acadaeafb0abac')),
            redeemScript: TX.inputs[0].signData!.outputScript,
        } as SighashPreimage);

        expect(
            unsigned.inputAt(0).sigHashPreimage(ALL_BIP143, 1),
        ).to.deep.equal({
            bytes: fromHex(
                VERSION_HEX +
                    toHex(sha256d(fromHex(PREVOUT0_HEX + PREVOUT1_HEX))) +
                    toHex(sha256d(fromHex(SEQUENCE0_HEX + SEQUENCE1_HEX))) +
                    PREVOUT0_HEX +
                    '01ac' +
                    VALUE0_HEX +
                    SEQUENCE0_HEX +
                    toHex(sha256d(fromHex(OUTPUTS_HEX))) +
                    LOCKTIME_HEX +
                    '41000000',
            ),
            scriptCode: new Script(fromHex('ac')),
            redeemScript: TX.inputs[0].signData!.outputScript,
        } as SighashPreimage);

        expect(
            unsigned.inputAt(1).sigHashPreimage(ALL_BIP143, 0),
        ).to.deep.equal({
            bytes: fromHex(
                VERSION_HEX +
                    toHex(sha256d(fromHex(PREVOUT0_HEX + PREVOUT1_HEX))) +
                    toHex(sha256d(fromHex(SEQUENCE0_HEX + SEQUENCE1_HEX))) +
                    PREVOUT1_HEX +
                    '05778899ac55' +
                    VALUE1_HEX +
                    SEQUENCE1_HEX +
                    toHex(sha256d(fromHex(OUTPUTS_HEX))) +
                    LOCKTIME_HEX +
                    '41000000',
            ),
            scriptCode: new Script(fromHex('778899ac55')),
            redeemScript: TX.inputs[1].signData!.redeemScript,
        } as SighashPreimage);
    });

    it('UnsignedTxInput.sigHashPreimage failure', () => {
        expect(() =>
            UnsignedTx.fromTx(TX).inputAt(0).sigHashPreimage(ALL_LEGACY),
        ).to.throw('Legacy sighash type not implemented');

        expect(() =>
            UnsignedTx.fromTx(
                new Tx({
                    inputs: [
                        {
                            prevOut: TX.inputs[0].prevOut,
                            script: new Script(),
                            sequence: 0,
                        },
                    ],
                }),
            )
                .inputAt(0)
                .sigHashPreimage(ALL_BIP143),
        ).to.throw('Input must have signData set');

        expect(() =>
            UnsignedTx.fromTx(
                new Tx({
                    inputs: [
                        {
                            prevOut: TX.inputs[0].prevOut,
                            script: new Script(),
                            sequence: 0,
                            signData: { value: 0 },
                        },
                    ],
                }),
            )
                .inputAt(0)
                .sigHashPreimage(ALL_BIP143),
        ).to.throw('Must either set outputScript or redeemScript');

        expect(() =>
            UnsignedTx.fromTx(
                new Tx({
                    inputs: [
                        {
                            prevOut: TX.inputs[0].prevOut,
                            script: new Script(),
                            sequence: 0,
                            signData: {
                                value: 0,
                                outputScript: Script.p2sh(new Uint8Array(20)),
                            },
                        },
                    ],
                }),
            )
                .inputAt(0)
                .sigHashPreimage(ALL_BIP143),
        ).to.throw('P2SH requires redeemScript to be set, not outputScript');
    });

    it('UnsignedTxInput.txInput', () => {
        const unsigned = UnsignedTx.fromTx(TX);
        expect(unsigned.inputAt(0).txInput()).to.deep.equal(TX.inputs[0]);
        expect(unsigned.inputAt(1).txInput()).to.deep.equal(TX.inputs[1]);
    });
});

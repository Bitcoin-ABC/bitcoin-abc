// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { fromHex, toHex } from './io/hex.js';
import { Script } from './script.js';
import { Tx } from './tx.js';
// fromHex already imported as fromHex above, so use it directly

function txidToBytes(txid: string | Uint8Array | undefined): Uint8Array {
    if (!txid) {
        return new Uint8Array();
    }
    return typeof txid === 'string' ? fromHex(txid) : txid;
}

const checkTx = (tx: Tx, rawHex: string) => {
    expect(toHex(tx.ser())).to.equal(rawHex);
    expect(tx.serSize()).to.equal(rawHex.length >> 1);
};

describe('Tx', () => {
    it('checkTx', () => {
        checkTx(new Tx(), '02000000000000000000');

        checkTx(
            new Tx({ version: 0xdeadbeef, locktime: 0x12345678 }),
            'efbeadde000078563412',
        );

        // inputs have defaults
        checkTx(
            new Tx({
                version: 1,
                inputs: [
                    {
                        prevOut: {
                            txid: '0123456789abcdef99887766554433220000000000000000f1e2d3c4b5a69788',
                            outIdx: 0xdeadbeef,
                        },
                    },
                    {
                        prevOut: {
                            txid: new Uint8Array([...Array(32).keys()]),
                            outIdx: 0x76757473,
                        },
                    },
                ],
                outputs: [],
                locktime: 0,
            }),
            '01000000' + // version
                '02' + // num inputs
                '8897a6b5c4d3e2f100000000000000002233445566778899efcdab8967452301' +
                'efbeadde' + // 0th input outpoint
                '00' + // script
                'ffffffff' + // sequence
                '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f' +
                '73747576' + // 1st input outpoint
                '00' + // script
                'ffffffff' + // sequence
                '00' + // num outputs
                '00000000', // locktime
        );

        checkTx(
            new Tx({
                version: 0xfacefeed,
                inputs: [
                    {
                        prevOut: {
                            txid: '0123456789abcdef99887766554433220000000000000000f1e2d3c4b5a69788',
                            outIdx: 0xdeadbeef,
                        },
                        script: new Script(fromHex('baadcafe')),
                        sequence: 0x87654321,
                    },
                    {
                        prevOut: {
                            txid: new Uint8Array([...Array(32).keys()]),
                            outIdx: 0x76757473,
                        },
                        script: new Script(fromHex('106758494753')),
                        sequence: 0x10605,
                    },
                ],
                outputs: [
                    {
                        sats: 0x2134n,
                        script: new Script(fromHex('1133557799')),
                    },
                    {
                        sats: 0x8079685746352413n,
                        script: new Script(fromHex('564738291092837465')),
                    },
                    {
                        sats: 0n,
                        script: new Script(fromHex('6a68656c6c6f')),
                    },
                ],
                locktime: 0xf00dbabe,
            }),
            'edfecefa' + // version
                '02' + // num inputs
                '8897a6b5c4d3e2f100000000000000002233445566778899efcdab8967452301' +
                'efbeadde' + // 0th input outpoint
                '04baadcafe' + // script
                '21436587' + // sequence
                '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f' +
                '73747576' + // 1st input outpoint
                '06106758494753' + // script
                '05060100' + // sequence
                '03' + // num outputs
                '3421000000000000' + // value
                '051133557799' + // script
                '1324354657687980' + // value
                '09564738291092837465' + // script
                '0000000000000000' + // value
                '066a68656c6c6f' + // script
                'beba0df0', // locktime
        );
    });

    it('roundtrip serialization/deserialization', () => {
        const original = new Tx({
            version: 0x12345678,
            inputs: [
                {
                    prevOut: {
                        txid: new Uint8Array(32).fill(0xab),
                        outIdx: 42,
                    },
                    script: new Script(fromHex('deadbeef')),
                    sequence: 0xabcdef01,
                },
                {
                    prevOut: {
                        txid: new Uint8Array(32).fill(0xcd),
                        outIdx: 99,
                    },
                    script: new Script(fromHex('bada55')),
                    sequence: 0x12345678,
                },
            ],
            outputs: [
                {
                    sats: 123456789n,
                    script: new Script(fromHex('cafebabe')),
                },
                {
                    sats: 987654321n,
                    script: new Script(fromHex('beadfeed')),
                },
            ],
            locktime: 0xfeedface,
        });
        const ser = original.ser();
        const deser = Tx.deser(ser);

        expect(deser.version).to.equal(original.version);
        expect(deser.locktime).to.equal(original.locktime);
        expect(deser.inputs.length).to.equal(original.inputs.length);
        expect(deser.outputs.length).to.equal(original.outputs.length);
        for (let i = 0; i < original.inputs.length; ++i) {
            expect(deser.inputs[i].sequence).to.equal(
                original.inputs[i].sequence,
            );
            expect((deser.inputs[i].script ?? new Script()).toHex()).to.equal(
                (original.inputs[i].script ?? new Script()).toHex(),
            );
            expect(toHex(txidToBytes(deser.inputs[i].prevOut.txid))).to.equal(
                toHex(txidToBytes(original.inputs[i].prevOut.txid)),
            );
            expect(deser.inputs[i].prevOut.outIdx).to.equal(
                original.inputs[i].prevOut.outIdx,
            );
        }
        for (let i = 0; i < original.outputs.length; ++i) {
            expect(deser.outputs[i].sats).to.equal(original.outputs[i].sats);
            expect(deser.outputs[i].script.toHex()).to.equal(
                original.outputs[i].script.toHex(),
            );
        }

        // Also test fromHex
        const deserHex = Tx.fromHex(toHex(ser));
        expect(deserHex.version).to.equal(original.version);
        expect(deserHex.locktime).to.equal(original.locktime);
        expect(deserHex.inputs.length).to.equal(original.inputs.length);
        expect(deserHex.outputs.length).to.equal(original.outputs.length);
        for (let i = 0; i < original.inputs.length; ++i) {
            expect(deserHex.inputs[i].sequence).to.equal(
                original.inputs[i].sequence,
            );
            expect(
                (deserHex.inputs[i].script ?? new Script()).toHex(),
            ).to.equal((original.inputs[i].script ?? new Script()).toHex());
            expect(
                toHex(txidToBytes(deserHex.inputs[i].prevOut.txid)),
            ).to.equal(toHex(txidToBytes(original.inputs[i].prevOut.txid)));
            expect(deserHex.inputs[i].prevOut.outIdx).to.equal(
                original.inputs[i].prevOut.outIdx,
            );
        }
        for (let i = 0; i < original.outputs.length; ++i) {
            expect(deserHex.outputs[i].sats).to.equal(original.outputs[i].sats);
            expect(deserHex.outputs[i].script.toHex()).to.equal(
                original.outputs[i].script.toHex(),
            );
        }

        // Try a roundrip from a raw tx (txid:
        // 010114b9bbe776def1a512ad1e96a4a06ec4c34fc79bcb5d908845f5102f6b0f)
        const rawTx =
            '0200000001c69355f371948c098d9f4f27db5744c0b8f30d8ef88e390e3fff944bd36dbc74c80100006b48304502210086860e8ee3721d2ebc919dca21e44ff96a2adc287528e46e12665dc1a5af75ec02206dd0c593becad3d4055ed011f9d61468a378090e1fe4246eeb34b68744ec5e93412103bc01efabf76dafe666a98c88fe72915c4cceb26cacf6772904b3fa1fa5629765feffffff030000000000000000406a04534c500001010747454e45534953054c6f6c6c79054c4f4c4c591468747470733a2f2f636173687461622e636f6d2f4c0001084c00080162ea854d0fc00022020000000000001976a914104e67d912a7aab2a159bba141477e5867c04bfd88acbc100000000000001976a914104e67d912a7aab2a159bba141477e5867c04bfd88ac00000000';
        const deserRaw = Tx.fromHex(rawTx);
        expect(toHex(deserRaw.ser())).to.equal(rawTx);
    });

    it('deserialization errors', () => {
        // Test hex parsing errors first
        expect(() => Tx.fromHex('abc')).to.throw('Odd hex length: abc');
        expect(() => Tx.fromHex('gg')).to.throw(
            'Invalid hex pair: gg, at index 0',
        );
        expect(() => Tx.fromHex('zz')).to.throw(
            'Invalid hex pair: zz, at index 0',
        );
        expect(() => Tx.fromHex('abcdefgh')).to.throw(
            'Invalid hex pair: gh, at index 6',
        );
        expect(() => Tx.fromHex('12345')).to.throw('Odd hex length: 12345');

        // Test transaction deserialization errors (insufficient data)
        expect(() => Tx.fromHex('deadbeef')).to.throw(
            'Not enough bytes: Tried reading 1 byte(s), but there are only 0 byte(s) left',
        );
        expect(() => Tx.fromHex('')).to.throw(
            'Not enough bytes: Tried reading 4 byte(s), but there are only 0 byte(s) left',
        );
        expect(() => Tx.fromHex('00')).to.throw(
            'Not enough bytes: Tried reading 4 byte(s), but there are only 1 byte(s) left',
        );
        expect(() => Tx.fromHex('0000')).to.throw(
            'Not enough bytes: Tried reading 4 byte(s), but there are only 2 byte(s) left',
        );
        expect(() => Tx.fromHex('000000')).to.throw(
            'Not enough bytes: Tried reading 4 byte(s), but there are only 3 byte(s) left',
        );
        expect(() => Tx.fromHex('00000000')).to.throw(
            'Not enough bytes: Tried reading 1 byte(s), but there are only 0 byte(s) left',
        );

        // Test direct Tx.deser errors
        expect(() =>
            Tx.deser(new Uint8Array([0xde, 0xad, 0xbe, 0xef])),
        ).to.throw(
            'Not enough bytes: Tried reading 1 byte(s), but there are only 0 byte(s) left',
        );
        expect(() => Tx.deser(new Uint8Array([]))).to.throw(
            'Not enough bytes: Tried reading 4 byte(s), but there are only 0 byte(s) left',
        );
        expect(() => Tx.deser(new Uint8Array([0x00]))).to.throw(
            'Not enough bytes: Tried reading 4 byte(s), but there are only 1 byte(s) left',
        );
        expect(() => Tx.deser(new Uint8Array([0x00, 0x00]))).to.throw(
            'Not enough bytes: Tried reading 4 byte(s), but there are only 2 byte(s) left',
        );
        expect(() => Tx.deser(new Uint8Array([0x00, 0x00, 0x00]))).to.throw(
            'Not enough bytes: Tried reading 4 byte(s), but there are only 3 byte(s) left',
        );
        expect(() =>
            Tx.deser(new Uint8Array([0x00, 0x00, 0x00, 0x00])),
        ).to.throw(
            'Not enough bytes: Tried reading 1 byte(s), but there are only 0 byte(s) left',
        );
    });

    it('Tx.txid() for real blockchain transactions', () => {
        // eCash genesis tx
        const rawHexGenesis =
            '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4d04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000';
        const expectedTxidGenesis =
            '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b';
        const txGenesis = Tx.fromHex(rawHexGenesis);
        const txidGenesis = txGenesis.txid();
        expect(txidGenesis).to.equal(expectedTxidGenesis);

        // Check on some real transactions (same used by the Herald)
        const rawHex1 =
            '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff580392800c04904c5d650cfabe6d6d2a5055cb96fc034feb64a6533f9ba428768f019b0efc92797bb1eeae3bda05e410000000000000000800002bed8efca617000000156438393665643264663566333533343534323238370000000003a04f9b15000000001976a914ce8c8cf69a922a607e8e03e27ec014fbc24882e088ac00c2eb0b0000000017a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087a0acb903000000001976a914c36941af4c8cdf6e3156f7fe1426d05d6177890e88ac00000000';
        const expectedTxid1 =
            '0bf6e9cd974cd5fc6fbbf739a42447d41a301890e2db242295c64df63dc3ee7e';
        const tx1 = Tx.fromHex(rawHex1);
        const txid1 = tx1.txid();
        expect(txid1).to.equal(expectedTxid1);

        const rawHex2 =
            '0200000001c69355f371948c098d9f4f27db5744c0b8f30d8ef88e390e3fff944bd36dbc74c80100006b48304502210086860e8ee3721d2ebc919dca21e44ff96a2adc287528e46e12665dc1a5af75ec02206dd0c593becad3d4055ed011f9d61468a378090e1fe4246eeb34b68744ec5e93412103bc01efabf76dafe666a98c88fe72915c4cceb26cacf6772904b3fa1fa5629765feffffff030000000000000000406a04534c500001010747454e45534953054c6f6c6c79054c4f4c4c591468747470733a2f2f636173687461622e636f6d2f4c0001084c00080162ea854d0fc00022020000000000001976a914104e67d912a7aab2a159bba141477e5867c04bfd88acbc100000000000001976a914104e67d912a7aab2a159bba141477e5867c04bfd88ac00000000';
        const expectedTxid2 =
            '010114b9bbe776def1a512ad1e96a4a06ec4c34fc79bcb5d908845f5102f6b0f';
        const tx2 = Tx.fromHex(rawHex2);
        const txid2 = tx2.txid();
        expect(txid2).to.equal(expectedTxid2);
    });
});

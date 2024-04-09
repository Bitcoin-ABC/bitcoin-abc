// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { fromHex, toHex } from './io/hex.js';
import { Script } from './script.js';
import { Tx } from './tx.js';

const checkTx = (tx: Tx, rawHex: string) => {
    expect(toHex(tx.ser())).to.equal(rawHex);
    expect(tx.serSize()).to.equal(rawHex.length >> 1);
};

describe('Tx', () => {
    it('checkTx', () => {
        checkTx(new Tx(), '01000000000000000000');

        checkTx(
            new Tx({ version: 0xdeadbeef, locktime: 0x12345678 }),
            'efbeadde000078563412',
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
});

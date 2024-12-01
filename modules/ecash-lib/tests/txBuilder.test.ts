// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { ChronikClient } from 'chronik-client';

import { Ecc, EccDummy } from '../src/ecc.js';
import { sha256d, shaRmd160 } from '../src/hash.js';
import { initWasm } from '../src/initNodeJs.js';
import { fromHex, toHex } from '../src/io/hex.js';
import { pushBytesOp } from '../src/op.js';
import {
    OP_CHECKSIG,
    OP_CHECKSIGVERIFY,
    OP_CODESEPARATOR,
    OP_REVERSEBYTES,
} from '../src/opcode.js';
import { Script } from '../src/script.js';
import {
    ALL_ANYONECANPAY_BIP143,
    ALL_BIP143,
    NONE_ANYONECANPAY_BIP143,
    NONE_BIP143,
    SINGLE_ANYONECANPAY_BIP143,
    SINGLE_BIP143,
} from '../src/sigHashType.js';
import { TestRunner } from '../src/test/testRunner.js';
import {
    P2PKHSignatory,
    P2PKSignatory,
    TxBuilder,
    flagSignature,
} from '../src/txBuilder.js';
import { UnsignedTxInput } from '../src/unsignedTx.js';
import { encodeCashAddress } from 'ecashaddrjs';

const NUM_COINS = 500;
const COIN_VALUE = 100000;

const SIG_HASH_TYPES = [
    ALL_BIP143,
    ALL_ANYONECANPAY_BIP143,
    NONE_BIP143,
    NONE_ANYONECANPAY_BIP143,
    SINGLE_BIP143,
    SINGLE_ANYONECANPAY_BIP143,
];

describe('TxBuilder', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;
    let ecc: Ecc;

    before(async () => {
        await initWasm();
        runner = await TestRunner.setup();
        chronik = runner.chronik;
        ecc = runner.ecc;
        await runner.setupCoins(NUM_COINS, COIN_VALUE);
    });

    after(() => {
        runner.stop();
    });

    it('TxBuilder P2PKH Wallet with mixed outputs (TxOutput, TxOutput with Script.fromAddress(p2pkh), TxOutput with Script.fromAddress(p2sh))', async () => {
        // Setup simple single-address P2PKH wallet
        const sk = fromHex(
            '112233445566778899001122334455667788990011223344556677889900aabb',
        );
        const pk = ecc.derivePubkey(sk);
        const pkh = shaRmd160(pk);
        const p2pkh = Script.p2pkh(pkh);

        // Recipient script
        const recipientPkh = fromHex(
            '0123456789012345678901234567890123456789',
        );
        const recipientScript = Script.p2pkh(recipientPkh);

        // Add another p2pkh recipient using an address
        const otherRecipientAddressP2pkh = encodeCashAddress(
            'ecash',
            'p2pkh',
            '9876543210987654321098765432109876543210',
        );

        // Add a p2sh recipient using an address
        const otherRecipientAddressP2sh = encodeCashAddress(
            'ecash',
            'p2sh',
            '9876543210987654321098765432109876543210',
        );

        // Send some UTXOs to the wallet
        await runner.sendToScript(90000, p2pkh);
        await runner.sendToScript(90000, p2pkh);

        const utxos = await chronik.script('p2pkh', toHex(pkh)).utxos();
        expect(utxos.utxos.length).to.equal(2);

        const txBuild = new TxBuilder({
            // Use all UTXOs of the wallet as input
            inputs: utxos.utxos.map(utxo => ({
                input: {
                    prevOut: utxo.outpoint,
                    signData: {
                        value: utxo.value,
                        outputScript: p2pkh,
                    },
                },
                signatory: P2PKHSignatory(sk, pk, ALL_BIP143),
            })),
            outputs: [
                // Recipient using a TxOutput
                { value: 120000, script: recipientScript },
                // Recipient using a TxOutputAddress (p2pkh)
                {
                    value: 10000,
                    script: Script.fromAddress(otherRecipientAddressP2pkh),
                },
                // Recipient using a TxOutputAddress (p2sh)
                {
                    value: 10000,
                    script: Script.fromAddress(otherRecipientAddressP2sh),
                },
                // Leftover change back to wallet
                p2pkh,
            ],
        });
        const spendTx = txBuild.sign(ecc, 1000, 546);
        const txid = (await chronik.broadcastTx(spendTx.ser())).txid;

        // Now have 1 UTXO change in the wallet
        const newUtxos = await chronik.script('p2pkh', toHex(pkh)).utxos();
        expect(newUtxos.utxos).to.deep.equal([
            {
                outpoint: {
                    txid,
                    outIdx: 3,
                },
                blockHeight: -1,
                isCoinbase: false,
                value: 90000 * 2 - 120000 - 10000 - 10000 - spendTx.serSize(),
                isFinal: false,
            },
        ]);
    });

    it('TxBuilder P2PKH', async () => {
        const sk = fromHex(
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        );
        const pk = ecc.derivePubkey(sk);
        const pkh = shaRmd160(pk);
        const p2pkh = Script.p2pkh(pkh);

        for (const sigHashType of SIG_HASH_TYPES) {
            const txid = await runner.sendToScript(90000, p2pkh);
            const txBuild = new TxBuilder({
                inputs: [
                    {
                        input: {
                            prevOut: {
                                txid,
                                outIdx: 0,
                            },
                            signData: {
                                value: 90000,
                                outputScript: p2pkh,
                            },
                        },
                        signatory: P2PKHSignatory(sk, pk, sigHashType),
                    },
                ],
                outputs: [p2pkh],
            });
            const spendTx = txBuild.sign(ecc, 1000, 546);
            await chronik.broadcastTx(spendTx.ser());
        }
    });

    it('TxBuilder P2PK', async () => {
        const sk = fromHex(
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        );
        const pk = ecc.derivePubkey(sk);
        const p2pk = Script.fromOps([pushBytesOp(pk), OP_CHECKSIG]);

        for (const sigHashType of SIG_HASH_TYPES) {
            const txid = await runner.sendToScript(90000, p2pk);
            const txBuild = new TxBuilder({
                inputs: [
                    {
                        input: {
                            prevOut: {
                                txid,
                                outIdx: 0,
                            },
                            signData: {
                                value: 90000,
                                outputScript: p2pk,
                            },
                        },
                        signatory: P2PKSignatory(sk, sigHashType),
                    },
                ],
                outputs: [p2pk],
            });
            const spendTx = txBuild.sign(ecc, 1000, 546);
            await chronik.broadcastTx(spendTx.ser());
        }
    });

    it('TxBuilder P2PK ECDSA', async () => {
        const sk = fromHex(
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        );
        const pk = ecc.derivePubkey(sk);
        const p2pk = Script.fromOps([pushBytesOp(pk), OP_CHECKSIG]);

        for (const sigHashType of SIG_HASH_TYPES) {
            const txid = await runner.sendToScript(90000, p2pk);
            const txBuild = new TxBuilder({
                inputs: [
                    {
                        input: {
                            prevOut: {
                                txid,
                                outIdx: 0,
                            },
                            sequence: 0x92345678,
                            signData: {
                                value: 90000,
                                outputScript: p2pk,
                            },
                        },
                        signatory: (
                            ecc: Ecc,
                            input: UnsignedTxInput,
                        ): Script => {
                            const preimage = input.sigHashPreimage(sigHashType);
                            const sighash = sha256d(preimage.bytes);
                            const sig = flagSignature(
                                ecc.ecdsaSign(sk, sighash),
                                sigHashType,
                            );
                            return Script.fromOps([pushBytesOp(sig)]);
                        },
                    },
                ],
                outputs: [p2pk],
            });
            const spendTx = txBuild.sign(ecc, 1000, 546);
            await chronik.broadcastTx(spendTx.ser());
        }
    });

    it('TxBuilder P2SH with reversed signature OP_CHECKSIG', async () => {
        const sk = fromHex(
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        );
        const pk = ecc.derivePubkey(sk);
        const redeemScript = Script.fromOps([
            OP_REVERSEBYTES,
            pushBytesOp(pk),
            OP_CHECKSIG,
        ]);
        const p2sh = Script.p2sh(shaRmd160(redeemScript.bytecode));

        for (const sigHashType of SIG_HASH_TYPES) {
            const txid = await runner.sendToScript(90000, p2sh);
            const txBuild = new TxBuilder({
                inputs: [
                    {
                        input: {
                            prevOut: {
                                txid,
                                outIdx: 0,
                            },
                            signData: {
                                value: 90000,
                                redeemScript,
                            },
                        },
                        signatory: (
                            ecc: Ecc,
                            input: UnsignedTxInput,
                        ): Script => {
                            const preimage = input.sigHashPreimage(sigHashType);
                            const sighash = sha256d(preimage.bytes);
                            const sig = flagSignature(
                                ecc.schnorrSign(sk, sighash),
                                sigHashType,
                            );
                            sig.reverse();
                            return Script.fromOps([
                                pushBytesOp(sig),
                                pushBytesOp(preimage.redeemScript.bytecode),
                            ]);
                        },
                    },
                ],
                outputs: [p2sh],
            });
            const spendTx = txBuild.sign(ecc, 1000, 546);
            await chronik.broadcastTx(spendTx.ser());
        }
    });

    it('TxBuilder OP_CODESEPERATOR', async () => {
        const sk1 = fromHex('11'.repeat(32));
        const pk1 = ecc.derivePubkey(sk1);
        const sk2 = fromHex('22'.repeat(32));
        const pk2 = ecc.derivePubkey(sk2);
        const sk3 = fromHex('33'.repeat(32));
        const pk3 = ecc.derivePubkey(sk3);
        const redeemScript = Script.fromOps([
            OP_CODESEPARATOR,
            pushBytesOp(pk1),
            OP_CODESEPARATOR,
            OP_CHECKSIGVERIFY,
            OP_CODESEPARATOR,
            pushBytesOp(pk2),
            OP_CHECKSIGVERIFY,
            OP_CODESEPARATOR,
            pushBytesOp(pk3),
            OP_CHECKSIG,
            OP_CODESEPARATOR,
        ]);
        const p2sh = Script.p2sh(shaRmd160(redeemScript.bytecode));

        for (const sigHashType of SIG_HASH_TYPES) {
            const txid = await runner.sendToScript(90000, p2sh);
            const txBuild = new TxBuilder({
                inputs: [
                    {
                        input: {
                            prevOut: {
                                txid,
                                outIdx: 0,
                            },
                            sequence: 0x98765432,
                            signData: {
                                value: 90000,
                                redeemScript,
                            },
                        },
                        signatory: (
                            ecc: Ecc,
                            input: UnsignedTxInput,
                        ): Script => {
                            const sks = [sk1, sk2, sk3];
                            const sigs = [...Array(3).keys()].map(i => {
                                // Sign with nCodesep = 1, 2, 3
                                const preimage = input.sigHashPreimage(
                                    sigHashType,
                                    i + 1,
                                );
                                return flagSignature(
                                    ecc.schnorrSign(
                                        sks[i],
                                        sha256d(preimage.bytes),
                                    ),
                                    sigHashType,
                                );
                            });
                            return Script.fromOps([
                                pushBytesOp(sigs[2]),
                                pushBytesOp(sigs[1]),
                                pushBytesOp(sigs[0]),
                                pushBytesOp(redeemScript.bytecode),
                            ]);
                        },
                    },
                ],
                outputs: [p2sh],
            });
            const spendTx = txBuild.sign(ecc, 1000, 546);
            await chronik.broadcastTx(spendTx.ser());
        }
    });

    it('TxBuilder leftover calculation', async () => {
        const sk1 = fromHex('11'.repeat(32));
        const pk1 = ecc.derivePubkey(sk1);
        const sk2 = fromHex('22'.repeat(32));
        const pk2 = ecc.derivePubkey(sk2);
        const redeemScript = Script.fromOps([
            pushBytesOp(pk1),
            OP_CHECKSIGVERIFY,
            pushBytesOp(pk2),
            OP_CHECKSIG,
        ]);
        const p2sh = Script.p2sh(shaRmd160(redeemScript.bytecode));
        const txid = await runner.sendToScript(90000, p2sh);
        const txBuild = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid,
                            outIdx: 0,
                        },
                        signData: {
                            value: 90000,
                            redeemScript,
                        },
                    },
                    signatory: (ecc: Ecc, input: UnsignedTxInput): Script => {
                        const sks = [sk1, sk2];
                        const sigs = [...Array(2).keys()].map(i => {
                            const preimage = input.sigHashPreimage(ALL_BIP143);
                            return flagSignature(
                                ecc.schnorrSign(
                                    sks[i],
                                    sha256d(preimage.bytes),
                                ),
                                ALL_BIP143,
                            );
                        });
                        return Script.fromOps([
                            pushBytesOp(sigs[1]),
                            pushBytesOp(sigs[0]),
                            pushBytesOp(redeemScript.bytecode),
                        ]);
                    },
                },
            ],
            outputs: [
                {
                    value: 20000,
                    script: Script.p2pkh(shaRmd160(pk1)),
                },
                Script.p2pkh(shaRmd160(pk2)),
                {
                    value: 30000,
                    script: Script.p2pkh(shaRmd160(pk2)),
                },
            ],
        });

        // 0sats/kB (not broadcast)
        let spendTx = txBuild.sign(ecc, 0, 546);
        expect(spendTx.outputs[1].value).to.equal(40000n);

        // 1ksats/kB
        spendTx = txBuild.sign(ecc, 1000, 546);
        await chronik.broadcastTx(spendTx.ser());
        expect(spendTx.outputs[1].value).to.equal(
            BigInt(40000 - spendTx.serSize()),
        );

        // 10ksats/kB
        txBuild.inputs[0].input.prevOut.txid = await runner.sendToScript(
            90000,
            p2sh,
        );
        spendTx = txBuild.sign(ecc, 10000, 546);
        await chronik.broadcastTx(spendTx.ser());
        expect(spendTx.outputs[1].value).to.equal(
            BigInt(40000 - 10 * spendTx.serSize()),
        );

        // 100ksats/kB
        txBuild.inputs[0].input.prevOut.txid = await runner.sendToScript(
            90000,
            p2sh,
        );
        spendTx = txBuild.sign(ecc, 100000, 546);
        await chronik.broadcastTx(spendTx.ser());
        expect(spendTx.outputs[1].value).to.equal(
            BigInt(40000 - 100 * spendTx.serSize()),
        );

        // 120ksats/kB, deletes leftover output
        txBuild.inputs[0].input.prevOut.txid = await runner.sendToScript(
            90000,
            p2sh,
        );
        spendTx = txBuild.sign(ecc, 120000, 546);
        await chronik.broadcastTx(spendTx.ser());
        expect(spendTx.outputs.length).to.equal(2);

        // 100ksats/kB with a 5000 dust limit deletes leftover too
        txBuild.inputs[0].input.prevOut.txid = await runner.sendToScript(
            90000,
            p2sh,
        );
        spendTx = txBuild.sign(ecc, 100000, /*dustLimit=*/ 5000);
        await chronik.broadcastTx(spendTx.ser());
        expect(spendTx.outputs.length).to.equal(2);

        // 1000ksats/kB does't have sufficient sats even without leftover
        txBuild.inputs[0].input.prevOut.txid = await runner.sendToScript(
            90000,
            p2sh,
        );
        expect(() => txBuild.sign(ecc, 1000000, 546)).to.throw(
            `Insufficient input value (90000): Can only pay for 40000 fees, ` +
                `but ${spendTx.serSize() * 1000} required`,
        );
    });

    it('TxBuilder leftover using Script.fromAddress for leftover (change) output', async () => {
        const sk1 = fromHex('11'.repeat(32));
        const pk1 = ecc.derivePubkey(sk1);
        const sk2 = fromHex('22'.repeat(32));
        const pk2 = ecc.derivePubkey(sk2);
        const leftoverAddress = encodeCashAddress(
            'ecash',
            'p2pkh',
            fromHex('33'.repeat(20)),
        );
        const redeemScript = Script.fromOps([
            pushBytesOp(pk1),
            OP_CHECKSIGVERIFY,
            pushBytesOp(pk2),
            OP_CHECKSIG,
        ]);
        const p2sh = Script.p2sh(shaRmd160(redeemScript.bytecode));
        const txid = await runner.sendToScript(90000, p2sh);
        const txBuild = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid,
                            outIdx: 0,
                        },
                        signData: {
                            value: 90000,
                            redeemScript,
                        },
                    },
                    signatory: (ecc: Ecc, input: UnsignedTxInput): Script => {
                        const sks = [sk1, sk2];
                        const sigs = [...Array(2).keys()].map(i => {
                            const preimage = input.sigHashPreimage(ALL_BIP143);
                            return flagSignature(
                                ecc.schnorrSign(
                                    sks[i],
                                    sha256d(preimage.bytes),
                                ),
                                ALL_BIP143,
                            );
                        });
                        return Script.fromOps([
                            pushBytesOp(sigs[1]),
                            pushBytesOp(sigs[0]),
                            pushBytesOp(redeemScript.bytecode),
                        ]);
                    },
                },
            ],
            outputs: [
                {
                    value: 20000,
                    script: Script.p2pkh(shaRmd160(pk1)),
                },
                {
                    value: 30000,
                    script: Script.p2pkh(shaRmd160(pk2)),
                },
                // Leftover (change) output is specified as Script
                Script.fromAddress(leftoverAddress),
            ],
        });

        // 0sats/kB (not broadcast)
        let spendTx = txBuild.sign(ecc, 0, 546);
        expect(spendTx.outputs[2].value).to.equal(40000n);

        // 1ksats/kB
        spendTx = txBuild.sign(ecc, 1000, 546);
        await chronik.broadcastTx(spendTx.ser());
        expect(spendTx.outputs[2].value).to.equal(
            BigInt(40000 - spendTx.serSize()),
        );
    });

    it('TxBuilder leftover with 0xFD outputs', async () => {
        const sk = fromHex('11'.repeat(32));
        const pk = ecc.derivePubkey(sk);
        const pkh = shaRmd160(pk);
        const p2pkh = Script.p2pkh(pkh);
        const sk2 = fromHex('22'.repeat(32));
        const pk2 = ecc.derivePubkey(sk2);
        const txBuild = new TxBuilder();
        for (let i = 0; i < 2; ++i) {
            txBuild.inputs.push({
                input: {
                    prevOut: {
                        txid: await runner.sendToScript(90000, p2pkh),
                        outIdx: 0,
                    },
                    signData: {
                        value: 90000,
                        outputScript: p2pkh,
                    },
                },
                signatory: P2PKHSignatory(sk, pk, ALL_BIP143),
            });
        }
        txBuild.outputs.push(Script.p2pkh(shaRmd160(pk2)));
        const txSize = 8896;
        const extraOutput = {
            value: 90000 * 2 - (txSize + 252 * 546),
            script: p2pkh,
        };
        txBuild.outputs.push(extraOutput);
        for (let i = 0; i < 251; ++i) {
            txBuild.outputs.push({ value: 546, script: p2pkh });
        }
        expect(txBuild.outputs.length).to.equal(253);
        let spendTx = txBuild.sign(ecc, 1000, 546);
        expect(spendTx.serSize()).to.equal(txSize);
        expect(spendTx.outputs[0].value).to.equal(BigInt(546));

        // If we remove the leftover output from the tx, we also remove 2 extra
        // bytes from the VARSIZE of the output, because 253 requires 3 bytes to
        // encode and 252 requires just 1 byte to encode.
        const p2pkhSize = 8 + 1 + 25;
        const smallerSize = txSize - p2pkhSize - 2;
        // We can add 2 extra sats for the VARSIZE savings and it's handled fine
        extraOutput.value += 546 + p2pkhSize + 2;
        spendTx = txBuild.sign(ecc, 1000, 546);
        expect(spendTx.serSize()).to.equal(smallerSize);
        expect(spendTx.outputs.length).to.equal(252);

        // Adding 1 extra sat -> fails -> showing that the previous tx was exact
        extraOutput.value += 1;
        expect(() => txBuild.sign(ecc, 1000, 546)).to.throw(
            `Insufficient input value (180000): Can only pay for ` +
                `${smallerSize - 1} fees, but ${smallerSize} required`,
        );
    });

    it('TxBuilder signatory dependent on outputs', async () => {
        // Size of a tx with 1 input with empty scriptSig
        const expectedSize =
            4 + // nVersion
            1 + // num inputs
            36 + // prevOut
            1 + // script len
            4 + // nSequence
            1 + // num outputs
            4; // locktime
        const txBuild = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: toHex(new Uint8Array(32)),
                            outIdx: 0,
                        },
                        signData: {
                            value: expectedSize,
                        },
                    },
                    signatory: (_, input) => {
                        // returns OP_0 * number outputs
                        // -> estimation will start this with 1 leftover output
                        // and then with no outputs.
                        return new Script(
                            new Uint8Array(input.unsignedTx.tx.outputs.length),
                        );
                    },
                },
            ],
            // Leftover script, but will be spliced out again
            outputs: [new Script()],
        });
        const tx = txBuild.sign(new EccDummy(), 1000, 9999);
        expect(tx.serSize()).to.equal(expectedSize);
    });

    it('TxBuilder leftover failure', async () => {
        const txBuild = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid: new Uint8Array(32),
                            outIdx: 0,
                        },
                    },
                },
            ],
            outputs: [new Script()],
        });
        expect(() => txBuild.sign(ecc, 1000, 545)).to.throw(
            'Using a leftover output requires setting SignData.value for all inputs',
        );
        txBuild.inputs[0].input.signData = { value: 1234 };
        expect(() => txBuild.sign(ecc, 1000)).to.throw(
            'Using a leftover output requires setting dustLimit',
        );
        expect(() => txBuild.sign(ecc, 0.1)).to.throw(
            'feePerKb must be an integer',
        );
        expect(() => txBuild.sign(ecc)).to.throw(
            'Using a leftover output requires setting feePerKb',
        );
    });
});

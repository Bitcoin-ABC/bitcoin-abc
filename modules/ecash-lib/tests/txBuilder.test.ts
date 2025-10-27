// Copyright (c) 2024-2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { ChronikClient } from 'chronik-client';

import { Ecc, EccDummy } from '../src/ecc.js';
import { sha256d, shaRmd160 } from '../src/hash.js';
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
import '../src/initNodeJs.js';

const NUM_COINS = 500;
const COIN_VALUE = 100000n;

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
    const ecc = new Ecc();

    before(async () => {
        runner = await TestRunner.setup();
        chronik = runner.chronik;
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
        await runner.sendToScript(90000n, p2pkh);
        await runner.sendToScript(90000n, p2pkh);

        const utxos = await chronik.script('p2pkh', toHex(pkh)).utxos();
        expect(utxos.utxos.length).to.equal(2);

        const txBuild = new TxBuilder({
            // Use all UTXOs of the wallet as input
            inputs: utxos.utxos.map(utxo => ({
                input: {
                    prevOut: utxo.outpoint,
                    signData: {
                        sats: utxo.sats,
                        outputScript: p2pkh,
                    },
                },
                signatory: P2PKHSignatory(sk, pk, ALL_BIP143),
            })),
            outputs: [
                // Recipient using a TxOutput
                { sats: 120000n, script: recipientScript },
                // Recipient using a TxOutputAddress (p2pkh)
                {
                    sats: 10000n,
                    script: Script.fromAddress(otherRecipientAddressP2pkh),
                },
                // Recipient using a TxOutputAddress (p2sh)
                {
                    sats: 10000n,
                    script: Script.fromAddress(otherRecipientAddressP2sh),
                },
                // Leftover change back to wallet
                p2pkh,
            ],
        });
        const spendTx = txBuild.sign({ feePerKb: 1000n, dustSats: 546n });

        // We can go back to a TxBuilder from a Tx
        const txBuilderFromTx = TxBuilder.fromTx(spendTx);
        // We can sign it again and get the same serialized Tx
        txBuilderFromTx.sign({ feePerKb: 1000n, dustSats: 546n });
        const serializedTxFromTx = txBuilderFromTx
            .sign({ feePerKb: 1000n, dustSats: 546n })
            .ser();
        expect(spendTx.ser()).to.deep.equal(serializedTxFromTx);

        const estimatedSize = txBuild
            .sign({ ecc: new EccDummy(), feePerKb: 1000n, dustSats: 546n })
            .serSize();
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
                sats: BigInt(
                    90000 * 2 - 120000 - 10000 - 10000 - estimatedSize,
                ),
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
            const txid = await runner.sendToScript(90000n, p2pkh);
            const txBuild = new TxBuilder({
                inputs: [
                    {
                        input: {
                            prevOut: {
                                txid,
                                outIdx: 0,
                            },
                            signData: {
                                sats: 90000n,
                                outputScript: p2pkh,
                            },
                        },
                        signatory: P2PKHSignatory(sk, pk, sigHashType),
                    },
                ],
                outputs: [p2pkh],
            });
            const spendTx = txBuild.sign({ feePerKb: 1000n, dustSats: 546n });

            // We can go back to a TxBuilder from a Tx
            const txBuilderFromTx = TxBuilder.fromTx(spendTx);
            // We can sign it again and get the same serialized Tx
            txBuilderFromTx.sign({ feePerKb: 1000n, dustSats: 546n });
            const serializedTxFromTx = txBuilderFromTx
                .sign({ feePerKb: 1000n, dustSats: 546n })
                .ser();
            expect(spendTx.ser()).to.deep.equal(serializedTxFromTx);

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
            const txid = await runner.sendToScript(90000n, p2pk);
            const txBuild = new TxBuilder({
                inputs: [
                    {
                        input: {
                            prevOut: {
                                txid,
                                outIdx: 0,
                            },
                            signData: {
                                sats: 90000n,
                                outputScript: p2pk,
                            },
                        },
                        signatory: P2PKSignatory(sk, sigHashType),
                    },
                ],
                outputs: [p2pk],
            });
            const spendTx = txBuild.sign({ feePerKb: 1000n, dustSats: 546n });

            // We can go back to a TxBuilder from a Tx
            const txBuilderFromTx = TxBuilder.fromTx(spendTx);
            // We can sign it again and get the same serialized Tx
            txBuilderFromTx.sign({ feePerKb: 1000n, dustSats: 546n });
            const serializedTxFromTx = txBuilderFromTx
                .sign({ feePerKb: 1000n, dustSats: 546n })
                .ser();
            expect(spendTx.ser()).to.deep.equal(serializedTxFromTx);

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
            const txid = await runner.sendToScript(90000n, p2pk);
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
                                sats: 90000n,
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
            const spendTx = txBuild.sign({ feePerKb: 1000n, dustSats: 546n });

            // We can go back to a TxBuilder from a Tx
            const txBuilderFromTx = TxBuilder.fromTx(spendTx);
            // We can sign it again and get the same serialized Tx
            txBuilderFromTx.sign({ feePerKb: 1000n, dustSats: 546n });
            const serializedTxFromTx = txBuilderFromTx
                .sign({ feePerKb: 1000n, dustSats: 546n })
                .ser();
            expect(spendTx.ser()).to.deep.equal(serializedTxFromTx);

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
            const txid = await runner.sendToScript(90000n, p2sh);
            const txBuild = new TxBuilder({
                inputs: [
                    {
                        input: {
                            prevOut: {
                                txid,
                                outIdx: 0,
                            },
                            signData: {
                                sats: 90000n,
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
            const spendTx = txBuild.sign({ feePerKb: 1000n, dustSats: 546n });

            // We can go back to a TxBuilder from a Tx
            const txBuilderFromTx = TxBuilder.fromTx(spendTx);
            // We can sign it again and get the same serialized Tx
            txBuilderFromTx.sign({ feePerKb: 1000n, dustSats: 546n });
            const serializedTxFromTx = txBuilderFromTx
                .sign({ feePerKb: 1000n, dustSats: 546n })
                .ser();
            expect(spendTx.ser()).to.deep.equal(serializedTxFromTx);

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
            const txid = await runner.sendToScript(90000n, p2sh);
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
                                sats: 90000n,
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
            const spendTx = txBuild.sign({ feePerKb: 1000n, dustSats: 546n });
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
        const txid = await runner.sendToScript(90000n, p2sh);
        const txBuild = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid,
                            outIdx: 0,
                        },
                        signData: {
                            sats: 90000n,
                            redeemScript,
                        },
                    },
                    signatory: (ecc: Ecc, input: UnsignedTxInput): Script => {
                        const sks = [sk1, sk2];
                        const sigs = [...Array(2).keys()].map(i => {
                            const preimage = input.sigHashPreimage(ALL_BIP143);
                            // We use ECDSA to test correct EccDummy usage.
                            // Schnorr signatures would be fixed length and not give us
                            // test coverage for size calculation using dummy sigs.
                            return flagSignature(
                                ecc.ecdsaSign(sks[i], sha256d(preimage.bytes)),
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
                    sats: 20000n,
                    script: Script.p2pkh(shaRmd160(pk1)),
                },
                Script.p2pkh(shaRmd160(pk2)),
                {
                    sats: 30000n,
                    script: Script.p2pkh(shaRmd160(pk2)),
                },
            ],
        });

        // 0sats/kB (not broadcast)
        let spendTx = txBuild.sign({
            ecc: new EccDummy(),
            feePerKb: 0n,
            dustSats: 546n,
        });
        expect(spendTx.outputs[1].sats).to.equal(40000n);

        // 1ksats/kB
        spendTx = txBuild.sign({ feePerKb: 1000n, dustSats: 546n });
        await chronik.broadcastTx(spendTx.ser());
        let estimatedSize = txBuild
            .sign({ ecc: new EccDummy(), feePerKb: 1000n, dustSats: 546n })
            .serSize();
        expect(spendTx.outputs[1].sats).to.equal(BigInt(40000 - estimatedSize));

        // 10ksats/kB
        txBuild.inputs[0].input.prevOut.txid = await runner.sendToScript(
            90000n,
            p2sh,
        );
        spendTx = txBuild.sign({ feePerKb: 10000n, dustSats: 546n });
        await chronik.broadcastTx(spendTx.ser());
        estimatedSize = txBuild
            .sign({ ecc: new EccDummy(), feePerKb: 10000n, dustSats: 546n })
            .serSize();
        expect(spendTx.outputs[1].sats).to.equal(
            BigInt(40000 - 10 * estimatedSize),
        );

        // 100ksats/kB
        txBuild.inputs[0].input.prevOut.txid = await runner.sendToScript(
            90000n,
            p2sh,
        );
        spendTx = txBuild.sign({ feePerKb: 100000n, dustSats: 546n });
        await chronik.broadcastTx(spendTx.ser());
        estimatedSize = txBuild
            .sign({ ecc: new EccDummy(), feePerKb: 100000n, dustSats: 546n })
            .serSize();
        expect(spendTx.outputs[1].sats).to.equal(
            BigInt(40000 - 100 * estimatedSize),
        );

        // 117.6ksats/kB, deletes leftover output
        txBuild.inputs[0].input.prevOut.txid = await runner.sendToScript(
            90000n,
            p2sh,
        );
        spendTx = txBuild.sign({ feePerKb: 117600n, dustSats: 546n });
        const estimatedSizeNoLeftover = txBuild
            .sign({ ecc: new EccDummy(), feePerKb: 117600n, dustSats: 546n })
            .serSize();
        await chronik.broadcastTx(spendTx.ser());
        expect(spendTx.outputs.length).to.equal(2);

        // 100ksats/kB with a 5000 dust limit deletes leftover too
        txBuild.inputs[0].input.prevOut.txid = await runner.sendToScript(
            90000n,
            p2sh,
        );
        spendTx = txBuild.sign({ feePerKb: 100000n, dustSats: 5000n });
        await chronik.broadcastTx(spendTx.ser());
        expect(spendTx.outputs.length).to.equal(2);

        // 1000ksats/kB does't have sufficient sats even without leftover
        txBuild.inputs[0].input.prevOut.txid = await runner.sendToScript(
            90000n,
            p2sh,
        );
        expect(() =>
            txBuild.sign({ feePerKb: 1000000n, dustSats: 546n }),
        ).to.throw(
            `Insufficient input sats (90000): Can only pay for 40000 fees, ` +
                `but ${estimatedSizeNoLeftover * 1000} required`,
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
        const txid = await runner.sendToScript(90000n, p2sh);
        const txBuild = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: {
                            txid,
                            outIdx: 0,
                        },
                        signData: {
                            sats: 90000n,
                            redeemScript,
                        },
                    },
                    signatory: (ecc: Ecc, input: UnsignedTxInput): Script => {
                        const sks = [sk1, sk2];
                        const sigs = [...Array(2).keys()].map(i => {
                            const preimage = input.sigHashPreimage(ALL_BIP143);
                            return flagSignature(
                                ecc.ecdsaSign(sks[i], sha256d(preimage.bytes)),
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
                    sats: 20000n,
                    script: Script.p2pkh(shaRmd160(pk1)),
                },
                {
                    sats: 30000n,
                    script: Script.p2pkh(shaRmd160(pk2)),
                },
                // Leftover (change) output is specified as Script
                Script.fromAddress(leftoverAddress),
            ],
        });

        // 0sats/kB (not broadcast)
        let spendTx = txBuild.sign({ feePerKb: 0n, dustSats: 546n });
        expect(spendTx.outputs[2].sats).to.equal(40000n);

        // 1ksats/kB
        spendTx = txBuild.sign({ feePerKb: 1000n, dustSats: 546n });
        await chronik.broadcastTx(spendTx.ser());
        const estimatedSize = txBuild
            .sign({ ecc: new EccDummy(), feePerKb: 1000n, dustSats: 546n })
            .serSize();
        expect(spendTx.outputs[2].sats).to.equal(BigInt(40000 - estimatedSize));
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
                        txid: await runner.sendToScript(90000n, p2pkh),
                        outIdx: 0,
                    },
                    signData: {
                        sats: 90000n,
                        outputScript: p2pkh,
                    },
                },
                signatory: P2PKHSignatory(sk, pk, ALL_BIP143),
            });
        }
        txBuild.outputs.push(Script.p2pkh(shaRmd160(pk2)));
        const txSize = 8896;
        const extraOutput = {
            sats: BigInt(90000 * 2 - (txSize + 252 * 546)),
            script: p2pkh,
        };
        txBuild.outputs.push(extraOutput);
        for (let i = 0; i < 251; ++i) {
            txBuild.outputs.push({ sats: 546n, script: p2pkh });
        }
        expect(txBuild.outputs.length).to.equal(253);
        let spendTx = txBuild.sign({ feePerKb: 1000n, dustSats: 546n });
        expect(spendTx.serSize()).to.equal(txSize);
        expect(spendTx.outputs[0].sats).to.equal(BigInt(546));

        // If we remove the leftover output from the tx, we also remove 2 extra
        // bytes from the VARSIZE of the output, because 253 requires 3 bytes to
        // encode and 252 requires just 1 byte to encode.
        const p2pkhSize = 8 + 1 + 25;
        const smallerSize = txSize - p2pkhSize - 2;
        // We can add 2 extra sats for the VARSIZE savings and it's handled fine
        extraOutput.sats += 546n + BigInt(p2pkhSize) + 2n;
        spendTx = txBuild.sign({ feePerKb: 1000n, dustSats: 546n });
        expect(spendTx.serSize()).to.equal(smallerSize);
        expect(spendTx.outputs.length).to.equal(252);

        // Adding 1 extra sat -> fails -> showing that the previous tx was exact
        extraOutput.sats += 1n;
        expect(() =>
            txBuild.sign({ feePerKb: 1000n, dustSats: 546n }),
        ).to.throw(
            `Insufficient input sats (180000): Can only pay for ` +
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
                            sats: BigInt(expectedSize),
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
        const tx = txBuild.sign({
            ecc: new EccDummy(),
            feePerKb: 1000n,
            dustSats: 9999n,
        });
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
        expect(() =>
            txBuild.sign({ feePerKb: 1000n, dustSats: 546n }),
        ).to.throw(
            'Using a leftover output requires setting SignData.sats for all inputs',
        );
        txBuild.inputs[0].input.signData = { sats: 1234n };
        expect(() => txBuild.sign({ feePerKb: 1000n })).to.throw(
            'Using a leftover output requires setting dustSats',
        );
        expect(() =>
            txBuild.sign({ feePerKb: 0.1 as unknown as bigint }),
        ).to.throw('feePerKb must be a bigint');
        expect(() => txBuild.sign()).to.throw(
            'Using a leftover output requires setting feePerKb',
        );
    });
});

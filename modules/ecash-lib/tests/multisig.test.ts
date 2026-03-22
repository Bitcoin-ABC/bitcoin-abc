// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { ChronikClient } from 'chronik-client';

import { Ecc } from '../src/ecc.js';
import { sha256d, shaRmd160 } from '../src/hash.js';
import { fromHex, toHex } from '../src/io/hex.js';
import { Script } from '../src/script.js';
import { ALL_BIP143 } from '../src/sigHashType.js';
import { TestRunner } from '../src/test/testRunner.js';
import { flagSignature, signWithSigHash } from '../src/signatories.js';
import { TxBuilder } from '../src/txBuilder.js';
import { UnsignedTxInput } from '../src/unsignedTx.js';
import '../src/initNodeJs.js';

describe('Multisig', () => {
    let runner: TestRunner;
    let chronik: ChronikClient;
    const ecc = new Ecc();

    before(async () => {
        runner = await TestRunner.setup();
        chronik = runner.chronik;
        await runner.setupCoins(500, 100000n);
    });

    after(() => {
        runner.stop();
    });

    it('P2SH 2-of-3 ECDSA multisig: sign and broadcast', async () => {
        const sk1 = fromHex('aa'.repeat(32));
        const sk2 = fromHex('bb'.repeat(32));
        const sk3 = fromHex('cc'.repeat(32));
        const pk1 = ecc.derivePubkey(sk1);
        const pk2 = ecc.derivePubkey(sk2);
        const pk3 = ecc.derivePubkey(sk3);
        const redeemScript = Script.multisig(2, [pk1, pk2, pk3]);
        const scriptHash = shaRmd160(redeemScript.bytecode);
        const p2sh = Script.p2sh(scriptHash);

        await runner.sendToScript(90000n, p2sh);
        const utxos = await chronik.script('p2sh', toHex(scriptHash)).utxos();
        expect(utxos.utxos.length).to.equal(1);
        const utxo = utxos.utxos[0];

        const recipientPkh = fromHex('01'.repeat(20));
        const recipientScript = Script.p2pkh(recipientPkh);

        const sks = [sk1, sk2];
        const signerIndices = [0, 1];

        const txBuild = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: utxo.outpoint,
                        signData: {
                            sats: utxo.sats,
                            redeemScript,
                        },
                    },
                    signatory: (ecc: Ecc, input: UnsignedTxInput): Script => {
                        const preimage = input.sigHashPreimage(ALL_BIP143);
                        const sighash = sha256d(preimage.bytes);
                        const signatures = signerIndices.map(i =>
                            flagSignature(
                                ecc.ecdsaSign(sks[i]!, sighash),
                                ALL_BIP143,
                            ),
                        );
                        return Script.multisigSpend({
                            signatures,
                            redeemScript: preimage.redeemScript,
                        });
                    },
                },
            ],
            outputs: [{ sats: 50000n, script: recipientScript }, p2sh],
        });

        const spendTx = txBuild.sign({
            feePerKb: 1000n,
            dustSats: 546n,
        });

        const parsed = spendTx.inputs[0].script!.parseP2shMultisigSpend();
        expect(parsed.isSchnorr).to.equal(false);
        expect(parsed.numSignatures).to.equal(2);
        expect(parsed.numPubkeys).to.equal(3);

        await chronik.broadcastTx(spendTx.ser());
    });

    it('P2SH 2-of-3 Schnorr multisig: sign and broadcast', async () => {
        const sk1 = fromHex('11'.repeat(32));
        const sk2 = fromHex('22'.repeat(32));
        const sk3 = fromHex('33'.repeat(32));
        const pk1 = ecc.derivePubkey(sk1);
        const pk2 = ecc.derivePubkey(sk2);
        const pk3 = ecc.derivePubkey(sk3);
        const redeemScript = Script.multisig(2, [pk1, pk2, pk3]);
        const scriptHash = shaRmd160(redeemScript.bytecode);
        const p2sh = Script.p2sh(scriptHash);

        await runner.sendToScript(90000n, p2sh);
        const utxos = await chronik.script('p2sh', toHex(scriptHash)).utxos();
        expect(utxos.utxos.length).to.equal(1);
        const utxo = utxos.utxos[0];

        const recipientPkh = fromHex('02'.repeat(20));
        const recipientScript = Script.p2pkh(recipientPkh);

        const sks = [sk1, sk3];
        const signerIndices = [0, 2];

        const txBuild = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: utxo.outpoint,
                        signData: {
                            sats: utxo.sats,
                            redeemScript,
                        },
                    },
                    signatory: (ecc: Ecc, input: UnsignedTxInput): Script => {
                        const preimage = input.sigHashPreimage(ALL_BIP143);
                        const sighash = sha256d(preimage.bytes);
                        const signatures = sks.map(sk =>
                            signWithSigHash(ecc, sk, sighash, ALL_BIP143),
                        );
                        return Script.multisigSpend({
                            signatures,
                            redeemScript: preimage.redeemScript,
                            pubkeyIndices: new Set(signerIndices),
                        });
                    },
                },
            ],
            outputs: [{ sats: 50000n, script: recipientScript }, p2sh],
        });

        const spendTx = txBuild.sign({
            feePerKb: 1000n,
            dustSats: 546n,
        });

        const parsed = spendTx.inputs[0].script!.parseP2shMultisigSpend();
        expect(parsed.isSchnorr).to.equal(true);
        expect(parsed.pubkeyIndices).to.deep.equal(new Set([0, 2]));
        expect(parsed.numSignatures).to.equal(2);
        expect(parsed.numPubkeys).to.equal(3);

        await chronik.broadcastTx(spendTx.ser());
    });

    it('Bare 2-of-3 ECDSA multisig: sign and broadcast', async () => {
        const sk1 = fromHex('aa'.repeat(32));
        const sk2 = fromHex('bb'.repeat(32));
        const sk3 = fromHex('cc'.repeat(32));
        const pk1 = ecc.derivePubkey(sk1);
        const pk2 = ecc.derivePubkey(sk2);
        const pk3 = ecc.derivePubkey(sk3);
        const bareMultisigScript = Script.multisig(2, [pk1, pk2, pk3]);

        await runner.sendToScript(90000n, bareMultisigScript);
        const utxos = await chronik
            .script('other', toHex(bareMultisigScript.bytecode))
            .utxos();
        expect(utxos.utxos.length).to.equal(1);
        const utxo = utxos.utxos[0];

        const recipientPkh = fromHex('03'.repeat(20));
        const recipientScript = Script.p2pkh(recipientPkh);

        const sks = [sk2, sk3];

        const txBuild = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: utxo.outpoint,
                        signData: {
                            sats: utxo.sats,
                            outputScript: bareMultisigScript,
                        },
                    },
                    signatory: (ecc: Ecc, input: UnsignedTxInput): Script => {
                        const preimage = input.sigHashPreimage(ALL_BIP143);
                        const sighash = sha256d(preimage.bytes);
                        const signatures = sks.map(sk =>
                            flagSignature(
                                ecc.ecdsaSign(sk, sighash),
                                ALL_BIP143,
                            ),
                        );
                        return Script.multisigSpend({
                            signatures,
                            numPubkeys: 3,
                        });
                    },
                },
            ],
            outputs: [
                { sats: 50000n, script: recipientScript },
                bareMultisigScript,
            ],
        });

        const spendTx = txBuild.sign({
            feePerKb: 1000n,
            dustSats: 546n,
        });

        const parsed =
            spendTx.inputs[0].script!.parseBareMultisigSpend(
                bareMultisigScript,
            );
        expect(parsed.isSchnorr).to.equal(false);
        expect(parsed.numSignatures).to.equal(2);
        expect(parsed.numPubkeys).to.equal(3);

        await chronik.broadcastTx(spendTx.ser());
    });

    it('Bare 2-of-3 Schnorr multisig: sign and broadcast', async () => {
        const sk1 = fromHex('44'.repeat(32));
        const sk2 = fromHex('55'.repeat(32));
        const sk3 = fromHex('66'.repeat(32));
        const pk1 = ecc.derivePubkey(sk1);
        const pk2 = ecc.derivePubkey(sk2);
        const pk3 = ecc.derivePubkey(sk3);
        const bareMultisigScript = Script.multisig(2, [pk1, pk2, pk3]);

        await runner.sendToScript(90000n, bareMultisigScript);
        const utxos = await chronik
            .script('other', toHex(bareMultisigScript.bytecode))
            .utxos();
        expect(utxos.utxos.length).to.equal(1);
        const utxo = utxos.utxos[0];

        const recipientPkh = fromHex('05'.repeat(20));
        const recipientScript = Script.p2pkh(recipientPkh);

        const sks = [sk1, sk3];
        const signerIndices = [0, 2];

        const txBuild = new TxBuilder({
            inputs: [
                {
                    input: {
                        prevOut: utxo.outpoint,
                        signData: {
                            sats: utxo.sats,
                            outputScript: bareMultisigScript,
                        },
                    },
                    signatory: (ecc: Ecc, input: UnsignedTxInput): Script => {
                        const preimage = input.sigHashPreimage(ALL_BIP143);
                        const sighash = sha256d(preimage.bytes);
                        const signatures = sks.map(sk =>
                            signWithSigHash(ecc, sk, sighash, ALL_BIP143),
                        );
                        return Script.multisigSpend({
                            signatures,
                            numPubkeys: 3,
                            pubkeyIndices: new Set(signerIndices),
                        });
                    },
                },
            ],
            outputs: [
                { sats: 50000n, script: recipientScript },
                bareMultisigScript,
            ],
        });

        const spendTx = txBuild.sign({
            feePerKb: 1000n,
            dustSats: 546n,
        });

        const parsed =
            spendTx.inputs[0].script!.parseBareMultisigSpend(
                bareMultisigScript,
            );
        expect(parsed.isSchnorr).to.equal(true);
        expect(parsed.pubkeyIndices).to.deep.equal(new Set([0, 2]));
        expect(parsed.numSignatures).to.equal(2);
        expect(parsed.numPubkeys).to.equal(3);

        await chronik.broadcastTx(spendTx.ser());
    });
});

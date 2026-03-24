// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { Ecc } from './ecc.js';
import './initNodeJs.js';
import { sha256d, shaRmd160 } from './hash.js';
import { fromHex } from './io/hex.js';
import { Psbt, txToUnsigned } from './psbt.js';
import { Script } from './script.js';
import { ALL_BIP143 } from './sigHashType.js';
import { Tx } from './tx.js';
import { UnsignedTx } from './unsignedTx.js';
import { flagSignature } from './signatories.js';

describe('Psbt (BIP 174)', () => {
    const ecc = new Ecc();

    it('txToUnsigned strips scriptSigs', () => {
        const tx = new Tx({
            inputs: [
                {
                    prevOut: { txid: new Uint8Array(32), outIdx: 0 },
                    script: new Script(fromHex('001122')),
                },
            ],
            outputs: [],
        });
        const u = txToUnsigned(tx);
        expect(u.inputs[0].script!.bytecode.length).to.equal(0);
    });

    it('round-trip P2SH multisig PSBT with one ECDSA partial sig', () => {
        const sk1 = fromHex('aa'.repeat(32));
        const sk2 = fromHex('bb'.repeat(32));
        const sk3 = fromHex('cc'.repeat(32));
        const pk1 = ecc.derivePubkey(sk1);
        const pk2 = ecc.derivePubkey(sk2);
        const pk3 = ecc.derivePubkey(sk3);
        const redeemScript = Script.multisig(2, [pk1, pk2, pk3]);
        const p2shScriptHash = shaRmd160(redeemScript.bytecode);

        const signData = { sats: 90000n, redeemScript };

        const recipientScript = Script.p2pkh(fromHex('01'.repeat(20)));
        const unsigned = new Tx({
            inputs: [
                {
                    prevOut: { txid: new Uint8Array(32), outIdx: 0 },
                    script: new Script(),
                    sequence: 0xffffffff,
                },
            ],
            outputs: [
                { sats: 50000n, script: recipientScript },
                { sats: 40000n, script: Script.p2sh(p2shScriptHash) },
            ],
        });

        const preimage = UnsignedTx.fromTx(
            new Tx({
                version: unsigned.version,
                inputs: [
                    {
                        ...unsigned.inputs[0]!,
                        signData,
                    },
                ],
                outputs: unsigned.outputs,
                locktime: unsigned.locktime,
            }),
        )
            .inputAt(0)
            .sigHashPreimage(ALL_BIP143);
        const h = sha256d(preimage.bytes);
        const sig1 = ecc.ecdsaSign(sk1, h);
        const sig1Flagged = flagSignature(sig1, ALL_BIP143);

        const scriptSig = Script.multisigSpend({
            signatures: [sig1Flagged, undefined],
            redeemScript,
        });

        const partialTx = new Tx({
            version: unsigned.version,
            inputs: [
                {
                    prevOut: unsigned.inputs[0]!.prevOut,
                    script: scriptSig,
                    sequence: 0xffffffff,
                },
            ],
            outputs: unsigned.outputs,
            locktime: unsigned.locktime,
        });

        const psbt = Psbt.fromTx(partialTx, [signData], ecc);
        const bytes = psbt.toBytes();
        const psbt2 = Psbt.fromBytes(bytes);
        expect(psbt2.isFullySignedMultisig()).to.equal(false);

        const tx2 = psbt2.toTx();

        // `toTx()` attaches `signData` from the PSBT; `partialTx` has none — only
        // the serialized tx matches (signData is not part of `ser()`).
        expect(tx2.ser()).to.deep.equal(partialTx.ser());

        const psbt3 = psbt2.addMultisigSignatureFromKey({
            inputIdx: 0,
            sk: sk2,
            signData,
            ecc,
        });
        expect(psbt3.isFullySignedMultisig()).to.equal(true);

        const bytes3 = psbt3.toBytes();
        const psbt4 = Psbt.fromBytes(bytes3);
        expect(psbt4.isFullySignedMultisig()).to.equal(true);

        expect(psbt4.toTx().ser()).to.deep.equal(psbt3.toTx().ser());
    });

    // Exercises `buildScriptSigFromPartialSigs` Schnorr path (65-byte sigs) via
    // `toTx()`. Needs both signatures in the partial-sig map so pubkeyIndices
    // can match `m` (a single partial Schnorr sig does not carry enough to
    // rebuild checkbits from the map alone).
    it('round-trip fully signed P2SH Schnorr multisig PSBT (toTx rebuild)', () => {
        const sk1 = fromHex('11'.repeat(32));
        const sk2 = fromHex('22'.repeat(32));
        const pk1 = ecc.derivePubkey(sk1);
        const pk2 = ecc.derivePubkey(sk2);
        const pk3 = ecc.derivePubkey(fromHex('33'.repeat(32)));
        const redeemScript = Script.multisig(2, [pk1, pk2, pk3]);
        const p2shScriptHash = shaRmd160(redeemScript.bytecode);

        const signData = { sats: 90000n, redeemScript };
        const signerIndices = new Set([0, 1]);

        const recipientScript = Script.p2pkh(fromHex('02'.repeat(20)));
        const unsigned = new Tx({
            inputs: [
                {
                    prevOut: { txid: new Uint8Array(32), outIdx: 0 },
                    script: new Script(),
                    sequence: 0xffffffff,
                },
            ],
            outputs: [
                { sats: 50000n, script: recipientScript },
                { sats: 40000n, script: Script.p2sh(p2shScriptHash) },
            ],
        });

        const preimage = UnsignedTx.fromTx(
            new Tx({
                version: unsigned.version,
                inputs: [
                    {
                        ...unsigned.inputs[0]!,
                        signData,
                    },
                ],
                outputs: unsigned.outputs,
                locktime: unsigned.locktime,
            }),
        )
            .inputAt(0)
            .sigHashPreimage(ALL_BIP143);
        const h = sha256d(preimage.bytes);
        const sig1Flagged = flagSignature(ecc.schnorrSign(sk1, h), ALL_BIP143);
        const sig2Flagged = flagSignature(ecc.schnorrSign(sk2, h), ALL_BIP143);

        const scriptSig = Script.multisigSpend({
            signatures: [sig1Flagged, sig2Flagged],
            redeemScript,
            pubkeyIndices: signerIndices,
        });

        const signedTx = new Tx({
            version: unsigned.version,
            inputs: [
                {
                    prevOut: unsigned.inputs[0]!.prevOut,
                    script: scriptSig,
                    sequence: 0xffffffff,
                },
            ],
            outputs: unsigned.outputs,
            locktime: unsigned.locktime,
        });

        const psbt = Psbt.fromTx(signedTx, [signData], ecc);
        const psbt2 = Psbt.fromBytes(psbt.toBytes());
        expect(psbt2.isFullySignedMultisig()).to.equal(true);

        const tx2 = psbt2.toTx();
        expect(tx2.ser()).to.deep.equal(signedTx.ser());
    });
});

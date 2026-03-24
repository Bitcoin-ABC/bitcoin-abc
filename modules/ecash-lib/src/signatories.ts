// Copyright (c) 2024-2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Signatories and signing helpers used with `TxBuilder` (`TxBuilderInput.signatory`).
 */

import { Ecc, EccDummy } from './ecc.js';
import {
    ECDSA_SIG_ESTIMATE_BYTES,
    SCHNORR_SIG_ESTIMATE_BYTES,
} from './consts.js';
import { sha256d } from './hash.js';
import { WriterBytes } from './io/writerbytes.js';
import { pushBytesOp } from './op.js';
import { Script } from './script.js';
import { SigHashType, SigHashTypeVariant } from './sigHashType.js';
import { UnsignedTxInput } from './unsignedTx.js';

/**
 * Function that contains all the required data to sign a given `input` and
 * return the scriptSig.
 *
 * Use it by attaching a `Signatory` to a TxBuilderInput, e.g. like this for a
 * P2PKH input:
 * ```ts
 * new TxBuilder({
 *     inputs: [{
 *         input: { prevOut: ... },
 *         signatory: P2PKHSignatory(sk, pk, ALL_BIP143),
 *     }],
 *     ...
 * })
 * ```
 **/
export type Signatory = (ecc: Ecc, input: UnsignedTxInput) => Script;

/** Append the sighash flags to the signature */
export function flagSignature(
    sig: Uint8Array,
    sigHashFlags: SigHashType,
): Uint8Array {
    const writer = new WriterBytes(sig.length + 1);
    writer.putBytes(sig);
    writer.putU8(sigHashFlags.toInt() & 0xff);
    return writer.data;
}

/**
 * Sign the sighash using Schnorr for BIP143 signatures and ECDSA for Legacy
 * signatures, and then flags the signature correctly
 **/
export function signWithSigHash(
    ecc: Ecc,
    sk: Uint8Array,
    sigHash: Uint8Array,
    sigHashType: SigHashType,
): Uint8Array {
    const sig =
        sigHashType.variant == SigHashTypeVariant.LEGACY
            ? ecc.ecdsaSign(sk, sigHash)
            : ecc.schnorrSign(sk, sigHash);
    return flagSignature(sig, sigHashType);
}

/** Signatory for a P2PKH input. Always uses Schnorr signatures */
export const P2PKHSignatory = (
    sk: Uint8Array,
    pk: Uint8Array,
    sigHashType: SigHashType,
): Signatory => {
    return (ecc: Ecc, input: UnsignedTxInput): Script => {
        const preimage = input.sigHashPreimage(sigHashType);
        const sighash = sha256d(preimage.bytes);
        const sigFlagged = signWithSigHash(ecc, sk, sighash, sigHashType);
        return Script.p2pkhSpend(pk, sigFlagged);
    };
};

/** Signatory for bare m-of-n multisig (output script is the multisig script itself). */
export const BareMultisigSignatory = (
    m: number,
    pubkeys: Uint8Array[],
    sk: Uint8Array,
    myPk: Uint8Array,
    sigHashType: SigHashType,
): Signatory => {
    return (ecc: Ecc, input: UnsignedTxInput): Script => {
        if (ecc instanceof EccDummy) {
            const dummySig = new Uint8Array(ECDSA_SIG_ESTIMATE_BYTES);
            const signatures = Array(m)
                .fill(undefined)
                .map(() => dummySig);
            return Script.multisigSpend({ signatures });
        }
        const preimage = input.sigHashPreimage(sigHashType);
        const sighash = sha256d(preimage.bytes);
        const sig = ecc.ecdsaSign(sk, sighash);
        const sigFlagged = flagSignature(sig, sigHashType);
        const myIndex = pubkeys.findIndex(
            pk =>
                pk.length === myPk.length && pk.every((b, i) => b === myPk[i]),
        );
        if (myIndex < 0) {
            throw new Error('Signer pubkey not found in multisig pubkeys');
        }
        const n = pubkeys.length;
        const signatures: (Uint8Array | undefined)[] = Array(n).fill(undefined);
        signatures[myIndex] = sigFlagged;
        const nonNull = signatures.filter(
            (s): s is Uint8Array => s !== undefined,
        );
        const sigsForScript: (Uint8Array | undefined)[] = [
            ...nonNull,
            ...Array(m - nonNull.length).fill(undefined),
        ];
        return Script.multisigSpend({ signatures: sigsForScript });
    };
};

/** Signatory for bare m-of-n multisig using Schnorr signatures (BIP143 Schnorr multisig). */
export const BareMultisigSignatorySchnorr = (
    m: number,
    pubkeys: Uint8Array[],
    sk: Uint8Array,
    myPk: Uint8Array,
    signerIndices: Set<number>,
    sigHashType: SigHashType,
): Signatory => {
    return (ecc: Ecc, input: UnsignedTxInput): Script => {
        const n = pubkeys.length;
        if (signerIndices.size !== m) {
            throw new Error(
                `signerIndices must have ${m} elements for ${m}-of-${n} multisig`,
            );
        }
        if (ecc instanceof EccDummy) {
            const dummySig = new Uint8Array(SCHNORR_SIG_ESTIMATE_BYTES);
            const signatures = Array(m)
                .fill(undefined)
                .map(() => dummySig);
            return Script.multisigSpend({
                signatures,
                pubkeyIndices: signerIndices,
                numPubkeys: n,
            });
        }
        const preimage = input.sigHashPreimage(sigHashType);
        const sighash = sha256d(preimage.bytes);
        const sig = ecc.schnorrSign(sk, sighash);
        const sigFlagged = flagSignature(sig, sigHashType);
        const myIndex = pubkeys.findIndex(
            pk =>
                pk.length === myPk.length && pk.every((b, i) => b === myPk[i]),
        );
        if (myIndex < 0) {
            throw new Error('Signer pubkey not found in multisig pubkeys');
        }
        if (!signerIndices.has(myIndex)) {
            throw new Error(
                `Signer index ${myIndex} not in signerIndices ${[
                    ...signerIndices,
                ].join(',')}`,
            );
        }
        const sortedIndices = [...signerIndices].sort((a, b) => a - b);
        const signatures: (Uint8Array | undefined)[] = sortedIndices.map(idx =>
            idx === myIndex ? sigFlagged : undefined,
        );
        return Script.multisigSpend({
            signatures,
            pubkeyIndices: signerIndices,
            numPubkeys: n,
        });
    };
};

/** Signatory for P2SH m-of-n multisig. */
export const P2SHMultisigSignatory = (
    m: number,
    pubkeys: Uint8Array[],
    sk: Uint8Array,
    myPk: Uint8Array,
    sigHashType: SigHashType,
): Signatory => {
    return (ecc: Ecc, input: UnsignedTxInput): Script => {
        const redeemScript = Script.multisig(m, pubkeys);
        if (ecc instanceof EccDummy) {
            const dummySig = new Uint8Array(ECDSA_SIG_ESTIMATE_BYTES);
            const signatures = Array(m)
                .fill(undefined)
                .map(() => dummySig);
            return Script.multisigSpend({
                signatures,
                redeemScript,
            });
        }
        const preimage = input.sigHashPreimage(sigHashType);
        const sighash = sha256d(preimage.bytes);
        const sig = ecc.ecdsaSign(sk, sighash);
        const sigFlagged = flagSignature(sig, sigHashType);
        const myIndex = pubkeys.findIndex(
            pk =>
                pk.length === myPk.length && pk.every((b, i) => b === myPk[i]),
        );
        if (myIndex < 0) {
            throw new Error('Signer pubkey not found in multisig pubkeys');
        }
        const n = pubkeys.length;
        const signatures: (Uint8Array | undefined)[] = Array(n).fill(undefined);
        signatures[myIndex] = sigFlagged;
        const nonNull = signatures.filter(
            (s): s is Uint8Array => s !== undefined,
        );
        const sigsForScript: (Uint8Array | undefined)[] = [
            ...nonNull,
            ...Array(m - nonNull.length).fill(undefined),
        ];
        return Script.multisigSpend({
            signatures: sigsForScript,
            redeemScript,
        });
    };
};

/** Signatory for P2SH m-of-n multisig using Schnorr signatures. */
export const P2SHMultisigSignatorySchnorr = (
    m: number,
    pubkeys: Uint8Array[],
    sk: Uint8Array,
    myPk: Uint8Array,
    signerIndices: Set<number>,
    sigHashType: SigHashType,
): Signatory => {
    return (ecc: Ecc, input: UnsignedTxInput): Script => {
        const redeemScript = Script.multisig(m, pubkeys);
        const n = pubkeys.length;
        if (signerIndices.size !== m) {
            throw new Error(
                `signerIndices must have ${m} elements for ${m}-of-${n} multisig`,
            );
        }
        if (ecc instanceof EccDummy) {
            const dummySig = new Uint8Array(SCHNORR_SIG_ESTIMATE_BYTES);
            const signatures = Array(m)
                .fill(undefined)
                .map(() => dummySig);
            return Script.multisigSpend({
                signatures,
                redeemScript,
                pubkeyIndices: signerIndices,
            });
        }
        const preimage = input.sigHashPreimage(sigHashType);
        const sighash = sha256d(preimage.bytes);
        const sig = ecc.schnorrSign(sk, sighash);
        const sigFlagged = flagSignature(sig, sigHashType);
        const myIndex = pubkeys.findIndex(
            pk =>
                pk.length === myPk.length && pk.every((b, i) => b === myPk[i]),
        );
        if (myIndex < 0) {
            throw new Error('Signer pubkey not found in multisig pubkeys');
        }
        if (!signerIndices.has(myIndex)) {
            throw new Error(
                `Signer index ${myIndex} not in signerIndices ${[
                    ...signerIndices,
                ].join(',')}`,
            );
        }
        const sortedIndices = [...signerIndices].sort((a, b) => a - b);
        const signatures: (Uint8Array | undefined)[] = sortedIndices.map(idx =>
            idx === myIndex ? sigFlagged : undefined,
        );
        return Script.multisigSpend({
            signatures,
            redeemScript,
            pubkeyIndices: signerIndices,
        });
    };
};

/** Signatory for a P2PK input. Always uses Schnorr signatures */
export const P2PKSignatory = (
    sk: Uint8Array,
    sigHashType: SigHashType,
): Signatory => {
    return (ecc: Ecc, input: UnsignedTxInput): Script => {
        const preimage = input.sigHashPreimage(sigHashType);
        const sighash = sha256d(preimage.bytes);
        const sigFlagged = signWithSigHash(ecc, sk, sighash, sigHashType);
        return Script.fromOps([pushBytesOp(sigFlagged)]);
    };
};

// Copyright (c) 2024-2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Signatories and signing helpers used with `TxBuilder` (`TxBuilderInput.signatory`).
 */

import { Ecc } from './ecc.js';
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
) => {
    return (ecc: Ecc, input: UnsignedTxInput): Script => {
        const preimage = input.sigHashPreimage(sigHashType);
        const sighash = sha256d(preimage.bytes);
        const sigFlagged = signWithSigHash(ecc, sk, sighash, sigHashType);
        return Script.p2pkhSpend(pk, sigFlagged);
    };
};

/** Signatory for a P2PK input. Always uses Schnorr signatures */
export const P2PKSignatory = (sk: Uint8Array, sigHashType: SigHashType) => {
    return (ecc: Ecc, input: UnsignedTxInput): Script => {
        const preimage = input.sigHashPreimage(sigHashType);
        const sighash = sha256d(preimage.bytes);
        const sigFlagged = signWithSigHash(ecc, sk, sighash, sigHashType);
        return Script.fromOps([pushBytesOp(sigFlagged)]);
    };
};

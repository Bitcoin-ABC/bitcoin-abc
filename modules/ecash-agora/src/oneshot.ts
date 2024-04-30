// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    ALL_ANYONECANPAY_BIP143,
    ALL_BIP143,
    Ecc,
    OP_0,
    OP_1,
    OP_2,
    OP_3DUP,
    OP_CAT,
    OP_CHECKDATASIGVERIFY,
    OP_CHECKSIG,
    OP_CODESEPARATOR,
    OP_DROP,
    OP_ELSE,
    OP_ENDIF,
    OP_EQUALVERIFY,
    OP_HASH256,
    OP_IF,
    OP_NIP,
    OP_NUM2BIN,
    OP_OVER,
    OP_ROT,
    OP_SHA256,
    OP_SPLIT,
    OP_SWAP,
    Script,
    TxOutput,
    UnsignedTxInput,
    Writer,
    WriterBytes,
    WriterLength,
    flagSignature,
    pushBytesOp,
    sha256d,
    writeTxOutput,
} from 'ecash-lib';

/**
 * Agora offer that has to be accepted in "one shot", i.e. all or nothing.
 * This is useful for offers that offer exactly 1 token, especially NFTs.
 *
 * The covenant is reasonably simple, see
 * https://read.cash/@pein/bch-covenants-with-spedn-4a980ed3 for an explanation of the
 * covenant mechanism, but uses two optimizations:
 * 1. It uses ANYONECANPAY as sighash for the "accept" path, which makes the sighash
 *    preimage start with `1000....00000`, which can be created with
 *    `OP_1 68 OP_NUM2BIN`, saving around 64 bytes.
 * 2. It uses OP_CODESEPARATOR before the OP_CHECKSIG, which cuts out the entire script
 *    code, leaving only the OP_CHECKSIG behind. The scriptCode part in the BIP143
 *    sighash now just becomes `01ac`, which is both easier to deal with in the OP_SPLIT
 *    and also saves 100 bytes or so (depending on the enforced outputs).
 **/
export class AgoraOneshot {
    public enforcedOutputs: TxOutput[];
    public cancelPk: Uint8Array;

    constructor({
        enforcedOutputs,
        cancelPk,
    }: {
        enforcedOutputs: TxOutput[];
        cancelPk: Uint8Array;
    }) {
        this.enforcedOutputs = enforcedOutputs;
        this.cancelPk = cancelPk;
    }

    /** Build the Script enforcing the Agora offer covenant. */
    public script(): Script {
        const serEnforcedOutputs = (writer: Writer) => {
            for (const output of this.enforcedOutputs) {
                writeTxOutput(output, writer);
            }
        };
        const writerLength = new WriterLength();
        serEnforcedOutputs(writerLength);
        const writer = new WriterBytes(writerLength.length);
        serEnforcedOutputs(writer);
        const enforcedOutputsSer = writer.data;

        return Script.fromOps([
            OP_IF, // if is_accept

            pushBytesOp(enforcedOutputsSer), // push enforced_outputs
            OP_SWAP, // swap buyer_outputs, enforced_outputs
            OP_CAT, // outputs = OP_CAT(enforced_outputs, buyer_outputs)
            OP_HASH256, // expected_hash_outputs = OP_HASH256(outputs)

            OP_OVER, // duplicate preimage_4_10,
            // push hash_outputs_idx:
            pushBytesOp(
                new Uint8Array([
                    36 + // 4. outpoint
                        2 + // 5. scriptCode, truncated to 01ac via OP_CODESEPARATOR
                        8 + // 6. value
                        4, // 7. sequence
                ]),
            ),
            OP_SPLIT, // split into preimage_4_7 and preimage_8_10
            OP_NIP, // remove preimage_4_7
            pushBytesOp(new Uint8Array([32])), // push 32 onto the stack
            OP_SPLIT, // split into actual_hash_outputs and preimage_9_10
            OP_DROP, // drop preimage_9_10

            OP_EQUALVERIFY, // expected_hash_outputs == actual_hash_outputs
            OP_2, // push tx version
            // length of BIP143 preimage parts 1 to 3
            pushBytesOp(new Uint8Array([4 + 32 + 32])),
            // build BIP143 preimage parts 1 to 3 for ANYONECANPAY using OP_NUM2BIN
            OP_NUM2BIN,
            OP_SWAP, // swap preimage_4_10 and preimage_1_3
            OP_CAT, // preimage = OP_CAT(preimage_1_3, preimage_4_10)
            OP_SHA256, // preimage_sha256 = OP_SHA256(preimage)
            OP_3DUP, // OP_3DUP(covenant_pk, covenant_sig, preimage_sha256)
            OP_ROT, // -> covenant_sig | preimage_sha256 | covenant_pk
            OP_CHECKDATASIGVERIFY, // verify preimage matches covenant_sig
            OP_DROP, // drop preimage_sha256
            // push ALL|ANYONECANPAY|BIP143 onto the stack
            pushBytesOp(new Uint8Array([ALL_ANYONECANPAY_BIP143.toInt()])),
            OP_CAT, // append sighash flags onto covenant_sig
            OP_SWAP, // swap covenant_pk, covenant_sig_flagged

            OP_ELSE, // cancel path

            pushBytesOp(this.cancelPk), // pubkey that can cancel the covenant

            OP_ENDIF,

            // cut out everything except the OP_CHECKSIG from the BIP143 scriptCode
            OP_CODESEPARATOR,
            OP_CHECKSIG,
        ]);
    }
}

export const AgoraOneshotSignatory = (
    covenantSk: Uint8Array,
    covenantPk: Uint8Array,
    numEnforcedOutputs: number,
) => {
    return (ecc: Ecc, input: UnsignedTxInput): Script => {
        const preimage = input.sigHashPreimage(ALL_ANYONECANPAY_BIP143, 0);
        const sighash = sha256d(preimage.bytes);
        const covenantSig = ecc.schnorrSign(covenantSk, sighash);
        const serBuyerOutputs = (writer: Writer) => {
            for (const output of input.unsignedTx.tx.outputs.slice(
                numEnforcedOutputs,
            )) {
                writeTxOutput(output, writer);
            }
        };
        const writerLength = new WriterLength();
        serBuyerOutputs(writerLength);
        const writer = new WriterBytes(writerLength.length);
        serBuyerOutputs(writer);
        const buyerOutputsSer = writer.data;

        return Script.fromOps([
            pushBytesOp(covenantPk),
            pushBytesOp(covenantSig),
            pushBytesOp(preimage.bytes.slice(4 + 32 + 32)), // preimage_4_10
            pushBytesOp(buyerOutputsSer),
            OP_1, // is_accept = true
            pushBytesOp(preimage.redeemScript.bytecode),
        ]);
    };
};

export const AgoraOneshotCancelSignatory = (cancelSk: Uint8Array) => {
    return (ecc: Ecc, input: UnsignedTxInput): Script => {
        const preimage = input.sigHashPreimage(ALL_BIP143, 0);
        const sighash = sha256d(preimage.bytes);
        const cancelSig = flagSignature(
            ecc.schnorrSign(cancelSk, sighash),
            ALL_BIP143,
        );
        return Script.fromOps([
            pushBytesOp(cancelSig),
            OP_0, // is_accept = false
            pushBytesOp(preimage.redeemScript.bytecode),
        ]);
    };
};

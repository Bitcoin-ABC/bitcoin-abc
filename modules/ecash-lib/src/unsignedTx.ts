// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { sha256d } from './hash.js';
import { Writer } from './io/writer.js';
import { WriterBytes } from './io/writerbytes.js';
import { WriterLength } from './io/writerlength.js';
import { Script } from './script.js';
import {
    SigHashType,
    SigHashTypeInputs,
    SigHashTypeOutputs,
    SigHashTypeVariant,
} from './sigHashType.js';
import { SignData, Tx, TxInput, writeOutPoint, writeTxOutput } from './tx.js';

/** An unsigned tx, which helps us build the sighash preimage we need to sign */
export class UnsignedTx {
    tx: Tx;
    prevoutsHash: Uint8Array;
    sequencesHash: Uint8Array;
    outputsHash: Uint8Array;

    private constructor(params: {
        tx: Tx;
        prevoutsHash: Uint8Array;
        sequencesHash: Uint8Array;
        outputsHash: Uint8Array;
    }) {
        this.tx = params.tx;
        this.prevoutsHash = params.prevoutsHash;
        this.sequencesHash = params.sequencesHash;
        this.outputsHash = params.outputsHash;
    }

    /**
     * Make an UnsignedTx from a Tx, will precompute the fields required to
     * sign the tx
     **/
    public static fromTx(tx: Tx): UnsignedTx {
        return new UnsignedTx({
            tx,
            prevoutsHash: txWriterHash(tx, writePrevouts),
            sequencesHash: txWriterHash(tx, writeSequences),
            outputsHash: txWriterHash(tx, writeOutputs),
        });
    }

    /**
     * Make a dummy UnsignedTx from a Tx, will set dummy values for the fields
     * required to sign the tx. Useful for tx size estimation.
     **/
    public static dummyFromTx(tx: Tx): UnsignedTx {
        return new UnsignedTx({
            tx,
            prevoutsHash: new Uint8Array(32),
            sequencesHash: new Uint8Array(32),
            outputsHash: new Uint8Array(32),
        });
    }

    /** Return the unsigned tx input at the given input index */
    public inputAt(inputIdx: number): UnsignedTxInput {
        return new UnsignedTxInput({ inputIdx, unsignedTx: this });
    }
}

/** A preimage of a sighash for an input's scriptSig ready to be signed */
export interface SighashPreimage {
    /** Bytes of the serialized sighash preimage */
    bytes: Uint8Array;
    /** Script code of the preimage, with OP_CODESEPARATOR cut out */
    scriptCode: Script;
    /** Redeem script, with no modifications */
    redeemScript: Script;
}

/**
 * An unsigned tx input, can be used to build a sighash preimage ready to be
 * signed
 **/
export class UnsignedTxInput {
    inputIdx: number;
    unsignedTx: UnsignedTx;

    public constructor(params: { inputIdx: number; unsignedTx: UnsignedTx }) {
        this.inputIdx = params.inputIdx;
        this.unsignedTx = params.unsignedTx;
    }

    /**
     * Build the sigHashPreimage for this input, with the given sigHashType
     * and OP_CODESEPARATOR index
     **/
    public sigHashPreimage(
        sigHashType: SigHashType,
        nCodesep?: number,
    ): SighashPreimage {
        if (sigHashType.variant == SigHashTypeVariant.LEGACY) {
            throw new Error('Legacy sighash type not implemented');
        }
        const tx = this.unsignedTx.tx;
        const input = tx.inputs[this.inputIdx];
        if (input.signData === undefined) {
            throw new Error('Input must have signData set');
        }
        const signData = input.signData;
        const redeemScript = signDataScriptCode(input.signData);
        const scriptCode =
            nCodesep === undefined
                ? redeemScript
                : redeemScript.cutOutCodesep(nCodesep);

        let hashOutputs: Uint8Array;
        switch (sigHashType.outputType) {
            case SigHashTypeOutputs.ALL:
                hashOutputs = this.unsignedTx.outputsHash;
                break;
            case SigHashTypeOutputs.NONE:
                hashOutputs = new Uint8Array(32);
                break;
            case SigHashTypeOutputs.SINGLE:
                if (this.inputIdx < tx.outputs.length) {
                    const output = tx.outputs[this.inputIdx];
                    const writerOutputLength = new WriterLength();
                    writeTxOutput(output, writerOutputLength);
                    const writerOutput = new WriterBytes(
                        writerOutputLength.length,
                    );
                    writeTxOutput(output, writerOutput);
                    hashOutputs = sha256d(writerOutput.data);
                } else {
                    hashOutputs = new Uint8Array(32);
                }
                break;
        }

        const writePreimage = (writer: Writer) => {
            writer.putU32(tx.version);
            if (sigHashType.inputType == SigHashTypeInputs.FIXED) {
                writer.putBytes(this.unsignedTx.prevoutsHash);
            } else {
                writer.putBytes(new Uint8Array(32));
            }
            if (
                sigHashType.inputType == SigHashTypeInputs.FIXED &&
                sigHashType.outputType == SigHashTypeOutputs.ALL
            ) {
                writer.putBytes(this.unsignedTx.sequencesHash);
            } else {
                writer.putBytes(new Uint8Array(32));
            }
            writeOutPoint(input.prevOut, writer);
            scriptCode.writeWithSize(writer);
            writer.putU64(signData.value);
            writer.putU32(input.sequence);
            writer.putBytes(hashOutputs);
            writer.putU32(tx.locktime);
            writer.putU32(sigHashType.toInt());
        };

        const preimageWriterLen = new WriterLength();
        writePreimage(preimageWriterLen);
        const preimageWriter = new WriterBytes(preimageWriterLen.length);
        writePreimage(preimageWriter);

        return {
            bytes: preimageWriter.data,
            scriptCode,
            redeemScript,
        };
    }

    /** Return the TxInput of this UnsignedTxInput */
    public txInput(): TxInput {
        return this.unsignedTx.tx.inputs[this.inputIdx];
    }
}

/** Find the scriptCode that should be signed */
function signDataScriptCode(signData: SignData): Script {
    if (signData.outputScript !== undefined) {
        if (signData.outputScript.isP2sh()) {
            throw new Error(
                'P2SH requires redeemScript to be set, not outputScript',
            );
        }
        return signData.outputScript;
    }
    if (signData.redeemScript === undefined) {
        throw new Error('Must either set outputScript or redeemScript');
    }
    return signData.redeemScript;
}

function txWriterHash(
    tx: Tx,
    fn: (tx: Tx, writer: Writer) => void,
): Uint8Array {
    const writerLength = new WriterLength();
    fn(tx, writerLength);
    const writer = new WriterBytes(writerLength.length);
    fn(tx, writer);
    return sha256d(writer.data);
}

function writePrevouts(tx: Tx, writer: Writer) {
    for (const input of tx.inputs) {
        writeOutPoint(input.prevOut, writer);
    }
}

function writeSequences(tx: Tx, writer: Writer) {
    for (const input of tx.inputs) {
        writer.putU32(input.sequence);
    }
}

function writeOutputs(tx: Tx, writer: Writer) {
    for (const output of tx.outputs) {
        writeTxOutput(output, writer);
    }
}

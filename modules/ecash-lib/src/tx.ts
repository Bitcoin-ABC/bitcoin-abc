// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { fromHexRev } from './io/hex.js';
import { writeVarSize } from './io/varsize.js';
import { Writer } from './io/writer.js';
import { WriterBytes } from './io/writerbytes.js';
import { WriterLength } from './io/writerlength.js';
import { Script } from './script.js';

/**
 * Default value for nSequence of inputs if left undefined; this opts out of
 * BIP68 relative lock-time, and if all inputs have this value, nLockTime is
 * disabled, too.
 *
 * This is chosen as the default as it's the default in the node too,
 * see CTxIn in /src/primitives/transaction.h.
 **/
export const DEFAULT_SEQUENCE = 0xffffffff;

/** COutPoint, pointing to a coin being spent. */
export interface OutPoint {
    /**
     * TxId of the output of the coin, either a big-endian hex encoded TxId
     * or a little-endian bytearray.
     **/
    txid: string | Uint8Array;
    /** Index in the outputs of the tx of the coin. */
    outIdx: number;
}

/** CTxIn, spending an unspent output. */
export interface TxInput {
    /** Points to an output being spent. */
    prevOut: OutPoint;
    /** scriptSig unlocking the output, defaults to the empty Script. */
    script?: Script;
    /** nSequence, defaults to 0xffffffff if unspecified. */
    sequence?: number;
    /** Sign data required to sign an input */
    signData?: SignData;
}

/** CTxOut, creating a new output. */
export interface TxOutput {
    /** Value in satoshis of the output (1 XEC = 100 satoshis) */
    value: number | bigint;
    /** Script locking the output */
    script: Script;
}

/** All the data required to sign an input (using BIP143). */
export interface SignData {
    /** Value of the output being spent */
    value: number | bigint;
    /** Script of the output being spent (not for P2SH) */
    outputScript?: Script;
    /**
     * For P2SH inputs, the preimage of the script hash locking the output being
     * spent.
     **/
    redeemScript?: Script;
}

/** CTransaction, a Bitcoin transaction. */
export class Tx {
    /** nVersion of the tx */
    public version: number;
    /** vin, tx inputs spending outputs of other txs */
    public inputs: TxInput[];
    /** vout, tx outputs created in this tx */
    public outputs: TxOutput[];
    /** nLockTime of the tx, specifies when the tx can be mined earliest */
    public locktime: number;

    public constructor(params?: {
        version?: number;
        inputs?: TxInput[];
        outputs?: TxOutput[];
        locktime?: number;
    }) {
        this.version = params?.version ?? 1;
        this.inputs = params?.inputs ?? [];
        this.outputs = params?.outputs ?? [];
        this.locktime = params?.locktime ?? 0;
    }

    /** Serialize the tx to a byte array */
    public ser(): Uint8Array {
        const writerBytes = new WriterBytes(this.serSize());
        this.write(writerBytes);
        return writerBytes.data;
    }

    /** Calculate the serialized size of the tx */
    public serSize(): number {
        const writerLength = new WriterLength();
        this.write(writerLength);
        return writerLength.length;
    }

    /** Write the tx to the given writer */
    public write(writer: Writer) {
        writer.putU32(this.version);
        writeVarSize(this.inputs.length, writer);
        for (const input of this.inputs) {
            writeTxInput(input, writer);
        }
        writeVarSize(this.outputs.length, writer);
        for (const output of this.outputs) {
            writeTxOutput(output, writer);
        }
        writer.putU32(this.locktime);
    }
}

/** Write an outpoint to a Writer */
export function writeOutPoint(outpoint: OutPoint, writer: Writer): void {
    const txid =
        typeof outpoint.txid === 'string'
            ? fromHexRev(outpoint.txid)
            : outpoint.txid;
    writer.putBytes(txid);
    writer.putU32(outpoint.outIdx);
}

/** Write a TxInput to a Writer */
export function writeTxInput(input: TxInput, writer: Writer): void {
    writeOutPoint(input.prevOut, writer);
    (input.script ?? new Script()).writeWithSize(writer);
    writer.putU32(input.sequence ?? DEFAULT_SEQUENCE);
}

/** Write a TxOutput to a Writer */
export function writeTxOutput(output: TxOutput, writer: Writer): void {
    writer.putU64(output.value);
    output.script.writeWithSize(writer);
}

/** Create a deep copy of the TxInput */
export function copyTxInput(input: TxInput): TxInput {
    return {
        prevOut: {
            txid:
                typeof input.prevOut.txid === 'string'
                    ? input.prevOut.txid
                    : new Uint8Array(input.prevOut.txid),
            outIdx: input.prevOut.outIdx,
        },
        script: input.script?.copy(),
        sequence: input.sequence,
        signData: input.signData && {
            value: input.signData.value,
            outputScript: input.signData.outputScript?.copy(),
            redeemScript: input.signData.redeemScript?.copy(),
        },
    };
}

/** Create a deep copy of the TxOutput */
export function copyTxOutput(output: TxOutput): TxOutput {
    return {
        value: output.value,
        script: output.script.copy(),
    };
}

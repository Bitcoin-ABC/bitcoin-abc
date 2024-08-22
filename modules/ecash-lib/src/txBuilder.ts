// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Ecc, EccDummy } from './ecc.js';
import { sha256d } from './hash.js';
import { WriterBytes } from './io/writerbytes.js';
import { pushBytesOp } from './op.js';
import { Script } from './script.js';
import { SigHashType } from './sigHashType.js';
import {
    DEFAULT_TX_VERSION,
    Tx,
    TxInput,
    TxOutput,
    copyTxInput,
    copyTxOutput,
} from './tx.js';
import { UnsignedTx, UnsignedTxInput } from './unsignedTx.js';

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

/** Builder input that bundles all the data required to sign a TxInput */
export interface TxBuilderInput {
    input: TxInput;
    signatory?: Signatory;
}

/**
 * Output that can either be:
 * - `TxOutput`: A full output with a fixed sats amount
 * - `Script`: A Script which will receive the leftover sats after fees.
 *   Leftover usually is the change the sender gets back from providing more
 *   sats than needed.
 */
export type TxBuilderOutput = TxOutput | Script;

/** Class that can be used to build and sign txs. */
export class TxBuilder {
    /** nVersion of the resulting Tx */
    public version: number;
    /** Inputs that will be signed by the buider */
    public inputs: TxBuilderInput[];
    /**
     * Outputs of the tx, can specify a single leftover (i.e. change) output as
     * a Script.
     **/
    public outputs: TxBuilderOutput[];
    /** nLockTime of the resulting Tx */
    public locktime: number;

    public constructor(params?: {
        version?: number;
        inputs?: TxBuilderInput[];
        outputs?: TxBuilderOutput[];
        locktime?: number;
    }) {
        this.version = params?.version ?? DEFAULT_TX_VERSION;
        this.inputs = params?.inputs ?? [];
        this.outputs = params?.outputs ?? [];
        this.locktime = params?.locktime ?? 0;
    }

    /** Calculte sum of all sats coming in, or `undefined` if some unknown. */
    private inputSum(): bigint | undefined {
        let inputSum = 0n;
        for (const input of this.inputs) {
            if (input.input.signData === undefined) {
                return undefined;
            }
            inputSum += BigInt(input.input.signData.value);
        }
        return inputSum;
    }

    private prepareOutputs(): {
        fixedOutputSum: bigint;
        leftoverIdx: number | undefined;
        outputs: TxOutput[];
    } {
        let fixedOutputSum = 0n;
        let leftoverIdx: number | undefined = undefined;
        let outputs: TxOutput[] = new Array(this.outputs.length);
        for (let idx = 0; idx < this.outputs.length; ++idx) {
            const builderOutput = this.outputs[idx];
            if (builderOutput instanceof Script) {
                if (leftoverIdx !== undefined) {
                    throw 'Multiple leftover outputs, can at most use one';
                }
                leftoverIdx = idx;
                outputs[idx] = {
                    value: 0, // placeholder
                    script: builderOutput.copy(),
                };
            } else {
                fixedOutputSum += BigInt(builderOutput.value);
                outputs[idx] = copyTxOutput(builderOutput);
            }
        }
        return { fixedOutputSum, leftoverIdx, outputs };
    }

    /** Sign the tx built by this builder and return a Tx */
    public sign(ecc: Ecc, feePerKb?: number, dustLimit?: number): Tx {
        const { fixedOutputSum, leftoverIdx, outputs } = this.prepareOutputs();
        const inputs = this.inputs.map(input => copyTxInput(input.input));
        const updateSignatories = (ecc: Ecc, unsignedTx: UnsignedTx) => {
            for (let idx = 0; idx < this.inputs.length; ++idx) {
                const signatory = this.inputs[idx].signatory;
                const input = inputs[idx];
                if (signatory !== undefined) {
                    input.script = signatory(
                        ecc,
                        new UnsignedTxInput({
                            inputIdx: idx,
                            unsignedTx,
                        }),
                    );
                }
            }
        };
        if (leftoverIdx !== undefined) {
            const inputSum = this.inputSum();
            if (inputSum === undefined) {
                throw new Error(
                    'Using a leftover output requires setting SignData.value for all inputs',
                );
            }
            if (feePerKb === undefined) {
                throw new Error(
                    'Using a leftover output requires setting feePerKb',
                );
            }
            if (!Number.isInteger(feePerKb)) {
                throw new Error('feePerKb must be an integer');
            }
            if (dustLimit === undefined) {
                throw new Error(
                    'Using a leftover output requires setting dustLimit',
                );
            }
            const dummyUnsignedTx = UnsignedTx.dummyFromTx(
                new Tx({
                    version: this.version,
                    inputs,
                    outputs,
                    locktime: this.locktime,
                }),
            );
            // Must use dummy here because ECDSA sigs could be too small for fee calc
            updateSignatories(new EccDummy(), dummyUnsignedTx);
            let txSize = dummyUnsignedTx.tx.serSize();
            let txFee = calcTxFee(txSize, feePerKb);
            const leftoverValue = inputSum - (fixedOutputSum + txFee);
            if (leftoverValue < dustLimit) {
                // inputs cannot pay for a dust leftover -> remove & recalc
                outputs.splice(leftoverIdx, 1);
                dummyUnsignedTx.tx.outputs = outputs;
                // Must update signatories again as they might depend on outputs
                updateSignatories(new EccDummy(), dummyUnsignedTx);
                txSize = dummyUnsignedTx.tx.serSize();
                txFee = calcTxFee(txSize, feePerKb);
            } else {
                outputs[leftoverIdx].value = leftoverValue;
            }
            if (inputSum < fixedOutputSum + txFee) {
                throw new Error(
                    `Insufficient input value (${inputSum}): Can only pay for ${
                        inputSum - fixedOutputSum
                    } fees, but ${txFee} required`,
                );
            }
        }
        const unsignedTx = UnsignedTx.fromTx(
            new Tx({
                version: this.version,
                inputs,
                outputs,
                locktime: this.locktime,
            }),
        );
        updateSignatories(ecc, unsignedTx);
        return unsignedTx.tx;
    }
}

/** Calculate the required tx fee for the given txSize and feePerKb,
 *  rounding up */
export function calcTxFee(txSize: number, feePerKb: number): bigint {
    return (BigInt(txSize) * BigInt(feePerKb) + 999n) / 1000n;
}

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

/** Signatory for a P2PKH input. Always uses Schnorr signatures */
export const P2PKHSignatory = (
    sk: Uint8Array,
    pk: Uint8Array,
    sigHashType: SigHashType,
) => {
    return (ecc: Ecc, input: UnsignedTxInput): Script => {
        const preimage = input.sigHashPreimage(sigHashType);
        const sighash = sha256d(preimage.bytes);
        const sig = flagSignature(ecc.schnorrSign(sk, sighash), sigHashType);
        return Script.p2pkhSpend(pk, sig);
    };
};

/** Signatory for a P2PK input. Always uses Schnorr signatures */
export const P2PKSignatory = (sk: Uint8Array, sigHashType: SigHashType) => {
    return (ecc: Ecc, input: UnsignedTxInput): Script => {
        const preimage = input.sigHashPreimage(sigHashType);
        const sighash = sha256d(preimage.bytes);
        const sig = flagSignature(ecc.schnorrSign(sk, sighash), sigHashType);
        return Script.fromOps([pushBytesOp(sig)]);
    };
};

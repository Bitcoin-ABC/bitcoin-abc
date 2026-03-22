// Copyright (c) 2024-2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Ecc, EccDummy } from './ecc.js';
import type { Signatory } from './signatories.js';
import { Script } from './script.js';
import {
    DEFAULT_TX_VERSION,
    Tx,
    TxInput,
    TxOutput,
    copyTxInput,
    copyTxOutput,
} from './tx.js';
import { UnsignedTx, UnsignedTxInput } from './unsignedTx.js';

/** Builder input that bundles all the data required to sign a TxInput */
export interface TxBuilderInput {
    input: TxInput;
    /** Signing callback; see `Signatory` in `signatories.ts`. */
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
            inputSum += BigInt(input.input.signData.sats);
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
        const outputs: TxOutput[] = new Array(this.outputs.length);
        for (let idx = 0; idx < this.outputs.length; ++idx) {
            const builderOutput = this.outputs[idx];
            if ('bytecode' in builderOutput) {
                // If builderOutput instanceof Script
                // Note that the "builderOutput instanceof Script" check may fail due
                // to discrepancies between nodejs and browser environments
                if (leftoverIdx !== undefined) {
                    throw 'Multiple leftover outputs, can at most use one';
                }
                leftoverIdx = idx;
                outputs[idx] = {
                    sats: 0n, // placeholder
                    script: builderOutput.copy(),
                };
            } else {
                fixedOutputSum += BigInt(builderOutput.sats);
                outputs[idx] = copyTxOutput(builderOutput);
            }
        }
        return { fixedOutputSum, leftoverIdx, outputs };
    }

    /**
     * Create a TxBuilder from the given tx.
     * This is useful if tx is unsigned/partially signed and needs to be completed.
     **/
    public static fromTx(tx: Tx): TxBuilder {
        return new TxBuilder({
            version: tx.version,
            inputs: tx.inputs.map(input => ({ input: copyTxInput(input) })),
            outputs: tx.outputs.map(output => copyTxOutput(output)),
            locktime: tx.locktime,
        });
    }

    /** Sign the tx built by this builder and return a Tx */
    public sign(params?: {
        ecc?: Ecc;
        feePerKb?: bigint;
        dustSats?: bigint;
    }): Tx {
        const ecc = params?.ecc ?? new Ecc();
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
                    'Using a leftover output requires setting SignData.sats for all inputs',
                );
            }
            if (params?.feePerKb === undefined) {
                throw new Error(
                    'Using a leftover output requires setting feePerKb',
                );
            }
            if (typeof params.feePerKb !== 'bigint') {
                throw new Error('feePerKb must be a bigint');
            }
            if (params?.dustSats === undefined) {
                throw new Error(
                    'Using a leftover output requires setting dustSats',
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
            let txFee = calcTxFee(txSize, params.feePerKb);
            const leftoverSats = inputSum - (fixedOutputSum + txFee);
            if (leftoverSats < params.dustSats) {
                // inputs cannot pay for a dust leftover -> remove & recalc
                outputs.splice(leftoverIdx, 1);
                dummyUnsignedTx.tx.outputs = outputs;
                // Must update signatories again as they might depend on outputs
                updateSignatories(new EccDummy(), dummyUnsignedTx);
                txSize = dummyUnsignedTx.tx.serSize();
                txFee = calcTxFee(txSize, params.feePerKb);
            } else {
                outputs[leftoverIdx].sats = leftoverSats;
            }
            if (inputSum < fixedOutputSum + txFee) {
                throw new Error(
                    `Insufficient input sats (${inputSum}): Can only pay for ${
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
export function calcTxFee(txSize: number, feePerKb: bigint): bigint {
    return (BigInt(txSize) * BigInt(feePerKb) + 999n) / 1000n;
}

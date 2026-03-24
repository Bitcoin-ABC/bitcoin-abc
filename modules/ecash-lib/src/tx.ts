// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Bytes } from './io/bytes.js';
import { fromHexRev, toHexRev, fromHex, toHex } from './io/hex.js';
import { writeVarSize, readVarSize } from './io/varsize.js';
import { Writer } from './io/writer.js';
import { WriterBytes } from './io/writerbytes.js';
import { WriterLength } from './io/writerlength.js';
import { Ecc } from './ecc.js';
import { Script } from './script.js';
import { sha256d } from './hash.js';
import { flagSignature } from './signatories.js';
import { ALL_BIP143, SigHashType } from './sigHashType.js';
import { UnsignedTx } from './unsignedTx.js';

/**
 * Default value for nSequence of inputs if left undefined; this opts out of
 * BIP68 relative lock-time, and if all inputs have this value, nLockTime is
 * disabled, too.
 *
 * This is chosen as the default as it's the default in the node too,
 * see CTxIn in /src/primitives/transaction.h.
 **/
export const DEFAULT_SEQUENCE = 0xffffffff;

/** Current tx version, see CTransaction in /stc/primitives/transaction.h */
export const DEFAULT_TX_VERSION = 2;

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
    sats: bigint;
    /** Script locking the output */
    script: Script;
}

/** All the data required to sign an input (using BIP143). */
export interface SignData {
    /** Value of the output being spent */
    sats: bigint;
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
        this.version = params?.version ?? DEFAULT_TX_VERSION;
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

    /** Serialize the tx to a hex string */
    public toHex(): string {
        return toHex(this.ser());
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

    /** Deserialize a Tx from a Uint8Array */
    public static deser(data: Uint8Array): Tx {
        const bytes = new Bytes(data);
        const version = bytes.readU32();
        const numInputs = readVarSize(bytes);
        const inputs: TxInput[] = [];
        for (let i = 0; i < numInputs; ++i) {
            // Read OutPoint
            const txid = bytes.readBytes(32);
            const outIdx = bytes.readU32();
            // Read script
            const script = Script.readWithSize(bytes);
            // Read sequence
            const sequence = bytes.readU32();
            inputs.push({
                prevOut: {
                    txid,
                    outIdx,
                },
                script,
                sequence,
            });
        }
        const numOutputs = readVarSize(bytes);
        const outputs: TxOutput[] = [];
        for (let i = 0; i < numOutputs; ++i) {
            outputs.push(readTxOutput(bytes));
        }
        const locktime = bytes.readU32();
        return new Tx({
            version,
            inputs,
            outputs,
            locktime,
        });
    }

    /** Deserialize a Tx from a hex string */
    public static fromHex(hex: string): Tx {
        return Tx.deser(fromHex(hex));
    }

    /**
     * Compute the transaction ID (TxId) as a hex string (little-endian).
     * This follows the eCash convention: the TxId is the double SHA256 of the
     * serialized transaction, returned as a hex string in little-endian (reversed) order.
     * See the node src/primitives/txid.h for more details.
     */
    public txid(): string {
        return toHexRev(sha256d(this.ser()));
    }

    /**
     * Attempt to parse a **non-SegWit** serialized transaction from `data` — the same
     * encoding as {@link Tx.deser} / `Tx.ser()` (version, inputs, outputs, locktime;
     * no witness marker or witness stacks). eCash does not use SegWit transactions,
     * so this is the full-transaction wire format on-chain here. Returns a `Tx` only
     * when `data` is **exactly** one such transaction: the parse must consume the
     * **entire** buffer (no trailing bytes). Returns `undefined` on malformed input
     * or if any bytes remain after `locktime`.
     *
     * **PSBT-only motivation:** Bitcoin ABC’s PSBT input key `0x00` (`PSBT_IN_UTXO`)
     * stores **either** a full previous transaction (BIP 174 “non-witness UTXO”) **or**
     * a compact `CTxOut` (amount + `scriptPubKey`). Callers must disambiguate. Plain
     * {@link Tx.deser} reads a tx from the start of `data` but **does not** require
     * `data.length` to match the serialized length — leftover bytes are ignored, so
     * you cannot use it to prove “this blob is solely a full tx.” This helper is
     * used from PSBT (`resolveWitnessFromKey00` in `psbt.ts`): if `tryDeserExact`
     * succeeds (and the txid matches), treat as non-witness UTXO; otherwise decode as
     * `CTxOut`-shaped bytes.
     */
    public static tryDeserExact(data: Uint8Array): Tx | undefined {
        try {
            const bytes = new Bytes(data);
            const version = bytes.readU32();
            const numInputs = readVarSize(bytes);
            const inputs: TxInput[] = [];
            for (let i = 0; i < numInputs; ++i) {
                const txid = bytes.readBytes(32);
                const outIdx = bytes.readU32();
                const script = Script.readWithSize(bytes);
                const sequence = bytes.readU32();
                inputs.push({
                    prevOut: { txid, outIdx },
                    script,
                    sequence,
                });
            }
            const numOutputs = readVarSize(bytes);
            const outputs: TxOutput[] = [];
            for (let i = 0; i < numOutputs; ++i) {
                outputs.push(readTxOutput(bytes));
            }
            const locktime = bytes.readU32();
            if (bytes.idx !== data.length) {
                return undefined;
            }
            return new Tx({ version, inputs, outputs, locktime });
        } catch {
            return undefined;
        }
    }

    /**
     * Add a signature to a partially-signed multisig input.
     * Verifies the signature against the sighash for each pubkey in the
     * redeem/output script and merges with existing signatures (which pubkey
     * signed is inferred from verification).
     */
    public addMultisigSignature(params: {
        inputIdx: number;
        signature: Uint8Array;
        signData: SignData;
        ecc?: Ecc;
    }): Tx {
        const { inputIdx, signature, signData } = params;
        const ecc = params.ecc ?? new Ecc();
        const input = this.inputs[inputIdx];
        if (!input.script || input.script.bytecode.length === 0) {
            throw new Error(
                `Input ${inputIdx} has no scriptSig to add signature to`,
            );
        }
        const isBare =
            signData.outputScript !== undefined &&
            signData.redeemScript === undefined;
        const parsed = isBare
            ? input.script.parseBareMultisigSpend(signData.outputScript!)
            : input.script.parseP2shMultisigSpend();
        const txWithSignData = new Tx({
            version: this.version,
            inputs: this.inputs.map((inp, i) =>
                i === inputIdx
                    ? { ...copyTxInput(inp), signData }
                    : copyTxInput(inp),
            ),
            outputs: this.outputs,
            locktime: this.locktime,
        });
        const unsignedTx = UnsignedTx.fromTx(txWithSignData);
        const inputAt = unsignedTx.inputAt(inputIdx);
        const sigHashType =
            SigHashType.fromInt(
                (signature[signature.length - 1] ?? 0) & 0xff,
            ) ?? ALL_BIP143;
        const preimage = inputAt.sigHashPreimage(sigHashType);
        const sighash = sha256d(preimage.bytes);
        const sigWithoutFlag = signature.slice(0, -1);

        let pubkeyIndex = -1;
        if (parsed.isSchnorr) {
            for (let i = 0; i < parsed.pubkeys.length; i++) {
                try {
                    ecc.schnorrVerify(
                        sigWithoutFlag,
                        sighash,
                        parsed.pubkeys[i]!,
                    );
                    pubkeyIndex = i;
                    break;
                } catch {
                    /* try next pubkey */
                }
            }
            if (pubkeyIndex < 0) {
                throw new Error(
                    'Schnorr signature does not verify for any pubkey in the multisig script',
                );
            }
        } else {
            for (let i = 0; i < parsed.pubkeys.length; i++) {
                try {
                    ecc.ecdsaVerify(
                        sigWithoutFlag,
                        sighash,
                        parsed.pubkeys[i]!,
                    );
                    pubkeyIndex = i;
                    break;
                } catch {
                    /* try next pubkey */
                }
            }
            if (pubkeyIndex < 0) {
                throw new Error(
                    'ECDSA signature does not verify for any pubkey in the multisig script',
                );
            }
        }

        const sigsByPubkey: (Uint8Array | undefined)[] = Array(
            parsed.pubkeys.length,
        ).fill(undefined);

        if (parsed.isSchnorr) {
            const indices = parsed.pubkeyIndices!;
            const sortedIndices = [...indices].sort((a, b) => a - b);
            for (let i = 0; i < parsed.signatures.length; i++) {
                const sig = parsed.signatures[i];
                if (sig !== undefined && i < sortedIndices.length) {
                    sigsByPubkey[sortedIndices[i]!] = sig;
                }
            }
        } else {
            for (const sig of parsed.signatures) {
                if (sig === undefined) continue;
                const sigNoFlag = sig.slice(0, -1);
                for (let i = 0; i < parsed.pubkeys.length; i++) {
                    try {
                        ecc.ecdsaVerify(sigNoFlag, sighash, parsed.pubkeys[i]!);
                        sigsByPubkey[i] = sig;
                        break;
                    } catch {
                        /* try next pubkey */
                    }
                }
            }
        }
        sigsByPubkey[pubkeyIndex] = signature;

        const nonNullSigs = sigsByPubkey.filter(
            (s): s is Uint8Array => s !== undefined,
        );
        const sigsForScript =
            nonNullSigs.length >= parsed.numSignatures
                ? nonNullSigs.slice(0, parsed.numSignatures)
                : [
                      ...nonNullSigs,
                      ...Array(parsed.numSignatures - nonNullSigs.length).fill(
                          undefined,
                      ),
                  ];

        const redeemScript: Script | undefined =
            !isBare && 'redeemScript' in parsed
                ? (parsed as { redeemScript: Script }).redeemScript
                : undefined;
        const newScriptSig = parsed.isSchnorr
            ? (() => {
                  const signerIndices = new Set<number>();
                  for (
                      let i = 0;
                      i < parsed.pubkeys.length &&
                      signerIndices.size < parsed.numSignatures;
                      i++
                  ) {
                      if (sigsByPubkey[i] !== undefined) signerIndices.add(i);
                  }
                  return isBare
                      ? Script.multisigSpend({
                            signatures: sigsForScript,
                            pubkeyIndices: signerIndices,
                            numPubkeys: parsed.numPubkeys,
                        })
                      : Script.multisigSpend({
                            signatures: sigsForScript,
                            redeemScript,
                            pubkeyIndices: signerIndices,
                        });
              })()
            : Script.multisigSpend({
                  signatures: sigsForScript,
                  redeemScript,
              });

        const newInputs = this.inputs.map((inp, i) =>
            i === inputIdx
                ? { ...copyTxInput(inp), script: newScriptSig }
                : copyTxInput(inp),
        );
        return new Tx({
            version: this.version,
            inputs: newInputs,
            outputs: this.outputs,
            locktime: this.locktime,
        });
    }

    /**
     * Like {@link addMultisigSignature}, but computes the signature from a
     * secret key: BIP143 preimage (or legacy if `sigHashType` is legacy),
     * Schnorr for Schnorr-format multisig spends and ECDSA otherwise.
     */
    public addMultisigSignatureFromKey(params: {
        inputIdx: number;
        sk: Uint8Array;
        signData: SignData;
        /** Defaults to {@link ALL_BIP143}. */
        sigHashType?: SigHashType;
        ecc?: Ecc;
    }): Tx {
        const sigHashType = params.sigHashType ?? ALL_BIP143;
        const ecc = params.ecc ?? new Ecc();
        const { inputIdx, sk, signData } = params;
        const input = this.inputs[inputIdx];
        if (!input.script || input.script.bytecode.length === 0) {
            throw new Error(
                `Input ${inputIdx} has no scriptSig to add signature to`,
            );
        }
        const isBare =
            signData.outputScript !== undefined &&
            signData.redeemScript === undefined;
        const parsed = isBare
            ? input.script.parseBareMultisigSpend(signData.outputScript!)
            : input.script.parseP2shMultisigSpend();
        const txWithSignData = new Tx({
            version: this.version,
            inputs: this.inputs.map((inp, i) =>
                i === inputIdx
                    ? { ...copyTxInput(inp), signData }
                    : copyTxInput(inp),
            ),
            outputs: this.outputs,
            locktime: this.locktime,
        });
        const unsignedTx = UnsignedTx.fromTx(txWithSignData);
        const preimage = unsignedTx
            .inputAt(inputIdx)
            .sigHashPreimage(sigHashType);
        const sighash = sha256d(preimage.bytes);
        const sig = parsed.isSchnorr
            ? ecc.schnorrSign(sk, sighash)
            : ecc.ecdsaSign(sk, sighash);
        const signature = flagSignature(sig, sigHashType);
        return this.addMultisigSignature({
            inputIdx,
            signature,
            signData,
            ecc,
        });
    }

    /**
     * Whether every **multisig** input (identified from `signData`) has enough
     * signatures in its scriptSig. Non-multisig inputs are ignored.
     *
     * If the transaction has **no** multisig inputs, this returns `true` (there
     * is nothing multisig-specific left to satisfy). That can look surprising on
     * a non-multisig or otherwise incomplete tx; this helper is **not** a
     * broadcast-readiness check. Call sites are expected to use it only in
     * multisig / PSBT flows where the question is specifically whether multisig
     * inputs still need more signatures (including mixed txs: non-multisig
     * inputs are finalized elsewhere).
     */
    public isFullySignedMultisig(): boolean {
        for (let i = 0; i < this.inputs.length; i++) {
            const input = this.inputs[i];
            const multisigScript =
                input.signData?.redeemScript !== undefined
                    ? input.signData.redeemScript
                    : input.signData?.outputScript?.isMultisig()
                      ? input.signData!.outputScript
                      : undefined;
            if (multisigScript === undefined) {
                continue;
            }
            if (!input.script || input.script.bytecode.length === 0) {
                return false;
            }
            try {
                const parsed =
                    input.signData?.redeemScript === undefined
                        ? input.script.parseBareMultisigSpend(multisigScript)
                        : input.script.parseP2shMultisigSpend();
                const sigCount = parsed.signatures.filter(
                    s => s !== undefined,
                ).length;
                if (sigCount < parsed.numSignatures) {
                    return false;
                }
            } catch {
                return false;
            }
        }
        return true;
    }
}

export function readTxOutput(bytes: Bytes): TxOutput {
    const sats = bytes.readU64();
    const script = Script.readWithSize(bytes);
    return {
        sats,
        script,
    };
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
    writer.putU64(output.sats);
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
            sats: input.signData.sats,
            outputScript: input.signData.outputScript?.copy(),
            redeemScript: input.signData.redeemScript?.copy(),
        },
    };
}

/** Create a deep copy of the TxOutput */
export function copyTxOutput(output: TxOutput): TxOutput {
    return {
        sats: output.sats,
        script: output.script.copy(),
    };
}

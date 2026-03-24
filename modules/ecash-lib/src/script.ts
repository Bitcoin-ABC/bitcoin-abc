// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { readVarSize, writeVarSize } from './io/varsize.js';
import { Writer } from './io/writer.js';
import { WriterLength } from './io/writerlength.js';
import { WriterBytes } from './io/writerbytes.js';
import { toHex, fromHex } from './io/hex.js';
import {
    isPushOp,
    Op,
    parseNumberFromOp,
    pushBytesOp,
    pushNumberOp,
    readOp,
    writeOp,
} from './op.js';
import {
    OP_0,
    OP_1,
    OP_16,
    OP_CHECKSIG,
    OP_CHECKMULTISIG,
    OP_CODESEPARATOR,
    OP_DUP,
    OP_EQUAL,
    OP_EQUALVERIFY,
    OP_HASH160,
} from './opcode.js';
import { Bytes } from './io/bytes.js';
import { MAX_PUBKEYS_PER_MULTISIG } from './consts.js';
import { Address } from './address/address';

/** A Bitcoin Script locking/unlocking a UTXO */
export class Script {
    public bytecode: Uint8Array;

    /** Create a new Script with the given bytecode or empty */
    public constructor(bytecode?: Uint8Array) {
        this.bytecode = bytecode ?? new Uint8Array();
    }

    /**
     * Write the script to the writer with the script size as VARINT
     * prepended.
     **/
    public writeWithSize(writer: Writer) {
        writeVarSize(this.bytecode.length, writer);
        writer.putBytes(this.bytecode);
    }

    public static readWithSize(bytes: Bytes) {
        const size = readVarSize(bytes);
        return new Script(bytes.readBytes(Number(size)));
    }

    /** Build a Script from the given Script Ops */
    public static fromOps(ops: Op[]): Script {
        let scriptSize = 0;
        for (const op of ops) {
            const writerLength = new WriterLength();
            writeOp(op, writerLength);
            scriptSize += writerLength.length;
        }
        const bytecodeWriter = new WriterBytes(scriptSize);
        for (const op of ops) {
            writeOp(op, bytecodeWriter);
        }
        return new Script(bytecodeWriter.data);
    }

    public static fromAddress(address: string): Script {
        // make Address from address
        const thisAddress = Address.fromCashAddress(address);

        switch (thisAddress.type) {
            case 'p2pkh': {
                return Script.p2pkh(fromHex(thisAddress.hash));
            }
            case 'p2sh': {
                return Script.p2sh(fromHex(thisAddress.hash));
            }
            default: {
                // Note we should never get here, as Address constructor
                // only supports p2pkh and p2sh
                throw new Error(
                    `Unsupported address type: ${thisAddress.type}`,
                );
            }
        }
    }

    /** Iterate over the Ops of this Script */
    public ops(): ScriptOpIter {
        return new ScriptOpIter(new Bytes(this.bytecode));
    }

    /** Create a deep copy of this Script */
    public copy(): Script {
        return new Script(new Uint8Array(this.bytecode));
    }

    /**
     * Find the n-th OP_CODESEPARATOR (0-based) and cut out the bytecode
     * following it. Required for signing BIP143 scripts that have an
     * OP_CODESEPARATOR.
     *
     * Throw an error if the n-th OP_CODESEPARATOR doesn't exist.
     *
     * Historically this opcode has been seen as obscure and useless, but in
     * BIP143 sighash-based covenants, basically every covenant benefits from
     * its usage, by trimming down the sighash preimage size and thus tx size.
     *
     * Really long Scripts will have a big BIP143 preimage, which costs precious
     * bytes (and the preimage might even go over the 520 pushdata limit).
     * This can be trimmed down to just one single byte by ending the covenant
     * in `... OP_CODESEPARATOR OP_CHECKSIG`, in which case the BIP143 signature
     * algo will cut out everything after the OP_CODESEPARATOR, so only the
     * OP_CHECKSIG remains.
     * If the covenant bytecode is 520 or so, this would save 519 bytes.
     */
    public cutOutCodesep(nCodesep: number): Script {
        const ops = this.ops();
        let op: Op | undefined;
        let nCodesepsFound = 0;
        while ((op = ops.next()) !== undefined) {
            if (op == OP_CODESEPARATOR) {
                if (nCodesepsFound == nCodesep) {
                    return new Script(this.bytecode.slice(ops.bytes.idx));
                }
                nCodesepsFound++;
            }
        }
        throw new Error('OP_CODESEPARATOR not found');
    }

    /**
     * Whether the Script is a P2SH Script.
     * Matches CScript::IsPayToScriptHash in /src/script/script.h.
     **/
    public isP2sh(): boolean {
        if (this.bytecode.length != 23) {
            return false;
        }
        return (
            this.bytecode[0] == OP_HASH160 &&
            this.bytecode[1] == 20 &&
            this.bytecode[22] == OP_EQUAL
        );
    }

    /**
     * Return hex string of this Script's bytecode
     */
    public toHex(): string {
        return toHex(this.bytecode);
    }

    /** Build a P2SH script for the given script hash */
    public static p2sh(scriptHash: Uint8Array): Script {
        if (scriptHash.length !== 20) {
            throw new Error(
                `scriptHash length must be 20, got ${scriptHash.length}`,
            );
        }
        return Script.fromOps([OP_HASH160, pushBytesOp(scriptHash), OP_EQUAL]);
    }

    /** Build a P2PKH script for the given public key hash */
    public static p2pkh(pkh: Uint8Array): Script {
        if (pkh.length !== 20) {
            throw new Error(`pkh length must be 20, got ${pkh.length}`);
        }
        return Script.fromOps([
            OP_DUP,
            OP_HASH160,
            pushBytesOp(pkh),
            OP_EQUALVERIFY,
            OP_CHECKSIG,
        ]);
    }

    /** Build a scriptSig for spending a P2PKH output */
    public static p2pkhSpend(pk: Uint8Array, sig: Uint8Array): Script {
        return Script.fromOps([pushBytesOp(sig), pushBytesOp(pk)]);
    }

    /**
     * Build m-of-n multisig script: OP_m pubkey1 pubkey2 ... pubkey_n OP_n OP_CHECKMULTISIG.
     * Works for P2SH-wrapped or bare multisig.
     * Pubkeys are used in the order given; callers who want canonical (sorted) multisig
     * must sort pubkeys before calling.
     */
    public static multisig(minNumPks: number, pubkeys: Uint8Array[]): Script {
        const numPubkeys = pubkeys.length;
        if (minNumPks < 1) {
            throw new Error(`minNumPks must be >= 1 (got ${minNumPks})`);
        }
        if (minNumPks > numPubkeys) {
            throw new Error(
                `minNumPks must be <= numPubkeys (got ${minNumPks} of ${numPubkeys})`,
            );
        }
        if (numPubkeys > MAX_PUBKEYS_PER_MULTISIG) {
            throw new Error(
                `numPubkeys must be <= ${MAX_PUBKEYS_PER_MULTISIG} (got ${numPubkeys})`,
            );
        }
        const ops: Op[] = [
            pushNumberOp(minNumPks),
            ...pubkeys.map(pk => pushBytesOp(pk)),
            pushNumberOp(numPubkeys),
            OP_CHECKMULTISIG,
        ];
        return Script.fromOps(ops);
    }

    /**
     * Return true iff this script has the shape of a standard multisig output script
     * `OP_m pubkey_1 ... pubkey_N OP_N OP_CHECKMULTISIG` (fixed size: `N + 3` ops).
     */
    public isMultisig(): boolean {
        const ops: Op[] = [];
        const iter = this.ops();
        let op: Op | undefined;
        while ((op = iter.next()) !== undefined) {
            ops.push(op);
        }
        if (ops.length < 4 || ops[ops.length - 1] !== OP_CHECKMULTISIG) {
            return false;
        }
        try {
            parseNumberFromOp(ops[0]!);
            const numPubkeys = Number(parseNumberFromOp(ops[ops.length - 2]!));
            return ops.length === numPubkeys + 3;
        } catch {
            return false;
        }
    }

    /**
     * Build scriptSig for multisig: <dummy> sig1 sig2 ... sig_m [redeemScript].
     * Omit redeemScript for bare multisig; include for P2SH-wrapped.
     * Use undefined for missing signatures (replaced with 0x01 placeholder).
     * For Schnorr sigs, pass pubkeyIndices (set of signer indices) to build the
     * checkbits dummy; signatures must be ordered by sorted pubkeyIndices.
     * The full set of signer indices must be known when building Schnorr format.
     * For partially signed inputs where the final signers are not yet known,
     * use ECDSA format (omit pubkeyIndices) until the full signer set is determined.
     * Ref spec https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/2019-11-15-schnorrmultisig.md
     */
    public static multisigSpend(params: {
        signatures: (Uint8Array | undefined)[];
        redeemScript?: Script;
        pubkeyIndices?: Set<number>;
        /** For bare Schnorr multisig: total pubkey count when redeemScript omitted */
        numPubkeys?: number;
    }): Script {
        const { signatures, redeemScript, pubkeyIndices, numPubkeys } = params;
        const PLACEHOLDER = new Uint8Array([0x01]);
        let dummyOp: Op;
        if (pubkeyIndices !== undefined) {
            const nVal =
                numPubkeys ??
                (redeemScript !== undefined
                    ? redeemScript.parseMultisigRedeemScript().numPubkeys
                    : undefined);
            if (nVal === undefined) {
                throw new Error(
                    'pubkeyIndices requires redeemScript or numPubkeys to derive checkbits',
                );
            }
            const mVal = redeemScript
                ? redeemScript.parseMultisigRedeemScript().numSignatures
                : signatures.length;
            if (pubkeyIndices.size !== mVal) {
                throw new Error(
                    `pubkeyIndices must have ${mVal} elements for ${mVal}-of-${nVal}`,
                );
            }
            for (const i of pubkeyIndices) {
                if (i < 0 || i >= nVal) {
                    throw new Error(
                        `pubkeyIndices index ${i} out of range [0, ${nVal})`,
                    );
                }
            }
            dummyOp = pushBytesOp(
                checkbitsFromPubkeyIndices(pubkeyIndices, nVal),
            );
        } else {
            dummyOp = OP_0;
        }
        const ops: Op[] = [
            dummyOp,
            ...signatures.map(sig =>
                pushBytesOp(sig !== undefined ? sig : PLACEHOLDER),
            ),
        ];
        if (redeemScript !== undefined) {
            ops.push(pushBytesOp(redeemScript.bytecode));
        }
        return Script.fromOps(ops);
    }

    /**
     * Parse P2SH multisig spend script to extract signatures and redeem script.
     * Returns signatures (undefined for placeholder) and parsed numSignatures, numPubkeys from redeem script.
     * Supports both ECDSA (OP_0 + sigs) and Schnorr (checkbits + sigs) formats.
     * Schnorr format accepts partial scriptSigs (checkbits may have fewer bits set than
     * numSignatures when earlier signers may not yet know who else will sign).
     * Not for bare multisig (where the locking script is in output, not input).
     */
    public parseP2shMultisigSpend(): {
        signatures: (Uint8Array | undefined)[];
        redeemScript: Script;
        numSignatures: number;
        numPubkeys: number;
        pubkeys: Uint8Array[];
        isSchnorr: boolean;
        /** Indices of signers (0..numPubkeys-1) for Schnorr; undefined for ECDSA */
        pubkeyIndices?: Set<number>;
    } {
        const ops: Op[] = [];
        const iter = this.ops();
        let op: Op | undefined;
        while ((op = iter.next()) !== undefined) {
            ops.push(op);
        }
        if (ops.length < 3) {
            throw new Error('Invalid multisig scriptSig: too few ops');
        }
        const redeemScriptOp = ops[ops.length - 1];
        if (!isPushOp(redeemScriptOp)) {
            throw new Error(
                'Invalid multisig scriptSig: redeem script must be final push',
            );
        }
        const redeemScript = new Script(redeemScriptOp.data);
        const parsed = Script.parseMultisigScriptSig(
            ops.slice(0, -1),
            redeemScript,
        );
        return { ...parsed, redeemScript };
    }

    /**
     * Parse bare multisig spend scriptSig to extract signatures.
     * For bare multisig the output script is the multisig script; the scriptSig
     * is [dummy] sig1 sig2 ... sig_m with no redeem script.
     * Assumes a fully-formed scriptSig (see parseP2shMultisigSpend for details).
     * @param outputScript - The multisig output script (OP_m pubkey1 ... pubkey_n OP_n OP_CHECKMULTISIG)
     */
    public parseBareMultisigSpend(outputScript: Script): {
        signatures: (Uint8Array | undefined)[];
        numSignatures: number;
        numPubkeys: number;
        pubkeys: Uint8Array[];
        isSchnorr: boolean;
        pubkeyIndices?: Set<number>;
    } {
        const ops: Op[] = [];
        const iter = this.ops();
        let op: Op | undefined;
        while ((op = iter.next()) !== undefined) {
            ops.push(op);
        }
        return Script.parseMultisigScriptSig(ops, outputScript);
    }

    /** Parse an OP_m ... OP_CHECKMULTISIG redeem script (used by multisig PSBT flows). */
    public parseMultisigRedeemScript(): {
        numSignatures: number;
        numPubkeys: number;
        pubkeys: Uint8Array[];
    } {
        const ops: Op[] = [];
        const iter = this.ops();
        let op: Op | undefined;
        while ((op = iter.next()) !== undefined) {
            ops.push(op);
        }
        if (ops.length < 4) {
            throw new Error('Invalid multisig redeem script');
        }
        const first = ops[0];
        const lastBeforeCheck = ops[ops.length - 2];
        const numSignatures = Number(parseNumberFromOp(first));
        const numPubkeys = Number(parseNumberFromOp(lastBeforeCheck));
        const pubkeys = ops
            .slice(1, -2)
            .filter((op): op is { opcode: number; data: Uint8Array } =>
                isPushOp(op),
            )
            .map(op => op.data);
        if (pubkeys.length !== numPubkeys) {
            throw new Error(
                `Invalid multisig redeem script: expected ${numPubkeys} pubkeys, got ${pubkeys.length}`,
            );
        }
        return { numSignatures, numPubkeys, pubkeys };
    }

    private static parseMultisigScriptSig(
        ops: Op[],
        outputScript: Script,
    ): {
        signatures: (Uint8Array | undefined)[];
        numSignatures: number;
        numPubkeys: number;
        pubkeys: Uint8Array[];
        isSchnorr: boolean;
        pubkeyIndices?: Set<number>;
    } {
        const { numSignatures, numPubkeys, pubkeys } =
            outputScript.parseMultisigRedeemScript();
        if (ops.length !== numSignatures + 1) {
            throw new Error(
                `Invalid multisig scriptSig: expected ${numSignatures + 1} ops (dummy + ${numSignatures} sigs), got ${ops.length}`,
            );
        }
        const expectedCheckbitsLen = Math.floor((numPubkeys + 7) / 8);
        let isSchnorr: boolean;
        let sigOps: Op[];
        let pubkeyIndices: Set<number> | undefined;

        if (ops[0] === OP_0) {
            isSchnorr = false;
            sigOps = ops.slice(1);
        } else {
            let checkbitsData: Uint8Array;
            const firstOp = ops[0];
            if (
                typeof firstOp === 'number' &&
                firstOp >= OP_1 &&
                firstOp <= OP_16
            ) {
                checkbitsData = new Uint8Array([firstOp - 0x50]);
            } else if (isPushOp(firstOp) && firstOp.data.length > 0) {
                checkbitsData = firstOp.data;
            } else {
                throw new Error(
                    'Invalid multisig scriptSig: must start with OP_0 (ECDSA) or checkbits push (Schnorr)',
                );
            }
            if (checkbitsData.length !== expectedCheckbitsLen) {
                throw new Error(
                    `Invalid Schnorr multisig: checkbits length ${checkbitsData.length} != expected ${expectedCheckbitsLen} for numPubkeys=${numPubkeys}`,
                );
            }
            isSchnorr = true;
            pubkeyIndices = checkbitsToIndices(checkbitsData, numPubkeys);
            sigOps = ops.slice(1);
        }

        if (sigOps.length !== numSignatures) {
            throw new Error(
                `Invalid multisig scriptSig: expected ${numSignatures} signatures, got ${sigOps.length}`,
            );
        }
        const signatures: (Uint8Array | undefined)[] = sigOps.map(op => {
            if (!isPushOp(op)) return undefined;
            return op.data.length === 1 && op.data[0] === 0x01
                ? undefined
                : op.data;
        });
        return {
            signatures,
            numSignatures,
            numPubkeys,
            pubkeys,
            isSchnorr,
            ...(pubkeyIndices !== undefined && { pubkeyIndices }),
        };
    }
}

/**
 * Build checkbits byte array from pubkey indices for Schnorr multisig.
 * Spec: length = floor((N+7)/8), little-endian, bit i = 1 iff index i in set.
 */
function checkbitsFromPubkeyIndices(
    indices: Set<number>,
    numPubkeys: number,
): Uint8Array {
    const numBytes = Math.floor((numPubkeys + 7) / 8);
    const bytes = new Uint8Array(numBytes);
    for (const i of indices) {
        bytes[i >>> 3] |= 1 << (i & 7);
    }
    return bytes;
}

/**
 * Parse checkbits byte array to set of pubkey indices for Schnorr multisig.
 * Inverse of checkbitsFromPubkeyIndices.
 */
function checkbitsToIndices(
    checkbits: Uint8Array,
    numPubkeys: number,
): Set<number> {
    const indices = new Set<number>();
    for (let i = 0; i < numPubkeys; i++) {
        if ((checkbits[i >>> 3]! & (1 << (i & 7))) !== 0) {
            indices.add(i);
        }
    }
    return indices;
}

/** Iterator over the Ops of a Script. */
export class ScriptOpIter {
    bytes: Bytes;

    public constructor(bytes: Bytes) {
        this.bytes = bytes;
    }

    /**
     * Read the next Op and return it, or `undefined` if there are no more Ops.
     * Throws an error if reading the next op failed.
     */
    public next(): Op | undefined {
        if (this.bytes.idx >= this.bytes.data.length) {
            return undefined;
        }
        return readOp(this.bytes);
    }
}

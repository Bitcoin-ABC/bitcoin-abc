// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { readVarSize, writeVarSize } from './io/varsize.js';
import { Writer } from './io/writer.js';
import { WriterLength } from './io/writerlength.js';
import { WriterBytes } from './io/writerbytes.js';
import { fromHex } from './io/hex.js';
import { Op, pushBytesOp, readOp, writeOp } from './op.js';
import {
    OP_CHECKSIG,
    OP_CODESEPARATOR,
    OP_DUP,
    OP_EQUAL,
    OP_EQUALVERIFY,
    OP_HASH160,
} from './opcode.js';
import { Bytes } from './io/bytes.js';
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

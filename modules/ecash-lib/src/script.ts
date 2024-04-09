// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { writeVarSize } from './io/varsize.js';
import { Writer } from './io/writer.js';

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
}

// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Int } from './int.js';
import { Writer } from './writer.js';

/**
 * Implementation of `Writer` which writes to an array of pre-allocated size.
 * It's intended to be used in unison with `WriterLength`, which first finds
 * out the length of the serialized object and then the actual data is written
 * using this class.
 **/
export class WriterBytes implements Writer {
    public data: Uint8Array;
    public view: DataView;
    public idx: number;

    /** Create a new WriterBytes with the given pre-allocated size */
    public constructor(length: number) {
        this.data = new Uint8Array(length);
        this.view = new DataView(
            this.data.buffer,
            this.data.byteOffset,
            this.data.byteLength,
        );
        this.idx = 0;
    }

    /** Write a single byte */
    public putU8(value: Int): void {
        if (value < 0 || value > 0xff) {
            throw `Cannot fit ${value} into a u8`;
        }
        this.ensureSize(1);
        this.data[this.idx] = Number(value);
        this.idx++;
    }

    /** Write a 2-byte little-endian integer (uint16_t) */
    public putU16(value: Int): void {
        if (value < 0 || value > 0xffff) {
            throw `Cannot fit ${value} into a u16`;
        }
        this.ensureSize(2);
        this.view.setUint16(this.idx, Number(value), true);
        this.idx += 2;
    }

    /** Write a 4-byte little-endian integer (uint32_t) */
    public putU32(value: Int): void {
        if (value < 0 || value > 0xffffffff) {
            throw `Cannot fit ${value} into a u32`;
        }
        this.ensureSize(4);
        this.view.setUint32(this.idx, Number(value), true);
        this.idx += 4;
    }

    /** Write an 8-byte little-endian integer (uint64_t) */
    public putU64(value: Int): void {
        if (value < 0 || value > 0xffffffffffffffffn) {
            throw `Cannot fit ${value} into a u64`;
        }
        this.ensureSize(8);
        this.view.setBigUint64(this.idx, BigInt(value), true);
        this.idx += 8;
    }

    /** Write the given bytes */
    public putBytes(bytes: Uint8Array): void {
        this.ensureSize(bytes.length);
        this.data.set(bytes, this.idx);
        this.idx += bytes.length;
    }

    private ensureSize(extraBytes: number) {
        if (this.data.length < this.idx + extraBytes) {
            throw (
                `Not enough bytes: Tried writing ${extraBytes} byte(s), but ` +
                `only ${this.data.length - this.idx} byte(s) have been ` +
                `pre-allocated`
            );
        }
    }
}

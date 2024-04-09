// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Int } from './int.js';
import { Writer } from './writer.js';

/**
 * Writer implementation which only measures the length of the serialized
 * output but doesn't actually store any byte data.
 **/
export class WriterLength implements Writer {
    public length: number;

    public constructor() {
        this.length = 0;
    }

    /** Write a single byte */
    public putU8(_value: Int): void {
        this.length++;
    }

    /** Write a 2-byte little-endian integer (uint16_t) */
    public putU16(_value: Int): void {
        this.length += 2;
    }

    /** Write a 4-byte little-endian integer (uint32_t) */
    public putU32(_value: Int): void {
        this.length += 4;
    }

    /** Write an 8-byte little-endian integer (uint64_t) */
    public putU64(_value: Int): void {
        this.length += 8;
    }

    /** Write the given bytes */
    public putBytes(bytes: Uint8Array): void {
        this.length += bytes.length;
    }
}

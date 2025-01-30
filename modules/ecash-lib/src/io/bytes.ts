// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export type Endian = 'LE' | 'BE';

export function endianToBool(endian?: Endian): boolean {
    if (!endian) {
        // By default, little endian
        return true;
    }
    return endian === 'LE';
}

/** Reads ints/bytes from a Uint8Array. All integers are little-endian. */
export class Bytes {
    public data: Uint8Array;
    public view: DataView;
    public idx: number;

    /** Create a new Bytes that reads from the given data */
    public constructor(data: Uint8Array) {
        this.data = data;
        this.view = new DataView(
            this.data.buffer,
            this.data.byteOffset,
            this.data.byteLength,
        );
        this.idx = 0;
    }

    /** Read a single byte */
    public readU8(): number {
        this.ensureSize(1);
        const result = this.data[this.idx];
        this.idx++;
        return result;
    }

    /** Read 2-byte little-endian integer (uint16_t) */
    public readU16(endian?: Endian): number {
        this.ensureSize(2);
        const result = this.view.getUint16(this.idx, endianToBool(endian));
        this.idx += 2;
        return result;
    }

    /** Read 4-byte little-endian integer (uint32_t) */
    public readU32(endian?: Endian): number {
        this.ensureSize(4);
        const result = this.view.getUint32(this.idx, endianToBool(endian));
        this.idx += 4;
        return result;
    }

    /** Read 8-byte little-endian integer (uint64_t) */
    public readU64(endian?: Endian): bigint {
        this.ensureSize(8);
        const result = this.view.getBigUint64(this.idx, endianToBool(endian));
        this.idx += 8;
        return result;
    }

    /** Read the given number of bytes as array */
    public readBytes(numBytes: number): Uint8Array {
        this.ensureSize(numBytes);
        const result = this.data.slice(this.idx, this.idx + numBytes);
        this.idx += numBytes;
        return result;
    }

    private ensureSize(extraBytes: number) {
        if (this.data.length < this.idx + extraBytes) {
            throw (
                `Not enough bytes: Tried reading ${extraBytes} byte(s), but ` +
                `there are only ${this.data.length - this.idx} byte(s) left`
            );
        }
    }
}

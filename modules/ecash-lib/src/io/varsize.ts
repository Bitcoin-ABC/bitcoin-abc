// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Bytes } from './bytes.js';
import { Writer } from './writer.js';
import { Int } from './int.js';

/**
 * Read a VARINT, which encodes a size in the Bitcoin protocol, see:
 * https://en.bitcoin.it/wiki/Protocol_documentation#Variable_length_integer
 */
export function readVarSize(bytes: Bytes): Int {
    const firstByte = bytes.readU8();
    if (firstByte <= 0xfc) {
        return firstByte;
    } else if (firstByte == 0xfd) {
        return bytes.readU16();
    } else if (firstByte == 0xfe) {
        return bytes.readU32();
    } else if (firstByte == 0xff) {
        return bytes.readU64();
    } else {
        throw 'Unreachable';
    }
}

/**
 * Write a VARINT, which encodes a size in the Bitcoin protocol, see:
 * https://en.bitcoin.it/wiki/Protocol_documentation#Variable_length_integer
 * @param size Size integer to write
 * @param writer Writer to write the size to
 */
export function writeVarSize(size: Int, writer: Writer) {
    if (size <= 0xfc) {
        writer.putU8(size);
    } else if (size <= 0xffff) {
        writer.putU8(0xfd);
        writer.putU16(size);
    } else if (size <= 0xffffffff) {
        writer.putU8(0xfe);
        writer.putU32(size);
    } else if (size <= 0xffffffffffffffffn) {
        writer.putU8(0xff);
        writer.putU64(size);
    } else {
        throw 'Integer too big for VarSize';
    }
}

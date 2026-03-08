// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { MAX_SCRIPTNUM_BYTE_SIZE } from './consts.js';
import { Bytes } from './io/bytes.js';
import { Writer } from './io/writer.js';
import {
    OP_0,
    OP_1,
    OP_1NEGATE,
    OP_16,
    OP_PUSHDATA1,
    OP_PUSHDATA2,
    OP_PUSHDATA4,
    Opcode,
} from './opcode.js';

/**
 * A single operation in Bitcoin script, either a singular non-pushop code or
 * a `PushOp` with an opcode and data attached.
 **/
export type Op = Opcode | PushOp;

/**
 * An Op that pushes some data onto the stack, will use `opcode` to push the
 * data
 **/
export interface PushOp {
    opcode: Opcode;
    data: Uint8Array;
}

/**
 * Check if bytes are a minimally encoded script number (not arbitrary data).
 * See CScriptNum::IsMinimallyEncoded in script/script.cpp.
 */
function isMinimallyEncoded(data: Uint8Array): boolean {
    if (data.length === 0) return true;
    // Check that the number is encoded with the minimum possible number of bytes.
    // If the most-significant-byte (excluding the sign bit) is zero then we're not minimal.
    // This also rejects the negative-zero encoding, 0x80.
    const last = data[data.length - 1]!;
    if ((last & 0x7f) === 0) {
        // One exception: if there's more than one byte and the most significant bit of the
        // second-to-last byte is set, it would conflict with the sign bit. E.g. +-255
        // encode to 0xff00 and 0xff80 respectively.
        if (data.length <= 1 || (data[data.length - 2]! & 0x80) === 0) {
            return false;
        }
    }
    return true;
}

/**
 * Decode a minimally-encoded script number from bytes (little-endian, sign-magnitude).
 * Validates size and minimal encoding; callers can rely on returned value being valid.
 * Always returns bigint for type safety and full 64-bit range (matches CScriptNum::getint).
 * Empty byte array decodes to 0.
 * @throws Error if data exceeds max size or is not minimally encoded
 */
function decodeScriptNum(data: Uint8Array): bigint {
    if (data.length === 0) {
        return 0n;
    }
    if (data.length > MAX_SCRIPTNUM_BYTE_SIZE) {
        throw new Error(
            `Script number exceeds maximum size (${data.length} > ${MAX_SCRIPTNUM_BYTE_SIZE} bytes)`,
        );
    }
    if (!isMinimallyEncoded(data)) {
        throw new Error('Script number is not minimally encoded');
    }
    let result = 0n;
    for (let i = 0; i < data.length; i++) {
        result |= BigInt(data[i]!) << BigInt(8 * i);
    }
    if (data[data.length - 1]! & 0x80) {
        const mask = ~(0x80n << BigInt(8 * (data.length - 1)));
        result &= mask;
        result = -result;
    }
    return result;
}

/**
 * Check if the PushOp uses minimal push encoding for its data length.
 * pushNumberOp always produces minimal pushes.
 */
function isMinimalPushOp(pushOp: PushOp): boolean {
    const len = pushOp.data.length;
    if (len === 0) return pushOp.opcode === OP_0;
    if (len >= 1 && len <= 0x4b) return pushOp.opcode === len;
    if (len >= 0x4c && len <= 0xff) return pushOp.opcode === OP_PUSHDATA1;
    if (len >= 0x100 && len <= 0xffff) return pushOp.opcode === OP_PUSHDATA2;
    if (len >= 0x10000 && len <= 0xffffffff)
        return pushOp.opcode === OP_PUSHDATA4;
    return false;
}

/**
 * Parse a number from a script op.
 * Inverse of pushNumberOp: handles OP_0 (0), OP_1NEGATE (-1), OP_1 through OP_16,
 * single-byte push data, and multi-byte minimal script number encoding (up to 64-bit).
 * Always returns bigint for type safety (matches CScriptNum::getint).
 * @throws Error with descriptive message if the op does not encode a number
 */
export function parseNumberFromOp(op: Op): bigint {
    if (typeof op === 'number') {
        if (op === OP_0) {
            return 0n;
        }
        if (op === OP_1NEGATE) {
            return -1n;
        }
        if (op >= OP_1 && op <= OP_16) {
            return BigInt(op - 0x50);
        }
        throw new Error(
            `Opcode 0x${op.toString(16)} does not encode a number (expected OP_0, OP_1NEGATE, or OP_1-OP_16)`,
        );
    }
    if (!isPushOp(op)) {
        throw new Error('Op is not a push op');
    }
    if (!isMinimalPushOp(op)) {
        throw new Error(
            `Push uses non-minimal encoding (opcode 0x${op.opcode.toString(16)} for ${op.data.length} bytes)`,
        );
    }
    return decodeScriptNum(op.data);
}

/** Returns true if the given object is a `PushOp` */
export function isPushOp(op: any): op is PushOp {
    if (!op || typeof op !== 'object') {
        return false;
    }

    // eslint-disable-next-line no-prototype-builtins
    if (!op.hasOwnProperty('opcode') || !op.hasOwnProperty('data')) {
        return false;
    }
    return typeof op.opcode === 'number' && op.data instanceof Uint8Array;
}

/** Read a single Script operation from the bytes */
export function readOp(bytes: Bytes): Op {
    const opcode = bytes.readU8();
    let numBytes: number;
    switch (opcode) {
        case OP_PUSHDATA1:
            numBytes = bytes.readU8();
            break;
        case OP_PUSHDATA2:
            numBytes = bytes.readU16();
            break;
        case OP_PUSHDATA4:
            numBytes = bytes.readU32();
            break;
        default:
            if (opcode < 0x01 || opcode > 0x4b) {
                // Non-push opcode
                return opcode;
            }
            numBytes = opcode;
    }
    const data = bytes.readBytes(numBytes);
    return { opcode, data };
}

/** Write a Script operation to the writer */
export function writeOp(op: Op, writer: Writer) {
    if (typeof op == 'number') {
        writer.putU8(op);
        return;
    }
    if (!isPushOp(op)) {
        throw `Unexpected op: ${op}`;
    }
    writer.putU8(op.opcode);
    switch (op.opcode) {
        case OP_PUSHDATA1:
            writer.putU8(op.data.length);
            break;
        case OP_PUSHDATA2:
            writer.putU16(op.data.length);
            break;
        case OP_PUSHDATA4:
            writer.putU32(op.data.length);
            break;
        default:
            if (op.opcode < 0 || op.opcode > 0x4b) {
                throw `Not a pushop opcode: 0x${op.opcode.toString(16)}`;
            }
            if (op.opcode != op.data.length) {
                throw (
                    `Inconsistent PushOp, claims to push ${op.opcode} bytes ` +
                    `but actually has ${op.data.length} bytes attached`
                );
            }
    }
    writer.putBytes(op.data);
}

/** Return an Op that minimally pushes the given bytes onto the stack */
export function pushBytesOp(data: Uint8Array): Op {
    if (data.length == 0) {
        return OP_0;
    } else if (data.length == 1) {
        if (data[0] >= 1 && data[0] <= 16) {
            return data[0] + 0x50;
        } else if (data[0] == 0x81) {
            return OP_1NEGATE;
        }
    }
    let opcode: Opcode;
    if (data.length >= 0x01 && data.length <= 0x4b) {
        opcode = data.length;
    } else if (data.length >= 0x4c && data.length <= 0xff) {
        opcode = OP_PUSHDATA1;
    } else if (data.length >= 0x100 && data.length <= 0xffff) {
        opcode = OP_PUSHDATA2;
    } else if (data.length >= 0x10000 && data.length <= 0xffffffff) {
        opcode = OP_PUSHDATA4;
    } else {
        throw 'Bytes way too large';
    }
    return { opcode, data };
}

/**
 * Returns an Op that pushes the minimally encoded byte representation of a
 * number to the stack. The bytes pushed to the stack can be used directly
 * without the need for OP_BIN2NUM.
 */
export function pushNumberOp(value: number | bigint): Op {
    if (value == 0) {
        return OP_0;
    }

    // Prepare number for encoding. The algorithm below replicates the one used
    // in `src/script/script.h` intentionally to avoid discrepancies.
    const auxValue = BigInt(value);
    const bytes: number[] = [];
    const negative = auxValue < 0;
    let absvalue = negative ? ~auxValue + 1n : auxValue;

    // Encode value in little endian byte order by iteratively pushing the
    // least significant byte until shifting right 1 more byte produces 0
    while (absvalue) {
        bytes.push(Number(absvalue & 0xffn));
        absvalue >>= 8n;
    }

    // The MSB will encode the sign which means that, if the previous encoding
    // of the absolute value uses that bit, a new byte must be added to encode
    // the sign. If bit is not set, then it must be set for negative numbers.
    const last = bytes[bytes.length - 1];
    if (last & 0x80) {
        bytes.push(negative ? 0x80 : 0x00);
    } else if (negative) {
        bytes[bytes.length - 1] = last | 0x80;
    }

    return pushBytesOp(Uint8Array.from(bytes));
}

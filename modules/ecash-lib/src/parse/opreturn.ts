// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { OP_RETURN_MAX_BYTES } from '../consts.js';
import { toHex } from '../io/hex.js';
import {
    OP_RETURN,
    OP_0,
    OP_1NEGATE,
    OP_RESERVED,
    OP_1,
    OP_2,
    OP_3,
    OP_4,
    OP_5,
    OP_6,
    OP_7,
    OP_8,
    OP_9,
    OP_10,
    OP_11,
    OP_12,
    OP_13,
    OP_14,
    OP_15,
    OP_16,
    OP_PUSHDATA1,
    OP_PUSHDATA2,
    OP_PUSHDATA4,
} from '../opcode.js';

/**
 * Convert an OP_RETURN outputScript into an array of pushes
 * @param outputScript - An OP_RETURN output script, e.g. 6a042e7865630003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6
 * @returns An array of hex pushes, e.g. ['2e786563', '00', '333333', '0076458db0ed96fe9863fc1ccec9fa2cfab884b0f6']
 * @throws Error if outputScript is not a valid OP_RETURN outputScript
 */
export function getStackArray(outputScript: string): string[] {
    const opReturnHex = toHex(new Uint8Array([OP_RETURN]));

    // Validate for OP_RETURN outputScript
    if (
        typeof outputScript !== 'string' ||
        !outputScript.startsWith(opReturnHex)
    ) {
        throw new Error(
            `outputScript must be a string that starts with ${opReturnHex}`,
        );
    }
    if (outputScript.length > 2 * OP_RETURN_MAX_BYTES) {
        throw new Error(
            `Invalid eCash OP_RETURN size: ${
                outputScript.length / 2
            } bytes. eCash OP_RETURN outputs cannot exceed ${OP_RETURN_MAX_BYTES} bytes.`,
        );
    }

    // Create stack, the input object required by consumeNextPush
    const stack = {
        remainingHex: outputScript.slice(opReturnHex.length),
    };

    // Initialize stackArray
    const stackArray: string[] = [];

    while (stack.remainingHex.length > 0) {
        stackArray.push(consumeNextPush(stack).data);
    }

    return stackArray;
}

/**
 * One-byte stack additions that can be pushed to OP_RETURN in isolation
 */
const ONE_BYTE_STACK_ADDS = [
    OP_0,
    OP_1NEGATE,
    OP_RESERVED,
    OP_1,
    OP_2,
    OP_3,
    OP_4,
    OP_5,
    OP_6,
    OP_7,
    OP_8,
    OP_9,
    OP_10,
    OP_11,
    OP_12,
    OP_13,
    OP_14,
    OP_15,
    OP_16,
];

/**
 * One-byte pushdata opcodes (0x01-0x4b)
 */
const ONE_BYTE_PUSHDATAS: number[] = [];
for (let i = 1; i <= 0x4b; i++) {
    ONE_BYTE_PUSHDATAS.push(i);
}

/**
 * Swap endianness of a hex string
 * @param hexString a string of hex bytes, e.g. 04000000
 * @returns a string of hex bytes with swapped endianness, e.g. for 04000000, returns 00000004
 */
export function swapEndianness(hexString: string): string {
    const byteLength = 2;

    if (hexString.length % byteLength === 1) {
        throw new Error(
            `Invalid input length ${hexString.length}: hexString must be divisible by bytes, i.e. have an even length.`,
        );
    }

    // Check if input contains only hex characters
    if (!/^[\da-f]+$/i.test(hexString)) {
        throw new Error(
            `Invalid input. ${hexString} contains non-hexadecimal characters.`,
        );
    }

    let swappedEndianHexString = '';
    let remainingHex = hexString;
    while (remainingHex.length > 0) {
        // Get the last byte on the string
        const thisByte = remainingHex.slice(-byteLength);
        // Add thisByte to swappedEndianHexString in swapped-endian order
        swappedEndianHexString += thisByte;

        // Remove thisByte from remainingHex
        remainingHex = remainingHex.slice(0, -byteLength);
    }
    return swappedEndianHexString;
}

/**
 * Consume a specified number of bytes from a stack object
 * @param stack an object containing a hex string outputScript of an eCash tx, e.g. {remainingHex: '6a...'}
 * @param byteCount integer
 * @returns consumed, a hex string of byteCount bytes
 * The stack object is modified in place so that consumed bytes are removed
 */
export function consume(
    stack: { remainingHex: string },
    byteCount: number,
): string {
    // Validation for stack
    if (typeof stack !== 'object' || typeof stack.remainingHex !== 'string') {
        throw new Error(
            'Invalid input. Stack must be an object with string stored at key remainingHex.',
        );
    }
    if (stack.remainingHex.length % 2 === 1) {
        throw new Error(
            'Invalid input: stack.remainingHex must be divisible by bytes, i.e. have an even length.',
        );
    }
    // Throw an error if byteCount input is not an integer
    if (!Number.isInteger(byteCount)) {
        throw new Error(`byteCount must be an integer, received ${byteCount}`);
    }
    // One byte is 2 characters of a hex string
    const byteLength = 2;

    // Get byte slice size
    const byteSliceSize = byteCount * byteLength;

    // Throw an error if byteCount is greater than consumable hex bytes in outputScript
    if (byteSliceSize > stack.remainingHex.length) {
        throw new Error(
            `consume called with byteCount (${byteCount}) greater than remaining bytes in outputScript (${
                stack.remainingHex.length / byteLength
            })`,
        );
    }
    // Get consumed bytes
    const consumed = stack.remainingHex.slice(0, byteSliceSize);
    // Remove consumed from the stack
    stack.remainingHex = stack.remainingHex.slice(byteSliceSize);
    return consumed;
}

/**
 * Parse, decode and consume the data push from the top of the stack.
 * If the stack does not start with a valid push, it raises an error and the stack is left untouched.
 * @param stack an object containing a hex string outputScript of an eCash tx, e.g. {remainingHex: '4d...'}
 * @returns {data, pushedWith}
 * stack is modified in place so that the push is removed
 */
export function consumeNextPush(stack: { remainingHex: string }): {
    data: string;
    pushedWith: string;
} {
    // Clone stack in case you have an error and wish to leave it unmodified
    const clonedStack = structuredClone(stack);

    // Get the first byte on the stack
    const pushOpCodeHex = consume(clonedStack, 1);
    const pushOpCode = parseInt(pushOpCodeHex, 16);

    if (ONE_BYTE_STACK_ADDS.includes(pushOpCode)) {
        // If this is a one-byte push, consume stack and return the byte
        stack.remainingHex = clonedStack.remainingHex;
        return { data: pushOpCodeHex, pushedWith: pushOpCodeHex };
    }

    // Initialize variables
    let pushBytecountHex: string;

    // Apply conditional checks to determine the size of this push
    if (ONE_BYTE_PUSHDATAS.includes(pushOpCode)) {
        // If the first byte on the stack is 0x01-0x4b, then this is pushedBytesHex
        pushBytecountHex = pushOpCodeHex;
    } else if (pushOpCode === OP_PUSHDATA1) {
        // The next byte contains the number of bytes to be pushed onto the stack.
        pushBytecountHex = consume(clonedStack, 1);
    } else if (pushOpCode === OP_PUSHDATA2) {
        // The next two bytes contain the number of bytes to be pushed onto the stack in little endian order.
        pushBytecountHex = consume(clonedStack, 2);
    } else if (pushOpCode === OP_PUSHDATA4) {
        // The next four bytes contain the number of bytes to be pushed onto the stack in little endian order.
        pushBytecountHex = consume(clonedStack, 4);
    } else {
        throw new Error(`${pushOpCodeHex} is invalid pushdata`);
    }

    // Now that you know how many bytes are in the push, get the pushed data
    const data = consume(
        clonedStack,
        parseInt(swapEndianness(pushBytecountHex), 16),
    );

    // If no error, consume stack
    stack.remainingHex = clonedStack.remainingHex;

    /*
    Return {data, pushedWith}
    Note that if the first byte on the stack is 0x01-0x4b,
    this is both pushOpCode and pushBytecountHex
   
    You don't want to return '0404' for e.g. '042e786563'
    Conditionally remove pushBytecountHex for this case
    */
    return {
        data,
        pushedWith: `${pushOpCodeHex}${
            pushOpCodeHex !== pushBytecountHex ? pushBytecountHex : ''
        }`,
    };
}

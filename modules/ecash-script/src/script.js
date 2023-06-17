// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const opReturn = require('../constants/op_return');
const { swapEndianness } = require('./utils');

/**
 * consume
 * @param {object} stack an object containing a hex string outputScript of an eCash tx, e.g. {remainingHex: '6a...'}
 * An object is used for 'stack' to allow in-place modification without returning the input
 * @param {integer} byteCount integer
 * @throws {Error} if input is not supported,
 * i.e. if byteCount is not an integer or if byteCount exceeds outputScript bytes
 * @returns {string} consumed, a hex string of byteCount bytes
 * The stack object is modified in place so that consumed bytes are removed
 */
function consume(stack, byteCount) {
    /**
     * Validation for stack
     * 1. Stack must be an object with key remainingHex
     * 2. remainingHex must have a value that is a string
     * 3. The length of remainingHex must be even, i.e. divisible by bytes
     */
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
 * @param {object} stack an object containing a hex string outputScript of an eCash tx, e.g. {remainingHex: '4d...'}
 * An object is used for 'stack' to allow in-place modification without returning the input
 * @returns {object} {data, pushedWith}
 * stack is modified in place so that the push is removed
 */
function consumeNextPush(stack) {
    // Clone stack in case you have an error and wish to leave it unmodified
    const clonedStack = JSON.parse(JSON.stringify(stack));

    // Get the first byte on the stack
    let pushOpCode = consume(clonedStack, 1);

    if (opReturn.oneByteStackAdds.includes(pushOpCode)) {
        // If this is a one-byte push, consume stack and return the byte
        stack.remainingHex = clonedStack.remainingHex;
        return { data: pushOpCode, pushedWith: pushOpCode };
    }

    // Initialize variables
    let pushBytecountHex, data;

    // Apply conditional checks to determine the size of this push
    if (opReturn.oneBytePushdatas.includes(pushOpCode)) {
        // If the first byte on the stack is 0x01-0x4b, then this is pushedBytesHex
        pushBytecountHex = pushOpCode;
    } else if (pushOpCode === opReturn.OP_PUSHDATA1) {
        // The next byte contains the number of bytes to be pushed onto the stack.
        pushBytecountHex = consume(clonedStack, 1);
    } else if (pushOpCode === opReturn.OP_PUSHDATA2) {
        // The next two bytes contain the number of bytes to be pushed onto the stack in little endian order.
        pushBytecountHex = consume(clonedStack, 2);
    } else if (pushOpCode === opReturn.OP_PUSHDATA4) {
        // The next four bytes contain the number of bytes to be pushed onto the stack in little endian order.
        pushBytecountHex = consume(clonedStack, 4);
    } else {
        throw new Error(`${pushOpCode} is invalid pushdata`);
    }

    // Now that you know how many bytes are in the push, get the pushed data
    data = consume(clonedStack, parseInt(swapEndianness(pushBytecountHex), 16));

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
        pushedWith: `${pushOpCode}${
            pushOpCode !== pushBytecountHex ? pushBytecountHex : ''
        }`,
    };
}

/**
 * Convert an OP_RETURN outputScript into an array of pushes
 * @param {string} outputScript an OP_RETURN output script, e.g. 6a042e7865630003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6
 * @returns {array} an array of hex pushes, e.g. ['2e786563', '00', '333333', '0076458db0ed96fe9863fc1ccec9fa2cfab884b0f6']
 * @throws {error} if outputScript is not a valid OP_RETURN outputScript
 */
function getStackArray(outputScript) {
    // Validate for OP_RETURN outputScript
    if (
        typeof outputScript !== 'string' ||
        !outputScript.startsWith(opReturn.OP_RETURN)
    ) {
        throw new Error(
            `outputScript must be a string that starts with ${opReturn.OP_RETURN}`,
        );
    }
    if (outputScript.length > 2 * opReturn.maxBytes) {
        throw new Error(
            `Invalid eCash OP_RETURN size: ${
                outputScript.length / 2
            } bytes. eCash OP_RETURN outputs cannot exceed ${
                opReturn.maxBytes
            } bytes.`,
        );
    }

    // Create stack, the input object required by consumeNextPush
    const stack = {
        remainingHex: outputScript.slice(opReturn.OP_RETURN.length),
    };

    // Initialize stackArray
    const stackArray = [];

    while (stack.remainingHex.length > 0) {
        stackArray.push(consumeNextPush(stack).data);
    }

    return stackArray;
}

module.exports = {
    consume,
    consumeNextPush,
    getStackArray,
};

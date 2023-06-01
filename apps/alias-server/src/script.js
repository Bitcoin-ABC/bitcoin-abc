// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const opReturn = require('../constants/op_return');

module.exports = {
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
    consume: function (stack, byteCount) {
        /**
         * Validation for stack
         * 1. Stack must be an object with key remainingHex
         * 2. remainingHex must have a value that is a string
         * 3. The length of remainingHex must be even, i.e. divisible by bytes
         */
        if (
            typeof stack !== 'object' ||
            typeof stack.remainingHex !== 'string'
        ) {
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
            throw new Error(
                `byteCount must be an integer, received ${byteCount}`,
            );
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
    },
    /**
     * Parse, decode and consume the data push from the top of the stack.
     * If the stack does not start with a valid push, it raises an error and the stack is left untouched.
     * @param {object} stack an object containing a hex string outputScript of an eCash tx, e.g. {remainingHex: '4d...'}
     * An object is used for 'stack' to allow in-place modification without returning the input
     * @returns {string} the first push on input stack, as a hex string
     * stack is modified in place so that the push is removed
     */
    consumeNextPush: function (stack) {
        // Clone stack in case you have an error and wish to leave it unmodified
        const clonedStack = JSON.parse(JSON.stringify(stack));

        // Get the first byte on the stack
        let firstByte = module.exports.consume(clonedStack, 1);

        if (opReturn.oneByteStackAdds.includes(firstByte)) {
            // If this is a one-byte push, consume stack and return the byte
            stack.remainingHex = clonedStack.remainingHex;
            return firstByte;
        }

        // Initialize pushdata, the byteCount in hex of the push
        let pushdata;

        // Apply conditional checks to determine the size of this push
        if (opReturn.oneBytePushdatas.includes(firstByte)) {
            // If the first byte on the stack is 0x01-0x4b, then this is pushdata
            pushdata = parseInt(firstByte, 16);
        } else if (firstByte === opReturn.OP_PUSHDATA1) {
            // The next byte contains the number of bytes to be pushed onto the stack.
            pushdata = parseInt(module.exports.consume(clonedStack, 1), 16);
        } else if (firstByte === opReturn.OP_PUSHDATA2) {
            // The next two bytes contain the number of bytes to be pushed onto the stack in little endian order.

            // pushdata is the the next 2 bytes, as little-endian
            // i.e. 04 would be 0x04 0x00 i.e. '0400'
            pushdata = module.exports.consume(clonedStack, 2);

            // Convert to big-endian so JS parseInt can get the value
            pushdata = pushdata.slice(2, 4) + pushdata.slice(0, 2);

            // Convert to int
            pushdata = parseInt(pushdata, 16);
        } else if (firstByte === opReturn.OP_PUSHDATA4) {
            // The next four bytes contain the number of bytes to be pushed onto the stack in little endian order.

            // pushdata is the first byte of the next 4 bytes, as little-endian
            // i.e. 04 would be 0x04 0x00 0x00 0x00 i.e. '04000000'
            pushdata = module.exports.consume(clonedStack, 4);

            // Convert to big-endian so JS parseInt can get the value
            pushdata =
                pushdata.slice(6, 8) +
                pushdata.slice(4, 6) +
                pushdata.slice(2, 4) +
                pushdata.slice(0, 2);

            // Convert to int
            pushdata = parseInt(pushdata, 16);
        } else {
            throw new Error(`${firstByte} is invalid pushdata`);
        }

        // Now that you know pushdata in bytes, get the push
        let push = module.exports.consume(clonedStack, pushdata);

        // If no error, consume stack
        stack.remainingHex = clonedStack.remainingHex;

        return push;
    },
};

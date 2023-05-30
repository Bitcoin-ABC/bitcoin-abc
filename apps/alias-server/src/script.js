// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
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
        console.log(`typeof stack.remainingHex`, typeof stack.remainingHex);
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
};

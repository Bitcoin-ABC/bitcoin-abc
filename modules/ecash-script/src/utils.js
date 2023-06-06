// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';

/**
 * @param {string} hexString
 * @returns {bool} true if string contains only characters 0-9 or a-f, case insensitive
 */
function isHexString(hexString) {
    return /^[\da-f]+$/i.test(hexString);
}

/**
 * @param {string} hexString a string of hex bytes, e.g. 04000000
 * @returns {string} a string of hex bytes with swapped endianness, e.g. for 04000000, returns 00000004
 * @throws {Error}
 */
function swapEndianness(hexString) {
    // Throw an error if hexString is not divisible by 2, i.e. not a valid string of hex bytes
    // One byte is 2 characters of a hex string
    const byteLength = 2;

    if (hexString.length % byteLength === 1) {
        throw new Error(
            `Invalid input length ${hexString.length}: hexString must be divisible by bytes, i.e. have an even length.`,
        );
    }

    // Throw an error if input contains non-hex characters
    if (!isHexString(hexString)) {
        throw new Error(
            `Invalid input. ${hexString} contains non-hexadecimal characters.`,
        );
    }

    let swappedEndianHexString = '';
    while (hexString.length > 0) {
        // Get the last byte on the string
        const thisByte = hexString.slice(-byteLength);
        // Add thisByte to swappedEndianHexString in swapped-endian order
        swappedEndianHexString += thisByte;

        // Remove thisByte from hexString
        hexString = hexString.slice(0, -byteLength);
    }
    return swappedEndianHexString;
}

module.exports = { isHexString, swapEndianness };

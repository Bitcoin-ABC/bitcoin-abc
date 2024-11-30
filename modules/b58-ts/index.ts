// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Base58 characters include numbers 123456789, uppercase
 * ABCDEFGHJKLMNPQRSTUVWXYZ and lowercase abcdefghijkmnopqrstuvwxyz.
 */
const BASE58_CHARS =
    '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const BASE58_MAP = [
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, -1,
    -1, -1, -1, -1, -1, -1, 9, 10, 11, 12, 13, 14, 15, 16, -1, 17, 18, 19, 20,
    21, -1, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, -1, -1, -1, -1, -1, -1,
    33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, -1, 44, 45, 46, 47, 48, 49, 50,
    51, 52, 53, 54, 55, 56, 57, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1,
];

/** Encode the input bytes as base58 string (modeled after base58.cpp) */
export function encodeBase58(input: Uint8Array): string {
    // Skip & count leading zeroes.
    let numZeroes = 0;
    while (numZeroes < input.length && input[numZeroes] == 0) {
        numZeroes++;
    }
    // Allocate enough space in big-endian base58 representation.
    // log(256) / log(58), rounded up. Use | 0 to force integers
    const size = ((((input.length - numZeroes) * 138) / 100) | 0) + 1;
    const b58 = new Uint8Array(size);
    // Process the bytes.
    let length = 0;
    for (let idx = numZeroes; idx < input.length; ++idx) {
        let carry = input[idx];
        let i = 0;
        // Apply "b58 = b58 * 256 + ch".
        let j = size - 1;
        while ((carry != 0 || i < length) && j >= 0) {
            carry += 256 * b58[j];
            b58[j] = carry % 58;
            carry = (carry / 58) | 0;
            j--;
            i++;
        }
        if (carry != 0) {
            throw new Error('Carry should be zero at this point');
        }
        length = i;
    }
    // Skip leading zeroes in base58 result.
    let startIdx = size - length;
    while (startIdx < b58.length && b58[startIdx] == 0) {
        startIdx++;
    }
    // Translate the result into a string.
    const result: string[] = new Array(numZeroes + b58.length - startIdx);
    for (let idx = 0; idx < numZeroes; ++idx) {
        result[idx] = '1';
    }
    for (let idx = startIdx; idx < b58.length; ++idx) {
        result[idx] = BASE58_CHARS[b58[idx]];
    }
    return result.join('');
}

/** Decode the input base58 string as bytes (modeled after base58.cpp) */
export function decodeBase58(input: string): Uint8Array {
    // Skip leading spaces.
    let idx = 0;
    while (idx < input.length && isWhitespace(input.charAt(idx))) {
        idx++;
    }

    // Skip and count leading '1's.
    let numZeroes = 0;
    while (input[idx] === '1') {
        numZeroes++;
        idx++;
    }

    // Allocate enough space in big-endian base256 representation.
    // log(58) / log(256), rounded up. Use `| 0` to force integers.
    const size = ((((input.length - idx) * 733) / 1000) | 0) + 1;
    const b256 = new Uint8Array(size);

    // Process the characters.
    let length = 0;
    while (idx < input.length && !isWhitespace(input.charAt(idx))) {
        // Decode base58 character
        let carry = BASE58_MAP[input.charCodeAt(idx)];
        if (carry === -1) {
            throw new Error('Invalid base58 character');
        }
        let i = 0;
        let j = b256.length - 1;
        while ((carry != 0 || i < length) && j >= 0) {
            carry += 58 * b256[j];
            b256[j] = carry % 256;
            carry = (carry / 256) | 0;
            j--;
            i++;
        }
        if (carry != 0) {
            throw new Error('Carry should be zero at this point');
        }
        length = i;
        idx++;
    }

    while (idx < input.length && isWhitespace(input.charAt(idx))) {
        idx++;
    }

    if (idx < input.length) {
        throw new Error('Extra letters after whitespace');
    }

    // Skip leading zeroes in b256.
    const startIdx = size - length;

    // Copy result into output vector.
    const result = new Uint8Array(numZeroes + b256.length - startIdx);
    let writeIdx = numZeroes;
    for (let idx = startIdx; idx < b256.length; ++idx) {
        result[writeIdx] = b256[idx];
        writeIdx++;
    }

    return result;
}

function isWhitespace(ch: string) {
    return ' \r\f\v\n\t'.indexOf(ch) > -1;
}

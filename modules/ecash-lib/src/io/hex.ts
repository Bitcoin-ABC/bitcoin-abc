// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

const LUT_HEX_4b = [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
];
const LUT_HEX_8b = new Array(0x100);
const LUT_BIN_8b: { [key: string]: number } = {};
for (let n = 0; n < 0x100; n++) {
    const hex = `${LUT_HEX_4b[(n >>> 4) & 0xf]}${LUT_HEX_4b[n & 0xf]}`;
    LUT_HEX_8b[n] = hex;
    LUT_BIN_8b[hex] = n;
}
// End Pre-Init

export function toHex(buffer: Uint8Array): string {
    let out = '';
    for (let idx = 0, edx = buffer.length; idx < edx; ++idx) {
        out += LUT_HEX_8b[buffer[idx]];
    }
    return out;
}

export function toHexRev(buffer: Uint8Array): string {
    let out = '';
    for (let idx = buffer.length - 1; idx >= 0; --idx) {
        out += LUT_HEX_8b[buffer[idx]];
    }
    return out;
}

export function fromHex(str: string): Uint8Array {
    if ((str.length & 1) != 0) {
        throw new Error(`Odd hex length: ${str}`);
    }
    const nBytes = str.length >> 1;
    const array = new Uint8Array(nBytes);
    for (let idx = 0; idx < str.length; idx += 2) {
        const pair = str.substring(idx, idx + 2);
        const byte = LUT_BIN_8b[pair];
        if (byte === undefined) {
            throw new Error(`Invalid hex pair: ${pair}, at index ${idx}`);
        }
        array[idx >> 1] = byte;
    }
    return array;
}

export function fromHexRev(str: string): Uint8Array {
    const array = fromHex(str);
    array.reverse();
    return array;
}

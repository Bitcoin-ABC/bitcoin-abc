// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Turn a UTF-8 encoded string into a Uint8Array */
export function strToBytes(str: string): Uint8Array {
    return encoder.encode(str);
}

/** Turn a Uint8Array into a UTF-8 encoded string */
export function bytesToStr(bytes: Uint8Array): string {
    return decoder.decode(bytes);
}

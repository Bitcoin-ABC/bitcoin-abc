// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

const encoder = new TextEncoder();

/** Turn a UTF-8 encoded string into a Uint8Array */
export function strToBytes(str: string): Uint8Array {
    return encoder.encode(str);
}

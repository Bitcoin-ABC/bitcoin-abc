// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { sha256, toHex } from 'ecash-lib';

/**
 * Compute the sha256 hash of a file as a hex string.
 *
 * Token icon document hashes must be taken from the exact PNG bytes uploaded
 * to token-server (after client-side crop/resize). The server must hash
 * req.file.buffer before sharp processing. Filename is not part of the hash.
 */
export async function hashFile(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBytes = sha256(new Uint8Array(buffer));
    return toHex(hashBytes);
}

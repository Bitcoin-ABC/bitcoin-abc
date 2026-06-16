// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { sha256, toHex, verifyMsg } from 'ecash-lib';

/**
 * Compute sha256 of the raw uploaded PNG bytes as a hex string.
 * Must match cashtab/src/components/Etokens/icons/hashFile.ts.
 */
export const hashTokenIcon = (iconBytes: Uint8Array): string => {
    return toHex(sha256(iconBytes));
};

/**
 * Verify that signature was created by minterAddress for this token icon upload.
 * The signed message is the sha256 hex hash of the uploaded PNG bytes.
 */
export const verifyTokenIconUploadSignature = (
    iconBytes: Uint8Array,
    minterAddress: string,
    signature: string,
): boolean => {
    if (typeof signature !== 'string' || signature.length === 0) {
        return false;
    }
    return verifyMsg(hashTokenIcon(iconBytes), signature, minterAddress);
};

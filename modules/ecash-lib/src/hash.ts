// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

interface EcashLibHashes {
    sha256: (data: Uint8Array) => Uint8Array;
    sha256d: (data: Uint8Array) => Uint8Array;
    shaRmd160: (data: Uint8Array) => Uint8Array;
}

let HASHES: EcashLibHashes;

export function sha256(data: Uint8Array): Uint8Array {
    return HASHES.sha256(data);
}
export function sha256d(data: Uint8Array): Uint8Array {
    return HASHES.sha256d(data);
}
export function shaRmd160(data: Uint8Array): Uint8Array {
    return HASHES.shaRmd160(data);
}

export function __setHashes(hashes: EcashLibHashes) {
    HASHES = hashes;
}

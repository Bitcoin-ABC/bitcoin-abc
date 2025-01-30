// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export interface Hasher {
    update: (data: Uint8Array) => void;
    finalize: () => Uint8Array;
    clone: () => Hasher;
    free: () => void;
}

type HasherClass = { new (): Hasher };

interface EcashLibHashes {
    sha256: (data: Uint8Array) => Uint8Array;
    sha256d: (data: Uint8Array) => Uint8Array;
    shaRmd160: (data: Uint8Array) => Uint8Array;
    sha512: (data: Uint8Array) => Uint8Array;
    Sha256H: HasherClass;
    Sha512H: HasherClass;
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
export function sha512(data: Uint8Array): Uint8Array {
    return HASHES.sha512(data);
}
export function sha256Hasher(): Hasher {
    return new HASHES.Sha256H();
}
export function sha512Hasher(): Hasher {
    return new HASHES.Sha512H();
}

export function __setHashes(hashes: EcashLibHashes) {
    HASHES = hashes;
}

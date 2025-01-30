// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Hasher, sha256Hasher, sha512Hasher } from './hash';

export class Hmac {
    oHash: Hasher;
    iHash: Hasher;

    constructor(
        hashFactory: () => Hasher,
        blockLength: number,
        key: Uint8Array,
    ) {
        this.oHash = hashFactory();
        this.iHash = hashFactory();
        const pad = new Uint8Array(blockLength);
        if (key.length > blockLength) {
            const hasher = hashFactory();
            hasher.update(key);
            key = hasher.finalize();
        }
        pad.set(key, 0);

        for (let i = 0; i < pad.length; i++) {
            pad[i] ^= 0x36;
        }
        this.iHash.update(pad);

        for (let i = 0; i < pad.length; i++) {
            pad[i] ^= 0x36 ^ 0x5c;
        }
        this.oHash.update(pad);

        pad.fill(0);
    }

    update(data: Uint8Array) {
        this.iHash.update(data);
    }

    digest(): Uint8Array {
        this.oHash.update(this.iHash.finalize());
        const hash = this.oHash.finalize();
        this.iHash.free();
        this.oHash.free();
        return hash;
    }

    clone(): Hmac {
        const clone: Hmac = Object.create(Object.getPrototypeOf(this), {});
        clone.oHash = this.oHash.clone();
        clone.iHash = this.iHash.clone();
        return clone;
    }

    free() {
        this.iHash.free();
        this.oHash.free();
    }
}

export function hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
    const hmac = new Hmac(sha256Hasher, 64, key);
    hmac.update(data);
    return hmac.digest();
}

export function hmacSha512(key: Uint8Array, data: Uint8Array): Uint8Array {
    const hmac = new Hmac(sha512Hasher, 128, key);
    hmac.update(data);
    return hmac.digest();
}

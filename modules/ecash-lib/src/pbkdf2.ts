// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Hasher } from './hash';
import { Hmac } from './hmac';

export function pbkdf2(params: {
    hashFactory: () => Hasher;
    password: Uint8Array;
    salt: Uint8Array;
    blockLength: number;
    outputLength: number;
    dkLen: number;
    iterations: number;
}): Uint8Array {
    const arr = new Uint8Array(4);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    const result = new Uint8Array(params.dkLen);
    const prf = new Hmac(
        params.hashFactory,
        params.blockLength,
        params.password,
    );
    const prfSalt = prf.clone();
    prfSalt.update(params.salt);

    for (
        let idx = 1, pos = 0;
        pos < params.dkLen;
        idx++, pos += params.outputLength
    ) {
        const ti = result.subarray(pos, pos + params.outputLength);
        view.setInt32(0, idx, false);
        const prfSaltClone = prfSalt.clone();
        prfSaltClone.update(arr);
        let u = prfSaltClone.digest();
        ti.set(u.subarray(0, ti.length));
        for (let ui = 1; ui < params.iterations; ui++) {
            const prfClone = prf.clone();
            prfClone.update(u);
            u = prfClone.digest();
            for (let i = 0; i < ti.length; i++) {
                ti[i] ^= u[i];
            }
        }
    }

    prf.free();
    prfSalt.free();
    return result;
}

// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { fromHex, toHex } from './io/hex.js';
import { EccDummy, EccWasm } from './ecc.js';
import { initWasm } from './init.js';

describe('Ecc', async () => {
    // Can't use `fetch` for local file so we have to read it using `fs`
    await initWasm();

    it('EccWasm', () => {
        const ecc = new EccWasm();
        const sk = fromHex(
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        );
        expect(toHex(ecc.derivePubkey(sk))).to.equal(
            '034646ae5047316b4230d0086c8acec687f00b1cd9d1dc634f6cb358ac0a9a8fff',
        );
        expect(ecc.schnorrSign(sk, new Uint8Array(32))).to.have.lengthOf(64);
        expect(ecc.ecdsaSign(sk, new Uint8Array(32))).length.to.be.within(
            65,
            73,
        );
    });

    it('EccDummy', () => {
        const dummy = new EccDummy();
        expect(dummy.derivePubkey({} as any)).to.deep.equal(new Uint8Array(33));
        expect(dummy.schnorrSign({} as any, {} as any)).to.deep.equal(
            new Uint8Array(64),
        );
        expect(dummy.ecdsaSign({} as any, {} as any)).to.deep.equal(
            new Uint8Array(73),
        );
    });
});

// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { fromHex, toHex } from './io/hex.js';
import { Ecc, EccDummy } from './ecc.js';
import './initNodeJs.js';

describe('Ecc', async () => {
    it('EccWasm', () => {
        const ecc = new Ecc();
        const sk = fromHex(
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        );
        const msg = fromHex(
            'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
        );
        const pk = ecc.derivePubkey(sk);
        expect(toHex(pk)).to.equal(
            '034646ae5047316b4230d0086c8acec687f00b1cd9d1dc634f6cb358ac0a9a8fff',
        );
        const schnorrSig = ecc.schnorrSign(sk, msg);
        expect(schnorrSig).to.have.lengthOf(64);
        ecc.schnorrVerify(schnorrSig, msg, pk);
        expect(() => ecc.schnorrVerify(new Uint8Array(10), msg, pk)).to.throw(
            'Invalid Schnorr signature size, expected 64 bytes but got 10',
        );
        expect(() => ecc.schnorrVerify(new Uint8Array(64), msg, pk)).to.throw(
            'Incorrect signature',
        );

        const ecdsaSig = ecc.ecdsaSign(sk, msg);
        expect(ecdsaSig).length.to.be.within(65, 73);
        ecc.ecdsaVerify(ecdsaSig, msg, pk);
        expect(() => ecc.ecdsaVerify(fromHex('30'), msg, pk)).to.throw(
            'Invalid DER signature format',
        );
        expect(() =>
            ecc.ecdsaVerify(ecc.ecdsaSign(sk, new Uint8Array(32)), msg, pk),
        ).to.throw('Incorrect signature');

        // Round-trip recoverable signature
        expect(
            toHex(ecc.recoverSig(ecc.signRecoverable(sk, msg), msg)),
        ).to.equal(toHex(pk));
    });

    it('EccDummy', () => {
        const dummy = new EccDummy();
        expect(dummy.derivePubkey({} as any)).to.deep.equal(new Uint8Array(33));
        expect(dummy.schnorrSign({} as any, {} as any)).to.deep.equal(
            new Uint8Array(64),
        );
        dummy.schnorrVerify({} as any, {} as any, {} as any);
        expect(dummy.ecdsaSign({} as any, {} as any)).to.deep.equal(
            new Uint8Array(73),
        );
        dummy.ecdsaVerify({} as any, {} as any, {} as any);
        expect(dummy.signRecoverable({} as any, {} as any)).to.deep.equal(
            new Uint8Array(65),
        );
        expect(dummy.recoverSig({} as any, {} as any)).to.deep.equal(
            new Uint8Array(33),
        );
    });
});

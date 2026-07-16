// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Includes Electrum ABC cases from electrumabc/tests/test_schnorr.py (blind path).
 */
import { expect } from 'chai';

import {
    BlindSigner,
    BlindSignatureRequest,
    buildBlindSigRequests,
    finalizeBlindSigs,
} from './blindSchnorr.js';
import { Ecc } from './ecc.js';
import { sha256 } from './hash.js';
import { strToBytes } from './io/str.js';
import './initWasm.js';

const ecc = new Ecc();

describe('blind Schnorr', () => {
    it('rejects malformed pubkey or R before retrying', () => {
        const sk = new Uint8Array(32).fill(1);
        const pk = ecc.derivePubkey(sk);
        const msg = new Uint8Array(32).fill(2);
        const bad = new Uint8Array(33).fill(0);
        expect(() => new BlindSignatureRequest(bad, pk, msg)).to.throw(
            /pubkey/,
        );
        expect(() => new BlindSignatureRequest(pk, bad, msg)).to.throw(/R/);
    });

    it('getR returns a defensive copy', () => {
        const signer = new BlindSigner();
        const r1 = signer.getR();
        r1[0] ^= 1;
        expect(signer.getR()[0]).to.equal(r1[0] ^ 1);
    });

    it('round-trips blind sign and verifies under round pubkey', () => {
        const sk = new Uint8Array(32);
        crypto.getRandomValues(sk);
        const pk = ecc.derivePubkey(sk);
        const messageHash = new Uint8Array(32);
        crypto.getRandomValues(messageHash);

        const signer = new BlindSigner();
        const requester = new BlindSignatureRequest(
            pk,
            signer.getR(),
            messageHash,
        );
        const signature = requester.finalize(
            signer.sign(sk, requester.getRequest()),
        );
        expect(signature).to.have.lengthOf(64);
        ecc.schnorrVerify(signature, messageHash, pk);
    });

    it('finalize rejects a bastardized s response', () => {
        const sk = new Uint8Array(32);
        crypto.getRandomValues(sk);
        const pk = ecc.derivePubkey(sk);
        const messageHash = new Uint8Array(32);
        crypto.getRandomValues(messageHash);

        const signer = new BlindSigner();
        const requester = new BlindSignatureRequest(
            pk,
            signer.getR(),
            messageHash,
        );
        const sResponse = signer.sign(sk, requester.getRequest());
        const sBad = new Uint8Array(sResponse);
        sBad[sBad.length - 1] = (sBad[sBad.length - 1] + 1) % 256;

        expect(() => requester.finalize(sBad)).to.throw();
    });

    it('BlindSigner rejects double sign', () => {
        const sk = new Uint8Array(32).fill(3);
        const signer = new BlindSigner();
        const req = new BlindSignatureRequest(
            ecc.derivePubkey(sk),
            signer.getR(),
            sha256(strToBytes('x')),
        );
        signer.sign(sk, req.getRequest());
        expect(() => signer.sign(sk, req.getRequest())).to.throw(/twice/);
    });

    it('buildBlindSigRequests + finalize verifies for several components', () => {
        const sk = new Uint8Array(32).fill(42);
        const pk = ecc.derivePubkey(sk);
        const components = [
            strToBytes('comp-a'),
            strToBytes('comp-b'),
            strToBytes('comp-c'),
        ];
        const blinds = components.map(() => new BlindSigner());
        const { requests, eValues } = buildBlindSigRequests(
            pk,
            blinds.map(b => b.getR()),
            components,
        );
        const scalars = eValues.map((e, i) => blinds[i].sign(sk, e));
        const sigs = finalizeBlindSigs(requests, scalars);
        expect(sigs).to.have.lengthOf(components.length);
        for (let i = 0; i < components.length; i++) {
            ecc.schnorrVerify(sigs[i], sha256(components[i]), pk);
        }
    });

    it('stress: many random round keys verify', () => {
        const components = [
            strToBytes('player1-input'),
            strToBytes('player1-output'),
            strToBytes('player1-blank'),
        ];
        for (let t = 0; t < 30; t++) {
            const sk = new Uint8Array(32);
            crypto.getRandomValues(sk);
            const pk = ecc.derivePubkey(sk);
            const blinds = components.map(() => new BlindSigner());
            const { requests, eValues } = buildBlindSigRequests(
                pk,
                blinds.map(b => b.getR()),
                components,
            );
            const scalars = eValues.map((e, i) => blinds[i].sign(sk, e));
            const sigs = finalizeBlindSigs(requests, scalars);
            for (let i = 0; i < components.length; i++) {
                ecc.schnorrVerify(sigs[i], sha256(components[i]), pk);
            }
        }
    });
});

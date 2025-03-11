// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { Ecc } from './ecc';
import { fromHex, toHex } from './io/hex';
import { magicHash, signMsg, verifyMsg } from './messages';
import { Address } from './address/address';
import { shaRmd160 } from './hash';

// Test data
const TEST_SECRET_KEY = fromHex(
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
);
const TEST_PUBLIC_KEY = new Ecc().derivePubkey(TEST_SECRET_KEY);
const TEST_PUBLIC_KEY_HASH = toHex(shaRmd160(TEST_PUBLIC_KEY));
const TEST_ADDRESS = Address.p2pkh(TEST_PUBLIC_KEY_HASH).toString();
const TEST_MESSAGE = 'Hello, world!';

// Precomputed magicHash for "Hello, world!"
const TEST_MESSAGE_HASH = fromHex(
    '8f6b3f5a9e73fa9bcee1e28c749813665b94b4e9019d71844aee89f928af8fb3',
);

describe('Messages', () => {
    context('magicHash', () => {
        it('Computes correct hash for a simple message', () => {
            const result = magicHash(TEST_MESSAGE);
            expect(toHex(result)).to.equal(toHex(TEST_MESSAGE_HASH));
            expect(result.length).to.equal(32); // SHA-256 output
        });

        it('Works with custom prefix', () => {
            const customPrefix = '\x19Dogecoin Signed Message:\n';
            const result = magicHash(TEST_MESSAGE, customPrefix);
            expect(result.length).to.equal(32);
            expect(toHex(result)).to.not.equal(toHex(TEST_MESSAGE_HASH)); // Different prefix, different hash
        });

        it('Handles empty message', () => {
            const result = magicHash('');
            expect(result.length).to.equal(32);
        });
    });

    context('signMsg', () => {
        it('Signs a message and returns a base64 string', () => {
            const signature = signMsg(TEST_MESSAGE, TEST_SECRET_KEY);
            expect(signature.length).to.equal(88); // 65 bytes -> 88 base64 chars
            expect(/^[A-Za-z0-9+/]+=$/.test(signature)).to.equal(true); // Valid base64 format
            expect(signature).to.equal(
                'IEwA92jxphriBKyCd1RI4PM0uhbVUS8qW69h/tKIMrNpGRNOqfTlBATvylddM7H5dqsjkkOc72Zc0hNdOzUiIKI=',
            );
        });

        it('Produces consistent signatures with same input', () => {
            const sig1 = signMsg(TEST_MESSAGE, TEST_SECRET_KEY);
            const sig2 = signMsg(TEST_MESSAGE, TEST_SECRET_KEY);
            expect(sig1).to.equal(sig2); // Deterministic for same key and message
        });

        it('Works with custom prefix', () => {
            const signature = signMsg(
                TEST_MESSAGE,
                TEST_SECRET_KEY,
                '\x19Dogecoin Signed Message:\n',
            );
            expect(signature.length).to.equal(88);
        });

        it('Throws error for invalid secret key', () => {
            const invalidSk = new Uint8Array(31); // Too short
            expect(() => signMsg(TEST_MESSAGE, invalidSk)).to.throw();
        });
    });

    context('verifyMsg', () => {
        it('Verifies a valid signature for a message', () => {
            const signature = signMsg(TEST_MESSAGE, TEST_SECRET_KEY);
            const isValid = verifyMsg(TEST_MESSAGE, signature, TEST_ADDRESS);
            expect(isValid).to.equal(true);
        });

        it('Rejects an invalid message with a valid signature', () => {
            const signature = signMsg(TEST_MESSAGE, TEST_SECRET_KEY);
            const isValid = verifyMsg('Wrong message', signature, TEST_ADDRESS);
            expect(isValid).to.equal(false);
        });

        it('Rejects a valid signature with wrong address', () => {
            const signature = signMsg(TEST_MESSAGE, TEST_SECRET_KEY);
            const wrongAddress = Address.p2pkh('deadbeef'.repeat(5)).toString(); // Different hash
            const isValid = verifyMsg(TEST_MESSAGE, signature, wrongAddress);
            expect(isValid).to.equal(false);
        });

        it('Handles custom prefix correctly', () => {
            const customPrefix = '\x19Dogecoin Signed Message:\n';
            const signature = signMsg(
                TEST_MESSAGE,
                TEST_SECRET_KEY,
                customPrefix,
            );
            const isValid = verifyMsg(
                TEST_MESSAGE,
                signature,
                TEST_ADDRESS,
                customPrefix,
            );
            expect(isValid).to.equal(true);
        });

        it('Returns false for invalid base64 signature', () => {
            const isValid = verifyMsg(
                TEST_MESSAGE,
                'invalid#base64',
                TEST_ADDRESS,
            );
            expect(isValid).to.equal(false);
        });

        it('Returns false for signature of wrong length', () => {
            const shortSig = btoa(String.fromCharCode(...new Uint8Array(64))); // Missing recovery byte
            const isValid = verifyMsg(TEST_MESSAGE, shortSig, TEST_ADDRESS);
            expect(isValid).to.equal(false);
        });
    });

    context('Round-trip signing and verification', () => {
        it('Signs and verifies a message with default prefix', () => {
            const signature = signMsg(TEST_MESSAGE, TEST_SECRET_KEY);
            const isValid = verifyMsg(TEST_MESSAGE, signature, TEST_ADDRESS);
            expect(isValid).to.equal(true);
        });

        it('Signs and verifies an empty message', () => {
            const signature = signMsg('', TEST_SECRET_KEY);
            const isValid = verifyMsg('', signature, TEST_ADDRESS);
            expect(isValid).to.equal(true);
        });

        it('Signs and verifies with custom prefix', () => {
            const customPrefix = '\x18Test Prefix:\n';
            const signature = signMsg(
                TEST_MESSAGE,
                TEST_SECRET_KEY,
                customPrefix,
            );
            const isValid = verifyMsg(
                TEST_MESSAGE,
                signature,
                TEST_ADDRESS,
                customPrefix,
            );
            expect(isValid).to.equal(true);
        });

        it('Signs and verifies a message with default prefix generated on Cashtab.com using bitcoinjs-lib', () => {
            const cashtabLegacyTestMsg = 'cashtab legacy test';
            const signature = signMsg(
                cashtabLegacyTestMsg,
                fromHex(
                    'f510d9364db49dd8036202b9bdc9cfe3d5922e37e6a9583eed8d05c2a9010dd6',
                ),
            );
            const isValid = verifyMsg(
                cashtabLegacyTestMsg,
                signature,
                'ecash:qzxpm0sc2qnlh8j0ft75rz6jrehpyy36uy59ykm484',
            );
            expect(isValid).to.equal(true);
        });
    });
});

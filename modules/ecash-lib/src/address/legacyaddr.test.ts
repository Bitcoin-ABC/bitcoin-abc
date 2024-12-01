// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import {
    encodeBase58Check,
    decodeBase58Check,
    encodeLegacyAddress,
    decodeLegacyAddress,
    DecodedLegacyAddress,
} from './legacyaddr';
import { fromHex, toHex } from '../io/hex';

// New lib method to avoid base58check dependency
describe('legacyaddr.ts functions for handling legacy addresses', () => {
    describe('Base58Check', () => {
        it('encodeBase58Check', () => {
            expect(
                encodeBase58Check(fromHex('68656c6c6f20776f726c64')),
            ).to.equal('3vQB7B6MrGQZaxCuFg4oh');
        });

        it('decodeBase58Check', () => {
            expect(toHex(decodeBase58Check('3vQB7B6MrGQZaxCuFg4oh'))).to.equal(
                '68656c6c6f20776f726c64',
            );
            expect(() => decodeBase58Check('3vQB7B6MrGQZaxCuFg4oi')).to.throw(
                'Invalid checksum',
            );
            expect(() =>
                decodeBase58Check('3vQB7B6MrGQZaxCuFg4oh0IOl'),
            ).to.throw('Invalid base58 character');
        });
    });
    describe('encodeLegacyAddress and decodeLegacyAddress', () => {
        it('decodeLegacyAddress fails when called with an invalid address', () => {
            expect(() =>
                decodeLegacyAddress(undefined as unknown as string),
            ).to.throw('Invalid legacy address');
            expect(() => decodeLegacyAddress('some invalid address')).to.throw(
                'Invalid legacy address',
            );
            expect(() =>
                decodeLegacyAddress('some t1LuPdPkGH5QoNSewQrr8EzNbM27ktPdgQX'),
            ).to.throw('Invalid legacy address');
        });
        it('encodeLegacyAddress will encode just about anything, careful', () => {
            expect(
                encodeLegacyAddress(new Uint8Array([0, 1, 2, 3, 4]), 'p2pkh'),
            ).to.equal('11An6UeerQM6');
        });
        // From https://github.com/ealmansi/bchaddrjs/blob/master/test/bchaddr.js
        const LEGACY_HASH = '6f4b705e3e0407bf3159e9c4050df1b791d2c3f6';
        const LEGACY_MAINNET_P2PKH_ADDRESS =
            '1B9UNtBfkkpgt8kVbwLN9ktE62QKnMbDzR';
        const LEGACY_MAINNET_P2SH_ADDRESS =
            '3BqVJRg7Jf94yJSvj2zxaPFAEYh3MAyyw9';
        const LEGACY_TESTNET_P2PKH_ADDRESSES =
            'mqfRfwGeZnFwfFE7KWJjyg6Yx212iGi6Fi';
        const LEGACY_TESTNET_P2SH_ADDRESSES =
            '2N3PhNAc8v7eRB65UQAcqCLERStuD93JXLD';
        it('encodes and decodes legacy mainnet p2pkh', () => {
            const decoded: DecodedLegacyAddress = {
                hash: LEGACY_HASH,
                type: 'p2pkh',
                network: 'mainnet',
            };
            expect(
                encodeLegacyAddress(fromHex(decoded.hash), decoded.type),
            ).to.equal(LEGACY_MAINNET_P2PKH_ADDRESS);
            expect(
                decodeLegacyAddress(LEGACY_MAINNET_P2PKH_ADDRESS),
            ).to.deep.equal(decoded);
        });
        it('encodes and decodes legacy mainnet p2sh', () => {
            const decoded: DecodedLegacyAddress = {
                hash: LEGACY_HASH,
                type: 'p2sh',
                network: 'mainnet',
            };
            expect(
                encodeLegacyAddress(fromHex(decoded.hash), decoded.type),
            ).to.equal(LEGACY_MAINNET_P2SH_ADDRESS);
            expect(
                decodeLegacyAddress(LEGACY_MAINNET_P2SH_ADDRESS),
            ).to.deep.equal(decoded);
        });
        it('encodes and decodes legacy testnet p2pkh', () => {
            const decoded: DecodedLegacyAddress = {
                hash: LEGACY_HASH,
                type: 'p2pkh',
                network: 'testnet',
            };
            expect(
                encodeLegacyAddress(
                    fromHex(decoded.hash),
                    decoded.type,
                    decoded.network,
                ),
            ).to.equal(LEGACY_TESTNET_P2PKH_ADDRESSES);
            expect(
                decodeLegacyAddress(LEGACY_TESTNET_P2PKH_ADDRESSES),
            ).to.deep.equal(decoded);
        });
        it('encodes and decodes legacy testnet p2sh', () => {
            const decoded: DecodedLegacyAddress = {
                hash: LEGACY_HASH,
                type: 'p2sh',
                network: 'testnet',
            };
            expect(
                encodeLegacyAddress(
                    fromHex(decoded.hash),
                    decoded.type,
                    decoded.network,
                ),
            ).to.equal(LEGACY_TESTNET_P2SH_ADDRESSES);

            expect(
                decodeLegacyAddress(LEGACY_TESTNET_P2SH_ADDRESSES),
            ).to.deep.equal(decoded);
        });
    });
});

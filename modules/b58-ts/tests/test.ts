// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { decodeBase58, encodeBase58 } from '../index';
import tests from './base58_encode_decode.json';

function fromHex(hex: string): Uint8Array {
    return Uint8Array.from(Buffer.from(hex, 'hex'));
}

function toHex(array: Uint8Array): string {
    return Buffer.from(array).toString('hex');
}

describe('Base58', () => {
    it('encodeBase58', () => {
        for (const [hex, base58] of tests) {
            expect(encodeBase58(fromHex(hex))).to.equal(base58);
        }
    });

    it('decodeBase58', () => {
        for (const [hex, base58] of tests) {
            expect(toHex(decodeBase58(base58))).to.equal(hex);
        }

        expect(() => decodeBase58('invalid')).to.throw(
            'Invalid base58 character',
        );
        expect(toHex(decodeBase58('good'))).to.equal('768320');
        expect(() => decodeBase58('bad0IOl')).to.throw(
            'Invalid base58 character',
        );
        expect(() => decodeBase58('goodbad0IOl')).to.throw(
            'Invalid base58 character',
        );
        expect(() => decodeBase58('goodbad0IOl')).to.throw(
            'Invalid base58 character',
        );

        // check that DecodeBase58 skips whitespace, but still fails with unexpected
        // non-whitespace at the end.
        expect(() => decodeBase58(' \t\n\v\f\r skip \r\f\v\n\t a')).to.throw(
            'Extra letters after whitespace',
        );
        expect(toHex(decodeBase58(' \t\n\v\f\r skip \r\f\v\n\t '))).to.equal(
            '971a55',
        );
    });
});

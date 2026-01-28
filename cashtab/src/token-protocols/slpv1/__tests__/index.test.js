// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getMintBatons,
    getMaxDecimalizedSlpQty,
} from 'token-protocols/slpv1';
import vectors from '../fixtures/vectors';

describe('slpv1 methods', () => {
    describe('Get slpv1 mint baton(s)', () => {
        const { expectedReturns } = vectors.getMintBatons;
        expectedReturns.forEach(vector => {
            const { description, utxos, tokenId, returned } = vector;
            it(`getMintBatons: ${description}`, () => {
                expect(getMintBatons(utxos, tokenId)).toStrictEqual(returned);
            });
        });
    });
    describe('Gets max mint/send/burn SLP amount, decimalized', () => {
        const { expectedReturns } = vectors.getMaxDecimalizedSlpQty;
        expectedReturns.forEach(vector => {
            const { description, decimals, returned } = vector;
            it(`getMaxDecimalizedSlpQty: ${description}`, () => {
                expect(getMaxDecimalizedSlpQty(decimals)).toBe(returned);
            });
        });
    });
});

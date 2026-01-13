// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getMaxDecimalizedAlpQty,
    getAlpBurnTargetOutputs,
} from 'token-protocols/alp';
import vectors from '../fixtures/vectors';

describe('ALP token methods', () => {
    describe('Gets max mint/send/burn ALP amount, decimalized', () => {
        const { expectedReturns } = vectors.getMaxDecimalizedAlpQty;
        expectedReturns.forEach(vector => {
            const { description, decimals, returned } = vector;
            it(`getMaxDecimalizedAlpQty: ${description}`, () => {
                expect(getMaxDecimalizedAlpQty(decimals)).toBe(returned);
            });
        });
    });
    describe('We can build target outputs for an ALP burn tx with or without token change', () => {
        const { expectedReturns } = vectors.getAlpBurnTargetOutputs;
        expectedReturns.forEach(expectedReturn => {
            const { description, tokenInputInfo, returned } = expectedReturn;
            it(`getAlpBurnTargetOutputs: ${description}`, () => {
                expect(getAlpBurnTargetOutputs(tokenInputInfo)).toStrictEqual(
                    returned,
                );
            });
        });
    });
});

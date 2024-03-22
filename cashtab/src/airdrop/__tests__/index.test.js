// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { getAirdropTx, getEqualAirdropTx } from 'airdrop';
import vectors from 'airdrop/fixtures/vectors';

describe('Cashtab airdrop methods', () => {
    describe('Gets csv list of airdrop recipients address and amounts for a standard (prorata) airdrop', () => {
        const { expectedReturns, expectedErrors } = vectors.getAirdropTx;
        expectedReturns.forEach(expectedReturn => {
            const {
                description,
                tokenUtxos,
                excludedAddresses,
                airdropAmountXec,
                minTokenQtyUndecimalized,
                returned,
            } = expectedReturn;
            it(`getAirdropTx: ${description}`, () => {
                expect(
                    getAirdropTx(
                        tokenUtxos,
                        excludedAddresses,
                        airdropAmountXec,
                        minTokenQtyUndecimalized,
                    ),
                ).toEqual(returned);
            });
        });
        expectedErrors.forEach(expectedError => {
            const {
                description,
                tokenUtxos,
                excludedAddresses,
                airdropAmountXec,
                minTokenQtyUndecimalized,
                err,
            } = expectedError;
            it(`getAirdropTx throws error for: ${description}`, () => {
                expect(() =>
                    getAirdropTx(
                        tokenUtxos,
                        excludedAddresses,
                        airdropAmountXec,
                        minTokenQtyUndecimalized,
                    ),
                ).toThrow(err);
            });
        });
    });
    describe('Gets csv list of airdrop recipients address and amounts for an equal airdrop', () => {
        const { expectedReturns, expectedErrors } = vectors.getEqualAirdropTx;
        expectedReturns.forEach(expectedReturn => {
            const {
                description,
                tokenUtxos,
                excludedAddresses,
                airdropAmountXec,
                minTokenQtyUndecimalized,
                returned,
            } = expectedReturn;
            it(`getEqualAirdropTx: ${description}`, () => {
                expect(
                    getEqualAirdropTx(
                        tokenUtxos,
                        excludedAddresses,
                        airdropAmountXec,
                        minTokenQtyUndecimalized,
                    ),
                ).toEqual(returned);
            });
        });
        expectedErrors.forEach(expectedError => {
            const {
                description,
                tokenUtxos,
                excludedAddresses,
                airdropAmountXec,
                minTokenQtyUndecimalized,
                err,
            } = expectedError;
            it(`getEqualAirdropTx throws error for: ${description}`, () => {
                expect(() =>
                    getEqualAirdropTx(
                        tokenUtxos,
                        excludedAddresses,
                        airdropAmountXec,
                        minTokenQtyUndecimalized,
                    ),
                ).toThrow(err);
            });
        });
    });
});

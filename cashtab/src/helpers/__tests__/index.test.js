// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    isMobile,
    getUserLocale,
    cashtabCacheToJSON,
    storedCashtabCacheToMap,
    cashtabWalletFromJSON,
    cashtabWalletToJSON,
    cashtabWalletsFromJSON,
    cashtabWalletsToJSON,
} from 'helpers';
import vectors from 'helpers/fixtures/vectors';

describe('Cashtab helper functions', () => {
    describe('Detect mobile or desktop devices', () => {
        const { expectedReturns } = vectors.isMobile;

        expectedReturns.forEach(expectedReturn => {
            const { description, navigator, result } = expectedReturn;
            it(`isMobile: ${description}`, () => {
                expect(isMobile(navigator)).toBe(result);
            });
        });
    });
    describe('Get user locale', () => {
        const { expectedReturns } = vectors.getUserLocale;

        expectedReturns.forEach(expectedReturn => {
            const { description, navigator, result } = expectedReturn;
            it(`getUserLocale: ${description}`, () => {
                expect(getUserLocale(navigator)).toBe(result);
            });
        });
    });
    describe('Converts cashtabCache to and from JSON for storage and in-app use', () => {
        const { expectedReturns } = vectors.cashtabCacheToJSON;

        expectedReturns.forEach(expectedReturn => {
            const { description, cashtabCache, cashtabCacheJson } =
                expectedReturn;
            it(`cashtabCacheToJSON and storedCashtabCacheToMap: ${description}`, () => {
                expect(cashtabCacheToJSON(cashtabCache)).toEqual(
                    cashtabCacheJson,
                );
                expect(storedCashtabCacheToMap(cashtabCacheJson)).toEqual(
                    cashtabCache,
                );
            });
        });
    });
    describe('Converts cashtabWallet to and from JSON for storage and in-app use', () => {
        const { expectedReturns } = vectors.cashtabWalletToJSON;

        expectedReturns.forEach(expectedReturn => {
            const { description, cashtabWallet, cashtabWalletJSON } =
                expectedReturn;
            it(`cashtabWalletToJSON and cashtabWalletFromJSON: ${description}`, () => {
                expect(cashtabWalletToJSON(cashtabWallet)).toStrictEqual(
                    cashtabWalletJSON,
                );
                expect(cashtabWalletFromJSON(cashtabWalletJSON)).toStrictEqual(
                    cashtabWallet,
                );
            });
        });
    });
    describe('Converts cashtabWallets (array) to and from JSON for storage and in-app use', () => {
        const { expectedReturns } = vectors.cashtabWalletsToJSON;

        expectedReturns.forEach(expectedReturn => {
            const { description, cashtabWallets, cashtabWalletsJSON } =
                expectedReturn;
            it(`cashtabWalletsToJSON and cashtabWalletsFromJSON: ${description}`, () => {
                expect(cashtabWalletsToJSON(cashtabWallets)).toStrictEqual(
                    cashtabWalletsJSON,
                );
                expect(
                    cashtabWalletsFromJSON(cashtabWalletsJSON),
                ).toStrictEqual(cashtabWallets);
            });
        });
    });
});

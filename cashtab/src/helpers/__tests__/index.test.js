// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    isMobile,
    getUserLocale,
    cashtabCacheToJSON,
    storedCashtabCacheToMap,
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
                expect(cashtabCacheToJSON(cashtabCache)).toStrictEqual(
                    cashtabCacheJson,
                );
                expect(storedCashtabCacheToMap(cashtabCacheJson)).toStrictEqual(
                    cashtabCache,
                );
            });
        });
    });
});

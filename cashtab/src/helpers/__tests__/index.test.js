// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { isMobile } from 'helpers';
import vectors from 'helpers/fixtures/vectors';

describe('Detect mobile or desktop devices', () => {
    const { expectedReturns } = vectors.isMobile;

    expectedReturns.forEach(expectedReturn => {
        const { description, navigator, result } = expectedReturn;
        it(`isMobile: ${description}`, () => {
            expect(isMobile(navigator)).toBe(result);
        });
    });
});

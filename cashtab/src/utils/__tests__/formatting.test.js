// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    formatDate,
    formatFiatBalance,
    formatBalance,
    decimalizedTokenQtyToLocaleFormat,
    toFormattedXec,
    getMinimumFractionDigits,
    getFormattedFiatPrice,
} from 'utils/formatting';
import vectors from 'utils/fixtures/vectors';

describe('Correctly executes formatting functions', () => {
    it(`test formatBalance with an input of 0`, () => {
        expect(formatBalance('0')).toBe('0');
    });
    it(`test formatBalance with zero XEC balance input`, () => {
        expect(formatBalance('0', 'en-US')).toBe('0');
    });
    it(`test formatBalance with a small XEC balance input with 2+ decimal figures`, () => {
        expect(formatBalance('1574.5445', 'en-US')).toBe('1,574.54');
    });
    it(`test formatBalance with 1 Million XEC balance input`, () => {
        expect(formatBalance('1000000', 'en-US')).toBe('1,000,000');
    });
    it(`test formatBalance with 1 Billion XEC balance input`, () => {
        expect(formatBalance('1000000000', 'en-US')).toBe('1,000,000,000');
    });
    it(`test formatBalance with total supply as XEC balance input`, () => {
        expect(formatBalance('21000000000000', 'en-US')).toBe(
            '21,000,000,000,000',
        );
    });
    it(`test formatBalance with > total supply as XEC balance input`, () => {
        expect(formatBalance('31000000000000', 'en-US')).toBe(
            '31,000,000,000,000',
        );
    });
    it(`test formatBalance with no balance`, () => {
        expect(formatBalance('', 'en-US')).toBe('0');
    });
    it(`test formatBalance with null input`, () => {
        expect(formatBalance(null, 'en-US')).toBe('0');
    });
    it(`test formatBalance with undefined as input`, () => {
        expect(formatBalance(undefined, 'en-US')).toBe('NaN');
    });
    it(`test formatBalance with non-numeric input`, () => {
        expect(formatBalance('CainBCHA', 'en-US')).toBe('NaN');
    });
    it(`Accepts a valid unix timestamp`, () => {
        expect(formatDate('1639679649', 'fr')).toBe('16 déc. 2021');
    });

    it(`Accepts an empty string and generates a new timestamp`, () => {
        expect(formatDate('', 'en-US')).toBe(
            new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            }),
        );
    });

    it(`Accepts no parameter and generates a new timestamp`, () => {
        expect(formatDate(null, 'en-US')).toBe(
            new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            }),
        );
    });

    it(`Accepts 'undefined' as a parameter and generates a new date`, () => {
        expect(formatDate(undefined, 'en-US')).toBe(
            new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            }),
        );
    });
    it(`Rejects an invalid string containing letters.`, () => {
        expect(formatDate('f', 'en-US')).toBe('Invalid Date');
    });
    it(`Rejects an invalid string containing numbers.`, () => {
        expect(formatDate('10000000000000000', 'en-US')).toBe('Invalid Date');
    });
    it(`test formatFiatBalance with zero XEC balance input`, () => {
        expect(formatFiatBalance(Number('0'), 'en-US')).toBe('0.00');
    });
    it(`test formatFiatBalance with a small XEC balance input with 2+ decimal figures`, () => {
        expect(formatFiatBalance(Number('565.54111'), 'en-US')).toBe('565.54');
    });
    it(`test formatFiatBalance with a large XEC balance input with 2+ decimal figures`, () => {
        expect(formatFiatBalance(Number('131646565.54111'), 'en-US')).toBe(
            '131,646,565.54',
        );
    });
    it(`test formatFiatBalance with no balance`, () => {
        expect(formatFiatBalance('', 'en-US')).toBe('');
    });
    it(`test formatFiatBalance with null input`, () => {
        expect(formatFiatBalance(null, 'en-US')).toBe(null);
    });
    it(`test formatFiatBalance with undefined input`, () => {
        expect(formatFiatBalance(undefined, 'en-US')).toBe(undefined);
    });
    describe('We can format decimalized token strings for userLocale', () => {
        const { expectedReturns } = vectors.decimalizedTokenQtyToLocaleFormat;
        expectedReturns.forEach(vector => {
            const { description, decimalizedTokenQty, userLocale, returned } =
                vector;
            it(`decimalizedTokenQtyToLocaleFormat: ${description}`, () => {
                expect(
                    decimalizedTokenQtyToLocaleFormat(
                        decimalizedTokenQty,
                        userLocale,
                    ),
                ).toBe(returned);
            });
        });
    });
    describe('We can format an XEC balance', () => {
        const { expectedReturns } = vectors.toFormattedXec;
        expectedReturns.forEach(vector => {
            const { description, satoshis, userLocale, returned } = vector;
            it(`toFormattedXec: ${description}`, () => {
                expect(toFormattedXec(satoshis, userLocale)).toBe(returned);
            });
        });
    });
    describe('We can format the price of a listed token in fiat or XEC', () => {
        const { expectedReturns } = vectors.getFormattedFiatPrice;
        expectedReturns.forEach(vector => {
            const {
                description,
                fiatTicker,
                userLocale,
                priceXec,
                fiatPrice,
                returned,
            } = vector;
            it(`getFormattedFiatPrice: ${description}`, () => {
                expect(
                    getFormattedFiatPrice(
                        fiatTicker,
                        userLocale,
                        priceXec,
                        fiatPrice,
                    ),
                ).toBe(returned);
            });
        });
    });
    describe('We can determine how many decimal places we need to show at least 2 places of precision', () => {
        const { expectedReturns } = vectors.getMinimumFractionDigits;
        expectedReturns.forEach(vector => {
            const { description, number, returned } = vector;
            it(`getMinimumFractionDigits: ${description}`, () => {
                expect(getMinimumFractionDigits(number)).toBe(returned);
            });
        });
    });
});

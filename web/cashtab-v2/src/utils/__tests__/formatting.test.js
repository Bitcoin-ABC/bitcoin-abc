import {
    formatDate,
    formatFiatBalance,
    formatSavedBalance,
    formatBalance,
} from '@utils/formatting';

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

    it(`test formatSavedBalance with zero XEC balance input`, () => {
        expect(formatSavedBalance('0', 'en-US')).toBe('0');
    });
    it(`test formatSavedBalance with a small XEC balance input with 2+ decimal figures`, () => {
        expect(formatSavedBalance('1574.5445', 'en-US')).toBe('1,574.54');
    });
    it(`test formatSavedBalance with 1 Million XEC balance input`, () => {
        expect(formatSavedBalance('1000000', 'en-US')).toBe('1,000,000');
    });
    it(`test formatSavedBalance with 1 Billion XEC balance input`, () => {
        expect(formatSavedBalance('1000000000', 'en-US')).toBe('1,000,000,000');
    });
    it(`test formatSavedBalance with total supply as XEC balance input`, () => {
        expect(formatSavedBalance('21000000000000', 'en-US')).toBe(
            '21,000,000,000,000',
        );
    });
    it(`test formatSavedBalance with > total supply as XEC balance input`, () => {
        expect(formatSavedBalance('31000000000000', 'en-US')).toBe(
            '31,000,000,000,000',
        );
    });
    it(`test formatSavedBalance with no balance`, () => {
        expect(formatSavedBalance('', 'en-US')).toBe('0');
    });
    it(`test formatSavedBalance with null input`, () => {
        expect(formatSavedBalance(null, 'en-US')).toBe('0');
    });
    it(`test formatSavedBalance with undefined sw.state.balance or sw.state.balance.totalBalance as input`, () => {
        expect(formatSavedBalance(undefined, 'en-US')).toBe('N/A');
    });
    it(`test formatSavedBalance with non-numeric input`, () => {
        expect(formatSavedBalance('CainBCHA', 'en-US')).toBe('NaN');
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
});

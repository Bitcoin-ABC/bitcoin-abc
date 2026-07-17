// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    appendDecimalToAmount,
    appendDigitToAmount,
    backspaceAmount,
    shouldUseAmountKeypad,
    toSignificantAmount,
} from 'components/Common/cashtabAmountKeypadInput';

jest.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: jest.fn(() => false),
    },
}));

import { Capacitor } from '@capacitor/core';

describe('cashtabAmountKeypadInput', () => {
    describe('toSignificantAmount', () => {
        it('strips thousands separators and keeps locale decimal', () => {
            expect(toSignificantAmount('1,234.56', '.')).toBe('1234.56');
            expect(toSignificantAmount('1.234,56', ',')).toBe('1234,56');
        });

        it('returns empty for empty input', () => {
            expect(toSignificantAmount('', '.')).toBe('');
        });
    });

    describe('appendDigitToAmount', () => {
        it('appends digits to empty and existing values', () => {
            expect(appendDigitToAmount('', '5', '.', 2)).toBe('5');
            expect(appendDigitToAmount('12', '3', '.', 2)).toBe('123');
        });

        it('strips grouping before appending', () => {
            expect(appendDigitToAmount('1,234', '5', '.', 2)).toBe('12345');
        });

        it('respects max decimal places', () => {
            expect(appendDigitToAmount('1.23', '4', '.', 2)).toBe('1.23');
            expect(appendDigitToAmount('1.2', '3', '.', 2)).toBe('1.23');
        });

        it('respects max decimal places in de-DE', () => {
            expect(appendDigitToAmount('1,23', '4', ',', 2)).toBe('1,23');
            expect(appendDigitToAmount('1,2', '3', ',', 2)).toBe('1,23');
        });

        it('ignores non-digit input', () => {
            expect(appendDigitToAmount('10', 'a', '.', 2)).toBe('10');
        });

        it('allows unlimited decimals when maxDecimalPlaces is omitted', () => {
            expect(appendDigitToAmount('1.234567', '8', '.')).toBe('1.2345678');
        });
    });

    describe('appendDecimalToAmount', () => {
        it('adds decimal separator once', () => {
            expect(appendDecimalToAmount('10', '.', 2)).toBe('10.');
            expect(appendDecimalToAmount('10.', '.', 2)).toBe('10.');
        });

        it('uses locale decimal separator', () => {
            expect(appendDecimalToAmount('10', ',', 2)).toBe('10,');
            expect(appendDecimalToAmount('10,5', ',', 2)).toBe('10,5');
        });

        it('blocks decimal when maxDecimalPlaces is zero', () => {
            expect(appendDecimalToAmount('10', '.', 0)).toBe('10');
        });
    });

    describe('backspaceAmount', () => {
        it('removes last significant character', () => {
            expect(backspaceAmount('123', '.')).toBe('12');
            expect(backspaceAmount('1,234', '.')).toBe('123');
            expect(backspaceAmount('10.', '.')).toBe('10');
            expect(backspaceAmount('', '.')).toBe('');
        });

        it('handles de-DE amounts', () => {
            expect(backspaceAmount('1.234,5', ',')).toBe('1234,');
            expect(backspaceAmount('1.234,', ',')).toBe('1234');
        });
    });

    describe('shouldUseAmountKeypad', () => {
        const isNativePlatform = Capacitor.isNativePlatform as jest.Mock;

        beforeEach(() => {
            isNativePlatform.mockReturnValue(false);
        });

        it('is true on Capacitor native platforms', () => {
            isNativePlatform.mockReturnValue(true);
            expect(shouldUseAmountKeypad()).toBe(true);
        });

        it('is true when navigator.userAgentData.mobile is true', () => {
            const nav = {
                userAgent: 'Mozilla/5.0',
                userAgentData: { mobile: true },
            } as unknown as Navigator;
            expect(shouldUseAmountKeypad(nav)).toBe(true);
        });

        it('is true for iPhone UA without userAgentData', () => {
            const nav = {
                userAgent:
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
            } as unknown as Navigator;
            expect(shouldUseAmountKeypad(nav)).toBe(true);
        });

        it('is false for desktop browsers', () => {
            const nav = {
                userAgent:
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0',
                userAgentData: { mobile: false },
            } as unknown as Navigator;
            expect(shouldUseAmountKeypad(nav)).toBe(false);
        });
    });
});

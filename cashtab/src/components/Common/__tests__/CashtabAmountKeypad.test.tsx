// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CashtabAmountKeypad from 'components/Common/CashtabAmountKeypad';

const renderKeypad = (
    props: Partial<React.ComponentProps<typeof CashtabAmountKeypad>> = {},
) => {
    const defaultProps = {
        userLocale: 'en-US',
        onDigit: jest.fn(),
        onDecimal: jest.fn(),
        onBackspace: jest.fn(),
        ...props,
    };
    return {
        ...defaultProps,
        ...render(
            <ThemeProvider theme={theme}>
                <CashtabAmountKeypad {...defaultProps} />
            </ThemeProvider>,
        ),
    };
};

describe('<CashtabAmountKeypad />', () => {
    it('renders digit keys 0-9 and action keys', () => {
        renderKeypad();

        for (let digit = 0; digit <= 9; digit += 1) {
            expect(screen.getByLabelText(`Digit ${digit}`)).toBeInTheDocument();
        }
        expect(screen.getByLabelText('Decimal separator')).toBeInTheDocument();
        expect(screen.getByLabelText('Backspace')).toBeInTheDocument();
    });

    it('renders a dot icon for en-US decimal separator', () => {
        renderKeypad({ userLocale: 'en-US' });

        expect(
            screen.getByLabelText('Decimal separator').querySelector('svg'),
        ).toBeInTheDocument();
    });

    it('shows comma decimal for de-DE locale', () => {
        renderKeypad({ userLocale: 'de-DE' });

        expect(screen.getByLabelText('Decimal separator')).toHaveTextContent(
            ',',
        );
    });

    it('calls onDigit when a digit is pressed', () => {
        const { onDigit } = renderKeypad();

        fireEvent.click(screen.getByLabelText('Digit 3'));

        expect(onDigit).toHaveBeenCalledTimes(1);
        expect(onDigit).toHaveBeenCalledWith('3');
    });

    it('calls onDecimal when the decimal key is pressed', () => {
        const { onDecimal } = renderKeypad();

        fireEvent.click(screen.getByLabelText('Decimal separator'));

        expect(onDecimal).toHaveBeenCalledTimes(1);
    });

    it('calls onBackspace when backspace is pressed', () => {
        const { onBackspace } = renderKeypad();

        fireEvent.click(screen.getByLabelText('Backspace'));

        expect(onBackspace).toHaveBeenCalledTimes(1);
    });

    it('has an accessible group label', () => {
        renderKeypad();

        expect(
            screen.getByRole('group', { name: 'Amount keypad' }),
        ).toBeInTheDocument();
    });

    it('publishes keypad offset and scrolls the focused amount input', () => {
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();
        const scrollIntoView = jest.fn();
        input.scrollIntoView = scrollIntoView;

        const { unmount } = renderKeypad();

        expect(
            document.documentElement.style.getPropertyValue(
                '--cashtab-amount-keypad-offset',
            ),
        ).toBe('255px');
        expect(scrollIntoView).toHaveBeenCalled();
        expect(input.style.scrollMarginBottom).not.toBe('');

        unmount();
        expect(input.style.scrollMarginBottom).toBe('');
        expect(
            document.documentElement.style.getPropertyValue(
                '--cashtab-amount-keypad-offset',
            ),
        ).toBe('');

        input.remove();
    });

    it('docks above a marked fixed CTA instead of covering it', () => {
        const cta = document.createElement('div');
        cta.setAttribute('data-cashtab-fixed-cta', '');
        Object.defineProperty(cta, 'offsetHeight', {
            configurable: true,
            value: 72,
        });
        document.body.appendChild(cta);

        renderKeypad();

        const dock = screen.getByRole('group', {
            name: 'Amount keypad',
        }).parentElement;
        expect(dock).toHaveStyle({ bottom: '142px' }); // 70 footer + 72 CTA

        cta.remove();
    });

    it('prevents mousedown default so parent inputs keep focus', () => {
        renderKeypad();

        const digit = screen.getByLabelText('Digit 1');
        const prevented = fireEvent.mouseDown(digit);

        // fireEvent returns false when preventDefault was called
        expect(prevented).toBe(false);
    });

    it('invokes handlers for every digit key', () => {
        const { onDigit } = renderKeypad();

        for (let digit = 0; digit <= 9; digit += 1) {
            fireEvent.click(screen.getByLabelText(`Digit ${digit}`));
            expect(onDigit).toHaveBeenLastCalledWith(String(digit));
        }

        expect(onDigit).toHaveBeenCalledTimes(10);
    });
});

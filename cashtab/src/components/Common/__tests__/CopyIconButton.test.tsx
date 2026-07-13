// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import {
    render,
    screen,
    waitFor,
    act,
    fireEvent,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { CopyIconButton } from 'components/Common/Buttons';

describe('<CopyIconButton />', () => {
    const writeText = jest.fn().mockResolvedValue(undefined);

    beforeEach(() => {
        writeText.mockClear();
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
        });
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it('Copies text and animates the icon to a check then back', async () => {
        render(
            <ThemeProvider theme={theme}>
                <CopyIconButton name="Copy address" data="ecash:qpptest" />
            </ThemeProvider>,
        );

        expect(screen.getByTitle('copy-paste')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Copy address' }),
        ).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Copy address' }));

        expect(writeText).toHaveBeenCalledWith('ecash:qpptest');
        expect(screen.getByTitle('check')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Copied' }),
        ).toBeInTheDocument();

        await act(async () => {
            jest.advanceTimersByTime(2000);
        });

        await waitFor(() => {
            expect(screen.getByTitle('copy-paste')).toBeInTheDocument();
            expect(
                screen.getByRole('button', { name: 'Copy address' }),
            ).toBeInTheDocument();
        });
    });
});

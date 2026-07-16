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
import Seed from 'components/Common/Seed';

const MNEMONIC =
    'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima';

describe('<Seed />', () => {
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

    it('Shows a copy icon and swaps seed words for Copied! for 2s on click', async () => {
        render(
            <ThemeProvider theme={theme}>
                <Seed mnemonic={MNEMONIC} />
            </ThemeProvider>,
        );

        expect(screen.getByTitle('copy-paste')).toBeInTheDocument();
        expect(
            screen.getByText('alpha bravo charlie delta'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Copy seed phrase' }),
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole('button', { name: 'Copy seed phrase' }),
        );

        expect(writeText).toHaveBeenCalledWith(MNEMONIC);
        expect(screen.getByText('Copied!')).toBeInTheDocument();
        // Seed rows stay mounted (visibility:hidden) so the div height is unchanged
        expect(screen.getByText('alpha bravo charlie delta')).not.toBeVisible();
        expect(screen.getByTitle('copy-paste')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Copied' }),
        ).toBeInTheDocument();

        await act(async () => {
            jest.advanceTimersByTime(2000);
        });

        await waitFor(() => {
            expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
            expect(screen.getByText('alpha bravo charlie delta')).toBeVisible();
            expect(
                screen.getByRole('button', { name: 'Copy seed phrase' }),
            ).toBeInTheDocument();
        });
    });
});

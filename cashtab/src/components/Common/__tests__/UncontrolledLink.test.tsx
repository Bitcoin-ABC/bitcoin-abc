// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UncontrolledLink from 'components/Common/UncontrolledLink';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';

describe('<UncontrolledLink />', () => {
    it('We display a modal instead of navigating directly when a user clicks an unsupported url', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <UncontrolledLink url={'https://scam.com'} />
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see renderedUrl
        expect(screen.getByText('scam.com')).toBeInTheDocument();

        // We can click the link
        await userEvent.click(screen.getByText('scam.com'));

        // We see a modal
        expect(screen.getByText('⚠️⚠️⚠️')).toBeInTheDocument();
    });
    it('We navigate directly to an approved URL', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <UncontrolledLink url={'https://cashtab.com'} />
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see renderedUrl
        expect(screen.getByText('cashtab.com')).toBeInTheDocument();

        // We can click the link
        await userEvent.click(screen.getByText('cashtab.com'));

        // We DO NOT see the safety modal
        expect(screen.queryByText('⚠️⚠️⚠️')).not.toBeInTheDocument();
    });
    it('We navigate directly to an approved domain URL', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <UncontrolledLink
                        url={'https://www.proofofwriting.com/26'}
                    />
                </ThemeProvider>
            </MemoryRouter>,
        );

        expect(
            screen.getByText('www.proofofwriting.com/26'),
        ).toBeInTheDocument();

        await userEvent.click(screen.getByText('www.proofofwriting.com/26'));

        expect(screen.queryByText('⚠️⚠️⚠️')).not.toBeInTheDocument();
    });
    it('Approved domain matching is case insensitive', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <UncontrolledLink url={'https://StakedXec.com'} />
                </ThemeProvider>
            </MemoryRouter>,
        );

        await userEvent.click(screen.getByText('StakedXec.com'));

        expect(screen.queryByText('⚠️⚠️⚠️')).not.toBeInTheDocument();
    });
});

// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { theme } from 'assets/styles/theme';
import RevealableAddress from 'components/Common/RevealableAddress';
import { getHighlightedAddressParts, previewAddress } from 'helpers';

const ADDRESS = 'ecash:qzs4zzxs0gvfrc6e2wqhkmvj4dmmh332cvfpd7yjep';

describe('<RevealableAddress />', () => {
    it('Shows a preview and reveals the full address with checksum highlights', async () => {
        const user = userEvent.setup();
        const parts = getHighlightedAddressParts(ADDRESS);

        render(
            <ThemeProvider theme={theme}>
                <RevealableAddress address={ADDRESS} />
            </ThemeProvider>,
        );

        expect(screen.getByText(previewAddress(ADDRESS))).toBeInTheDocument();
        expect(screen.queryByTestId('full-address')).not.toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Show full address' }),
        );

        const full = screen.getByTestId('full-address');
        expect(full).toHaveTextContent(ADDRESS);
        expect(screen.getByTestId('address-leading')).toHaveTextContent(
            parts.leading,
        );
        expect(screen.getByTestId('address-checksum')).toHaveTextContent(
            parts.checksum,
        );
        expect(screen.getByTestId('address-leading')).toHaveStyle(
            `color: ${theme.accent}`,
        );
        expect(screen.getByTestId('address-checksum')).toHaveStyle(
            `color: ${theme.accent}`,
        );

        await user.click(
            screen.getByRole('button', { name: 'Hide full address' }),
        );
        expect(screen.getByText(previewAddress(ADDRESS))).toBeInTheDocument();
        expect(screen.queryByTestId('full-address')).not.toBeInTheDocument();
    });
});

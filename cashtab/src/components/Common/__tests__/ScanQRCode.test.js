// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import ScanQRCode from 'components/Common/ScanQRCode';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';

// Mock @zxing/browser
jest.mock('@zxing/browser');

describe('<ScanQRCode />', () => {
    it('Does not render the modal on load, but it can be opened and closed on click', async () => {
        render(
            <ThemeProvider theme={theme}>
                <ScanQRCode />
            </ThemeProvider>,
        );

        // Button to open modal is rendered
        const StartScanningButton = screen.queryByTitle('Scan QR Code');
        expect(StartScanningButton).toBeInTheDocument();

        // The modal root component is not rendered
        expect(screen.queryByTitle('Video Preview')).not.toBeInTheDocument();

        // Click the open modal button
        await userEvent.click(StartScanningButton);

        // The modal is rendered
        expect(await screen.findByTitle('Video Preview')).toBeInTheDocument();

        // Click the close button
        await userEvent.click(screen.getByRole('button', { name: /X/ }));

        // Expect modal to be closed
        expect(screen.queryByTitle('Video Preview')).not.toBeInTheDocument();
    });
});

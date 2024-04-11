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

// https://stackoverflow.com/questions/39830580/jest-test-fails-typeerror-window-matchmedia-is-not-a-function
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// https://stackoverflow.com/questions/64813447/cannot-read-property-addlistener-of-undefined-react-testing-library
window.matchMedia = query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
});

// Mock @zxing/browser
jest.mock('@zxing/browser');

describe('<ScanQRCode />', () => {
    it('Renders the modal on load if loadWithCameraOpen is true', async () => {
        render(
            <ThemeProvider theme={theme}>
                <ScanQRCode loadWithScannerOpen={true} />
            </ThemeProvider>,
        );

        // Button to open modal is rendered
        const StartScanningButton = screen.queryByTestId('scan-qr-code');
        expect(StartScanningButton).toBeInTheDocument();

        // The video component inside the modal is rendered
        expect(await screen.findByTestId('video')).toBeInTheDocument();

        // Click the close button
        await userEvent.click(screen.getByRole('button', { name: /X/ }));

        // Expect modal to be closed
        expect(screen.queryByTestId('video')).not.toBeInTheDocument();
    });
    it('Does not render the modal on load if loadWithCameraOpen is false', async () => {
        render(
            <ThemeProvider theme={theme}>
                <ScanQRCode loadWithScannerOpen={false} />
            </ThemeProvider>,
        );

        // Button to open modal is rendered
        const StartScanningButton = screen.queryByTestId('scan-qr-code');
        expect(StartScanningButton).toBeInTheDocument();

        // The modal root component is not rendered
        expect(screen.queryByTestId('video')).not.toBeInTheDocument();

        // Click the open modal button
        await userEvent.click(StartScanningButton);

        // The modal is rendered
        expect(await screen.findByTestId('video')).toBeInTheDocument();
    });
});

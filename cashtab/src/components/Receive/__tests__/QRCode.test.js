// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { QRCode } from 'components/Receive/QRCode';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';

describe('<QRCode />', () => {
    it('QRCode copying ecash address', async () => {
        const address = 'ecash:qqyumjtrftl5yfdwuglhq6l9af2ner39jqr0wexwyk';
        render(
            <ThemeProvider theme={theme}>
                <QRCode pixelRatio={25} address={address} legacy={true} />
            </ThemeProvider>,
        );

        // We do not see addr copied div before click
        const QrCodeCopied = screen.queryByText('Address Copied to Clipboard');
        expect(QrCodeCopied).toHaveStyle('display: none');

        const qrCodeElement = screen.getByTestId('raw-qr-code');
        await userEvent.click(qrCodeElement);

        // We do see the addr copied div with correct address after click
        expect(QrCodeCopied).toHaveStyle('display: block');
        expect(QrCodeCopied).toHaveTextContent(address);
    });

    it('QRCode copying eToken address', async () => {
        const address = 'etoken:qqyumjtrftl5yfdwuglhq6l9af2ner39jqd38msfqp';
        render(
            <ThemeProvider theme={theme}>
                <QRCode pixelRatio={25} address={address} legacy={true} />
            </ThemeProvider>,
        );
        // We do not see addr copied div before click
        const QrCodeCopied = screen.queryByText('Address Copied to Clipboard');
        expect(QrCodeCopied).toHaveStyle('display: none');

        const qrCodeElement = screen.getByTestId('raw-qr-code');
        await userEvent.click(qrCodeElement);

        // We do see the addr copied div with correct address after click
        expect(QrCodeCopied).toHaveStyle('display: block');
        expect(QrCodeCopied).toHaveTextContent(address);
    });

    it('QRCode will render without address', async () => {
        render(
            <ThemeProvider theme={theme}>
                <QRCode pixelRatio={25} />
            </ThemeProvider>,
        );
        expect(screen.getByTestId('raw-qr-code')).toBeInTheDocument();
    });
});

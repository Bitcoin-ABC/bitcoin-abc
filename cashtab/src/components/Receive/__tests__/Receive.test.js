// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { walletWithXecAndTokensActive } from 'components/App/fixtures/mocks';
import { when } from 'jest-when';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import appConfig from 'config/app';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import { FIRMA } from 'constants/tokens';

describe('<Receive />', () => {
    let user;
    beforeEach(() => {
        // Set up userEvent
        user = userEvent.setup();
        // Mock the fetch call for Cashtab's price API
        global.fetch = jest.fn();
        const fiatCode = 'usd'; // Use usd until you mock getting settings from localforage
        const cryptoId = appConfig.coingeckoId;
        // Keep this in the code, because different URLs will have different outputs requiring different parsing
        const priceApiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${fiatCode}&include_last_updated_at=true`;
        const xecPrice = 0.00003;
        const priceResponse = {
            ecash: {
                usd: xecPrice,
                last_updated_at: 1706644626,
            },
        };
        when(fetch)
            .calledWith(priceApiUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(priceResponse),
            });
    });
    afterEach(async () => {
        jest.clearAllMocks();
        await clearLocalForage(localforage);
        // Reset the width and height to jsdom defaults
        Object.defineProperty(window, 'innerWidth', {
            value: 1024,
            writable: true, // possibility to overwrite
        });
        Object.defineProperty(window, 'innerHeight', {
            value: 768,
            writable: true, // possibility to overwrite
        });
    });
    it('Renders as expected on desktop, including copy paste functionality of clicking on the QR code', async () => {
        // Mock the app with context at the Receive screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/receive" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Receive screen is rendered
        expect(await screen.findByTitle('Receive')).toBeInTheDocument();

        // QR Code is rendered
        expect(screen.getByTitle('QR Code')).toBeInTheDocument();

        // Copy div is not displayed
        expect(screen.queryByText('Address Copied to Clipboard')).toHaveStyle(
            'display: none',
        );

        // Click the QR Code
        const qrCodeItself = screen.queryByTitle('Raw QR Code');
        await user.click(qrCodeItself);

        // Copy div is displayed
        expect(screen.queryByText('Address Copied to Clipboard')).toHaveStyle(
            'display: block',
        );
        // Copy div renders address as expected
        expect(
            screen.queryByText('Address Copied to Clipboard'),
        ).toHaveTextContent(
            'Address Copied to Clipboardecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
        );

        // We have the expected width for a desktop device
        // We expect QR Code width of 420px
        // QR Code is rendered
        const EXPECTED_DESKTOP_WIDTH = '420';
        expect(qrCodeItself).toBeInTheDocument();
        // In qrcode.react v4, the title prop creates a <title> element inside the SVG
        // So we need to find the parent SVG element
        const svgElement = qrCodeItself.closest('svg');
        expect(svgElement).toBeInTheDocument();
        // qrcode.react v4 sets width/height attributes on the SVG element
        expect(svgElement).toHaveAttribute('width', EXPECTED_DESKTOP_WIDTH);
        expect(svgElement).toHaveAttribute('height', EXPECTED_DESKTOP_WIDTH);

        // We can enter an amount to generate a bip21 QR code and query string
        await userEvent.type(
            screen.getByPlaceholderText('Enter receive amount'),
            '55.123',
        );

        // We see expected validation error bc an eCash amount cannot have more than 2 decimal places
        expect(screen.getByText('Max 2 decimal places')).toBeInTheDocument();

        // Enter a valid amount
        await userEvent.clear(
            screen.getByPlaceholderText('Enter receive amount'),
        );
        await userEvent.type(
            screen.getByPlaceholderText('Enter receive amount'),
            '55123.33',
        );

        // If we click the QR code now, we get a bip21 msg
        await user.click(qrCodeItself);

        // Copy div is displayed with expected bip 21 msg
        expect(
            screen.queryByText('bip21 query string copied to clipboard'),
        ).toBeInTheDocument();

        // We can click to get a URL that will open Cashtab with this tx pre-populated
        await user.click(
            screen.getByRole('button', { name: 'Copy Cashtab URL' }),
        );
        expect(
            await screen.findByText(
                `"https://cashtab.com/#/send?bip21=ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g?amount=55123.33" copied to clipboard`,
            ),
        ).toBeInTheDocument();

        // We can hit the switch to send in Firma
        await user.click(screen.getByTitle('Toggle Firma'));

        // Now we can use 4 decimal places
        await userEvent.clear(
            screen.getByPlaceholderText('Enter receive amount'),
        );
        await userEvent.type(
            screen.getByPlaceholderText('Enter receive amount'),
            '12.1234',
        );
        // We can get a FIRMA receive bip21 string
        await user.click(
            screen.getByRole('button', { name: 'Copy Cashtab URL' }),
        );
        expect(
            await screen.findByText(
                `"https://cashtab.com/#/send?bip21=ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g?token_id=${FIRMA.tokenId}&token_decimalized_qty=12.1234" copied to clipboard`,
            ),
        ).toBeInTheDocument();

        // If we switch back to XEC, form validation catches 4 decimal places
        await user.click(screen.getByTitle('Toggle Firma'));
        expect(screen.getByText('Max 2 decimal places')).toBeInTheDocument();
    });
    it('Renders the Receive screen with QR code of expected width for smallest supported mobile view', async () => {
        // Reset the width to mobile
        Object.defineProperty(window, 'innerWidth', {
            value: 320,
            writable: true, // possibility to overwrite
        });
        // Mock the app with context at the Receive screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/receive" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Receive screen is rendered
        expect(await screen.findByTitle('Receive')).toBeInTheDocument();

        // We render the rest of the component as expected
        // QR Code is rendered
        expect(screen.getByTitle('QR Code')).toBeInTheDocument();

        // Copy div is not displayed
        expect(screen.queryByText('Address Copied to Clipboard')).toHaveStyle(
            'display: none',
        );

        // We expect QR Code width of 245px = 320 - CASHTAB_MOBILE_QR_PADDING of 75px
        // QR Code is rendered
        const EXPECTED_DESKTOP_WIDTH = '245';
        const qrCodeItself = screen.queryByTitle('Raw QR Code');
        expect(qrCodeItself).toBeInTheDocument();
        // In qrcode.react v4, the title prop creates a <title> element inside the SVG
        const svgElement = qrCodeItself.closest('svg');
        expect(svgElement).toBeInTheDocument();
        expect(svgElement).toHaveAttribute('width', EXPECTED_DESKTOP_WIDTH);
        expect(svgElement).toHaveAttribute('height', EXPECTED_DESKTOP_WIDTH);
    });
    it('Renders the Receive screen with QR code of size that is fully viewable in extension dimensions', async () => {
        // Reset the width and height to extension
        // Note that, while these dimensions are in the css of App.js,
        // the 600 height is also imposed by Chrome
        // So we need to have a QR code size that works with this
        Object.defineProperty(window, 'innerWidth', {
            value: 400,
            writable: true, // possibility to overwrite
        });
        Object.defineProperty(window, 'innerHeight', {
            value: 600,
            writable: true, // possibility to overwrite
        });
        // Mock the app with context at the Receive screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/receive" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Receive screen is rendered
        expect(await screen.findByTitle('Receive')).toBeInTheDocument();

        // We render the rest of the component as expected
        // QR Code is rendered
        expect(screen.getByTitle('QR Code')).toBeInTheDocument();

        // Copy div is not displayed
        expect(screen.queryByText('Address Copied to Clipboard')).toHaveStyle(
            'display: none',
        );

        // We expect QR Code width of 250 for extension
        // QR Code is rendered
        const EXPECTED_DESKTOP_WIDTH = '250';
        const qrCodeItself = screen.queryByTitle('Raw QR Code');
        expect(qrCodeItself).toBeInTheDocument();
        // In qrcode.react v4, the title prop creates a <title> element inside the SVG
        const svgElement = qrCodeItself.closest('svg');
        expect(svgElement).toBeInTheDocument();
        expect(svgElement).toHaveAttribute('width', EXPECTED_DESKTOP_WIDTH);
        expect(svgElement).toHaveAttribute('height', EXPECTED_DESKTOP_WIDTH);
    });
    it('Shows fiat equivalent when XEC amount is entered and fiat price is available', async () => {
        // beforeEach mocks fetch with xecPrice = 0.00003 USD
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/receive" />);

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        expect(await screen.findByTitle('Receive')).toBeInTheDocument();

        // Enter 1000 XEC; at 0.00003 USD/XEC = 0.03 USD
        await user.type(
            screen.getByPlaceholderText('Enter receive amount'),
            '1000',
        );

        // Fiat equivalent should show: = $ 0.03 USD (or similar locale format)
        expect(screen.getByText('= $ 0.03 USD')).toBeInTheDocument();
    });
    it('Shows no fiat equivalent when fiat price is not available', async () => {
        global.fetch = jest
            .fn()
            .mockRejectedValue(new Error('Failed to fetch'));

        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/receive" />);

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        expect(await screen.findByTitle('Receive')).toBeInTheDocument();

        await user.type(
            screen.getByPlaceholderText('Enter receive amount'),
            '1000',
        );

        // Fiat equivalent should not appear when price fetch failed
        expect(screen.queryByText('= $ 0.03 USD')).not.toBeInTheDocument();
        expect(screen.queryByText(/=\s*\$.*USD/)).not.toBeInTheDocument();
    });
});

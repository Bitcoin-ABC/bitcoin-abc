// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { walletWithXecAndTokens } from 'components/App/fixtures/mocks';
import { when } from 'jest-when';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import appConfig from 'config/app';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';

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
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/receive" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Receive screen is rendered
        expect(await screen.findByTestId('receive-ctn')).toBeInTheDocument();

        // QR Code is rendered
        expect(screen.getByTestId('qr-code-ctn')).toBeInTheDocument();

        // Copy div is not displayed
        expect(screen.queryByText('Address Copied to Clipboard')).toHaveStyle(
            'display: none',
        );

        // Click the QR Code
        const qrCodeItself = screen.queryByTestId('raw-qr-code');
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
        expect(qrCodeItself).toHaveAttribute('width', EXPECTED_DESKTOP_WIDTH);
        expect(qrCodeItself).toHaveAttribute('height', EXPECTED_DESKTOP_WIDTH);
    });
    it('Renders the Receive screen with QR code of expected width for smallest supported mobile view', async () => {
        // Reset the width to mobile
        Object.defineProperty(window, 'innerWidth', {
            value: 320,
            writable: true, // possibility to overwrite
        });
        // Mock the app with context at the Receive screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/receive" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Receive screen is rendered
        expect(await screen.findByTestId('receive-ctn')).toBeInTheDocument();

        // We render the rest of the component as expected
        // QR Code is rendered
        expect(screen.getByTestId('qr-code-ctn')).toBeInTheDocument();

        // Copy div is not displayed
        expect(screen.queryByText('Address Copied to Clipboard')).toHaveStyle(
            'display: none',
        );

        // We expect QR Code width of 245px = 320 - CASHTAB_MOBILE_QR_PADDING of 75px
        // QR Code is rendered
        const EXPECTED_DESKTOP_WIDTH = '245';
        const qrCodeItself = screen.queryByTestId('raw-qr-code');
        expect(qrCodeItself).toBeInTheDocument();
        expect(qrCodeItself).toHaveAttribute('width', EXPECTED_DESKTOP_WIDTH);
        expect(qrCodeItself).toHaveAttribute('height', EXPECTED_DESKTOP_WIDTH);
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
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/receive" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Receive screen is rendered
        expect(await screen.findByTestId('receive-ctn')).toBeInTheDocument();

        // We render the rest of the component as expected
        // QR Code is rendered
        expect(screen.getByTestId('qr-code-ctn')).toBeInTheDocument();

        // Copy div is not displayed
        expect(screen.queryByText('Address Copied to Clipboard')).toHaveStyle(
            'display: none',
        );

        // We expect QR Code width of 250 for extension
        // QR Code is rendered
        const EXPECTED_DESKTOP_WIDTH = '250';
        const qrCodeItself = screen.queryByTestId('raw-qr-code');
        expect(qrCodeItself).toBeInTheDocument();
        expect(qrCodeItself).toHaveAttribute('width', EXPECTED_DESKTOP_WIDTH);
        expect(qrCodeItself).toHaveAttribute('height', EXPECTED_DESKTOP_WIDTH);
    });
});

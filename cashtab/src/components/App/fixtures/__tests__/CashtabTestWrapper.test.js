// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import { walletWithXecAndTokensActive } from 'components/App/fixtures/mocks';

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

describe('<CashtabTestWrapper />', () => {
    beforeEach(() => {
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
    });
    it('With default props, renders App component', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // We are at the <App/> component, i.e. home page if we do not nav anywhere

        // API Error is NOT rendered
        expect(
            screen.queryByText('Error in chronik connection'),
        ).not.toBeInTheDocument();

        // Wait for Cashtab to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Home container
        expect(await screen.findByTestId('tx-history')).toBeInTheDocument();
    });
    it('We can render other pages by passing the route', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(
            <CashtabTestWrapper chronik={mockedChronik} route="/configure" />,
        );

        // We are at the <Configure/> component, i.e. home page if we do not nav anywhere
        expect(await screen.findByTitle('Settings')).toBeInTheDocument();
    });
});

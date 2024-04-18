// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import {
    EtokensWalletMock,
    EtokensStoredCashtabCache,
} from 'components/Etokens/fixtures/mocks';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
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

describe('<Etokens />', () => {
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
    it('Large token list is rendered and searchable', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            EtokensWalletMock,
            localforage,
        );

        // Set a big token cache
        await localforage.setItem('cashtabCache', EtokensStoredCashtabCache);

        render(<CashtabTestWrapper chronik={mockedChronik} route="/etokens" />);

        // The Etokens page is rendered
        expect(await screen.findByTitle('Wallet Tokens')).toBeInTheDocument();

        // Wait for loader to be gone
        await waitFor(() =>
            expect(
                screen.queryByTitle('Loading tokens'),
            ).not.toBeInTheDocument(),
        );

        const renderedTokens = screen.getAllByTitle('Token List Item');

        // We render all 55 tokens
        expect(renderedTokens.length).toBe(55);
        // Tokens are sorted alphabetically
        expect(renderedTokens[0]).toHaveTextContent('223');
        expect(renderedTokens[1]).toHaveTextContent('ABC');
        expect(renderedTokens[2]).toHaveTextContent('Alita');

        // We can search for a token by ticker
        const searchInput = screen.getByPlaceholderText(
            'Start typing a token ticker or name',
        );
        await userEvent.type(searchInput, 'VSP');

        // Now only one token is rendered
        expect(screen.getAllByTitle('Token List Item').length).toBe(1);
        // The lone rendered token is what we searched for
        expect(screen.getByTitle('Token List Item')).toHaveTextContent('VSP');

        // The search is not case sensitive
        await userEvent.clear(searchInput);
        await userEvent.type(searchInput, 'vsp');

        // Now only one token is rendered
        expect(screen.getAllByTitle('Token List Item').length).toBe(1);
        // The lone rendered token is what we searched for
        expect(screen.getByTitle('Token List Item')).toHaveTextContent('VSP');

        // We can also search by the name
        await userEvent.clear(searchInput);
        await userEvent.type(searchInput, 'vespene gas');

        // We get the same token, and only this token
        expect(screen.getAllByTitle('Token List Item').length).toBe(1);
        expect(screen.getByTitle('Token List Item')).toHaveTextContent('VSP');

        // We can also search by the name
        await userEvent.clear(searchInput);
        await userEvent.type(searchInput, 'vespene gas');

        // We get the same token, and only this token
        expect(screen.getAllByTitle('Token List Item').length).toBe(1);
        expect(screen.getByTitle('Token List Item')).toHaveTextContent('VSP'); // We can also search by the name

        // We get expected msg if our search has no results
        await userEvent.clear(searchInput);
        await userEvent.type(searchInput, 'zz');

        // No tokens are found
        expect(screen.queryByTitle('Token List Item')).not.toBeInTheDocument();

        // We get expected msg for no search result
        expect(screen.getByText('No tokens matching zz')).toBeInTheDocument();
    });
});

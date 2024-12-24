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
            } as Response);
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

        // The 'All' switch is "on" on load
        const showAllSwitch = screen.getByTitle('Toggle All');
        expect(showAllSwitch).toHaveProperty('checked', true);
        // The 'All' switch is disabled when it is on
        expect(showAllSwitch).toHaveProperty('disabled', true);

        // We render all 57 tokens
        expect(renderedTokens.length).toBe(57);

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

        // If we switch to "Show NFTs" while the search is showing one non-NFT, we see no tokens
        await userEvent.click(screen.getByTitle('Toggle NFTs'));

        // The 'All' switch is toggled off automatically
        expect(showAllSwitch).toHaveProperty('checked', false);
        // The 'All' switch is NOT disabled when another switch is toggled
        expect(showAllSwitch).toHaveProperty('disabled', false);

        // we see no tokens, as 'vsp' only matches a fungible token, and now we are showing NFTs
        // We get expected msg for no search result
        expect(screen.getByText('No tokens matching vsp')).toBeInTheDocument();

        // If we delete the query, now we see only NFTs
        await userEvent.clear(searchInput);

        expect(screen.getAllByTitle('Token List Item').length).toBe(1);
        expect(screen.getAllByTitle('Token List Item')[0]).toHaveTextContent(
            'S5',
        );

        // If we hit the switch to show collections, we see the only collection
        // If we switch to "Show NFTs" while the search is showing one non-NFT, we see no tokens
        await userEvent.click(screen.getByTitle('Toggle Collections'));
        expect(screen.getAllByTitle('Token List Item').length).toBe(1);
        expect(screen.getAllByTitle('Token List Item')[0]).toHaveTextContent(
            /MASCOTS/,
        );

        // We can also search by the name
        await userEvent.clear(searchInput);
        await userEvent.type(searchInput, 'vespene gas');

        // But, because the collections switch is on, we have no collections that match this
        expect(
            screen.getByText('No tokens matching vespene gas'),
        ).toBeInTheDocument();

        // Ok, let's hit the switch to show fungible tokens
        await userEvent.click(screen.getByTitle('Toggle Fungible Tokens'));

        // Now we get the expected token, and only this token
        expect(screen.getAllByTitle('Token List Item').length).toBe(1);
        expect(screen.getByTitle('Token List Item')).toHaveTextContent('VSP');

        // We get expected msg if our search has no results
        await userEvent.clear(searchInput);
        await userEvent.type(searchInput, 'zz');

        // No tokens are found
        expect(screen.queryByTitle('Token List Item')).not.toBeInTheDocument();

        // We get expected msg for no search result
        expect(screen.getByText('No tokens matching zz')).toBeInTheDocument();

        // We can't find MASCOTS because it's a collection and the Show Fungible Tokens toggle is on
        await userEvent.clear(searchInput);
        await userEvent.type(searchInput, 'masc');

        // No tokens are found
        expect(screen.queryByTitle('Token List Item')).not.toBeInTheDocument();

        // We get expected msg for no search result
        expect(screen.getByText('No tokens matching masc')).toBeInTheDocument();

        // We hit show all and now it's there
        await userEvent.click(screen.getByTitle('Toggle All'));
        expect(showAllSwitch).toHaveProperty('checked', true);
        expect(screen.getAllByTitle('Token List Item').length).toBe(1);
        expect(screen.getByTitle('Token List Item')).toHaveTextContent(
            'MASCOTS',
        );
    });
});

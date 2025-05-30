// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { walletWithXecAndTokens } from 'components/App/fixtures/mocks';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('<CreateToken />', () => {
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
    it('If wallet has sufficient XEC, renders CreateTokenForm', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route="/create-token"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Renders CreateTokenForm, as this wallet has sufficient balance to create a token
        expect(await screen.findByText('Create Token')).toBeInTheDocument();

        // Does not render insufficient balance alert
        expect(
            screen.queryByText(
                'You need at least 5.46 spendable XEC ($0.0002 USD) to create a token',
            ),
        ).not.toBeInTheDocument();
    });
    it('If wallet has insufficient XEC, renders component but does not render CreateTokenForm', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            {
                ...walletWithXecAndTokens,
                state: {
                    ...walletWithXecAndTokens.state,
                    balanceSats: 0,
                    nonSlpUtxos: [],
                },
            },
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route="/create-token"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for the wallet balance to load
        expect(
            await screen.findByTitle('Balance XEC', {}, { timeout: 10000 }),
        ).toHaveTextContent('0.00 XEC');

        // We do not see the Create a Token form
        expect(screen.queryByText('Create Token')).not.toBeInTheDocument();

        // Renders expected alert
        // Note: the component is expected to load before fiatPrice loads
        // In this case, we do not display the fiat price
        expect(
            await screen.findByText(
                'You need at least 5.46 spendable XEC ($0.0002 USD) to create a token',
            ),
        ).toBeInTheDocument();
    });
});

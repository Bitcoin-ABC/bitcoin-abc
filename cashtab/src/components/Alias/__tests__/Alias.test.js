// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { walletWithXecAndTokens } from 'components/App/fixtures/mocks';
import {
    aliasPricesResp,
    aliasAddressTwoRegisteredOnePending,
    aliasAddressOneRegisteredNoPending,
    aliasAddressNoRegisteredOnePending,
} from 'components/Alias/fixtures/mocks';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import aliasSettings from 'config/alias';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import appConfig from 'config/app';

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

// Activate alias features
aliasSettings.aliasEnabled = true;

describe('<Alias />', () => {
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
    it('Registered and Pending Aliases are correctly rendered', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        const defaultAddress = walletWithXecAndTokens.paths.get(1899).address;

        // Mock the fetch call to alias-server's '/prices' endpoint
        const aliasPricesFetchUrl = `${aliasSettings.aliasServerBaseUrl}/prices`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(aliasPricesFetchUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(aliasPricesResp),
            });

        // Mock the refreshAliases() call to alias-server's '/address' endpoint upon component load
        const addressFetchUrl = `${aliasSettings.aliasServerBaseUrl}/address/${defaultAddress}`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(addressFetchUrl)
            .mockResolvedValue({
                json: () =>
                    Promise.resolve(aliasAddressTwoRegisteredOnePending),
            });

        render(<CashtabTestWrapper chronik={mockedChronik} route="/alias" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Registered and Pending Alias dropdowns are rendered
        expect(
            screen.getByTestId('registered-aliases-list'),
        ).toBeInTheDocument();
        expect(screen.getByTestId('pending-aliases-list')).toBeInTheDocument();

        // Validate the aliases within the dropdowns
        await waitFor(() => {
            expect(
                screen.getByTestId('registered-aliases-list'),
            ).toHaveTextContent('chicken555.xecchicken666.xec');
        });
        await waitFor(() => {
            expect(
                screen.getByTestId('pending-aliases-list'),
            ).toHaveTextContent('chicken444.xec');
        });
    });
    it('Registered and Pending Aliases are correctly rendered when pending list is empty', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Mock the fetch call to alias-server's '/prices' endpoint
        const aliasPricesFetchUrl = `${aliasSettings.aliasServerBaseUrl}/prices`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(aliasPricesFetchUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(aliasPricesResp),
            });

        const defaultAddress = walletWithXecAndTokens.paths.get(1899).address;

        // Mock the refreshAliases() call to alias-server's '/address' endpoint upon component load
        const addressFetchUrl = `${aliasSettings.aliasServerBaseUrl}/address/${defaultAddress}`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(addressFetchUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(aliasAddressOneRegisteredNoPending),
            });

        render(<CashtabTestWrapper chronik={mockedChronik} route="/alias" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Registered and Pending Alias dropdowns are rendered
        expect(
            screen.getByTestId('registered-aliases-list'),
        ).toBeInTheDocument();
        expect(screen.getByTestId('pending-aliases-list')).toBeInTheDocument();

        // Validate the aliases within the dropdowns
        await waitFor(() => {
            expect(
                screen.getByTestId('registered-aliases-list'),
            ).toHaveTextContent('chicken555.xec');
        });
        await waitFor(() => {
            expect(
                screen.getByTestId('pending-aliases-list'),
            ).toHaveTextContent('No pending aliases');
        });
    });
    it('Registered and Pending Aliases are correctly rendered when registered list is empty', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Mock the fetch call to alias-server's '/prices' endpoint
        const aliasPricesFetchUrl = `${aliasSettings.aliasServerBaseUrl}/prices`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(aliasPricesFetchUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(aliasPricesResp),
            });

        const defaultAddress = walletWithXecAndTokens.paths.get(1899).address;

        // Mock the refreshAliases() call to alias-server's '/address' endpoint upon component load
        const addressFetchUrl = `${aliasSettings.aliasServerBaseUrl}/address/${defaultAddress}`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(addressFetchUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(aliasAddressNoRegisteredOnePending),
            });

        render(<CashtabTestWrapper chronik={mockedChronik} route="/alias" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Registered and Pending Alias dropdowns are rendered
        expect(
            screen.getByTestId('registered-aliases-list'),
        ).toBeInTheDocument();
        expect(screen.getByTestId('pending-aliases-list')).toBeInTheDocument();

        // Validate the aliases within the dropdowns
        await waitFor(() => {
            expect(
                screen.getByTestId('registered-aliases-list'),
            ).toHaveTextContent('No registered aliases');
        });
        await waitFor(() => {
            expect(
                screen.getByTestId('pending-aliases-list'),
            ).toHaveTextContent('chicken444.xec');
        });
    });
    it('Registered and Pending lists still renders when aliasValidationError is populated and aliasServerError is false', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        const defaultAddress = walletWithXecAndTokens.paths.get(1899).address;

        // Note: Not mocking the '/prices' API call here in order to populate aliasValidationError

        // Mock the refreshAliases() call to alias-server's '/address' endpoint upon component load
        const addressFetchUrl = `${aliasSettings.aliasServerBaseUrl}/address/${defaultAddress}`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(addressFetchUrl)
            .mockResolvedValue({
                json: () =>
                    Promise.resolve(aliasAddressTwoRegisteredOnePending),
            });

        render(<CashtabTestWrapper chronik={mockedChronik} route="/alias" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Registered and Pending Alias dropdowns are rendered
        expect(
            screen.getByTestId('registered-aliases-list'),
        ).toBeInTheDocument();
        expect(screen.getByTestId('pending-aliases-list')).toBeInTheDocument();

        // Validate the aliases within the dropdowns
        await waitFor(() => {
            expect(
                screen.getByTestId('registered-aliases-list'),
            ).toHaveTextContent('chicken555.xecchicken666.xec');
        });
        await waitFor(() => {
            expect(
                screen.getByTestId('pending-aliases-list'),
            ).toHaveTextContent('chicken444.xec');
        });
    });
    it('Registered and Pending lists do not render when aliasValidationError is false and aliasServerError is populated', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Mock the fetch call to alias-server's '/prices' endpoint
        const aliasPricesFetchUrl = `${aliasSettings.aliasServerBaseUrl}/prices`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(aliasPricesFetchUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(aliasPricesResp),
            });

        // Note: Not mocking the refreshAliases() call to alias-server's '/address' endpoint
        // here in order to simulate aliasServerError

        render(<CashtabTestWrapper chronik={mockedChronik} route="/alias" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Validate the aliases within the dropdowns
        await waitFor(() => {
            expect(
                screen.getByTestId('registered-aliases-list'),
            ).not.toHaveTextContent('chicken555.xec');
        });
        await waitFor(() => {
            expect(
                screen.getByTestId('pending-aliases-list'),
            ).not.toHaveTextContent('chicken444.xec');
        });
    });
});

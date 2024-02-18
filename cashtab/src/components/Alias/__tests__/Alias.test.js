import React from 'react';
import {
    walletWithXecAndTokens,
    aliasPricesResp,
    aliasAddressTwoRegisteredOnePending,
    aliasAddressOneRegisteredNoPending,
    aliasAddressNoRegisteredOnePending,
} from '../fixtures/mocks';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import aliasSettings from 'config/alias';
import { initializeCashtabStateForTests } from 'components/fixtures/helpers';
import CashtabTestWrapper from 'components/fixtures/CashtabTestWrapper';

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
    afterEach(async () => {
        jest.clearAllMocks();
        await localforage.clear();
    });
    it('Registered and Pending Aliases are correctly rendered', async () => {
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

        // Mock the refreshAliases() call to alias-server's '/address' endpoint upon component load
        const addressFetchUrl = `${aliasSettings.aliasServerBaseUrl}/address/${walletWithXecAndTokens.Path1899.cashAddress}`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(addressFetchUrl)
            .mockResolvedValue({
                json: () =>
                    Promise.resolve(aliasAddressTwoRegisteredOnePending),
            });

        render(<CashtabTestWrapper chronik={mockedChronik} route="/alias" />);

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

        // Mock the refreshAliases() call to alias-server's '/address' endpoint upon component load
        const addressFetchUrl = `${aliasSettings.aliasServerBaseUrl}/address/${walletWithXecAndTokens.Path1899.cashAddress}`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(addressFetchUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(aliasAddressOneRegisteredNoPending),
            });

        render(<CashtabTestWrapper chronik={mockedChronik} route="/alias" />);

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

        // Mock the refreshAliases() call to alias-server's '/address' endpoint upon component load
        const addressFetchUrl = `${aliasSettings.aliasServerBaseUrl}/address/${walletWithXecAndTokens.Path1899.cashAddress}`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(addressFetchUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(aliasAddressNoRegisteredOnePending),
            });

        render(<CashtabTestWrapper chronik={mockedChronik} route="/alias" />);

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

        // Note: Not mocking the '/prices' API call here in order to populate aliasValidationError

        // Mock the refreshAliases() call to alias-server's '/address' endpoint upon component load
        const addressFetchUrl = `${aliasSettings.aliasServerBaseUrl}/address/${walletWithXecAndTokens.Path1899.cashAddress}`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(addressFetchUrl)
            .mockResolvedValue({
                json: () =>
                    Promise.resolve(aliasAddressTwoRegisteredOnePending),
            });

        render(<CashtabTestWrapper chronik={mockedChronik} route="/alias" />);

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

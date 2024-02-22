import React from 'react';
import {
    walletWithXecAndTokens,
    walletWithZeroBalanceAndTxHistory,
} from '../fixtures/mocks';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { initializeCashtabStateForTests } from 'components/fixtures/helpers';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
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
        await localforage.clear();
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

        // Renders CreateTokenForm, as this wallet has sufficient balance to create a token
        expect(await screen.findByText('Create a Token')).toBeInTheDocument();

        // Does not render insufficient balance alert
        expect(
            screen.queryByText(
                'You need at least 5.5 XEC ($0.0002 USD) to create a token',
            ),
        ).not.toBeInTheDocument();
    });
    it('If wallet has insufficient XEC, renders component but does not render CreateTokenForm', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithZeroBalanceAndTxHistory,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route="/create-token"
            />,
        );

        // We do not see the Create a Token form
        expect(screen.queryByText('Create a Token')).not.toBeInTheDocument();

        // Renders expected alert
        expect(
            await screen.findByText(
                'You need at least 5.5 XEC ($0.0002 USD) to create a token',
            ),
        ).toBeInTheDocument();
    });
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from 'components/App';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { walletWithXecAndTokens } from 'components/fixtures/mocks';
import { MemoryRouter } from 'react-router-dom';
import { WalletProvider } from 'utils/context';
import { MockChronikClient } from '../../../../apps/mock-chronik-client';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
import cashaddr from 'ecashaddrjs';

function mockFunction() {
    const original = jest.requireActual('react-router-dom');
    return {
        ...original,
        useLocation: jest.fn().mockReturnValue({
            pathname: '/another-route',
            search: '',
            hash: '',
            state: null,
            key: '5nvxpbdafa',
        }),
    };
}

jest.mock('react-router-dom', () => mockFunction());

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

describe('<App />', () => {
    beforeEach(() => {
        // Mock the fetch call Cashtab's price API
        global.fetch = jest.fn();
        const fiatCode = 'usd'; // Use usd until you mock getting settings from localforage
        const cryptoId = appConfig.coingeckoId;
        // Keep this in the code, because different URLs will have different outputs require different parsing
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
    it('Renders onboarding screen if cashtab.com opened with no local storage and no wallet', async () => {
        // Do not initialize anything in localforage
        // Do not mock anything in chronik
        const mockedChronik = new MockChronikClient();
        render(
            <WalletProvider chronik={mockedChronik}>
                <MemoryRouter initialEntries={['/wallet']}>
                    <ThemeProvider theme={theme}>
                        <App />
                    </ThemeProvider>
                </MemoryRouter>
            </WalletProvider>,
        );

        // Onboarding is rendered
        await waitFor(() => {
            expect(screen.getByTestId('onboarding')).toBeInTheDocument();
        });
    });
    it('Renders API error if called with wallet in localforage but chronik utxo calls fail', async () => {
        // Initialize a wallet with balance and history in localforage
        await localforage.setItem('wallet', walletWithXecAndTokens);
        // Do not mock anything in chronik
        const mockedChronik = new MockChronikClient();
        render(
            <WalletProvider chronik={mockedChronik}>
                <MemoryRouter initialEntries={['/wallet']}>
                    <ThemeProvider theme={theme}>
                        <App />
                    </ThemeProvider>
                </MemoryRouter>
            </WalletProvider>,
        );
        // API Error is rendered
        await screen.findByTestId('api-error');
        // Wallet-info is rendered
        expect(
            await screen.findByTestId('wallet-info-ctn'),
        ).toBeInTheDocument();
    });
    it('Loads home screen with no error if wallet is in storage and chronik calls are successful', async () => {
        // Initialize a wallet with balance and history in localforage
        await localforage.setItem('wallet', walletWithXecAndTokens);
        // Do not mock anything in chronik
        const mockedChronik = new MockChronikClient();
        // Mock scriptutxos to match context
        const path1899mocks = cashaddr.decode(
            walletWithXecAndTokens.Path1899.cashAddress,
            true,
        );
        mockedChronik.setScript(path1899mocks.type, path1899mocks.hash);
        mockedChronik.setUtxos(path1899mocks.type, path1899mocks.hash, [
            {
                outputScript: `76a914${path1899mocks.hash}88ac`,
                utxos: walletWithXecAndTokens.state.nonSlpUtxos,
            },
        ]);
        const path145mocks = cashaddr.decode(
            walletWithXecAndTokens.Path145.cashAddress,
            true,
        );
        mockedChronik.setScript(path145mocks.type, path145mocks.hash);
        mockedChronik.setUtxos(path145mocks.type, path145mocks.hash, [
            {
                outputScript: `76a914${path145mocks.hash}88ac`,
                utxos: [],
            },
        ]);
        const path245mocks = cashaddr.decode(
            walletWithXecAndTokens.Path245.cashAddress,
            true,
        );
        mockedChronik.setScript(path245mocks.type, path245mocks.hash);
        mockedChronik.setUtxos(path245mocks.type, path245mocks.hash, [
            {
                outputScript: `76a914${path245mocks.hash}88ac`,
                utxos: [],
            },
        ]);

        render(
            <WalletProvider chronik={mockedChronik}>
                <MemoryRouter initialEntries={['/wallet']}>
                    <ThemeProvider theme={theme}>
                        <App />
                    </ThemeProvider>
                </MemoryRouter>
            </WalletProvider>,
        );
        // API Error is NOT rendered
        await waitFor(() =>
            expect(screen.queryByTestId('api-error')).not.toBeInTheDocument(),
        );
        // Wallet-info is rendered
        expect(
            await screen.findByTestId('wallet-info-ctn'),
        ).toBeInTheDocument();
    });
});

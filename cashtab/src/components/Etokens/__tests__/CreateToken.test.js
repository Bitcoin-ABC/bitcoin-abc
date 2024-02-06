import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import CreateToken from '../CreateToken';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';
import { WalletContext } from 'utils/context';
import {
    walletWithEnoughXecToMakeAToken,
    walletWithoutEnoughXecToMakeAToken,
} from '../fixtures/mocks';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MockChronikClient } from '../../../../../apps/mock-chronik-client';
import { explorer } from 'config/explorer';

// Required shims and mocks for React
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

describe('<CreateToken />', () => {
    it('If wallet has sufficient XEC, renders component and CreateTokenForm', async () => {
        render(
            <Router>
                <WalletContext.Provider value={walletWithEnoughXecToMakeAToken}>
                    <ThemeProvider theme={theme}>
                        <CreateToken />
                    </ThemeProvider>
                </WalletContext.Provider>
            </Router>,
        );

        // Renders the component
        expect(screen.getByTestId('create-token-ctn')).toBeInTheDocument();

        // Renders CreateTokenForm, as this wallet has sufficient balance to create a token
        expect(screen.getByTestId('create-token-form-ctn')).toBeInTheDocument();

        // Does not render insufficient balance alert
        expect(
            screen.queryByTestId('insufficient-balance-for-tokens'),
        ).not.toBeInTheDocument();
    });
    it('If wallet has insufficient XEC, renders component but does not render CreateTokenForm', async () => {
        render(
            <Router>
                <WalletContext.Provider
                    value={walletWithoutEnoughXecToMakeAToken}
                >
                    <ThemeProvider theme={theme}>
                        <CreateToken />
                    </ThemeProvider>
                </WalletContext.Provider>
            </Router>,
        );

        // Renders the component
        expect(screen.getByTestId('create-token-ctn')).toBeInTheDocument();

        // Renders CreateTokenForm, as this wallet has sufficient balance to create a token
        expect(
            screen.queryByTestId('create-token-form-ctn'),
        ).not.toBeInTheDocument();

        // Renders expected alert
        expect(
            screen.getByTestId('insufficient-balance-for-tokens'),
        ).toBeInTheDocument();
    });
    it('Renders the create token notification upon successful broadcast', async () => {
        const mockedChronik = new MockChronikClient();
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006a4730440220720af1735077aab9824268b75c6ee3990f0a81a0d4778850bcad0e35c42963f402201a7b7466b942bed0f15056994d8d880ac78104cf10aadf8e9e5d4850969917684121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000466a04534c500001010747454e4553495303544b450a7465737420746f6b656e1768747470733a2f2f7777772e636173687461622e636f6d4c0001024c0008000000000393870022020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac27800e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'bc9eacaaa64d4706fe6653608245848ae76ffdd31882b75de0d6518c57e9699f';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });
        const mockWalletContextWithChronik = JSON.parse(
            JSON.stringify(walletWithEnoughXecToMakeAToken),
        );
        mockWalletContextWithChronik.chronik = mockedChronik;
        mockWalletContextWithChronik.chaintipBlockheight = 800000;
        render(
            <Router>
                <WalletContext.Provider value={mockWalletContextWithChronik}>
                    <ThemeProvider theme={theme}>
                        <CreateToken />
                    </ThemeProvider>
                </WalletContext.Provider>
            </Router>,
        );

        // The user enters valid token metadata
        const tokenNameEl = screen.getByTestId('token-name-input');
        const tokenTickerEl = screen.getByTestId('token-ticker-input');
        const tokenDecimalsEl = screen.getByTestId('token-decimals-input');
        const tokenSupplyEl = screen.getByTestId('token-supply-input');
        const tokenUrlEl = screen.getByTestId('token-url-input');
        await userEvent.type(tokenNameEl, 'test token');
        await userEvent.type(tokenTickerEl, 'TKE');
        await userEvent.type(tokenDecimalsEl, '2');
        await userEvent.type(tokenSupplyEl, '600000');
        await userEvent.type(tokenUrlEl, 'https://www.cashtab.com');

        // Ensure the notification is NOT rendered prior to creating token
        const initialCreateTokenSuccessNotification = screen.queryByText(
            'Token created! Click to view in block explorer.',
        );
        expect(initialCreateTokenSuccessNotification).not.toBeInTheDocument();

        // Click the Create eToken button
        const createTokenBtn = screen.getByTestId('create-token-btn');
        await userEvent.click(createTokenBtn);

        // Click OK on confirmation modal
        const okCreateTokenBtn = screen.getByText('OK');

        await userEvent.click(okCreateTokenBtn);

        // Verify notification triggered
        // TODO troubleshoot this test, we are seeing this in the app but not the test env

        const createTokenSuccessNotification = await screen.findByText(
            'Token created! Click to view in block explorer.',
        );

        expect(createTokenSuccessNotification).toHaveAttribute(
            'href',
            `${explorer.blockExplorerUrl}/tx/${txid}`,
        );
    });
});

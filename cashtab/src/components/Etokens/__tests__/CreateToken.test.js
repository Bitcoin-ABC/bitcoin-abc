import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import CreateToken from '../CreateToken';
import { BrowserRouter as Router } from 'react-router-dom';
import { WalletContext } from 'utils/context';
import {
    walletWithEnoughXecToMakeAToken,
    walletWithoutEnoughXecToMakeAToken,
} from '../fixtures/mocks';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

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
        expect(screen.queryByTestId('create-token-ctn')).toBeInTheDocument();

        // Renders CreateTokenForm, as this wallet has sufficient balance to create a token
        expect(
            screen.queryByTestId('create-token-form-ctn'),
        ).toBeInTheDocument();

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
        expect(screen.queryByTestId('create-token-ctn')).toBeInTheDocument();

        // Renders CreateTokenForm, as this wallet has sufficient balance to create a token
        expect(
            screen.queryByTestId('create-token-form-ctn'),
        ).not.toBeInTheDocument();

        // Renders expected alert
        expect(
            screen.queryByTestId('insufficient-balance-for-tokens'),
        ).toBeInTheDocument();
    });
});

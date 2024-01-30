import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from 'components/App';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import {
    mockWalletContext,
    newCashtabUserContext,
} from 'components/fixtures/mocks';
import { WalletContext } from 'utils/context';
import { BrowserRouter } from 'react-router-dom';

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
    it('Renders the App screen showing normal wallet info for a created wallet', async () => {
        render(
            <BrowserRouter>
                <WalletContext.Provider value={mockWalletContext}>
                    <ThemeProvider theme={theme}>
                        <App />
                    </ThemeProvider>
                </WalletContext.Provider>
            </BrowserRouter>,
        );

        // Input fields are rendered
        expect(screen.queryByTestId('wallet-info-ctn')).toBeInTheDocument();
    });
    it('Renders the onboarding screen if the user has no wallet', async () => {
        render(
            <BrowserRouter>
                <WalletContext.Provider value={newCashtabUserContext}>
                    <ThemeProvider theme={theme}>
                        <App />
                    </ThemeProvider>
                </WalletContext.Provider>
            </BrowserRouter>,
        );

        // Input fields are rendered
        expect(screen.queryByTestId('wallet-info-ctn')).not.toBeInTheDocument();
    });
});

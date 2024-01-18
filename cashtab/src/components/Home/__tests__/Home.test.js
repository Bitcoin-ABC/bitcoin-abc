import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import Home from '../Home';
import { BrowserRouter as Router } from 'react-router-dom';
import { WalletContext } from 'utils/context';
import {
    walletWithBalancesMockNew,
    loadingTrue,
    contextWithApiError,
    freshWalletMock,
    noWalletCreated,
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

describe('<Home /> if wallet has balance and tx history', () => {
    it('Renders the loading component while loading', async () => {
        render(
            <Router>
                <WalletContext.Provider value={loadingTrue}>
                    <ThemeProvider theme={theme}>
                        <Home />
                    </ThemeProvider>
                </WalletContext.Provider>
            </Router>,
        );

        // WalletInfo component is not rendered
        expect(screen.queryByTestId('wallet-info-ctn')).not.toBeInTheDocument();

        // Loading ctn is rendered
        expect(screen.queryByTestId('loading-ctn')).toBeInTheDocument();
    });
    it('Renders the Home screen with correct balance and no API error', async () => {
        render(
            <Router>
                <WalletContext.Provider value={walletWithBalancesMockNew}>
                    <ThemeProvider theme={theme}>
                        <Home />
                    </ThemeProvider>
                </WalletContext.Provider>
            </Router>,
        );

        // WalletInfo component is rendered
        expect(screen.getByTestId('wallet-info-ctn')).toBeInTheDocument();
        // Balance is rendered
        const balanceSpan = screen.getByTestId('balance-header-rendered');
        expect(balanceSpan).toBeInTheDocument();
        // Balance matches wallet
        expect(balanceSpan).toHaveTextContent(`9,513.12 XEC`);
        // API Error is not rendered if no API error
        expect(screen.queryByTestId('api-error')).not.toBeInTheDocument();

        // Tx history is rendered
        expect(screen.getByTestId('tx-history-ctn')).toBeInTheDocument();
    });
    it('Renders the Home screen with correct balance and API error', async () => {
        render(
            <Router>
                <WalletContext.Provider value={contextWithApiError}>
                    <ThemeProvider theme={theme}>
                        <Home />
                    </ThemeProvider>
                </WalletContext.Provider>
            </Router>,
        );

        // WalletInfo component is rendered
        expect(screen.getByTestId('wallet-info-ctn')).toBeInTheDocument();
        // Balance is rendered
        const balanceSpan = screen.getByTestId('balance-header-rendered');
        expect(balanceSpan).toBeInTheDocument();
        // Balance matches wallet
        expect(balanceSpan).toHaveTextContent(`9,513.12 XEC`);
        // API Error is rendered
        expect(screen.queryByTestId('api-error')).toBeInTheDocument();
    });
    it('Renders correctly for a zero balance new wallet', async () => {
        render(
            <Router>
                <WalletContext.Provider value={freshWalletMock}>
                    <ThemeProvider theme={theme}>
                        <Home />
                    </ThemeProvider>
                </WalletContext.Provider>
            </Router>,
        );

        // WalletInfo component is rendered
        expect(screen.getByTestId('wallet-info-ctn')).toBeInTheDocument();
        // Balance is rendered
        const balanceSpan = screen.getByTestId('balance-header-rendered');
        expect(balanceSpan).toBeInTheDocument();
        // Balance matches wallet
        expect(balanceSpan).toHaveTextContent(`0 XEC`);
        // API Error is not rendered if no API error
        expect(screen.queryByTestId('api-error')).not.toBeInTheDocument();
    });
    it('Renders the onboarding screen for a new wallet', async () => {
        render(
            <Router>
                <WalletContext.Provider value={noWalletCreated}>
                    <ThemeProvider theme={theme}>
                        <Home />
                    </ThemeProvider>
                </WalletContext.Provider>
            </Router>,
        );
        // onboarding component is rendered
        expect(screen.getByTestId('onboarding')).toBeInTheDocument();
    });
});

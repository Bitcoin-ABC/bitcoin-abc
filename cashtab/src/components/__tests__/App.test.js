import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import App from 'components/App';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import {
    mockWalletContext,
    newCashtabUserContext,
} from 'components/fixtures/mocks';
import { WalletContext } from 'utils/context';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

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
    it('Renders 404 on a bad route', async () => {
        render(
            <MemoryRouter initialEntries={['/not-a-route']}>
                <WalletContext.Provider value={mockWalletContext}>
                    <ThemeProvider theme={theme}>
                        <App />
                    </ThemeProvider>
                </WalletContext.Provider>
            </MemoryRouter>,
        );

        // We get the 404
        expect(screen.getByTestId('not-found')).toBeInTheDocument();
    });
    it('Navigation menu routes to expected components', async () => {
        render(
            <BrowserRouter>
                <WalletContext.Provider value={mockWalletContext}>
                    <ThemeProvider theme={theme}>
                        <App />
                    </ThemeProvider>
                </WalletContext.Provider>
            </BrowserRouter>,
        );
        const user = userEvent.setup();

        // Default route is home
        expect(screen.getByTestId('home-ctn')).toBeInTheDocument();

        // Navigate to Send screen
        await user.click(screen.queryByTestId('nav-btn-send'));

        // Now we see the Send screen
        expect(screen.getByTestId('send-xec-ctn')).toBeInTheDocument();

        // Navigate to eTokens screen
        await user.click(screen.queryByTestId('nav-btn-etokens'));

        // Now we see the eTokens screen
        expect(screen.getByTestId('etokens-ctn')).toBeInTheDocument();

        // Navigate to Receive screen
        await user.click(screen.queryByTestId('nav-btn-receive'));

        // Now we see the Receive screen
        expect(screen.getByTestId('receive-ctn')).toBeInTheDocument();

        // We do not expect to see hamburger menu items before the menu is clicked
        // This is handled by dynamic css changes, so test that
        expect(screen.queryByTestId('hamburger-menu')).toHaveStyle(
            `max-height: 0`,
        );

        // Click the hamburger menu
        await user.click(screen.queryByTestId('hamburger'));

        // Now we see these items
        expect(screen.queryByTestId('hamburger-menu')).toHaveStyle(
            `max-height: 100rem`,
        );

        // Navigate to Airdrop screen
        await user.click(screen.queryByTestId('nav-btn-airdrop'));

        // Now we see the Airdrop screen
        expect(screen.getByTestId('airdrop-ctn')).toBeInTheDocument();

        // The hamburger menu closes on nav
        expect(screen.queryByTestId('hamburger-menu')).toHaveStyle(
            `max-height: 0`,
        );

        // ... but, we can still click these items with the testing library, so we do
        // Navigate to Swap screen
        await user.click(screen.queryByTestId('nav-btn-swap'));

        // Now we see the Swap screen
        expect(screen.getByTestId('swap-ctn')).toBeInTheDocument();

        // Navigate to SignVerifyMsg screen
        await user.click(screen.queryByTestId('nav-btn-signverifymsg'));

        // Now we see the SignVerifyMsg screen
        expect(screen.getByTestId('signverifymsg-ctn')).toBeInTheDocument();

        // Navigate to Settings screen
        await user.click(screen.queryByTestId('nav-btn-configure'));

        // Now we see the Settings screen
        expect(screen.getByTestId('configure-ctn')).toBeInTheDocument();
    });
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
        expect(screen.getByTestId('wallet-info-ctn')).toBeInTheDocument();
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

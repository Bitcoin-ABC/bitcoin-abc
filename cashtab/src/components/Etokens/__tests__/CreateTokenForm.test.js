import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import CreateTokenForm from '../CreateTokenForm';
import { BrowserRouter as Router } from 'react-router-dom';
import { WalletContext } from 'utils/context';
import { walletWithEnoughXecToMakeAToken } from '../fixtures/mocks';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

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

describe('<CreateTokenForm />', () => {
    it('Renders the component', async () => {
        render(
            <Router>
                <WalletContext.Provider value={walletWithEnoughXecToMakeAToken}>
                    <ThemeProvider theme={theme}>
                        <CreateTokenForm />
                    </ThemeProvider>
                </WalletContext.Provider>
            </Router>,
        );

        // Renders the component
        expect(screen.getByTestId('create-token-form-ctn')).toBeInTheDocument();
    });
});

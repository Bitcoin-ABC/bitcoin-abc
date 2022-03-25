import React from 'react';
import renderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import Receive from 'components/Receive/Receive';
import {
    walletWithBalancesAndTokens,
    walletWithBalancesMock,
    walletWithoutBalancesMock,
    walletWithBalancesAndTokensWithCorrectState,
} from '../../Home/__mocks__/walletAndBalancesMock';
import { BrowserRouter as Router } from 'react-router-dom';
import { WalletContext } from 'utils/context';

beforeEach(() => {
    // Mock method not implemented in JSDOM
    // See reference at https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
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
});

test('Wallet without BCH balance', () => {
    const component = renderer.create(
        <WalletContext.Provider value={walletWithoutBalancesMock}>
            <ThemeProvider theme={theme}>
                <Router>
                    <Receive />
                </Router>
            </ThemeProvider>
        </WalletContext.Provider>,
    );
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});

test('Wallet with BCH balances', () => {
    const component = renderer.create(
        <WalletContext.Provider value={walletWithBalancesMock}>
            <ThemeProvider theme={theme}>
                <Router>
                    <Receive />
                </Router>
            </ThemeProvider>
        </WalletContext.Provider>,
    );
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});

test('Wallet with BCH balances and tokens', () => {
    const component = renderer.create(
        <WalletContext.Provider value={walletWithBalancesAndTokens}>
            <ThemeProvider theme={theme}>
                <Router>
                    <Receive />
                </Router>
            </ThemeProvider>
        </WalletContext.Provider>,
    );
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});

test('Wallet with BCH balances and tokens and state field', () => {
    const component = renderer.create(
        <WalletContext.Provider
            value={walletWithBalancesAndTokensWithCorrectState}
        >
            <ThemeProvider theme={theme}>
                <Router>
                    <Receive />
                </Router>
            </ThemeProvider>
        </WalletContext.Provider>,
    );
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});

test('Without wallet defined', () => {
    const withoutWalletDefinedMock = {
        wallet: {},
        balances: { totalBalance: 0 },
        loading: false,
    };
    const component = renderer.create(
        <WalletContext.Provider value={withoutWalletDefinedMock}>
            <ThemeProvider theme={theme}>
                <Router>
                    <Receive />
                </Router>
            </ThemeProvider>
        </WalletContext.Provider>,
    );
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});

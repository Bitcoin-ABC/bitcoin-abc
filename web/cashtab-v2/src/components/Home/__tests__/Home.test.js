import React from 'react';
import renderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import Home from '../Home';
import {
    walletWithBalancesAndTokens,
    walletWithBalancesMock,
    walletWithoutBalancesMock,
    walletWithBalancesAndTokensWithCorrectState,
} from '../__mocks__/walletAndBalancesMock';
import { BrowserRouter as Router } from 'react-router-dom';
import { WalletContext } from 'utils/context';

test('Wallet without BCH balance', () => {
    const component = renderer.create(
        <WalletContext.Provider value={walletWithoutBalancesMock}>
            <ThemeProvider theme={theme}>
                <Router>
                    <Home />
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
                    <Home />
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
                    <Home />
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
                    <Home />
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
    };
    const component = renderer.create(
        <WalletContext.Provider value={withoutWalletDefinedMock}>
            <ThemeProvider theme={theme}>
                <Router>
                    <Home />
                </Router>
            </ThemeProvider>
        </WalletContext.Provider>,
    );
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});

import React from 'react';
import renderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components';
import { theme } from '@assets/styles/theme';
import Tokens from '@components/Tokens/Tokens';
import BCHJS from '@psf/bch-js';
import {
    walletWithBalancesAndTokens,
    walletWithBalancesMock,
    walletWithoutBalancesMock,
    walletWithBalancesAndTokensWithCorrectState,
} from '../../Wallet/__mocks__/walletAndBalancesMock';
import { BrowserRouter as Router } from 'react-router-dom';

let realUseContext;
let useContextMock;

beforeEach(() => {
    realUseContext = React.useContext;
    useContextMock = React.useContext = jest.fn();

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

afterEach(() => {
    React.useContext = realUseContext;
});

test('Wallet without BCH balance', () => {
    useContextMock.mockReturnValue(walletWithoutBalancesMock);
    const testBCH = new BCHJS();
    const component = renderer.create(
        <ThemeProvider theme={theme}>
            <Router>
                <Tokens jestBCH={testBCH} />
            </Router>
        </ThemeProvider>,
    );
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});

test('Wallet with BCH balances', () => {
    useContextMock.mockReturnValue(walletWithBalancesMock);
    const testBCH = new BCHJS();
    const component = renderer.create(
        <ThemeProvider theme={theme}>
            <Router>
                <Tokens jestBCH={testBCH} />
            </Router>
        </ThemeProvider>,
    );
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});

test('Wallet with BCH balances and tokens', () => {
    useContextMock.mockReturnValue(walletWithBalancesAndTokens);
    const testBCH = new BCHJS();
    const component = renderer.create(
        <ThemeProvider theme={theme}>
            <Router>
                <Tokens jestBCH={testBCH} />
            </Router>
        </ThemeProvider>,
    );
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});

test('Wallet with BCH balances and tokens and state field', () => {
    useContextMock.mockReturnValue(walletWithBalancesAndTokensWithCorrectState);
    const testBCH = new BCHJS();
    const component = renderer.create(
        <ThemeProvider theme={theme}>
            <Router>
                <Tokens jestBCH={testBCH} />
            </Router>
        </ThemeProvider>,
    );
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});

test('Without wallet defined', () => {
    useContextMock.mockReturnValue({
        wallet: {},
        balances: { totalBalance: 0 },
        loading: false,
    });
    const testBCH = new BCHJS();
    const component = renderer.create(
        <ThemeProvider theme={theme}>
            <Router>
                <Tokens jestBCH={testBCH} />
            </Router>
        </ThemeProvider>,
    );
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});

import React from 'react';
import renderer from 'react-test-renderer';
import { renderHook, act } from '@testing-library/react-hooks';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import SendToken from 'components/Send/SendToken';
import {
    walletWithBalancesAndTokens,
    walletWithBalancesAndTokensWithCorrectState,
} from '../../Home/__mocks__/walletAndBalancesMock';
import { WalletContext } from 'utils/context';
import { BrowserRouter as Router } from 'react-router-dom';

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

test('Wallet with BCH balances and tokens', () => {
    const component = renderer.create(
        <WalletContext.Provider value={walletWithBalancesAndTokens}>
            <ThemeProvider theme={theme}>
                <Router>
                    <SendToken
                        tokenId={
                            'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba'
                        }
                    />
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
                    <SendToken
                        tokenId={
                            'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba'
                        }
                    />
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
                    <SendToken
                        tokenId={
                            'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba'
                        }
                    />
                </Router>
            </ThemeProvider>
        </WalletContext.Provider>,
    );
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});

test('Verify the SendToken component successfully initializes', async () => {
    const { result } = renderHook(() => (
        // Wallet context mock needed here as the `SendToken(tokenId)` call won't instantiate without a wallet object present
        <WalletContext.Provider value={walletWithBalancesAndTokens}>
            SendToken(`bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba`)
        </WalletContext.Provider>
    ));

    // Extract component state at the point of initialization
    let initializedSendToken;
    await act(async () => {
        initializedSendToken = await result.current;
    });

    // Ensure component state is not null
    expect(initializedSendToken).not.toBeNull();

    // Ensure successful initialization of SendToken component props
    const expectedSendTokenProps = [
        'wallet',
        'balances',
        'tokens',
        'loading',
        'cashtabCache',
    ];
    const validSendTokenProps = expectedSendTokenProps.every(prop =>
        Object.prototype.hasOwnProperty.call(
            initializedSendToken.props.value,
            prop,
        ),
    );
    expect(validSendTokenProps).toBe(true);
});

test('Verify the SendToken component throws error on missing Wallet object', () => {
    const { result } = renderHook(() =>
        // No wallet context mock provided
        SendToken(
            `bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba`,
        ),
    );
    // React/Jest dynamically generates the `((cov_1erx5eord5(...).s[16]++)`
    // portion of the expected error message:
    // `Cannot destructure property 'wallet' of ((cov_1erx5eord5(...).s[16]++) _react.default.useContext(...)) as it is undefined.`
    // at the time of test execution, hence this error test case only checks that
    // the error message string contains `Cannot destructure property 'wallet'`
    expect(result.error.message).toEqual(
        expect.stringContaining(`Cannot destructure property 'wallet' of`),
    );
});

test('Verify the SendToken component throws error on missing token ID', async () => {
    const { result } = renderHook(() =>
        // No token id provided as input
        SendToken(),
    );
    expect(result.error.message).toBe(
        `Cannot destructure property 'tokenId' of 'undefined' as it is undefined.`,
    );
});

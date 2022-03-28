import React from 'react';
import renderer from 'react-test-renderer';
import Configure from '../Configure';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { WalletContext } from 'utils/context';

test('Configure without a wallet', () => {
    const component = renderer.create(
        <WalletContext.Provider value={{ wallet: undefined }}>
            <ThemeProvider theme={theme}>
                <Configure />
            </ThemeProvider>
        </WalletContext.Provider>,
    );
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});

test('Configure with a wallet', () => {
    const component = renderer.create(
        <WalletContext.Provider
            value={{ wallet: { mnemonic: 'test mnemonic' } }}
        >
            <ThemeProvider theme={theme}>
                <Configure />
            </ThemeProvider>
        </WalletContext.Provider>,
    );
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});

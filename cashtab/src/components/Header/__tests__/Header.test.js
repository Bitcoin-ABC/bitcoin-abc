// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import Header from 'components/Header';
import CashtabSettings from 'config/CashtabSettings';

const mockWallets = [
    {
        name: 'MyWallet',
        paths: new Map([[1899, { address: 'ecash:qtestaddress' }]]),
    },
];

describe('<Header />', () => {
    it('renders correctly with default props and visible balance', () => {
        render(
            <ThemeProvider theme={theme}>
                <Header
                    wallets={mockWallets}
                    updateCashtabState={() => {}}
                    setCashtabState={() => {}}
                    setLoading={() => {}}
                    loading={false}
                    fiatPrice={0.00003}
                    firmaPrice={1}
                    balanceSats={1_000_000_000}
                    balanceXecx={0}
                    balanceFirma={0}
                    path="/home"
                    settings={new CashtabSettings()}
                />
            </ThemeProvider>,
        );

        expect(screen.getByTitle('Price in Local Currency')).toHaveTextContent(
            '1 XEC = 0.00003000 USD',
        );

        expect(screen.getByTitle('Balance XEC')).toHaveTextContent(
            '10,000,000.00 XEC',
        );

        expect(screen.getByTitle('Balance XEC Fiat')).toHaveTextContent(
            '$300.00 USD',
        );
    });

    it('shows wallet dropdown and allows wallet switching', () => {
        const setCashtabState = jest.fn();
        const setLoading = jest.fn();

        render(
            <ThemeProvider theme={theme}>
                <Header
                    wallets={[
                        ...mockWallets,
                        {
                            name: 'BackupWallet',
                            paths: new Map([[1899, { address: 'ecash:q2' }]]),
                        },
                    ]}
                    updateCashtabState={() => {}}
                    setCashtabState={setCashtabState}
                    setLoading={setLoading}
                    loading={false}
                    fiatPrice={0.00003}
                    firmaPrice={1}
                    balanceSats={1_000_000_000}
                    balanceXecx={0}
                    balanceFirma={0}
                    path="/"
                    settings={new CashtabSettings()}
                />
            </ThemeProvider>,
        );

        const select = screen.getByTestId('wallet-select');
        expect(select).toBeInTheDocument();
        expect(select).toHaveValue('MyWallet');

        fireEvent.change(select, { target: { value: 'BackupWallet' } });
        expect(setLoading).toHaveBeenCalledWith(true);
        expect(setCashtabState).toHaveBeenCalled();
    });

    it('hides balances if balanceVisible is false', () => {
        const hiddenSettings = new CashtabSettings();
        hiddenSettings.balanceVisible = false;

        render(
            <ThemeProvider theme={theme}>
                <Header
                    wallets={mockWallets}
                    updateCashtabState={() => {}}
                    setCashtabState={() => {}}
                    setLoading={() => {}}
                    loading={false}
                    fiatPrice={0.00003}
                    firmaPrice={1}
                    balanceSats={1_000_000_000}
                    balanceXecx={1_000_000}
                    balanceFirma={100}
                    path="/"
                    settings={hiddenSettings}
                />
            </ThemeProvider>,
        );

        expect(screen.getByTitle('Balance XEC')).toHaveStyle(
            'text-shadow: 0 0 15px #FFFFFF',
        );
        expect(screen.getByTitle('Balance XECX')).toHaveStyle(
            'text-shadow: 0 0 15px #FFFFFF',
        );
        expect(screen.getByTitle('Balance FIRMA')).toHaveStyle(
            'text-shadow: 0 0 15px #FFFFFF',
        );
    });

    it('formats numbers based on userLocale', () => {
        const frSettings = new CashtabSettings();
        frSettings.fiatCurrency = 'eur';

        render(
            <ThemeProvider theme={theme}>
                <Header
                    wallets={mockWallets}
                    updateCashtabState={() => {}}
                    setCashtabState={() => {}}
                    setLoading={() => {}}
                    loading={false}
                    fiatPrice={0.00003}
                    firmaPrice={1}
                    balanceSats={1_000_000_000}
                    balanceXecx={0}
                    balanceFirma={0}
                    path="/"
                    settings={frSettings}
                    userLocale="fr-FR"
                />
            </ThemeProvider>,
        );

        expect(screen.getByTitle('Balance XEC')).toHaveTextContent(
            '10 000 000,00 XEC',
        );
        expect(screen.getByTitle('Balance XEC Fiat')).toHaveTextContent(
            '€300,00 EUR',
        );
    });

    it('does not render fiat values if fiatPrice is null', () => {
        render(
            <ThemeProvider theme={theme}>
                <Header
                    wallets={mockWallets}
                    updateCashtabState={() => {}}
                    setCashtabState={() => {}}
                    setLoading={() => {}}
                    loading={false}
                    fiatPrice={null}
                    firmaPrice={null}
                    balanceSats={1_000_000_000}
                    balanceXecx={0}
                    balanceFirma={0}
                    path="/"
                    settings={new CashtabSettings()}
                />
            </ThemeProvider>,
        );

        expect(screen.queryByTitle('Balance XEC Fiat')).not.toBeInTheDocument();
        expect(
            screen.queryByTitle('Balance XECX Fiat'),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByTitle('Balance FIRMA Fiat'),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByTitle('Price in Local Currency'),
        ).not.toBeInTheDocument();
    });
    it('renders fiat price for a non-USD currency', () => {
        const nonUsdSettings = new CashtabSettings();
        nonUsdSettings.fiatCurrency = 'gbp';

        render(
            <ThemeProvider theme={theme}>
                <Header
                    wallets={mockWallets}
                    updateCashtabState={() => {}}
                    setCashtabState={() => {}}
                    setLoading={() => {}}
                    loading={false}
                    fiatPrice={0.00003}
                    firmaPrice={0}
                    balanceSats={1_000_000_000}
                    balanceXecx={0}
                    balanceFirma={0}
                    path="/"
                    settings={nonUsdSettings}
                />
            </ThemeProvider>,
        );

        const balanceXec = screen.getByTitle('Balance XEC');
        expect(balanceXec).toHaveTextContent('10,000,000.00 XEC');
        expect(balanceXec).toHaveStyle('text-shadow: none');

        const fiatDisplay = screen.getByTitle('Balance XEC Fiat');
        expect(fiatDisplay).toHaveTextContent('£300.00 GBP');
        expect(fiatDisplay).toHaveStyle('text-shadow: none');
    });

    it('includes forex-adjusted FIRMA fiat price for a non-USD currency', () => {
        const nonUsdSettings = new CashtabSettings();
        nonUsdSettings.fiatCurrency = 'gbp';

        render(
            <ThemeProvider theme={theme}>
                <Header
                    wallets={mockWallets}
                    updateCashtabState={() => {}}
                    setCashtabState={() => {}}
                    setLoading={() => {}}
                    loading={false}
                    fiatPrice={0.00003}
                    firmaPrice={0.5}
                    balanceSats={1_000_000_000}
                    balanceXecx={0}
                    balanceFirma={100}
                    path="/"
                    settings={nonUsdSettings}
                />
            </ThemeProvider>,
        );

        const balanceXec = screen.getByTitle('Balance XEC');
        expect(balanceXec).toHaveTextContent('10,000,000.00 XEC');

        const firmaFiat = screen.getByTitle('Balance FIRMA Fiat');
        expect(firmaFiat).toHaveTextContent('£50.00 GBP');

        const xecFiat = screen.getByTitle('Balance XEC Fiat');
        expect(xecFiat).toHaveTextContent('£300.00 GBP');
    });

    it('does not render fiat price if fiatPrice is null', () => {
        render(
            <ThemeProvider theme={theme}>
                <Header
                    wallets={mockWallets}
                    updateCashtabState={() => {}}
                    setCashtabState={() => {}}
                    setLoading={() => {}}
                    loading={false}
                    fiatPrice={null}
                    firmaPrice={null}
                    balanceSats={1_000_000_000}
                    balanceXecx={0}
                    balanceFirma={0}
                    path="/"
                    settings={new CashtabSettings()}
                />
            </ThemeProvider>,
        );

        const balanceXec = screen.getByTitle('Balance XEC');
        expect(balanceXec).toHaveTextContent('10,000,000.00 XEC');
        expect(balanceXec).toHaveStyle('text-shadow: none');

        expect(screen.queryByTitle('Balance XEC Fiat')).not.toBeInTheDocument();
        expect(
            screen.queryByTitle('Balance XECX Fiat'),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByTitle('Balance FIRMA Fiat'),
        ).not.toBeInTheDocument();
    });
});

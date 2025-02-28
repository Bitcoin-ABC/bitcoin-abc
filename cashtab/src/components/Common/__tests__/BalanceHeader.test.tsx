// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import '@testing-library/jest-dom';
import BalanceHeader from 'components/Common/BalanceHeader';
import CashtabSettings from 'config/CashtabSettings';
// TODO you need to wrap the test component with ThemeProvider

describe('<BalanceHeader />', () => {
    it('Renders the BalanceHeader component correctly with default locale en-US', async () => {
        render(
            <BalanceHeader
                balanceSats={1000000000}
                balanceXecx={0}
                balanceFirma={0}
                settings={new CashtabSettings()}
                fiatPrice={0.00003}
                firmaPrice={1}
            />,
        );

        // Loader is not rendered
        expect(screen.queryByTitle('Loading')).not.toBeInTheDocument();

        // XEC balance is calculated correctly
        const BalanceXec = screen.getByTitle('Balance XEC');
        expect(BalanceXec).toHaveTextContent(`10,000,000.00 XEC`);

        // We do not display the BalanceXecx row if the XECX balance is 0
        expect(screen.queryByTitle('Balance XECX')).not.toBeInTheDocument();

        // XEC balance is not hidden
        expect(BalanceXec).toHaveStyle(`text-shadow: none`);

        // Fiat balance is calculated correctly
        const BalanceFiat = screen.getByTitle('Balance in Local Currency');
        expect(BalanceFiat).toHaveTextContent(`$300.00 USD`);

        // Fiat balance is not hidden
        expect(BalanceFiat).toHaveStyle(`text-shadow: none`);

        // eCash price is rendered
        expect(screen.getByTitle('Price in Local Currency')).toHaveTextContent(
            `1 XEC = 0.00003000 USD`,
        );
    });
    it('We render XECX balance if it is non-zero, and include it in the fiat total', async () => {
        render(
            <BalanceHeader
                balanceSats={1000000000}
                // Note that balanceXecx is not in satoshis, as tokens in wallet are not stored
                // in token satoshis
                balanceXecx={10000000}
                settings={new CashtabSettings()}
                fiatPrice={0.00003}
                balanceFirma={0}
                firmaPrice={1}
            />,
        );

        // Loader is not rendered
        expect(screen.queryByTitle('Loading')).not.toBeInTheDocument();

        // XEC balance is calculated correctly
        const BalanceXec = screen.getByTitle('Balance XEC');
        expect(BalanceXec).toHaveTextContent(`10,000,000.00 XEC`);

        // XECX balance is calculated correctly
        const BalanceXecx = screen.getByTitle('Balance XECX');
        expect(BalanceXecx).toHaveTextContent(`10,000,000.00 XECX`);

        // XEC balance is not hidden
        expect(BalanceXec).toHaveStyle(`text-shadow: none`);
        // XECX balance is not hidden
        expect(BalanceXecx).toHaveStyle(`text-shadow: none`);

        // Fiat balance is calculated correctly and includes XECX
        const BalanceFiat = screen.getByTitle('Balance in Local Currency');
        // See that $300 was fiat amount of previous test with 0 XECX balance
        expect(BalanceFiat).toHaveTextContent(`$${2 * 300}.00 USD`);

        // Fiat balance is not hidden
        expect(BalanceFiat).toHaveStyle(`text-shadow: none`);

        // eCash price is rendered
        expect(screen.getByTitle('Price in Local Currency')).toHaveTextContent(
            `1 XEC = 0.00003000 USD`,
        );
    });
    it('We render FIRMA balance if it is non-zero, and include it in the fiat total', async () => {
        render(
            <BalanceHeader
                balanceSats={1000000000}
                balanceXecx={0}
                settings={new CashtabSettings()}
                fiatPrice={0.00003}
                balanceFirma={123.45}
                firmaPrice={1}
            />,
        );

        // Loader is not rendered
        expect(screen.queryByTitle('Loading')).not.toBeInTheDocument();

        // XEC balance is calculated correctly
        const BalanceXec = screen.getByTitle('Balance XEC');
        expect(BalanceXec).toHaveTextContent(`10,000,000.00 XEC`);

        // XECX balance is calculated correctly
        const BalanceFirma = screen.getByTitle('Balance FIRMA');
        expect(BalanceFirma).toHaveTextContent(`123.4500 FIRMA`);

        // XEC balance is not hidden
        expect(BalanceXec).toHaveStyle(`text-shadow: none`);
        // FIRMA balance is not hidden
        expect(BalanceFirma).toHaveStyle(`text-shadow: none`);

        // Fiat balance is calculated correctly and includes FIRMA
        const BalanceFiat = screen.getByTitle('Balance in Local Currency');

        // See that $300 was fiat amount of previous test with 0 XECX balance
        expect(BalanceFiat).toHaveTextContent(`$${300 + 123.45} USD`);

        // Fiat balance is not hidden
        expect(BalanceFiat).toHaveStyle(`text-shadow: none`);

        // eCash price is rendered
        expect(screen.getByTitle('Price in Local Currency')).toHaveTextContent(
            `1 XEC = 0.00003000 USD`,
        );
    });
    it('Renders the BalanceHeader component correctly with fr-FR locale', async () => {
        const frenchSettings = new CashtabSettings();
        frenchSettings.fiatCurrency = 'eur';
        render(
            <BalanceHeader
                balanceSats={1000000000}
                balanceXecx={0}
                settings={frenchSettings}
                fiatPrice={0.00003}
                userLocale={'fr-FR'}
                balanceFirma={0}
                firmaPrice={1}
            />,
        );

        // Loader is not rendered
        expect(screen.queryByTitle('Loading')).not.toBeInTheDocument();

        // XEC balance is displayed
        const BalanceXec = screen.getByTitle('Balance XEC');
        expect(BalanceXec).toHaveTextContent(`10 000 000,00 XEC`);

        // XEC balance is not hidden
        expect(BalanceXec).toHaveStyle(`text-shadow: none`);

        // Fiat balance is calculated correctly
        const BalanceFiat = screen.getByTitle('Balance in Local Currency');
        expect(BalanceFiat).toHaveTextContent(`€300,00 EUR`);

        // Fiat balance is not hidden
        expect(BalanceFiat).toHaveStyle(`text-shadow: none`);

        // eCash price is rendered
        expect(screen.getByTitle('Price in Local Currency')).toHaveTextContent(
            `1 XEC = 0,00003000 EUR`,
        );
    });
    it('XEC and XECX and FIRMA fiat balances are hidden if cashtabSettings.balanceVisible is false', async () => {
        const hiddenSettings = new CashtabSettings();
        hiddenSettings.balanceVisible = false;
        render(
            <ThemeProvider theme={theme}>
                <BalanceHeader
                    balanceSats={1000000000}
                    balanceXecx={10000000}
                    balanceFirma={123.45}
                    settings={hiddenSettings}
                    fiatPrice={0.00003}
                    firmaPrice={1}
                />
            </ThemeProvider>,
        );

        // Loader is not rendered
        expect(screen.queryByTitle('Loading')).not.toBeInTheDocument();

        // XEC balance is calculated correctly
        const BalanceXec = screen.getByTitle('Balance XEC');
        expect(BalanceXec).toHaveTextContent(`10,000,000.00 XEC`);

        // XEC balance is hidden
        expect(BalanceXec).toHaveStyle(`text-shadow: 0 0 15px #fff`);

        // XECX balance is calculated correctly
        const BalanceXecx = screen.getByTitle('Balance XECX');
        expect(BalanceXecx).toHaveTextContent(`10,000,000.00 XECX`);

        // XECX balance is hidden
        // Note we actually expect a value from props.theme
        expect(BalanceXecx).toHaveStyle(`text-shadow: 0 0 15px #00ABE7`);

        // Firma balance is calculated correctly
        const BalanceFirma = screen.getByTitle('Balance FIRMA');
        expect(BalanceFirma).toHaveTextContent(`123.4500 FIRMA`);

        // FIRMA balance is hidden
        // Note we actually expect a value from props.theme
        expect(BalanceFirma).toHaveStyle(`text-shadow: 0 0 15px #00ABE7`);

        // Fiat balance is calculated correctly (includes XECX and FIRMA)
        const BalanceFiat = screen.getByTitle('Balance in Local Currency');
        expect(BalanceFiat).toHaveTextContent(`$723.45 USD`);

        // Fiat balance is not hidden
        expect(BalanceFiat).toHaveStyle(`text-shadow: 0 0 15px #fff`);

        // eCash price is rendered
        expect(screen.getByTitle('Price in Local Currency')).toHaveTextContent(
            `1 XEC = 0.00003000 USD`,
        );
    });
    it('Renders fiat price for a non-USD currency', async () => {
        const nonUsdSettings = new CashtabSettings();
        nonUsdSettings.fiatCurrency = 'gbp';
        render(
            <BalanceHeader
                balanceSats={1000000000}
                balanceXecx={0}
                balanceFirma={0}
                firmaPrice={0}
                settings={nonUsdSettings}
                fiatPrice={0.00003}
            />,
        );

        // Loader is not rendered
        expect(screen.queryByTitle('Loading')).not.toBeInTheDocument();

        // XEC balance is calculated correctly
        const BalanceXec = screen.getByTitle('Balance XEC');
        expect(BalanceXec).toHaveTextContent(`10,000,000.00 XEC`);

        // XEC balance is not hidden
        expect(BalanceXec).toHaveStyle(`text-shadow: none`);

        // Fiat balance is calculated correctly
        const BalanceFiat = screen.getByTitle('Balance in Local Currency');
        expect(BalanceFiat).toHaveTextContent(`£300.00 GBP`);

        // Fiat balance is not hidden
        expect(BalanceFiat).toHaveStyle(`text-shadow: none`);

        // eCash price is rendered
        expect(screen.getByTitle('Price in Local Currency')).toHaveTextContent(
            `1 XEC = 0.00003000 GBP`,
        );
    });
    it('Includes forex-adjusted FIRMA fiat price for a non-USD currency', async () => {
        const nonUsdSettings = new CashtabSettings();
        nonUsdSettings.fiatCurrency = 'gbp';
        render(
            <BalanceHeader
                balanceSats={1000000000}
                balanceXecx={0}
                balanceFirma={100}
                firmaPrice={0.5}
                settings={nonUsdSettings}
                fiatPrice={0.00003}
            />,
        );

        // Loader is not rendered
        expect(screen.queryByTitle('Loading')).not.toBeInTheDocument();

        // XEC balance is calculated correctly
        const BalanceXec = screen.getByTitle('Balance XEC');
        expect(BalanceXec).toHaveTextContent(`10,000,000.00 XEC`);

        // XEC balance is not hidden
        expect(BalanceXec).toHaveStyle(`text-shadow: none`);

        // Fiat balance is calculated correctly
        const BalanceFiat = screen.getByTitle('Balance in Local Currency');
        expect(BalanceFiat).toHaveTextContent(`£350.00 GBP`); // £300 in XEC and £50 in FIRMA

        // Fiat balance is not hidden
        expect(BalanceFiat).toHaveStyle(`text-shadow: none`);

        // eCash price is rendered
        expect(screen.getByTitle('Price in Local Currency')).toHaveTextContent(
            `1 XEC = 0.00003000 GBP`,
        );
    });
    it('Fiat price and forex are not displayed if fiatPrice is unavailable', async () => {
        render(
            <BalanceHeader
                balanceSats={1000000000}
                balanceXecx={0}
                balanceFirma={0}
                firmaPrice={0}
                settings={new CashtabSettings()}
                fiatPrice={null}
            />,
        );

        // Loader is not rendered
        expect(screen.queryByTitle('Loading')).not.toBeInTheDocument();

        // XEC balance is calculated correctly
        const BalanceXec = screen.getByTitle('Balance XEC');
        expect(BalanceXec).toHaveTextContent(`10,000,000.00 XEC`);

        // XEC balance is not hidden
        expect(BalanceXec).toHaveStyle(`text-shadow: none`);

        // Fiat balance is not rendered
        expect(
            screen.queryByTitle('Balance in Local Currency'),
        ).not.toBeInTheDocument();

        // eCash price is not rendered
        expect(
            screen.queryByTitle('Price in Local Currency'),
        ).not.toBeInTheDocument();
    });
});

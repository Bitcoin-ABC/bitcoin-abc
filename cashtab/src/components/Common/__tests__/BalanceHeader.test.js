import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BalanceHeader from 'components/Common/BalanceHeader';
import { cashtabSettings } from 'config/cashtabSettings';

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

describe('<BalanceHeader />', () => {
    it('Renders the loader if balanceSats is not an integer', async () => {
        render(
            <BalanceHeader
                balanceSats={1000000000.23}
                cashtabSettings={cashtabSettings}
                fiatPrice={0.00003}
            />,
        );

        // Loader is rendered
        const CashLoader = screen.queryByTestId('cash-loader');
        expect(CashLoader).toBeInTheDocument();

        // XEC balance is not rendered
        const BalanceXec = screen.queryByTestId('balance-xec');
        expect(BalanceXec).not.toBeInTheDocument();
    });
    it('Renders the BalanceHeader component correctly with default locale en-US', async () => {
        render(
            <BalanceHeader
                balanceSats={1000000000}
                cashtabSettings={cashtabSettings}
                fiatPrice={0.00003}
            />,
        );

        // Loader is not rendered
        const CashLoader = screen.queryByTestId('cash-loader');
        expect(CashLoader).not.toBeInTheDocument();

        // XEC balance is displayed
        const BalanceXec = screen.queryByTestId('balance-xec');
        expect(BalanceXec).toBeInTheDocument();
        expect(BalanceXec).toHaveTextContent(`10,000,000.00 XEC`);

        // XEC balance is not hidden
        expect(BalanceXec).toHaveStyle(`text-shadow: none`);

        // Fiat balance is displayed
        const BalanceFiat = screen.queryByTestId('balance-fiat');
        expect(BalanceFiat).toBeInTheDocument();
        expect(BalanceFiat).toHaveTextContent(`$300.00 USD`);

        // Fiat balance is not hidden
        expect(BalanceFiat).toHaveStyle(`text-shadow: none`);

        // eCash price is rendered
        const EcashPrice = screen.queryByTestId('ecash-price');
        expect(EcashPrice).toBeInTheDocument();
        expect(EcashPrice).toHaveTextContent(`1 XEC = 0.00003000 USD`);
    });
    it('Renders the BalanceHeader component correctly with fr-FR locale', async () => {
        const frenchSettings = JSON.parse(JSON.stringify(cashtabSettings));
        frenchSettings.fiatCurrency = 'eur';
        render(
            <BalanceHeader
                balanceSats={1000000000}
                cashtabSettings={frenchSettings}
                fiatPrice={0.00003}
                userLocale={'fr-FR'}
            />,
        );

        // Loader is not rendered
        const CashLoader = screen.queryByTestId('cash-loader');
        expect(CashLoader).not.toBeInTheDocument();

        // XEC balance is displayed
        const BalanceXec = screen.queryByTestId('balance-xec');
        expect(BalanceXec).toBeInTheDocument();
        expect(BalanceXec).toHaveTextContent(`10 000 000,00 XEC`);

        // XEC balance is not hidden
        expect(BalanceXec).toHaveStyle(`text-shadow: none`);

        // Fiat balance is displayed
        const BalanceFiat = screen.queryByTestId('balance-fiat');
        expect(BalanceFiat).toBeInTheDocument();
        expect(BalanceFiat).toHaveTextContent(`€300,00 EUR`);

        // Fiat balance is not hidden
        expect(BalanceFiat).toHaveStyle(`text-shadow: none`);

        // eCash price is rendered
        const EcashPrice = screen.queryByTestId('ecash-price');
        expect(EcashPrice).toBeInTheDocument();
        expect(EcashPrice).toHaveTextContent(`1 XEC = 0,00003000 EUR`);
    });
    it('Balance is hidden if cashtabSettings.balanceVisible is false', async () => {
        const hiddenSettings = JSON.parse(JSON.stringify(cashtabSettings));
        hiddenSettings.balanceVisible = false;
        render(
            <BalanceHeader
                balanceSats={1000000000}
                cashtabSettings={hiddenSettings}
                fiatPrice={0.00003}
            />,
        );

        // Loader is not rendered
        const CashLoader = screen.queryByTestId('cash-loader');
        expect(CashLoader).not.toBeInTheDocument();

        // XEC balance is displayed
        const BalanceXec = screen.queryByTestId('balance-xec');
        expect(BalanceXec).toBeInTheDocument();
        expect(BalanceXec).toHaveTextContent(`10,000,000.00 XEC`);

        // XEC balance is hidden
        expect(BalanceXec).toHaveStyle(`text-shadow: 0 0 15px #fff`);

        // Fiat balance is displayed
        const BalanceFiat = screen.queryByTestId('balance-fiat');
        expect(BalanceFiat).toBeInTheDocument();
        expect(BalanceFiat).toHaveTextContent(`$300.00 USD`);

        // Fiat balance is not hidden
        expect(BalanceFiat).toHaveStyle(`text-shadow: 0 0 15px #fff`);

        // eCash price is rendered
        const EcashPrice = screen.queryByTestId('ecash-price');
        expect(EcashPrice).toBeInTheDocument();
        expect(EcashPrice).toHaveTextContent(`1 XEC = 0.00003000 USD`);
    });
    it('Renders fiat price for a non-USD currency', async () => {
        const nonUsdSettings = JSON.parse(JSON.stringify(cashtabSettings));
        nonUsdSettings.fiatCurrency = 'gbp';
        render(
            <BalanceHeader
                balanceSats={1000000000}
                cashtabSettings={nonUsdSettings}
                fiatPrice={0.00003}
            />,
        );

        // Loader is not rendered
        const CashLoader = screen.queryByTestId('cash-loader');
        expect(CashLoader).not.toBeInTheDocument();

        // XEC balance is displayed
        const BalanceXec = screen.queryByTestId('balance-xec');
        expect(BalanceXec).toBeInTheDocument();
        expect(BalanceXec).toHaveTextContent(`10,000,000.00 XEC`);

        // XEC balance is not hidden
        expect(BalanceXec).toHaveStyle(`text-shadow: none`);

        // Fiat balance is displayed
        const BalanceFiat = screen.queryByTestId('balance-fiat');
        expect(BalanceFiat).toBeInTheDocument();
        expect(BalanceFiat).toHaveTextContent(`£300.00 GBP`);

        // Fiat balance is not hidden
        expect(BalanceFiat).toHaveStyle(`text-shadow: none`);

        // eCash price is rendered
        const EcashPrice = screen.queryByTestId('ecash-price');
        expect(EcashPrice).toBeInTheDocument();
        expect(EcashPrice).toHaveTextContent(`1 XEC = 0.00003000 GBP`);
    });
    it('Fiat price and forex are not displayed if fiatPrice is unavailable', async () => {
        render(
            <BalanceHeader
                balanceSats={1000000000}
                cashtabSettings={cashtabSettings}
                fiatPrice={null}
            />,
        );

        // Loader is not rendered
        const CashLoader = screen.queryByTestId('cash-loader');
        expect(CashLoader).not.toBeInTheDocument();

        // XEC balance is displayed
        const BalanceXec = screen.queryByTestId('balance-xec');
        expect(BalanceXec).toBeInTheDocument();
        expect(BalanceXec).toHaveTextContent(`10,000,000.00 XEC`);

        // XEC balance is not hidden
        expect(BalanceXec).toHaveStyle(`text-shadow: none`);

        // Fiat balance is not rendered
        const BalanceFiat = screen.queryByTestId('balance-fiat');
        expect(BalanceFiat).not.toBeInTheDocument();

        // eCash price is not rendered
        const EcashPrice = screen.queryByTestId('ecash-price');
        expect(EcashPrice).not.toBeInTheDocument();
    });
});

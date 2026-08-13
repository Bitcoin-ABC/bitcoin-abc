// Copyright (c) 2024-2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { MemoryRouter } from 'react-router';
import { WalletProvider } from 'wallet/context';
import App from 'components/App/App';
import CashtabSettings from 'config/CashtabSettings';
import { ActiveCashtabWallet } from 'wallet';
import { prepareContext, mockPrice, mockFirmaForex } from 'test';
import { when } from 'jest-when';
import {
    walletWithXecAndTokensActive,
    bearTokenAndTx,
    validActiveWallets,
} from 'components/App/fixtures/mocks';
import { tokenMockXecx } from 'components/Agora/fixtures/mocks';
import appConfig from 'config/app';
import { FIRMA } from 'constants/tokens';
import {
    MockChronikClient,
    MockAgora,
} from '../../../../../modules/mock-chronik-client';
import { Ecc } from 'ecash-lib';
import localforage from 'localforage';
import 'fake-indexeddb/auto';

const mockWallets: ActiveCashtabWallet[] = [
    {
        ...walletWithXecAndTokensActive,
        name: 'MyWallet',
        state: {
            ...walletWithXecAndTokensActive.state,
            balanceSats: 1_000_000_000,
        },
    },
];

interface HeaderTestWrapperProps {
    chronik: MockChronikClient;
    agora: MockAgora;
    ecc: Ecc;
    route?: string;
}

const HeaderTestWrapper: React.FC<HeaderTestWrapperProps> = ({
    chronik,
    agora,
    ecc,
    route = '/home',
}) => (
    <WalletProvider chronik={chronik as any} agora={agora as any} ecc={ecc}>
        <MemoryRouter initialEntries={[route]}>
            <ThemeProvider theme={theme}>
                <App />
            </ThemeProvider>
        </MemoryRouter>
    </WalletProvider>
);

describe('<Header />', () => {
    let mockChronik: MockChronikClient;
    let mockAgora: MockAgora;
    let mockEcc: Ecc;

    beforeEach(async () => {
        mockAgora = new MockAgora();
        mockEcc = {} as Ecc;

        // Create token mocks for the wallet
        const tokenMocks = new Map();
        tokenMocks.set(
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            {
                tx: bearTokenAndTx.tx,
                tokenInfo: bearTokenAndTx.token,
            },
        );

        // Set up context with default settings and get the mock chronik
        mockChronik = await prepareContext(
            localforage,
            mockWallets,
            tokenMocks,
        );

        // Mock the fetch call for Cashtab's price API
        global.fetch = jest.fn();
        mockPrice(0.00003);
    });

    afterEach(async () => {
        jest.clearAllMocks();
        await localforage.clear();
    });

    it('renders correctly with default props and visible balance', async () => {
        render(
            <HeaderTestWrapper
                chronik={mockChronik}
                agora={mockAgora}
                ecc={mockEcc}
                route="/home"
            />,
        );

        await waitFor(() => {
            expect(
                screen.getByTitle('Price in Local Currency'),
            ).toHaveTextContent('1 XEC = 0.00003000 USD');
        });

        expect(screen.getByTitle('Balance XEC')).toHaveTextContent('9,513.12');
        expect(screen.getByText('eCash')).toBeInTheDocument();
        expect(
            screen.getByText('XEC', { selector: 'span' }),
        ).toBeInTheDocument();

        // No XECX held — 0% staked; "staked" links to XECX
        expect(screen.getByTitle('Staked')).toHaveTextContent('0% staked');
        expect(screen.getByRole('link', { name: 'staked' })).toHaveAttribute(
            'href',
            `/token/${appConfig.vipTokens.xecx.tokenId}`,
        );
        expect(
            document.querySelector(`a[href="/token/${FIRMA.tokenId}"]`),
        ).toBeInTheDocument();

        expect(screen.getByTitle('Balance XEC Fiat')).toHaveTextContent(
            '$0.29 USD',
        );
        // Firma is USD-pegged — no redundant fiat line when currency is USD
        expect(screen.queryByTitle('Balance USD Fiat')).not.toBeInTheDocument();

        // Same average APY as FIRMA_APY_API_URL
        await waitFor(() => {
            expect(screen.getByTitle('Firma APY')).toHaveTextContent(
                '6.29% APY',
            );
        });

        // Web/extension: hover tooltip anywhere on the eCash card
        const ecashCard = screen.getByRole('button', {
            name: 'Toggle XEC and XECX balances',
        });
        expect(ecashCard).toHaveAttribute('data-tooltip-id', 'cashtab-tooltip');
        expect(ecashCard.getAttribute('data-tooltip-html')).toContain(
            '9,513.12',
        );
        expect(ecashCard.getAttribute('data-tooltip-html')).toContain('XECX');

        // Tap eCash card → replace total with stacked XEC / XECX; hide %
        // staked; fiat stays; hover tooltip goes away while expanded
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Toggle XEC and XECX balances',
            }),
        );
        expect(screen.getByTitle('Liquid and staked')).toHaveTextContent(
            /9,513\.12\s*XEC\s*0\.00\s*XECX/,
        );
        expect(screen.queryByTitle('Balance XEC')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Staked')).not.toBeInTheDocument();
        expect(screen.getByTitle('Balance XEC Fiat')).toHaveTextContent(
            '$0.29 USD',
        );
        expect(
            document.querySelector(`a[href="/token/${FIRMA.tokenId}"]`),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', {
                name: 'Toggle XEC and XECX balances',
            }),
        ).not.toHaveAttribute('data-tooltip-id');

        // Tap again → restore combined total + % staked + fiat
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Toggle XEC and XECX balances',
            }),
        );
        expect(screen.getByTitle('Balance XEC')).toHaveTextContent('9,513.12');
        expect(screen.getByTitle('Staked')).toHaveTextContent('0% staked');
        expect(screen.getByTitle('Balance XEC Fiat')).toHaveTextContent(
            '$0.29 USD',
        );
    });

    it('shows XEC + XECX total with staked percent', async () => {
        // Same liquid XEC as the default fixture (9,513.12) plus an equal
        // amount of XECX so total is 19,026.24 XEC.
        const walletWithXecx: ActiveCashtabWallet = {
            ...walletWithXecAndTokensActive,
            name: 'MyWallet',
            state: {
                ...walletWithXecAndTokensActive.state,
                slpUtxos: [
                    ...walletWithXecAndTokensActive.state.slpUtxos,
                    {
                        outpoint: {
                            txid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                            outIdx: 1,
                        },
                        blockHeight: -1,
                        isCoinbase: false,
                        sats: 546n,
                        isFinal: true,
                        token: {
                            tokenId: appConfig.vipTokens.xecx.tokenId,
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_STANDARD',
                                number: 0,
                            },
                            atoms: 951312n,
                            isMintBaton: false,
                        },
                    },
                ],
                tokens: new Map([
                    ...walletWithXecAndTokensActive.state.tokens,
                    [appConfig.vipTokens.xecx.tokenId, '9513.12'],
                ]),
            },
        };

        const tokenMocks = new Map();
        tokenMocks.set(
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            {
                tx: bearTokenAndTx.tx,
                tokenInfo: bearTokenAndTx.token,
            },
        );
        tokenMocks.set(tokenMockXecx.tokenId, {
            tx: tokenMockXecx.tx,
            tokenInfo: tokenMockXecx.tokenInfo,
        });

        const testMockChronik = await prepareContext(
            localforage,
            [walletWithXecx],
            tokenMocks,
        );

        render(
            <HeaderTestWrapper
                chronik={testMockChronik}
                agora={mockAgora}
                ecc={mockEcc}
                route="/home"
            />,
        );

        await waitFor(() => {
            expect(screen.getByTitle('Balance XEC')).toHaveTextContent(
                '19,026.24',
            );
        });

        expect(screen.getByTitle('Staked')).toHaveTextContent('50% staked');
        expect(screen.getByRole('link', { name: 'staked' })).toHaveAttribute(
            'href',
            `/token/${appConfig.vipTokens.xecx.tokenId}`,
        );

        await waitFor(() => {
            expect(screen.getByTitle('Balance XEC Fiat')).toHaveTextContent(
                '$0.57 USD',
            );
        });
    });

    it('taps eCash card to expand liquid XEC / XECX breakdown', async () => {
        // Equal liquid XEC and XECX so stacked lines are easy to assert.
        const walletWithXecx: ActiveCashtabWallet = {
            ...walletWithXecAndTokensActive,
            name: 'MyWallet',
            state: {
                ...walletWithXecAndTokensActive.state,
                slpUtxos: [
                    ...walletWithXecAndTokensActive.state.slpUtxos,
                    {
                        outpoint: {
                            txid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                            outIdx: 1,
                        },
                        blockHeight: -1,
                        isCoinbase: false,
                        sats: 546n,
                        isFinal: true,
                        token: {
                            tokenId: appConfig.vipTokens.xecx.tokenId,
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_STANDARD',
                                number: 0,
                            },
                            atoms: 951312n,
                            isMintBaton: false,
                        },
                    },
                ],
                tokens: new Map([
                    ...walletWithXecAndTokensActive.state.tokens,
                    [appConfig.vipTokens.xecx.tokenId, '9513.12'],
                ]),
            },
        };

        const tokenMocks = new Map();
        tokenMocks.set(
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            {
                tx: bearTokenAndTx.tx,
                tokenInfo: bearTokenAndTx.token,
            },
        );
        tokenMocks.set(tokenMockXecx.tokenId, {
            tx: tokenMockXecx.tx,
            tokenInfo: tokenMockXecx.tokenInfo,
        });

        const testMockChronik = await prepareContext(
            localforage,
            [walletWithXecx],
            tokenMocks,
        );

        render(
            <HeaderTestWrapper
                chronik={testMockChronik}
                agora={mockAgora}
                ecc={mockEcc}
                route="/home"
            />,
        );

        await waitFor(() => {
            expect(screen.getByTitle('Balance XEC')).toHaveTextContent(
                '19,026.24',
            );
        });

        const ecashCard = screen.getByRole('button', {
            name: 'Toggle XEC and XECX balances',
        });

        // Click / Enter / Space on "staked" must not toggle the breakdown
        const stakedLink = screen.getByRole('link', { name: 'staked' });
        fireEvent.click(stakedLink);
        expect(screen.getByTitle('Balance XEC')).toHaveTextContent('19,026.24');
        expect(
            screen.queryByTitle('Liquid and staked'),
        ).not.toBeInTheDocument();
        fireEvent.keyDown(stakedLink, { key: 'Enter' });
        fireEvent.keyDown(stakedLink, { key: ' ' });
        expect(screen.getByTitle('Balance XEC')).toHaveTextContent('19,026.24');
        expect(
            screen.queryByTitle('Liquid and staked'),
        ).not.toBeInTheDocument();

        // Tap card → stacked liquid XEC / XECX; hide % staked; fiat stays
        fireEvent.click(ecashCard);
        expect(screen.getByTitle('Liquid and staked')).toHaveTextContent(
            /9,513\.12\s*XEC\s*9,513\.12\s*XECX/,
        );
        expect(screen.queryByTitle('Balance XEC')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Staked')).not.toBeInTheDocument();
        expect(screen.getByTitle('Balance XEC Fiat')).toHaveTextContent(
            '$0.57 USD',
        );
        expect(
            document.querySelector(`a[href="/token/${FIRMA.tokenId}"]`),
        ).toBeInTheDocument();
        expect(ecashCard).not.toHaveAttribute('data-tooltip-id');

        // Tap again → restore combined total + % staked + fiat
        fireEvent.click(ecashCard);
        expect(screen.getByTitle('Balance XEC')).toHaveTextContent('19,026.24');
        expect(screen.getByTitle('Staked')).toHaveTextContent('50% staked');
        expect(screen.getByTitle('Balance XEC Fiat')).toHaveTextContent(
            '$0.57 USD',
        );
        expect(
            screen.queryByTitle('Liquid and staked'),
        ).not.toBeInTheDocument();
    });

    it('shows wallet dropdown and allows wallet switching', async () => {
        const multipleWallets = [...mockWallets, ...validActiveWallets];

        // Create token mocks for the wallet
        const tokenMocks = new Map();
        tokenMocks.set(
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            {
                tx: bearTokenAndTx.tx,
                tokenInfo: bearTokenAndTx.token,
            },
        );

        // Get mockChronik with UTXOs set up for all wallets including validActiveWallets
        const testMockChronik = await prepareContext(
            localforage,
            multipleWallets,
            tokenMocks,
        );

        render(
            <HeaderTestWrapper
                chronik={testMockChronik}
                agora={mockAgora}
                ecc={mockEcc}
                route="/"
            />,
        );

        await waitFor(() => {
            expect(screen.getByTestId('wallet-select')).toBeInTheDocument();
        });

        const select = screen.getByTestId('wallet-select');
        expect(select).toBeInTheDocument();
        // The value is the address of the wallet, though the display name is still the name
        expect(select).toHaveValue(
            'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
        );

        fireEvent.change(select, {
            target: { value: validActiveWallets[1].address },
        });

        const updatedSelect = await screen.findByTestId('wallet-select');
        expect(updatedSelect).toHaveValue(validActiveWallets[1].address);
    });

    it('hides balances if balanceVisible is false', async () => {
        const hiddenSettings = new CashtabSettings();
        hiddenSettings.balanceVisible = false;

        // Create token mocks for the wallet
        const tokenMocks = new Map();
        tokenMocks.set(
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            {
                tx: bearTokenAndTx.tx,
                tokenInfo: bearTokenAndTx.token,
            },
        );

        await prepareContext(localforage, mockWallets, tokenMocks);
        await localforage.setItem('settings', hiddenSettings);

        render(
            <HeaderTestWrapper
                chronik={mockChronik}
                agora={mockAgora}
                ecc={mockEcc}
                route="/"
            />,
        );

        await waitFor(() => {
            expect(screen.getByTitle('Balance XEC')).toBeInTheDocument();
        });

        expect(screen.getByTitle('Balance XEC')).toHaveStyle(
            'text-shadow: 0 0 15px #FFFFFF',
        );
        expect(screen.getByTitle('Staked')).toHaveStyle(
            'text-shadow: 0 0 15px rgba(255,255,255,0.5)',
        );
        expect(screen.getByTitle('Balance USD')).toHaveStyle(
            'text-shadow: 0 0 15px #FFFFFF',
        );
    });

    it('does not render fiat values if fiatPrice is null', async () => {
        // Create token mocks for the wallet
        const tokenMocks = new Map();
        tokenMocks.set(
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            {
                tx: bearTokenAndTx.tx,
                tokenInfo: bearTokenAndTx.token,
            },
        );

        await prepareContext(localforage, mockWallets, tokenMocks);
        // Don't set fiat price, so it will be null

        render(
            <HeaderTestWrapper
                chronik={mockChronik}
                agora={mockAgora}
                ecc={mockEcc}
                route="/"
            />,
        );

        await waitFor(() => {
            expect(screen.getByTitle('Balance XEC')).toBeInTheDocument();
        });

        expect(screen.queryByTitle('Balance XEC Fiat')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Balance USD Fiat')).not.toBeInTheDocument();
        expect(
            screen.queryByTitle('Price in Local Currency'),
        ).not.toBeInTheDocument();
        expect(screen.getByTitle('Staked')).toHaveTextContent('0% staked');
    });

    it('renders fiat price for a non-USD currency', async () => {
        const nonUsdSettings = new CashtabSettings();
        nonUsdSettings.fiatCurrency = 'gbp';

        // Create token mocks for the wallet
        const tokenMocks = new Map();
        tokenMocks.set(
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            {
                tx: bearTokenAndTx.tx,
                tokenInfo: bearTokenAndTx.token,
            },
        );

        await prepareContext(localforage, mockWallets, tokenMocks);
        await localforage.setItem('settings', nonUsdSettings);

        // Mock the GBP API call
        const cryptoId = 'ecash';
        const priceApiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=gbp&include_last_updated_at=true`;

        when(fetch)
            .calledWith(priceApiUrl)
            .mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        ecash: {
                            gbp: 0.00024,
                            last_updated_at: 1706644626,
                        },
                    }),
            } as Response);

        render(
            <HeaderTestWrapper
                chronik={mockChronik}
                agora={mockAgora}
                ecc={mockEcc}
                route="/"
            />,
        );

        await waitFor(() => {
            expect(screen.getByTitle('Balance XEC')).toBeInTheDocument();
        });

        const balanceXec = screen.getByTitle('Balance XEC');
        expect(balanceXec).toHaveTextContent('9,513.12');
        expect(balanceXec).toHaveStyle('text-shadow: none');

        // Wait for fiat price to load and check for GBP symbol
        await waitFor(() => {
            expect(screen.getAllByText(/£/).length).toBeGreaterThan(0);
        });
    });

    it('includes forex-adjusted FIRMA fiat price for a non-USD currency', async () => {
        // Regression: simple/price?ids=usd is a junk crypto token (~0.11 INR),
        // not USD forex — FIRMA header showed ₹1.75 for ~$16 instead of ~₹1,575.
        const nonUsdSettings = new CashtabSettings();
        nonUsdSettings.fiatCurrency = 'inr';

        const firmaBalanceDecimal = '16.0290';
        const inrPerUsd = 98.27;
        const walletWithFirma: ActiveCashtabWallet = {
            ...walletWithXecAndTokensActive,
            name: 'MyWallet',
            state: {
                ...walletWithXecAndTokensActive.state,
                slpUtxos: [
                    ...walletWithXecAndTokensActive.state.slpUtxos,
                    {
                        outpoint: {
                            txid: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
                            outIdx: 1,
                        },
                        blockHeight: -1,
                        isCoinbase: false,
                        sats: 546n,
                        isFinal: true,
                        token: {
                            tokenId: FIRMA.tokenId,
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_STANDARD',
                                number: 0,
                            },
                            atoms: 160290n,
                            isMintBaton: false,
                        },
                    },
                ],
                tokens: new Map([
                    ...walletWithXecAndTokensActive.state.tokens,
                    [FIRMA.tokenId, firmaBalanceDecimal],
                ]),
            },
        };

        const tokenMocks = new Map();
        tokenMocks.set(
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            {
                tx: bearTokenAndTx.tx,
                tokenInfo: bearTokenAndTx.token,
            },
        );
        tokenMocks.set(FIRMA.tokenId, {
            tx: FIRMA.tx,
            tokenInfo: FIRMA.token,
        });

        const testMockChronik = await prepareContext(
            localforage,
            [walletWithFirma],
            tokenMocks,
        );
        await localforage.setItem('settings', nonUsdSettings);

        const cryptoId = 'ecash';
        const xecPriceApiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=inr&include_last_updated_at=true`;

        when(fetch)
            .calledWith(xecPriceApiUrl)
            .mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        ecash: {
                            inr: 0.0025,
                            last_updated_at: 1706644626,
                        },
                    }),
            } as Response);

        const forexRates = mockFirmaForex({ inr: inrPerUsd });
        // Fixture is BTC-indexed like CoinGecko — raw INR value != INR/USD
        expect(forexRates.inr.value).not.toBe(inrPerUsd);
        expect(forexRates.inr.value / forexRates.usd.value).toBe(inrPerUsd);

        render(
            <HeaderTestWrapper
                chronik={testMockChronik}
                agora={mockAgora}
                ecc={mockEcc}
                route="/"
            />,
        );

        await waitFor(() => {
            expect(screen.getByTitle('Balance USD')).toBeInTheDocument();
        });

        // 16.0290 FIRMA * ₹98.27/USD = ₹1,575.17 (not the junk-token ~₹1.75)
        await waitFor(() => {
            expect(screen.getByTitle('Balance USD Fiat')).toHaveTextContent(
                '₹1,575.17 INR',
            );
        });
    });

    it('does not render fiat price if fiatPrice is null', async () => {
        // Create token mocks for the wallet
        const tokenMocks = new Map();
        tokenMocks.set(
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            {
                tx: bearTokenAndTx.tx,
                tokenInfo: bearTokenAndTx.token,
            },
        );

        await prepareContext(localforage, mockWallets, tokenMocks);
        // Don't set fiat price, so it will be null

        render(
            <HeaderTestWrapper
                chronik={mockChronik}
                agora={mockAgora}
                ecc={mockEcc}
                route="/"
            />,
        );

        await waitFor(() => {
            expect(screen.getByTitle('Balance XEC')).toBeInTheDocument();
        });

        const balanceXec = screen.getByTitle('Balance XEC');
        expect(balanceXec).toHaveTextContent('9,513.12');
        expect(balanceXec).toHaveStyle('text-shadow: none');

        expect(screen.queryByTitle('Balance XEC Fiat')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Balance USD Fiat')).not.toBeInTheDocument();
        expect(screen.getByTitle('Staked')).toHaveTextContent('0% staked');
    });
});

// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import {
    walletWithXecAndTokensActive,
    cachetTokenAndTx,
    bearTokenAndTx,
    requiredUtxoThisToken,
} from 'components/App/fixtures/mocks';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
import { prepareContext, mockPrice } from 'test';
import { ThemeProvider } from 'styled-components';
import { FEE_SATS_PER_KB_CASHTAB_LEGACY } from 'constants/transactions';
import { theme } from 'assets/styles/theme';
import { MemoryRouter } from 'react-router';
import { WalletProvider } from 'wallet/context';
import { ChronikClient } from 'chronik-client';
import { Ecc } from 'ecash-lib';
import { Agora } from 'ecash-agora';
import {
    MockAgora,
    MockChronikClient,
} from '../../../../../modules/mock-chronik-client';
import App from 'components/App/App';
import { explorer } from 'config/explorer';
import { undecimalizeTokenAmount, ActiveCashtabWallet } from 'wallet';

interface ConfigureTestWrapperProps {
    chronik: MockChronikClient;
    agora: MockAgora;
    ecc: Ecc;
    theme: any;
    route?: string;
}

const ConfigureTestWrapper: React.FC<ConfigureTestWrapperProps> = ({
    chronik,
    agora,
    ecc,
    theme,
    route = '/configure',
}) => (
    <WalletProvider
        chronik={chronik as unknown as ChronikClient}
        agora={agora as unknown as Agora}
        ecc={ecc}
    >
        <MemoryRouter initialEntries={[route]}>
            <ThemeProvider theme={theme}>
                <App />
            </ThemeProvider>
        </MemoryRouter>
    </WalletProvider>
);

describe('<Configure />', () => {
    const ecc = new Ecc();
    let user: ReturnType<typeof userEvent.setup>;
    let mockAgora: MockAgora;

    beforeEach(() => {
        mockAgora = new MockAgora();
        // Set up userEvent
        user = userEvent.setup();
        // Mock the fetch call for Cashtab's price API
        global.fetch = jest.fn();
        mockPrice(0.00003);

        // Mock another price URL for a user that changes fiat currency
        const altFiat = 'gbp';
        const cryptoId = appConfig.coingeckoId;
        const altFiatPriceApiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${altFiat}&include_last_updated_at=true`;
        const xecPriceAltFiat = 0.00002;
        const altFiatPriceResponse = {
            ecash: {
                [altFiat]: xecPriceAltFiat,
                last_updated_at: 1706644626,
            },
        };
        when(fetch)
            .calledWith(altFiatPriceApiUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(altFiatPriceResponse),
            } as Response);

        // Mock firma price API call
        const firmaPriceGbp = 0.5;
        const firmaPriceResponse = {
            usd: {
                gbp: firmaPriceGbp,
            },
        };
        when(fetch)
            .calledWith(
                `https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=${altFiat}`,
            )
            .mockResolvedValue({
                json: () => Promise.resolve(firmaPriceResponse),
            } as Response);
    });

    afterEach(async () => {
        jest.clearAllMocks();
        await localforage.clear();
    });

    it('Setting "Send Confirmations" settings will show send confirmations', async () => {
        const tokenMocks = new Map();
        // Add BEAR token mock
        tokenMocks.set(bearTokenAndTx.token.tokenId, {
            tx: bearTokenAndTx.tx,
            tokenInfo: bearTokenAndTx.token,
        });

        const mockedChronik = await prepareContext(
            localforage,
            [walletWithXecAndTokensActive],
            tokenMocks,
        );

        // Mock settings to use higher fee rate (2010) to match the hardcoded transaction hex
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY, // Use legacy fee rate for this test
        });

        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a210200000064416a14b2f97b4b24a409799b68a6da2d34ada9fa0f305eeffe11d9234cd8ee17dcb033de65840107dd52c35207fb2d2a88eadac270e582a8bc7cd66df4437800234121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff027c150000000000001976a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88acdb6c0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '5f334f32bec07b1029ae579460c704e33ba05b91e3bc2bba9ee215bc585cd6ab';
        mockedChronik.setBroadcastTx(hex, txid);

        render(
            <ConfigureTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
                theme={theme}
            />,
        );

        // Default route is home
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Click the hamburger menu
        await user.click(screen.queryByTitle('Show Other Screens')!);

        // Navigate to Settings screen
        await user.click(
            screen.getByRole('button', {
                name: /Settings/i,
            }),
        );

        // Now we see the Settings screen
        expect(screen.getByTitle('Settings')).toBeInTheDocument();

        // Send confirmations are disabled by default

        // Enable send confirmations
        await user.click(screen.getByTitle('Toggle Send Confirmations'));

        // Navigate to the Send screen
        await user.click(
            screen.getByRole('button', {
                name: /Send Screen/i,
            }),
        );

        // Now we see the Send screen
        expect(screen.getByTitle('Toggle Multisend')).toBeInTheDocument();

        // Fill out to and amount
        await user.type(
            screen.getByPlaceholderText('Address'),
            'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
        );
        await user.type(screen.getByPlaceholderText('Amount'), '55');
        // click send
        await user.click(screen.getByRole('button', { name: 'Send' }));
        // we see a modal
        expect(
            await screen.findByText(
                `Send 55 XEC to ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y`,
            ),
        ).toBeInTheDocument();

        // We can click ok to send the tx
        await user.click(screen.getByText('OK'));

        // Notification is rendered with expected txid?;
        const txSuccessNotification = await screen.findByText('eCash sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });

    it('"ABSOLUTE MINIMUM fees" setting is unavailable if wallet holds 0.01 less than required balance of Cachet', async () => {
        const CACHET_DECIMALS = 2;
        // Modify walletWithXecAndTokensActive to have the required token for this feature
        const walletWithVipToken = {
            ...walletWithXecAndTokensActive,
            state: {
                ...walletWithXecAndTokensActive.state,
                slpUtxos: [
                    ...walletWithXecAndTokensActive.state.slpUtxos,
                    {
                        ...requiredUtxoThisToken,
                        token: {
                            ...requiredUtxoThisToken.token,
                            tokenId: appConfig.vipTokens.cachet.tokenId,
                            tokenType: {
                                protocol: 'SLP' as const,
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE' as const,
                                number: 1,
                            },
                            atoms: BigInt(
                                undecimalizeTokenAmount(
                                    '999.99',
                                    CACHET_DECIMALS,
                                ),
                            ),
                        },
                    },
                ],
            },
        } as ActiveCashtabWallet;

        const tokenMocks = new Map();
        // Add BEAR token mock
        tokenMocks.set(bearTokenAndTx.token.tokenId, {
            tx: bearTokenAndTx.tx,
            tokenInfo: bearTokenAndTx.token,
        });
        tokenMocks.set(appConfig.vipTokens.cachet.tokenId, {
            tx: cachetTokenAndTx.tx,
            tokenInfo: cachetTokenAndTx.token,
        });

        const mockedChronik = await prepareContext(
            localforage,
            [walletWithVipToken],
            tokenMocks,
        );

        render(
            <ConfigureTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
                theme={theme}
            />,
        );

        // Default route is home
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Click the hamburger menu
        await user.click(screen.queryByTitle('Show Other Screens')!);

        await user.click(
            screen.getByRole('button', {
                name: /Settings/i,
            }),
        );

        // Now we see the Settings screen
        expect(screen.getByTitle('Settings')).toBeInTheDocument();

        // We DO NOT see VIP settings
        expect(screen.queryByText('VIP Settings')).not.toBeInTheDocument();

        // We DO NOT see the CACHET token icon
        expect(
            screen.queryByAltText(
                `icon for ${appConfig.vipTokens.cachet.tokenId}`,
            ),
        ).not.toBeInTheDocument();
    });

    it('VIP users see VIP status message', async () => {
        const CACHET_DECIMALS = 2;
        // Modify walletWithXecAndTokensActive to have the required token for this feature
        const walletWithVipToken = {
            ...walletWithXecAndTokensActive,
            state: {
                ...walletWithXecAndTokensActive.state,
                slpUtxos: [
                    ...walletWithXecAndTokensActive.state.slpUtxos,
                    {
                        ...requiredUtxoThisToken,
                        token: {
                            ...requiredUtxoThisToken.token,
                            tokenId: appConfig.vipTokens.cachet.tokenId,
                            tokenType: {
                                protocol: 'SLP' as const,
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE' as const,
                                number: 1,
                            },
                            atoms: BigInt(
                                undecimalizeTokenAmount(
                                    appConfig.vipTokens.cachet.vipBalance,
                                    CACHET_DECIMALS,
                                ),
                            ),
                        },
                    },
                ],
            },
        } as ActiveCashtabWallet;

        const tokenMocks = new Map();
        // Add BEAR token mock
        tokenMocks.set(bearTokenAndTx.token.tokenId, {
            tx: bearTokenAndTx.tx,
            tokenInfo: bearTokenAndTx.token,
        });
        tokenMocks.set(appConfig.vipTokens.cachet.tokenId, {
            tx: cachetTokenAndTx.tx,
            tokenInfo: cachetTokenAndTx.token,
        });

        const mockedChronik = await prepareContext(
            localforage,
            [walletWithVipToken],
            tokenMocks,
        );

        render(
            <ConfigureTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
                theme={theme}
            />,
        );

        // Default route is home
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Click the hamburger menu
        await user.click(screen.queryByTitle('Show Other Screens')!);

        await user.click(
            screen.getByRole('button', {
                name: /Settings/i,
            }),
        );

        // Now we see the Settings screen
        expect(screen.getByTitle('Settings')).toBeInTheDocument();

        // We see VIP status
        expect(screen.getByText('Cashtab VIP 🏆')).toBeInTheDocument();
        // We see the CACHET token icon
        expect(
            screen.getByAltText(
                `icon for ${appConfig.vipTokens.cachet.tokenId}`,
            ),
        ).toBeInTheDocument();
    });

    it('We can choose a new fiat currency', async () => {
        const tokenMocks = new Map();
        // Add BEAR token mock
        tokenMocks.set(bearTokenAndTx.token.tokenId, {
            tx: bearTokenAndTx.tx,
            tokenInfo: bearTokenAndTx.token,
        });

        const mockedChronik = await prepareContext(
            localforage,
            [walletWithXecAndTokensActive],
            tokenMocks,
        );

        render(
            <ConfigureTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
                theme={theme}
                route="/configure"
            />,
        );

        // Wait for wallet to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Choose GBP
        await user.selectOptions(
            screen.getByTestId('configure-fiat-select'),
            screen.getByTestId('gbp'),
        );

        // We expect balance header to be updated
        expect(screen.getByTitle('Price in Local Currency')).toHaveTextContent(
            `1 XEC = 0.00002000 GBP`,
        );

        // We expect localforage to be updated
        expect(
            ((await localforage.getItem('settings')) as any).fiatCurrency,
        ).toEqual('gbp');
    });
});

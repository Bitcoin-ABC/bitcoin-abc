// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import {
    walletWithXecAndTokens,
    vipTokenChronikTokenMocks,
    cachetTokenAndTx,
    requiredUtxoThisToken,
} from 'components/App/fixtures/mocks';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import { explorer } from 'config/explorer';
import { undecimalizeTokenAmount } from 'wallet';
import { Ecc } from 'ecash-lib';
import { MockAgora } from '../../../../../modules/mock-chronik-client/dist';

describe('<Configure />', () => {
    const ecc = new Ecc();
    let user, mockAgora;
    beforeEach(() => {
        mockAgora = new MockAgora();
        // Set up userEvent
        user = userEvent.setup();
        // Mock the fetch call for Cashtab's price API
        global.fetch = jest.fn();
        const fiatCode = 'usd'; // Use usd until you mock getting settings from localforage
        const cryptoId = appConfig.coingeckoId;
        // Keep this in the code, because different URLs will have different outputs requiring different parsing
        const priceApiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${fiatCode}&include_last_updated_at=true`;
        const xecPrice = 0.00003;
        const priceResponse = {
            ecash: {
                usd: xecPrice,
                last_updated_at: 1706644626,
            },
        };
        when(fetch)
            .calledWith(priceApiUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(priceResponse),
            });
        // Mock another price URL for a user that changes fiat currency
        const altFiat = 'gbp';
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
            });

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
            });
    });
    afterEach(async () => {
        jest.clearAllMocks();
        await clearLocalForage(localforage);
    });
    it('Setting "Send Confirmations" settings will show send confirmations', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a210200000064416a14b2f97b4b24a409799b68a6da2d34ada9fa0f305eeffe11d9234cd8ee17dcb033de65840107dd52c35207fb2d2a88eadac270e582a8bc7cd66df4437800234121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff027c150000000000001976a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88acdb6c0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '5f334f32bec07b1029ae579460c704e33ba05b91e3bc2bba9ee215bc585cd6ab';
        mockedChronik.setBroadcastTx(hex, txid);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
            />,
        );

        // Default route is home
        await screen.findByTestId('tx-history');

        // Click the hamburger menu
        await user.click(screen.queryByTitle('Show Other Screens'));

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
        // Modify walletWithXecAndTokens to have the required token for this feature
        const walletWithVipToken = {
            ...walletWithXecAndTokens,
            state: {
                ...walletWithXecAndTokens.state,
                slpUtxos: [
                    ...walletWithXecAndTokens.state.slpUtxos,
                    {
                        ...requiredUtxoThisToken,
                        token: {
                            ...requiredUtxoThisToken.token,
                            tokenId: appConfig.vipTokens.cachet.tokenId,
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
        };

        const mockedChronik = await initializeCashtabStateForTests(
            walletWithVipToken,
            localforage,
        );

        // Make sure the app can get this token's genesis info by calling a mock
        mockedChronik.setToken(
            appConfig.vipTokens.cachet.tokenId,
            cachetTokenAndTx.token,
        );
        mockedChronik.setTx(
            appConfig.vipTokens.cachet.tokenId,
            cachetTokenAndTx.tx,
        );

        render(<CashtabTestWrapper chronik={mockedChronik} ecc={ecc} />);

        // Default route is home
        await screen.findByTestId('tx-history');

        // Click the hamburger menu
        await user.click(screen.queryByTitle('Show Other Screens'));

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
    it('"ABSOLUTE MINIMUM fees" setting is available and effective if wallet holds exactly required balance of Cachet', async () => {
        const CACHET_DECIMALS = 2;
        // Modify walletWithXecAndTokens to have the required token for this feature
        const walletWithVipToken = {
            ...walletWithXecAndTokens,
            state: {
                ...walletWithXecAndTokens.state,
                slpUtxos: [
                    ...walletWithXecAndTokens.state.slpUtxos,
                    {
                        ...requiredUtxoThisToken,
                        token: {
                            ...requiredUtxoThisToken.token,
                            tokenId: appConfig.vipTokens.cachet.tokenId,
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
        };

        const mockedChronik = await initializeCashtabStateForTests(
            walletWithVipToken,
            localforage,
        );

        // Make sure the app can get this token's genesis info by calling a mock
        mockedChronik.setToken(
            appConfig.vipTokens.cachet.tokenId,
            cachetTokenAndTx.token,
        );
        mockedChronik.setTx(
            appConfig.vipTokens.cachet.tokenId,
            cachetTokenAndTx.tx,
        );

        // Can verify in Electrum that this tx is sent at 1.0 sat/byte
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006441a8ae2e6e418b09c8a189547c7412a551617d2f26e55ee5af787ef9ad3f583f6086995640fc06039a04e113dc3d18ce3c51b817f59d31dbb8193dcfa4b7a862664121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff027c150000000000001976a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88acb96d0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'c16de907537369994417459369faad6595842d569b7b4a9544288ac8a4c81dbb';
        mockedChronik.setBroadcastTx(hex, txid);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
            />,
        );

        // Default route is home
        await screen.findByTestId('tx-history');

        // Click the hamburger menu
        await user.click(screen.queryByTitle('Show Other Screens'));

        await user.click(
            screen.getByRole('button', {
                name: /Settings/i,
            }),
        );

        // Now we see the Settings screen
        expect(screen.getByTitle('Settings')).toBeInTheDocument();

        // We see VIP settings
        expect(screen.getByText('VIP Settings')).toBeInTheDocument();
        // We see the CACHET token icon
        expect(
            screen.getByAltText(
                `icon for ${appConfig.vipTokens.cachet.tokenId}`,
            ),
        ).toBeInTheDocument();

        // Send confirmations are disabled by default

        // Enable min fee sends
        await user.click(screen.getByTitle('Toggle minimum fee sends'));

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

        // click send to broadcast the tx
        await user.click(screen.getByRole('button', { name: 'Send' }));

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eCash sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });
    it('Setting "ABSOLUTE MINIMUM fees" settings will reduce fees to absolute min', async () => {
        // Modify walletWithXecAndTokens to have the required token for this feature
        const walletWithVipToken = {
            ...walletWithXecAndTokens,
            state: {
                ...walletWithXecAndTokens.state,
                slpUtxos: [
                    ...walletWithXecAndTokens.state.slpUtxos,
                    requiredUtxoThisToken,
                ],
            },
        };

        const mockedChronik = await initializeCashtabStateForTests(
            walletWithVipToken,
            localforage,
        );

        // Make sure the app can get this token's genesis info by calling a mock
        mockedChronik.setToken(
            appConfig.vipTokens.grumpy.tokenId,
            vipTokenChronikTokenMocks.token,
        );
        mockedChronik.setTx(
            appConfig.vipTokens.grumpy.tokenId,
            vipTokenChronikTokenMocks.tx,
        );

        // Can verify in Electrum that this tx is sent at 1.0 sat/byte
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006441a8ae2e6e418b09c8a189547c7412a551617d2f26e55ee5af787ef9ad3f583f6086995640fc06039a04e113dc3d18ce3c51b817f59d31dbb8193dcfa4b7a862664121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff027c150000000000001976a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88acb96d0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'c16de907537369994417459369faad6595842d569b7b4a9544288ac8a4c81dbb';
        mockedChronik.setBroadcastTx(hex, txid);

        // Can verify in Electrum that this tx is sent at 1.0 sat/byte
        const tokenSendHex =
            '02000000023abaa0b3d97fdc6fb07a535c552fcb379e7bffa6e7e52707b8cf1507bf243e420100000064412f77fbc2321dfa4ada5c554a4528c80862c3184acfcdced5b13d182a890b7199c0ab6b669586cfa7d590e92ada88fe9163557146b7f6c3705163c932154863d64121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dfffffffffe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a210200000064414075e2e616fb9048241e9650f53e5c0fe54c5bc5a88a1e9218321b5e90b4e54fe6f4ddd7f6c345f3bd614c8939ccaba7884112ef8aa6fbc62637d9095d83f4c54121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000406a04534c500001010453454e4420fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa08000000024e160364080000000005f5e09c22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac1b800e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const tokenSendTxid =
            'a9981db09af60875966df3f47a80588d0975fec799c658b702b22633604904d1';

        mockedChronik.setBroadcastTx(tokenSendHex, tokenSendTxid);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
            />,
        );

        // Default route is home
        await screen.findByTestId('tx-history');

        // Click the hamburger menu
        await user.click(screen.queryByTitle('Show Other Screens'));

        await user.click(
            screen.getByRole('button', {
                name: /Settings/i,
            }),
        );

        // Now we see the Settings screen
        expect(screen.getByTitle('Settings')).toBeInTheDocument();

        // Send confirmations are disabled by default

        // Enable min fee sends
        await user.click(screen.getByTitle('Toggle minimum fee sends'));

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

        // click send to broadcast the tx
        await user.click(screen.getByRole('button', { name: 'Send' }));

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eCash sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );

        // If the user's balance of this token falls below the required amount,
        // the feature will be disabled even though the settings value persists

        // Send some tokens

        // Navigate to eTokens screen
        await user.click(
            screen.getByRole('button', {
                name: /Tokens/i,
            }),
        );

        // Click on the VIP token
        await user.click(screen.getByText('GRP'));

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/GRP/))[0]).toBeInTheDocument();

        // Hit the 'Send' switch
        await user.click(screen.getByTitle('Toggle Send'));

        // We send enough GRP to be under the min
        await user.type(
            screen.getByPlaceholderText('Address'),
            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
        );
        await user.type(screen.getByPlaceholderText('Amount'), '99000001');

        // Click the Send token button
        await user.click(screen.getByRole('button', { name: /Send GRP/ }));

        const sendTokenSuccessNotification = await screen.findByText(
            'eToken sent',
        );
        await waitFor(() =>
            expect(sendTokenSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${tokenSendTxid}`,
            ),
        );

        // Actually we can't update the utxo set now, so we add a separate test to confirm
        // the feature is disabled even if it was set to true but then token balance decreased
        // TODO we can test wallet utxo set updates if we connect some Cashtab integration tests
        // to regtest

        // See SendXec test, "If the user has minFeeSends set to true but no longer has the right token amount, the feature is disabled"
    });
    it('We can choose a new fiat currency', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
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
        expect((await localforage.getItem('settings')).fiatCurrency).toEqual(
            'gbp',
        );
    });
});

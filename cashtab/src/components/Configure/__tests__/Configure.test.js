// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import {
    walletWithXecAndTokens,
    vipTokenChronikTokenMocks,
    cachetTokenAndTx,
    freshWalletWithOneIncomingCashtabMsg,
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

describe('<Configure />', () => {
    let user;
    beforeEach(() => {
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
    });
    afterEach(async () => {
        jest.clearAllMocks();
        await clearLocalForage(localforage);
    });
    it('We do not see the camera auto-open setting in the config screen on a desktop device', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            freshWalletWithOneIncomingCashtabMsg,
            localforage,
        );

        render(
            <CashtabTestWrapper chronik={mockedChronik} route="/configure" />,
        );

        // We are on the settings screen
        await screen.findByTitle('Settings');

        // We do not see the auto open option
        expect(
            screen.queryByText('Auto-open camera on send'),
        ).not.toBeInTheDocument();
    });
    it('We do see the camera auto-open setting in the config screen on a mobile device', async () => {
        Object.defineProperty(navigator, 'userAgentData', {
            value: {
                mobile: true,
            },
            writable: true,
        });

        // Get mocked chronik client with expected API results for this wallet
        const mockedChronik = await initializeCashtabStateForTests(
            freshWalletWithOneIncomingCashtabMsg,
            localforage,
        );

        render(
            <CashtabTestWrapper chronik={mockedChronik} route="/configure" />,
        );

        // We are on the settings screen
        await screen.findByTitle('Settings');

        // Now we do see the auto open option
        expect(
            await screen.findByText('Auto-open camera on send'),
        ).toBeInTheDocument();

        // Unset mock
        Object.defineProperty(navigator, 'userAgentData', {
            value: {
                mobile: false,
            },
            writable: true,
        });
    });
    it('Setting "Send Confirmations" settings will show send confirmations', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006a47304402206e0875eb1b866bc063217eb55ba88ddb2a5c4f299278e0c7ce4f34194619a6d502201e2c373cfe93ed35c6502e22b748ab07893e22643107b58f018af8ffbd6b654e4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff027c150000000000001976a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88accd6c0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '7eb806a83c48b0ab38b5af10aaa7452d4648f2c0d41975343ada9f4aa8255bd8';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(<CashtabTestWrapper chronik={mockedChronik} />);

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
                            amount: undecimalizeTokenAmount(
                                '999.99',
                                CACHET_DECIMALS,
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
        mockedChronik.setMock('token', {
            input: appConfig.vipTokens.cachet.tokenId,
            output: cachetTokenAndTx.token,
        });
        mockedChronik.setMock('tx', {
            input: appConfig.vipTokens.cachet.tokenId,
            output: cachetTokenAndTx.tx,
        });

        // Can verify in Electrum that this tx is sent at 1.0 sat/byte
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006a473044022043679b2fcde0099b0cd29bfbca382e92e3b871c079a0db7d73c39440d067f5bb02202e2ab2d5d83b70911da2758afd9e56eaaaa989050f35e4cc4d28d20afc29778a4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff027c150000000000001976a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88acb26d0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '6d2e157e2e2b1fa47cc63ede548375213942e29c090f5d9cbc2722258f720c08';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(<CashtabTestWrapper chronik={mockedChronik} />);

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
                            amount: undecimalizeTokenAmount(
                                appConfig.vipTokens.cachet.vipBalance,
                                CACHET_DECIMALS,
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
        mockedChronik.setMock('token', {
            input: appConfig.vipTokens.cachet.tokenId,
            output: cachetTokenAndTx.token,
        });
        mockedChronik.setMock('tx', {
            input: appConfig.vipTokens.cachet.tokenId,
            output: cachetTokenAndTx.tx,
        });

        // Can verify in Electrum that this tx is sent at 1.0 sat/byte
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006a473044022043679b2fcde0099b0cd29bfbca382e92e3b871c079a0db7d73c39440d067f5bb02202e2ab2d5d83b70911da2758afd9e56eaaaa989050f35e4cc4d28d20afc29778a4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff027c150000000000001976a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88acb26d0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '6d2e157e2e2b1fa47cc63ede548375213942e29c090f5d9cbc2722258f720c08';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(<CashtabTestWrapper chronik={mockedChronik} />);

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
        mockedChronik.setMock('token', {
            input: appConfig.vipTokens.grumpy.tokenId,
            output: vipTokenChronikTokenMocks.token,
        });
        mockedChronik.setMock('tx', {
            input: appConfig.vipTokens.grumpy.tokenId,
            output: vipTokenChronikTokenMocks.tx,
        });

        // Can verify in Electrum that this tx is sent at 1.0 sat/byte
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006a473044022043679b2fcde0099b0cd29bfbca382e92e3b871c079a0db7d73c39440d067f5bb02202e2ab2d5d83b70911da2758afd9e56eaaaa989050f35e4cc4d28d20afc29778a4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff027c150000000000001976a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88acb26d0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '6d2e157e2e2b1fa47cc63ede548375213942e29c090f5d9cbc2722258f720c08';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        // Can verify in Electrum that this tx is sent at 1.0 sat/byte
        const tokenSendHex =
            '02000000023abaa0b3d97fdc6fb07a535c552fcb379e7bffa6e7e52707b8cf1507bf243e42010000006b483045022100a3ee483d79bbc25ea139dbdac578a533ceb6a8764ba49aa4a46f9cfd73efd86602202fe5a207777e0ef846d19e04b75f9ebb3ff5e0c3b70108526aadb2e9ea27865c4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dfffffffffe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006b483045022100c45c36d3083c2a7980535b0495a34c976c90bb51de502b9f9f3f840578a46283022034d491a71135e8497bfa79b664e0e7d5458ec3387643dc1636a8d65721c7b2054121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000406a04534c500001010453454e4420fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa08000000024e160364080000000005f5e09c22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac0d800e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const tokenSendTxid =
            'ce727c96439dfe365cb47f780c37ebb2e756051db62375e992419d5db3c81b1e';

        mockedChronik.setMock('broadcastTx', {
            input: tokenSendHex,
            output: { txid: tokenSendTxid },
        });

        render(<CashtabTestWrapper chronik={mockedChronik} />);

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
            <CashtabTestWrapper chronik={mockedChronik} route="/configure" />,
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

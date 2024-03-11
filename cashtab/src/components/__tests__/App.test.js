// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent, {
    PointerEventsCheckLevel,
} from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
    walletWithXecAndTokens,
    walletWithXecAndTokens_pre_2_1_0,
    freshWalletWithOneIncomingCashtabMsg,
    requiredUtxoThisToken,
    easterEggTokenChronikTokenDetails,
    vipTokenChronikTokenDetails,
    validSavedWallets_pre_2_1_0,
    validSavedWallets,
} from 'components/fixtures/mocks';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
import {
    clearLocalForage,
    initializeCashtabStateForTests,
    initializeCashtabStateAtLegacyWalletKeysForTests,
    prepareMockedChronikCallsForWallet,
} from 'components/fixtures/helpers';
import CashtabTestWrapper from 'components/fixtures/CashtabTestWrapper';
import { explorer } from 'config/explorer';
import { legacyMockTokenInfoById } from 'chronik/fixtures/chronikUtxos';
import { cashtabCacheToJSON } from 'helpers';
import { createCashtabWallet } from 'wallet';
import { isValidCashtabWallet } from 'validation';

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

describe('<App />', () => {
    let user;
    beforeEach(() => {
        // Set up userEvent to skip pointerEvents check, which returns false positives with antd
        user = userEvent.setup({
            // https://github.com/testing-library/user-event/issues/922
            pointerEventsCheck: PointerEventsCheckLevel.Never,
        });
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
    });
    afterEach(async () => {
        jest.clearAllMocks();
        await clearLocalForage(localforage);
    });
    it('Renders 404 on a bad route', async () => {
        // This is the experience of a user visiting cashtab.com for the first time
        const mockedChronik = await initializeCashtabStateForTests(
            false,
            localforage,
        );
        render(
            <CashtabTestWrapper chronik={mockedChronik} route="/not-a-route" />,
        );

        // We get the 404
        expect(screen.getByTestId('not-found')).toBeInTheDocument();
    });
    it('Navigation menu routes to expected components', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Default route is home
        await screen.findByTestId('home-ctn');

        // Navigate to Send screen
        await user.click(screen.queryByTestId('nav-btn-send'));

        // Now we see the Send screen
        expect(screen.getByTestId('send-xec-ctn')).toBeInTheDocument();

        // Navigate to eTokens screen
        await user.click(screen.queryByTestId('nav-btn-etokens'));

        // Now we see the eTokens screen
        expect(screen.getByTestId('etokens-ctn')).toBeInTheDocument();

        // Navigate to Receive screen
        await user.click(screen.queryByTestId('nav-btn-receive'));

        // Now we see the Receive screen
        expect(screen.getByTestId('receive-ctn')).toBeInTheDocument();

        // We do not expect to see hamburger menu items before the menu is clicked
        // This is handled by dynamic css changes, so test that
        expect(screen.queryByTestId('hamburger-menu')).toHaveStyle(
            `max-height: 0`,
        );

        // Click the hamburger menu
        await user.click(screen.queryByTestId('hamburger'));

        // Now we see these items
        expect(screen.queryByTestId('hamburger-menu')).toHaveStyle(
            `max-height: 100rem`,
        );

        // Navigate to Airdrop screen
        await user.click(screen.queryByTestId('nav-btn-airdrop'));

        // Now we see the Airdrop screen
        expect(screen.getByTestId('airdrop-ctn')).toBeInTheDocument();

        // The hamburger menu closes on nav
        expect(screen.queryByTestId('hamburger-menu')).toHaveStyle(
            `max-height: 0`,
        );

        // ... but, we can still click these items with the testing library, so we do
        // Navigate to Swap screen
        await user.click(screen.queryByTestId('nav-btn-swap'));

        // Now we see the Swap screen
        expect(screen.getByTestId('swap-ctn')).toBeInTheDocument();

        // Navigate to SignVerifyMsg screen
        await user.click(screen.queryByTestId('nav-btn-signverifymsg'));

        // Now we see the SignVerifyMsg screen
        expect(screen.getByTestId('signverifymsg-ctn')).toBeInTheDocument();

        // Navigate to Settings screen
        await user.click(screen.queryByTestId('nav-btn-configure'));

        // Now we see the Settings screen
        expect(screen.getByTestId('configure-ctn')).toBeInTheDocument();
    });
    it('Adding a contact to to a new contactList by clicking on tx history adds it to localforage and wallet context', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            freshWalletWithOneIncomingCashtabMsg,
            localforage,
        );

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait for the page to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // We see the home container
        await screen.findByTestId('home-ctn');

        // Open the collapse of this tx in tx history
        await user.click(
            await screen.findByRole('button', {
                name: /Warning: This sender is not in your contact list. Beware of scams./,
            }),
            {
                // https://github.com/testing-library/user-event/issues/922
                pointerEventsCheck: PointerEventsCheckLevel.Never,
            },
        );

        // Get the "Add to contacts" button of tx
        const addToContactsBtn = screen.getByTestId('add-to-contacts-btn');

        // We do not see the configure screen before clicking the button
        expect(screen.queryByTestId('configure-ctn')).not.toBeInTheDocument();

        // Confirm expected initial state of localforage
        const storedContacts = await localforage.getItem('contactList');
        expect(storedContacts).toStrictEqual(null);

        // Click the button
        await user.click(addToContactsBtn);

        // Now we see the Configure screen
        expect(screen.getByTestId('configure-ctn')).toBeInTheDocument();

        const newContactList = [
            {
                address: 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
                name: 'qphlh',
            },
        ];

        const storedContactListNow = await localforage.getItem('contactList');

        // localforage has been updated with this newly added contact
        expect(storedContactListNow).toEqual(newContactList);
    });
    it('Adding a contact to an existing contactList by clicking on tx history adds it to localforage and wallet context', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            freshWalletWithOneIncomingCashtabMsg,
            localforage,
        );
        // Populate the contactList
        const initialContactList = [
            {
                address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                name: 'echo',
            },
        ];
        await localforage.setItem('contactList', initialContactList);

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait for the page to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // We see the home container
        await screen.findByTestId('home-ctn');

        // Open the collapse of this tx in tx history
        await user.click(
            await screen.findByRole('button', {
                name: /Warning: This sender is not in your contact list. Beware of scams./,
            }),
            {
                // https://github.com/testing-library/user-event/issues/922
                pointerEventsCheck: PointerEventsCheckLevel.Never,
            },
        );

        // Get the "Add to contacts" button of tx
        const addToContactsBtn = screen.getByTestId('add-to-contacts-btn');

        // We do not see the configure screen before clicking the button
        expect(screen.queryByTestId('configure-ctn')).not.toBeInTheDocument();

        // Confirm expected initial state of localforage
        const storedContacts = await localforage.getItem('contactList');
        expect(storedContacts).toEqual(initialContactList);

        // Click the button
        await user.click(addToContactsBtn);

        // Now we see the Configure screen
        expect(screen.getByTestId('configure-ctn')).toBeInTheDocument();

        // localforage has been updated with this newly added contact
        await waitFor(async () =>
            expect(await localforage.getItem('contactList')).toEqual([
                {
                    address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                    name: 'echo',
                },
                {
                    address: 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
                    name: 'qphlh',
                },
            ]),
        );
    });
    it('A user with legacy blank contactList in localstorage is migrated on startup', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            freshWalletWithOneIncomingCashtabMsg,
            localforage,
        );
        const LEGACY_EMPTY_CONTACT_LIST = [{}];
        await localforage.setItem('contactList', LEGACY_EMPTY_CONTACT_LIST);

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait for cashtabbootup, so that loadContactList has been called
        // Wallet-info is rendered
        expect(
            await screen.findByTestId('wallet-info-ctn'),
        ).toBeInTheDocument();

        // localforage has been updated with the new format for an empty contact list
        await waitFor(async () =>
            expect(await localforage.getItem('contactList')).toStrictEqual([]),
        );
    });
    it('Clicking "reply" on a Cashtab Msg correctly populates the SendXec to address and amount fields', async () => {
        // Get mocked chronik client with expected API results for this wallet
        const mockedChronik = await initializeCashtabStateForTests(
            freshWalletWithOneIncomingCashtabMsg,
            localforage,
        );

        // Render app on home screen
        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wallet-info is rendered
        expect(
            await screen.findByTestId('wallet-info-ctn'),
        ).toBeInTheDocument();

        // Balance is correct
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '10,000.00 XEC',
        );

        // We do not see the send screen before clicking the button
        await waitFor(() =>
            expect(
                screen.queryByTestId('send-xec-ctn'),
            ).not.toBeInTheDocument(),
        );

        await waitFor(async () => {
            // Get the "Reply to" button of Cashtab Msg
            const cashtabMsgReplyBtn = screen.getByTestId('cashtab-msg-reply');
            // Click reply to cashtab msg button
            // ref https://github.com/testing-library/user-event/issues/922
            // ref https://github.com/testing-library/user-event/issues/662
            // issue with using userEvents.click() here likely related to antd
            cashtabMsgReplyBtn.click();
        });

        // Now we see the Send screen
        expect(await screen.findByTestId('send-xec-ctn')).toBeInTheDocument();

        // The SendXec send address input is rendered and has expected value
        expect(
            await screen.findByTestId('destination-address-single'),
        ).toHaveValue('ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y');
        // The value field is populated with dust
        expect(await screen.findByTestId('send-xec-input')).toHaveValue(5.5);
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
        await screen.findByTestId('configure-ctn');

        // We do not see the auto open option
        expect(screen.queryByText('Auto-open camera')).not.toBeInTheDocument();
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
        await screen.findByTestId('configure-ctn');

        // Now we do see the auto open option
        expect(await screen.findByText('Auto-open camera')).toBeInTheDocument();

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
        await screen.findByTestId('home-ctn');

        // Click the hamburger menu
        await user.click(screen.queryByTestId('hamburger'));

        // Navigate to Settings screen
        await user.click(screen.queryByTestId('nav-btn-configure'));

        // Now we see the Settings screen
        expect(screen.getByTestId('configure-ctn')).toBeInTheDocument();

        // Send confirmations are disabled by default
        // Note, another antd issue. We can't get the switch by role bc antd switches are buttons with no name
        // and no label
        // So, use data-testid
        const sendConfirmationsSwitch = screen.getByTestId(
            'send-confirmations-switch',
        );
        // We cannot get switch checked status from the antd switch. So, disabled has a grey background.
        expect(sendConfirmationsSwitch).toHaveStyle(
            'background-color: #bdbdbd;',
        );

        // Enable send confirmations
        await user.click(sendConfirmationsSwitch);
        // Now the switch does not have a grey background
        expect(sendConfirmationsSwitch).not.toHaveStyle(
            'background-color: #bdbdbd;',
        );

        // Navigate to the Send screen
        await user.click(screen.queryByTestId('nav-btn-send'));

        // Now we see the Send screen
        expect(screen.getByTestId('send-xec-ctn')).toBeInTheDocument();

        // Fill out to and amount
        await user.type(
            screen.getByPlaceholderText('Address'),
            'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
        );
        await user.type(screen.getByPlaceholderText('Amount'), '55');
        // click send
        await user.click(screen.getByRole('button', { name: /Send/ }));
        // we see a modal
        expect(
            await screen.findByText(
                `Are you sure you want to send 55 XEC to ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y?`,
            ),
        ).toBeInTheDocument();

        // We can click ok to send the tx
        await user.click(screen.getByText('OK'));

        // Notification is rendered with expected txid?;
        const txSuccessNotification = await screen.findByText(
            'Transaction successful. Click to view in block explorer.',
        );
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });
    it('If Cashtab starts up with some settings keys missing, the missing keys are migrated to default values', async () => {
        // Note: this is what happens to existing users when we add a new key to cashtabState.settings
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Set settings with some keys missing
        const legacySettings = {
            fiatCurrency: 'gbp', // non-default value
            sendModal: true, // non-default value
            autoCameraOn: true,
            // no hideMessagesFromUnknownSenders
            // no balanceVisible
            // no minFeeSends
        };

        // Update localforage with these legacy settings
        await localforage.setItem('settings', legacySettings);

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Confirm localforage has been updated and non-default values are preserved
        await waitFor(async () =>
            expect(await localforage.getItem('settings')).toEqual({
                ...legacySettings,
                hideMessagesFromUnknownSenders: false,
                balanceVisible: true,
                minFeeSends: false,
            }),
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
            input: appConfig.vipSettingsTokenId,
            output: vipTokenChronikTokenDetails,
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
        await screen.findByTestId('home-ctn');

        // Click the hamburger menu
        await user.click(screen.queryByTestId('hamburger'));

        // Navigate to Settings screen
        await user.click(screen.queryByTestId('nav-btn-configure'));

        // Now we see the Settings screen
        expect(screen.getByTestId('configure-ctn')).toBeInTheDocument();

        // Send confirmations are disabled by default
        // Note, another antd issue. We can't get the switch by role bc antd switches are buttons with no name
        // and no label
        // So, use data-testid
        const minFeeSendsSwitch = screen.getByTestId(
            'settings-minFeeSends-switch',
        );
        // We cannot get switch checked status from the antd switch. So, disabled has a grey background.
        expect(minFeeSendsSwitch).toHaveStyle('background-color: #bdbdbd;');

        // Enable min fee sends
        await user.click(minFeeSendsSwitch);

        // Now the switch does not have a grey background
        expect(minFeeSendsSwitch).not.toHaveStyle('background-color: #bdbdbd;');

        // Navigate to the Send screen
        await user.click(screen.queryByTestId('nav-btn-send'));

        // Now we see the Send screen
        expect(screen.getByTestId('send-xec-ctn')).toBeInTheDocument();

        // Fill out to and amount
        await user.type(
            screen.getByPlaceholderText('Address'),
            'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
        );
        await user.type(screen.getByPlaceholderText('Amount'), '55');

        // click send to broadcast the tx
        await user.click(screen.getByRole('button', { name: /Send/ }));

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText(
            'Transaction successful. Click to view in block explorer.',
        );
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
        await user.click(screen.queryByTestId('nav-btn-etokens'));

        // Click on the VIP token
        await user.click(screen.getByText('GRP'));

        // Wait for element to get token info and load
        await screen.findByText('Token info for "GRUMPY"');

        // We send enough GRP to be under the min
        await user.type(
            screen.getByPlaceholderText('Address'),
            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
        );
        await user.type(screen.getByPlaceholderText('Amount'), '99000001');

        // Click the Send token button
        await user.click(screen.getByRole('button', { name: /Send/ }));

        const sendTokenSuccessNotification = await screen.findByText(
            'Transaction successful. Click to view in block explorer.',
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
    it('Wallet with easter egg token sees easter egg', async () => {
        const EASTER_EGG_TOKENID =
            '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e';
        const requiredEasterEggUtxo = {
            ...requiredUtxoThisToken,
            slpMeta: {
                ...requiredUtxoThisToken.slpMeta,
                tokenId: EASTER_EGG_TOKENID,
            },
            tokenId: EASTER_EGG_TOKENID,
        };
        // Modify walletWithXecAndTokens to have the required token for this feature
        let walletWithEasterEggToken = JSON.parse(
            JSON.stringify(walletWithXecAndTokens),
        );
        walletWithEasterEggToken = {
            ...walletWithEasterEggToken,
            state: {
                ...walletWithEasterEggToken.state,
                slpUtxos: [
                    ...walletWithEasterEggToken.state.slpUtxos,
                    requiredEasterEggUtxo,
                ],
            },
        };

        const mockedChronik = await initializeCashtabStateForTests(
            walletWithEasterEggToken,
            localforage,
        );

        // Make sure the app can get this token's genesis info by calling a mock
        mockedChronik.setMock('token', {
            input: EASTER_EGG_TOKENID,
            output: easterEggTokenChronikTokenDetails,
        });

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // We see the easter egg
        expect(await screen.findByAltText('tabcash')).toBeInTheDocument();
    });
    it('If Cashtab starts with 1.5.* cashtabCache, it is wiped and migrated to 1.6.* cashtabCache', async () => {
        // Note: this is what will happen for all Cashtab users when this diff lands
        const mockedChronik =
            await initializeCashtabStateAtLegacyWalletKeysForTests(
                walletWithXecAndTokens,
                localforage,
            );

        // Mock cashtabCache at 1.5.*
        await localforage.setItem('cashtabCache', legacyMockTokenInfoById);

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        const expectedCashtabCacheTokens = new Map();

        // Tokens from wallet utxos will be added to cache on app load
        expectedCashtabCacheTokens.set(
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            {
                decimals: 0,
                success: true,
                tokenDocumentHash: '',
                tokenDocumentUrl: 'https://cashtab.com/',
                tokenId:
                    '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                tokenName: 'BearNip',
                tokenTicker: 'BEAR',
            },
        );

        // Result will be stored as a keyvalue array and must be converted to a map
        // We do the reverse to get the expected storage value
        const expectedStoredCashtabCache = cashtabCacheToJSON({
            tokens: expectedCashtabCacheTokens,
        });
        // Confirm cashtabCache in localforage matches expected result
        await waitFor(async () =>
            expect(await localforage.getItem('cashtabCache')).toEqual(
                expectedStoredCashtabCache,
            ),
        );
    });
    it('A new user can import a mnemonic', async () => {
        // Initialize for new user with wallet = false, so localstorage gets defaults
        const mockedChronik = await initializeCashtabStateForTests(
            false,
            localforage,
        );

        // Prepare chronik mocks for expected utxo set to populate wallet
        prepareMockedChronikCallsForWallet(
            mockedChronik,
            walletWithXecAndTokens,
        );

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // We click the Import Wallet button
        await user.click(
            await screen.findByRole('button', {
                name: /Import Wallet/,
            }),
        );

        // Mnemonic input field is rendered
        expect(
            screen.getByPlaceholderText('mnemonic (seed phrase)'),
        ).toBeInTheDocument();

        // The import button is disabled if no mnemonic is entered
        const importButton = screen.getByRole('button', {
            name: 'Import',
        });
        expect(importButton).toHaveAttribute('disabled');

        // We enter a valid mnemonic
        const VALID_MNEMONIC =
            'beauty shoe decline spend still weird slot snack coach flee between paper';
        await user.type(
            screen.getByPlaceholderText('mnemonic (seed phrase)'),
            VALID_MNEMONIC,
        );

        // The validation msg is not in the document
        expect(
            screen.queryByText('Valid mnemonic seed phrase required'),
        ).not.toBeInTheDocument();

        // The import button is no longer disabled
        expect(importButton).not.toHaveAttribute('disabled');

        // Click it
        await user.click(importButton);

        // The wallet must load from API calls
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '9,513.12 XEC',
        );

        // We are forwarded to the home screen after the wallet loads
        expect(await screen.findByTestId('home-ctn')).toBeInTheDocument();

        // The imported wallet is in localforage
        const wallets = await localforage.getItem('wallets');
        const importedWallet = wallets[0];

        // The imported wallet matches our expected mock except for name, which is autoset on import
        // The imported wallet is not imported with legacy paths (145 and 245)
        const expectedPathInfo = walletWithXecAndTokens.paths.find(
            pathInfo => pathInfo.path === 1899,
        );
        expect(importedWallet).toEqual({
            ...walletWithXecAndTokens,
            name: 'qqa9l',
            paths: [expectedPathInfo],
        });

        // Apart from state, which is blank from createCashtabWallet,
        // the imported wallet matches what we get from createCashtabWallet
        const createdWallet = await createCashtabWallet(VALID_MNEMONIC);
        expect(importedWallet).toEqual({
            ...createdWallet,
            state: importedWallet.state,
        });
    });
    it('Migrating from wallet/savedWallet keys (version < 1.6.0): A user with an invalid Cashtab wallet as the active wallet is migrated on startup', async () => {
        const mockedChronik =
            await initializeCashtabStateAtLegacyWalletKeysForTests(
                // Any wallet stored in legacy key structures will have pre_2_1_0 format (or earlier)
                // i.e.balances key and Path1899, Path145, Path245 hard coded
                walletWithXecAndTokens_pre_2_1_0,
                localforage,
            );

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '9,513.12 XEC',
        );

        // Check wallet in localforage
        const wallets = await localforage.getItem('wallets');
        const migratedWallet = wallets[0];

        // The wallet has been migrated
        expect(migratedWallet).toEqual(walletWithXecAndTokens);
    });
    it('Migrating from wallet/savedWallet keys (version < 1.6.0): A user with pre-2.1.0 valid wallets in savedWallets has them all migrated to new storage keys and new shape', async () => {
        const mockedChronik =
            await initializeCashtabStateAtLegacyWalletKeysForTests(
                // Any wallet stored in legacy key structures will have pre_2_1_0 format (or earlier)
                // i.e.balances key and Path1899, Path145, Path245 hard coded
                walletWithXecAndTokens_pre_2_1_0,
                localforage,
            );

        // Mock 5 valid wallets stored at savedWallets key of localforage
        // Note that, in Cashtab legacy model, savedWallets also includes the active wallet
        // Note that, as of 2.1.0, any wallet found in the legacy savedWallets key will be invalid
        await localforage.setItem('savedWallets', [
            ...validSavedWallets_pre_2_1_0,
            walletWithXecAndTokens_pre_2_1_0,
        ]);

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '9,513.12 XEC',
        );

        // Check wallets
        const walletsAfterLoad = await localforage.getItem('wallets');

        const savedWallets = walletsAfterLoad.slice(1);

        // The savedWallets array stored at the savedWallets key is unchanged
        expect(savedWallets).toEqual(validSavedWallets);
    });
    it('Migrating (version >= 1.6.0 and < 2.1.0): A user with an invalid wallet stored at wallets key has that wallet migrated', async () => {
        // Create a savedWallets array with 4 valid wallets and 1 invalid wallet
        const mixedValidWallets = [
            walletWithXecAndTokens,
            ...validSavedWallets_pre_2_1_0.slice(0, 1),
            ...validSavedWallets.slice(1),
        ];

        // The wallet at index one is invalid
        expect(isValidCashtabWallet(mixedValidWallets[1])).toBe(false);

        const mockedChronik = await initializeCashtabStateForTests(
            mixedValidWallets,
            localforage,
        );

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '9,513.12 XEC',
        );

        // Check wallets
        const walletsAfterLoad = await localforage.getItem('wallets');

        const savedWallets = walletsAfterLoad.slice(1);

        // We expect savedWallets in localforage to have been migrated
        await waitFor(async () => {
            expect(savedWallets).toEqual(validSavedWallets);
        });
    });
    it('Migrating (version >= 1.6.0 and < 2.1.0): A user with multiple invalid wallets in savedWallets has them migrated', async () => {
        // Create a savedWallets array with 4 valid wallets and 1 invalid wallet
        const mixedValidWallets = [
            walletWithXecAndTokens,
            ...validSavedWallets_pre_2_1_0.slice(0, 3),
            ...validSavedWallets.slice(3),
        ];

        // The wallets at indices 1, 2, and 3 are invalid
        expect(isValidCashtabWallet(mixedValidWallets[1])).toBe(false);
        expect(isValidCashtabWallet(mixedValidWallets[2])).toBe(false);
        expect(isValidCashtabWallet(mixedValidWallets[3])).toBe(false);

        const mockedChronik = await initializeCashtabStateForTests(
            mixedValidWallets,
            localforage,
        );

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '9,513.12 XEC',
        );

        // Check wallets
        const walletsAfterLoad = await localforage.getItem('wallets');

        const savedWallets = walletsAfterLoad.slice(1);

        // We expect savedWallets in localforage to have been migrated
        await waitFor(async () => {
            expect(savedWallets).toEqual(validSavedWallets);
        });
    });
    it('Cashtab version >= 1.6.0 and < 2.1.0: A user with an invalid Cashtab wallet as the active wallet is migrated on startup', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens_pre_2_1_0,
            localforage,
        );

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '9,513.12 XEC',
        );

        // Check wallet in localforage
        const wallets = await localforage.getItem('wallets');
        const migratedWallet = wallets[0];

        // The wallet has been migrated
        expect(migratedWallet).toEqual(walletWithXecAndTokens);
    });
    it('A user with all valid wallets in savedWallets does not have any savedWallets migrated', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            [walletWithXecAndTokens, ...validSavedWallets],
            localforage,
        );

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '9,513.12 XEC',
        );

        // The savedWallets array stored at the savedWallets key is unchanged
        expect(await localforage.getItem('wallets')).toEqual([
            walletWithXecAndTokens,
            ...validSavedWallets,
        ]);
    });
});

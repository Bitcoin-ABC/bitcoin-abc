// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent, {
    PointerEventsCheckLevel,
} from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
    walletWithXecAndTokens,
    walletWithXecAndTokens_pre_2_1_0,
    walletWithXecAndTokens_pre_2_9_0,
    freshWalletWithOneIncomingCashtabMsg,
    requiredUtxoThisToken,
    easterEggTokenChronikTokenDetails,
    validSavedWallets_pre_2_1_0,
    validSavedWallets_pre_2_9_0,
    validSavedWallets,
    mockCacheWalletWithXecAndTokens,
} from 'components/App/fixtures/mocks';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
import {
    clearLocalForage,
    initializeCashtabStateForTests,
    initializeCashtabStateAtLegacyWalletKeysForTests,
    prepareMockedChronikCallsForWallet,
} from 'components/App/fixtures/helpers';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import { legacyMockTokenInfoById } from 'chronik/fixtures/chronikUtxos';
import {
    cashtabCacheToJSON,
    storedCashtabCacheToMap,
    cashtabWalletFromJSON,
    cashtabWalletsFromJSON,
} from 'helpers';
import { createCashtabWallet } from 'wallet';
import { isValidCashtabWallet } from 'validation';
import CashtabCache from 'config/CashtabCache';
import { CashtabSettings } from 'config/cashtabSettings';

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

// Mock a valid sideshift object in window
window.sideshift = {
    show: jest.fn(),
    hide: jest.fn(),
    addEventListener: jest.fn(),
};

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
        const nextXecPrice = 0.000042;
        const zeroKillingXecPrice = 0.000111;
        const priceResponse = {
            ecash: {
                usd: xecPrice,
                last_updated_at: 1706644626,
            },
        };
        when(fetch)
            .calledWith(priceApiUrl)
            .mockResolvedValueOnce({
                json: () => Promise.resolve(priceResponse),
            });
        when(fetch)
            .calledWith(priceApiUrl)
            .mockResolvedValueOnce({
                json: () =>
                    Promise.resolve({
                        ...priceResponse,
                        ecash: { ...priceResponse.ecash, usd: nextXecPrice },
                    }),
            });
        when(fetch)
            .calledWith(priceApiUrl)
            .mockResolvedValueOnce({
                json: () =>
                    Promise.resolve({
                        ...priceResponse,
                        ecash: {
                            ...priceResponse.ecash,
                            usd: zeroKillingXecPrice,
                        },
                    }),
            });
    });
    afterEach(async () => {
        jest.clearAllMocks();
        await clearLocalForage(localforage);
    });
    it('Renders onboarding screen at home route if user has no wallet', async () => {
        // This is the experience of a user visiting cashtab.com for the first time
        const mockedChronik = await initializeCashtabStateForTests(
            false,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // We get the Onboarding screen
        expect(
            await screen.findByText('Welcome to Cashtab!'),
        ).toBeInTheDocument();
    });
    it('Renders onboarding screen at Receive route if user has no wallet', async () => {
        // This is the experience of a user visiting cashtab.com for the first time
        const mockedChronik = await initializeCashtabStateForTests(
            false,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/receive" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // We get the Onboarding screen
        expect(
            await screen.findByText('Welcome to Cashtab!'),
        ).toBeInTheDocument();
    });
    it('Renders onboarding screen even on a bad route if user has no wallet', async () => {
        // This is the experience of a user visiting cashtab.com for the first time
        const mockedChronik = await initializeCashtabStateForTests(
            false,
            localforage,
        );
        render(
            <CashtabTestWrapper chronik={mockedChronik} route="/not-a-route" />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // We get the Onboarding screen
        expect(
            await screen.findByText('Welcome to Cashtab!'),
        ).toBeInTheDocument();
    });
    it('Renders 404 at bad route if user has a wallet', async () => {
        // This is the experience of a user visiting cashtab.com for the first time
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(
            <CashtabTestWrapper chronik={mockedChronik} route="/not-a-route" />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // We get the Onboarding screen
        expect(await screen.findByText('Page not found')).toBeInTheDocument();
    });
    it('Navigation menu routes to expected components', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Default route is home
        await screen.findByTestId('tx-history-ctn');

        // Navigate to Send screen
        await user.click(screen.queryByTestId('nav-btn-send'));

        // Now we see the Send screen (we check by confirming presence of the send to many switch)
        expect(screen.getByTestId('send-to-many-switch')).toBeInTheDocument();

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
        expect(
            screen.getByText('Airdrop scaled to token balance'),
        ).toBeInTheDocument();

        // The hamburger menu closes on nav
        expect(screen.queryByTestId('hamburger-menu')).toHaveStyle(
            `max-height: 0`,
        );

        // ... but, we can still click these items with the testing library, so we do
        // Navigate to Swap screen
        await user.click(screen.queryByTestId('nav-btn-swap'));

        // Now we see the Swap screen
        expect(
            screen.getByRole('button', { name: /Open SideShift/ }),
        ).toBeInTheDocument();

        // Navigate to SignVerifyMsg screen
        await user.click(screen.queryByTestId('nav-btn-signverifymsg'));

        // Now we see the SignVerifyMsg screen
        expect(screen.getByTestId('signverifymsg-ctn')).toBeInTheDocument();

        // Navigate to Settings screen
        await user.click(screen.queryByTestId('nav-btn-configure'));

        // Now we see the Settings screen
        expect(screen.getByTestId('configure-ctn')).toBeInTheDocument();

        // Navigate to Backup screen
        await user.click(screen.queryByTestId('nav-btn-backup'));

        // Now we see the Backup screen
        expect(
            screen.getByText(
                `ℹ️ Your seed phrase is the only way to restore your wallet. Write it down. Keep it safe.`,
            ),
        ).toBeInTheDocument();

        // Navigate to Contacts screen
        await user.click(screen.queryByTestId('nav-btn-contacts'));

        // Now we see the Contacts screen
        expect(screen.getByTestId('contacts')).toBeInTheDocument();

        // Navigate to Wallets screen
        await user.click(screen.queryByTestId('nav-btn-wallets'));

        // Now we see the Wallets screen
        expect(screen.getByTestId('wallets')).toBeInTheDocument();
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

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '10,000.00 XEC',
        );

        // We see the home container
        await screen.findByTestId('tx-history-ctn');

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

        // Confirm expected initial state of localforage
        const storedContacts = await localforage.getItem('contactList');
        expect(storedContacts).toStrictEqual(null);

        // Click the button
        await user.click(addToContactsBtn);

        // We see the add contact from tx history modal, prompting for name only input
        await user.type(
            screen.getByPlaceholderText('Enter new contact name'),
            'contact from tx history',
        );

        // Click OK
        await user.click(screen.getByText('OK'));

        const newContactList = [
            {
                address: 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
                name: 'contact from tx history',
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

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '10,000.00 XEC',
        );

        // We see the home container
        await screen.findByTestId('tx-history-ctn');

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

        // Confirm expected initial state of localforage
        const storedContacts = await localforage.getItem('contactList');
        expect(storedContacts).toEqual(initialContactList);

        // Click the button
        await user.click(addToContactsBtn);

        // We see the add contact from tx history modal, prompting for name only input
        await user.type(
            screen.getByPlaceholderText('Enter new contact name'),
            'contact from tx history',
        );

        // Click OK
        await user.click(screen.getByText('OK'));

        // localforage has been updated with this newly added contact
        await waitFor(async () =>
            expect(await localforage.getItem('contactList')).toEqual([
                {
                    address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                    name: 'echo',
                },
                {
                    address: 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
                    name: 'contact from tx history',
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
                screen.queryByTestId('send-to-many-switch'),
            ).not.toBeInTheDocument(),
        );

        await user.click(screen.getByTestId('cashtab-msg-reply'));

        // Now we see the Send screen
        expect(
            await screen.findByTestId('send-to-many-switch'),
        ).toBeInTheDocument();

        // The SendXec send address input is rendered and has expected value
        expect(screen.getByPlaceholderText('Address')).toHaveValue(
            'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
        );
        // The value field is populated with dust
        expect(screen.getByPlaceholderText('Amount')).toHaveValue(5.5);
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
    it('Wallet with easter egg token sees easter egg', async () => {
        const EASTER_EGG_TOKENID =
            '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e';
        const requiredEasterEggUtxo = {
            ...requiredUtxoThisToken,
            token: {
                ...requiredUtxoThisToken.token,
                tokenId: EASTER_EGG_TOKENID,
            },
        };
        // Modify walletWithXecAndTokens to have the required token for this feature

        const walletWithEasterEggToken = {
            ...walletWithXecAndTokens,
            state: {
                ...walletWithXecAndTokens.state,
                slpUtxos: [
                    ...walletWithXecAndTokens.state.slpUtxos,
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
    it('If Cashtab starts with 1.5.* cashtabCache, it is wiped and migrated to 2.9.0 cashtabCache', async () => {
        // Note: this is what will happen for all Cashtab users when this diff lands
        const mockedChronik =
            await initializeCashtabStateAtLegacyWalletKeysForTests(
                walletWithXecAndTokens,
                localforage,
            );

        // Mock cashtabCache at 1.5.*
        await localforage.setItem('cashtabCache', legacyMockTokenInfoById);

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        const expectedCashtabCacheTokens = new CashtabCache([
            [
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                mockCacheWalletWithXecAndTokens,
            ],
        ]);

        // Confirm cashtabCache in localforage matches expected result
        await waitFor(async () =>
            expect(
                storedCashtabCacheToMap(
                    await localforage.getItem('cashtabCache'),
                ),
            ).toEqual(expectedCashtabCacheTokens),
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
        expect(await screen.findByTestId('tx-history-ctn')).toBeInTheDocument();

        // The imported wallet is in localforage
        const wallets = await localforage.getItem('wallets');
        const importedWallet = cashtabWalletFromJSON(wallets[0]);

        // The imported wallet matches our expected mock except for name, which is autoset on import
        // The imported wallet is not imported with legacy paths (145 and 245)
        const expectedPathInfo = walletWithXecAndTokens.paths.get(1899);
        // We expect the wallet to be walletWithXecAndTokens, except new name and no legacy paths
        const expectedWallet = {
            ...walletWithXecAndTokens,
            name: 'qqa9l',
            paths: new Map([[1899, expectedPathInfo]]),
        };

        expect(importedWallet).toEqual(expectedWallet);

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

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '9,513.12 XEC',
        );

        // Check wallet in localforage
        const wallets = await localforage.getItem('wallets');
        const migratedWallet = cashtabWalletFromJSON(wallets[0]);

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

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '9,513.12 XEC',
        );

        // Check wallets
        const walletsAfterLoad = cashtabWalletsFromJSON(
            await localforage.getItem('wallets'),
        );

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

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '9,513.12 XEC',
        );

        // Check wallets
        const walletsAfterLoad = cashtabWalletsFromJSON(
            await localforage.getItem('wallets'),
        );

        const savedWallets = walletsAfterLoad.slice(1);

        // We expect savedWallets in localforage to have been migrated
        await waitFor(async () => {
            expect(savedWallets).toEqual(validSavedWallets);
        });
    });
    it('Migrating (version >= 1.6.0 and < 2.1.0): A user with multiple invalid wallets stored at wallets key has them migrated', async () => {
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

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '9,513.12 XEC',
        );

        // Check wallets
        const walletsAfterLoad = cashtabWalletsFromJSON(
            await localforage.getItem('wallets'),
        );

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

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '9,513.12 XEC',
        );

        // Check wallet in localforage
        const wallets = await localforage.getItem('wallets');
        const migratedWallet = cashtabWalletFromJSON(wallets[0]);

        // The wallet has been migrated
        expect(migratedWallet).toEqual(walletWithXecAndTokens);
    });
    it('A user with all valid wallets stored at wallets key does not have any wallets migrated', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            [walletWithXecAndTokens, ...validSavedWallets],
            localforage,
        );

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '9,513.12 XEC',
        );

        const walletsAfterLoad = cashtabWalletsFromJSON(
            await localforage.getItem('wallets'),
        );

        // The savedWallets array stored at the savedWallets key is unchanged
        expect(walletsAfterLoad).toEqual([
            walletWithXecAndTokens,
            ...validSavedWallets,
        ]);
    });
    it('Migrating (version < 2.9.0): A user with multiple invalid wallets stored at wallets key has them migrated', async () => {
        // Create a savedWallets array with 4 valid wallets and 1 invalid wallet
        const mixedValidWallets = [
            walletWithXecAndTokens,
            ...validSavedWallets_pre_2_9_0.slice(0, 3),
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

        // Wait for the page to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '9,513.12 XEC',
        );

        // Check wallets
        const walletsAfterLoad = cashtabWalletsFromJSON(
            await localforage.getItem('wallets'),
        );

        const savedWallets = walletsAfterLoad.slice(1);

        // We expect savedWallets in localforage to have been migrated
        await waitFor(async () => {
            expect(savedWallets).toEqual(validSavedWallets);
        });
    });
    it('Migrating (version < 2.9.0): A user with an invalid Cashtab wallet as the active wallet is migrated on startup', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens_pre_2_9_0,
            localforage,
        );

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait for the page to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '9,513.12 XEC',
        );

        // Check wallet in localforage
        const wallets = await localforage.getItem('wallets');
        const migratedWallet = cashtabWalletFromJSON(wallets[0]);

        // The wallet has been migrated
        expect(migratedWallet).toEqual(walletWithXecAndTokens);
    });
    it('If Cashtab starts with < 2.9.0 cashtabCache, it is wiped and migrated to 2.9.0 cashtabCache', async () => {
        // Note: this is what will happen for all Cashtab users when this diff lands
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Mock cashtabCache at > 1.5.0 and < 2.9.0
        const pre_2_9_0_tokens_cache = new Map();

        // Tokens from wallet utxos will be added to cache on app load
        pre_2_9_0_tokens_cache.set(
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            {
                decimals: 0,
                success: true,
                hash: '',
                url: 'https://cashtab.com/',
                tokenName: 'BearNip',
                tokenTicker: 'BEAR',
            },
        );

        // Result will be stored as a keyvalue array and must be converted to a map
        // We do the reverse to get the expected storage value
        const expectedStoredCashtabCache = cashtabCacheToJSON({
            tokens: pre_2_9_0_tokens_cache,
        });
        await localforage.setItem('cashtabCache', expectedStoredCashtabCache);

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Confirm cashtabCache has been migrated to post-2.9.0 format
        await waitFor(async () =>
            expect(
                storedCashtabCacheToMap(
                    await localforage.getItem('cashtabCache'),
                ),
            ).toEqual(
                new CashtabCache([
                    [
                        '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                        {
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            genesisInfo: {
                                tokenTicker: 'BEAR',
                                tokenName: 'BearNip',
                                url: 'https://cashtab.com/',
                                decimals: 0,
                                hash: '',
                            },
                            timeFirstSeen: 0,
                            genesisSupply: '4444',
                            genesisOutputScripts: [
                                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                            ],
                            genesisMintBatons: 0,
                            block: {
                                height: 782665,
                                hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
                                timestamp: 1678408305,
                            },
                        },
                    ],
                ]),
            ),
        );
    });
    it('We see a price notification if new price is at a new tens level in USD per 1,000,000 XEC, and a special notification if a zero is killed', async () => {
        jest.useFakeTimers();

        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Advance timers more than the price interval
        act(() => {
            jest.advanceTimersByTime(appConfig.fiatUpdateIntervalMs + 1000);
        });

        // We get a notification for a "tens" price milestone
        expect(
            await screen.findByText('XEC is now $0.000042 USD'),
        ).toBeInTheDocument();

        // Advance timers more than the price interval
        act(() => {
            jest.advanceTimersByTime(appConfig.fiatUpdateIntervalMs + 1000);
        });

        // We get a notification for a "tens" price milestone
        expect(
            await screen.findByText('XEC is now $0.000111 USD'),
        ).toBeInTheDocument();

        // We get a zero killed notification
        expect(
            await screen.findByText('ZERO KILLED 🔫🔫🔫🔪🔪🔪'),
        ).toBeInTheDocument();

        // Return to normal timers
        // Ref https://testing-library.com/docs/using-fake-timers/
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });
    it('We do not see price notifications if new price is at a new tens level in JPY per 1,000,000 XEC, because user fiat currency does not support zero killed notifications for JPY', async () => {
        jest.useFakeTimers();

        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        await localforage.setItem('settings', new CashtabSettings('jpy'));

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Advance timers more than the price interval
        act(() => {
            jest.advanceTimersByTime(appConfig.fiatUpdateIntervalMs + 1000);
        });

        // We DO NOT get a notification for a "tens" price milestone
        await waitFor(() =>
            expect(
                screen.queryByText('XEC is now $0.000042 USD'),
            ).not.toBeInTheDocument(),
        );

        // Advance timers more than the price interval
        act(() => {
            jest.advanceTimersByTime(appConfig.fiatUpdateIntervalMs + 1000);
        });

        // We DO NOT get a notification for a "tens" price milestone
        await waitFor(() =>
            expect(
                screen.queryByText('XEC is now $0.000111 USD'),
            ).not.toBeInTheDocument(),
        );

        // We DO NOT get a zero killed notification
        await waitFor(() =>
            expect(
                screen.queryByText('ZERO KILLED 🔫🔫🔫🔪🔪🔪'),
            ).not.toBeInTheDocument(),
        );

        // Return to normal timers
        // Ref https://testing-library.com/docs/using-fake-timers/
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });
});

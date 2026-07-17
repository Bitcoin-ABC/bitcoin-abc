// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FEE_SATS_PER_KB_XEC_MINIMUM } from 'constants/transactions';
import {
    freshWalletWithOneIncomingCashtabMsg,
    requiredUtxoThisToken,
    easterEggTokenChronikTokenDetails,
    validSavedWallets,
    walletWithXecAndTokensActive,
    walletWithXecAndTokensStored,
    validActiveWallets,
    freshWalletWithOneIncomingCashtabMsgTxs,
} from 'components/App/fixtures/mocks';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
import {
    clearLocalForage,
    initializeCashtabStateForTests,
    prepareMockedChronikCallsForWallet,
} from 'components/App/fixtures/helpers';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import { createCashtabWallet } from 'wallet';
import CashtabSettings from 'config/CashtabSettings';
import { Ecc, toHex } from 'ecash-lib';
import { MockAgora } from '../../../../../modules/mock-chronik-client';

describe('<App />', () => {
    const ecc = new Ecc();
    let user;
    beforeEach(async () => {
        // Clear localforage
        await localforage.clear();
        // Set up userEvent
        user = userEvent.setup();
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
        render(
            <CashtabTestWrapper ecc={ecc} chronik={mockedChronik} route="/" />,
        );

        // We see a spinner while the app loads
        expect(await screen.findByTitle('Loading...')).toBeInTheDocument();

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // We get the Onboarding screen (text may be split across elements)
        expect(
            await screen.findByText(/Welcome to Cashtab!/),
        ).toBeInTheDocument();
    });
    it('Renders onboarding screen at Receive route if user has no wallet', async () => {
        // This is the experience of a user visiting cashtab.com for the first time
        const mockedChronik = await initializeCashtabStateForTests(
            false,
            localforage,
        );
        render(
            <CashtabTestWrapper
                ecc={ecc}
                chronik={mockedChronik}
                route="/receive"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // We get the Onboarding screen (text may be split across elements)
        expect(
            await screen.findByText(/Welcome to Cashtab!/),
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
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // We get the Onboarding screen (text may be split across elements)
        expect(
            await screen.findByText(/Welcome to Cashtab!/),
        ).toBeInTheDocument();
    });
    it('Renders 404 at bad route if user has a wallet', async () => {
        // This is the experience of a user visiting cashtab.com for the first time
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(
            <CashtabTestWrapper chronik={mockedChronik} route="/not-a-route" />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // We get the Onboarding screen
        expect(await screen.findByText('Page not found')).toBeInTheDocument();
    });
    it('Navigation menu routes to expected components', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );

        // Set empty agora mocks so we can test proper routing to NFT market page on successful list
        const mockedAgora = new MockAgora();

        mockedAgora.setOfferedGroupTokenIds([]);

        // Also empty agora page for the same reason
        mockedAgora.setOfferedFungibleTokenIds([]);

        // activeOffersByPubKey
        // The test wallet is selling the Saturn V NFT
        const thisPublicKey = walletWithXecAndTokensActive.pk;
        mockedAgora.setActiveOffersByPubKey(toHex(thisPublicKey), []);

        // activeOffersByGroupTokenId does not need to be mocked since there are no offers here

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
            />,
        );

        // Default route is home
        await screen.findByTestId('tx-history');

        // Navigate to Send screen
        await user.click(
            screen.getByRole('button', {
                name: /Send Screen/i,
            }),
        );

        // Now we see the Send screen
        expect(
            screen.getByPlaceholderText('Address or contact'),
        ).toBeInTheDocument();

        // Navigate to eTokens screen
        await user.click(
            screen.getByRole('button', {
                name: /Tokens/i,
            }),
        );

        // Now we see the eTokens screen
        expect(screen.getByTitle('Wallet Tokens')).toBeInTheDocument();

        // Navigate to Agora screen (footer nav changed; hamburger menu commented out)
        await user.click(
            screen.getByRole('button', {
                name: /Agora/i,
            }),
        );

        // Now we see the Agora screen (ActionButtonRow has "Token Market Place")
        expect(screen.getByText('Token Market Place')).toBeInTheDocument();

        // Navigate to Tools (Contacts) screen
        await user.click(
            screen.getByRole('button', {
                name: /Tools/i,
            }),
        );

        // Now we see the Contacts screen
        expect(screen.getByTitle('Contacts')).toBeInTheDocument();

        // Navigate to Settings screen
        await user.click(
            screen.getByRole('button', {
                name: /Settings/i,
            }),
        );

        // Now we see the Settings screen (use Display Currency to avoid multiple Settings matches)
        expect(screen.getByText('Display Currency')).toBeInTheDocument();

        // Footer nav verified: Transactions, Send, Tokens, Agora, Tools, Settings
        // (Receive, Airdrop, Sign & Verify, Backup, Wallets, Rewards, NFTs are in commented-out hamburger)
    });
    it('Adding a contact to to a new contactList by clicking on tx history adds it to localforage and wallet context', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            freshWalletWithOneIncomingCashtabMsg,
            localforage,
            false,
            freshWalletWithOneIncomingCashtabMsgTxs,
        );

        render(<CashtabTestWrapper ecc={ecc} chronik={mockedChronik} />);

        // Wait for the page to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTitle('Balance XEC')).toHaveTextContent(
            '10,000.00',
        );

        // We see the home container
        await screen.findByTestId('tx-history');

        // Open the collapse of this tx in tx history to see the panel options
        // We can click anywhere on this tx
        await user.click(screen.getByText('Cashtab Msg'));

        // Confirm expected initial state of localforage
        const storedContacts = await localforage.getItem('contactList');
        expect(storedContacts).toStrictEqual(null);

        // Click the add to contacts button
        await user.click(screen.getByTitle('add-contact'));

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
            false,
            freshWalletWithOneIncomingCashtabMsgTxs,
        );
        // Populate the contactList
        const initialContactList = [
            {
                address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                name: 'echo',
            },
        ];
        await localforage.setItem('contactList', initialContactList);

        render(<CashtabTestWrapper ecc={ecc} chronik={mockedChronik} />);

        // Wait for the page to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTitle('Balance XEC')).toHaveTextContent(
            '10,000.00',
        );

        // We see the home container
        await screen.findByTestId('tx-history');

        // Open the collapse of this tx in tx history to see the panel options
        // We can click anywhere on this tx
        await user.click(screen.getByText('Cashtab Msg'));

        // Confirm expected initial state of localforage
        const storedContacts = await localforage.getItem('contactList');
        expect(storedContacts).toEqual(initialContactList);

        // Click the add to contacts button
        await user.click(screen.getByTitle('add-contact'));

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
            false,
            freshWalletWithOneIncomingCashtabMsgTxs,
        );
        const LEGACY_EMPTY_CONTACT_LIST = [{}];
        await localforage.setItem('contactList', LEGACY_EMPTY_CONTACT_LIST);

        render(<CashtabTestWrapper ecc={ecc} chronik={mockedChronik} />);

        // Wait for cashtabbootup, so that loadContactList has been called
        // Wallet-info is rendered
        expect(await screen.findByTitle('Wallet Info')).toBeInTheDocument();

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
            false,
            freshWalletWithOneIncomingCashtabMsgTxs,
        );

        // Render app on home screen
        render(<CashtabTestWrapper ecc={ecc} chronik={mockedChronik} />);

        // Wallet-info is rendered
        expect(await screen.findByTitle('Wallet Info')).toBeInTheDocument();

        // Balance is correct
        expect(await screen.findByTitle('Balance XEC')).toHaveTextContent(
            '10,000.00',
        );

        // We do not see the send screen before clicking the button
        await waitFor(() =>
            expect(
                screen.queryByPlaceholderText('Address or contact'),
            ).not.toBeInTheDocument(),
        );

        await user.click(screen.getByTitle('reply'));

        // Reply prefills the recipient (resolved) and dust amount
        expect(
            await screen.findByRole('status', {
                name: 'Recipient qph...72y',
            }),
        ).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Amount')).toHaveValue('5.46');
    });
    it('If Cashtab starts up with some settings keys missing, the missing keys are migrated to default values', async () => {
        // Note: this is what happens to existing users when we add a new key to cashtabState.settings
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );

        // Set settings with some keys missing
        const legacySettings = {
            fiatCurrency: 'gbp', // non-default value
            sendModal: true, // non-default value
            autoCameraOn: true,
            // no hideMessagesFromUnknownSenders
            // no balanceVisible
        };

        // Update localforage with these legacy settings
        await localforage.setItem('settings', legacySettings);

        render(<CashtabTestWrapper ecc={ecc} chronik={mockedChronik} />);

        // Confirm localforage has been updated and non-default values are preserved
        await waitFor(async () =>
            expect(await localforage.getItem('settings')).toEqual({
                ...legacySettings,
                hideMessagesFromUnknownSenders: false,
                balanceVisible: true,
                satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
                biometricLockEnabled: false,
                pushNotificationsEnabled: true,
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
            ...walletWithXecAndTokensActive,
            state: {
                ...walletWithXecAndTokensActive.state,
                slpUtxos: [
                    ...walletWithXecAndTokensActive.state.slpUtxos,
                    requiredEasterEggUtxo,
                ],
            },
        };

        const mockedChronik = await initializeCashtabStateForTests(
            walletWithEasterEggToken,
            localforage,
        );

        // Make sure the app can get this token's genesis info by calling a mock
        mockedChronik.setToken(
            EASTER_EGG_TOKENID,
            easterEggTokenChronikTokenDetails,
        );

        render(<CashtabTestWrapper ecc={ecc} chronik={mockedChronik} />);

        // We see the easter egg
        expect(await screen.findByAltText('tabcash')).toBeInTheDocument();
    });
    it('A new user can import a mnemonic of a wallet with a balance', async () => {
        // Initialize for new user with wallet = false, so localstorage gets defaults
        const mockedChronik = await initializeCashtabStateForTests(
            false,
            localforage,
        );

        // Prepare chronik mocks for expected utxo set to populate wallet
        prepareMockedChronikCallsForWallet(
            mockedChronik,
            walletWithXecAndTokensActive,
        );

        render(<CashtabTestWrapper ecc={ecc} chronik={mockedChronik} />);

        // We click the Import Wallet button
        await user.click(
            await screen.findByRole('button', {
                name: /Import Wallet/,
            }),
        );

        // A modal is opened with input for the mnemonic
        expect(
            screen.getByPlaceholderText('mnemonic (seed phrase)'),
        ).toBeInTheDocument();

        // The import button is disabled if no mnemonic is entered
        const importButton = screen.getByRole('button', {
            name: 'OK',
        });
        expect(importButton).toHaveAttribute('disabled');

        // We enter a valid mnemonic
        const VALID_MNEMONIC =
            'beauty shoe decline spend still weird slot snack coach flee between paper';
        await user.type(
            screen.getByPlaceholderText('mnemonic (seed phrase)'),
            VALID_MNEMONIC,
        );

        // The import button is no longer disabled
        expect(importButton).not.toHaveAttribute('disabled');

        // Click it
        await user.click(importButton);

        // The wallet must load from API calls
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        await waitFor(
            () => {
                expect(screen.getByTitle('Balance XEC')).toHaveTextContent(
                    '9,513.12',
                );
            },
            { timeout: 10000 },
        );

        // We are forwarded to the home screen after the wallet loads
        expect(await screen.findByTestId('tx-history')).toBeInTheDocument();

        // The imported wallet is in localforage
        const wallets = await localforage.getItem('wallets');

        expect(wallets).toEqual([
            { ...walletWithXecAndTokensStored, name: 'qqa...70g' },
        ]);

        // Apart from state, which is blank from createCashtabWallet,
        // the imported wallet matches what we get from createCashtabWallet
        const createdWallet = await createCashtabWallet(VALID_MNEMONIC);
        expect(wallets[0]).toEqual(createdWallet);
    });
    it('A user with all valid wallets stored at wallets key does not have any wallets migrated', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            [walletWithXecAndTokensActive, ...validActiveWallets],
            localforage,
        );

        render(<CashtabTestWrapper ecc={ecc} chronik={mockedChronik} />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait balance to be rendered correctly so we know Cashtab has loaded the wallet
        expect(await screen.findByTitle('Balance XEC')).toHaveTextContent(
            '9,513.12',
        );

        const walletsAfterLoad = await localforage.getItem('wallets');

        // Wallets are in place as expected
        expect(walletsAfterLoad).toEqual([
            walletWithXecAndTokensStored,
            ...validSavedWallets,
        ]);

        // We have the active wallet address stored at the activeWalletAddress key
        const activeWalletAddress = await localforage.getItem(
            'activeWalletAddress',
        );
        expect(activeWalletAddress).toEqual(
            walletWithXecAndTokensStored.address,
        );
    });
    it('We see a price notification if new price is at a new tens level in USD per 1,000,000 XEC, and a special notification if a zero is killed', async () => {
        jest.useFakeTimers();

        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );

        render(<CashtabTestWrapper ecc={ecc} chronik={mockedChronik} />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
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
            walletWithXecAndTokensActive,
            localforage,
        );

        await localforage.setItem('settings', new CashtabSettings('jpy'));

        render(<CashtabTestWrapper ecc={ecc} chronik={mockedChronik} />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
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

// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { walletWithXecAndTokens } from 'components/App/fixtures/mocks';
import { populatedContactList } from 'components/Configure/fixtures/mocks';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent, {
    PointerEventsCheckLevel,
} from '@testing-library/user-event';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
import {
    initializeCashtabStateForTests,
    prepareMockedChronikCallsForWallet,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import { validSavedWallets } from 'components/App/fixtures/mocks';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import * as bip39 from 'bip39';
import { cashtabWalletsFromJSON } from 'helpers';

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

// Mock bip39.generateMnemonic() so we can have a consistent test for wallet name
jest.mock('bip39', () => ({
    __esModule: true,
    ...jest.requireActual('bip39'),
    generateMnemonic: jest.fn(
        () =>
            'grant grass sock faculty behave guitar pepper tiger sustain task occur soon',
    ),
}));

describe('<Configure />', () => {
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
    it('We can add, delete, rename, contacts from the Configure screen, and add a savedWallet as a contact', async () => {
        // localforage defaults
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Custom contact list
        await localforage.setItem('contactList', populatedContactList);

        const savedWallet = validSavedWallets[0];

        // Add a new saved wallet that can be rendered
        const addedSavedWalletContact = {
            address: savedWallet.paths.get(1899).address,
            name: savedWallet.name,
        };
        await localforage.setItem('wallets', [
            walletWithXecAndTokens,
            savedWallet,
        ]);

        render(
            <CashtabTestWrapper chronik={mockedChronik} route="/configure" />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Configure component is rendered
        expect(screen.getByTestId('configure-ctn')).toBeInTheDocument();

        // Open the collapse
        await user.click(screen.getByRole('button', { name: /Contact List/ }), {
            // https://github.com/testing-library/user-event/issues/922
            pointerEventsCheck: PointerEventsCheckLevel.Never,
        });

        const addressToDelete =
            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';

        // We find the expected contacts
        await waitFor(() =>
            expect(screen.getByTestId('contact-list-items')).toHaveTextContent(
                `alpha${addressToDelete}betaecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035gammaecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72yDownloadCSVAddContact`,
            ),
        );

        // Click the first row Delete button
        await user.click(screen.getAllByTestId('delete-contact-btn')[0], {
            // https://github.com/testing-library/user-event/issues/922
            pointerEventsCheck: PointerEventsCheckLevel.Never,
        });

        // Type correct confirmation phrase in confirm delete modal
        await user.type(
            screen.getByPlaceholderText('Type "delete alpha" to confirm'),
            'delete alpha',
        );

        // Click OK
        await user.click(screen.getByText('OK'));

        // Confirm it has been removed from local storage
        const expectedContactsAfterRemovingAlpha = [
            {
                address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                name: 'beta',
            },
            {
                address: 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
                name: 'gamma',
            },
        ];
        const contactListAfterRemove = await localforage.getItem('contactList');
        expect(contactListAfterRemove).toEqual(
            expectedContactsAfterRemovingAlpha,
        );

        // Confirm notification is triggered
        await waitFor(() => {
            expect(
                screen.getByText(
                    `${addressToDelete} removed from Contact List`,
                ),
            ).toBeInTheDocument();
        });

        // Add a contact
        await user.click(screen.getByTestId('add-contact-btn'), {
            // https://github.com/testing-library/user-event/issues/922
            pointerEventsCheck: PointerEventsCheckLevel.Never,
        });

        const nameInput = screen.getByPlaceholderText('Enter new contact name');
        const addrInput = screen.getByPlaceholderText(
            'Enter new eCash address or alias',
        );
        const address = 'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0';
        await user.type(nameInput, 'delta');
        await user.type(addrInput, address);

        // Click OK
        await user.click(screen.getByText('OK'));

        // Confirm new contact is added in local storage
        const contactListAfterAdd = await localforage.getItem('contactList');
        expect(contactListAfterAdd).toEqual([
            {
                address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                name: 'beta',
            },
            {
                address: 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
                name: 'gamma',
            },
            {
                address: 'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0',
                name: 'delta',
            },
        ]);

        // Confirm add contact success notification is triggered
        await waitFor(() => {
            expect(
                screen.getByText(`${address} added to Contact List`),
            ).toBeInTheDocument();
        });

        // We get an error if we add a contact that already exists
        await user.click(screen.getByRole('button', { name: 'Add Contact' }), {
            // https://github.com/testing-library/user-event/issues/922
            pointerEventsCheck: PointerEventsCheckLevel.Never,
        });
        const nameInputRepeat = screen.getByPlaceholderText(
            'Enter new contact name',
        );
        const addrInputRepeat = screen.getByPlaceholderText(
            'Enter new eCash address or alias',
        );
        await user.type(nameInputRepeat, 'delta');
        await user.type(addrInputRepeat, address);

        // Click OK
        const okAddContactButtonAgain = screen.getByText('OK');
        await user.click(okAddContactButtonAgain);

        // Confirm error notification is triggered
        await waitFor(() => {
            expect(
                screen.getByText(
                    `${address} already exists in the Contact List`,
                ),
            ).toBeInTheDocument();
        });

        // We can rename a contact
        await user.click(screen.getAllByTestId('rename-contact-btn')[0], {
            // https://github.com/testing-library/user-event/issues/922
            pointerEventsCheck: PointerEventsCheckLevel.Never,
        });

        const editNameInput = screen.getByPlaceholderText(
            'Enter new contact name',
        );
        await user.type(editNameInput, 'omega');

        // Click OK
        const okRenameContactButton = screen.getByText('OK');
        await user.click(okRenameContactButton);

        // Confirm first contact (formerly beta) is renamed
        const contactListAfterRename = await localforage.getItem('contactList');
        expect(contactListAfterRename).toEqual([
            {
                address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                name: 'omega',
            },
            {
                address: 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
                name: 'gamma',
            },
            {
                address: 'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0',
                name: 'delta',
            },
        ]);

        // No notification expected for successfully renaming a contact

        // We can add a savedWallet as a contact

        // Note the savedWallets collapse loads expanded

        // We see expected saved wallets
        expect((await screen.findAllByText('alpha'))[1]).toBeInTheDocument();

        // Click button to add this saved wallet to contacts
        await user.click(
            screen.getAllByTestId('add-saved-wallet-to-contact-btn')[0],
        );

        // Raises a confirm modal. Click OK.
        await user.click(screen.getByText('OK'));

        // Confirm new wallet added to contacts
        await waitFor(async () =>
            expect(await localforage.getItem('contactList')).toEqual(
                contactListAfterRename.concat(addedSavedWalletContact),
            ),
        );

        // Confirm add contact notification is triggered
        await waitFor(() => {
            expect(
                screen.getByText(
                    `${addedSavedWalletContact.address} added to Contact List`,
                ),
            ).toBeInTheDocument();
        });
    });
    it('Confirm mocked bip39.generateMnemonic() returns the expected seed', () => {
        expect(bip39.generateMnemonic()).toBe(
            'grant grass sock faculty behave guitar pepper tiger sustain task occur soon',
        );
    });
    it('We can rename the active wallet or a saved wallet, we can add a wallet, we can import a wallet, we can delete a wallet', async () => {
        // localforage defaults
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Add 5 valid saved wallets with no state
        await localforage.setItem(
            'wallets',
            [walletWithXecAndTokens].concat(validSavedWallets),
        );

        const walletToBeActivatedLaterInTest = validSavedWallets.find(
            wallet => wallet.name === 'bravo',
        );

        // Mock utxos for wallet we will activate
        prepareMockedChronikCallsForWallet(
            mockedChronik,
            walletToBeActivatedLaterInTest,
        );

        render(
            <CashtabTestWrapper chronik={mockedChronik} route="/configure" />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // Note, the savedWallets collapse loads open by default

        // We see expected saved wallets
        // Note, we see these in the wallet header dropdown and in the savedWallets list
        expect((await screen.findAllByText('alpha'))[1]).toBeInTheDocument();
        expect((await screen.findAllByText('bravo'))[1]).toBeInTheDocument();
        expect((await screen.findAllByText('charlie'))[1]).toBeInTheDocument();
        expect((await screen.findAllByText('delta'))[1]).toBeInTheDocument();
        expect((await screen.findAllByText('echo'))[1]).toBeInTheDocument();

        // Let's rename alpha. Its button will be the first in the list.
        await user.click(screen.getAllByTestId('rename-saved-wallet')[0]);

        // We see a modal.
        expect(
            await screen.findByText('Editing name for wallet "alpha"'),
        ).toBeInTheDocument();

        // Try to rename it to an already existing name
        await user.type(
            await screen.findByPlaceholderText('Enter new wallet name'),
            'bravo',
        );

        // Click ok
        await user.click(screen.getByRole('button', { name: 'OK' }));

        // We see an error modal
        expect(
            await screen.findByText(
                'Rename failed. All wallets must have a unique name.',
            ),
        ).toBeInTheDocument();

        // alpha is still named alpha
        expect((await screen.findAllByText('alpha'))[1]).toBeInTheDocument();

        // We give it an available name
        await user.click(screen.getAllByTestId('rename-saved-wallet')[0]);

        // Text input field is empty
        expect(
            await screen.findByPlaceholderText('Enter new wallet name'),
        ).toHaveValue('');

        await user.type(
            await screen.findByPlaceholderText('Enter new wallet name'),
            'ALPHA PRIME',
        );

        // Click ok
        await user.click(screen.getByRole('button', { name: 'OK' }));

        // We get a confirmation modal
        expect(
            await screen.findByText('Wallet "alpha" renamed to "ALPHA PRIME"'),
        ).toBeInTheDocument();

        // The wallet has been renamed
        expect(
            (await screen.findAllByText('ALPHA PRIME'))[1],
        ).toBeInTheDocument();

        // Now let's rename the active wallet
        await user.click(screen.getByTestId('rename-active-wallet'));

        await user.type(
            await screen.findByPlaceholderText('Enter new wallet name'),
            'ACTIVE WALLET',
        );

        // Click ok
        await user.click(screen.getByRole('button', { name: 'OK' }));

        // We get a confirmation modal
        expect(
            await screen.findByText(
                'Wallet "Transaction Fixtures" renamed to "ACTIVE WALLET"',
            ),
        ).toBeInTheDocument();

        // The wallet has been renamed. The new name is updated in all locations.
        const activeWalletLabels = await screen.findAllByText('ACTIVE WALLET');
        const EXPECTED_ACTIVE_WALLET_LABELS_IN_DOCUMENT = 2;
        expect(activeWalletLabels.length).toBe(
            EXPECTED_ACTIVE_WALLET_LABELS_IN_DOCUMENT,
        );

        // We can delete a wallet
        // Delete the first wallet in the savedWallets list
        await user.click(screen.getAllByTestId('delete-saved-wallet')[0]);

        // We see a confirmation modal
        expect(
            await screen.findByText(
                `Delete wallet "ALPHA PRIME"?. This cannot be undone. Make sure you have backed up your wallet.`,
            ),
        ).toBeInTheDocument();

        // Type deletion confirmation
        await user.type(
            screen.getByPlaceholderText(`Type "delete ALPHA PRIME" to confirm`),
            `delete ALPHA PRIME`,
        );

        // Click ok to delete the wallet
        await user.click(screen.getByRole('button', { name: 'OK' }));

        // We get a modal confirming successful wallet deletion
        expect(
            await screen.findByText(
                'Wallet "ALPHA PRIME" successfully deleted',
            ),
        ).toBeInTheDocument();

        // wallet ALPHA PRIME is no longer in savedWallets list
        await waitFor(() =>
            expect(screen.queryByText('ALPHA PRIME')).not.toBeInTheDocument(),
        );

        // nor is it in localforage
        const walletsNow = cashtabWalletsFromJSON(
            await localforage.getItem('wallets'),
        );

        const expectedWalletsNow = [
            ...[walletWithXecAndTokens].concat(validSavedWallets),
        ];
        // The active wallet has been renamed
        expectedWalletsNow[0].name = 'ACTIVE WALLET';
        // We no longer have wallet alpha -- delete it
        const alphaIndex = expectedWalletsNow.findIndex(
            wallet => wallet.name === 'alpha',
        );
        expectedWalletsNow.splice(alphaIndex, 1);
        expect(walletsNow).toEqual(expectedWalletsNow);

        // We can add a wallet without specifying any mnemonic
        await user.click(
            screen.getByRole('button', {
                name: /New Wallet/,
            }),
        );

        // Wallet added success modal
        expect(
            await screen.findByText(
                `New wallet "qrj4p" added to your saved wallets`,
            ),
        ).toBeInTheDocument();

        // We see the new wallet
        expect((await screen.findAllByText('qrj4p'))[1]).toBeInTheDocument();

        // It is added to the end of the wallets array
        // It will be organized alphabetically when the user refreshes and loadCashtabState runs
        // We want it added at the end so it's easy for a user to see what wallet was just added
        const walletsAfterAdd = await localforage.getItem('wallets');
        expect(walletsAfterAdd[walletsAfterAdd.length - 1].name).toBe('qrj4p');

        // We can import a wallet by specifying a mnemonic
        await user.click(
            screen.getByRole('button', {
                name: /Import Wallet/, // name is "import Import Wallet" as icon is included, more antd weirdness
            }),
        );

        // We see import input field and prompt
        expect(
            screen.getByText(
                'Copy and paste your mnemonic seed phrase below to import an existing wallet',
            ),
        ).toBeInTheDocument();

        // Import button is disabled
        const importBtn = screen.getByRole('button', {
            name: 'Import',
        });
        expect(importBtn).toHaveAttribute('disabled');

        // Type in most of a mnemonic
        await user.type(
            screen.getByPlaceholderText('mnemonic (seed phrase)'),
            'pioneer waste next tired armed course expand stairs load brick asthma ',
        );
        // The validation msg is in the document
        expect(
            screen.getByText('Valid mnemonic seed phrase required'),
        ).toBeInTheDocument();

        // Type in the rest
        await user.type(
            screen.getByPlaceholderText('mnemonic (seed phrase)'),
            'budget',
        );

        // The validation msg is not in the document
        expect(
            screen.queryByText('Valid mnemonic seed phrase required'),
        ).not.toBeInTheDocument();

        // The button is not disabled
        expect(importBtn).not.toHaveAttribute('disabled');

        // Click import
        await user.click(importBtn);

        // Wallet imported success modal
        expect(
            await screen.findByText(
                `New imported wallet "qzxep" added to your saved wallets`,
            ),
        ).toBeInTheDocument();

        // We see the new wallet
        expect((await screen.findAllByText('qzxep'))[1]).toBeInTheDocument();

        // It is added to the end of the wallets array
        // It will be organized alphabetically when the user refreshes and loadCashtabState runs
        // We want it added at the end so it's easy for a user to see what wallet was just added
        const walletsAfterImport = await localforage.getItem('wallets');
        expect(walletsAfterImport[walletsAfterImport.length - 1].name).toBe(
            'qzxep',
        );

        // Wait for mnemonic input to be cleared
        await waitFor(() =>
            expect(
                screen.getByPlaceholderText('mnemonic (seed phrase)'),
            ).toHaveValue(''),
        );

        // If we try to import the same wallet again, we get an error and wallets is unchanged
        await user.type(
            screen.getByPlaceholderText('mnemonic (seed phrase)'),
            'pioneer waste next tired armed course expand stairs load brick asthma budget',
        );

        // The button is not disabled
        expect(importBtn).not.toHaveAttribute('disabled');

        // Click import
        await user.click(importBtn);

        // Wallet imported failure modal
        expect(
            await screen.findByText(
                `Cannot import: wallet already exists (name: "qzxep")`,
            ),
        ).toBeInTheDocument();

        // We can change the active wallet

        // Activate the first wallet in the list
        // Since ALPHA PRIME has been deleted, "bravo" is the first wallet in the list
        await user.click(
            screen.getAllByRole('button', { name: 'Activate' })[0],
        );

        // Now "bravo" is the active wallet
        const newActiveWalletLabels = await screen.findAllByText('bravo');
        expect(newActiveWalletLabels.length).toBe(
            EXPECTED_ACTIVE_WALLET_LABELS_IN_DOCUMENT,
        );

        // If we try to add a wallet that has the same name as an already existing wallet
        // We get an error modal

        // We can add a wallet without specifying any mnemonic
        // Since we already did this earlier in the test, and we have mocked generateMnemonic() in this test,
        // we will get the same wallet that already exists
        // Confirm this edge case is not allowed
        await user.click(
            screen.getByRole('button', {
                name: /New Wallet/,
            }),
        );

        // We get the once-in-a-blue-moon modal error
        expect(
            await screen.findByText(
                `By a vanishingly small chance, "qrj4p" already existed in saved wallets. Please try again.`,
            ),
        ).toBeInTheDocument();
    });
});

// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import {
    walletWithXecAndTokensActive,
    populatedContactList,
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
    prepareMockedChronikCallsForWallet,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import {
    validActiveWallets,
    validSavedWallets,
} from 'components/App/fixtures/mocks';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import { generateMnemonic } from 'wallet';
import { Ecc } from 'ecash-lib';

// Mock wallet.generateMnemonic() only for this test file
// This ensures a consistent mnemonic for the duplicate-seed edge case
jest.mock('wallet', () => {
    const actual = jest.requireActual('wallet');
    return {
        ...actual,
        generateMnemonic: jest.fn(
            () =>
                'grant grass sock faculty behave guitar pepper tiger sustain task occur soon',
        ),
    };
});

describe('<Wallets />', () => {
    const ecc = new Ecc();
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
    });
    afterEach(async () => {
        jest.clearAllMocks();
        await clearLocalForage(localforage);
    });
    it('We can add a savedWallet as a contact', async () => {
        // localforage defaults
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );

        // Custom contact list
        await localforage.setItem('contactList', populatedContactList);

        const savedWallet = validSavedWallets[0];

        // Add a new saved wallet that can be rendered
        const addedSavedWalletContact = {
            address: savedWallet.address,
            name: savedWallet.name,
        };
        await localforage.setItem('wallets', [
            walletWithXecAndTokensActive,
            savedWallet,
        ]);

        render(<CashtabTestWrapper chronik={mockedChronik} route="/wallets" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // We can add a savedWallet as a contact

        // We see expected saved wallets
        expect((await screen.findAllByText('alpha'))[1]).toBeInTheDocument();

        // Click button to add this saved wallet to contacts
        await user.click(
            screen.getByRole('button', {
                name: /Add alpha to contacts/i,
            }),
        );

        // Confirm new wallet added to contacts
        await waitFor(async () =>
            expect(await localforage.getItem('contactList')).toEqual(
                populatedContactList.concat(addedSavedWalletContact),
            ),
        );

        expect(
            await screen.findByText(
                `${addedSavedWalletContact.name} (${addedSavedWalletContact.address}) added to Contact List`,
            ),
        ).toBeInTheDocument();
    });
    it('We can copy the address of a savedWallet to the clipboard', async () => {
        // localforage defaults
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );

        // Custom contact list
        await localforage.setItem('contactList', populatedContactList);

        const savedWallet = validActiveWallets[0];

        await localforage.setItem('wallets', [
            walletWithXecAndTokensActive,
            savedWallet,
        ]);

        render(<CashtabTestWrapper chronik={mockedChronik} route="/wallets" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Click button to add this saved wallet to contacts
        await user.click(
            screen.getByRole('button', {
                name: /Copy address of alpha/i,
            }),
        );

        // Confirm copy success swaps the icon to a check
        await waitFor(() => {
            expect(screen.getByTitle('check')).toBeInTheDocument();
            expect(
                screen.getByRole('button', { name: 'Copied' }),
            ).toBeInTheDocument();
        });
    });
    it('Confirm mocked generateMnemonic() returns the expected seed', () => {
        expect(generateMnemonic()).toBe(
            'grant grass sock faculty behave guitar pepper tiger sustain task occur soon',
        );
    });
    it('We can add an HD wallet from the wallets page', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );

        render(
            <CashtabTestWrapper
                ecc={ecc}
                chronik={mockedChronik}
                route="/wallets"
            />,
        );

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        await user.click(
            screen.getByRole('button', {
                name: /New HD Wallet/,
            }),
        );

        expect(await screen.findByText('New HD wallet')).toBeInTheDocument();
        const newHdWalletNameInput = screen.getByPlaceholderText(
            'Enter a name for this HD wallet',
        );
        await user.type(newHdWalletNameInput, 'HD Savings');
        await user.click(screen.getByText('OK'));

        expect(
            await screen.findByText(
                `New HD wallet “HD Savings” added to wallets`,
            ),
        ).toBeInTheDocument();

        // HD badge is shown next to the new wallet name
        expect(screen.getByText('HD')).toBeInTheDocument();

        const walletsAfterHdAdd = await localforage.getItem('wallets');
        const addedHdWallet = walletsAfterHdAdd.find(
            wallet => wallet.name === 'HD Savings',
        );
        expect(addedHdWallet).toBeDefined();
        expect(addedHdWallet.hd).toBe(true);
        expect(addedHdWallet.accountNumber).toBe(0);
        expect(addedHdWallet.receiveIndex).toBe(0);
        expect(addedHdWallet.changeIndex).toBe(0);
    });
    it('We can rename the active wallet or a saved wallet, we can add a wallet, we can import a wallet, we can delete a wallet', async () => {
        // localforage defaults
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );

        // Add 5 valid saved wallets with no state
        await localforage.setItem(
            'wallets',
            [walletWithXecAndTokensActive].concat(validSavedWallets),
        );

        const walletToBeActivatedLaterInTest = validActiveWallets.find(
            wallet => wallet.name === 'bravo',
        );

        // Mock utxos for wallet we will activate
        prepareMockedChronikCallsForWallet(
            mockedChronik,
            walletToBeActivatedLaterInTest,
        );

        render(
            <CashtabTestWrapper
                ecc={ecc}
                chronik={mockedChronik}
                route="/wallets"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // We see expected saved wallets
        // Note, we see these in the wallet header dropdown and in the savedWallets list
        expect((await screen.findAllByText('alpha'))[1]).toBeInTheDocument();
        expect((await screen.findAllByText('bravo'))[1]).toBeInTheDocument();
        expect((await screen.findAllByText('charlie'))[1]).toBeInTheDocument();
        expect((await screen.findAllByText('delta'))[1]).toBeInTheDocument();
        expect((await screen.findAllByText('echo'))[1]).toBeInTheDocument();

        // Let's rename alpha. Its button will be the second edit button, as the first is for the active wallet.
        await user.click(
            screen.getByRole('button', {
                name: /Rename alpha/i,
            }),
        );

        // We see a modal.
        expect(await screen.findByText(`Rename “alpha”?`)).toBeInTheDocument();

        // Try to rename it to an already existing name
        await user.type(
            screen.getByPlaceholderText('Enter new wallet name'),
            'bravo',
        );

        // We see expected validation error
        expect(
            screen.getByText(`Wallet name “bravo” already exists`),
        ).toBeInTheDocument();

        // Rename OK button is disabled
        expect(screen.getByText('OK')).toHaveProperty('disabled', true);

        // Clear the input
        await user.clear(screen.getByPlaceholderText('Enter new wallet name'));

        await user.type(
            await screen.findByPlaceholderText('Enter new wallet name'),
            'ALPHA PRIME',
        );

        // Click ok
        await user.click(screen.getByRole('button', { name: 'OK' }));

        // We get a confirmation modal
        expect(
            await screen.findByText('“alpha” renamed to “ALPHA PRIME”'),
        ).toBeInTheDocument();

        // The wallet has been renamed
        expect(
            (await screen.findAllByText('ALPHA PRIME'))[1],
        ).toBeInTheDocument();

        // Now let's rename the active wallet
        await user.click(
            screen.getByRole('button', {
                name: /Rename Transaction Fixtures/i,
            }),
        );

        await user.type(
            await screen.findByPlaceholderText('Enter new wallet name'),
            'ACTIVE WALLET',
        );

        // Click ok
        await user.click(screen.getByRole('button', { name: 'OK' }));

        // We get a confirmation modal
        expect(
            await screen.findByText(
                '“Transaction Fixtures” renamed to “ACTIVE WALLET”',
            ),
        ).toBeInTheDocument();

        // The wallet has been renamed. The new name is updated in all locations.
        const activeWalletLabels = await screen.findAllByText('ACTIVE WALLET');
        const EXPECTED_ACTIVE_WALLET_LABELS_IN_DOCUMENT = 2;
        expect(activeWalletLabels).toHaveLength(
            EXPECTED_ACTIVE_WALLET_LABELS_IN_DOCUMENT,
        );

        // We can delete a wallet
        // Delete the first wallet in the savedWallets list
        // It's the first appearance of the trashcan button bc we do not support deleting the active wallet
        await user.click(
            screen.getByRole('button', {
                name: /Delete ALPHA PRIME/i,
            }),
        );

        // We see a confirmation modal
        expect(
            await screen.findByText(`Delete “ALPHA PRIME”?`),
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
            await screen.findByText('“ALPHA PRIME” deleted'),
        ).toBeInTheDocument();

        // wallet ALPHA PRIME is no longer in savedWallets list
        await waitFor(() =>
            expect(screen.queryByText('ALPHA PRIME')).not.toBeInTheDocument(),
        );

        // nor is it in localforage
        const walletsNow = await localforage.getItem('wallets');

        const activeWalletAddress = await localforage.getItem(
            'activeWalletAddress',
        );

        const renamedWallet = walletsNow.find(
            wallet => wallet.name === 'ACTIVE WALLET',
        );
        expect(renamedWallet).toBeDefined();
        expect(renamedWallet.address).toBe(activeWalletAddress);

        // We can add a wallet after naming it
        await user.click(
            screen.getByRole('button', {
                name: /New Wallet/,
            }),
        );

        // We see the new wallet name modal
        expect(await screen.findByText('New wallet')).toBeInTheDocument();
        const newWalletNameInput = screen.getByPlaceholderText(
            'Enter a name for this wallet',
        );
        const newWalletOkBtn = screen.getByRole('button', { name: 'OK' });
        expect(newWalletOkBtn).toHaveProperty('disabled', true);

        // Reject duplicate names
        await user.type(newWalletNameInput, 'bravo');
        expect(
            screen.getByText(`Wallet name “bravo” already exists`),
        ).toBeInTheDocument();
        expect(newWalletOkBtn).toHaveProperty('disabled', true);

        await user.clear(newWalletNameInput);
        await user.type(newWalletNameInput, 'Savings');
        expect(newWalletOkBtn).toHaveProperty('disabled', false);

        await user.click(newWalletOkBtn);

        // Wallet added success notification
        expect(
            await screen.findByText(`New wallet “Savings” added to wallets`),
        ).toBeInTheDocument();

        // We see the new wallet by its chosen name
        expect((await screen.findAllByText('Savings'))[1]).toBeInTheDocument();

        // It is stored with the user-chosen name
        const walletsAfterAdd = await localforage.getItem('wallets');
        expect(walletsAfterAdd.some(wallet => wallet.name === 'Savings')).toBe(
            true,
        );
        // Default new wallets are single-address (not HD)
        expect(walletsAfterAdd[walletsAfterAdd.length - 1].hd).toBeUndefined();

        // We can import a wallet by specifying a name and mnemonic
        await user.click(
            screen.getByRole('button', {
                name: /Import Wallet/,
            }),
        );

        // We see import modal with name + mnemonic fields
        expect(
            screen.getByPlaceholderText('Enter a name for this wallet'),
        ).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText('mnemonic (seed phrase)'),
        ).toBeInTheDocument();

        // Import button is disabled until both name and mnemonic are valid
        const importBtn = screen.getByRole('button', {
            name: 'OK',
        });
        expect(importBtn).toHaveProperty('disabled', true);

        await user.type(
            screen.getByPlaceholderText('Enter a name for this wallet'),
            'Imported Wallet',
        );

        // Still disabled without a valid mnemonic
        expect(importBtn).toHaveProperty('disabled', true);

        // Type in most of a mnemonic
        await user.type(
            screen.getByPlaceholderText('mnemonic (seed phrase)'),
            'pioneer waste next tired armed course expand stairs load brick asthma ',
        );
        // The validation msg is in the document
        expect(
            screen.getByText(
                'Invalid 12-word mnemonic. Note: all letters must be lowercase.',
            ),
        ).toBeInTheDocument();

        // Type in the rest
        await user.type(
            screen.getByPlaceholderText('mnemonic (seed phrase)'),
            'budget',
        );

        // The validation msg is not in the document
        expect(
            screen.queryByText(
                'Invalid 12-word mnemonic. Note: all letters must be lowercase.',
            ),
        ).not.toBeInTheDocument();

        // The button is not disabled
        expect(importBtn).toHaveProperty('disabled', false);

        // Click import
        await user.click(importBtn);

        // Wallet imported success toast
        expect(
            await screen.findByText(
                `New imported wallet “Imported Wallet” added to your saved wallets`,
            ),
        ).toBeInTheDocument();

        // The modal is no longer with us
        expect(
            screen.queryByPlaceholderText('mnemonic (seed phrase)'),
        ).not.toBeInTheDocument();

        // We see the new wallet by its chosen name
        expect(
            (await screen.findAllByText('Imported Wallet'))[1],
        ).toBeInTheDocument();

        // It is stored with the user-chosen name
        const walletsAfterImport = await localforage.getItem('wallets');
        expect(
            walletsAfterImport.some(
                wallet => wallet.name === 'Imported Wallet',
            ),
        ).toBe(true);

        // The modal will be closed after a successful import
        await waitFor(() =>
            expect(
                screen.queryByPlaceholderText('mnemonic (seed phrase)'),
            ).not.toBeInTheDocument(),
        );

        // Bring up the import modal again
        await user.click(
            screen.getByRole('button', {
                name: /Import Wallet/,
            }),
        );

        // If we try to import the same wallet again, we get an error and wallets is unchanged
        await user.type(
            screen.getByPlaceholderText('Enter a name for this wallet'),
            'Another Name',
        );
        await user.type(
            screen.getByPlaceholderText('mnemonic (seed phrase)'),
            'pioneer waste next tired armed course expand stairs load brick asthma budget',
        );

        // It is a new import button now
        const newImportButton = screen.getByRole('button', {
            name: 'OK',
        });

        // The button is not disabled
        expect(newImportButton).toHaveProperty('disabled', false);

        // Click import
        await user.click(newImportButton);

        // Wallet imported failure toast (reports the existing wallet's name)
        expect(
            await screen.findByText(
                `Cannot import: wallet already exists (name: “Imported Wallet”)`,
            ),
        ).toBeInTheDocument();

        // Close the import modal before creating another wallet
        await user.click(screen.getByRole('button', { name: 'Cancel' }));
        await waitFor(() =>
            expect(
                screen.queryByPlaceholderText('mnemonic (seed phrase)'),
            ).not.toBeInTheDocument(),
        );

        // We can change the active wallet

        // Activate bravo
        // Since ALPHA PRIME has been deleted, "bravo" is the first wallet in the list
        await user.click(
            screen.getByRole('button', { name: /Activate bravo/ }),
        );

        // Now "bravo" is the active wallet
        const newActiveWalletLabels = await screen.findAllByText('bravo');
        expect(newActiveWalletLabels).toHaveLength(
            EXPECTED_ACTIVE_WALLET_LABELS_IN_DOCUMENT,
        );

        // If we try to create another wallet from the same mocked mnemonic, reject it
        await user.click(
            screen.getByRole('button', {
                name: /New Wallet/,
            }),
        );

        await user.type(
            await screen.findByPlaceholderText('Enter a name for this wallet'),
            'Duplicate Seed',
        );
        await user.click(screen.getByRole('button', { name: 'OK' }));

        // We get the once-in-a-blue-moon modal error
        expect(
            await screen.findByText(
                `By a vanishingly small chance, this wallet already existed in saved wallets. Please try again.`,
            ),
        ).toBeInTheDocument();
    });

    it('Deleting the active wallet while other wallets exist activates the next wallet in the list and does not show onboarding', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );

        await localforage.setItem('wallets', [
            walletWithXecAndTokensActive,
            ...validSavedWallets,
        ]);

        const alphaWalletForChronik = validActiveWallets.find(
            wallet => wallet.name === 'alpha',
        );
        prepareMockedChronikCallsForWallet(
            mockedChronik,
            alphaWalletForChronik,
        );

        render(
            <CashtabTestWrapper
                ecc={ecc}
                chronik={mockedChronik}
                route="/wallets"
            />,
        );

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );
        // App still shows Spinner (title Loading...) until UTXO sync completes
        await waitFor(() =>
            expect(screen.queryByTitle('Loading...')).not.toBeInTheDocument(),
        );

        expect(
            screen.queryByText(/Welcome to Cashtab/),
        ).not.toBeInTheDocument();

        await user.click(
            await screen.findByRole('button', {
                name: /Delete Transaction Fixtures/i,
            }),
        );

        expect(
            await screen.findByText(`Delete “Transaction Fixtures”?`),
        ).toBeInTheDocument();

        await user.type(
            screen.getByPlaceholderText(
                `Type "delete Transaction Fixtures" to confirm`,
            ),
            'delete Transaction Fixtures',
        );

        await user.click(screen.getByRole('button', { name: 'OK' }));

        expect(
            await screen.findByText('“Transaction Fixtures” deleted'),
        ).toBeInTheDocument();

        const expectedNextActive = validSavedWallets[0];
        await waitFor(async () => {
            expect(await localforage.getItem('activeWalletAddress')).toBe(
                expectedNextActive.address,
            );
        });

        const walletsAfter = await localforage.getItem('wallets');
        expect(walletsAfter).toHaveLength(validSavedWallets.length);
        expect(walletsAfter.some(w => w.name === 'Transaction Fixtures')).toBe(
            false,
        );

        expect(
            screen.queryByText(/Welcome to Cashtab/),
        ).not.toBeInTheDocument();

        const alphaActiveLabels = await screen.findAllByText('alpha');
        expect(alphaActiveLabels.length).toBeGreaterThanOrEqual(1);
    });
});

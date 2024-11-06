// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import {
    walletWithXecAndTokens,
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
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import { validSavedWallets } from 'components/App/fixtures/mocks';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';

// Mock bip39.generateMnemonic() so we can have a consistent test for wallet name
jest.mock('bip39', () => ({
    __esModule: true,
    ...jest.requireActual('bip39'),
    generateMnemonic: jest.fn(
        () =>
            'grant grass sock faculty behave guitar pepper tiger sustain task occur soon',
    ),
}));

describe('<Contacts />', () => {
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
    it('We can add, delete, rename, contacts from the Configure screen, and add a savedWallet as a contact', async () => {
        // localforage defaults
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Custom contact list
        await localforage.setItem('contactList', populatedContactList);

        const savedWallet = validSavedWallets[0];

        await localforage.setItem('wallets', [
            walletWithXecAndTokens,
            savedWallet,
        ]);

        render(
            <CashtabTestWrapper chronik={mockedChronik} route="/contacts" />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Contacts component is rendered
        expect(screen.getByTitle('Contacts')).toBeInTheDocument();

        // We can copy a contact's address to the clipboard
        await user.click(
            screen.getByRole('button', {
                name: /Copy alpha/i,
            }),
        );

        // Confirm copy success notification is triggered
        await waitFor(() => {
            expect(
                screen.getByText(
                    `"ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6" copied to clipboard`,
                ),
            ).toBeInTheDocument();
        });

        // Delete the first saved wallet, "alpha"
        await user.click(
            screen.getByRole('button', {
                name: /Delete alpha/i,
            }),
        );

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
                screen.getByText(`"alpha" removed from Contacts`),
            ).toBeInTheDocument();
        });

        // Add a contact
        await user.click(screen.getByRole('button', { name: 'Add Contact' }));

        const nameInput = screen.getByPlaceholderText('Enter contact name');
        const addrInput = screen.getByPlaceholderText(
            'Enter new eCash address',
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
                screen.getByText(`"delta" (${address}) added to Contacts`),
            ).toBeInTheDocument();
        });

        // We are blocked by validation if we try to add a contact that already exists
        await user.click(screen.getByRole('button', { name: 'Add Contact' }));
        const nameInputRepeat =
            screen.getByPlaceholderText('Enter contact name');
        const addrInputRepeat = screen.getByPlaceholderText(
            'Enter new eCash address',
        );
        await user.type(nameInputRepeat, 'delta');
        await user.type(addrInputRepeat, address);

        // OK is disabled and we have a validation error
        const okAddContactButtonAgain = screen.getByText('OK');
        expect(okAddContactButtonAgain).toHaveProperty('disabled', true);

        expect(
            screen.getByText(
                `${address.slice(6, 9)}...${address.slice(
                    -3,
                )} already in Contacts`,
            ),
        ).toBeInTheDocument();

        // Close this modal
        await user.click(screen.getByText('Cancel'));

        // We can rename a contact
        await user.click(
            screen.getByRole('button', {
                name: /Rename beta/i,
            }),
        );

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

        // Confirm rename success notification is triggered
        await waitFor(() => {
            expect(
                screen.getByText(`"beta" renamed to "omega"`),
            ).toBeInTheDocument();
        });
    });
    it('We can send a tx to an address in contacts', async () => {
        // localforage defaults
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Custom contact list
        await localforage.setItem('contactList', populatedContactList);

        render(
            <CashtabTestWrapper chronik={mockedChronik} route="/contacts" />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Click the first row Send button
        await user.click(
            screen.getByRole('link', {
                name: /Send to alpha/i,
            }),
        );

        // Now we are on the SendXec page and the address field is filled out
        expect(screen.getByPlaceholderText('Address')).toHaveValue(
            populatedContactList[0].address,
        );
    });
});

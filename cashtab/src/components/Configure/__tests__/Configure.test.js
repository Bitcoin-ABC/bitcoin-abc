import React from 'react';
import {
    walletWithXecAndTokens,
    populatedContactList,
} from '../fixtures/mocks';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent, {
    PointerEventsCheckLevel,
} from '@testing-library/user-event';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
import { initializeCashtabStateForTests } from 'components/fixtures/helpers';
import CashtabTestWrapper from 'components/fixtures/CashtabTestWrapper';

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
    beforeEach(() => {
        // Mock the fetch call Cashtab's price API
        global.fetch = jest.fn();
        const fiatCode = 'usd'; // Use usd until you mock getting settings from localforage
        const cryptoId = appConfig.coingeckoId;
        // Keep this in the code, because different URLs will have different outputs require different parsing
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
        await localforage.clear();
    });
    it('We can add, delete, rename, contacts from the Configure screen, and add a savedWallet as a contact', async () => {
        // localforage defaults
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Custom contact list
        await localforage.setItem('contactList', populatedContactList);

        // Add a new saved wallet that can be rendered
        const addedSavedWalletContact = {
            // IFP
            address: 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
            name: 'addedSavedWallet',
        };
        await localforage.setItem('savedWallets', [
            walletWithXecAndTokens,
            {
                name: addedSavedWalletContact.name,
                Path1899: {
                    cashAddress: addedSavedWalletContact.address,
                },
            },
        ]);

        render(
            <CashtabTestWrapper chronik={mockedChronik} route="/configure" />,
        );

        // Configure component is rendered
        expect(screen.getByTestId('configure-ctn')).toBeInTheDocument();

        // Open the collapse
        await userEvent.click(
            screen.getByRole('button', { name: /Contact List/ }),
            {
                // https://github.com/testing-library/user-event/issues/922
                pointerEventsCheck: PointerEventsCheckLevel.Never,
            },
        );

        const addressToDelete =
            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';

        // We find the expected contacts
        await waitFor(() =>
            expect(screen.getByTestId('contact-list-items')).toHaveTextContent(
                `alpha${addressToDelete}betaecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035gammaecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72yDownloadCSVAddContact`,
            ),
        );

        // Click the first row Delete button
        await userEvent.click(screen.getAllByTestId('delete-contact-btn')[0], {
            // https://github.com/testing-library/user-event/issues/922
            pointerEventsCheck: PointerEventsCheckLevel.Never,
        });

        // Type correct confirmation phrase in confirm delate modal
        await userEvent.type(
            screen.getByPlaceholderText('Type "delete alpha" to confirm'),
            'delete alpha',
        );

        // Click OK
        await userEvent.click(screen.getByText('OK'));

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
        await userEvent.click(screen.getByTestId('add-contact-btn'), {
            // https://github.com/testing-library/user-event/issues/922
            pointerEventsCheck: PointerEventsCheckLevel.Never,
        });

        const nameInput = screen.getByPlaceholderText('Enter new contact name');
        const addrInput = screen.getByPlaceholderText(
            'Enter new eCash address or alias',
        );
        const address = 'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0';
        await userEvent.type(nameInput, 'delta');
        await userEvent.type(addrInput, address);

        // Click OK
        await userEvent.click(screen.getByText('OK'));

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
        await userEvent.click(
            screen.getByRole('button', { name: 'Add Contact' }),
            {
                // https://github.com/testing-library/user-event/issues/922
                pointerEventsCheck: PointerEventsCheckLevel.Never,
            },
        );
        const nameInputRepeat = screen.getByPlaceholderText(
            'Enter new contact name',
        );
        const addrInputRepeat = screen.getByPlaceholderText(
            'Enter new eCash address or alias',
        );
        await userEvent.type(nameInputRepeat, 'delta');
        await userEvent.type(addrInputRepeat, address);

        // Click OK
        const okAddContactButtonAgain = screen.getByText('OK');
        await userEvent.click(okAddContactButtonAgain);

        // Confirm error notification is triggered
        await waitFor(() => {
            expect(
                screen.getByText(
                    `${address} already exists in the Contact List`,
                ),
            ).toBeInTheDocument();
        });

        // We can rename a contact

        await userEvent.click(screen.getAllByTestId('rename-contact-btn')[0], {
            // https://github.com/testing-library/user-event/issues/922
            pointerEventsCheck: PointerEventsCheckLevel.Never,
        });

        const editNameInput = screen.getByPlaceholderText(
            'Enter new contact name',
        );
        await userEvent.type(editNameInput, 'omega');

        // Click OK
        const okRenameContactButton = screen.getByText('OK');
        await userEvent.click(okRenameContactButton);

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

        // Open the savedWallets collapse
        await userEvent.click(
            screen.getByRole('button', { name: /Saved wallets/ }),
            {
                // https://github.com/testing-library/user-event/issues/922
                pointerEventsCheck: PointerEventsCheckLevel.Never,
            },
        );

        // We see expected saved wallets
        expect(await screen.findByText('addedSavedWallet')).toBeInTheDocument();

        // Click button to add this saved wallet to contacts
        await userEvent.click(
            screen.getByTestId('add-saved-wallet-to-contact-btn'),
        );

        // Raises a confirm modal. Click OK.
        await userEvent.click(screen.getByText('OK'));

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
});

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import Configure from 'components/Configure/Configure';
import { BrowserRouter as Router } from 'react-router-dom';
import { WalletContext } from 'utils/context';
import {
    walletWithXecAndTokens,
    populatedContactList,
} from '../fixtures/mocks';
import { render, screen, waitFor, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { cashtabSettings } from 'config/cashtabSettings';
import cashtabCache from 'config/cashtabCache';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import useWallet from 'hooks/useWallet';

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
    afterEach(async () => {
        await localforage.clear();
    });
    it('Deleting a contact from Configure.js removes it from localforage and wallet context. A notification is triggered on success.', async () => {
        // Set localforage to get expected initial state of hook
        await localforage.setItem('contactList', populatedContactList);
        await localforage.setItem('cashtabCache', cashtabCache);
        await localforage.setItem('settings', cashtabSettings);
        await localforage.setItem('wallet', walletWithXecAndTokens);
        const { result } = renderHook(() => useWallet());

        let resultAfterStateSet;
        await waitFor(() => {
            expect(result.current.contactList).toStrictEqual(
                populatedContactList,
            );
            resultAfterStateSet = result.current;
        });
        render(
            <Router>
                <WalletContext.Provider value={resultAfterStateSet}>
                    <ThemeProvider theme={theme}>
                        <Configure />
                    </ThemeProvider>
                </WalletContext.Provider>
            </Router>,
        );

        // Configure component is rendered
        expect(screen.getByTestId('configure-ctn')).toBeInTheDocument();

        // Confirm expected initial state of localforage
        const storedContacts = await localforage.getItem('contactList');
        expect(storedContacts).toStrictEqual(populatedContactList);

        // Open the collapse
        const contactListCollapseButton = screen
            .queryByTestId('contact-list-collapse')
            .querySelector('.ant-collapse-header');
        await userEvent.click(contactListCollapseButton);

        const addressToDelete =
            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';

        // We find the expected contacts
        expect(screen.queryByTestId('contact-list-items')).toHaveTextContent(
            `alpha${addressToDelete}betaecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035gammaecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72yDownloadCSVAddContact`,
        );

        // Confirm notification does not exist prior to action
        await waitFor(() => {
            expect(
                screen.queryByText(
                    `${addressToDelete} removed from Contact List`,
                ),
            ).not.toBeInTheDocument();
        });

        // Get the delete button for the first contact
        const deleteButton = screen.queryAllByTestId('delete-contact-btn')[0];
        expect(deleteButton).toBeInTheDocument();

        // Click it
        await userEvent.click(deleteButton);

        // Raises a confirm modal with input field
        const confirmDeleteContactInput = screen.queryByTestId(
            'confirm-delete-contact',
        );
        // Type correct confirmation phrase
        await userEvent.type(confirmDeleteContactInput, 'delete alpha');

        // Click OK
        const okDeleteContactButton = screen.getByText('OK');
        await userEvent.click(okDeleteContactButton);

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
        expect(contactListAfterRemove).toStrictEqual(
            expectedContactsAfterRemovingAlpha,
        );
        // Confirm contactList has been updated in state
        expect(result.current.contactList).toStrictEqual(
            contactListAfterRemove,
        );

        // Confirm notification is triggered
        await waitFor(() => {
            expect(
                screen.getByText(
                    `${addressToDelete} removed from Contact List`,
                ),
            ).toBeInTheDocument();
        });
    });
    it('Adding a contact from Configure.js adds it to localforage and wallet context. A notification is triggered on success.', async () => {
        // Set localforage to get expected initial state of hook
        await localforage.setItem('contactList', populatedContactList);
        await localforage.setItem('cashtabCache', cashtabCache);
        await localforage.setItem('settings', cashtabSettings);
        await localforage.setItem('wallet', walletWithXecAndTokens);
        const { result } = renderHook(() => useWallet());

        let resultAfterStateSet;
        await waitFor(() => {
            expect(result.current.contactList).toStrictEqual(
                populatedContactList,
            );
            resultAfterStateSet = result.current;
        });
        render(
            <Router>
                <WalletContext.Provider value={resultAfterStateSet}>
                    <ThemeProvider theme={theme}>
                        <Configure />
                    </ThemeProvider>
                </WalletContext.Provider>
            </Router>,
        );

        // Configure component is rendered
        expect(screen.getByTestId('configure-ctn')).toBeInTheDocument();

        // Confirm expected initial state of localforage
        const storedContacts = await localforage.getItem('contactList');
        expect(storedContacts).toStrictEqual(populatedContactList);

        // Open the collapse
        const contactListCollapseButton = screen
            .queryByTestId('contact-list-collapse')
            .querySelector('.ant-collapse-header');
        await userEvent.click(contactListCollapseButton);

        // We find the expected contacts
        expect(screen.queryByTestId('contact-list-items')).toHaveTextContent(
            'alphaecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6betaecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035gammaecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72yDownloadCSVAddContact',
        );

        // Add a contact
        await userEvent.click(screen.getByTestId('add-contact-btn'));

        const nameInput = screen.getByPlaceholderText('Enter new contact name');
        const addrInput = screen.getByPlaceholderText(
            'Enter new eCash address or alias',
        );
        const address = 'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0';
        await userEvent.type(nameInput, 'delta');
        await userEvent.type(addrInput, address);

        // Confirm notification does not exist prior to action
        await waitFor(() => {
            expect(
                screen.queryByText(`${address} added to Contact List`),
            ).not.toBeInTheDocument();
        });

        // Click OK
        const okAddContactButton = screen.getByText('OK');
        await userEvent.click(okAddContactButton);

        // Confirm new contact is added in local storage
        const expectedContactsAfterAddingDelta = [
            {
                address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                name: 'alpha',
            },
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
        ];
        const contactListAfterAdd = await localforage.getItem('contactList');
        expect(contactListAfterAdd).toStrictEqual(
            expectedContactsAfterAddingDelta,
        );
        // Confirm contactList has been updated in state
        expect(result.current.contactList).toStrictEqual(
            expectedContactsAfterAddingDelta,
        );
        // Confirm notification is triggered
        await waitFor(() => {
            expect(
                screen.getByText(`${address} added to Contact List`),
            ).toBeInTheDocument();
        });
    });
    it('Adding a duplicate contact from Configure.js triggers error notification.', async () => {
        // Set localforage to get expected initial state of hook
        await localforage.setItem('contactList', populatedContactList);
        await localforage.setItem('cashtabCache', cashtabCache);
        await localforage.setItem('settings', cashtabSettings);
        await localforage.setItem('wallet', walletWithXecAndTokens);
        const { result } = renderHook(() => useWallet());

        let resultAfterStateSet;
        await waitFor(() => {
            expect(result.current.contactList).toStrictEqual(
                populatedContactList,
            );
            resultAfterStateSet = result.current;
        });
        render(
            <Router>
                <WalletContext.Provider value={resultAfterStateSet}>
                    <ThemeProvider theme={theme}>
                        <Configure />
                    </ThemeProvider>
                </WalletContext.Provider>
            </Router>,
        );

        // Open the collapse
        const contactListCollapseButton = screen
            .queryByTestId('contact-list-collapse')
            .querySelector('.ant-collapse-header');
        await userEvent.click(contactListCollapseButton);

        // Add the initial contact
        await userEvent.click(screen.getByTestId('add-contact-btn'));
        const nameInput = screen.getByPlaceholderText('Enter new contact name');
        const addrInput = screen.getByPlaceholderText(
            'Enter new eCash address or alias',
        );
        await userEvent.type(nameInput, 'delta');
        const address = 'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0';
        await userEvent.type(addrInput, address);

        // Click OK
        const okAddContactButton = screen.getByText('OK');
        await userEvent.click(okAddContactButton);

        // Confirm error notification does not exist prior to action
        await waitFor(() => {
            expect(
                screen.queryByText(
                    `${address} already exists in the Contact List`,
                ),
            ).not.toBeInTheDocument();
        });

        // Add the same contact again
        await userEvent.click(screen.getByTestId('add-contact-btn'));
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
    });
    it('Renaming a contact from Configure.js renames it in localforage and wallet context', async () => {
        // Set localforage to get expected initial state of hook
        await localforage.setItem('contactList', populatedContactList);
        await localforage.setItem('cashtabCache', cashtabCache);
        await localforage.setItem('settings', cashtabSettings);
        await localforage.setItem('wallet', walletWithXecAndTokens);
        const { result } = renderHook(() => useWallet());

        let resultAfterStateSet;
        await waitFor(() => {
            expect(result.current.contactList).toStrictEqual(
                populatedContactList,
            );
            resultAfterStateSet = result.current;
        });
        render(
            <Router>
                <WalletContext.Provider value={resultAfterStateSet}>
                    <ThemeProvider theme={theme}>
                        <Configure />
                    </ThemeProvider>
                </WalletContext.Provider>
            </Router>,
        );

        // Configure component is rendered
        expect(screen.getByTestId('configure-ctn')).toBeInTheDocument();

        // Confirm expected initial state of localforage
        const storedContacts = await localforage.getItem('contactList');
        expect(storedContacts).toStrictEqual(populatedContactList);

        // Open the collapse
        const contactListCollapseButton = screen
            .queryByTestId('contact-list-collapse')
            .querySelector('.ant-collapse-header');
        await userEvent.click(contactListCollapseButton);

        // We find the expected contacts
        expect(screen.queryByTestId('contact-list-items')).toHaveTextContent(
            'alphaecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6betaecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035gammaecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72yDownloadCSVAddContact',
        );

        // Rename a contact
        // Get the delete button for the first contact
        const renameButton = screen.queryAllByTestId('rename-contact-btn')[0];
        expect(renameButton).toBeInTheDocument();

        // Click it
        await userEvent.click(renameButton);

        const editNameInput = screen.getByPlaceholderText(
            'Enter new contact name',
        );
        await userEvent.type(editNameInput, 'omega');

        // Click OK
        const okRenameContactButton = screen.getByText('OK');
        await userEvent.click(okRenameContactButton);

        // Confirm alpha is renamed
        const expectedContactsAfterRenamingAlpha = [
            {
                address: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                name: 'omega',
            },
            {
                address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                name: 'beta',
            },
            {
                address: 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
                name: 'gamma',
            },
        ];
        const contactListAfterRename = await localforage.getItem('contactList');
        expect(contactListAfterRename).toStrictEqual(
            expectedContactsAfterRenamingAlpha,
        );
        // Confirm contactList has been updated in state
        expect(result.current.contactList).toStrictEqual(
            expectedContactsAfterRenamingAlpha,
        );
    });
    it('We can add a savedWallet as a contact. A notification is triggered on success.', async () => {
        // Set localforage to get expected initial state of hook
        await localforage.setItem('contactList', populatedContactList);
        await localforage.setItem('cashtabCache', cashtabCache);
        await localforage.setItem('settings', cashtabSettings);
        await localforage.setItem('wallet', walletWithXecAndTokens);
        const address = 'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0';
        // Add a new saved wallet that can be rendered
        await localforage.setItem('savedWallets', [
            walletWithXecAndTokens,
            {
                name: 'addedWallet',
                Path1899: {
                    cashAddress: address,
                },
            },
        ]);
        const { result } = renderHook(() => useWallet());

        let resultAfterStateSet;
        await waitFor(() => {
            expect(result.current.contactList).toStrictEqual(
                populatedContactList,
            );
            resultAfterStateSet = result.current;
        });
        render(
            <Router>
                <WalletContext.Provider value={resultAfterStateSet}>
                    <ThemeProvider theme={theme}>
                        <Configure />
                    </ThemeProvider>
                </WalletContext.Provider>
            </Router>,
        );

        // Configure component is rendered
        expect(screen.getByTestId('configure-ctn')).toBeInTheDocument();

        // Confirm expected initial state of localforage
        const storedContacts = await localforage.getItem('contactList');
        expect(storedContacts).toStrictEqual(populatedContactList);

        // Open the collapse
        const contactListCollapseButton = screen
            .queryByTestId('contact-list-collapse')
            .querySelector('.ant-collapse-header');
        await userEvent.click(contactListCollapseButton);

        // We find the expected contacts
        expect(screen.queryByTestId('contact-list-items')).toHaveTextContent(
            'alphaecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6betaecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035gammaecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72yDownloadCSVAddContact',
        );

        // Open the savedWallets collapse
        const savedWalletsCollapseButton = screen.getByText('Saved wallets');
        await userEvent.click(savedWalletsCollapseButton);

        // We see expected saved wallets
        expect(await screen.findByText('addedWallet')).toBeInTheDocument();

        const addButton = screen.getByTestId('add-saved-wallet-to-contact-btn');
        expect(addButton).toBeInTheDocument();

        // Confirm notification does not exist prior to action
        await waitFor(() => {
            expect(
                screen.queryByText(`${address} added to Contact List`),
            ).not.toBeInTheDocument();
        });

        // Click it
        await userEvent.click(addButton);

        // Raises a confirm modal
        // Click OK
        await userEvent.click(screen.getByText('OK'));

        // Confirm new wallet added to contacts

        const contactsAfterAddingSavedWallet = populatedContactList.concat({
            address: 'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0',
            name: 'addedWallet',
        });
        await waitFor(async () =>
            expect(await localforage.getItem('contactList')).toStrictEqual(
                contactsAfterAddingSavedWallet,
            ),
        );
        // Confirm contactList has been updated in state
        expect(result.current.contactList).toStrictEqual(
            contactsAfterAddingSavedWallet,
        );

        // Confirm notification is triggered
        await waitFor(() => {
            expect(
                screen.getByText(`${address} added to Contact List`),
            ).toBeInTheDocument();
        });
    });
});

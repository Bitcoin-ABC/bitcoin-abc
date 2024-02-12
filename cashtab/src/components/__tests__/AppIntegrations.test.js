import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import App from 'components/App';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import {
    walletWithXecAndTokens,
    freshWalletWithOneIncomingCashtabMsg,
} from 'components/fixtures/mocks';
import { initializeCashtabStateForTests } from 'components/fixtures/helpers';
import { MemoryRouter } from 'react-router-dom';
import { WalletProvider } from 'utils/context';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';

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
    it('Renders onboarding screen if cashtab.com opened with no local storage and no wallet', async () => {
        // This is the experience of a user visiting cashtab.com for the first time
        const mockedChronik = await initializeCashtabStateForTests(false);
        render(
            <WalletProvider chronik={mockedChronik}>
                <MemoryRouter initialEntries={['/wallet']}>
                    <ThemeProvider theme={theme}>
                        <App />
                    </ThemeProvider>
                </MemoryRouter>
            </WalletProvider>,
        );

        // Onboarding is rendered
        await waitFor(() => {
            expect(screen.getByTestId('onboarding')).toBeInTheDocument();
        });
    });
    it('Renders API error if called with wallet in localforage but chronik utxo calls fail', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            true, // apiError bool
        );
        render(
            <WalletProvider chronik={mockedChronik}>
                <MemoryRouter initialEntries={['/wallet']}>
                    <ThemeProvider theme={theme}>
                        <App />
                    </ThemeProvider>
                </MemoryRouter>
            </WalletProvider>,
        );
        // API Error is rendered
        await screen.findByTestId('api-error');
        // Wallet-info is rendered
        expect(
            await screen.findByTestId('wallet-info-ctn'),
        ).toBeInTheDocument();
    });
    it('Loads home screen with no error if wallet is in storage and chronik calls are successful', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
        );

        render(
            <WalletProvider chronik={mockedChronik}>
                <MemoryRouter initialEntries={['/wallet']}>
                    <ThemeProvider theme={theme}>
                        <App />
                    </ThemeProvider>
                </MemoryRouter>
            </WalletProvider>,
        );
        // API Error is NOT rendered
        await waitFor(() =>
            expect(screen.queryByTestId('api-error')).not.toBeInTheDocument(),
        );
        // Wallet-info is rendered
        expect(
            await screen.findByTestId('wallet-info-ctn'),
        ).toBeInTheDocument();
    });
    it('Adding a contact to Configure.js from clicking on tx history adds it to localforage and wallet context', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            freshWalletWithOneIncomingCashtabMsg,
        );

        render(
            <WalletProvider chronik={mockedChronik}>
                <MemoryRouter initialEntries={['/wallet']}>
                    <ThemeProvider theme={theme}>
                        <App />
                    </ThemeProvider>
                </MemoryRouter>
            </WalletProvider>,
        );

        // Open the collapse
        await waitFor(async () => {
            const contactListCollapseButton = screen
                .queryByTestId('tx-collapse')
                .querySelector('.ant-collapse-header');
            await userEvent.click(contactListCollapseButton);
        });

        // Get the "Add to contacts" button of tx
        const addToContactsBtn = screen.getByTestId('add-to-contacts-btn');

        // We do not see the configure screen before clicking the button
        expect(screen.queryByTestId('configure-ctn')).not.toBeInTheDocument();

        // Confirm expected initial state of localforage
        const storedContacts = await localforage.getItem('contactList');
        expect(storedContacts).toStrictEqual([]);

        // Click the button
        await userEvent.click(addToContactsBtn);

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
        expect(storedContactListNow).toStrictEqual(newContactList);
    });
    it('Adding a contact to an existing contactList by clicking on tx history adds it to localforage and wallet context', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            freshWalletWithOneIncomingCashtabMsg,
        );
        // Populate the contactList
        const initialContactList = [
            {
                address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                name: 'echo',
            },
        ];
        await localforage.setItem('contactList', initialContactList);

        render(
            <WalletProvider chronik={mockedChronik}>
                <MemoryRouter initialEntries={['/wallet']}>
                    <ThemeProvider theme={theme}>
                        <App />
                    </ThemeProvider>
                </MemoryRouter>
            </WalletProvider>,
        );

        // Open the collapse
        await waitFor(async () => {
            const contactListCollapseButton = screen
                .queryByTestId('tx-collapse')
                .querySelector('.ant-collapse-header');
            await userEvent.click(contactListCollapseButton);
        });

        // Get the "Add to contacts" button of tx
        const addToContactsBtn = screen.getByTestId('add-to-contacts-btn');

        // We do not see the configure screen before clicking the button
        expect(screen.queryByTestId('configure-ctn')).not.toBeInTheDocument();

        // Confirm expected initial state of localforage
        const storedContacts = await localforage.getItem('contactList');
        expect(storedContacts).toStrictEqual(initialContactList);

        // Click the button
        await userEvent.click(addToContactsBtn);

        // Now we see the Configure screen
        expect(screen.getByTestId('configure-ctn')).toBeInTheDocument();

        // localforage has been updated with this newly added contact
        await waitFor(async () =>
            expect(await localforage.getItem('contactList')).toStrictEqual([
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
        );
        const LEGACY_EMPTY_CONTACT_LIST = [{}];
        await localforage.setItem('contactList', LEGACY_EMPTY_CONTACT_LIST);

        render(
            <WalletProvider chronik={mockedChronik}>
                <MemoryRouter initialEntries={['/wallet']}>
                    <ThemeProvider theme={theme}>
                        <App />
                    </ThemeProvider>
                </MemoryRouter>
            </WalletProvider>,
        );

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
        );

        // Render app on home screen
        render(
            <WalletProvider chronik={mockedChronik}>
                <MemoryRouter initialEntries={['/wallet']}>
                    <ThemeProvider theme={theme}>
                        <App />
                    </ThemeProvider>
                </MemoryRouter>
            </WalletProvider>,
        );

        // API Error is NOT rendered
        await waitFor(() =>
            expect(screen.queryByTestId('api-error')).not.toBeInTheDocument(),
        );

        // Wallet-info is rendered
        expect(
            await screen.findByTestId('wallet-info-ctn'),
        ).toBeInTheDocument();

        // Balance is correct
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '10,000.00 XEC',
        );

        // onboarding is NOT in the document
        await waitFor(() =>
            expect(screen.queryByTestId('onboarding')).not.toBeInTheDocument(),
        );

        // We do not see the send screen before clicking the button
        await waitFor(() =>
            expect(
                screen.queryByTestId('send-xec-ctn'),
            ).not.toBeInTheDocument(),
        );

        await userEvent.click(await screen.findByText('Reply'));

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
        );

        render(
            <WalletProvider chronik={mockedChronik}>
                <MemoryRouter initialEntries={['/configure']}>
                    <ThemeProvider theme={theme}>
                        <App />
                    </ThemeProvider>
                </MemoryRouter>
            </WalletProvider>,
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
        );

        render(
            <WalletProvider chronik={mockedChronik}>
                <MemoryRouter initialEntries={['/configure']}>
                    <ThemeProvider theme={theme}>
                        <App />
                    </ThemeProvider>
                </MemoryRouter>
            </WalletProvider>,
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
});

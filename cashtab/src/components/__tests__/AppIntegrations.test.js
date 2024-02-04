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
    freshWalletWithOneIncomingCashtabMsgTxs,
} from 'components/fixtures/mocks';
import { MemoryRouter } from 'react-router-dom';
import { WalletProvider } from 'utils/context';
import { MockChronikClient } from '../../../../apps/mock-chronik-client';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
import cashaddr from 'ecashaddrjs';

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

// Initialize chronik client with tx history and utxos of desired mock
// For now, not in a beforeEach as we do not want to do it before every test
// But we do want to do it before more than one
const getWalletWithOneIncomingCashtabMsgChronikClient = () => {
    // Mock successful utxos calls in chronik
    const mockedChronik = new MockChronikClient();
    // Mock scriptutxos to match context
    const TYPE = 'p2pkh';
    mockedChronik.setScript(
        TYPE,
        freshWalletWithOneIncomingCashtabMsg.Path1899.hash160,
    );
    mockedChronik.setUtxos(
        TYPE,
        freshWalletWithOneIncomingCashtabMsg.Path1899.hash160,
        [
            {
                outputScript: `76a914${freshWalletWithOneIncomingCashtabMsg.Path1899.hash160}88ac`,
                utxos: [
                    {
                        outpoint: {
                            txid: 'f11648484c5ac6bf65c04632208d60e809014ed288171cb96e059d0ed7678fde',
                            outIdx: 1,
                        },
                        blockHeight: -1,
                        isCoinbase: false,
                        value: '1000000',
                        network: 'XEC',
                        address:
                            'ecash:qrfjv9kglpyazkdsyf0nd9nvewzagf0xsvv84u226e',
                    },
                ],
            },
        ],
    );
    mockedChronik.setScript(
        TYPE,
        freshWalletWithOneIncomingCashtabMsg.Path145.hash160,
    );
    mockedChronik.setUtxos(
        TYPE,
        freshWalletWithOneIncomingCashtabMsg.Path145.hash160,
        [],
    );
    mockedChronik.setScript(
        TYPE,
        freshWalletWithOneIncomingCashtabMsg.Path245.hash160,
    );
    mockedChronik.setUtxos(
        TYPE,
        freshWalletWithOneIncomingCashtabMsg.Path245.hash160,
        [],
    );
    // TX history mocks
    // TODO mock-chronik-client should support mocking tx history fetch for other scripts
    mockedChronik.setTxHistory(
        TYPE,
        freshWalletWithOneIncomingCashtabMsg.Path1899.hash160,
        freshWalletWithOneIncomingCashtabMsgTxs,
    );
    mockedChronik.setTxHistory(
        TYPE,
        freshWalletWithOneIncomingCashtabMsg.Path145.hash160,
        [],
    );
    mockedChronik.setTxHistory(
        TYPE,
        freshWalletWithOneIncomingCashtabMsg.Path245.hash160,
        [],
    );

    return mockedChronik;
};

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
        // Do not initialize anything in localforage
        // Do not mock anything in chronik
        const mockedChronik = new MockChronikClient();
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
        // Initialize a wallet with balance and history in localforage
        await localforage.setItem('wallet', walletWithXecAndTokens);
        // Do not mock anything in chronik
        const mockedChronik = new MockChronikClient();
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
        // Initialize a wallet with balance and history in localforage
        await localforage.setItem('wallet', walletWithXecAndTokens);
        // Do not mock anything in chronik
        const mockedChronik = new MockChronikClient();
        // Mock scriptutxos to match context
        const path1899mocks = cashaddr.decode(
            walletWithXecAndTokens.Path1899.cashAddress,
            true,
        );
        mockedChronik.setScript(path1899mocks.type, path1899mocks.hash);
        mockedChronik.setUtxos(path1899mocks.type, path1899mocks.hash, [
            {
                outputScript: `76a914${path1899mocks.hash}88ac`,
                utxos: walletWithXecAndTokens.state.nonSlpUtxos,
            },
        ]);
        const path145mocks = cashaddr.decode(
            walletWithXecAndTokens.Path145.cashAddress,
            true,
        );
        mockedChronik.setScript(path145mocks.type, path145mocks.hash);
        mockedChronik.setUtxos(path145mocks.type, path145mocks.hash, [
            {
                outputScript: `76a914${path145mocks.hash}88ac`,
                utxos: [],
            },
        ]);
        const path245mocks = cashaddr.decode(
            walletWithXecAndTokens.Path245.cashAddress,
            true,
        );
        mockedChronik.setScript(path245mocks.type, path245mocks.hash);
        mockedChronik.setUtxos(path245mocks.type, path245mocks.hash, [
            {
                outputScript: `76a914${path245mocks.hash}88ac`,
                utxos: [],
            },
        ]);

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
    it('Adding a contact from Configure.js adds it to localforage and wallet context', async () => {
        // Add wallet with an incoming Cashtab msg to localforage
        await localforage.setItem(
            'wallet',
            freshWalletWithOneIncomingCashtabMsg,
        );

        // Get mocked chronik client with expected API results for this wallet
        const mockedChronik = getWalletWithOneIncomingCashtabMsgChronikClient();

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
        expect(storedContacts).toStrictEqual([{}]);

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
    it('Clicking "reply" on a Cashtab Msg correctly populates the SendXec to address and amount fields', async () => {
        // Add wallet with an incoming Cashtab msg to localforage
        await localforage.setItem(
            'wallet',
            freshWalletWithOneIncomingCashtabMsg,
        );

        // Get mocked chronik client with expected API results for this wallet
        const mockedChronik = getWalletWithOneIncomingCashtabMsgChronikClient();

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
});

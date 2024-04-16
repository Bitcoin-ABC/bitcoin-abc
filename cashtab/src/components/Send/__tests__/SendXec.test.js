// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { walletWithXecAndTokens } from 'components/App/fixtures/mocks';
import {
    SEND_ADDRESS_VALIDATION_ERRORS,
    SEND_AMOUNT_VALIDATION_ERRORS,
} from 'components/Send/fixtures/mocks';
import { when } from 'jest-when';
import aliasSettings from 'config/alias';
import { explorer } from 'config/explorer';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import appConfig from 'config/app';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
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

describe('<SendXec />', () => {
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
    it('Renders the SendXec screen with send address input', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();
        expect(amountInputEl).toBeInTheDocument();

        // Inputs are not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);
        expect(amountInputEl).toHaveProperty('disabled', false);

        // The "Send to Many" switch is not disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            false,
        );

        // The Send button is disabled
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }

        // We select op_return_raw input
        await user.click(screen.getByTitle('Toggle op_return_raw'));

        // We do not see the parsed op return raw msg area bc the op_return_raw input is empty
        expect(
            screen.queryByTestId('Parsed op_return_raw'),
        ).not.toBeInTheDocument();
    });
    it('Pass valid address to Send To field', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters a valid address
        const addressInput = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';

        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The "Send to Many" switch is not disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            false,
        );

        // Amount input is untouched
        expect(amountInputEl).toHaveValue(null);

        // The amount input is NOT disabled because there is no BIP21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }

        // The Send button is disabled because amount is null
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );
    });
    it('Pass valid alias to Send To field', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        const alias = 'twelvechar12';
        const expectedResolvedAddress =
            'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj';

        // mock the fetch call to alias-server's '/alias' endpoint
        const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/alias/${alias}`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(fetchUrl)
            .mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        alias: 'twelvechar12',
                        address: expectedResolvedAddress,
                        txid: '166b21d4631e2a6ec6110061f351c9c3bfb3a8d4e6919684df7e2824b42b0ffe',
                        blockheight: 792419,
                    }),
            });

        // The user enters a valid alias
        const addressInput = 'twelvechar12.xec';

        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The "Send to Many" switch is not disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            false,
        );

        // Amount input is untouched
        expect(amountInputEl).toHaveValue(null);

        // The amount input is NOT disabled because there is no BIP21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }

        // The Send button is disabled because amount is null
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );

        // The alias address preview renders the expected address preview
        expect(
            screen.getByText(
                `${expectedResolvedAddress.slice(
                    0,
                    10,
                )}...${expectedResolvedAddress.slice(-5)}`,
            ),
        ).toBeInTheDocument();
    });
    it('Pass an invalid address to Send To field and get a validation error', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters an invalid address
        const addressInput = 'ecash:notValid';
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The "Send to Many" switch is not disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            false,
        );

        // Amount input is untouched
        expect(amountInputEl).toHaveValue(null);

        // The amount input is NOT disabled because there is no BIP21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // We get expected addr validation error
        expect(screen.getByText('Invalid address')).toBeInTheDocument();

        // The Send button is disabled
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );
    });
    it('Pass a possibly valid alias without .xec suffix to Send To field and get expected error', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters an alias that could be valid except missing suffix '.xec'
        const addressInput = 'aliasnosuffix';
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The "Send to Many" switch is not disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            false,
        );

        // Amount input is untouched
        expect(amountInputEl).toHaveValue(null);

        // The amount input is NOT disabled because there is no BIP21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // We get expected addr validation error
        expect(
            screen.getByText(`Aliases must end with '.xec'`),
        ).toBeInTheDocument();

        // The Send button is disabled
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );
    });
    it('Pass a valid alias to Send To field that has not yet been registered and get expected error', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        const alias = 'notregistered';

        // mock the fetch call to alias-server's '/alias' endpoint
        const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/alias/${alias}`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(fetchUrl)
            .mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        alias: 'notregistered',
                        isRegistered: false,
                        pending: [],
                        registrationFeeSats: 551,
                        processedBlockheight: 827598,
                    }),
            });

        // The user enters a valid alias
        const addressInput = `${alias}.xec`;
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The "Send to Many" switch is not disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            false,
        );

        // Amount input is untouched
        expect(amountInputEl).toHaveValue(null);

        // The amount input is NOT disabled because there is no BIP21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // We get expected addr validation error
        expect(
            screen.getByText(
                `eCash Alias does not exist or yet to receive 1 confirmation`,
            ),
        ).toBeInTheDocument();

        // The Send button is disabled
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );
    });
    it('Get expected error msg and send disabled if bad response from alias server', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        const alias = 'servererror';

        // mock the fetch call to alias-server's '/alias' endpoint
        const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/alias/${alias}`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(fetchUrl)
            .mockResolvedValue({
                json: () => Promise.reject(new Error('some error')),
            });

        // The user enters a valid alias
        const addressInput = `${alias}.xec`;
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The "Send to Many" switch is not disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            false,
        );

        // Amount input is untouched
        expect(amountInputEl).toHaveValue(null);

        // The amount input is NOT disabled because there is no BIP21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // We get expected addr validation error
        expect(
            screen.getByText(
                `Error resolving alias at indexer, contact admin.`,
            ),
        ).toBeInTheDocument();

        // The Send button is disabled
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );
    });
    it('Pass a valid address and bip21 query string with valid amount param to Send To field', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters a valid BIP21 query string with a valid amount param
        const addressInput =
            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=500';
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // Amount input is the valid amount param value
        expect(amountInputEl).toHaveValue(500);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }

        // The Send button is enabled as we have valid address and amount params
        expect(screen.getByRole('button', { name: 'Send' })).not.toHaveStyle(
            'cursor: not-allowed',
        );
    });
    it('Pass a valid alias and bip21 query string with valid amount param to Send To field', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // Prepare alias input with mock success api call
        const alias = 'chicken';
        const expectedResolvedAddress =
            'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj';

        // mock the fetch call to alias-server's '/alias' endpoint
        const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/alias/${alias}`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(fetchUrl)
            .mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        alias: 'chicken',
                        address: expectedResolvedAddress,
                        txid: '166b21d4631e2a6ec6110061f351c9c3bfb3a8d4e6919684df7e2824b42b0ffe',
                        blockheight: 792419,
                    }),
            });

        // The user enters a valid BIP21 query string with a valid amount param
        const addressInput = `${alias}.xec?amount=500`;
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // Amount input is the valid amount param value
        expect(amountInputEl).toHaveValue(500);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }

        // The Send button is enabled as we have valid address and amount params
        expect(screen.getByRole('button', { name: 'Send' })).not.toHaveStyle(
            'cursor: not-allowed',
        );

        // The alias address preview renders the expected address preview
        expect(
            screen.getByText(
                `${expectedResolvedAddress.slice(
                    0,
                    10,
                )}...${expectedResolvedAddress.slice(-5)}`,
            ),
        ).toBeInTheDocument();
    });
    it('Pass a valid address and bip21 query string with invalid amount param (dust) to Send To field', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters a valid BIP21 query string with a valid amount param
        const dustAmount = 5;
        const addressInput = `ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=${dustAmount}`;
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // Amount input is the invalid amount param value
        expect(amountInputEl).toHaveValue(dustAmount);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // We get expected addr validation error
        expect(
            screen.getByText(`Send amount must be at least 5.46 XEC`),
        ).toBeInTheDocument();

        // The Send button is disabled
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );
    });
    it('Valid address with valid bip21 query string with valid amount param rejected if amount exceeds wallet balance', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters a valid BIP21 query string with a valid amount param
        const exceedBalanceAmount = 1000000; // 1 million X E C
        const addressInput = `ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=${exceedBalanceAmount}`;
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // Amount input is the invalid amount param value
        expect(amountInputEl).toHaveValue(exceedBalanceAmount);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // We get expected addr validation error
        expect(
            screen.getByText(
                `Amount 1,000,000.00 XEC exceeds wallet balance of 9,513.12 XEC`,
            ),
        ).toBeInTheDocument();

        // The Send button is disabled
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );
    });
    it('Pass a valid alias and bip21 query string with invalid amount param (too many decimals) to Send To field', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // Prepare alias input with mock success api call
        const alias = 'chicken';
        const expectedResolvedAddress =
            'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj';

        // mock the fetch call to alias-server's '/alias' endpoint
        const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/alias/${alias}`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(fetchUrl)
            .mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        alias: 'chicken',
                        address: expectedResolvedAddress,
                        txid: '166b21d4631e2a6ec6110061f351c9c3bfb3a8d4e6919684df7e2824b42b0ffe',
                        blockheight: 792419,
                    }),
            });

        // The user enters a valid BIP21 query string with an invalid amount param
        const amount = 500.123;
        const addressInput = `${alias}.xec?amount=${amount}`;

        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // Amount input is the invalid amount param value
        expect(amountInputEl).toHaveValue(amount);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // We get expected addr validation error
        expect(
            screen.getByText(
                `XEC transactions do not support more than 2 decimal places`,
            ),
        ).toBeInTheDocument();

        // The Send button is disabled
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // The alias address preview renders the expected address preview
        expect(
            screen.getByText(
                `${expectedResolvedAddress.slice(
                    0,
                    10,
                )}...${expectedResolvedAddress.slice(-5)}`,
            ),
        ).toBeInTheDocument();
    });
    it('Pass a valid address and an invalid bip21 query string', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters a badly formed query string
        const addressInput =
            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?notaparam=500';
        await user.type(addressInputEl, addressInput);

        // The Send To input value matches user input
        expect(addressInputEl).toHaveValue(addressInput);

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // Amount input unchanged
        expect(amountInputEl).toHaveValue(null);

        // The amount input is not disabled because no amount param is specified
        expect(amountInputEl).toHaveProperty('disabled', false);

        // We get expected addr validation error
        expect(
            screen.getByText(`Unsupported param "notaparam"`),
        ).toBeInTheDocument();

        // The Send button is disabled
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );

        // The Cashtab Msg switch is disabled because we have a querystring address input
        expect(screen.getByTitle('Toggle Cashtab Msg')).toHaveProperty(
            'disabled',
            true,
        );
    });
    it('Pass a valid address and bip21 query string with op_return_raw param to Send To field', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters a valid BIP21 query string with a valid amount param
        const op_return_raw = '0401020304';
        const addressInput = `ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?op_return_raw=${op_return_raw}`;
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // Amount input is untouched
        expect(amountInputEl).toHaveValue(null);

        // The amount input is not disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }

        const opReturnRawInput = screen.getByPlaceholderText(
            `(Advanced) Enter raw hex to be included with this transaction's OP_RETURN`,
        );

        // The op_return_raw input is populated with this op_return_raw
        expect(opReturnRawInput).toHaveValue(op_return_raw);

        // The op_return_raw input is disabled
        expect(opReturnRawInput).toHaveProperty('disabled', true);

        // The Send button is disabled because amount is not entered
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );

        // The Cashtab Msg switch is disabled because op_return_raw is set
        expect(screen.getByTitle('Toggle Cashtab Msg')).toHaveProperty(
            'disabled',
            true,
        );
    });
    it('Pass a valid address and bip21 query string with valid amount and op_return_raw params to Send To field', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters a valid BIP21 query string with a valid amount param
        const op_return_raw = '0401020304';
        const addressInput = `ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=500&op_return_raw=${op_return_raw}`;
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // Amount input is the valid amount param value
        expect(amountInputEl).toHaveValue(500);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }

        const opReturnRawInput = screen.getByPlaceholderText(
            `(Advanced) Enter raw hex to be included with this transaction's OP_RETURN`,
        );

        // The op_return_raw input is populated with this op_return_raw
        expect(opReturnRawInput).toHaveValue(op_return_raw);

        // The op_return_raw input is disabled
        expect(opReturnRawInput).toHaveProperty('disabled', true);

        // The Send button is enabled as we have valid address and amount params
        expect(screen.getByRole('button', { name: 'Send' })).not.toHaveStyle(
            'cursor: not-allowed',
        );

        // The Cashtab Msg switch is disabled because op_return_raw is set
        expect(screen.getByTitle('Toggle Cashtab Msg')).toHaveProperty(
            'disabled',
            true,
        );
    });
    it('Pass a valid address and bip21 query string with valid amount and invalid op_return_raw params to Send To field', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters a valid BIP21 query string with a valid amount param and invalid op_return_raw
        const op_return_raw = 'notahexstring';
        const addressInput = `ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=500&op_return_raw=${op_return_raw}`;
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // Amount input is the valid amount param value
        expect(amountInputEl).toHaveValue(500);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        const opReturnRawInput = screen.getByPlaceholderText(
            `(Advanced) Enter raw hex to be included with this transaction's OP_RETURN`,
        );

        // The op_return_raw input is populated with this op_return_raw
        expect(opReturnRawInput).toHaveValue(op_return_raw);

        // The op_return_raw input is disabled
        expect(opReturnRawInput).toHaveProperty('disabled', true);

        // We get expected addr validation error
        expect(
            screen.getByText('Input must be lowercase hex a-f 0-9.'),
        ).toBeInTheDocument();

        // The Send button is disabled as we have valid address and amount params
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );

        // The Cashtab Msg switch is disabled because op_return_raw is set
        expect(screen.getByTitle('Toggle Cashtab Msg')).toHaveProperty(
            'disabled',
            true,
        );
    });
    it('Clicking "Send" will send a valid tx with op_return_raw after entry of a valid address and bip21 query string with valid amount and op_return_raw params to Send To field', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Can check in electrum for opreturn and amount
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006a47304402206d45893e238b7e30110d4e0d47e63204a7d6347169547bebad5200be510b8790022014eb3457545423b9eb04aec14e28551548c011ee3544cb40619063dfbb20a1c54121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000296a04007461622263617368746162206d6573736167652077697468206f705f72657475726e5f726177a4060000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac417b0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '79e6afc28d4149c51c4e2a32c05c57fb59c1c164fde1afc655590ce99ed70cb8';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');
        // The user enters a valid BIP21 query string with a valid amount param
        const op_return_raw =
            '04007461622263617368746162206d6573736167652077697468206f705f72657475726e5f726177';
        const addressInput = `ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=17&op_return_raw=${op_return_raw}`;
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The 'Send To' input field is not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // Amount input is the valid amount param value
        expect(amountInputEl).toHaveValue(17);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        const opReturnRawInput = screen.getByPlaceholderText(
            `(Advanced) Enter raw hex to be included with this transaction's OP_RETURN`,
        );

        // The op_return_raw input is populated with this op_return_raw
        expect(opReturnRawInput).toHaveValue(op_return_raw);

        // The op_return_raw input is disabled
        expect(opReturnRawInput).toHaveProperty('disabled', true);

        // We see expected data in the op_return_raw preview
        expect(
            screen.getByText('cashtab message with op_return_raw'),
        ).toBeInTheDocument();

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }

        // The Send button is enabled as we have valid address and amount params
        expect(screen.getByRole('button', { name: 'Send' })).not.toHaveStyle(
            'cursor: not-allowed',
        );

        // The Cashtab Msg switch is disabled because op_return_raw is set
        expect(screen.getByTitle('Toggle Cashtab Msg')).toHaveProperty(
            'disabled',
            true,
        );

        // Click Send
        await user.click(
            screen.getByRole('button', { name: 'Send' }),
            addressInput,
        );

        // Notification is rendered with expected txid?;
        const txSuccessNotification = await screen.findByText('eCash sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
        await waitFor(() =>
            // The op_return_raw set alert is now removed
            expect(
                screen.queryByText(
                    `Hex OP_RETURN "04007461622263617368746162206D6573736167652077697468206F705F72657475726E5F726177" set by BIP21`,
                ),
            ).not.toBeInTheDocument(),
        );
        await waitFor(() =>
            // The amount input is no longer disabled
            expect(amountInputEl).toHaveProperty('disabled', false),
        );
        await waitFor(() =>
            // Amount input is reset
            expect(amountInputEl).toHaveValue(null),
        );

        // The "Send to Many" switch is not disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            false,
        );

        // The 'Send To' input field has been cleared
        expect(addressInputEl).toHaveValue('');

        // The Cashtab Msg switch is not disabled because op_return_raw is not set
        expect(screen.getByTitle('Toggle Cashtab Msg')).toHaveProperty(
            'disabled',
            false,
        );
    });
    it('We can calculate max send amount with and without a cashtab msg, and send a max sat tx with a cashtab msg', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Can check in electrum for opreturn and amount
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006b483045022100c7afe57283adb7dae4ae4d72c40e9403f4673205ccb3bd25fb618919dc41984d02203433e27c83796c2bb4f89a20a51230e9db6a3c94aaf40f9ee51a284a8bdd40824121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0200000000000000003c6a040074616235486f772061626f75742061206c6f6e672d6973682043617368746162206d7367207769746820656d6f6a697320f09f8eaff09f988e03820e00000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac00000000';
        const txid =
            '5c7b3dbc88ff6a9991108ec650448a9e530591001b99f40133eb23434778cfa7';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');
        // The user enters a valid BIP21 query string with a valid amount param
        const addressInput = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        await user.type(addressInputEl, addressInput);

        // We click "max" to populate the Amount field
        await user.click(screen.getByText('max'));

        // Amount input is the expected max send for Cashtab's fee and no other outputs
        expect(amountInputEl).toHaveValue(9509.26);

        // Let's add a Cashtab message
        await user.click(screen.getByTitle('Toggle Cashtab Msg'));

        // Confirm that even a msg of blank spaces is added
        await user.type(
            screen.getByPlaceholderText(
                'Include a public Cashtab msg with this tx (max 215 bytes)',
            ),
            `     `,
        );

        // We click "max" again to recalculate the max send amount
        await user.click(screen.getByText('max'));

        // Amount input is now the expected max send for Cashtab's fee and an empty-space Cashtab Msg output
        expect(amountInputEl).toHaveValue(9508.83);

        // Clear the msg input and start again
        await user.clear(
            screen.getByPlaceholderText(
                'Include a public Cashtab msg with this tx (max 215 bytes)',
            ),
        );

        await user.type(
            screen.getByPlaceholderText(
                'Include a public Cashtab msg with this tx (max 215 bytes)',
            ),
            `How about a long-ish Cashtab msg with emojis 🎯😎`,
        );

        // We click "max" again to recalculate the max send amount
        await user.click(screen.getByText('max'));

        // Amount input is now the expected max send for Cashtab's fee and a Cashtab Msg output
        expect(amountInputEl).toHaveValue(9507.87);

        // Click Send
        await user.click(
            screen.getByRole('button', { name: 'Send' }),
            addressInput,
        );

        // Notification is rendered with expected txid?;
        const txSuccessNotification = await screen.findByText('eCash sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });
    it('If the user has minFeeSends set to true but no longer has the right token amount, the feature is disabled', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Adjust initial settings so that minFeeSends is true
        await localforage.setItem('settings', {
            ...new CashtabSettings(),
            minFeeSends: true,
        });

        // Can check in electrum to confirm this is not sent at 1.0 sat/byte
        // It's 2.02
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006a47304402206d45893e238b7e30110d4e0d47e63204a7d6347169547bebad5200be510b8790022014eb3457545423b9eb04aec14e28551548c011ee3544cb40619063dfbb20a1c54121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000296a04007461622263617368746162206d6573736167652077697468206f705f72657475726e5f726177a4060000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac417b0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '79e6afc28d4149c51c4e2a32c05c57fb59c1c164fde1afc655590ce99ed70cb8';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Confirm we have minFeeSends true in settings
        expect(await localforage.getItem('settings')).toEqual({
            ...new CashtabSettings(),
            minFeeSends: true,
        });

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');
        // The user enters a valid BIP21 query string with a valid amount param
        const op_return_raw =
            '04007461622263617368746162206d6573736167652077697468206f705f72657475726e5f726177';
        const addressInput = `ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=17&op_return_raw=${op_return_raw}`;
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The 'Send To' input field is not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // Amount input is the valid amount param value
        expect(amountInputEl).toHaveValue(17);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        const opReturnRawInput = screen.getByPlaceholderText(
            `(Advanced) Enter raw hex to be included with this transaction's OP_RETURN`,
        );

        // The op_return_raw input is populated with this op_return_raw
        expect(opReturnRawInput).toHaveValue(op_return_raw);

        // The op_return_raw input is disabled
        expect(opReturnRawInput).toHaveProperty('disabled', true);

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }

        // The Send button is enabled as we have valid address and amount params
        expect(screen.getByRole('button', { name: 'Send' })).not.toHaveStyle(
            'cursor: not-allowed',
        );

        // The Cashtab Msg switch is disabled because op_return_raw is set
        expect(screen.getByTitle('Toggle Cashtab Msg')).toHaveProperty(
            'disabled',
            true,
        );

        // Click Send
        await user.click(
            screen.getByRole('button', { name: 'Send' }),
            addressInput,
        );

        // Notification is rendered with expected txid?;
        const txSuccessNotification = await screen.findByText('eCash sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
        await waitFor(() =>
            // The op_return_raw set alert is now removed
            expect(
                screen.queryByText(
                    `Hex OP_RETURN "04007461622263617368746162206D6573736167652077697468206F705F72657475726E5F726177" set by BIP21`,
                ),
            ).not.toBeInTheDocument(),
        );
        await waitFor(() =>
            // The amount input is no longer disabled
            expect(amountInputEl).toHaveProperty('disabled', false),
        );
        await waitFor(() =>
            // Amount input is reset
            expect(amountInputEl).toHaveValue(null),
        );

        // The "Send to Many" switch is not disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            false,
        );

        // The 'Send To' input field has been cleared
        expect(addressInputEl).toHaveValue('');

        // The Cashtab Msg switch is no longer disabled because op_return_raw is not set
        expect(screen.getByTitle('Toggle Cashtab Msg')).toHaveProperty(
            'disabled',
            false,
        );
    });
    it('We can send a tx with amount denominated in fiat currency', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Can check in electrum for opreturn and amount
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006a4730440220449bd79f6aaa826afaae1ae2021bd2b3459d1a77c40a64f7ba85a98c0fc7d531022007cf8e1246091b6b647487c75a63002d2fbc0e3bf6c0a99e326afbe5bd30e6c74121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0260ae0a00000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ace9d30300000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'aefbd7b1a93ec6914368d71deda3ce646aabdccdb99195b349675febeea976db';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');
        // The user enters a valid address
        const addressInput = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        await user.type(addressInputEl, addressInput);

        // Select USD from currency select
        const currencyDropdownMenu = screen.getByTestId(
            'currency-select-dropdown',
        );
        await user.selectOptions(
            screen.getByTestId('currency-select-dropdown'),
            screen.getByTestId('fiat-option'),
        );
        await waitFor(() => expect(currencyDropdownMenu).toHaveValue('USD'));
        // Send $0.21
        // 7000 satoshis at 0.00003 USD / XEC
        await user.type(amountInputEl, '0.21');

        // Click Send
        await user.click(
            screen.getByRole('button', { name: 'Send' }),
            addressInput,
        );

        // Notification is rendered with expected txid?;
        const txSuccessNotification = await screen.findByText('eCash sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });
    it('We can send an XEC tx to multiple users', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Can check in electrum for opreturn and amount
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006b4830450221009ce5b0f6332ed7d1dbfdcf6a0ab870a69d97690b47463c09e403c25255df8d2d02206c553baba4386eb73b7938cb041da23c69072bb1232101fd2f3c8d2b1b6367b34121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff03d0070000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac98080000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac9d710e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'cf665d10e1a0baa8f4c593113678f7859078b1a9a441ac4d6fa40d3636127b99';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Select multi-send mode
        await user.click(screen.getByTitle('Toggle Multisend'));

        const multiSendInputEl = screen.getByPlaceholderText(
            /One address & amount per line/,
        );
        // The user enters a send to many input
        const multiSendInput =
            'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035, 20\necash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6, 22';
        await user.type(multiSendInputEl, multiSendInput);

        // The send to many input field has this value
        expect(multiSendInputEl).toHaveValue(multiSendInput);

        // The Send button is enabled as we have valid multisend input
        expect(screen.getByRole('button', { name: 'Send' })).not.toHaveStyle(
            'cursor: not-allowed',
        );

        // Click Send
        await user.click(screen.getByRole('button', { name: 'Send' }));

        // Notification is rendered with expected txid?;
        const txSuccessNotification = await screen.findByText('eCash sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });
    it('If we type a Cashtab msg, then disable the switch, we send a tx without our typed Cashtab message', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Can check in electrum for opreturn and amount
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006a4730440220055d58f64b9c4e899e06161829f10477ce1d102acfc1fa1a56d35483256a85070220026c9eb6858f62e2a61c58c4b9e55a28ba36bd6b5a7a37b5bb8108bdc4f78a4a4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff018e820e00000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac00000000';
        const txid =
            'c204b8644f35fdf102799c5b6575a7d9b32c6f6cda16182791e4ea8db40b3932';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');
        // The user enters a valid BIP21 query string with a valid amount param
        const addressInput = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        await user.type(addressInputEl, addressInput);

        // We click "max" to populate the Amount field
        await user.click(screen.getByText('max'));

        // Amount input is the expected max send for Cashtab's fee and no other outputs
        expect(amountInputEl).toHaveValue(9509.26);

        // Let's add a Cashtab message
        await user.click(screen.getByTitle('Toggle Cashtab Msg'));

        // Confirm that even a msg of blank spaces is added
        await user.type(
            screen.getByPlaceholderText(
                'Include a public Cashtab msg with this tx (max 215 bytes)',
            ),
            `     `,
        );

        // We click "max" again to recalculate the max send amount
        await user.click(screen.getByText('max'));

        // Amount input is now the expected max send for Cashtab's fee and an empty-space Cashtab Msg output
        expect(amountInputEl).toHaveValue(9508.83);

        // Clear the msg input and start again
        await user.clear(
            screen.getByPlaceholderText(
                'Include a public Cashtab msg with this tx (max 215 bytes)',
            ),
        );

        await user.type(
            screen.getByPlaceholderText(
                'Include a public Cashtab msg with this tx (max 215 bytes)',
            ),
            `How about a long-ish Cashtab msg with emojis 🎯😎`,
        );

        // We click "max" again to recalculate the max send amount
        await user.click(screen.getByText('max'));

        // Amount input is now the expected max send for Cashtab's fee and a Cashtab Msg output
        expect(amountInputEl).toHaveValue(9507.87);

        // Now we turn the Cashtab Msg switch off without clearing the input field
        await user.click(screen.getByTitle('Toggle Cashtab Msg'));

        // Click max again to recalc max amount
        // Note: for now, it is not expected behavior onMax to recalculate as the tx changes, onMax
        // is always a user input
        // We click "max" to populate the Amount field
        await user.click(screen.getByText('max'));

        // We are back to our max send amount for no other outputs
        expect(amountInputEl).toHaveValue(9509.26);

        // Click Send
        await user.click(
            screen.getByRole('button', { name: 'Send' }),
            addressInput,
        );

        // Notification is rendered with expected txid?;
        const txSuccessNotification = await screen.findByText('eCash sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });
});

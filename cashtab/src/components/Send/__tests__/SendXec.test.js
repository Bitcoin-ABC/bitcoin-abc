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
import CashtabSettings from 'config/CashtabSettings';
import { Ecc, initWasm } from 'ecash-lib';
import {
    slp1FixedBear,
    alpMocks,
    slp1NftChildMocks,
    tokenTestWallet,
} from 'components/Etokens/fixtures/mocks';

describe('<SendXec />', () => {
    let ecc;
    beforeAll(async () => {
        await initWasm();
        ecc = new Ecc();
    });
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
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a210200000064410fed2b69cf2c9f0ca92318461d707292347ef567d6866d3889b510d1d1ab8615451dd1d56608457d4f40e8eb97f61dad4f3dc9fbef57099105a6a3e32e0efe8e4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000296a04007461622263617368746162206d6573736167652077697468206f705f72657475726e5f726177a4060000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac4f7b0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '63e4bba044135367eb71c71bc78aee91ecce0551fbdfbdb975e668fb808547ed';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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

        // Notification is rendered with expected txid
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
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a210200000064418305d1f7771a13e90b0cb15adf1c0a39b4381d1ec1bc3bebfa67cbbb5c9461b1a9d0c5a66ca5935aad771cbe869c9002add8b9d9822724ce73db8d15554f26cb4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0200000000000000003c6a040074616235486f772061626f75742061206c6f6e672d6973682043617368746162206d7367207769746820656d6f6a697320f09f8eaff09f988e11820e00000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac00000000';
        const txid =
            'b1d49881be9c810e4408881438efb9e910d9e03bcc12a7bfcd652a0952d06f42';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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
        expect(amountInputEl).toHaveValue(9509.4);

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
        expect(amountInputEl).toHaveValue(9508.97);

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
        expect(amountInputEl).toHaveValue(9508.01);

        // Click Send
        await user.click(
            screen.getByRole('button', { name: 'Send' }),
            addressInput,
        );

        // Notification is rendered with expected txid
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
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a210200000064410fed2b69cf2c9f0ca92318461d707292347ef567d6866d3889b510d1d1ab8615451dd1d56608457d4f40e8eb97f61dad4f3dc9fbef57099105a6a3e32e0efe8e4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000296a04007461622263617368746162206d6573736167652077697468206f705f72657475726e5f726177a4060000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac4f7b0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '63e4bba044135367eb71c71bc78aee91ecce0551fbdfbdb975e668fb808547ed';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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

        // Notification is rendered with expected txid
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
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a210200000064413b207f573a7abb9ec0d149fa71cbde63272a0e6b58298a81bc39ac2001729205bd1e9284c9d5a268f7abe63c5c953bf932ac06c13e408341bde4e4807d7f2fe94121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0260ae0a00000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388acf7d30300000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'a6e905185097cc1ffb289ca366ff7322f8aaf95713d1e5d1a4e89663e609530f';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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

        // Notification is rendered with expected txid
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
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a210200000064411aa35b343dea193092b46c01b877677d595d854686655ae24a3387a10955656a7604dca1cae999239d8ae76dc16ec9db72560832e8a9b0fb09f4ba6e1fb384b14121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff03d0070000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac98080000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388acab710e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'a306834359b3591c68dc3ee8227e5e10225e6ab3c5a7496ead6e119aaaf31635';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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

        // Notification is rendered with expected txid
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
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006441e11f1d96347ab50d56b111e9fd5ef68f9f1c69c76e1f8a65ec1fa58bd2e0eaee7a33b2c961ed5e58231c793b5d8a2950e2def6e7613df1055e681bc8f25d0a5b4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff019c820e00000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac00000000';
        const txid =
            '521eda8ad78014c60374931dcc4e35f312847f9332e16cb846cd387a984e95d2';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

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
        expect(amountInputEl).toHaveValue(9509.4);

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
        expect(amountInputEl).toHaveValue(9508.97);

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
        expect(amountInputEl).toHaveValue(9508.01);

        // Now we turn the Cashtab Msg switch off without clearing the input field
        await user.click(screen.getByTitle('Toggle Cashtab Msg'));

        // Click max again to recalc max amount
        // Note: for now, it is not expected behavior onMax to recalculate as the tx changes, onMax
        // is always a user input
        // We click "max" to populate the Amount field
        await user.click(screen.getByText('max'));

        // We are back to our max send amount for no other outputs
        expect(amountInputEl).toHaveValue(9509.4);

        // Click Send
        await user.click(
            screen.getByRole('button', { name: 'Send' }),
            addressInput,
        );

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eCash sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });
    it('Entering a valid bip21 query string with multiple outputs and op_return_raw will correctly populate UI fields, and the tx can be sent', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Can check in electrum for opreturn and multiple outputs
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006441d95dfbf01e233d19684fd525d1cc39eb82a53ebfc97b8f2f9160f418ce863f4360f9fd1d6c182abde1d582ed39c6998ec5e4cdbde1b09736f6abe390a6ab8d8f4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000296a04007461622263617368746162206d6573736167652077697468206f705f72657475726e5f726177a4060000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac40e20100000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acca980c00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'f153119862f52dbe765ed5d66a5ff848d0386c5d987af9bef5e49a7e62a2c889';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        // The user enters a valid BIP21 query string with a valid amount param
        const op_return_raw =
            '04007461622263617368746162206d6573736167652077697468206f705f72657475726e5f726177';
        const addressInput = `ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=17&op_return_raw=${op_return_raw}&addr=ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035&amount=1234.56`;
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this bip21 query string as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The 'Send To' input field is not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // Because we have multiple outputs, the amount input is not displayed
        expect(screen.queryByPlaceholderText('Amount')).not.toBeInTheDocument();

        // Instead, we see a summary of total outputs and XEC to be sent
        expect(
            screen.getByText('BIP21: Sending 1,251.56 XEC to 2 outputs'),
        ).toBeInTheDocument();

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

        // We see a summary table of addresses and amounts
        expect(screen.getByText('Parsed BIP21 outputs')).toBeInTheDocument();
        expect(
            screen.getByText('qp89xg...9nhgg6, 17.00 XEC'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('qz2708...rf5035, 1,234.56 XEC'),
        ).toBeInTheDocument();

        // Click Send
        await user.click(
            screen.getByRole('button', { name: 'Send' }),
            addressInput,
        );

        // Notification is rendered with expected txid
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
        // The amount input is no longer hidden
        expect(
            await screen.findByPlaceholderText('Amount'),
        ).toBeInTheDocument(),
            // Amount input is reset
            expect(await screen.findByPlaceholderText('Amount')).toHaveValue(
                null,
            ),
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
    it('Entering a valid bip21 query string for a token send tx does not render a populated token tx and shows a query error if Cashtab is unable to fetch the token info', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        const mockTokenId =
            '2222222222222222222222222222222222222222222222222222222222222222';

        // Mock API calls for fetching this token info from cache
        const token_id = mockTokenId;
        // Set chronik mocks required for cache preparation and supply calc
        mockedChronik.setMock('token', {
            input: token_id,
            output: new Error('some chronik error'),
        });
        mockedChronik.setMock('tx', {
            input: token_id,
            output: slp1FixedBear.tx,
        });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        // The user enters a valid BIP21 query string with a valid amount param

        const token_decimalized_qty = '1';
        const address = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        const addressInput = `${address}?token_id=${token_id}&token_decimalized_qty=${token_decimalized_qty}`;
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this bip21 query string as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The 'Send To' input field is not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // Because we have a query error, we do not render the bip21-populated token amount field
        // The XEC amount field is rendered as normal
        expect(screen.getByPlaceholderText('Amount')).toBeInTheDocument();

        // The bip21 token amount input is not rendered

        expect(
            screen.queryByPlaceholderText('Bip21-entered token amount'),
        ).not.toBeInTheDocument();

        // We see a token ID query error if chronik cannot get this token's genesis info
        expect(
            screen.getByText(`Error querying token info for ${token_id}`),
        ).toBeInTheDocument();

        // The send button is disabled as we cannot build a send token tx without the genesis info
        const sendButton = screen.getByRole('button', { name: 'Send' });
        expect(sendButton).toBeDisabled();

        // The Cashtab Msg switch is disabled because bip21 token tx is set
        expect(screen.getByTitle('Toggle Cashtab Msg')).toBeDisabled();
        // The op_return_raw switch is disabled because bip21 token tx is set
        expect(screen.getByTitle('Toggle op_return_raw')).toBeDisabled();

        // Clear the address input
        await user.clear(addressInputEl);

        // Just type an address
        await user.type(addressInputEl, address);

        // Now the query error is cleared
        expect(
            screen.queryByText(`Error querying token info for ${token_id}`),
        ).not.toBeInTheDocument();

        // If we input a send amount, the send button is no longer disabled
        const amountInputEl = screen.getByPlaceholderText('Amount');
        await user.type(amountInputEl, '100');
        expect(amountInputEl).toHaveValue(100);
        expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
    });
    it('SLP1 Fungible: Entering a valid bip21 query string for a token send tx will correcty populate the UI, and the tx can be sent', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Token send tx
        const hex =
            '02000000023023c2a02d7932e2f716016ab866249dd292387967dbd050ff200b8b8560073b010000006441bac61dbfa47bc7b92952caaa867c2c5fd11bde4cfa36c21b818dbb80c15b19a0c94845e916bc57bc5f35f32ca379bd48a6ee1dc4ded52794bcee231655b105f14121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dfffffffffe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006441a59dcc96f885dcbf56d473ba74b3202adb00dbc1142e379efa3784b559d7be97aa3d777eb4001613f205191d177c9896f652132d397a65cdfa93c69657d59f1b4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001010453454e44203fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d10908000000000000000122020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388acbb800e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '6de2d27d40bced679a8b8e55c85230ed8da0977c30ad31247fefc0b1eba0976e';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        // Mock API calls for fetching this token info from cache
        const token_id = slp1FixedBear.tokenId;
        // Set chronik mocks required for cache preparation and supply calc
        mockedChronik.setMock('token', {
            input: slp1FixedBear.tokenId,
            output: slp1FixedBear.token,
        });
        mockedChronik.setMock('tx', {
            input: slp1FixedBear.tokenId,
            output: slp1FixedBear.tx,
        });

        const { tokenName, tokenTicker } = slp1FixedBear.token.genesisInfo;

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        // The user enters a valid BIP21 query string with a valid amount param

        const token_decimalized_qty = '1';
        const address = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        const addressInput = `${address}?token_id=${token_id}&token_decimalized_qty=${token_decimalized_qty}`;
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this bip21 query string as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The 'Send To' input field is not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // Because we have a bip21-populated token amount field, the XEC amount input is not displayed
        expect(screen.queryByPlaceholderText('Amount')).not.toBeInTheDocument();

        // Instead, we see the bip21 token amount input
        const tokenInputField = screen.getByPlaceholderText(
            'Bip21-entered token amount',
        );
        expect(tokenInputField).toBeInTheDocument();
        expect(tokenInputField).toHaveValue(token_decimalized_qty);
        // This input field is disabled, because it is controled by the bip21 string in the Address input
        expect(tokenInputField).toBeDisabled();

        // We do not see a token ID query error
        expect(
            screen.queryByText(`Error querying token info for ${token_id}`),
        ).not.toBeInTheDocument();

        // We see the parsed tx
        const addressPreview = `${address.slice(
            0,
            'ecash:'.length + 3,
        )}...${address.slice(-3)}`;
        expect(
            screen.getByText(
                `Sending ${token_decimalized_qty} ${tokenName} (${tokenTicker}) to ${addressPreview}`,
            ),
        ).toBeInTheDocument();

        // The send button is enabled as we have valid bip21 token send for a token qty supported
        // by the wallet
        const sendButton = screen.getByRole('button', { name: 'Send' });
        expect(sendButton).toBeEnabled();

        // The Cashtab Msg switch is disabled because bip21 token tx is set
        expect(screen.getByTitle('Toggle Cashtab Msg')).toBeDisabled();
        // The op_return_raw switch is disabled because bip21 token tx is set
        expect(screen.getByTitle('Toggle op_return_raw')).toBeDisabled();

        // Click Send
        await user.click(sendButton);

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eToken sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
        await waitFor(() =>
            // The token amount input is now gone
            expect(tokenInputField).not.toBeInTheDocument(),
        );
    });
    it('ALP Fungible: Entering a valid bip21 query string for a token send tx will correcty populate the UI, and the tx can be sent', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            tokenTestWallet,
            localforage,
        );

        // Token send tx
        const hex =
            '020000000288bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c25010000006441fff980a72dab5fed2ef4b94c54c5b91dd2e4d22fab32bd8daa8ba8118fc45b121cceb8c43a869966219d1e6b1ebf6c34436287a349fbd132a11b8928cdf642784121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441c8203434106d39d750461d8a6939412f432220cba2e957f19a699e5ed57a4357bb257dfcde9aa5618d6b87721f939b69312c429eba28c056f06efad33b4875314121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0400000000000000003a6a5037534c5032000453454e4449884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c02102700000000301b0f00000022020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac18310f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const txid =
            'cf78a0c9f88027ab90dec0fe2180ef4d4d45ab431e179ce262ea19502202da52';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        // Mock API calls for fetching this token info from cache
        const token_id = alpMocks.tokenId;
        // Set chronik mocks required for cache preparation and supply calc
        mockedChronik.setMock('token', {
            input: alpMocks.tokenId,
            output: alpMocks.token,
        });
        mockedChronik.setMock('tx', {
            input: alpMocks.tokenId,
            output: alpMocks.tx,
        });

        const { tokenName, tokenTicker } = alpMocks.token.genesisInfo;

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        // The user enters a valid BIP21 query string with a valid amount param

        const token_decimalized_qty = '1';
        const address = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        const addressInput = `${address}?token_id=${token_id}&token_decimalized_qty=${token_decimalized_qty}`;
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this bip21 query string as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The 'Send To' input field is not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // Because we have a bip21-populated token amount field, the XEC amount input is not displayed
        expect(screen.queryByPlaceholderText('Amount')).not.toBeInTheDocument();

        // Instead, we see the bip21 token amount input
        const tokenInputField = screen.getByPlaceholderText(
            'Bip21-entered token amount',
        );
        expect(tokenInputField).toBeInTheDocument();
        expect(tokenInputField).toHaveValue(token_decimalized_qty);
        // This input field is disabled, because it is controled by the bip21 string in the Address input
        expect(tokenInputField).toBeDisabled();

        // We do not see a token ID query error
        expect(
            screen.queryByText(`Error querying token info for ${token_id}`),
        ).not.toBeInTheDocument();

        // We see the parsed tx
        const addressPreview = `${address.slice(
            0,
            'ecash:'.length + 3,
        )}...${address.slice(-3)}`;
        expect(
            screen.getByText(
                `Sending ${token_decimalized_qty} ${tokenName} (${tokenTicker}) to ${addressPreview}`,
            ),
        ).toBeInTheDocument();

        // The send button is enabled as we have valid bip21 token send for a token qty supported
        // by the wallet
        const sendButton = screen.getByRole('button', { name: 'Send' });
        expect(sendButton).toBeEnabled();

        // The Cashtab Msg switch is disabled because bip21 token tx is set
        expect(screen.getByTitle('Toggle Cashtab Msg')).toBeDisabled();
        // The op_return_raw switch is disabled because bip21 token tx is set
        expect(screen.getByTitle('Toggle op_return_raw')).toBeDisabled();

        // Click Send
        await user.click(sendButton);

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eToken sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
        await waitFor(() =>
            // The token amount input is now gone
            expect(tokenInputField).not.toBeInTheDocument(),
        );
    });
    it('SLP1 NFT Child: Entering a valid bip21 query string for a token send tx will correcty populate the UI, and the tx can be sent', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            tokenTestWallet,
            localforage,
        );

        // Token send tx
        const hex =
            '0200000002268322a2a8e67fe9efdaf15c9eb7397fb640ae32d8a245c2933f9eb967ff9b5d0100000064415b08020f453b87695e24d8ea104fab2c98c1e944502582599e945b407a8900dc75bcd599cbbb2cd3216402e9d6b0b1329aec686033cd838c9555777eaad8c0704121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf79261803000000644164f0fe5c018e1b2ef2ed49e0ff1d87e5fe116e32ca30db8422ae09cc825976abc705ae59faee5d3372638bc297cd70f77582f5d0c513bfabfd9146dfb916d3ad4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001410453454e44205d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a222832608000000000000000122020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac84330f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const txid =
            '57f665440f7ab0686fece1d744484140d3013e301b45842f5e9371597871ea8c';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        // Mock API calls for fetching this token info from cache
        const token_id = slp1NftChildMocks.tokenId;
        // Set chronik mocks required for cache preparation and supply calc
        mockedChronik.setMock('token', {
            input: slp1NftChildMocks.tokenId,
            output: slp1NftChildMocks.token,
        });
        mockedChronik.setMock('tx', {
            input: slp1NftChildMocks.tokenId,
            output: slp1NftChildMocks.tx,
        });

        const { tokenName, tokenTicker } = slp1NftChildMocks.token.genesisInfo;

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = screen.getByPlaceholderText('Address');
        // The user enters a valid BIP21 query string with a valid amount param

        const token_decimalized_qty = '1';
        const address = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        const addressInput = `${address}?token_id=${token_id}&token_decimalized_qty=${token_decimalized_qty}`;
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this bip21 query string as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The 'Send To' input field is not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // Because we have a bip21-populated token amount field, the XEC amount input is not displayed
        expect(screen.queryByPlaceholderText('Amount')).not.toBeInTheDocument();

        // Instead, we see the bip21 token amount input
        const tokenInputField = screen.getByPlaceholderText(
            'Bip21-entered token amount',
        );
        expect(tokenInputField).toBeInTheDocument();
        expect(tokenInputField).toHaveValue(token_decimalized_qty);
        // This input field is disabled, because it is controled by the bip21 string in the Address input
        expect(tokenInputField).toBeDisabled();

        // We do not see a token ID query error
        expect(
            screen.queryByText(`Error querying token info for ${token_id}`),
        ).not.toBeInTheDocument();

        // We see the parsed tx
        const addressPreview = `${address.slice(
            0,
            'ecash:'.length + 3,
        )}...${address.slice(-3)}`;
        expect(
            screen.getByText(
                `Sending ${token_decimalized_qty} ${tokenName} (${tokenTicker}) to ${addressPreview}`,
            ),
        ).toBeInTheDocument();

        // The send button is enabled as we have valid bip21 token send for a token qty supported
        // by the wallet
        const sendButton = screen.getByRole('button', { name: 'Send' });
        expect(sendButton).toBeEnabled();

        // The Cashtab Msg switch is disabled because bip21 token tx is set
        expect(screen.getByTitle('Toggle Cashtab Msg')).toBeDisabled();
        // The op_return_raw switch is disabled because bip21 token tx is set
        expect(screen.getByTitle('Toggle op_return_raw')).toBeDisabled();

        // Click Send
        await user.click(sendButton);

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('NFT sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
        await waitFor(() =>
            // The token amount input is now gone
            expect(tokenInputField).not.toBeInTheDocument(),
        );
    });
});

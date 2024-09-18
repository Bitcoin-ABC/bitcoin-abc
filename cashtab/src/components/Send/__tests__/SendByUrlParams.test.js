// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { walletWithXecAndTokens } from 'components/App/fixtures/mocks';
import {
    SEND_ADDRESS_VALIDATION_ERRORS,
    SEND_AMOUNT_VALIDATION_ERRORS,
} from 'components/Send/fixtures/mocks';
import { when } from 'jest-when';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import appConfig from 'config/app';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';

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

describe('<SendXec /> rendered with params in URL', () => {
    beforeEach(() => {
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
        // Unset the window location so it does not impact other tests in this file
        Object.defineProperty(window, 'location', {
            value: {
                hash: undefined,
            },
            writable: true, // possibility to override
        });
    });
    it('Legacy params. Address and value keys are set and valid.', async () => {
        const destinationAddress =
            'ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm';
        const value = 500;
        const hash = `#/send?address=${destinationAddress}&value=${value}`;
        // ?address=ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm&value=500
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true, // possibility to override
        });
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

        // Wait for balance to be loaded, as input fields are not populated until balance loads
        expect(await screen.findByText('9,513.12 XEC')).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // The 'Send To' input field has this address as a value
        await waitFor(() =>
            expect(addressInputEl).toHaveValue(destinationAddress),
        );
        // The address input is disabled
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The amount input is set to the expected value
        expect(amountInputEl).toHaveValue(value);
        // The amount input is disabled
        expect(amountInputEl).toHaveProperty('disabled', true);

        // Wait for balance to be loaded
        expect(await screen.findByText('9,513.12 XEC')).toBeInTheDocument();

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }

        // The Send button is not disabled because we have a valid amount
        expect(
            await screen.findByRole('button', { name: 'Send' }),
        ).not.toHaveStyle('cursor: not-allowed');
    });
    it('Legacy params. Address and value keys are set and valid. Invalid bip21 string is ignored.', async () => {
        const destinationAddress =
            'ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm';
        const legacyPassedAmount = 500;
        const hash = `#/send?address=${destinationAddress}&value=${legacyPassedAmount}&bip21=isthisgoingtodosomething&someotherparam=false&anotherstill=true`;
        // ?address=ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm&value=500&bip21=isthisgoingtodosomething&someotherparam=false&anotherstill=true
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true, // possibility to override
        });

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

        // Wait for balance to be loaded
        expect(await screen.findByText('9,513.12 XEC')).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // The 'Send To' input field has this address as a value
        await waitFor(() =>
            expect(addressInputEl).toHaveValue(destinationAddress),
        );
        // The address input is disabled
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The amount input is filled out per legacy passed amount
        expect(amountInputEl).toHaveValue(legacyPassedAmount);
        // The amount input is disabled
        expect(amountInputEl).toHaveProperty('disabled', true);

        // The Send button is not disabled because we have a valid amount
        expect(
            await screen.findByRole('button', { name: 'Send' }),
        ).not.toHaveStyle('cursor: not-allowed');

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }
    });
    it('Legacy params. Address field is populated + disabled while value field is empty + enabled if legacy url params have address defined and value present as undefined', async () => {
        const destinationAddress =
            'ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm';
        const hash = `#/send?address=${destinationAddress}&value=undefined`;
        // ?address=ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm&value=undefined
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true,
        });
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

        // Wait for balance to be loaded, as input fields are not populated until balance loads
        expect(await screen.findByText('9,513.12 XEC')).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // The 'Send To' input field has this address as a value
        await waitFor(() =>
            expect(addressInputEl).toHaveValue(destinationAddress),
        );
        // The address input is disabled
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The amount input is empty
        expect(amountInputEl).toHaveValue(null);
        // The amount input is not disabled
        expect(amountInputEl).toHaveProperty('disabled', false);

        // The Send button is disabled because no amount is entered
        expect(await screen.findByRole('button', { name: 'Send' })).toHaveStyle(
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
    });
    it('Legacy params. Address field is populated + disabled while value field is empty + enabled if legacy url params have address defined and no value key present', async () => {
        const destinationAddress =
            'ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm';
        const hash = `#/send?address=${destinationAddress}`;
        // ?address=ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true,
        });
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

        // Wait for balance to be loaded, as input fields are not populated until balance loads
        expect(await screen.findByText('9,513.12 XEC')).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // The 'Send To' input field has this address as a value
        await waitFor(() =>
            expect(addressInputEl).toHaveValue(destinationAddress),
        );
        // The address input is disabled
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The amount input is empty
        expect(amountInputEl).toHaveValue(null);
        // The amount input is not disabled
        expect(amountInputEl).toHaveProperty('disabled', false);

        // The Send button is disabled because no amount is entered
        expect(await screen.findByRole('button', { name: 'Send' })).toHaveStyle(
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
    });
    it('Legacy params. Params are ignored if only value param is present', async () => {
        const hash = `#/send?value=500`;
        // ?value=500
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true,
        });
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

        // The "Send to Many" switch is not disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            false,
        );

        // The 'Send To' input field is untouched
        expect(addressInputEl).toHaveValue('');
        // The address input is not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);

        // The amount input is empty
        expect(amountInputEl).toHaveValue(null);
        // The amount input is not disabled
        expect(amountInputEl).toHaveProperty('disabled', false);

        // The Send button is disabled because no amount is entered
        expect(await screen.findByRole('button', { name: 'Send' })).toHaveStyle(
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
    });
    it('Legacy params. Params are ignored if param is duplicated', async () => {
        const destinationAddress =
            'ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm';
        const hash = `#/send?address=${destinationAddress}&amount=500&amount=1000`;
        // ?address=ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm&amount=500&amount=1000
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true,
        });
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

        // The "Send to Many" switch is not disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            false,
        );

        // The 'Send To' input field is untouched
        expect(addressInputEl).toHaveValue('');
        // The address input is not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);

        // The amount input is empty
        expect(amountInputEl).toHaveValue(null);
        // The amount input is not disabled
        expect(amountInputEl).toHaveProperty('disabled', false);

        // The Send button is disabled because no amount is entered
        expect(await screen.findByRole('button', { name: 'Send' })).toHaveStyle(
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
    });
    it('Legacy params are not parsed as bip21 even if the bip21 param appears in the string', async () => {
        const destinationAddress =
            'ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm';
        const legacyPassedAmount = 500;
        const hash = `#/send?address=${destinationAddress}&value=${legacyPassedAmount}&bip21=ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=17&op_return_raw=04007461622263617368746162206D6573736167652077697468206F705F72657475726E5F726177`;
        // ?address=ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm&value=500&bip21=ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=17&op_return_raw=04007461622263617368746162206D6573736167652077697468206F705F72657475726E5F726177
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true,
        });
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

        // Wait for balance to be loaded
        expect(await screen.findByText('9,513.12 XEC')).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // The 'Send To' input field has this address as a value
        await waitFor(() =>
            expect(addressInputEl).toHaveValue(destinationAddress),
        );
        // The address input is disabled
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The amount input has the expected value
        expect(amountInputEl).toHaveValue(legacyPassedAmount);
        // The amount input is disabled
        expect(amountInputEl).toHaveProperty('disabled', true);

        // The Send button is not disabled because we have a valid amount
        expect(
            await screen.findByRole('button', { name: 'Send' }),
        ).not.toHaveStyle('cursor: not-allowed');

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }
    });
    it('bip21 param - valid bip21 param with amount and op_return_raw is parsed as expected', async () => {
        const destinationAddress =
            'ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm';
        const amount = 17;
        const op_return_raw =
            '04007461622263617368746162206d6573736167652077697468206f705f72657475726e5f726177';
        const bip21Str = `${destinationAddress}?amount=${amount}&op_return_raw=${op_return_raw}`;
        const hash = `#/send?bip21=${bip21Str}`;
        // ?bip21=ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm?amount=17&op_return_raw=04007461622263617368746162206D6573736167652077697468206F705F72657475726E5F726177
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true,
        });
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

        // Wait for balance to be loaded
        expect(await screen.findByText('9,513.12 XEC')).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // The 'Send To' input field has this address as a value
        await waitFor(() => expect(addressInputEl).toHaveValue(bip21Str));

        // The address input is disabled for app txs with bip21 strings
        // Note it is NOT disabled for txs where the user inputs the bip21 string
        // This is covered in SendXec.test.js
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // Amount input is the valid amount param value
        expect(amountInputEl).toHaveValue(amount);

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

        // The op_return_raw switch is disabled because we have txInfoFromUrl
        expect(screen.getByTitle('Toggle op_return_raw')).toHaveProperty(
            'disabled',
            true,
        );

        // The op_return_raw switch is checked because it is set by txInfoFromUrl
        expect(screen.getByTitle('Toggle op_return_raw')).toHaveProperty(
            'checked',
            true,
        );

        // We see the preview of this op_return_raw
        expect(
            screen.getByText('cashtab message with op_return_raw'),
        ).toBeInTheDocument();

        // The Send button is enabled as we have valid address and amount params
        expect(
            await screen.findByRole('button', { name: 'Send' }),
        ).not.toHaveStyle('cursor: not-allowed');

        // The Cashtab Msg switch is disabled because we have txInfoFromUrl
        expect(screen.getByTitle('Toggle Cashtab Msg')).toHaveProperty(
            'disabled',
            true,
        );
    });
    it('bip21 param - an invalid bip21 param shows validation errors but cannot be changed', async () => {
        const destinationAddress =
            'ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm';
        const amount = 17;
        const op_return_raw =
            '04007461622263617368746162206d6573736167652077697468206f705f72657475726e5f726177';
        // Repeat the op_return_raw param
        const bip21Str = `${destinationAddress}?amount=${amount}&op_return_raw=${op_return_raw}&op_return_raw=${op_return_raw}`;
        const hash = `#/send?bip21=${bip21Str}`;
        // ?bip21=ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm?amount=17&op_return_raw=04007461622263617368746162206D6573736167652077697468206F705F72657475726E5F726177&op_return_raw=04007461622263617368746162206D6573736167652077697468206F705F72657475726E5F726177
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true,
        });
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

        // Wait for balance to be loaded, as input fields are not populated until balance loads
        expect(await screen.findByText('9,513.12 XEC')).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // The 'Send To' input field has this address as a value
        await waitFor(() => expect(addressInputEl).toHaveValue(bip21Str));

        // The address input is disabled for app txs with bip21 strings
        // Note it is NOT disabled for txs where the user inputs the bip21 string
        // This is covered in SendXec.test.js
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // Amount input is updated despite invalid bip21 query, so the user can see the amount
        expect(amountInputEl).toHaveValue(amount);

        // The amount input is disabled because it was set by a bip21 query string and URL routing
        expect(amountInputEl).toHaveProperty('disabled', true);

        // We get the expected validation error
        expect(
            screen.getByText(
                'The op_return_raw param may not appear more than once',
            ),
        ).toBeInTheDocument();

        // The Send button is disabled
        expect(await screen.findByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );

        // The Cashtab Msg switch is disabled because we have txInfoFromUrl
        expect(screen.getByTitle('Toggle Cashtab Msg')).toHaveProperty(
            'disabled',
            true,
        );
    });
    it('No params. Send screen loads normally with no rendered input.', async () => {
        const hash = `#/send`;
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true, // possibility to override
        });
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

        // The "Send to Many" switch is not disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            false,
        );

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue('');
        // The address input is not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);

        // The amount input is empty
        expect(amountInputEl).toHaveValue(null);
        // The amount input is not disabled
        expect(amountInputEl).toHaveProperty('disabled', false);

        // The Send button is disabled
        expect(await screen.findByRole('button', { name: 'Send' })).toHaveStyle(
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
    });
    it('bip21 param - valid bip21 param with amount, op_return_raw, and additional output with amount is parsed as expected', async () => {
        const destinationAddress =
            'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv';
        const amount = 110;
        const secondOutputAddr =
            'ecash:qp4dxtmjlkc6upn29hh9pr2u8rlznwxeqqy0qkrjp5';
        const secondOutputAmount = 5.5;
        const op_return_raw =
            '0470617977202562dd05deda1c101b10562527bcd6bec20268fb94eed01843ba049cd774bec1';
        const bip21Str = `${destinationAddress}?amount=${amount}&op_return_raw=${op_return_raw}&addr=${secondOutputAddr}&amount=${secondOutputAmount}`;
        const hash = `#/send?bip21=${bip21Str}`;
        // ?bip21=ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv?amount=110&op_return_raw=0470617977202562dd05deda1c101b10562527bcd6bec20268fb94eed01843ba049cd774bec1&addr=ecash:qp4dxtmjlkc6upn29hh9pr2u8rlznwxeqqy0qkrjp5&amount=5.50
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true,
        });
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

        // Wait for balance to be loaded
        expect(await screen.findByText('9,513.12 XEC')).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // The 'Send To' input field has this address as a value
        await waitFor(() => expect(addressInputEl).toHaveValue(bip21Str));

        // The address input is disabled for app txs with bip21 strings
        // Note it is NOT disabled for txs where the user inputs the bip21 string
        // This is covered in SendXec.test.js
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The "Send to Many" switch is disabled
        expect(screen.getByTitle('Toggle Multisend')).toHaveProperty(
            'disabled',
            true,
        );

        // Amount input is not displayed
        expect(screen.queryByPlaceholderText('Amount')).not.toBeInTheDocument();

        // Instead, we see a bip21 output summary
        expect(
            screen.getByText('BIP21: Sending 115.50 XEC to 2 outputs'),
        ).toBeInTheDocument();

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

        // The op_return_raw switch is disabled because we have txInfoFromUrl
        expect(screen.getByTitle('Toggle op_return_raw')).toHaveProperty(
            'disabled',
            true,
        );

        // The op_return_raw switch is checked because it is set by txInfoFromUrl
        expect(screen.getByTitle('Toggle op_return_raw')).toHaveProperty(
            'checked',
            true,
        );

        // We see the preview of this op_return_raw
        expect(screen.getByText('Parsed op_return_raw')).toBeInTheDocument();

        // The Send button is enabled as we have valid address and amount params
        expect(
            await screen.findByRole('button', { name: 'Send' }),
        ).not.toHaveStyle('cursor: not-allowed');

        // The Cashtab Msg switch is disabled because we have txInfoFromUrl
        expect(screen.getByTitle('Toggle Cashtab Msg')).toHaveProperty(
            'disabled',
            true,
        );

        // We see expected summary of additional bip21 outputs
        expect(screen.getByText('Parsed BIP21 outputs')).toBeInTheDocument();
        expect(
            screen.getByText(`qr6lws...6lyxkv, 110.00 XEC`),
        ).toBeInTheDocument();
        expect(
            screen.getByText(`qp4dxt...qkrjp5, 5.50 XEC`),
        ).toBeInTheDocument();
    });
});

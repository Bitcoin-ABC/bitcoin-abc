import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
    walletWithXecAndTokens,
    SEND_ADDRESS_VALIDATION_ERRORS,
    SEND_AMOUNT_VALIDATION_ERRORS,
} from '../fixtures/mocks';
import { when } from 'jest-when';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import appConfig from 'config/app';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/fixtures/helpers';
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
        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByText('Multiple Recipients:'),
        ).not.toBeInTheDocument();

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(destinationAddress);
        // The address input is disabled
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The amount input is set to the expected value
        expect(amountInputEl).toHaveValue(value);
        // The amount input is disabled
        expect(amountInputEl).toHaveProperty('disabled', true);

        // The "Webapp Tx Request" notice is rendered
        expect(screen.getByText('Webapp Tx Request')).toBeInTheDocument();

        // The Bip21Alert span is not rendered
        expect(
            screen.queryByText('(set by BIP21 query string)'),
        ).not.toBeInTheDocument();

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
            await screen.findByRole('button', { name: /Send/ }),
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

        // Wait for balance to be loaded
        expect(await screen.findByText('9,513.12 XEC')).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByText('Multiple Recipients:'),
        ).not.toBeInTheDocument();

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(destinationAddress);
        // The address input is disabled
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The amount input is filled out per legacy passed amount
        expect(amountInputEl).toHaveValue(legacyPassedAmount);
        // The amount input is disabled
        expect(amountInputEl).toHaveProperty('disabled', true);

        // The "Webapp Tx Request" notice is rendered
        expect(screen.getByText('Webapp Tx Request')).toBeInTheDocument();

        // The Bip21Alert span is not rendered
        expect(
            screen.queryByText('(set by BIP21 query string)'),
        ).not.toBeInTheDocument();

        // The Send button is not disabled because we have a valid amount
        expect(
            await screen.findByRole('button', { name: /Send/ }),
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
        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByText('Multiple Recipients:'),
        ).not.toBeInTheDocument();

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(destinationAddress);
        // The address input is disabled
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The amount input is empty
        expect(amountInputEl).toHaveValue(null);
        // The amount input is not disabled
        expect(amountInputEl).toHaveProperty('disabled', false);

        // The "Webapp Tx Request" notice is rendered
        expect(screen.getByText('Webapp Tx Request')).toBeInTheDocument();

        // The Bip21Alert span is not rendered
        expect(
            screen.queryByText('(set by BIP21 query string)'),
        ).not.toBeInTheDocument();

        // The Send button is disabled because no amount is entered
        expect(await screen.findByRole('button', { name: /Send/ })).toHaveStyle(
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
        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByText('Multiple Recipients:'),
        ).not.toBeInTheDocument();

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(destinationAddress);
        // The address input is disabled
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The amount input is empty
        expect(amountInputEl).toHaveValue(null);
        // The amount input is not disabled
        expect(amountInputEl).toHaveProperty('disabled', false);

        // The "Webapp Tx Request" notice is rendered
        expect(screen.getByText('Webapp Tx Request')).toBeInTheDocument();

        // The Bip21Alert span is not rendered
        expect(
            screen.queryByText('(set by BIP21 query string)'),
        ).not.toBeInTheDocument();

        // The Send button is disabled because no amount is entered
        expect(await screen.findByRole('button', { name: /Send/ })).toHaveStyle(
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
        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The multiple recipients switch is rendered
        expect(screen.getByText('Multiple Recipients:')).toBeInTheDocument();

        // The 'Send To' input field is untouched
        expect(addressInputEl).toHaveValue('');
        // The address input is not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);

        // The amount input is empty
        expect(amountInputEl).toHaveValue(null);
        // The amount input is not disabled
        expect(amountInputEl).toHaveProperty('disabled', false);

        // The "Webapp Tx Request" notice is NOT rendered
        expect(screen.queryByText('Webapp Tx Request')).not.toBeInTheDocument();

        // The Bip21Alert span is not rendered
        expect(
            screen.queryByText('(set by BIP21 query string)'),
        ).not.toBeInTheDocument();

        // The Send button is disabled because no amount is entered
        expect(await screen.findByRole('button', { name: /Send/ })).toHaveStyle(
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
        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The multiple recipients switch is rendered
        expect(screen.getByText('Multiple Recipients:')).toBeInTheDocument();

        // The 'Send To' input field is untouched
        expect(addressInputEl).toHaveValue('');
        // The address input is not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);

        // The amount input is empty
        expect(amountInputEl).toHaveValue(null);
        // The amount input is not disabled
        expect(amountInputEl).toHaveProperty('disabled', false);

        // The "Webapp Tx Request" notice is NOT rendered
        expect(screen.queryByText('Webapp Tx Request')).not.toBeInTheDocument();

        // The Bip21Alert span is not rendered
        expect(
            screen.queryByText('(set by BIP21 query string)'),
        ).not.toBeInTheDocument();

        // The Send button is disabled because no amount is entered
        expect(await screen.findByRole('button', { name: /Send/ })).toHaveStyle(
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

        // Wait for balance to be loaded
        expect(await screen.findByText('9,513.12 XEC')).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByText('Multiple Recipients:'),
        ).not.toBeInTheDocument();

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(destinationAddress);
        // The address input is disabled
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The amount input has the expected value
        expect(amountInputEl).toHaveValue(legacyPassedAmount);
        // The amount input is disabled
        expect(amountInputEl).toHaveProperty('disabled', true);

        // The "Webapp Tx Request" notice is rendered
        expect(screen.getByText('Webapp Tx Request')).toBeInTheDocument();

        // The Bip21Alert span is not rendered
        expect(
            screen.queryByText('(set by BIP21 query string)'),
        ).not.toBeInTheDocument();

        // The Send button is not disabled because we have a valid amount
        expect(
            await screen.findByRole('button', { name: /Send/ }),
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
            '04007461622263617368746162206D6573736167652077697468206F705F72657475726E5F726177';
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

        // Wait for balance to be loaded
        expect(await screen.findByText('9,513.12 XEC')).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByText('Multiple Recipients:'),
        ).not.toBeInTheDocument();

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(bip21Str);

        // The address input is disabled for app txs with bip21 strings
        // Note it is NOT disabled for txs where the user inputs the bip21 string
        // This is covered in SendXec.test.js
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByText('Multiple Recipients:'),
        ).not.toBeInTheDocument();

        // Amount input is the valid amount param value
        expect(amountInputEl).toHaveValue(amount);

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
        expect(
            await screen.findByRole('button', { name: /Send/ }),
        ).not.toHaveStyle('cursor: not-allowed');

        // The "Webapp Tx Request" notice is rendered
        expect(screen.getByText('Webapp Tx Request')).toBeInTheDocument();

        // The Bip21Alert span is not rendered
        expect(
            screen.getByText('(set by BIP21 query string)'),
        ).toBeInTheDocument();

        // The Cashtab Message collapse is not rendered
        expect(
            screen.queryByTestId('cashtab-message-collapse'),
        ).not.toBeInTheDocument();

        // The Bip21Alert op_return_raw span is rendered
        const opReturnRawAlert = screen.getByTestId('op-return-raw-set-alert');
        expect(opReturnRawAlert).toBeInTheDocument();

        // Alert renders the set hex string
        expect(opReturnRawAlert).toHaveTextContent(
            `Hex OP_RETURN "${op_return_raw}" set by BIP21`,
        );
    });
    it('bip21 param - an invalid bip21 param shows validation errors but cannot be changed', async () => {
        const destinationAddress =
            'ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm';
        const amount = 17;
        const op_return_raw =
            '04007461622263617368746162206D6573736167652077697468206F705F72657475726E5F726177';
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
        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByText('Multiple Recipients:'),
        ).not.toBeInTheDocument();

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(bip21Str);

        // The address input is disabled for app txs with bip21 strings
        // Note it is NOT disabled for txs where the user inputs the bip21 string
        // This is covered in SendXec.test.js
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByText('Multiple Recipients:'),
        ).not.toBeInTheDocument();

        // Amount input is not updated as the bip21 query is invalid
        expect(amountInputEl).toHaveValue(null);

        // The amount input is not disabled because it is not set by the invalid bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // We get the expected validation error
        expect(
            // Note that, due to antd quirks, we get 2 of these
            screen.getAllByText(
                'bip21 parameters may not appear more than once',
            )[0],
        ).toBeInTheDocument();

        // The Send button is disabled
        expect(await screen.findByRole('button', { name: /Send/ })).toHaveStyle(
            'cursor: not-allowed',
        );

        // The "Webapp Tx Request" notice is rendered
        expect(screen.getByText('Webapp Tx Request')).toBeInTheDocument();

        // The Bip21Alert span is not rendered as no info about the tx is set for invalid bip21
        expect(
            screen.queryByText('(set by BIP21 query string)'),
        ).not.toBeInTheDocument();

        // The Cashtab Message collapse is not rendered
        expect(
            screen.queryByTestId('cashtab-message-collapse'),
        ).not.toBeInTheDocument();

        // The Bip21Alert op_return_raw span is not rendered as the bip21 query string is invalid
        const opReturnRawAlert = screen.queryByTestId(
            'op-return-raw-set-alert',
        );
        expect(opReturnRawAlert).not.toBeInTheDocument();
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
        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The multiple recipients switch is rendered
        expect(screen.getByText('Multiple Recipients:')).toBeInTheDocument();

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue('');
        // The address input is not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);

        // The amount input is empty
        expect(amountInputEl).toHaveValue(null);
        // The amount input is not disabled
        expect(amountInputEl).toHaveProperty('disabled', false);

        // The "Webapp Tx Request" notice is NOT rendered
        expect(screen.queryByText('Webapp Tx Request')).not.toBeInTheDocument();

        // The Bip21Alert span is not rendered
        expect(
            screen.queryByText('(set by BIP21 query string)'),
        ).not.toBeInTheDocument();

        // The Send button is disabled
        expect(await screen.findByRole('button', { name: /Send/ })).toHaveStyle(
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
});

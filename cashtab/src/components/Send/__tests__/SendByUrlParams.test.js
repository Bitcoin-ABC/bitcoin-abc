import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SendXec from '../SendXec';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { mockWalletContext } from '../fixtures/mocks';
import { WalletContext } from 'utils/context';
import { BrowserRouter } from 'react-router-dom';

function mockFunction() {
    const original = jest.requireActual('react-router-dom');
    return {
        ...original,
        useLocation: jest.fn().mockReturnValue({
            pathname: '/another-route',
            search: '',
            hash: '',
            state: null,
            key: '5nvxpbdafa',
        }),
    };
}

jest.mock('react-router-dom', () => mockFunction());

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

const TestSendXecScreen = (
    <BrowserRouter>
        <WalletContext.Provider value={mockWalletContext}>
            <ThemeProvider theme={theme}>
                <SendXec />
            </ThemeProvider>
        </WalletContext.Provider>
    </BrowserRouter>
);

describe('<SendXec /> rendered with params in URL', () => {
    afterEach(() => {
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
        const hash = `#/send?address=${destinationAddress}&value=500`;
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true, // possibility to override
        });
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();
        expect(amountInputEl).toBeInTheDocument();

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(destinationAddress);
        // The address input is disabled
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The amount input is empty
        expect(amountInputEl).toHaveValue(500);
        // The amount input is disabled
        expect(amountInputEl).toHaveProperty('disabled', true);

        // The app-created-tx is rendered
        expect(screen.queryByTestId('app-created-tx')).toBeInTheDocument();

        // The Bip21Alert span is not rendered
        const bip21Alert = screen.queryByTestId('bip-alert');
        expect(bip21Alert).not.toBeInTheDocument();

        // The Send button is not disabled because we have a valid amount
        expect(screen.queryByTestId('disabled-send')).not.toBeInTheDocument();

        // No validation errors on load
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();
    });
    it('Legacy params. Address and value keys are set and valid. Unsupported legacy params are ignored.', async () => {
        const destinationAddress =
            'ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm';
        const hash = `#/send?address=${destinationAddress}&value=500&bip21=isthisgoingtodosomething&someotherparam=false&anotherstill=true`;
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true, // possibility to override
        });
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();
        expect(amountInputEl).toBeInTheDocument();

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(destinationAddress);
        // The address input is disabled
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The amount input is empty
        expect(amountInputEl).toHaveValue(500);
        // The amount input is disabled
        expect(amountInputEl).toHaveProperty('disabled', true);

        // The app-created-tx is rendered
        expect(screen.queryByTestId('app-created-tx')).toBeInTheDocument();

        // The Bip21Alert span is not rendered
        const bip21Alert = screen.queryByTestId('bip-alert');
        expect(bip21Alert).not.toBeInTheDocument();

        // The Send button is not disabled because we have a valid amount
        expect(screen.queryByTestId('disabled-send')).not.toBeInTheDocument();

        // No validation errors on load
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();
    });
    it('Legacy params. Address field is populated + disabled while value field is empty + enabled if legacy url params have address defined and value present as undefined', async () => {
        const destinationAddress =
            'ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm';
        const hash = `#/send?address=${destinationAddress}&value=undefined`;
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true,
        });
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();
        expect(amountInputEl).toBeInTheDocument();

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(destinationAddress);
        // The address input is disabled
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The amount input is empty
        expect(amountInputEl).toHaveValue(null);
        // The amount input is not disabled
        expect(amountInputEl).toHaveProperty('disabled', false);

        // The app-created-tx is rendered
        expect(screen.queryByTestId('app-created-tx')).toBeInTheDocument();

        // The Bip21Alert span is not rendered
        const bip21Alert = screen.queryByTestId('bip-alert');
        expect(bip21Alert).not.toBeInTheDocument();

        // The Send button is disabled because no amount is entered
        expect(screen.queryByTestId('disabled-send')).toBeInTheDocument();

        // No validation errors on load
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();
    });
    it('Legacy params. Address field is populated + disabled while value field is empty + enabled if legacy url params have address defined and no value key present', async () => {
        const destinationAddress =
            'ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm';
        const hash = `#/send?address=${destinationAddress}`;
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true,
        });
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();
        expect(amountInputEl).toBeInTheDocument();

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(destinationAddress);
        // The address input is disabled
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The amount input is empty
        expect(amountInputEl).toHaveValue(null);
        // The amount input is not disabled
        expect(amountInputEl).toHaveProperty('disabled', false);

        // The app-created-tx is rendered
        expect(screen.queryByTestId('app-created-tx')).toBeInTheDocument();

        // The Bip21Alert span is not rendered
        const bip21Alert = screen.queryByTestId('bip-alert');
        expect(bip21Alert).not.toBeInTheDocument();

        // The Send button is disabled because no amount is entered
        expect(screen.queryByTestId('disabled-send')).toBeInTheDocument();

        // No validation errors on load
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();
    });
    it('Legacy params. Params are ignored if only value param is present', async () => {
        const hash = `#/send?value=500`;
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true,
        });
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();
        expect(amountInputEl).toBeInTheDocument();

        // The multiple recipients switch is rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).toBeInTheDocument();

        // The 'Send To' input field is untouched
        expect(addressInputEl).toHaveValue('');
        // The address input is not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);

        // The amount input is empty
        expect(amountInputEl).toHaveValue(null);
        // The amount input is not disabled
        expect(amountInputEl).toHaveProperty('disabled', false);

        // The app-created-tx is not rendered
        expect(screen.queryByTestId('app-created-tx')).not.toBeInTheDocument();

        // The Bip21Alert span is not rendered
        const bip21Alert = screen.queryByTestId('bip-alert');
        expect(bip21Alert).not.toBeInTheDocument();

        // The Send button is disabled because no amount is entered
        expect(screen.queryByTestId('disabled-send')).toBeInTheDocument();

        // No validation errors on load
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();
    });
    it('Legacy params. Params are ignored if param is duplicated', async () => {
        const destinationAddress =
            'ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm';
        const hash = `#/send?address=${destinationAddress}&amount=500&amount=1000`;
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true,
        });
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();
        expect(amountInputEl).toBeInTheDocument();

        // The multiple recipients switch is rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).toBeInTheDocument();

        // The 'Send To' input field is untouched
        expect(addressInputEl).toHaveValue('');
        // The address input is not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);

        // The amount input is empty
        expect(amountInputEl).toHaveValue(null);
        // The amount input is not disabled
        expect(amountInputEl).toHaveProperty('disabled', false);

        // The app-created-tx is not rendered
        expect(screen.queryByTestId('app-created-tx')).not.toBeInTheDocument();

        // The Bip21Alert span is not rendered
        const bip21Alert = screen.queryByTestId('bip-alert');
        expect(bip21Alert).not.toBeInTheDocument();

        // The Send button is disabled because no amount is entered
        expect(screen.queryByTestId('disabled-send')).toBeInTheDocument();

        // No validation errors on load
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();
    });
    it('Legacy params are not parsed as bip21 even if the bip21 param appears in the string', async () => {
        const destinationAddress =
            'ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm';
        const hash = `#/send?address=${destinationAddress}&value=500&bip21=ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=17&op_return_raw=04007461622263617368746162206D6573736167652077697468206F705F72657475726E5F726177`;
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true,
        });
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();
        expect(amountInputEl).toBeInTheDocument();

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(destinationAddress);
        // The address input is disabled
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The amount input is empty
        expect(amountInputEl).toHaveValue(500);
        // The amount input is disabled
        expect(amountInputEl).toHaveProperty('disabled', true);

        // The app-created-tx is rendered
        expect(screen.queryByTestId('app-created-tx')).toBeInTheDocument();

        // The Bip21Alert span is not rendered
        const bip21Alert = screen.queryByTestId('bip-alert');
        expect(bip21Alert).not.toBeInTheDocument();

        // The Send button is not disabled because we have a valid amount
        expect(screen.queryByTestId('disabled-send')).not.toBeInTheDocument();

        // No validation errors on load
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();
    });
    it('bip21 param - valid bip21 param with amount and op_return_raw is parsed as expected', async () => {
        const destinationAddress =
            'ecash:qp33mh3a7qq7p8yulhnvwty2uq5ynukqcvuxmvzfhm';
        const amount = 17;
        const op_return_raw =
            '04007461622263617368746162206D6573736167652077697468206F705F72657475726E5F726177';
        const bip21Str = `${destinationAddress}?amount=${amount}&op_return_raw=${op_return_raw}`;
        const hash = `#/send?bip21=${bip21Str}`;
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true,
        });
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();
        expect(amountInputEl).toBeInTheDocument();

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(bip21Str);

        // The address input is disabled for app txs with bip21 strings
        // Note it is NOT disabled for txs where the user inputs the bip21 string
        // This is covered in SendXec.test.js
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();

        // Amount input is the valid amount param value
        expect(amountInputEl).toHaveValue(amount);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // No validation errors
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();

        // The Send button is enabled as we have valid address and amount params
        expect(screen.queryByTestId('disabled-send')).not.toBeInTheDocument();

        // The app-created-tx is rendered
        expect(screen.queryByTestId('app-created-tx')).toBeInTheDocument();

        // The Bip21Alert span is rendered
        const bip21Alert = screen.getByTestId('bip-alert');
        expect(bip21Alert).toBeInTheDocument();

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
        Object.defineProperty(window, 'location', {
            value: {
                hash,
            },
            writable: true,
        });
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();
        expect(amountInputEl).toBeInTheDocument();

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(bip21Str);

        // The address input is disabled for app txs with bip21 strings
        // Note it is NOT disabled for txs where the user inputs the bip21 string
        // This is covered in SendXec.test.js
        expect(addressInputEl).toHaveProperty('disabled', true);

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();

        // Amount input is not updated as the bip21 query is invalid
        expect(amountInputEl).toHaveValue(null);

        // The amount input is not disabled because it is not set by the invalid bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // Check for antd error div
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).toBeInTheDocument();
        expect(addressValidationErrorDiv).toHaveTextContent(
            'bip21 parameters may not appear more than once',
        );

        // The Send button is disabled
        expect(screen.queryByTestId('disabled-send')).toBeInTheDocument();

        // The app-created-tx is rendered
        expect(screen.queryByTestId('app-created-tx')).toBeInTheDocument();

        // The Bip21Alert span is not rendered as no info about the tx is set for invalid bip21
        const bip21Alert = screen.queryByTestId('bip-alert');
        expect(bip21Alert).not.toBeInTheDocument();

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
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();
        expect(amountInputEl).toBeInTheDocument();

        // The multiple recipients switch is rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).toBeInTheDocument();

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue('');
        // The address input is not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);

        // The amount input is empty
        expect(amountInputEl).toHaveValue(null);
        // The amount input is not disabled
        expect(amountInputEl).toHaveProperty('disabled', false);

        // The app-created-tx is not rendered
        expect(screen.queryByTestId('app-created-tx')).not.toBeInTheDocument();

        // The Bip21Alert span is not rendered
        const bip21Alert = screen.queryByTestId('bip-alert');
        expect(bip21Alert).not.toBeInTheDocument();

        // The Send button is disable
        expect(screen.queryByTestId('disabled-send')).toBeInTheDocument();

        // No validation errors on load
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();
    });
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import SendXec from '../SendXec';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { mockWalletContext } from '../fixtures/mocks';
import { WalletContext } from 'utils/context';
import { BrowserRouter } from 'react-router-dom';
import { when } from 'jest-when';
import aliasSettings from 'config/alias';
import { MockChronikClient } from '../../../../../apps/mock-chronik-client';
import { explorer } from 'config/explorer';

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

// Getting by class name is the only practical way to get some antd components
/* eslint testing-library/no-container: 0 */
describe('<SendXec />', () => {
    it('Renders the SendXec screen with send address input', async () => {
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');
        const disabledSend = screen.getByTestId('disabled-send');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();
        expect(amountInputEl).toBeInTheDocument();

        // The multiple recipients switch is rendered
        expect(
            screen.getByTestId('multiple-recipients-switch'),
        ).toBeInTheDocument();

        // Inputs are not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);
        expect(amountInputEl).toHaveProperty('disabled', false);

        // The Bip21Alert span is not rendered
        // NB that queryByTestId (vs getByTestId) should be used
        // for components that may not be in the doc at all
        // Otherwise will throw an error
        const bip21Alert = screen.queryByTestId('bip-alert');
        expect(bip21Alert).not.toBeInTheDocument();

        // The Send button is disabled
        expect(disabledSend).toBeInTheDocument();

        // No validation errors on load
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();
    });
    it('Pass valid address to Send To field', async () => {
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');
        const disabledSend = screen.getByTestId('disabled-send');

        // The user enters a valid address
        const addressInput = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The multiple recipients switch is rendered
        expect(
            screen.getByTestId('multiple-recipients-switch'),
        ).toBeInTheDocument();

        // The Bip21Alert span is not rendered
        const bip21Alert = screen.queryByTestId('bip-alert');
        expect(bip21Alert).not.toBeInTheDocument();

        // Amount input is untouched
        expect(amountInputEl).toHaveValue(null);

        // The amount input is NOT disabled because there is no BIP21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // Check for antd error div
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();

        // The Send button is disabled because amount is null
        expect(disabledSend).toBeInTheDocument();
    });
    it('Pass valid alias to Send To field', async () => {
        const { container } = await render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

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
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The multiple recipients switch is rendered
        expect(
            screen.getByTestId('multiple-recipients-switch'),
        ).toBeInTheDocument();

        // The Bip21Alert span is not rendered
        const bip21Alert = screen.queryByTestId('bip-alert');
        expect(bip21Alert).not.toBeInTheDocument();

        // Amount input is untouched
        expect(amountInputEl).toHaveValue(null);

        // The amount input is NOT disabled because there is no BIP21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // Check for antd error div
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();

        // The Send button is disabled because amount is null
        expect(screen.getByTestId('disabled-send')).toBeInTheDocument();

        // The alias address preview renders the expected address preview
        const aliasAddrPreview = screen.queryByTestId('alias-address-preview');
        expect(aliasAddrPreview).toBeInTheDocument();
        expect(aliasAddrPreview).toHaveTextContent(
            `${expectedResolvedAddress.slice(
                0,
                10,
            )}...${expectedResolvedAddress.slice(-5)}`,
        );
    });
    it('Pass an invalid address to Send To field and get a validation error', async () => {
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // The user enters an invalid address
        const addressInput = 'ecash:notValid';
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The multiple recipients switch is rendered
        expect(
            screen.getByTestId('multiple-recipients-switch'),
        ).toBeInTheDocument();

        // The Bip21Alert span is not rendered
        const bip21Alert = screen.queryByTestId('bip-alert');
        expect(bip21Alert).not.toBeInTheDocument();

        // Amount input is untouched
        expect(amountInputEl).toHaveValue(null);

        // The amount input is NOT disabled because there is no BIP21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // Error div exists and has expected error
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).toBeInTheDocument();
        expect(addressValidationErrorDiv).toHaveTextContent('Invalid address');

        // The Send button is disabled
        expect(screen.getByTestId('disabled-send')).toBeInTheDocument();
    });
    it('Pass a possibly valid alias without .xec suffix to Send To field and get expected error', async () => {
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // The user enters an alias that could be valid except missing suffix '.xec'
        const addressInput = 'aliasnosuffix';
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The multiple recipients switch is rendered
        expect(
            screen.getByTestId('multiple-recipients-switch'),
        ).toBeInTheDocument();

        // The Bip21Alert span is not rendered
        const bip21Alert = screen.queryByTestId('bip-alert');
        expect(bip21Alert).not.toBeInTheDocument();

        // Amount input is untouched
        expect(amountInputEl).toHaveValue(null);

        // The amount input is NOT disabled because there is no BIP21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // Error div exists and has expected error
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).toBeInTheDocument();
        expect(addressValidationErrorDiv).toHaveTextContent(
            `Aliases must end with '.xec'`,
        );

        // The Send button is disabled
        expect(screen.getByTestId('disabled-send')).toBeInTheDocument();
    });
    it('Pass a valid alias to Send To field that has not yet been registered and get expected error', async () => {
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

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
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The multiple recipients switch is rendered
        expect(
            screen.getByTestId('multiple-recipients-switch'),
        ).toBeInTheDocument();

        // The Bip21Alert span is not rendered
        const bip21Alert = screen.queryByTestId('bip-alert');
        expect(bip21Alert).not.toBeInTheDocument();

        // Amount input is untouched
        expect(amountInputEl).toHaveValue(null);

        // The amount input is NOT disabled because there is no BIP21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // Error div exists and has expected error
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).toBeInTheDocument();
        expect(addressValidationErrorDiv).toHaveTextContent(
            `eCash Alias does not exist or yet to receive 1 confirmation`,
        );

        // The Send button is disabled
        expect(screen.getByTestId('disabled-send')).toBeInTheDocument();
    });
    it('Get expected error msg and send disabled if bad response from alias server', async () => {
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

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
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The multiple recipients switch is rendered
        expect(
            screen.getByTestId('multiple-recipients-switch'),
        ).toBeInTheDocument();

        // The Bip21Alert span is not rendered
        const bip21Alert = screen.queryByTestId('bip-alert');
        expect(bip21Alert).not.toBeInTheDocument();

        // Amount input is untouched
        expect(amountInputEl).toHaveValue(null);

        // The amount input is NOT disabled because there is no BIP21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // Error div exists and has expected error
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).toBeInTheDocument();
        expect(addressValidationErrorDiv).toHaveTextContent(
            `Error resolving alias at indexer, contact admin.`,
        );

        // The Send button is disabled
        expect(screen.getByTestId('disabled-send')).toBeInTheDocument();
    });
    it('Pass a valid address and bip21 query string with valid amount param to Send To field', async () => {
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // The user enters a valid BIP21 query string with a valid amount param
        const addressInput =
            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=500';
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();

        // Amount input is the valid amount param value
        expect(amountInputEl).toHaveValue(500);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // No validation errors
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();

        // The Send button is enabled as we have valid address and amount params
        expect(screen.queryByTestId('disabled-send')).not.toBeInTheDocument();

        // The Bip21Alert span is rendered
        const bip21Alert = screen.getByTestId('bip-alert');
        expect(bip21Alert).toBeInTheDocument();
    });
    it('Pass a valid alias and bip21 query string with valid amount param to Send To field', async () => {
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

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
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();

        // Amount input is the valid amount param value
        expect(amountInputEl).toHaveValue(500);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // No validation errors
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();

        // The Send button is enabled as we have valid address and amount params
        expect(screen.queryByTestId('disabled-send')).not.toBeInTheDocument();

        // The Bip21Alert span is rendered
        const bip21Alert = screen.getByTestId('bip-alert');
        expect(bip21Alert).toBeInTheDocument();

        // The alias address preview renders the expected address preview
        const aliasAddrPreview = screen.queryByTestId('alias-address-preview');
        expect(aliasAddrPreview).toBeInTheDocument();
        expect(aliasAddrPreview).toHaveTextContent(
            `${expectedResolvedAddress.slice(
                0,
                10,
            )}...${expectedResolvedAddress.slice(-5)}`,
        );
    });
    it('Pass a valid address and bip21 query string with invalid amount param (dust) to Send To field', async () => {
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // The user enters a valid BIP21 query string with a valid amount param
        const dustAmount = 5;
        const addressInput = `ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=${dustAmount}`;
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // Amount input is the invalid amount param value
        expect(amountInputEl).toHaveValue(dustAmount);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // We have the expected validation error for the amount
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).toBeInTheDocument();
        expect(addressValidationErrorDiv).toHaveTextContent(
            'Send amount must be at least 5.5 XEC',
        );

        // The Send button is disabled
        expect(screen.getByTestId('disabled-send')).toBeInTheDocument();

        // The Bip21Alert span is rendered
        const bip21Alert = screen.getByTestId('bip-alert');
        expect(bip21Alert).toBeInTheDocument();

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();
    });
    it('Valid address with valid bip21 query string with valid amount param rejected if amount exceeds wallet balance', async () => {
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // The user enters a valid BIP21 query string with a valid amount param
        const exceedBalanceAmount = 1000000; // 1 million X E C
        const addressInput = `ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=${exceedBalanceAmount}`;
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // Amount input is the invalid amount param value
        expect(amountInputEl).toHaveValue(exceedBalanceAmount);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // We have the expected validation error for the amount
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).toBeInTheDocument();
        expect(addressValidationErrorDiv).toHaveTextContent(
            `Amount cannot exceed your XEC balance`,
        );

        // The Send button is disabled
        expect(screen.getByTestId('disabled-send')).toBeInTheDocument();

        // The Bip21Alert span is rendered
        const bip21Alert = screen.getByTestId('bip-alert');
        expect(bip21Alert).toBeInTheDocument();

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();
    });
    it('Pass a valid alias and bip21 query string with invalid amount param (too many decimals) to Send To field', async () => {
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

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
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // Amount input is the invalid amount param value
        expect(amountInputEl).toHaveValue(amount);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // We have the expected validation error for the amount
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).toBeInTheDocument();
        expect(addressValidationErrorDiv).toHaveTextContent(
            'XEC transactions do not support more than 2 decimal places',
        );

        // The Send button is disabled
        expect(screen.getByTestId('disabled-send')).toBeInTheDocument();

        // The Bip21Alert span is rendered
        const bip21Alert = screen.getByTestId('bip-alert');
        expect(bip21Alert).toBeInTheDocument();

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();

        // The alias address preview renders the expected address preview
        const aliasAddrPreview = screen.queryByTestId('alias-address-preview');
        expect(aliasAddrPreview).toBeInTheDocument();
        expect(aliasAddrPreview).toHaveTextContent(
            `${expectedResolvedAddress.slice(
                0,
                10,
            )}...${expectedResolvedAddress.slice(-5)}`,
        );
    });
    it('Pass a valid address and an invalid bip21 query string', async () => {
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // The user enters a badly formed query string
        const addressInput =
            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?notaparam=500';
        await userEvent.type(addressInputEl, addressInput);

        // The Send To input value matches user input
        expect(addressInputEl).toHaveValue(addressInput);

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();

        // Amount input unchanged
        expect(amountInputEl).toHaveValue(null);

        // The amount input is not disabled because no amount param is specified
        expect(amountInputEl).toHaveProperty('disabled', false);

        // Check for antd error div
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).toBeInTheDocument();
        expect(addressValidationErrorDiv).toHaveTextContent(
            'Unsupported param "notaparam"',
        );
        // The Send button is disabled
        expect(screen.getByTestId('disabled-send')).toBeInTheDocument();

        // The Bip21Alert span is not rendered as there is no amount param
        const bip21Alert = screen.queryByTestId('bip-alert');
        expect(bip21Alert).not.toBeInTheDocument();

        // The Cashtab Message collapse is rendered as there is no op_return_raw param
        expect(
            screen.queryByTestId('cashtab-message-collapse'),
        ).not.toBeInTheDocument();
    });
    it('Pass a valid address and bip21 query string with op_return_raw param to Send To field', async () => {
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // The user enters a valid BIP21 query string with a valid amount param
        const addressInput =
            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?op_return_raw=0401020304';
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();

        // Amount input is untouched
        expect(amountInputEl).toHaveValue(null);

        // The amount input is not disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // No validation errors
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();

        // The Send button is disabled because amount is not entered
        expect(screen.getByTestId('disabled-send')).toBeInTheDocument();

        // The Bip21Alert amount span is not rendered
        const bip21Alert = screen.queryByTestId('bip-alert');
        expect(bip21Alert).not.toBeInTheDocument();

        // The Cashtab Message collapse is not rendered because op_return_raw is set
        expect(
            screen.queryByTestId('cashtab-message-collapse'),
        ).not.toBeInTheDocument();

        // The Bip21Alert op_return_raw span is rendered
        const opReturnRawAlert = screen.getByTestId('op-return-raw-set-alert');
        expect(opReturnRawAlert).toBeInTheDocument();

        // Alert renders the set hex string
        expect(opReturnRawAlert).toHaveTextContent(
            `Hex OP_RETURN "0401020304" set by BIP21`,
        );
    });
    it('Pass a valid address and bip21 query string with valid amount and op_return_raw params to Send To field', async () => {
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // The user enters a valid BIP21 query string with a valid amount param
        const addressInput =
            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=500&op_return_raw=0401020304';
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();

        // Amount input is the valid amount param value
        expect(amountInputEl).toHaveValue(500);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // No validation errors
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();

        // The Send button is enabled as we have valid address and amount params
        expect(screen.queryByTestId('disabled-send')).not.toBeInTheDocument();

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
            `Hex OP_RETURN "0401020304" set by BIP21`,
        );
    });
    it('Pass a valid address and bip21 query string with valid amount and invalid op_return_raw params to Send To field', async () => {
        const { container } = render(TestSendXecScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // The user enters a valid BIP21 query string with a valid amount param
        const addressInput =
            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=500&op_return_raw=notahexstring';
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();

        // Amount input is the valid amount param value
        expect(amountInputEl).toHaveValue(500);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // Check for antd error div
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).toBeInTheDocument();
        expect(addressValidationErrorDiv).toHaveTextContent(
            'Invalid op_return_raw param "notahexstring"',
        );

        // The Send button is disabled as we have valid address and amount params
        expect(screen.getByTestId('disabled-send')).toBeInTheDocument();

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
            `Hex OP_RETURN "notahexstring" set by BIP21`,
        );
    });
    it('Clicking "Send" will send a valid tx with op_return_raw after entry of a valid address and bip21 query string with valid amount and op_return_raw params to Send To field', async () => {
        const mockedChronik = new MockChronikClient();

        // Can check in electrum for opreturn and amount
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006a47304402206d45893e238b7e30110d4e0d47e63204a7d6347169547bebad5200be510b8790022014eb3457545423b9eb04aec14e28551548c011ee3544cb40619063dfbb20a1c54121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000296a04007461622263617368746162206d6573736167652077697468206f705f72657475726e5f726177a4060000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac417b0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '79e6afc28d4149c51c4e2a32c05c57fb59c1c164fde1afc655590ce99ed70cb8';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });
        const mockWalletContextWithChronik = JSON.parse(
            JSON.stringify(mockWalletContext),
        );
        mockWalletContextWithChronik.chronik = mockedChronik;
        mockWalletContextWithChronik.chaintipBlockheight = 800000;
        const { container } = render(
            <BrowserRouter>
                <WalletContext.Provider value={mockWalletContextWithChronik}>
                    <ThemeProvider theme={theme}>
                        <SendXec />
                    </ThemeProvider>
                </WalletContext.Provider>
            </BrowserRouter>,
        );
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('send-xec-input');

        // The user enters a valid BIP21 query string with a valid amount param
        const addressInput =
            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=17&op_return_raw=04007461622263617368746162206D6573736167652077697468206F705F72657475726E5F726177';
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);
        // The 'Send To' input field is not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);

        // The multiple recipients switch is not rendered
        expect(
            screen.queryByTestId('multiple-recipients-switch'),
        ).not.toBeInTheDocument();

        // Amount input is the valid amount param value
        expect(amountInputEl).toHaveValue(17);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // No validation errors
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();

        // The Send button is enabled as we have valid address and amount params
        expect(screen.queryByTestId('disabled-send')).not.toBeInTheDocument();

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
            `Hex OP_RETURN "04007461622263617368746162206D6573736167652077697468206F705F72657475726E5F726177" set by BIP21`,
        );

        // Click Send
        await userEvent.click(screen.getByTestId('send-it'), addressInput);

        // Notification is rendered with expected txid?;
        const txSuccessNotification = await screen.findByText(
            'Transaction successful. Click to view in block explorer.',
        );
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
        await waitFor(() =>
            // The op_return_raw set alert is now removed
            expect(
                screen.queryByTestId('op-return-raw-set-alert'),
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

        // The multiple recipients switch is now rendered
        expect(
            await screen.findByTestId('multiple-recipients-switch'),
        ).toBeInTheDocument();

        // TODO
        /*
        Some behavior for after tx success that is confirmed in manual testing is not seen here
        e.g. collapse should be re-rendered, address input should be cleared
        Run into errors with the test, to be troubleshooted

        Even with this issue, tests are tremendously helpful
        */
    });
});

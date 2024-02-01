import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import SendToken from '../SendToken';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { mockWalletContext } from '../fixtures/mocks';
import { WalletContext } from 'utils/context';
import { BrowserRouter } from 'react-router-dom';
import { when } from 'jest-when';
import aliasSettings from 'config/alias';
import { MockChronikClient } from '../../../../../apps/mock-chronik-client';
import { explorer } from 'config/explorer';

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

const TestSendTokenScreen = (
    <BrowserRouter>
        <WalletContext.Provider value={mockWalletContext}>
            <ThemeProvider theme={theme}>
                <SendToken tokenId="3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109" />
            </ThemeProvider>
        </WalletContext.Provider>
    </BrowserRouter>
);

describe('<SendToken />', () => {
    it('Renders the SendToken screen with send address input', async () => {
        const { container } = render(TestSendTokenScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');
        const amountInputEl = screen.getByTestId('token-amount-input');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();
        expect(amountInputEl).toBeInTheDocument();

        // Inputs are not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);
        expect(amountInputEl).toHaveProperty('disabled', false);

        // No validation errors before input
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();
    });
    it('Accepts a valid ecash: prefixed address', async () => {
        const { container } = render(TestSendTokenScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();

        // The user enters a valid address
        const addressInput = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // No validation errors before input
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();
    });
    it('Accepts a valid etoken: prefixed address', async () => {
        const { container } = render(TestSendTokenScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();

        // The user enters a valid address
        const addressInput =
            'etoken:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvgvv3p0vd';
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // No validation errors before input
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();
    });
    it('Accepts a valid alias', async () => {
        const { container } = render(TestSendTokenScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();

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

        // No validation errors before input
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).not.toBeInTheDocument();

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
    it('Displays a validation error for an invalid address', async () => {
        const { container } = render(TestSendTokenScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();

        // The user enters an invalid address
        const addressInput = 'not a valid address';
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // Error div exists and has expected error
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).toBeInTheDocument();
        expect(addressValidationErrorDiv).toHaveTextContent('Invalid address');
    });
    it('Displays a validation error for an alias without .xec suffix', async () => {
        const { container } = render(TestSendTokenScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();

        // The user enters a potentially valid alias without .xec suffix
        const addressInput = 'chicken';
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // Error div exists and has expected error
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).toBeInTheDocument();
        expect(addressValidationErrorDiv).toHaveTextContent(
            `Aliases must end with '.xec'`,
        );
    });
    it('Displays a validation error for valid alias that has not yet been registered', async () => {
        const { container } = render(TestSendTokenScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();

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

        // Error div exists and has expected error
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).toBeInTheDocument();
        expect(addressValidationErrorDiv).toHaveTextContent(
            `eCash Alias does not exist or yet to receive 1 confirmation`,
        );
    });
    it('Displays expected error if alias server gives a bad response', async () => {
        const { container } = render(TestSendTokenScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();

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

        // Error div exists and has expected error
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).toBeInTheDocument();
        expect(addressValidationErrorDiv).toHaveTextContent(
            `Error resolving alias at indexer, contact admin.`,
        );
    });
    it('Displays a validation error if the user includes any query string', async () => {
        const { container } = render(TestSendTokenScreen);
        const addressInputEl = screen.getByTestId('destination-address-single');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();

        // The user enters an ivalid address
        const addressInput =
            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=5000';
        await userEvent.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // Error div exists and has expected error
        const addressValidationErrorDiv = container.querySelector(
            '[class="ant-form-item-explain-error"]',
        );
        expect(addressValidationErrorDiv).toBeInTheDocument();
        expect(addressValidationErrorDiv).toHaveTextContent(
            'eToken sends do not support bip21 query strings',
        );
    });
    it('Renders the send token notification upon successful broadcast', async () => {
        const mockedChronik = new MockChronikClient();
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
        render(
            <BrowserRouter>
                <WalletContext.Provider value={mockWalletContextWithChronik}>
                    <ThemeProvider theme={theme}>
                        <SendToken tokenId="3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109" />
                    </ThemeProvider>
                </WalletContext.Provider>
            </BrowserRouter>,
        );

        // The user enters a valid address and send amount
        const addressInputEl = screen.getByTestId('destination-address-single');
        const addressInput = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        const amountInputEl = screen.getByTestId('token-amount-input');
        const amountInput = '1';
        await userEvent.type(addressInputEl, addressInput);
        await userEvent.type(amountInputEl, amountInput);

        // Ensure the notification is NOT rendered prior to sending
        const initialSendTokenSuccessNotification = screen.queryByTestId(
            'send-token-notification',
        );
        expect(initialSendTokenSuccessNotification).not.toBeInTheDocument();

        // Click the Send token button
        const sendTokenBtn = screen.getByTestId('send-token-btn');
        await userEvent.click(sendTokenBtn);

        const sendTokenSuccessNotification = screen.queryByTestId(
            'send-token-notification',
        );
        waitFor(() => {
            // Verify notification triggered
            expect(sendTokenSuccessNotification).toBeInTheDocument();
            expect(sendTokenSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            );
        });
    });
});

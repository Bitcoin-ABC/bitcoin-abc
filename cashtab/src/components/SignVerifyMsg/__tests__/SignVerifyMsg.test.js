import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import SignVerifyMsg from '../SignVerifyMsg';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { mockWalletContext } from '../../Send/fixtures/mocks';
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

const TestSignVerifyMsgScreen = (
    <BrowserRouter>
        <WalletContext.Provider value={mockWalletContext}>
            <ThemeProvider theme={theme}>
                <SignVerifyMsg />
            </ThemeProvider>
        </WalletContext.Provider>
    </BrowserRouter>
);

describe('<SignVerifyMsg />', () => {
    it('Notification is rendered upon successfully signing a message', async () => {
        render(TestSignVerifyMsgScreen);

        // Ensure the notification is NOT rendered prior to signing
        const initialSignMsgSuccessNotification = screen.queryByText(
            'Message Signature Generated',
        );
        expect(initialSignMsgSuccessNotification).not.toBeInTheDocument();

        // Open the Sign Message dropdown and expose the inner contents
        const signMsgDropdown = screen.getByText(/Sign/i);
        await userEvent.click(signMsgDropdown);

        // Insert message to be signed
        const signMsgText = screen.getByTestId('sign-message-textarea');
        await userEvent.type(signMsgText, 'test message');

        // Click the Sign button
        const signMsgBtn = screen.getByTestId('sign-message-button');
        await userEvent.click(signMsgBtn);

        // Click OK on the confirmation modal and verify the correct notification is fired
        const signMsgModalOkBtn = screen.queryByText('OK');
        await userEvent.click(signMsgModalOkBtn);
        // Using queryByText because the callsite directly calling the antd notifications
        // component does not facilitate the insertion of 'data-testid' prop
        const signMsgSuccessNotification = screen.queryByText(
            'Message Signature Generated',
        );
        expect(signMsgSuccessNotification).toBeInTheDocument();
    });

    it('Notification is rendered upon successfully verifying a message', async () => {
        render(TestSignVerifyMsgScreen);

        // Ensure the notification is NOT rendered prior to signing
        const initialVerifyMsgSuccessNotification = screen.queryByText(
            'Signature successfully verified',
        );
        expect(initialVerifyMsgSuccessNotification).not.toBeInTheDocument();

        // Open the Verify Message dropdown and expose the inner contents
        const verifyMsgDropdown = screen.getByText(/Verify/i);
        await userEvent.click(verifyMsgDropdown);

        // Insert message, address and signature to be verified
        const verifyMsgText = screen.getByTestId('verify-message-textarea');
        const verifyMsgAddress = screen.getByTestId(
            'destination-address-single-without-qrscan',
        );
        const verifyMsgSig = screen.getByTestId('verify-message-signature');
        await userEvent.type(verifyMsgText, 'test message');
        await userEvent.type(
            verifyMsgSig,
            'H6Rde63iJ93n/I7gUac/xheY3mL1eAt2uIR54fgre6O3Om8ogWe+DASNQGDDBkNY43JIGwAIPq9lmMJjeykYFNQ=',
        );
        await userEvent.type(
            verifyMsgAddress,
            'ecash:qq3spmxfh9ct0v3vkxncwk4sr2ld9vkhgvlu32e43c',
        );

        // Click the Verify button
        const verifyMsgBtn = screen.getByTestId('verify-message-button');
        await userEvent.click(verifyMsgBtn);

        // Click OK on the confirmation modal and verify the correct notification is fired
        const verifyMsgModalOkBtn = screen.queryByText('OK');
        await userEvent.click(verifyMsgModalOkBtn);
        // Using queryByText because the callsite directly calling the antd notifications
        // component does not facilitate the insertion of 'data-testid' prop
        const verifyMsgSuccessNotification = screen.queryByText(
            'Signature successfully verified',
        );
        expect(verifyMsgSuccessNotification).toBeInTheDocument();
    });

    it('Notification is rendered upon signature verification error', async () => {
        render(TestSignVerifyMsgScreen);

        // Ensure the notification is NOT rendered prior to signing
        const initialVerifyMsgErrorNotification = screen.queryByText(
            'Signature does not match address and message',
        );
        expect(initialVerifyMsgErrorNotification).not.toBeInTheDocument();

        // Open the Verify Message dropdown and expose the inner contents
        const verifyMsgDropdown = screen.getByText(/Verify/i);
        await userEvent.click(verifyMsgDropdown);

        // Insert message, address and signature to be verified
        const verifyMsgText = screen.getByTestId('verify-message-textarea');
        const verifyMsgAddress = screen.getByTestId(
            'destination-address-single-without-qrscan',
        );
        const verifyMsgSig = screen.getByTestId('verify-message-signature');
        await userEvent.type(verifyMsgText, 'NOT THE RIGHT MESSAGE');
        await userEvent.type(
            verifyMsgSig,
            'H6Rde63iJ93n/I7gUac/xheY3mL1eAt2uIR54fgre6O3Om8ogWe+DASNQGDDBkNY43JIGwAIPq9lmMJjeykYFNQ=',
        );
        await userEvent.type(
            verifyMsgAddress,
            'ecash:qq3spmxfh9ct0v3vkxncwk4sr2ld9vkhgvlu32e43c',
        );

        // Click the Verify button
        const verifyMsgBtn = screen.getByTestId('verify-message-button');
        await userEvent.click(verifyMsgBtn);

        // Click OK on the confirmation modal and verify the correct notification is fired
        const verifyMsgModalOkBtn = screen.queryByText('OK');
        await userEvent.click(verifyMsgModalOkBtn);
        // Using queryByText because the callsite directly calling the antd notifications
        // component does not facilitate the insertion of 'data-testid' prop
        const verifyMsgErrorNotification = screen.queryByText(
            'Signature does not match address and message',
        );
        expect(verifyMsgErrorNotification).toBeInTheDocument();
    });
});

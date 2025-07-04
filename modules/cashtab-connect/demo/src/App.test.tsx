// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Mock the cashtab-connect library
jest.mock('cashtab-connect', () => {
    const mockCashtabConnect = jest.fn();
    const mockRequestAddress = jest.fn();
    const mockSendXec = jest.fn();
    const mockSendToken = jest.fn();
    const mockSendBip21 = jest.fn();
    const mockWaitForExtension = jest.fn();

    mockCashtabConnect.mockReturnValue({
        requestAddress: mockRequestAddress,
        sendXec: mockSendXec,
        sendToken: mockSendToken,
        sendBip21: mockSendBip21,
        waitForExtension: mockWaitForExtension,
    });

    return {
        CashtabConnect: mockCashtabConnect,
        CashtabExtensionUnavailableError: class extends Error {
            constructor(message = 'Extension is not available') {
                super(message);
                this.name = 'CashtabExtensionUnavailableError';
            }
        },
        CashtabAddressDeniedError: class extends Error {
            constructor(message = 'User denied the address request') {
                super(message);
                this.name = 'CashtabAddressDeniedError';
            }
        },
        CashtabTimeoutError: class extends Error {
            constructor(message = 'Request timed out') {
                super(message);
                this.name = 'CashtabTimeoutError';
            }
        },
    };
});

// Import the mocked modules
import {
    CashtabConnect,
    CashtabExtensionUnavailableError,
    CashtabAddressDeniedError,
    CashtabTimeoutError,
} from 'cashtab-connect';

describe('Cashtab Connect Demo App', () => {
    let mockCashtabInstance: any;

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Get the mock instance
        mockCashtabInstance = {
            requestAddress: jest.fn(),
            sendXec: jest.fn(),
            sendToken: jest.fn(),
            sendBip21: jest.fn(),
            waitForExtension: jest.fn(),
        };

        (CashtabConnect as jest.Mock).mockReturnValue(mockCashtabInstance);
    });

    describe('Extension Status', () => {
        test('shows checking status initially', () => {
            mockCashtabInstance.waitForExtension.mockImplementation(
                () => new Promise(() => {}), // Never resolves to keep checking state
            );

            render(<App />);

            expect(
                screen.getByText('Checking for Extension...'),
            ).toBeInTheDocument();
            expect(
                screen.getByText(/Looking for the Cashtab browser extension/),
            ).toBeInTheDocument();
        });

        test('shows available status when extension is detected', async () => {
            mockCashtabInstance.waitForExtension.mockResolvedValue(undefined);

            render(<App />);

            await waitFor(() => {
                expect(
                    screen.getByText('Extension Available'),
                ).toBeInTheDocument();
            });

            expect(
                screen.getByText(/Great! The Cashtab extension is detected/),
            ).toBeInTheDocument();
        });

        test('shows unavailable status when extension is not detected', async () => {
            mockCashtabInstance.waitForExtension.mockRejectedValue(
                new CashtabExtensionUnavailableError(),
            );

            render(<App />);

            await waitFor(() => {
                expect(
                    screen.getByText('Extension Not Available'),
                ).toBeInTheDocument();
            });

            expect(
                screen.getByText(
                    /The Cashtab browser extension is not available/,
                ),
            ).toBeInTheDocument();
            expect(
                screen.getByText('Download Cashtab Extension'),
            ).toBeInTheDocument();
        });

        test('download link opens in new tab', async () => {
            mockCashtabInstance.waitForExtension.mockRejectedValue(
                new CashtabExtensionUnavailableError(),
            );

            render(<App />);

            await waitFor(() => {
                const downloadLink = screen.getByText(
                    'Download Cashtab Extension',
                );
                expect(downloadLink).toHaveAttribute('target', '_blank');
                expect(downloadLink).toHaveAttribute(
                    'rel',
                    'noopener noreferrer',
                );
            });
        });
    });

    describe('Address Request', () => {
        beforeEach(async () => {
            mockCashtabInstance.waitForExtension.mockResolvedValue(undefined);
        });

        test('request address button is disabled when extension is not available', async () => {
            mockCashtabInstance.waitForExtension.mockRejectedValue(
                new CashtabExtensionUnavailableError(),
            );

            render(<App />);

            await waitFor(() => {
                const requestButton = screen.getByRole('button', {
                    name: 'Request Address',
                });
                expect(requestButton).toBeDisabled();
            });
        });

        test('request address button is enabled when extension is available', async () => {
            render(<App />);

            await waitFor(() => {
                const requestButton = screen.getByRole('button', {
                    name: 'Request Address',
                });
                expect(requestButton).toBeEnabled();
            });
        });

        test('successfully requests address', async () => {
            const mockAddress =
                'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0';
            mockCashtabInstance.requestAddress.mockResolvedValue(mockAddress);

            render(<App />);

            await waitFor(() => {
                const requestButton = screen.getByRole('button', {
                    name: 'Request Address',
                });
                expect(requestButton).toBeEnabled();
            });

            await userEvent.click(
                screen.getByRole('button', { name: 'Request Address' }),
            );

            await waitFor(() => {
                expect(
                    screen.getByText(`Address received: ${mockAddress}`),
                ).toBeInTheDocument();
                expect(
                    screen.getByText('Current Address:'),
                ).toBeInTheDocument();
                expect(screen.getByText(mockAddress)).toBeInTheDocument();
            });

            expect(mockCashtabInstance.requestAddress).toHaveBeenCalledTimes(1);
        });

        test('handles extension unavailable error', async () => {
            mockCashtabInstance.requestAddress.mockRejectedValue(
                new CashtabExtensionUnavailableError(),
            );

            render(<App />);

            await waitFor(() => {
                const requestButton = screen.getByRole('button', {
                    name: 'Request Address',
                });
                expect(requestButton).toBeEnabled();
            });

            await userEvent.click(
                screen.getByRole('button', { name: 'Request Address' }),
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Extension is not available'),
                ).toBeInTheDocument();
            });
        });

        test('handles user denial error', async () => {
            mockCashtabInstance.requestAddress.mockRejectedValue(
                new CashtabAddressDeniedError(),
            );

            render(<App />);

            await waitFor(() => {
                const requestButton = screen.getByRole('button', {
                    name: 'Request Address',
                });
                expect(requestButton).toBeEnabled();
            });

            await userEvent.click(
                screen.getByRole('button', { name: 'Request Address' }),
            );

            await waitFor(() => {
                expect(
                    screen.getByText('User denied the address request'),
                ).toBeInTheDocument();
            });
        });

        test('handles timeout error', async () => {
            mockCashtabInstance.requestAddress.mockRejectedValue(
                new CashtabTimeoutError(),
            );

            render(<App />);

            await waitFor(() => {
                const requestButton = screen.getByRole('button', {
                    name: 'Request Address',
                });
                expect(requestButton).toBeEnabled();
            });

            await userEvent.click(
                screen.getByRole('button', { name: 'Request Address' }),
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Address request timed out'),
                ).toBeInTheDocument();
            });
        });

        test('shows loading state during address request', async () => {
            mockCashtabInstance.requestAddress.mockImplementation(
                () =>
                    new Promise(resolve =>
                        setTimeout(() => resolve('test-address'), 100),
                    ),
            );

            render(<App />);

            await waitFor(() => {
                const requestButton = screen.getByRole('button', {
                    name: 'Request Address',
                });
                expect(requestButton).toBeEnabled();
            });

            await userEvent.click(
                screen.getByRole('button', { name: 'Request Address' }),
            );

            expect(screen.getByText('Requesting...')).toBeInTheDocument();
        });
    });

    describe('Send XEC', () => {
        beforeEach(async () => {
            mockCashtabInstance.waitForExtension.mockResolvedValue(undefined);
        });

        test('send XEC button is disabled when extension is not available', async () => {
            mockCashtabInstance.waitForExtension.mockRejectedValue(
                new CashtabExtensionUnavailableError(),
            );

            render(<App />);

            await waitFor(() => {
                const sendButton = screen.getByRole('button', {
                    name: 'Send XEC',
                });
                expect(sendButton).toBeDisabled();
            });
        });

        test('send XEC button is enabled when extension is available', async () => {
            render(<App />);

            await waitFor(() => {
                const sendButton = screen.getByRole('button', {
                    name: 'Send XEC',
                });
                expect(sendButton).toBeEnabled();
            });
        });

        test('successfully sends XEC', async () => {
            mockCashtabInstance.sendXec.mockResolvedValue(undefined);

            render(<App />);

            await waitFor(() => {
                const sendButton = screen.getByRole('button', {
                    name: 'Send XEC',
                });
                expect(sendButton).toBeEnabled();
            });

            await userEvent.click(
                screen.getByRole('button', { name: 'Send XEC' }),
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Transaction window opened in Cashtab'),
                ).toBeInTheDocument();
            });

            expect(mockCashtabInstance.sendXec).toHaveBeenCalledWith(
                'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0',
                '100',
            );
        });

        test('handles send XEC error', async () => {
            mockCashtabInstance.sendXec.mockRejectedValue(
                new Error('Failed to send XEC'),
            );

            render(<App />);

            await waitFor(() => {
                const sendButton = screen.getByRole('button', {
                    name: 'Send XEC',
                });
                expect(sendButton).toBeEnabled();
            });

            await userEvent.click(
                screen.getByRole('button', { name: 'Send XEC' }),
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Failed to send XEC'),
                ).toBeInTheDocument();
            });
        });

        test('validates required fields', async () => {
            render(<App />);

            await waitFor(() => {
                const sendButton = screen.getByRole('button', {
                    name: 'Send XEC',
                });
                expect(sendButton).toBeEnabled();
            });

            // Clear the address field
            const addressInput = screen.getByLabelText('Recipient Address:');
            fireEvent.change(addressInput, { target: { value: '' } });

            // The button should now be disabled
            const sendButton = screen.getByRole('button', { name: 'Send XEC' });
            expect(sendButton).toBeDisabled();
        });
    });

    describe('Send Token', () => {
        beforeEach(async () => {
            mockCashtabInstance.waitForExtension.mockResolvedValue(undefined);
        });

        test('successfully sends token', async () => {
            mockCashtabInstance.sendToken.mockResolvedValue(undefined);

            render(<App />);

            await waitFor(() => {
                const sendButton = screen.getByRole('button', {
                    name: 'Send Token',
                });
                expect(sendButton).toBeEnabled();
            });

            await userEvent.click(
                screen.getByRole('button', { name: 'Send Token' }),
            );

            await waitFor(() => {
                expect(
                    screen.getByText(
                        'Token transaction window opened in Cashtab',
                    ),
                ).toBeInTheDocument();
            });

            expect(mockCashtabInstance.sendToken).toHaveBeenCalledWith(
                'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0',
                '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                '1.1234',
            );
        });

        test('handles send token error', async () => {
            mockCashtabInstance.sendToken.mockRejectedValue(
                new Error('Failed to send token'),
            );

            render(<App />);

            await waitFor(() => {
                const sendButton = screen.getByRole('button', {
                    name: 'Send Token',
                });
                expect(sendButton).toBeEnabled();
            });

            await userEvent.click(
                screen.getByRole('button', { name: 'Send Token' }),
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Failed to send token'),
                ).toBeInTheDocument();
            });
        });
    });

    describe('Send BIP21', () => {
        beforeEach(async () => {
            mockCashtabInstance.waitForExtension.mockResolvedValue(undefined);
        });

        test('successfully sends BIP21', async () => {
            mockCashtabInstance.sendBip21.mockResolvedValue(undefined);

            render(<App />);

            await waitFor(() => {
                const sendButton = screen.getByRole('button', {
                    name: 'Send BIP21',
                });
                expect(sendButton).toBeEnabled();
            });

            await userEvent.click(
                screen.getByRole('button', { name: 'Send BIP21' }),
            );

            await waitFor(() => {
                expect(
                    screen.getByText(
                        'BIP21 transaction window opened in Cashtab',
                    ),
                ).toBeInTheDocument();
            });

            expect(mockCashtabInstance.sendBip21).toHaveBeenCalledWith(
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035?op_return_raw=0401020304',
            );
        });

        test('handles send BIP21 error', async () => {
            mockCashtabInstance.sendBip21.mockRejectedValue(
                new Error('Failed to send BIP21'),
            );

            render(<App />);

            await waitFor(() => {
                const sendButton = screen.getByRole('button', {
                    name: 'Send BIP21',
                });
                expect(sendButton).toBeEnabled();
            });

            await userEvent.click(
                screen.getByRole('button', { name: 'Send BIP21' }),
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Failed to send BIP21'),
                ).toBeInTheDocument();
            });
        });
    });

    describe('Form Interactions', () => {
        beforeEach(async () => {
            mockCashtabInstance.waitForExtension.mockResolvedValue(undefined);
        });

        test('can update transaction address', async () => {
            render(<App />);

            await waitFor(() => {
                const addressInput =
                    screen.getByLabelText('Recipient Address:');
                expect(addressInput).toBeEnabled();
            });

            const addressInput = screen.getByLabelText('Recipient Address:');
            await userEvent.clear(addressInput);
            await userEvent.type(addressInput, 'ecash:newaddress123');

            expect(addressInput).toHaveValue('ecash:newaddress123');
        });

        test('can update transaction amount', async () => {
            render(<App />);

            await waitFor(() => {
                const amountInput = screen.getByLabelText('Amount (XEC):');
                expect(amountInput).toBeEnabled();
            });

            const amountInput = screen.getByLabelText('Amount (XEC):');
            await userEvent.clear(amountInput);
            await userEvent.type(amountInput, '500');

            expect(amountInput).toHaveValue(500);
        });

        test('can update token ID', async () => {
            render(<App />);

            await waitFor(() => {
                const tokenIdInput = screen.getByLabelText('Token ID:');
                expect(tokenIdInput).toBeEnabled();
            });

            const tokenIdInput = screen.getByLabelText('Token ID:');
            await userEvent.clear(tokenIdInput);
            await userEvent.type(tokenIdInput, 'newtokenid123');

            expect(tokenIdInput).toHaveValue('newtokenid123');
        });

        test('can update BIP21 string', async () => {
            render(<App />);

            await waitFor(() => {
                const bip21Input = screen.getByLabelText('BIP21 String:');
                expect(bip21Input).toBeEnabled();
            });

            const bip21Input = screen.getByLabelText('BIP21 String:');
            await userEvent.clear(bip21Input);
            await userEvent.type(
                bip21Input,
                'ecash:newbip21address?amount=100',
            );

            expect(bip21Input).toHaveValue('ecash:newbip21address?amount=100');
        });
    });
});

// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { walletWithXecAndTokens } from 'components/App/fixtures/mocks';
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

describe('<SignVerifyMsg />', () => {
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
    it('Notification is rendered upon successfully signing a message', async () => {
        // Mock the app with context at the SignVerifyMsg screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route="/signverifymsg"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Insert message to be signed
        await user.type(
            screen.getByPlaceholderText('Enter message to sign'),
            'test message',
        );

        // Click the Sign button (the Switch is also found by this identifier, btn is at index 0 here)
        await user.click(screen.getAllByRole('button', { name: /Sign/ })[0]);

        expect(await screen.findByText('Message Signed')).toBeInTheDocument();

        expect(
            screen.getByText(
                'ILwXI6gAnIkh7nw3r/VDNYWiBxVoHYIjsk9lALezbYjGVXbFj0p4glXibHDQoJVll4+zTS5SWXsVAwhczh5GTts=',
            ),
        ).toBeInTheDocument();
    });
    it('Notification is rendered upon successfully verifying a message', async () => {
        // Mock the app with context at the SignVerifyMsg screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route="/signverifymsg"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Click the switch to show verify forms
        await user.click(screen.getByTitle('Toggle Sign Verify'));

        // Insert message to be signed
        await user.type(
            await screen.findByPlaceholderText('Enter message to verify'),
            'test message',
        );

        // Input the address
        await user.type(
            screen.getByPlaceholderText('Enter address of signature to verify'),
            'ecash:qq3spmxfh9ct0v3vkxncwk4sr2ld9vkhgvlu32e43c',
        );

        // Insert signature in Signature textarea of Verify collapse
        await user.type(
            screen.getByPlaceholderText('Enter signature to verify'),
            'H6Rde63iJ93n/I7gUac/xheY3mL1eAt2uIR54fgre6O3Om8ogWe+DASNQGDDBkNY43JIGwAIPq9lmMJjeykYFNQ=',
        );

        // Click the Verify button
        // react testing library also finds the switch with this, button is at index 0
        await user.click(screen.getAllByRole('button', { name: /Verify/ })[0]);

        expect(
            screen.getByText(
                'Signature verified. Message "test message" was signed by ecash:qq3spmxfh9ct0v3vkxncwk4sr2ld9vkhgvlu32e43c',
            ),
        ).toBeInTheDocument();
    });
    it('Notification is rendered upon signature verification error', async () => {
        // Mock the app with context at the SignVerifyMsg screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route="/signverifymsg"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Click the switch to show verify forms
        await user.click(screen.getByTitle('Toggle Sign Verify'));

        // Insert message to be signed
        await user.type(
            screen.getByPlaceholderText('Enter message to verify'),
            'NOT THE RIGHT MESSAGE',
        );

        // Input the address
        await user.type(
            screen.getByPlaceholderText('Enter address of signature to verify'),
            'ecash:qq3spmxfh9ct0v3vkxncwk4sr2ld9vkhgvlu32e43c',
        );

        // Insert signature in Signature textarea of Verify collapse
        await user.type(
            screen.getByPlaceholderText('Enter signature to verify'),
            'H6Rde63iJ93n/I7gUac/xheY3mL1eAt2uIR54fgre6O3Om8ogWe+DASNQGDDBkNY43JIGwAIPq9lmMJjeykYFNQ=',
        );

        // Click the Verify button
        // react testing library also finds the switch with this, button is at index 0
        await user.click(screen.getAllByRole('button', { name: /Verify/ })[0]);

        expect(
            screen.getByText('Signature does not match address and message'),
        ).toBeInTheDocument();
    });
});

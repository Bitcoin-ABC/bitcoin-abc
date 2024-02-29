// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent, {
    PointerEventsCheckLevel,
} from '@testing-library/user-event';
import { walletWithXecAndTokens } from 'components/fixtures/mocks';
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

describe('<SignVerifyMsg />', () => {
    let user;
    beforeEach(() => {
        // Set up userEvent to skip pointerEvents check, which returns false positives with antd
        user = userEvent.setup({
            // https://github.com/testing-library/user-event/issues/922
            pointerEventsCheck: PointerEventsCheckLevel.Never,
        });
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

        // Open the Sign Message dropdown
        await user.click(screen.getByText('Sign'));

        // Insert message to be signed
        await user.type(
            screen.getByPlaceholderText('Enter message to sign'),
            'test message',
        );

        // Click the Sign button
        await user.click(screen.getByRole('button', { name: /Sign Message/ }));

        // Click OK on the confirmation modal
        await user.click(screen.getByText('OK'));

        expect(
            await screen.findByText('Message Signature Generated'),
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

        // Open the Verify Message dropdown
        await user.click(screen.getByText('Verify'));

        // Insert message to be signed
        await user.type(
            screen.getByPlaceholderText('Enter message to verify'),
            'test message',
        );

        // Input the address
        await userEvent.type(
            screen.getByPlaceholderText('XEC Address'),
            'ecash:qq3spmxfh9ct0v3vkxncwk4sr2ld9vkhgvlu32e43c',
        );

        // Insert signature in Signature textarea of Verify collapse
        await userEvent.type(
            screen.getByPlaceholderText('Input signature'),
            'H6Rde63iJ93n/I7gUac/xheY3mL1eAt2uIR54fgre6O3Om8ogWe+DASNQGDDBkNY43JIGwAIPq9lmMJjeykYFNQ=',
        );

        // Click the Verify button
        await userEvent.click(
            screen.getByRole('button', { name: /Verify Message/ }),
        );

        // Click OK on the confirmation modal and verify the correct notification is fired
        await userEvent.click(screen.getByText('OK'));

        expect(
            screen.getByText('Signature successfully verified'),
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

        // Open the Verify Message dropdown
        await user.click(screen.getByText('Verify'));

        // Insert message to be signed
        await user.type(
            screen.getByPlaceholderText('Enter message to verify'),
            'NOT THE RIGHT MESSAGE',
        );

        // Input the address
        await userEvent.type(
            screen.getByPlaceholderText('XEC Address'),
            'ecash:qq3spmxfh9ct0v3vkxncwk4sr2ld9vkhgvlu32e43c',
        );

        // Insert signature in Signature textarea of Verify collapse
        await userEvent.type(
            screen.getByPlaceholderText('Input signature'),
            'H6Rde63iJ93n/I7gUac/xheY3mL1eAt2uIR54fgre6O3Om8ogWe+DASNQGDDBkNY43JIGwAIPq9lmMJjeykYFNQ=',
        );

        // Click the Verify button
        await userEvent.click(
            screen.getByRole('button', { name: /Verify Message/ }),
        );

        // Click OK on the confirmation modal and verify the correct notification is fired
        await userEvent.click(screen.getByText('OK'));
        expect(
            screen.getByText('Signature does not match address and message'),
        ).toBeInTheDocument();
    });
});

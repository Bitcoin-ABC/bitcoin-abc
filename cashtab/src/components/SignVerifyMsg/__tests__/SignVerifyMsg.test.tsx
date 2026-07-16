// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { walletWithXecAndTokensActive } from 'components/App/fixtures/mocks';
import { when } from 'jest-when';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import appConfig from 'config/app';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import { UserEvent } from '@testing-library/user-event';

describe('<SignVerifyMsg />', () => {
    let user: UserEvent;
    const writeText = jest.fn().mockResolvedValue(undefined);
    const expectedSignature =
        'H15QdmXfPFzMX+nDsoIGL51Nq3jkX/3RGmhwe87fIs9fLpvdHEflw+K9935GTU30Ids8J8Cdn1fV4uRJfUwYM8w=';
    beforeEach(() => {
        // Set up userEvent
        user = userEvent.setup();
        writeText.mockClear();
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
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
            walletWithXecAndTokensActive,
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

        // Click the Sign button (SegmentedControl has "✍️ Sign" segment; use exact match for submit button)
        await user.click(screen.getByRole('button', { name: /^Sign$/ }));

        expect(
            await screen.findByText('Message signed and copied to clipboard'),
        ).toBeInTheDocument();

        expect(screen.getByText(expectedSignature)).toBeInTheDocument();
        expect(writeText).toHaveBeenCalledWith(expectedSignature);
        expect(
            screen.getByRole('button', { name: 'Copy signature' }),
        ).toBeInTheDocument();
    });
    it('Copy signature button copies the signed message again', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route="/signverifymsg"
            />,
        );

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        await user.type(
            screen.getByPlaceholderText('Enter message to sign'),
            'test message',
        );
        await user.click(screen.getByRole('button', { name: /^Sign$/ }));

        expect(
            await screen.findByText('Message signed and copied to clipboard'),
        ).toBeInTheDocument();
        writeText.mockClear();

        await user.click(
            screen.getByRole('button', { name: 'Copy signature' }),
        );

        expect(writeText).toHaveBeenCalledWith(expectedSignature);
        expect(screen.getByTitle('check')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Copied' }),
        ).toBeInTheDocument();
    });
    it('Notification is rendered upon successfully verifying a message', async () => {
        // Mock the app with context at the SignVerifyMsg screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
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

        // Click the Verify segment to show verify forms (SegmentedControl replaced Switch)
        await user.click(screen.getByRole('button', { name: '✅ Verify' }));

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

        // Click the Verify submit button (SegmentedControl segment is [0], submit button is [1])
        await user.click(screen.getAllByRole('button', { name: /Verify/ })[1]);

        expect(
            screen.getByText(
                'Signature verified. Message “test message” was signed by ecash:qq3spmxfh9ct0v3vkxncwk4sr2ld9vkhgvlu32e43c',
            ),
        ).toBeInTheDocument();
    });
    it('Notification is rendered upon signature verification error', async () => {
        // Mock the app with context at the SignVerifyMsg screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
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

        // Click the Verify segment to show verify forms (SegmentedControl replaced Switch)
        await user.click(screen.getByRole('button', { name: '✅ Verify' }));

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

        // Click the Verify submit button (SegmentedControl segment is [0], submit button is [1])
        await user.click(screen.getAllByRole('button', { name: /Verify/ })[1]);

        expect(
            screen.getByText('Signature does not match address and message'),
        ).toBeInTheDocument();
    });
    it('Does not show length error for signatureToVerify field when exceeding CASHTAB_MESSAGE_MAX_LENGTH', async () => {
        // Mock the app with context at the SignVerifyMsg screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
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

        // Click the Verify segment to show verify forms (SegmentedControl replaced Switch)
        await user.click(screen.getByRole('button', { name: '✅ Verify' }));

        // Insert a valid message
        await user.type(
            await screen.findByPlaceholderText('Enter message to verify'),
            'test message',
        );

        // Input a valid address
        await user.type(
            screen.getByPlaceholderText('Enter address of signature to verify'),
            'ecash:qq3spmxfh9ct0v3vkxncwk4sr2ld9vkhgvlu32e43c',
        );

        // Insert a signature that is longer than CASHTAB_MESSAGE_MAX_LENGTH (200 chars)
        // but not equal to ECASH_SIGNED_MSG_LENGTH (88 chars)
        const longSignature = 'A'.repeat(250); // 250 characters, exceeds 200 but not 88
        await user.type(
            screen.getByPlaceholderText('Enter signature to verify'),
            longSignature,
        );

        // We should NOT see the "Cashtab supports msgs up to 200 characters" error
        expect(
            screen.queryByText('Cashtab supports msgs up to 200 characters.'),
        ).not.toBeInTheDocument();

        // Instead, we should see the "Invalid eCash signature length" error
        expect(
            screen.getByText('Invalid eCash signature length'),
        ).toBeInTheDocument();
    });
});

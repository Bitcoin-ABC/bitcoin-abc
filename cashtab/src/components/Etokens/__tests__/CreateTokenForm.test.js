// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { walletWithXecAndTokens } from 'components/fixtures/mocks';
import { render, screen } from '@testing-library/react';
import userEvent, {
    PointerEventsCheckLevel,
} from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { explorer } from 'config/explorer';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/fixtures/helpers';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
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

describe('<CreateTokenForm />', () => {
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
    });
    it('User can input valid token parameters, generate a token, and view a success notification', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        // Add tx mock to mockedChronik
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006b483045022100c90a0e610859887b6d490b35ec4c8d013c4824a490536fb7f41bc0b7f6af481b02200f81b5125abed2e9ad7323cbf95d3983a75a9ab725eac454c164f836b26ee68c4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000466a04534c500001010747454e4553495303544b450a7465737420746f6b656e1768747470733a2f2f7777772e636173687461622e636f6d4c0001024c0008000000000393870022020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac887f0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'b8f0152d64266b0c31729be8b997e9c3f780694cffb664cd9acc98e0871a0135';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route="/create-token"
            />,
        );

        // Configure userEvent to skip PointerEventsCheck, as this returns false positives with antd
        const user = userEvent.setup({
            // https://github.com/testing-library/user-event/issues/922
            pointerEventsCheck: PointerEventsCheckLevel.Never,
        });

        // The user enters valid token metadata
        await user.type(
            await screen.findByPlaceholderText('Enter a name for your token'),
            'test token',
        );
        await user.type(
            await screen.findByPlaceholderText('Enter a ticker for your token'),
            'TKE',
        );
        await user.type(
            await screen.findByPlaceholderText(
                'Enter number of decimal places',
            ),
            '2',
        );
        await user.type(
            await screen.findByPlaceholderText(
                'Enter the fixed supply of your token',
            ),
            '600000',
        );
        await user.type(
            await screen.findByPlaceholderText(
                'Enter a website for your token',
            ),
            'https://www.cashtab.com',
        );

        // Click the Create eToken button
        await user.click(screen.getByRole('button', { name: /Create eToken/ }));

        // Click OK on confirmation modal
        await user.click(screen.getByText('OK'));

        // Verify notification triggered
        expect(await screen.findByText('Token created!')).toHaveAttribute(
            'href',
            `${explorer.blockExplorerUrl}/tx/${txid}`,
        );
    });
});

// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import {
    walletWithXecAndTokens,
    MOCK_CHRONIK_TOKEN_CALL,
    MOCK_CHRONIK_GENESIS_TX_CALL,
} from 'components/App/fixtures/mocks';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { explorer } from 'config/explorer';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
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

describe('<CreateTokenForm />', () => {
    let user;
    beforeEach(() => {
        // Configure userEvent
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

        // Wait for Cashtab to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

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
            await screen.findByPlaceholderText('Enter initial token supply'),
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

        // We see the formatted supply and fixed label in the preview modal
        expect(screen.getByText('600,000 (fixed)')).toBeInTheDocument();

        // Click OK on confirmation modal
        await user.click(screen.getByText('OK'));

        // Verify notification triggered
        expect(await screen.findByText('Token created!')).toHaveAttribute(
            'href',
            `${explorer.blockExplorerUrl}/tx/${txid}`,
        );
    });
    it('User can create a token with a mint baton', async () => {
        const createdTokenId =
            'a34382e000eed02f749ab6a9e8de37e25e7565f016707dc81460ce63167ee1c2';
        // Mock a utxo of the not-yet-created token so we can test the redirect
        const MOCK_UTXO_FOR_BALANCE = {
            token: {
                tokenId: createdTokenId,
                isMintBaton: false,
                amount: '10',
            },
        };
        const mockedChronik = await initializeCashtabStateForTests(
            {
                ...walletWithXecAndTokens,
                state: {
                    ...walletWithXecAndTokens.state,
                    slpUtxos: [
                        ...walletWithXecAndTokens.state.slpUtxos,
                        MOCK_UTXO_FOR_BALANCE,
                    ],
                },
            },
            localforage,
        );

        // Mock the not-yet-created token's tokeninfo and utxo calls to test the redirect
        mockedChronik.setMock('token', {
            input: createdTokenId,
            output: MOCK_CHRONIK_TOKEN_CALL,
        });
        mockedChronik.setMock('tx', {
            input: createdTokenId,
            output: MOCK_CHRONIK_GENESIS_TX_CALL,
        });
        mockedChronik.setTokenId(createdTokenId);
        mockedChronik.setUtxosByTokenId(createdTokenId, {
            utxos: [MOCK_UTXO_FOR_BALANCE],
        });
        // Add tx mock to mockedChronik
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006a47304402205e54e8ef3c0912b2bbeda364c1b15298e235d91eca3f8e02395fe5f07a406ee70220482d820793356ba8c3012ac2bd6630c8daa88c443111d8f9ee93785937d48f7c4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000466a04534c500001010747454e4553495303544b450a7465737420746f6b656e1768747470733a2f2f7777772e636173687461622e636f6d4c000102010208000000000393870022020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac227d0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'a34382e000eed02f749ab6a9e8de37e25e7565f016707dc81460ce63167ee1c2';
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

        // Wait for Cashtab to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

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
            await screen.findByPlaceholderText('Enter initial token supply'),
            '600000',
        );
        await user.type(
            await screen.findByPlaceholderText(
                'Enter a website for your token',
            ),
            'https://www.cashtab.com',
        );

        // Hit the switch for a variable supply token
        await user.click(screen.getByTitle('Toggle Mint Baton'));

        // Click the Create eToken button
        await user.click(screen.getByRole('button', { name: /Create eToken/ }));

        // We see the formatted supply and variable label in the preview modal
        expect(screen.getByText('600,000 (variable)')).toBeInTheDocument();

        // Click OK on confirmation modal
        await user.click(screen.getByText('OK'));

        // Verify notification triggered
        expect(await screen.findByText('Token created!')).toHaveAttribute(
            'href',
            `${explorer.blockExplorerUrl}/tx/${txid}`,
        );

        // We are sent to its token-action page
        expect(await screen.findByTitle('Token Stats')).toBeInTheDocument();
    });
    it('User can create an NFT collection', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        // Add tx mock to mockedChronik
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006a473044022064d8618b1b6131f6d1b611d67107d0962f7c1d951a5cadcccf3f502952a1723002202f9fd50a185b683475fb9c0a394fef4b6aaaf188cdb3747a1c38d4366571a3614121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0300000000000000006e6a04534c500001810747454e45534953033448432454686520466f75722048616c662d436f696e73206f66204a696e2d71756120283448432925656e2e77696b6970656469612e6f72672f77696b692f5461692d50616e5f286e6f76656c294c0001004c0008000000000000000422020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac387f0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'ed6e5838af475cf2d35e537abb06cb497bb9e69ba071ba06a678d35764a39c9a';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        // Load component with create-nft-collection route
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route="/create-nft-collection"
            />,
        );

        // Wait for Cashtab to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // The user enters valid token metadata
        await user.type(
            await screen.findByPlaceholderText(
                'Enter a name for your NFT collection',
            ),
            'The Four Half-Coins of Jin-qua (4HC)',
        );
        await user.type(
            await screen.findByPlaceholderText(
                'Enter a ticker for your NFT collection',
            ),
            '4HC',
        );

        // The decimals input is disabled
        const decimalsInput = screen.getByPlaceholderText(
            'Enter number of decimal places',
        );
        expect(decimalsInput).toHaveProperty('disabled', true);

        // Decimals is set to 0
        expect(decimalsInput).toHaveValue('0');
        await user.type(
            await screen.findByPlaceholderText('Enter NFT collection size'),
            '4',
        );
        await user.type(
            await screen.findByPlaceholderText(
                'Enter a website for your NFT collection',
            ),
            'en.wikipedia.org/wiki/Tai-Pan_(novel)',
        );

        // Click the Create eToken button
        await user.click(
            screen.getByRole('button', { name: /Create NFT Collection/ }),
        );

        // Click OK on confirmation modal
        await user.click(screen.getByText('OK'));

        // Verify notification triggered
        expect(
            await screen.findByText('NFT Collection created!'),
        ).toHaveAttribute('href', `${explorer.blockExplorerUrl}/tx/${txid}`);
    });
});

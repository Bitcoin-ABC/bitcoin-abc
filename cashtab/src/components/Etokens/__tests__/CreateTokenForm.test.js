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
import { Ecc } from 'ecash-lib';
import { MAX_MINT_AMOUNT_TOKEN_SATOSHIS } from 'token-protocols/slpv1';
import { MAX_OUTPUT_AMOUNT_ALP_TOKEN_SATOSHIS } from 'token-protocols/alp';
import { MockAgora } from '../../../../../modules/mock-chronik-client/dist';

describe('<CreateTokenForm />', () => {
    const ecc = new Ecc();
    // We need mockAgora now that we are using agora to subscribe to websockets
    let user, mockAgora;
    beforeEach(() => {
        mockAgora = new MockAgora();
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
    it('User can create an SLP1 token with no mint baton', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // Add tx mock to mockedChronik
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a2102000000644199e5a5dcfea45a68137f07bfe749195897767030687bd3f4b4dbcf2b2ddf2711af47b13f376523031b3c3c975a00e12b46d46f057fd5e144b79a95eee71479e84121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000466a04534c500001010747454e4553495303544b450a7465737420746f6b656e1768747470733a2f2f7777772e636173687461622e636f6d4c0001024c0008000000000393870022020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac977f0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '71626fb3bd4be7713096107af225eff0f9243c5374ca50fe3bf9a736e14b9f9c';
        mockedChronik.setBroadcastTx(hex, txid);
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
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

        // By default, supply is variable
        expect(screen.getByTitle('Toggle Mint Baton')).toHaveProperty(
            'checked',
            true,
        );

        // Hit the switch for fixed supply
        await user.click(screen.getByTitle('Toggle Mint Baton'));

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
    it('User can create an SLP1 token with a mint baton', async () => {
        const createdTokenId =
            '999507a9f1859adf85405abe28bb75d3c470ef53d2e4bb18880454a5fa9aa9e4';
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
        mockedChronik.setToken(createdTokenId, MOCK_CHRONIK_TOKEN_CALL);
        mockedChronik.setTx(createdTokenId, MOCK_CHRONIK_GENESIS_TX_CALL);
        mockedChronik.setUtxosByTokenId(createdTokenId, [
            MOCK_UTXO_FOR_BALANCE,
        ]);
        // Add tx mock to mockedChronik
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006441ff86eb97dad643075e75ed273334cee9aef1b938436dc350bcb48f73d129ce6a9d9ea40e749303e7bcbd27a082f1ee03080582f00f1ec80f202166bff431a0334121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000466a04534c500001010747454e4553495303544b450a7465737420746f6b656e1768747470733a2f2f7777772e636173687461622e636f6d4c000102010208000000000393870022020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac307d0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';

        mockedChronik.setBroadcastTx(hex, createdTokenId);
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
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

        // The create button is disabled as the user has not entered a ticker
        expect(
            screen.getByRole('button', { name: /Create eToken/ }),
        ).toHaveProperty('disabled', true);
        expect(
            screen.getByText('Token must have a name and a ticker'),
        ).toBeInTheDocument();

        await user.type(
            await screen.findByPlaceholderText('Enter a ticker for your token'),
            'TKE',
        );

        // The create button is now enabled as the user has not entered a ticker
        expect(
            screen.getByRole('button', { name: /Create eToken/ }),
        ).toHaveProperty('disabled', false);

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

        // Variable supply is default, so we do not need to hit the switch
        expect(screen.getByTitle('Toggle Mint Baton')).toHaveProperty(
            'checked',
            true,
        );

        // Click the Create eToken button
        await user.click(screen.getByRole('button', { name: /Create eToken/ }));

        // We see the formatted supply and variable label in the preview modal
        expect(screen.getByText('600,000 (variable)')).toBeInTheDocument();

        // Click OK on confirmation modal
        await user.click(screen.getByText('OK'));

        // Verify notification triggered
        expect(await screen.findByText('Token created!')).toHaveAttribute(
            'href',
            `${explorer.blockExplorerUrl}/tx/${createdTokenId}`,
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
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a210200000064415594de73e7f09dc4bd7622b136921d8b883c131559e9ba9212185fb5f7db1fe062715183484097a5f7cf71d75af3b9b3b2768f7e011550893376ef9ec150887b4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0300000000000000006e6a04534c500001810747454e45534953033448432454686520466f75722048616c662d436f696e73206f66204a696e2d71756120283448432925656e2e77696b6970656469612e6f72672f77696b692f5461692d50616e5f286e6f76656c294c0001004c0008000000000000000422020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac467f0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '4517dc895499f2090ae04eeb28e2d2f0a0790baf99568f7e52436df45ca766c3';
        mockedChronik.setBroadcastTx(hex, txid);

        // Load component with create-nft-collection route
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
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
        expect(decimalsInput).toHaveValue(0);
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

        // By default, supply is variable
        expect(screen.getByTitle('Toggle Mint Baton')).toHaveProperty(
            'checked',
            true,
        );

        // Hit the switch for fixed supply
        await user.click(screen.getByTitle('Toggle Mint Baton'));

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
    it('User can create an ALP token', async () => {
        const createdTokenId =
            '75883c5ebc2c3b375ae6e25dcc845dfbc6b34ae6c1319fb840e7dcba1f8135e7';
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
        mockedChronik.setToken(createdTokenId, MOCK_CHRONIK_TOKEN_CALL);
        mockedChronik.setTx(createdTokenId, MOCK_CHRONIK_GENESIS_TX_CALL);
        mockedChronik.setUtxosByTokenId(createdTokenId, [
            MOCK_UTXO_FOR_BALANCE,
        ]);
        // Add tx mock to mockedChronik
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a210200000064417055f05736401020a4eec59c8c9cb2e76bdbcfca5e2a9b1468e1dcf5ef5534febab436728463762b015f9564fa33cc870de0cfcafa7a906b663bc8ba58816c644121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000646a504c60534c5032000747454e4553495303544b450a7465737420746f6b656e1768747470733a2f2f7777772e636173687461622e636f6d0021031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d02010087930300000122020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188acf47c0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';

        mockedChronik.setBroadcastTx(hex, createdTokenId);
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
                route="/create-token"
            />,
        );

        // Wait for Cashtab to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // On load, the SLP switch is selected by default
        expect(screen.getByTitle('Create SLP')).toBeChecked();

        // Select ALP
        await user.click(screen.getByTitle('Create ALP'));

        // Now ALP is checked, SLP is not
        expect(screen.getByTitle('Create SLP')).not.toBeChecked();
        expect(screen.getByTitle('Create ALP')).toBeChecked();

        // The user enters valid token metadata
        await user.type(
            await screen.findByPlaceholderText('Enter a name for your token'),
            'test token',
        );

        // The create button is disabled as the user has not entered a ticker
        expect(
            screen.getByRole('button', { name: /Create eToken/ }),
        ).toHaveProperty('disabled', true);
        expect(
            screen.getByText('Token must have a name and a ticker'),
        ).toBeInTheDocument();

        await user.type(
            await screen.findByPlaceholderText('Enter a ticker for your token'),
            'TKE',
        );

        // The create button is now enabled as the user has not entered a ticker
        expect(
            screen.getByRole('button', { name: /Create eToken/ }),
        ).toHaveProperty('disabled', false);

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

        // Variable supply is default, so we do not need to hit the switch
        expect(screen.getByTitle('Toggle Mint Baton')).toHaveProperty(
            'checked',
            true,
        );

        // Click the Create eToken button
        await user.click(screen.getByRole('button', { name: /Create eToken/ }));

        // We see the formatted supply and variable label in the preview modal
        expect(screen.getByText('600,000 (variable)')).toBeInTheDocument();

        // Click OK on confirmation modal
        await user.click(screen.getByText('OK'));

        // Verify notification triggered
        expect(await screen.findByText('Token created!')).toHaveAttribute(
            'href',
            `${explorer.blockExplorerUrl}/tx/${createdTokenId}`,
        );

        // We are sent to its token-action page
        expect(await screen.findByTitle('Token Stats')).toBeInTheDocument();
    });
    it('Validation works as expected for ALP and SLP max supply', async () => {
        const createdTokenId =
            '75883c5ebc2c3b375ae6e25dcc845dfbc6b34ae6c1319fb840e7dcba1f8135e7';
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
        mockedChronik.setToken(createdTokenId, MOCK_CHRONIK_TOKEN_CALL);
        mockedChronik.setTx(createdTokenId, MOCK_CHRONIK_GENESIS_TX_CALL);
        mockedChronik.setUtxosByTokenId(createdTokenId, [
            MOCK_UTXO_FOR_BALANCE,
        ]);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
                route="/create-token"
            />,
        );

        // Wait for Cashtab to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // On load, the SLP switch is selected by default
        expect(screen.getByTitle('Create SLP')).toBeChecked();

        const tokenGenesisQtyInput = screen.getByPlaceholderText(
            'Enter initial token supply',
        );

        // Max out SLP supply
        await user.click(screen.getByText('max'));

        // We see max SLP supply for 0 decimals
        expect(tokenGenesisQtyInput).toHaveValue(
            MAX_MINT_AMOUNT_TOKEN_SATOSHIS,
        );

        // Select ALP
        await user.click(screen.getByTitle('Create ALP'));

        // Expect validation error bc SLP max supply is > ALP max supply
        expect(
            screen.getByText(
                `Amount ${MAX_MINT_AMOUNT_TOKEN_SATOSHIS} exceeds max mint amount for this token (${MAX_OUTPUT_AMOUNT_ALP_TOKEN_SATOSHIS})`,
            ),
        ).toBeInTheDocument();

        // Max out ALP supply
        await user.click(screen.getByText('max'));

        // We see max ALP supply for 0 decimals
        expect(tokenGenesisQtyInput).toHaveValue(
            MAX_OUTPUT_AMOUNT_ALP_TOKEN_SATOSHIS,
        );

        // Increase the decimals so that this supply is invalid
        await user.type(
            await screen.findByPlaceholderText(
                'Enter number of decimal places',
            ),
            '2',
        );

        // Expect validation error bc ALP max supply is lower if you have 2 decimals
        expect(
            screen.getByText(
                `Amount ${MAX_OUTPUT_AMOUNT_ALP_TOKEN_SATOSHIS} exceeds max mint amount for this token (2814749767106.55)`,
            ),
        ).toBeInTheDocument();
    });
});

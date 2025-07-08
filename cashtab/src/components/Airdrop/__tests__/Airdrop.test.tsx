// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import {
    walletWithXecAndTokens,
    easterEggTokenChronikTokenDetails,
    easterEggTokenChronikGenesisTx,
} from 'components/App/fixtures/mocks';
import {
    tokenUtxos,
    tokenUtxosDecimals,
    decimalsTokenInfo,
    decimalsTokenGenesis,
} from 'airdrop/fixtures/mocks';
import { when } from 'jest-when';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import appConfig from 'config/app';
import { clearLocalForage } from 'components/App/fixtures/helpers';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import {
    MockAgora,
    MockChronikClient,
} from '../../../../../modules/mock-chronik-client';
import {
    agoraOfferCachetAlphaOne,
    cachetCacheMocks,
} from 'components/Agora/fixtures/mocks';
import { prepareContext } from 'test';
import { chronikTokenMocks } from 'chronik/fixtures/mocks';

// Create token mocks for the tokens used in Airdrop tests
const tokenMocks = new Map();
// Easter Egg Token
tokenMocks.set(easterEggTokenChronikTokenDetails.tokenId, {
    tx: easterEggTokenChronikGenesisTx,
    tokenInfo: easterEggTokenChronikTokenDetails,
});
// Decimals Token
tokenMocks.set(decimalsTokenGenesis.txid, {
    tx: decimalsTokenGenesis,
    tokenInfo: decimalsTokenInfo,
});
// CACHET Token
tokenMocks.set(cachetCacheMocks.token.tokenId, {
    tx: cachetCacheMocks.tx,
    tokenInfo: cachetCacheMocks.token,
});
// BEAR Token
const bearTokenId =
    '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109';
const bearTokenData = chronikTokenMocks[bearTokenId];
tokenMocks.set(bearTokenId, {
    tx: bearTokenData.tx,
    tokenInfo: bearTokenData.token,
});

// TODO you cannot use the tokenMocks just for stuff you want to be available, unles
// you update prepareContext

describe('<Airdrop />', () => {
    let user: ReturnType<typeof userEvent.setup>;

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
            } as Response);
    });

    afterEach(async () => {
        jest.clearAllMocks();
        await clearLocalForage(localforage);
    });

    it('We can send a pro-rata airdrop and equal tx to a tokenId not in our cache using custom settings', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik: MockChronikClient = await prepareContext(
            localforage,
            [walletWithXecAndTokens],
            tokenMocks,
        );
        const mockedAgora = new MockAgora();

        const airdropTokenId =
            '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e';

        // No agora offers
        mockedAgora.setActiveOffersByTokenId(airdropTokenId, []);

        // Mock the chronik.tokenId(formData.tokenId).utxos(); call
        mockedChronik.setUtxosByTokenId(airdropTokenId, tokenUtxos.utxos);

        // Mock the chronik.token(tokenId) call that getTokenGenesisInfo makes
        const easterEggTokenMock = tokenMocks.get(airdropTokenId);
        if (easterEggTokenMock) {
            mockedChronik.setToken(
                airdropTokenId,
                easterEggTokenMock.tokenInfo as any,
            );
        }

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                route="/airdrop"
            />,
        );

        // Wait for the app to load (Cashtab Loading spinner gone)
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );
        // Wait for any other loading indicators (e.g. 'Loading...')
        await waitFor(() =>
            expect(screen.queryByText('Loading...')).not.toBeInTheDocument(),
        );

        await user.type(
            screen.getByPlaceholderText('Enter the eToken ID'),
            airdropTokenId,
        );

        await user.type(
            screen.getByPlaceholderText('Enter the total XEC airdrop'),
            '5000',
        );

        await user.click(
            screen.getByRole('button', { name: /Calculate Airdrop/ }),
        );

        expect(
            await screen.findByText('One to Many Airdrop Payment Outputs'),
        ).toBeInTheDocument();

        expect(
            screen.getByPlaceholderText('Please input parameters above.'),
        ).toHaveValue(
            [
                'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj, 4400',
                'ecash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m, 200',
                'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr, 150',
                'ecash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6, 150',
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035, 50',
                'ecash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly, 50',
            ].join('\n'),
        );

        // We can ignore the mint address
        await user.click(screen.getByTitle('Toggle Ignore Mint Address'));
        await user.click(
            screen.getByRole('button', { name: /Calculate Airdrop/ }),
        );

        // The mint address for this token was not eligible anyway
        expect(
            screen.getByPlaceholderText('Please input parameters above.'),
        ).toHaveValue(
            [
                'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj, 4400',
                'ecash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m, 200',
                'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr, 150',
                'ecash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6, 150',
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035, 50',
                'ecash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly, 50',
            ].join('\n'),
        );

        // We can ignore other addresses
        await user.click(screen.getByTitle('Toggle Ignore Custom Addresses'));
        await user.type(
            await screen.findByPlaceholderText(/If more than one XEC address/),
            'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr,ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
        );

        await user.click(
            screen.getByRole('button', { name: /Calculate Airdrop/ }),
        );

        // Now these addresses are not in the airdrop, and the other amounts are proportionally adjusted
        expect(
            screen.getByPlaceholderText('Please input parameters above.'),
        ).toHaveValue(
            [
                'ecash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m, 2222.22',
                'ecash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6, 1666.66',
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035, 555.55',
                'ecash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly, 555.55',
            ].join('\n'),
        );

        // We can airdrop people with less of a token the same amount of XEC as other users in case we happen to think in this way
        // We can ignore other addresses
        await user.click(screen.getByTitle('Toggle Communism'));

        await user.click(
            screen.getByRole('button', { name: /Calculate Airdrop/ }),
        );

        // Now these addresses are not in the airdrop, and the other amounts are proportionally adjusted
        expect(
            screen.getByPlaceholderText('Please input parameters above.'),
        ).toHaveValue(
            [
                'ecash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m, 1250',
                'ecash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6, 1250',
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035, 1250',
                'ecash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly, 1250',
            ].join('\n'),
        );
    });

    it('We can ignore addresses with less than a token balance for a token with decimals', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await prepareContext(
            localforage,
            [walletWithXecAndTokens],
            tokenMocks,
        );

        const airdropTokenId =
            'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1';

        const mockedAgora = new MockAgora();

        // No agora offers
        mockedAgora.setActiveOffersByTokenId(airdropTokenId, []);

        // Mock the chronik.tokenId(formData.tokenId).utxos(); call
        mockedChronik.setUtxosByTokenId(
            airdropTokenId,
            tokenUtxosDecimals.utxos as any,
        );

        // Mock the chronik.token(tokenId) call that getTokenGenesisInfo makes
        const decimalsTokenMock = tokenMocks.get(airdropTokenId);
        if (decimalsTokenMock) {
            mockedChronik.setToken(
                airdropTokenId,
                decimalsTokenMock.tokenInfo as any,
            );
        }

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                route="/airdrop"
            />,
        );

        // Wait for the app to load (Cashtab Loading spinner gone)
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );
        // Wait for any other loading indicators (e.g. 'Loading...')
        await waitFor(() =>
            expect(screen.queryByText('Loading...')).not.toBeInTheDocument(),
        );

        await user.type(
            screen.getByPlaceholderText('Enter the eToken ID'),
            airdropTokenId,
        );

        await user.type(
            screen.getByPlaceholderText('Enter the total XEC airdrop'),
            '500000',
        );

        await user.click(
            screen.getByRole('button', { name: /Calculate Airdrop/ }),
        );

        expect(
            await screen.findByText('One to Many Airdrop Payment Outputs'),
        ).toBeInTheDocument();

        expect(
            screen.getByPlaceholderText('Please input parameters above.'),
        ).toHaveValue(
            [
                'ecash:qp6qkpeg5xmpcqtu6uc5qkhzexg4sq009sfeekcfk2, 499894.34',
                'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj, 94.15',
                'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6, 11.49',
            ].join('\n'),
        );

        // We can ignore the mint address
        await user.click(screen.getByTitle('Toggle Ignore Mint Address'));
        await user.click(
            screen.getByRole('button', { name: /Calculate Airdrop/ }),
        );

        // The mint address for this token was not eligible anyway
        expect(
            screen.getByPlaceholderText('Please input parameters above.'),
        ).toHaveValue(
            [
                'ecash:qp6qkpeg5xmpcqtu6uc5qkhzexg4sq009sfeekcfk2, 499894.34',
                'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj, 94.15',
                'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6, 11.49',
            ].join('\n'),
        );

        // We can ignore addresses based on having too little of the token
        await user.click(screen.getByTitle('Toggle Minimum Token Balance'));
        await user.type(
            await screen.findByPlaceholderText(/Minimum eToken balance/),
            '0.25',
        );

        await user.click(
            screen.getByRole('button', { name: /Calculate Airdrop/ }),
        );

        // We have excluded the token with a balance of 0.23
        expect(
            screen.getByPlaceholderText('Please input parameters above.'),
        ).toHaveValue(
            [
                'ecash:qp6qkpeg5xmpcqtu6uc5qkhzexg4sq009sfeekcfk2, 499905.84',
                'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj, 94.15',
            ].join('\n'),
        );

        // We can ignore another address
        await user.click(screen.getByTitle('Toggle Ignore Custom Addresses'));
        await user.type(
            await screen.findByPlaceholderText(/If more than one XEC address/),
            'ecash:qp6qkpeg5xmpcqtu6uc5qkhzexg4sq009sfeekcfk2',
        );

        await user.click(
            screen.getByRole('button', { name: /Calculate Airdrop/ }),
        );

        // Now these addresses are not in the airdrop, and the other amounts are proportionally adjusted
        expect(
            screen.getByPlaceholderText('Please input parameters above.'),
        ).toHaveValue(
            `ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj, 500000`,
        );
    });

    it('We can include the p2pkh address of the creators of active agora listings together with those of p2pkh holders', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await prepareContext(
            localforage,
            [walletWithXecAndTokens],
            tokenMocks,
        );
        const mockedAgora = new MockAgora();

        const airdropTokenId =
            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1';

        // No agora offers
        mockedAgora.setActiveOffersByTokenId(airdropTokenId, [
            agoraOfferCachetAlphaOne,
        ]);

        // Mock a CACHET holder without an agora airdrop
        const mockOutpoint = { txid: '11'.repeat(32), outIdx: 0 };
        const mockTokenType = {
            protocol: 'SLP' as const,
            type: 'SLP_TOKEN_TYPE_FUNGIBLE' as const,
            number: 1,
        };
        const mockToken = {
            tokenId: airdropTokenId,
            tokenType: mockTokenType,
            atoms: 100n,
            isMintBaton: false,
        };
        // Mock p2pkh holder
        const mockHolderP2pkh = {
            outpoint: mockOutpoint,
            blockHeight: 800000,
            isCoinbase: false,
            script: '76a91400cd590bfb90b6dc1725530d6c36c78b88ddb60888ac',
            sats: 546n,
            isFinal: true,
            token: mockToken,
        };
        mockedChronik.setUtxosByTokenId(airdropTokenId, [mockHolderP2pkh]);

        // Mock the chronik.token(tokenId) call that getTokenGenesisInfo makes
        const cachetTokenMock = tokenMocks.get(airdropTokenId);
        if (cachetTokenMock) {
            mockedChronik.setToken(
                airdropTokenId,
                cachetTokenMock.tokenInfo as any,
            );
        }

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                route="/airdrop"
            />,
        );

        // Wait for the app to load (Cashtab Loading spinner gone)
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );
        // Wait for any other loading indicators (e.g. 'Loading...')
        await waitFor(() =>
            expect(screen.queryByText('Loading...')).not.toBeInTheDocument(),
        );

        await user.type(
            screen.getByPlaceholderText('Enter the eToken ID'),
            airdropTokenId,
        );

        await user.type(
            screen.getByPlaceholderText('Enter the total XEC airdrop'),
            '5000',
        );

        await user.click(
            screen.getByRole('button', { name: /Calculate Airdrop/ }),
        );

        expect(
            await screen.findByText('One to Many Airdrop Payment Outputs'),
        ).toBeInTheDocument();

        expect(
            screen.getByPlaceholderText('Please input parameters above.'),
        ).toHaveValue(
            [
                'ecash:qqpmsv8yh8wwx3lnf92rrc0e6yq97j6zqs8av8vx8h, 4950.49',
                'ecash:qqqv6kgtlwgtdhqhy4fs6mpkc79c3hdkpqwunu3dqx, 49.5',
            ].join('\n'),
        );
    });
});

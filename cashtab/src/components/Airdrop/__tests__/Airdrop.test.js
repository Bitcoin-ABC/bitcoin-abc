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

describe('<Airdrop />', () => {
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
    it('We can send a pro-rata airdrop and equal tx to a tokenId not in our cache using custom settings', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        const airdropTokenId =
            '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e';
        // Make sure the app can get this token's genesis info by calling a mock
        mockedChronik.setMock('token', {
            input: airdropTokenId,
            output: easterEggTokenChronikTokenDetails,
        });

        // Set tx mock so we can get its minting address
        mockedChronik.setMock('tx', {
            input: airdropTokenId,
            output: easterEggTokenChronikGenesisTx,
        });

        // Mock the chronik.tokenId(formData.tokenId).utxos(); call
        mockedChronik.setTokenId(airdropTokenId);
        mockedChronik.setUtxosByTokenId(airdropTokenId, tokenUtxos);

        render(<CashtabTestWrapper chronik={mockedChronik} route="/airdrop" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
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
            `ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr, 150\necash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035, 50\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6, 150\necash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly, 50\necash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m, 200\necash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj, 4400`,
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
            `ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr, 150\necash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035, 50\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6, 150\necash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly, 50\necash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m, 200\necash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj, 4400`,
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
            `ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035, 555.55\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6, 1666.66\necash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly, 555.55\necash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m, 2222.22`,
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
            `ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035, 1250\necash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6, 1250\necash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly, 1250\necash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m, 1250`,
        );
    });
    it('We can ignore addresses with less than a token balance for a token with decimals', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        const airdropTokenId =
            'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1';
        // Make sure the app can get this token's genesis info by calling a mock
        mockedChronik.setMock('token', {
            input: airdropTokenId,
            output: decimalsTokenInfo,
        });

        // Set tx mock so we can get its minting address
        mockedChronik.setMock('tx', {
            input: airdropTokenId,
            output: decimalsTokenGenesis,
        });

        // Mock the chronik.tokenId(formData.tokenId).utxos(); call
        mockedChronik.setTokenId(airdropTokenId);
        mockedChronik.setUtxosByTokenId(airdropTokenId, tokenUtxosDecimals);

        render(<CashtabTestWrapper chronik={mockedChronik} route="/airdrop" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
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
            `ecash:qp6qkpeg5xmpcqtu6uc5qkhzexg4sq009sfeekcfk2, 499894.34\necash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj, 94.15\necash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6, 11.49`,
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
            `ecash:qp6qkpeg5xmpcqtu6uc5qkhzexg4sq009sfeekcfk2, 499894.34\necash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj, 94.15\necash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6, 11.49`,
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
            `ecash:qp6qkpeg5xmpcqtu6uc5qkhzexg4sq009sfeekcfk2, 499905.84\necash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj, 94.15`,
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
});

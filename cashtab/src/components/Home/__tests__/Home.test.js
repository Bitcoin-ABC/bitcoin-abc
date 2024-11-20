// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { walletWithXecAndTokens } from 'components/App/fixtures/mocks';
import { walletWithZeroBalanceZeroHistory } from 'components/Home/fixtures/mocks';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import userEvent from '@testing-library/user-event';
import { token as tokenConfig } from 'config/token';

// Mock the recaptcha-v3 library
const MOCKED_RECAPTCHA_TOKEN = 'mocked-recaptcha-token';
jest.mock('recaptcha-v3', () => ({
    load: jest.fn(async () => {
        return {
            execute: jest.fn(() => Promise.resolve(MOCKED_RECAPTCHA_TOKEN)),
        };
    }),
}));

describe('<Home />', () => {
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
    it('Renders the loading component while loading, then the Home screen', async () => {
        // localforage defaults
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Initially, Home component is not rendered
        expect(screen.queryByTestId('tx-history')).not.toBeInTheDocument();

        // Initially, Loading ctn is rendered
        expect(screen.getByTitle('Cashtab Loading')).toBeInTheDocument();

        // After wallet loads, this is reversed
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for the balance to render
        expect(await screen.findByText('9,513.12 XEC')).toBeInTheDocument();

        // The home screen is in the document
        expect(await screen.findByTestId('tx-history')).toBeInTheDocument();

        // No API Error
        await waitFor(() =>
            expect(
                screen.queryByText('Error in chronik connection'),
            ).not.toBeInTheDocument(),
        );
    });
    it('Renders the Home screen with API error', async () => {
        // localforage defaults and API error set
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
            true, // apiError bool
        );
        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // API Error is rendered
        expect(
            await screen.findByText('Error in chronik connection'),
        ).toBeInTheDocument();
    });
    it('Renders backup warning, token rewards button, and QR Code if user loads with a new wallet that is not the only wallet', async () => {
        // localforage defaults
        const mockedChronik = await initializeCashtabStateForTests(
            [
                walletWithZeroBalanceZeroHistory,
                { ...walletWithZeroBalanceZeroHistory, name: 'something else' },
            ],
            localforage,
        );
        const address =
            walletWithZeroBalanceZeroHistory.paths.get(1899).address;
        // Mock successful claim rewards call
        when(fetch)
            .calledWith(`${tokenConfig.rewardsServerBaseUrl}/claim/${address}`)
            .mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        address,
                        msg: 'Success',
                        txid: '1111111111111111111111111111111111111111111111111111111111111111',
                    }),
            });
        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait for the component to finish loading
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Backup warning is rendered
        await screen.findByText('Backup your wallet');
        await screen.findByText(
            'Write down your 12-word seed and keep it in a safe place.',
        );
        await screen.findByText('Do not share your backup with anyone.');

        // Token rewards button is present
        const tokenRewardsButton = screen.getByRole('button', {
            name: /Claim Token Rewards/,
        });

        expect(tokenRewardsButton).toBeInTheDocument();

        // Free XEC button is not present, because the user has more than 1 wallet
        expect(
            screen.queryByRole('button', {
                name: /Claim Free XEC/,
            }),
        ).not.toBeInTheDocument();

        // Token rewards button button is NOT disabled
        expect(tokenRewardsButton).toHaveProperty('disabled', false);

        // Receive QR code is rendered
        expect(screen.getByTitle('Receive')).toBeInTheDocument();

        // We can claim an airdrop on a new wallet
        await userEvent.click(tokenRewardsButton);

        // Token rewards button is disabled after clicking for claim
        expect(tokenRewardsButton).toHaveProperty('disabled', true);

        // We see a toast for the successful rewards claim
        expect(
            await screen.findByText(
                'Token rewards claimed! Check "Rewards" menu option for more.',
            ),
        ).toBeInTheDocument();

        // Note we cannot test that these options go away after the tx is received without
        // regtest-integrated integration testing
        // This test cannot see an incoming tx
    });
    it('Renders backup warning, Airdrop button, and QR Code if user loads with a new wallet that is the only created wallet', async () => {
        // localforage defaults
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithZeroBalanceZeroHistory,
            localforage,
        );
        const address =
            walletWithZeroBalanceZeroHistory.paths.get(1899).address;
        // Mock successful claim rewards call
        when(fetch)
            .calledWith(
                `${tokenConfig.rewardsServerBaseUrl}/claimxec/${address}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token: MOCKED_RECAPTCHA_TOKEN }),
                },
            )
            .mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        address,
                        msg: 'Success',
                        txid: '1111111111111111111111111111111111111111111111111111111111111111',
                    }),
            });
        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait for the component to finish loading
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Backup warning is rendered
        await screen.findByText('Backup your wallet');
        await screen.findByText(
            'Write down your 12-word seed and keep it in a safe place.',
        );
        await screen.findByText('Do not share your backup with anyone.');

        // isNewishWallet info is NOT displayed (no tx history)
        expect(
            screen.queryByText(/Nice, you have some eCash. What can you do?/),
        ).not.toBeInTheDocument();

        // Airdrop button is present
        const airdropButton = screen.getByRole('button', {
            name: /Claim Free XEC/,
        });

        expect(airdropButton).toBeInTheDocument();

        // Claim token rewards button is not present, because the user has only 1 wallet
        expect(
            screen.queryByRole('button', {
                name: /Claim Token Rewards/,
            }),
        ).not.toBeInTheDocument();

        // Airdrop button is NOT disabled
        expect(airdropButton).toHaveProperty('disabled', false);

        // Receive QR code is rendered
        expect(screen.getByTitle('Receive')).toBeInTheDocument();

        // We can claim an airdrop on a new wallet
        await userEvent.click(airdropButton);

        // Airdrop button is disabled after clicking for claim
        expect(airdropButton).toHaveProperty('disabled', true);

        // We see a toast for the successful rewards claim
        expect(
            await screen.findByText('Free eCash claimed!'),
        ).toBeInTheDocument();

        // Note we cannot test that these options go away after the tx is received without
        // regtest-integrated integration testing
        // This test cannot see an incoming tx
    });
    it('Home screen suggests some ideas for using eCash if user has a non-zero balance and 3 or less txs in history', async () => {
        // localforage defaults
        const mockedChronik = await initializeCashtabStateForTests(
            {
                ...walletWithZeroBalanceZeroHistory,
                state: {
                    ...walletWithZeroBalanceZeroHistory.state,
                    balanceSats: 3000,
                    nonSlpUtxos: [
                        {
                            outpoint: {
                                txid: 'fd7b1118a6eed473b188d328be2bb807072d1834a6575ea983b330236ac2763b',
                                outIdx: 0,
                            },
                            blockHeight: 858113,
                            isCoinbase: false,
                            value: 3000,
                            isFinal: true,
                            path: 1899,
                        },
                    ],
                    parsedTxHistory: [
                        {
                            txid: 'fd7b1118a6eed473b188d328be2bb807072d1834a6575ea983b330236ac2763b',
                            version: 2,
                            inputs: [
                                {
                                    prevOut: {
                                        txid: 'eb4421abfe0e97d5ac635d77a6fd323e2d269374d80617c6257bff8af91bf47d',
                                        outIdx: 1,
                                    },
                                    inputScript:
                                        '4175a1b7b9be9cf11bf2cb1b0e8f88f3e7f73067d4914d115b9eaf7af0b9d0faa42e7c2f8d75395fe4b754119690f84758f61780c5c68dd570558839beea77a1c641210353f81d61d41d6e22c73ab449476113dea124afe3972991cd237e654f15950b7c',
                                    value: 68671048,
                                    sequenceNo: 4294967295,
                                    outputScript:
                                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                                },
                            ],
                            outputs: [
                                {
                                    value: 3000,
                                    outputScript:
                                        '76a914022c7284d51db6074fb2430f6c25cd16a58e082888ac',
                                },
                                {
                                    value: 68667829,
                                    outputScript:
                                        '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                                },
                            ],
                            lockTime: 0,
                            timeFirstSeen: 1723843030,
                            size: 219,
                            isCoinbase: false,
                            tokenEntries: [],
                            tokenFailedParsings: [],
                            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                            block: {
                                height: 858113,
                                hash: '00000000000000001a8b91517a249923c2fb097e0d2fce5407342d4ef40dd4e3',
                                timestamp: 1723843380,
                            },
                            parsed: {
                                xecTxType: 'Received',
                                satoshisSent: 3000,
                                stackArray: [],
                                recipients: [
                                    'ecash:qzppgpav9xfls6zzyuqy7syxpqhnlqqa5u68m4qw6l',
                                ],
                            },
                        },
                    ],
                },
            },
            localforage,
        );

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait for the component to finish loading
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // isNewishWallet info is displayed
        expect(
            await screen.findByText(
                /Nice, you have some eCash. What can you do?/,
            ),
        ).toBeInTheDocument();
    });
});

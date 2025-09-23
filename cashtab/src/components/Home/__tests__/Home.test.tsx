// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import {
    walletWithXecAndTokensActive,
    bearTokenAndTx,
} from 'components/App/fixtures/mocks';
import { walletWithZeroBalanceZeroHistory } from 'components/Home/fixtures/mocks';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import { prepareContext, mockPrice } from 'test';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { MemoryRouter } from 'react-router-dom';
import { WalletProvider } from 'wallet/context';
import { ChronikClient } from 'chronik-client';
import { Ecc } from 'ecash-lib';
import { Agora } from 'ecash-agora';
import {
    MockAgora,
    MockChronikClient,
} from '../../../../../modules/mock-chronik-client';
import App from 'components/App/App';
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

interface HomeTestWrapperProps {
    chronik: MockChronikClient;
    agora: MockAgora;
    ecc: Ecc;
    theme: any;
    route?: string;
}

const HomeTestWrapper: React.FC<HomeTestWrapperProps> = ({
    chronik,
    agora,
    ecc,
    theme,
    route = '/',
}) => (
    <WalletProvider
        chronik={chronik as unknown as ChronikClient}
        agora={agora as unknown as Agora}
        ecc={ecc}
    >
        <MemoryRouter initialEntries={[route]}>
            <ThemeProvider theme={theme}>
                <App />
            </ThemeProvider>
        </MemoryRouter>
    </WalletProvider>
);
describe('<Home />', () => {
    const ecc = new Ecc();
    let user: ReturnType<typeof userEvent.setup>;
    let mockAgora: MockAgora;

    beforeEach(() => {
        mockAgora = new MockAgora();
        // Set up userEvent
        user = userEvent.setup();
        // Mock the fetch call for Cashtab's price API
        global.fetch = jest.fn();
        mockPrice(0.00003);
    });

    afterEach(async () => {
        jest.clearAllMocks();
        await localforage.clear();
    });

    it('Renders the loading component while loading, then the Home screen', async () => {
        const tokenMocks = new Map();
        // Add BEAR token mock
        tokenMocks.set(bearTokenAndTx.token.tokenId, {
            tx: bearTokenAndTx.tx,
            tokenInfo: bearTokenAndTx.token,
        });

        const mockedChronik = await prepareContext(
            localforage,
            [walletWithXecAndTokensActive],
            tokenMocks,
        );

        render(
            <HomeTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
                theme={theme}
            />,
        );

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
        expect(
            await screen.findByTitle('Balance XEC', {}, { timeout: 10000 }),
        ).toHaveTextContent('9,513.12 XEC');

        // The home screen is in the document
        expect(await screen.findByTestId('tx-history')).toBeInTheDocument();

        // No API Error
        await waitFor(() =>
            expect(
                screen.queryByText('Error in chronik connection'),
            ).not.toBeInTheDocument(),
        );
    });

    it('Renders the Home screen with API error (as well as errors in API calls during createWallet for the active wallet)', async () => {
        const tokenMocks = new Map();
        // Add BEAR token mock
        tokenMocks.set(bearTokenAndTx.token.tokenId, {
            tx: bearTokenAndTx.tx,
            tokenInfo: bearTokenAndTx.token,
        });

        const mockedChronik = await prepareContext(
            localforage,
            [walletWithXecAndTokensActive],
            tokenMocks,
        );

        // Set API error in mocked chronik
        mockedChronik.setBlockchainInfo(
            new Error('Error fetching blockchainInfo'),
        );
        mockedChronik.setBlock(800000, new Error('Error fetching block'));

        // Set error for utxos by address calls
        const address = walletWithXecAndTokensActive.address;
        if (address) {
            mockedChronik.setUtxosByAddress(
                address,
                new Error('Error fetching utxos'),
            );
        }

        render(
            <HomeTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
                theme={theme}
            />,
        );

        // API Error is rendered
        expect(
            await screen.findByText('Error in chronik connection'),
        ).toBeInTheDocument();
    });

    it('Renders backup warning, token rewards button, and QR Code if user loads with a new wallet that is not the only wallet', async () => {
        const tokenMocks = new Map();
        // Add BEAR token mock
        tokenMocks.set(bearTokenAndTx.token.tokenId, {
            tx: bearTokenAndTx.tx,
            tokenInfo: bearTokenAndTx.token,
        });

        const mockedChronik = await prepareContext(
            localforage,
            [
                walletWithZeroBalanceZeroHistory,
                { ...walletWithZeroBalanceZeroHistory, name: 'something else' },
            ],
            tokenMocks,
        );

        const address = walletWithZeroBalanceZeroHistory.address;
        if (address) {
            // Mock successful claim rewards call
            when(fetch)
                .calledWith(
                    `${tokenConfig.rewardsServerBaseUrl}/claim/${address}`,
                )
                .mockResolvedValue({
                    json: () =>
                        Promise.resolve({
                            address,
                            msg: 'Success',
                            txid: '1111111111111111111111111111111111111111111111111111111111111111',
                        }),
                } as Response);
        }

        render(
            <HomeTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
                theme={theme}
            />,
        );

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
        await user.click(tokenRewardsButton);

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
        const tokenMocks = new Map();
        // Add BEAR token mock
        tokenMocks.set(bearTokenAndTx.token.tokenId, {
            tx: bearTokenAndTx.tx,
            tokenInfo: bearTokenAndTx.token,
        });

        const mockedChronik = await prepareContext(
            localforage,
            [walletWithZeroBalanceZeroHistory],
            tokenMocks,
        );

        const address = walletWithZeroBalanceZeroHistory.address;
        if (address) {
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
                } as Response);
        }

        render(
            <HomeTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
                theme={theme}
            />,
        );

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
        await user.click(airdropButton);

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
        const tokenMocks = new Map();
        // Add BEAR token mock
        tokenMocks.set(bearTokenAndTx.token.tokenId, {
            tx: bearTokenAndTx.tx,
            tokenInfo: bearTokenAndTx.token,
        });

        const walletWithBalanceAndHistory = {
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
                        sats: 3000n,
                        isFinal: true,
                    },
                ],
            },
        };

        const mockedChronik = await prepareContext(
            localforage,
            [walletWithBalanceAndHistory],
            tokenMocks,
            [
                [
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
                                sats: 68671048n,
                                sequenceNo: 4294967295,
                                outputScript:
                                    '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                            },
                        ],
                        outputs: [
                            {
                                sats: 3000n,
                                outputScript:
                                    '76a914022c7284d51db6074fb2430f6c25cd16a58e082888ac',
                            },
                            {
                                sats: 68667829n,
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
                        isFinal: true,
                    },
                ],
            ],
        );

        render(
            <HomeTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
                theme={theme}
            />,
        );

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

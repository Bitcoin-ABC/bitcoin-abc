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

// Mock a valid sideshift object in window
window.sideshift = {
    show: jest.fn(),
    hide: jest.fn(),
    addEventListener: jest.fn(),
};

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
        const address = walletWithZeroBalanceZeroHistory.Path1899.cashAddress;
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
        const address = walletWithZeroBalanceZeroHistory.Path1899.cashAddress;
        // Mock successful claim rewards call
        when(fetch)
            .calledWith(
                `${tokenConfig.rewardsServerBaseUrl}/claimxec/${address}`,
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
});

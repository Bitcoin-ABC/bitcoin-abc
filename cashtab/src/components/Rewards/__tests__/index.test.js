// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { walletWithXecAndTokens } from 'components/App/fixtures/mocks';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('<Rewards />', () => {
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
    it('Renders the loading component while loading, then the Rewards screen', async () => {
        // localforage defaults
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        render(<CashtabTestWrapper chronik={mockedChronik} route="/rewards" />);

        // Wait for Cashtab to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // The Rewards screen is in the document
        expect(screen.getByTitle('Rewards')).toBeInTheDocument();
    });
    it('An eligible cashtab wallet can claim a token reward', async () => {
        // localforage defaults
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        const address = walletWithXecAndTokens.paths.get(1899).address;

        // Mock eligibility call as eligible
        when(fetch)
            .calledWith(
                `${tokenConfig.rewardsServerBaseUrl}/is-eligible/${address}`,
            )
            .mockResolvedValue({
                json: () => Promise.resolve({ address, isEligible: true }),
            });

        // Mock successful claim rewards call
        when(fetch)
            .calledWith(
                `${tokenConfig.rewardsServerBaseUrl}/claim/${address}`,
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
                        txid: '3b15da50052e8884a9d089920bc23d4a05da44e3c20c41eba954bf4ce3326d59',
                    }),
            });
        render(<CashtabTestWrapper chronik={mockedChronik} route="/rewards" />);

        // Wait for Cashtab to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // The Rewards screen is in the document
        expect(screen.getByTitle('Rewards')).toBeInTheDocument();

        // The Claim button is labeled 'Claim'
        const claimButton = await screen.findByRole('button', {
            name: /Claim/,
        });

        // The Claim button is NOT disabled
        expect(claimButton).toHaveProperty('disabled', false);

        // Click button to claim token rewards
        await userEvent.click(claimButton);

        // We see a toast for the successful rewards claim
        expect(await screen.findByText('Rewards claimed!')).toBeInTheDocument();
    });
    it('An ineligible cashtab wallet sees a countdown to eligibility', async () => {
        jest.useFakeTimers();
        // localforage defaults
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        const address = walletWithXecAndTokens.paths.get(1899).address;

        // Mock eligibility call as ineligible
        when(fetch)
            .calledWith(
                `${tokenConfig.rewardsServerBaseUrl}/is-eligible/${address}`,
            )
            .mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        address,
                        isEligible: false,
                        becomesEligible: Math.floor(
                            (new Date().getTime() + 3000) / 1000,
                        ),
                    }),
            });

        render(<CashtabTestWrapper chronik={mockedChronik} route="/rewards" />);

        // Wait for Cashtab to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // The Rewards screen is in the document
        expect(screen.getByTitle('Rewards')).toBeInTheDocument();

        // The inline loader is present until the timestamp has been calculated
        expect(await screen.findByTitle('Loading')).toBeInTheDocument();

        // Advance timer long enough for the countdown to be populated
        act(() => {
            jest.advanceTimersByTime(1000);
        });

        // When the timestamp is calculated, the inline loader is gone
        await waitFor(() =>
            expect(screen.queryByTitle('Loading')).not.toBeInTheDocument(),
        );

        // The Claim button is labeled by a timestamp msg
        const claimButton = await screen.findByRole('button', {
            name: /Come back in/,
        });

        // The Claim button is disabled
        expect(claimButton).toHaveProperty('disabled', true);

        // Button is still enabled after enough time has passed
        // Advance timer long enough for the countdown to be populated
        act(() => {
            jest.advanceTimersByTime(2000);
        });

        // The Claim button is no longer disabled
        expect(claimButton).toHaveProperty('disabled', false);

        // The Claim button is labeled 'Claim'
        expect(
            await screen.findByRole('button', {
                name: /Claim/,
            }),
        ).toBeInTheDocument();

        // Return to normal timers
        // Ref https://testing-library.com/docs/using-fake-timers/
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });
    it('We see expected error if token server is out of money', async () => {
        // localforage defaults
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        const address = walletWithXecAndTokens.paths.get(1899).address;

        // Mock eligibility call as eligible
        when(fetch)
            .calledWith(
                `${tokenConfig.rewardsServerBaseUrl}/is-eligible/${address}`,
            )
            .mockResolvedValue({
                json: () => Promise.resolve({ address, isEligible: true }),
            });

        // Mock error claim rewards call
        when(fetch)
            .calledWith(
                `${tokenConfig.rewardsServerBaseUrl}/claim/${address}`,
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
                        error: 'some general msg',
                        msg: 'Error: Insufficient token utxos',
                    }),
            });
        render(<CashtabTestWrapper chronik={mockedChronik} route="/rewards" />);

        // Wait for Cashtab to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // The Rewards screen is in the document
        expect(screen.getByTitle('Rewards')).toBeInTheDocument();

        // The Claim button is labeled 'Claim'
        const claimButton = await screen.findByRole('button', {
            name: /Claim/,
        });

        // The Claim button is NOT disabled
        expect(claimButton).toHaveProperty('disabled', false);

        // Click button to claim token rewards
        await userEvent.click(claimButton);

        // We see a toast for the expected error
        expect(
            await screen.findByText(
                'Error: token-server is out of rewards to send. Contact admin.',
            ),
        ).toBeInTheDocument();
    });
});

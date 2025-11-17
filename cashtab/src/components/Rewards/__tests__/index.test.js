// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { walletWithXecAndTokensActive } from 'components/App/fixtures/mocks';
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

// Mock the react-google-recaptcha library
const MOCKED_RECAPTCHA_TOKEN = 'mocked-recaptcha-token';
jest.mock('react-google-recaptcha', () => {
    const React = require('react');
    return React.forwardRef(function MockReCAPTCHA({ onChange }, ref) {
        const reset = React.useCallback(() => {
            // Reset clears the token
            if (onChange) {
                onChange(null);
            }
        }, [onChange]);

        React.useImperativeHandle(ref, () => ({
            reset,
        }));

        // Auto-trigger onChange with mock token when component mounts
        React.useEffect(() => {
            if (onChange) {
                onChange(MOCKED_RECAPTCHA_TOKEN);
            }
        }, [onChange]);

        return React.createElement('div', {
            'data-testid': 'mock-recaptcha',
        });
    });
});

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
            walletWithXecAndTokensActive,
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
            walletWithXecAndTokensActive,
            localforage,
        );
        const address = walletWithXecAndTokensActive.address;

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
            walletWithXecAndTokensActive,
            localforage,
        );
        const address = walletWithXecAndTokensActive.address;

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

        // Advance timer long enough for the countdown to be populated
        act(() => {
            jest.advanceTimersByTime(1000);
        });

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
            walletWithXecAndTokensActive,
            localforage,
        );
        const address = walletWithXecAndTokensActive.address;

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

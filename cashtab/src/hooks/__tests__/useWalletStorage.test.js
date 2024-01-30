import useWallet from '../useWallet';
import { renderHook, waitFor } from '@testing-library/react';
import defaultCashtabCache from 'config/cashtabCache';
import { cashtabSettings } from 'config/cashtabSettings';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import {
    walletWithXecAndTokens,
    nonDefaultContactList,
    nonDefaultCashtabCache,
    cashtabSettingsGbp,
} from 'hooks/fixtures/mocks';
import appConfig from 'config/app';
import { when } from 'jest-when';
import { websocket as websocketConfig } from 'config/websocket';

const TRIGGER_UTXO_REFRESH_INTERVAL_MS = 10;

describe('useWallet hook rendering in different localforage states', () => {
    afterEach(async () => {
        jest.clearAllMocks();
        await localforage.clear();
    });

    it('Cashtab loads wallet, settings, cache, and contactlist from localforage to context if they are present', async () => {
        // Set valid and non-default items for wallet context keys that come from indexedDb
        await localforage.setItem('contactList', nonDefaultContactList);
        await localforage.setItem('cashtabCache', nonDefaultCashtabCache);
        await localforage.setItem('settings', cashtabSettingsGbp);
        await localforage.setItem('wallet', walletWithXecAndTokens);

        const { result } = renderHook(() => useWallet());

        // On load, we have the 'instant' refresh interval
        expect(result.current.walletRefreshInterval).toBe(
            TRIGGER_UTXO_REFRESH_INTERVAL_MS,
        );

        await waitFor(() => {
            expect(result.current.contactList).toStrictEqual(
                nonDefaultContactList,
            );
            expect(result.current.cashtabCache).toStrictEqual(
                nonDefaultCashtabCache,
            );
            expect(result.current.cashtabSettings).toStrictEqual(
                cashtabSettingsGbp,
            );
            expect(result.current.wallet).toStrictEqual(walletWithXecAndTokens);

            // Expect the wallet refresh interval to have been set from TRIGGER_UTXO_REFRESH_INTERVAL_MS to standard setting
            // i.e. the update function has been called
            expect(result.current.walletRefreshInterval).toBe(
                websocketConfig.websocketRefreshInterval,
            );
        });
    });
    it('Cashtab loads wallet, settings, cache, and contactlist as expected defaults if localforage is empty', async () => {
        // Do not set anything to local storage before render
        const { result } = renderHook(() => useWallet());

        // On load, we have the 'instant' refresh interval
        expect(result.current.walletRefreshInterval).toBe(
            TRIGGER_UTXO_REFRESH_INTERVAL_MS,
        );

        await waitFor(() => {
            expect(result.current.contactList).toStrictEqual([{}]);
            expect(result.current.cashtabCache).toStrictEqual(
                defaultCashtabCache,
            );
            expect(result.current.cashtabSettings).toStrictEqual(
                cashtabSettings,
            );
            expect(result.current.wallet).toStrictEqual(false);

            // Expect the wallet refresh interval to have been set from TRIGGER_UTXO_REFRESH_INTERVAL_MS to standard setting
            // i.e. the update function has been called
            expect(result.current.walletRefreshInterval).toBe(
                websocketConfig.websocketRefreshInterval,
            );
        });
    });
    it('XEC price is set in state on successful API fetch', async () => {
        // Mock the fetch call Cashtab's price API
        global.fetch = jest.fn();
        const fiatCode = 'usd'; // Use usd until you mock getting settings from localforage
        const cryptoId = appConfig.coingeckoId;
        // Keep this in the code, because different URLs will have different outputs require different parsing
        const priceApiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${fiatCode}&include_last_updated_at=true`;
        const xecPrice = 0.00003132;
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

        const { result } = renderHook(() => useWallet());
        await waitFor(() => {
            expect(result.current.fiatPrice).toBe(xecPrice);
        });
    });
    it('XEC price remains null in state on API error', async () => {
        // Mock the fetch call Cashtab's price API
        global.fetch = jest.fn();
        const fiatCode = 'usd'; // Use usd until you mock getting settings from localforage
        const cryptoId = appConfig.coingeckoId;
        // Keep this in the code, because different URLs will have different outputs require different parsing
        const priceApiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${fiatCode}&include_last_updated_at=true`;

        when(fetch)
            .calledWith(priceApiUrl)
            .mockResolvedValue({
                json: () => Promise.reject('Rate limit or some other error'),
            });

        const { result } = renderHook(() => useWallet());
        await waitFor(() => {
            expect(result.current.fiatPrice).toBe(null);
        });
    });
    it('XEC price is set in state to fiat currency of user settings on successful API fetch', async () => {
        // Mock the fetch call Cashtab's price API
        global.fetch = jest.fn();
        const fiatCode = 'gbp'; // Use usd until you mock getting settings from localforage
        const cryptoId = appConfig.coingeckoId;
        // Keep this in the code, because different URLs will have different outputs require different parsing
        const priceApiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${fiatCode}&include_last_updated_at=true`;
        const xecPrice = 0.00003132;
        const priceResponse = {
            ecash: {
                gbp: xecPrice,
                last_updated_at: 1706644626,
            },
        };
        when(fetch)
            .calledWith(priceApiUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(priceResponse),
            });

        // User has gbp as set currency
        await localforage.setItem('settings', cashtabSettingsGbp);

        const { result } = renderHook(() => useWallet());
        await waitFor(() => {
            expect(result.current.fiatPrice).toBe(xecPrice);
        });
    });
});

import useWallet from '../useWallet';
import { renderHook, waitFor } from '@testing-library/react';
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
import {
    clearLocalForage,
    initializeCashtabStateForTests,
} from 'components/fixtures/helpers';

const TRIGGER_UTXO_REFRESH_INTERVAL_MS = 50;

describe('useWallet hook rendering in different localforage states', () => {
    const xecPrice = 0.00003;
    const priceResponse = {
        ecash: {
            usd: xecPrice,
            last_updated_at: 1706644626,
        },
    };
    beforeEach(() => {
        // Mock the fetch call for Cashtab's price API
        global.fetch = jest.fn();
        const fiatCode = 'usd'; // Use usd until you mock getting settings from localforage
        const cryptoId = appConfig.coingeckoId;
        // Keep this in the code, because different URLs will have different outputs requiring different parsing
        const priceApiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${fiatCode}&include_last_updated_at=true`;

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

    it('Cashtab loads wallet, settings, cache, and contactlist from localforage to context if they are present', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        // Set valid and non-default items for wallet context keys that come from indexedDb
        await localforage.setItem('contactList', nonDefaultContactList);
        await localforage.setItem('cashtabCache', nonDefaultCashtabCache);
        await localforage.setItem('settings', cashtabSettingsGbp);

        const { result } = renderHook(() => useWallet(mockedChronik));

        // On load, we have the 'instant' refresh interval
        expect(result.current.walletRefreshInterval).toBe(
            TRIGGER_UTXO_REFRESH_INTERVAL_MS,
        );

        await waitFor(() =>
            expect(result.current.cashtabState.contactList).toStrictEqual(
                nonDefaultContactList,
            ),
        );

        // Note: we expect cashtabCache to update on wallet load as there is a token tx
        // in tx history that is not in cashtabCache
        const expectedUpdatedCache = JSON.parse(
            JSON.stringify(nonDefaultCashtabCache),
        );
        expectedUpdatedCache.tokenInfoById[
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109'
        ] = {
            decimals: 0,
            success: true,
            tokenDocumentHash: '',
            tokenDocumentUrl: 'https://cashtab.com/',
            tokenId:
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            tokenName: 'BearNip',
            tokenTicker: 'BEAR',
        };
        await waitFor(() =>
            expect(result.current.cashtabCache).toStrictEqual(
                expectedUpdatedCache,
            ),
        );
        await waitFor(() =>
            expect(result.current.cashtabState.settings).toStrictEqual(
                cashtabSettingsGbp,
            ),
        );
        await waitFor(() =>
            expect(result.current.wallet).toStrictEqual(walletWithXecAndTokens),
        );
        await waitFor(() =>
            // Expect the wallet refresh interval to have been set from TRIGGER_UTXO_REFRESH_INTERVAL_MS to standard setting
            // i.e. the update function has been called
            expect(result.current.walletRefreshInterval).toBe(
                websocketConfig.websocketRefreshInterval,
            ),
        );
    });
    it('XEC price is set in state on successful API fetch', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        const { result } = renderHook(() => useWallet(mockedChronik));
        await waitFor(() => {
            expect(result.current.fiatPrice).toBe(xecPrice);
        });
    });
    it('XEC price remains null in state on API error', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
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

        const { result } = renderHook(() => useWallet(mockedChronik));
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
        const xecPriceGbp = 0.00003132;
        const priceResponseGbp = {
            ecash: {
                gbp: xecPriceGbp,
                last_updated_at: 1706644626,
            },
        };
        when(fetch)
            .calledWith(priceApiUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(priceResponseGbp),
            });

        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );

        // User has gbp as set currency
        await localforage.setItem('settings', cashtabSettingsGbp);

        const { result } = renderHook(() => useWallet(mockedChronik));
        await waitFor(() => {
            expect(result.current.fiatPrice).toBe(xecPriceGbp);
        });
    });
});

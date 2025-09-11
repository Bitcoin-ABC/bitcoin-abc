// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import useWallet from 'wallet/useWallet';
import { renderHook, waitFor, act } from '@testing-library/react';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { FEE_SATS_PER_KB_XEC_MINIMUM } from 'constants/transactions';
import {
    cashtabSettingsGbp,
    nonDefaultContactList,
    nonDefaultCashtabCache,
    mockIncomingTokenTxDetails,
} from 'wallet/fixtures/mocks';
import appConfig from 'config/app';
import { when } from 'jest-when';
import {
    clearLocalForage,
    initializeCashtabStateForTests,
} from 'components/App/fixtures/helpers';
import { cashtabCacheToJSON, storedCashtabCacheToMap } from 'helpers';
import CashtabCache from 'config/CashtabCache';
import {
    walletWithXecAndTokens,
    mockCacheWalletWithXecAndTokens,
    mockCachedInfoCashtabDark,
} from 'components/App/fixtures/mocks';

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
    it('localforage can set and get a map of tokeninfo by tokenId', async () => {
        const mockTokenCache = new Map();

        mockTokenCache.set(
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            mockCacheWalletWithXecAndTokens,
        );

        mockTokenCache.set(
            'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
            mockCachedInfoCashtabDark,
        );

        const mockCashtabCache = { tokens: mockTokenCache };

        await localforage.setItem(
            'testCache',
            cashtabCacheToJSON(mockCashtabCache),
        );

        const revivedCashtabCache = storedCashtabCacheToMap(
            await localforage.getItem('testCache'),
        );

        expect(mockCashtabCache).toStrictEqual(revivedCashtabCache);
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
        // Mock the fetch call for Cashtab's price API
        global.fetch = jest.fn();
        const fiatCode = 'usd'; // Use usd until you mock getting settings from localforage
        const cryptoId = appConfig.coingeckoId;
        // Keep this in the code, because different URLs will have different outputs requiring different parsing
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
        // Mock the fetch call for Cashtab's price API
        global.fetch = jest.fn();
        const fiatCode = 'gbp'; // Use usd until you mock getting settings from localforage
        const cryptoId = appConfig.coingeckoId;
        // Keep this in the code, because different URLs will have different outputs requiring different parsing
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
    it('Cashtab loads wallet, settings, cache, and contactlist from localforage to context if they are present', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        // Set valid and non-default items for wallet context keys that come from indexedDb
        await localforage.setItem('contactList', nonDefaultContactList);
        // cashtabCache contains a Map and must be stored as JSON
        await localforage.setItem(
            'cashtabCache',
            cashtabCacheToJSON(nonDefaultCashtabCache),
        );
        await localforage.setItem('settings', cashtabSettingsGbp);

        const { result } = renderHook(() => useWallet(mockedChronik));

        await waitFor(() =>
            expect(result.current.cashtabState.contactList).toStrictEqual(
                nonDefaultContactList,
            ),
        );

        // Note: we expect cashtabCache to update on wallet load as there is a token tx
        // in tx history that is not in cashtabCache
        const expectedUpdatedCache = storedCashtabCacheToMap(
            JSON.parse(
                JSON.stringify(cashtabCacheToJSON(nonDefaultCashtabCache)),
            ),
        );

        expectedUpdatedCache.tokens.set(
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            mockCacheWalletWithXecAndTokens,
        );

        await waitFor(() =>
            expect(result.current.cashtabState.cashtabCache).toEqual(
                expectedUpdatedCache,
            ),
        );
        await waitFor(() =>
            expect(result.current.cashtabState.settings).toEqual({
                ...cashtabSettingsGbp,
                satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM, // Number format (no longer serialized)
            }),
        );
        await waitFor(() =>
            expect(result.current.cashtabState.wallets[0]).toStrictEqual(
                walletWithXecAndTokens,
            ),
        );
    });
    it('An incoming tx message from the websocket causes the wallet to update', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        // Mock chronik.tx response for this tx to be a new token tx
        const MOCK_TXID =
            '1111111111111111111111111111111111111111111111111111111111111111';
        mockedChronik.setTx(MOCK_TXID, mockIncomingTokenTxDetails);

        const { result } = renderHook(() => useWallet(mockedChronik));

        // Wait for the wallet to load
        await waitFor(() =>
            expect(result.current.cashtabState.wallets[0]).toStrictEqual(
                walletWithXecAndTokens,
            ),
        );

        const expectedCache = new CashtabCache();
        expectedCache.tokens.set(
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            mockCacheWalletWithXecAndTokens,
        );

        // cashtabCache has one token added from tx history
        await waitFor(() =>
            expect(result.current.cashtabState.cashtabCache).toEqual(
                expectedCache,
            ),
        );

        // Mock msg for an incoming tx
        const mockWebsocketMsg = {
            msgType: 'TX_ADDED_TO_MEMPOOL',
            txid: MOCK_TXID,
        };

        // processChronikWsMsg returns true if it makes it to the end of the function without returning
        // i.e., update() was called
        // TODO we can test this better with a jest bridge to regtest
        // We can't with mockedChronikClient bc we need to change the tx history after the component renders
        await act(async () => {
            expect(
                await result.current.processChronikWsMsg(
                    mockWebsocketMsg,
                    result.current.cashtabState,
                    result.current.fiatPrice,
                    true,
                ),
            ).toBe(true);
        });
    });
});

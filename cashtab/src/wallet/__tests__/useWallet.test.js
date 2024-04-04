// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import useWallet from 'wallet/useWallet';
import { renderHook, waitFor, act } from '@testing-library/react';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
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
import aliasSettings from 'config/alias';
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
            expect(result.current.cashtabState.settings).toEqual(
                cashtabSettingsGbp,
            ),
        );
        await waitFor(() =>
            expect(result.current.cashtabState.wallets[0]).toStrictEqual(
                walletWithXecAndTokens,
            ),
        );
    });
    it('processChronikWsMsg() refreshes alias prices when aliasPrices is null', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        const { result } = renderHook(() => useWallet(mockedChronik));
        const mockWebsocketMsg = {
            msgType: 'BLK_FINALIZED',
            blockHash:
                '0000000000000000042ceefd8937bb1eb25764c4c5a157701fddbfb552f9803f',
            blockHeight: 838989,
        };
        const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/prices`;
        const mockAliasServerResponse = {
            note: 'alias-server is in beta and these prices are not finalized.',
            prices: [
                {
                    startHeight: 823950,
                    fees: {
                        1: 558,
                        2: 557,
                        3: 556,
                        4: 555,
                        5: 554,
                        6: 553,
                        7: 552,
                        8: 551,
                        9: 551,
                        10: 551,
                        11: 551,
                        12: 551,
                        13: 551,
                        14: 551,
                        15: 551,
                        16: 551,
                        17: 551,
                        18: 551,
                        19: 551,
                        20: 551,
                        21: 551,
                    },
                },
            ],
        };

        // Mock the fetch call to alias-server's '/prices' endpoint
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(fetchUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(mockAliasServerResponse),
            });

        // Wait for the wallet to load
        await waitFor(() =>
            expect(result.current.cashtabState.wallets[0]).toStrictEqual(
                walletWithXecAndTokens,
            ),
        );

        await act(async () => {
            await result.current.processChronikWsMsg(
                mockWebsocketMsg,
                result.current.cashtabState,
                result.current.fiatPrice,
                true,
            );
        });

        // Verify upon `BlockConnected` events processChronikWsMsg() updates the aliasPrices state var
        expect(result.current.aliasPrices).toStrictEqual(
            mockAliasServerResponse,
        );
    });

    it('processChronikWsMsg() refreshes alias prices when aliasPrices exists, server and cashtab prices array length do not match', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        const { result } = renderHook(() => useWallet(mockedChronik));
        const mockWebsocketMsg = {
            msgType: 'BLK_FINALIZED',
            blockHash:
                '0000000000000000042ceefd8937bb1eb25764c4c5a157701fddbfb552f9803f',
            blockHeight: 838989,
        };
        const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/prices`;
        const mockExistingAliasPrices = {
            note: 'alias-server is in beta and these prices are not finalized.',
            prices: [
                {
                    startHeight: 823944,
                    fees: {
                        1: 558,
                        2: 557,
                        3: 556,
                        4: 555,
                        5: 554,
                        6: 553,
                        7: 552,
                        8: 551,
                        9: 551,
                        10: 9999999999999,
                        11: 551,
                        12: 551,
                        13: 551,
                        14: 551,
                        15: 551,
                        16: 551,
                        17: 551,
                        18: 551,
                        19: 551,
                        20: 551,
                        21: 551,
                    },
                },
            ],
        };
        const mockAliasServerResponse = {
            note: 'alias-server is in beta and these prices are not finalized.',
            prices: [
                {
                    startHeight: 823944,
                    fees: {
                        1: 558,
                        2: 557,
                        3: 556,
                        4: 555,
                        5: 554,
                        6: 553,
                        7: 552,
                        8: 551,
                        9: 551,
                        10: 9999999999999,
                        11: 551,
                        12: 551,
                        13: 551,
                        14: 551,
                        15: 551,
                        16: 551,
                        17: 551,
                        18: 551,
                        19: 551,
                        20: 551,
                        21: 551,
                    },
                },
                {
                    startHeight: 823950,
                    fees: {
                        1: 558,
                        2: 557,
                        3: 556,
                        4: 555,
                        5: 554,
                        6: 553,
                        7: 552,
                        8: 551,
                        9: 551,
                        10: 551,
                        11: 551,
                        12: 551,
                        13: 551,
                        14: 551,
                        15: 551,
                        16: 551,
                        17: 551,
                        18: 551,
                        19: 551,
                        20: 551,
                        21: 551,
                    },
                },
            ],
        };

        // Mock the existing aliasPrices state value
        result.current.setAliasPrices(mockExistingAliasPrices);

        // Mock the fetch call to alias-server's '/prices' endpoint
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(fetchUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(mockAliasServerResponse),
            });

        // Wait for the wallet to load
        await waitFor(() =>
            expect(result.current.cashtabState.wallets[0]).toStrictEqual(
                walletWithXecAndTokens,
            ),
        );

        await act(async () => {
            await result.current.processChronikWsMsg(
                mockWebsocketMsg,
                result.current.cashtabState,
                result.current.fiatPrice,
                true,
            );
        });

        // Verify upon `BlockConnected` events processChronikWsMsg() updates the aliasPrices state var
        expect(result.current.aliasPrices).toEqual(mockAliasServerResponse);
    });

    it('processChronikWsMsg() does not refresh alias prices when aliasPrices exists, server and cashtab array length do match', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        const { result } = renderHook(() => useWallet(mockedChronik));
        const mockWebsocketMsg = {
            msgType: 'BLK_FINALIZED',
            blockHash:
                '0000000000000000042ceefd8937bb1eb25764c4c5a157701fddbfb552f9803f',
            blockHeight: 838989,
        };
        const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/prices`;
        const mockExistingAliasPrices = {
            note: 'alias-server is in beta and these prices are not finalized.',
            prices: [
                {
                    // Technically, there should never be a scenario where the prices array length matches between
                    // server and cashtab and the height does not. But for the purposes of this unit test we need
                    // to validate the existing aliasPrices state var was not updated, hence this startHeight differentiation.
                    startHeight: 111111,
                    fees: {
                        1: 558,
                        2: 557,
                        3: 556,
                        4: 555,
                        5: 554,
                        6: 553,
                        7: 552,
                        8: 551,
                        9: 551,
                        10: 9999999999999,
                        11: 551,
                        12: 551,
                        13: 551,
                        14: 551,
                        15: 551,
                        16: 551,
                        17: 551,
                        18: 551,
                        19: 551,
                        20: 551,
                        21: 551,
                    },
                },
                {
                    startHeight: 823950,
                    fees: {
                        1: 558,
                        2: 557,
                        3: 556,
                        4: 555,
                        5: 554,
                        6: 553,
                        7: 552,
                        8: 551,
                        9: 551,
                        10: 551,
                        11: 551,
                        12: 551,
                        13: 551,
                        14: 551,
                        15: 551,
                        16: 551,
                        17: 551,
                        18: 551,
                        19: 551,
                        20: 551,
                        21: 551,
                    },
                },
            ],
        };
        const mockAliasServerResponse = {
            note: 'alias-server is in beta and these prices are not finalized.',
            prices: [
                {
                    startHeight: 823944,
                    fees: {
                        1: 558,
                        2: 557,
                        3: 556,
                        4: 555,
                        5: 554,
                        6: 553,
                        7: 552,
                        8: 551,
                        9: 551,
                        10: 9999999999999,
                        11: 551,
                        12: 551,
                        13: 551,
                        14: 551,
                        15: 551,
                        16: 551,
                        17: 551,
                        18: 551,
                        19: 551,
                        20: 551,
                        21: 551,
                    },
                },
                {
                    startHeight: 823950,
                    fees: {
                        1: 558,
                        2: 557,
                        3: 556,
                        4: 555,
                        5: 554,
                        6: 553,
                        7: 552,
                        8: 551,
                        9: 551,
                        10: 551,
                        11: 551,
                        12: 551,
                        13: 551,
                        14: 551,
                        15: 551,
                        16: 551,
                        17: 551,
                        18: 551,
                        19: 551,
                        20: 551,
                        21: 551,
                    },
                },
            ],
        };

        // Wait for the wallet to load
        await waitFor(() =>
            expect(result.current.cashtabState.wallets[0]).toStrictEqual(
                walletWithXecAndTokens,
            ),
        );

        // Mock the existing aliasPrices state value
        await act(async () => {
            result.current.setAliasPrices(mockExistingAliasPrices);
        });

        // Mock the fetch call to alias-server's '/prices' endpoint
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(fetchUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(mockAliasServerResponse),
            });

        await act(async () => {
            await result.current.processChronikWsMsg(
                mockWebsocketMsg,
                result.current.cashtabState,
                result.current.fiatPrice,
                true,
            );
        });

        // Verify upon `BlockConnected` events processChronikWsMsg() does not update the aliasPrices state var
        expect(result.current.aliasPrices).toStrictEqual(
            mockExistingAliasPrices,
        );
    });

    it('Verify a processChronikWsMsg() new block event updates the `aliasServerError` state var upon a /prices/ endpoint error', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        const { result } = renderHook(() => useWallet(mockedChronik));
        const mockWebsocketMsg = {
            msgType: 'BLK_FINALIZED',
            blockHash:
                '0000000000000000042ceefd8937bb1eb25764c4c5a157701fddbfb552f9803f',
            blockHeight: 838989,
        };
        const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/prices`;
        const expectedError = 'Invalid response from alias prices endpoint';

        // Mock the fetch call to alias-server's '/prices' endpoint
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(fetchUrl)
            .mockResolvedValue({
                json: () => Promise.resolve('not a valid prices response'),
            });

        // Wait for the wallet to load
        await waitFor(() =>
            expect(result.current.cashtabState.wallets[0]).toStrictEqual(
                walletWithXecAndTokens,
            ),
        );

        await act(async () => {
            await result.current.processChronikWsMsg(
                mockWebsocketMsg,
                result.current.cashtabState,
                result.current.fiatPrice,
                true,
            );
        });

        // Verify the `aliasServerError` state var in useWallet is updated
        expect(result.current.aliasServerError).toStrictEqual(
            new Error(expectedError),
        );
    });

    it('Verify refreshAliases() updates the `aliases` state variable on a successful /address/ endpoint response', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        const { result } = renderHook(() => useWallet(mockedChronik));
        const address = 'ecash:qzth8qvakhr6y8zcefdrvx30zrdmt2z2gvp7zc5vj8';
        const endPoint = 'address';
        const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/${endPoint}/${address}`;
        const mockAliasServerResponse = {
            registered: [
                {
                    alias: 'john',
                    address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                    txid: 'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d',
                    blockheight: 792417,
                },
                {
                    alias: 'jane',
                    address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                    txid: '0c77e4f7e0ff4f1028372042cbeb97eaddb64d505efe960b5a1ca4fce65598e2',
                    blockheight: 792418,
                },
            ],
            pending: [],
        };

        // Mock the fetch call to alias-server's '/address' endpoint
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(fetchUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(mockAliasServerResponse),
            });

        // Wait for the wallet to load
        await waitFor(() =>
            expect(result.current.cashtabState.wallets[0]).toStrictEqual(
                walletWithXecAndTokens,
            ),
        );

        // Execute the refreshAliases function with the mocked alias-server call
        await act(async () => {
            await result.current.refreshAliases(address);
        });

        // Verify the `aliases` state var in useWallet is updated
        expect(result.current.aliases).toStrictEqual(mockAliasServerResponse);
    });

    it('Verify refreshAliases() updates the `aliasServerError` state variable upon an /address/ endpoint error', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        const { result } = renderHook(() => useWallet(mockedChronik));
        const address = 'ecash:qzth8qvakhr6y8zcefdrvx30zrdmt2z2gvp7zc5vj8';
        const endPoint = 'address';
        const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/${endPoint}/${address}`;
        const expectedError = {
            error: 'Error: Unable to retrieve aliases',
        };

        // Mock the fetch call to alias-server's '/address' endpoint
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(fetchUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(expectedError),
            });

        // Wait for the wallet to load
        await waitFor(() =>
            expect(result.current.cashtabState.wallets[0]).toStrictEqual(
                walletWithXecAndTokens,
            ),
        );

        // Execute the refreshAliases function with the mocked alias-server call
        await act(async () => {
            await result.current.refreshAliases(address);
        });

        // Verify the `aliasServerError` state var in useWallet is updated
        expect(result.current.aliasServerError).toStrictEqual(
            expectedError.error,
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
        mockedChronik.setMock('tx', {
            input: MOCK_TXID,
            output: mockIncomingTokenTxDetails,
        });
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

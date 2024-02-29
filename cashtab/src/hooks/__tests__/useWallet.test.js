import useWallet from '../useWallet';
import { renderHook, waitFor, act } from '@testing-library/react';
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
import aliasSettings from 'config/alias';
import mockLegacyWallets from '../__mocks__/mockLegacyWallets';

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
    it('Migrating legacy wallet on mainnet', async () => {
        const { result } = renderHook(() => useWallet());
        result.current.getWallet = false;

        let wallet;
        await act(async () => {
            wallet = await result.current.migrateLegacyWallet(
                mockLegacyWallets.legacyAlphaMainnet,
            );
        });
        expect(wallet).toStrictEqual(
            mockLegacyWallets.migratedLegacyAlphaMainnet,
        );
    });

    it('processChronikWsMsg() refreshes alias prices when aliasPrices is null', async () => {
        const { result } = renderHook(() => useWallet());
        const mockWebsocketMsg = { type: 'BlockConnected' };
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

        await act(async () => {
            await result.current.processChronikWsMsg(mockWebsocketMsg);
        });

        // Verify upon `BlockConnected` events processChronikWsMsg() updates the aliasPrices state var
        expect(result.current.aliasPrices).toStrictEqual(
            mockAliasServerResponse,
        );
    });

    it('processChronikWsMsg() refreshes alias prices when aliasPrices exists, server and cashtab prices array length do not match', async () => {
        const { result } = renderHook(() => useWallet());
        const mockWebsocketMsg = { type: 'BlockConnected' };
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

        await act(async () => {
            await result.current.processChronikWsMsg(mockWebsocketMsg);
        });

        // Verify upon `BlockConnected` events processChronikWsMsg() updates the aliasPrices state var
        expect(result.current.aliasPrices).toEqual(mockAliasServerResponse);
    });

    it('processChronikWsMsg() does not refresh alias prices when aliasPrices exists, server and cashtab array length do match', async () => {
        const { result } = renderHook(() => useWallet());
        const mockWebsocketMsg = { type: 'BlockConnected' };
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
            await result.current.processChronikWsMsg(mockWebsocketMsg);
        });

        // Verify upon `BlockConnected` events processChronikWsMsg() does not update the aliasPrices state var
        expect(result.current.aliasPrices).toStrictEqual(
            mockExistingAliasPrices,
        );
    });

    it('Verify a processChronikWsMsg() new block event updates the `aliasServerError` state var upon a /prices/ endpoint error', async () => {
        const { result } = renderHook(() => useWallet());
        const mockWebsocketMsg = { type: 'BlockConnected' };
        const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/prices`;
        const expectedError = 'Invalid response from alias prices endpoint';

        // Mock the fetch call to alias-server's '/prices' endpoint
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(fetchUrl)
            .mockResolvedValue({
                json: () => Promise.resolve('not a valid prices response'),
            });

        await act(async () => {
            await result.current.processChronikWsMsg(mockWebsocketMsg);
        });

        // Verify the `aliasServerError` state var in useWallet is updated
        expect(result.current.aliasServerError).toStrictEqual(
            new Error(expectedError),
        );
    });

    it('Verify refreshAliases() updates the `aliases` state variable on a successful /address/ endpoint response', async () => {
        const { result } = renderHook(() => useWallet());
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

        // Execute the refreshAliases function with the mocked alias-server call
        await act(async () => {
            await result.current.refreshAliases(address);
        });

        // Verify the `aliases` state var in useWallet is updated
        expect(result.current.aliases).toStrictEqual(mockAliasServerResponse);
    });

    it('Verify refreshAliases() updates the `aliasServerError` state variable upon an /address/ endpoint error', async () => {
        const { result } = renderHook(() => useWallet());
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

        // Execute the refreshAliases function with the mocked alias-server call
        await act(async () => {
            await result.current.refreshAliases(address);
        });

        // Verify the `aliasServerError` state var in useWallet is updated
        expect(result.current.aliasServerError).toStrictEqual(
            expectedError.error,
        );
    });
});

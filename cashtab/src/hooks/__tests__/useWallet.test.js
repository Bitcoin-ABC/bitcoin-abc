import useWallet from '../useWallet';
import { renderHook, act } from '@testing-library/react';
import mockLegacyWallets from '../__mocks__/mockLegacyWallets';
import aliasSettings from 'config/alias';
import { when } from 'jest-when';

describe('useWallet hook', () => {
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

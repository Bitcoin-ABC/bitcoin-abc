// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    organizeUtxosByType,
    flattenChronikTxHistory,
    sortAndTrimChronikTxHistory,
    parseTx,
    getMintAddress,
    getTokenGenesisInfo,
    getTokenBalances,
    getHistory,
    getUtxos,
} from 'chronik';
import vectors from '../fixtures/vectors';
import {
    mockTxHistoryOfAllAddresses,
    mockFlatTxHistoryNoUnconfirmed,
    chronikTokenMocks,
    mockLargeTokenCache,
    chronikSlpUtxos,
    keyValueBalanceArray,
    mockTxHistoryWalletJson,
    mockPath1899History,
    mockPath145History,
    mockTxHistoryTokenCache,
    tokensInHistory,
    expectedParsedTxHistory,
    noCachedInfoParsedTxHistory,
} from '../fixtures/mocks';
import {
    mintingTxTabCash,
    mintingAddressTabCash,
    mintingTxPoW,
    mintingAddressPoW,
    mintingTxAlita,
    mintingAddressAlita,
    mintingAddressBuxSelfMint,
    mintingTxBuxSelfMint,
} from '../fixtures/chronikMintTxs';
import { cashtabWalletFromJSON } from 'helpers';
import { ChronikClient } from 'chronik-client';
import { when } from 'jest-when';
import { MockChronikClient } from '../../../../modules/mock-chronik-client';
import CashtabCache from 'config/CashtabCache';

describe('Cashtab chronik.js functions', () => {
    it(`flattenChronikTxHistory successfully combines the result of getHistory into a single array`, async () => {
        expect(
            await flattenChronikTxHistory(mockTxHistoryOfAllAddresses),
        ).toStrictEqual(mockFlatTxHistoryNoUnconfirmed);
    });
    it(`getMintAddress successfully parses chronik.tx response to determine mint address for TabCash token`, async () => {
        // Initialize chronik
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );

        chronik.tx = jest.fn();

        when(chronik.tx)
            .calledWith(mintingTxTabCash.txid)
            .mockResolvedValue(mintingTxTabCash);

        expect(await getMintAddress(chronik, mintingTxTabCash.txid)).toBe(
            mintingAddressTabCash,
        );
    });
    it(`getMintAddress successfully parses chronik.tx response to determine mint address for PoW token`, async () => {
        // Initialize chronik
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );

        chronik.tx = jest.fn();

        when(chronik.tx)
            .calledWith(mintingTxPoW.txid)
            .mockResolvedValue(mintingTxPoW);

        expect(await getMintAddress(chronik, mintingTxPoW.txid)).toBe(
            mintingAddressPoW,
        );
    });
    it(`getMintAddress successfully parses chronik.tx response to determine mint address for Alita token`, async () => {
        // Initialize chronik
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );

        chronik.tx = jest.fn();

        when(chronik.tx)
            .calledWith(mintingTxAlita.txid)
            .mockResolvedValue(mintingTxAlita);

        expect(await getMintAddress(chronik, mintingTxAlita.txid)).toBe(
            mintingAddressAlita,
        );
    });
    it(`getMintAddress successfully parses chronik.tx response to determine mint address for a BUX self minted token`, async () => {
        // Initialize chronik
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );

        chronik.tx = jest.fn();

        when(chronik.tx)
            .calledWith(mintingTxBuxSelfMint.txid)
            .mockResolvedValue(mintingTxBuxSelfMint);

        expect(await getMintAddress(chronik, mintingTxBuxSelfMint.txid)).toBe(
            mintingAddressBuxSelfMint,
        );
    });
    describe('Parses supported tx types', () => {
        const { expectedReturns } = vectors.parseTx;
        expectedReturns.forEach(expectedReturn => {
            const { description, tx, wallet, cachedTokens, parsed } =
                expectedReturn;
            it(`parseTx: ${description}`, () => {
                expect(parseTx(tx, wallet, cachedTokens)).toStrictEqual(parsed);
            });
        });
    });
    describe('Sorts and trims chronik tx history', () => {
        const { expectedReturns } = vectors.sortAndTrimChronikTxHistory;
        expectedReturns.forEach(expectedReturn => {
            const {
                description,
                flatTxHistoryArray,
                txHistoryCount,
                returned,
            } = expectedReturn;
            it(`sortAndTrimChronikTxHistory: ${description}`, () => {
                expect(
                    sortAndTrimChronikTxHistory(
                        flatTxHistoryArray,
                        txHistoryCount,
                    ),
                ).toStrictEqual(returned);
            });
        });
    });
    describe('Separates SLP and non-SLP utxos', () => {
        const { expectedReturns } = vectors.organizeUtxosByType;
        expectedReturns.forEach(expectedReturn => {
            const { description, chronikUtxos, returned } = expectedReturn;
            it(`organizeUtxosByType: ${description}`, () => {
                expect(organizeUtxosByType(chronikUtxos)).toStrictEqual(
                    returned,
                );
            });
        });
    });
    describe('We get info we want to cache about a token from its genesis tx and chronik token info endpoint', () => {
        const { expectedReturns, expectedErrors } = vectors.getTokenGenesisInfo;

        expectedReturns.forEach(expectedReturn => {
            const { description, tokenId, tokenInfo, genesisTx, returned } =
                expectedReturn;
            const mockedChronik = new MockChronikClient();

            // Set mock for chronik.token(tokenId)
            mockedChronik.setMock('token', {
                input: tokenId,
                output: tokenInfo,
            });

            // Set mock for chronik.tx(tokenId)
            mockedChronik.setMock('tx', {
                input: tokenId,
                output: genesisTx,
            });

            it(`getTokenGenesisInfo: ${description}`, async () => {
                expect(
                    await getTokenGenesisInfo(mockedChronik, tokenId),
                ).toStrictEqual(returned);
            });
        });

        expectedErrors.forEach(expectedReturn => {
            const { description, tokenId, tokenInfo, genesisTx, msg } =
                expectedReturn;
            const mockedChronik = new MockChronikClient();

            // Set mock for chronik.token(tokenId)
            mockedChronik.setMock('token', {
                input: tokenId,
                output: tokenInfo,
            });

            // Set mock for chronik.tx(tokenId)
            mockedChronik.setMock('tx', {
                input: tokenId,
                output: genesisTx,
            });

            it(`getTokenGenesisInfo: ${description}`, async () => {
                await expect(
                    getTokenGenesisInfo(mockedChronik, tokenId),
                ).rejects.toEqual(msg);
            });
        });
    });
    it('We can get token balance from a large token utxo set and update the cache', async () => {
        // Mock the endpoints that will be called in updating the cache during getTokenBalances
        const tokenIds = Object.keys(chronikTokenMocks);
        const mockedChronik = new MockChronikClient();
        for (const tokenId of tokenIds) {
            const { token, tx } = chronikTokenMocks[tokenId];
            // Set mock for chronik.token(tokenId)
            mockedChronik.setMock('token', {
                input: tokenId,
                output: token,
            });

            // Set mock for chronik.tx(tokenId)
            mockedChronik.setMock('tx', {
                input: tokenId,
                output: tx,
            });
        }

        // Initialize an empty token cache
        const tokenCache = new CashtabCache().tokens;

        // Get token balances
        const tokenBalances = await getTokenBalances(
            mockedChronik,
            chronikSlpUtxos,
            tokenCache,
        );

        // Expect cache is updated
        expect(tokenCache).toStrictEqual(mockLargeTokenCache);

        // Expect correct balances
        expect(tokenBalances).toStrictEqual(new Map(keyValueBalanceArray));
    });
    it('We can get token balance form a large token utxo set that includes a utxo of unknown tokenId and update the cache', async () => {
        // Mock the endpoints that will be called in updating the cache during getTokenBalances
        const tokenIds = Object.keys(chronikTokenMocks);
        const mockedChronik = new MockChronikClient();
        for (const tokenId of tokenIds) {
            const { token, tx } = chronikTokenMocks[tokenId];
            // Set mock for chronik.token(tokenId)
            mockedChronik.setMock('token', {
                input: tokenId,
                output: token,
            });

            // Set mock for chronik.tx(tokenId)
            mockedChronik.setMock('tx', {
                input: tokenId,
                output: tx,
            });
        }

        // Initialize an empty token cache
        const tokenCache = new CashtabCache().tokens;

        // Get token balances
        const tokenBalances = await getTokenBalances(
            mockedChronik,
            [
                ...chronikSlpUtxos,
                {
                    outpoint: {
                        txid: '74a8598eed00672e211553a69e22334128199883fe79eb4ad64f9c0b7909735c',
                        outIdx: 1,
                    },
                    blockHeight: 836457,
                    isCoinbase: false,
                    value: 1000,
                    isFinal: true,
                    token: {
                        tokenId:
                            '0000000000000000000000000000000000000000000000000000000000000000',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_UNKNOWN',
                            number: 255,
                        },
                        amount: '0',
                        isMintBaton: false,
                    },
                    path: 1899,
                },
            ],
            tokenCache,
        );

        // Expect cache is updated
        expect(tokenCache).toStrictEqual(mockLargeTokenCache);

        // Expect correct balances, including a 0 balance for the unknown token id
        expect(tokenBalances).toStrictEqual(
            new Map([
                ...keyValueBalanceArray,
                [
                    '0000000000000000000000000000000000000000000000000000000000000000',
                    '0',
                ],
            ]),
        );
    });
    it('We can get utxos from multiple paths and tag each one with its path', async () => {
        // Make all of your chronik mocks

        // Revive JSON wallet
        const mockTxHistoryWallet = cashtabWalletFromJSON(
            mockTxHistoryWalletJson,
        );

        const defaultAddress = mockTxHistoryWallet.paths.get(1899).address;
        const secondaryAddress = mockTxHistoryWallet.paths.get(145).address;

        // Set tx history for all paths
        const mockedChronik = new MockChronikClient();
        mockedChronik.setAddress(defaultAddress);
        mockedChronik.setUtxosByAddress(defaultAddress, {
            outputScript: 'string',
            utxos: [{ value: 546 }],
        });
        mockedChronik.setAddress(secondaryAddress);
        mockedChronik.setUtxosByAddress(secondaryAddress, {
            outputScript: 'string',
            utxos: [{ value: 546 }],
        });
        expect(
            await getUtxos(mockedChronik, mockTxHistoryWallet),
        ).toStrictEqual([
            { value: 546, path: 1899 },
            { value: 546, path: 145 },
        ]);
    });
    it('We can get and parse tx history from a multi-path wallet, and update the token cache at the same time', async () => {
        // Make all of your chronik mocks
        const tokenIds = Object.keys(tokensInHistory);
        const mockedChronik = new MockChronikClient();
        for (const tokenId of tokenIds) {
            const { token, tx } = tokensInHistory[tokenId];
            // Set mock for chronik.token(tokenId)
            mockedChronik.setMock('token', {
                input: tokenId,
                output: token,
            });

            // Set mock for chronik.tx(tokenId)
            mockedChronik.setMock('tx', {
                input: tokenId,
                output: tx,
            });
        }

        // Revive JSON wallet
        const mockTxHistoryWallet = cashtabWalletFromJSON(
            mockTxHistoryWalletJson,
        );

        const defaultAddress = mockTxHistoryWallet.paths.get(1899).address;
        const secondaryAddress = mockTxHistoryWallet.paths.get(145).address;

        // Set tx history for all paths
        mockedChronik.setAddress(defaultAddress);
        mockedChronik.setTxHistoryByAddress(
            defaultAddress,
            mockPath1899History,
        );
        mockedChronik.setAddress(secondaryAddress);
        mockedChronik.setTxHistoryByAddress(
            secondaryAddress,
            mockPath145History,
        );

        // Initialize an empty token cache
        const tokenCache = new CashtabCache().tokens;

        // Get token balances
        const parsedTxHistory = await getHistory(
            mockedChronik,
            mockTxHistoryWallet,
            tokenCache,
        );

        // Expect cache is updated
        expect(tokenCache).toStrictEqual(mockTxHistoryTokenCache);

        // Expect correct tx history
        expect(parsedTxHistory).toStrictEqual(expectedParsedTxHistory);
    });
    describe('We can get and parse tx history from a multi-path wallet. If there is an error in getting cached token data, we still parse tx history.', () => {
        // Make all of your chronik mocks
        const tokenIds = Object.keys(tokensInHistory);
        const mockedChronik = new MockChronikClient();
        for (const tokenId of tokenIds) {
            // Mock an error in getting cached token info
            mockedChronik.setMock('token', {
                input: tokenId,
                output: new Error('Some chronik error'),
            });
        }

        // Revive JSON wallet
        const mockTxHistoryWallet = cashtabWalletFromJSON(
            mockTxHistoryWalletJson,
        );

        const defaultAddress = mockTxHistoryWallet.paths.get(1899).address;
        const secondaryAddress = mockTxHistoryWallet.paths.get(145).address;

        // Set tx history for all paths
        mockedChronik.setAddress(defaultAddress);
        mockedChronik.setTxHistoryByAddress(
            defaultAddress,
            mockPath1899History,
        );
        mockedChronik.setAddress(secondaryAddress);
        mockedChronik.setTxHistoryByAddress(
            secondaryAddress,
            mockPath145History,
        );

        it(`We add to token cache and get parsed tx history`, async () => {
            // Initialize an empty token cache
            const tokenCache = new CashtabCache().tokens;

            // Get token balances
            const parsedTxHistory = await getHistory(
                mockedChronik,
                mockTxHistoryWallet,
                tokenCache,
            );

            // Expect cache is unchanged
            expect(tokenCache).toStrictEqual(new CashtabCache().tokens);

            // Expect correct tx history
            expect(parsedTxHistory).toStrictEqual(noCachedInfoParsedTxHistory);
        });
    });
});

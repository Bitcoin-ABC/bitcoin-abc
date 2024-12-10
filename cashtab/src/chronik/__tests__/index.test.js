// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    organizeUtxosByType,
    flattenChronikTxHistory,
    sortAndTrimChronikTxHistory,
    parseTx,
    getTokenGenesisInfo,
    getTokenBalances,
    getHistory,
    getUtxos,
    getAllTxHistoryByTokenId,
    getChildNftsFromParent,
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
    NftParentGenesisTx,
    NftChildGenesisTx,
} from '../fixtures/mocks';
import { cashtabWalletFromJSON } from 'helpers';
import { MockChronikClient } from '../../../../modules/mock-chronik-client';
import CashtabCache from 'config/CashtabCache';

describe('Cashtab chronik.js functions', () => {
    it(`flattenChronikTxHistory successfully combines the result of getHistory into a single array`, async () => {
        expect(
            await flattenChronikTxHistory(mockTxHistoryOfAllAddresses),
        ).toStrictEqual(mockFlatTxHistoryNoUnconfirmed);
    });
    describe('Parses supported tx types', () => {
        const { expectedReturns } = vectors.parseTx;
        expectedReturns.forEach(expectedReturn => {
            const { description, tx, hashes, parsed } = expectedReturn;
            it(`parseTx: ${description}`, () => {
                expect(parseTx(tx, hashes)).toStrictEqual(parsed);
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
            mockedChronik.setToken(tokenId, tokenInfo);

            // Set mock for chronik.tx(tokenId)
            mockedChronik.setTx(tokenId, genesisTx);

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
            mockedChronik.setToken(tokenId, tokenInfo);

            // Set mock for chronik.tx(tokenId)
            mockedChronik.setTx(tokenId, genesisTx);

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
            mockedChronik.setToken(tokenId, token);

            // Set mock for chronik.tx(tokenId)
            mockedChronik.setTx(tokenId, tx);
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
            mockedChronik.setToken(tokenId, token);

            // Set mock for chronik.tx(tokenId)
            mockedChronik.setTx(tokenId, tx);
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
        mockedChronik.setUtxosByAddress(defaultAddress, [{ value: 546 }]);
        mockedChronik.setUtxosByAddress(secondaryAddress, [{ value: 546 }]);
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
            mockedChronik.setToken(tokenId, token);

            // Set mock for chronik.tx(tokenId)
            mockedChronik.setTx(tokenId, tx);
        }

        // Revive JSON wallet
        const mockTxHistoryWallet = cashtabWalletFromJSON(
            mockTxHistoryWalletJson,
        );

        const defaultAddress = mockTxHistoryWallet.paths.get(1899).address;
        const secondaryAddress = mockTxHistoryWallet.paths.get(145).address;

        // Set tx history for all paths
        mockedChronik.setTxHistoryByAddress(
            defaultAddress,
            mockPath1899History,
        );
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
            mockedChronik.setToken(tokenId, new Error('Some chronik error'));
        }

        // Revive JSON wallet
        const mockTxHistoryWallet = cashtabWalletFromJSON(
            mockTxHistoryWalletJson,
        );

        const defaultAddress = mockTxHistoryWallet.paths.get(1899).address;
        const secondaryAddress = mockTxHistoryWallet.paths.get(145).address;

        // Set tx history for all paths
        mockedChronik.setTxHistoryByAddress(
            defaultAddress,
            mockPath1899History,
        );
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
    describe('We can get tx history by tokenId', () => {
        it('We can get tx history if total txs are less than one page', async () => {
            // Initialize chronik mock with history info
            const mockedChronik = new MockChronikClient();
            const tokenId =
                '1111111111111111111111111111111111111111111111111111111111111111';
            mockedChronik.setTxHistoryByTokenId(tokenId, [
                { txid: 'deadbeef' },
            ]);
            expect(
                await getAllTxHistoryByTokenId(mockedChronik, tokenId),
            ).toStrictEqual([{ txid: 'deadbeef' }]);
        });
        it('We can get tx history if we need to fetch multiple pages', async () => {
            // Initialize chronik mock with history info
            const mockedChronik = new MockChronikClient();
            const tokenId =
                '1111111111111111111111111111111111111111111111111111111111111111';
            mockedChronik.setTxHistoryByTokenId(
                tokenId,
                [
                    { txid: 'deadbeef' },
                    { txid: 'deadbeef' },
                    { txid: 'deadbeef' },
                ],
                1,
            );
            expect(
                await getAllTxHistoryByTokenId(mockedChronik, tokenId),
            ).toStrictEqual([
                { txid: 'deadbeef' },
                { txid: 'deadbeef' },
                { txid: 'deadbeef' },
            ]);
        });
        it('We get an empty array if the token has no tx history', async () => {
            // Initialize chronik mock with history info
            const mockedChronik = new MockChronikClient();
            const tokenId =
                '1111111111111111111111111111111111111111111111111111111111111111';
            mockedChronik.setTxHistoryByTokenId(tokenId, []);
            expect(
                await getAllTxHistoryByTokenId(mockedChronik, tokenId),
            ).toStrictEqual([]);
        });
    });
    describe('We can get NFTs from the tx history of an NFT Parent tokenId', () => {
        const PARENT_TOKENID =
            '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3';
        it('We return an empty array if history includes only the parent genesis tx', () => {
            expect(
                getChildNftsFromParent(PARENT_TOKENID, [NftParentGenesisTx]),
            ).toStrictEqual([]);
        });
        it('We return an NFT if history includes NFT and parent genesis tx', () => {
            expect(
                getChildNftsFromParent(PARENT_TOKENID, [
                    NftChildGenesisTx,
                    NftParentGenesisTx,
                ]),
            ).toStrictEqual([NftChildGenesisTx.tokenEntries[0].tokenId]);
        });
        it('We return multiple NFTs if history includes them', () => {
            expect(
                getChildNftsFromParent(PARENT_TOKENID, [
                    NftChildGenesisTx,
                    {
                        ...NftChildGenesisTx,
                        tokenEntries: [
                            {
                                ...NftChildGenesisTx.tokenEntries[0],
                                tokenId:
                                    '2222222222222222222222222222222222222222222222222222222222222222',
                            },
                        ],
                    },
                    NftParentGenesisTx,
                ]),
            ).toStrictEqual([
                NftChildGenesisTx.tokenEntries[0].tokenId,
                '2222222222222222222222222222222222222222222222222222222222222222',
            ]);
        });
    });
});

// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    organizeUtxosByType,
    parseTx,
    getTxNotificationMsg,
    getTokenGenesisInfo,
    getTokenBalances,
    getTransactionHistory,
    getAllTxHistoryByTokenId,
    getChildNftsFromParent,
} from 'chronik';
import vectors from '../fixtures/vectors';
import {
    chronikTokenMocks,
    mockLargeTokenCache,
    chronikSlpUtxos,
    keyValueBalanceArray,
    mockTxHistoryWalletJson,
    mockPath1899History,
    mockTxHistoryTokenCache,
    tokensInHistory,
    expectedParsedTxHistory,
    noCachedInfoParsedTxHistory,
    NftParentGenesisTx,
    NftChildGenesisTx,
} from '../fixtures/mocks';
import { MockChronikClient } from '../../../../modules/mock-chronik-client';
import CashtabCache from 'config/CashtabCache';

describe('Cashtab chronik.js functions', () => {
    describe('Parses supported tx types', () => {
        const { expectedReturns } = vectors.parseTx;
        expectedReturns.forEach(expectedReturn => {
            const { description, tx, hashes, parsed } = expectedReturn;
            it(`parseTx: ${description}`, () => {
                expect(parseTx(tx, hashes)).toStrictEqual(parsed);
            });
        });
    });
    describe('Gets expected notification msg string', () => {
        const { expectedReturns } = vectors.getTxNotificationMsg;
        expectedReturns.forEach(expectedReturn => {
            const {
                description,
                parsedTx,
                fiatPrice,
                userLocale,
                selectedFiatTicker,
                genesisInfo,
                returned,
            } = expectedReturn;
            it(`getTxNotificationMsg: ${description}`, () => {
                expect(
                    getTxNotificationMsg(
                        parsedTx,
                        fiatPrice,
                        userLocale,
                        selectedFiatTicker,
                        genesisInfo,
                    ),
                ).toEqual(returned);
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
                    sats: 1000n,
                    isFinal: true,
                    token: {
                        tokenId:
                            '0000000000000000000000000000000000000000000000000000000000000000',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_UNKNOWN',
                            number: 255,
                        },
                        atoms: 0n,
                        isMintBaton: false,
                    },
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
    it('We can get and parse tx history from path 1899, and update the token cache at the same time', async () => {
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
        const mockTxHistoryWallet = mockTxHistoryWalletJson;

        const defaultAddress = mockTxHistoryWallet.address;

        // Set tx history for path 1899 only
        mockedChronik.setTxHistoryByAddress(
            defaultAddress,
            mockPath1899History,
        );

        // Initialize an empty token cache
        const tokenCache = new CashtabCache().tokens;

        // Get token balances
        const result = await getTransactionHistory(
            mockedChronik,
            defaultAddress,
            tokenCache,
        );
        const parsedTxHistory = result.txs;

        // Expect cache is updated
        expect(tokenCache).toStrictEqual(mockTxHistoryTokenCache);

        // Expect correct tx history (only from path 1899)
        expect(parsedTxHistory).toStrictEqual(expectedParsedTxHistory);
    });
    describe('We can get and parse tx history from path 1899. If there is an error in getting cached token data, we still parse tx history.', () => {
        // Make all of your chronik mocks
        const tokenIds = Object.keys(tokensInHistory);
        const mockedChronik = new MockChronikClient();
        for (const tokenId of tokenIds) {
            // Mock an error in getting cached token info
            mockedChronik.setToken(tokenId, new Error('Some chronik error'));
        }

        // Revive JSON wallet
        const mockTxHistoryWallet = mockTxHistoryWalletJson;

        const defaultAddress = mockTxHistoryWallet.address;

        // Set tx history for path 1899 only
        mockedChronik.setTxHistoryByAddress(
            defaultAddress,
            mockPath1899History,
        );

        it(`We add to token cache and get parsed tx history`, async () => {
            // Initialize an empty token cache
            const tokenCache = new CashtabCache().tokens;

            // Get token balances
            const result = await getTransactionHistory(
                mockedChronik,
                defaultAddress,
                tokenCache,
            );
            const parsedTxHistory = result.txs;

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

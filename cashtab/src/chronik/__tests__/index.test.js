// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    organizeUtxosByType,
    getPreliminaryTokensArray,
    finalizeTokensArray,
    getTokenStats,
    flattenChronikTxHistory,
    sortAndTrimChronikTxHistory,
    parseChronikTx,
    getMintAddress,
} from 'chronik';
import vectors from '../fixtures/vectors';
import {
    mockOrganizedUtxosByType,
    mockPreliminaryTokensArray,
    mockPreliminaryTokensArrayClone,
    mockPreliminaryTokensArrayCloneClone,
    mockChronikTxDetailsResponses,
    mockFinalTokenArray,
    mockFinalCachedTokenInfo,
    mockPartialCachedTokenInfo,
    mockPartialChronikTxDetailsResponses,
} from '../fixtures/chronikUtxos';
import { mockChronikTokenResponse } from '../fixtures/mockChronikTokenStats';
import {
    mockTxHistoryOfAllAddresses,
    mockFlatTxHistoryNoUnconfirmed,
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
import { ChronikClient } from 'chronik-client';
import { when } from 'jest-when';

describe('Cashtab chronik.js functions', () => {
    it(`getTokenStats successfully returns a token stats object`, async () => {
        // Initialize chronik
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );
        const tokenId =
            'bb8e9f685a06a2071d82f757ce19201b4c8e5e96fbe186960a3d65aec83eab20';
        /*
        Mock the API response from chronik.token('tokenId') called
        in getTokenStats()
    */
        chronik.token = jest.fn();
        when(chronik.token)
            .calledWith(tokenId)
            .mockResolvedValue(mockChronikTokenResponse);
        expect(await getTokenStats(chronik, tokenId)).toStrictEqual(
            mockChronikTokenResponse,
        );
    });
    it(`getPreliminaryTokensArray successfully returns an array of all tokenIds and token balances (not yet adjusted for token decimals)`, () => {
        expect(
            getPreliminaryTokensArray(mockOrganizedUtxosByType.slpUtxos),
        ).toStrictEqual(mockPreliminaryTokensArray);
    });
    it(`We will automatically cache the unknown tokenId 0000000000000000000000000000000000000000000000000000000000000000 without attempting to get its info from chronik`, async () => {
        // Initialize chronik
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );

        const MOCK_SLP_UTXOS_WITH_UNKNOWN = [
            {
                outpoint: {
                    txid: '250c93fd6bc2f1853a41d2fd1f5754a92f79f952f10ab038401be1600d5cbb88',
                    outIdx: 1,
                },
                blockHeight: 836452,
                isCoinbase: false,
                value: 546,
                isFinal: true,
                token: {
                    tokenId:
                        '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    amount: '1000000',
                    isMintBaton: false,
                },
                address: 'ecash:qqq9f9z3uhpzkxrgdjkd7dxuuey7tmpmugpmnw0kue',
            },
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
                address: 'ecash:qqq9f9z3uhpzkxrgdjkd7dxuuey7tmpmugpmnw0kue',
            },
        ];

        // Get preliminary token utxos
        const preliminaryTokensArray = getPreliminaryTokensArray(
            MOCK_SLP_UTXOS_WITH_UNKNOWN,
        );

        // Expected mock token cache after calling finalizeTokensArray
        const UNKNOWN_TOKEN_ID =
            '0000000000000000000000000000000000000000000000000000000000000000';
        const KNOWN_TOKEN_ID =
            '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849';
        const mockTokens = new Map();
        mockTokens.set(KNOWN_TOKEN_ID, {
            tokenTicker: 'tCRD',
            tokenName: 'Test CRD',
            url: 'https://crd.network/tcrd',
            decimals: 4,
            data: {
                0: 0,
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
                6: 0,
                7: 0,
                8: 0,
            },
            authPubkey:
                '03d2dc0cea5c81593f1bfcd42763a21f5c85e7e8d053cdf990f8b383b892b72420',
        });
        mockTokens.set(UNKNOWN_TOKEN_ID, {
            decimals: 0,
            tokenName: 'Unknown Token',
            tokenTicker: 'UNKNOWN',
            url: 'N/A',
        });

        // Get finalized tokens array

        // Only mock the known tokenId api call
        chronik.token = jest.fn();

        when(chronik.token)
            .calledWith(KNOWN_TOKEN_ID)
            .mockResolvedValue({
                tokenId:
                    '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
                timeFirstSeen: '0',
                genesisInfo: {
                    tokenTicker: 'tCRD',
                    tokenName: 'Test CRD',
                    url: 'https://crd.network/tcrd',
                    decimals: 4,
                    data: {
                        0: 0,
                        1: 0,
                        2: 0,
                        3: 0,
                        4: 0,
                        5: 0,
                        6: 0,
                        7: 0,
                        8: 0,
                    },
                    authPubkey:
                        '03d2dc0cea5c81593f1bfcd42763a21f5c85e7e8d053cdf990f8b383b892b72420',
                },
                block: {
                    height: 821187,
                    hash: '00000000000000002998aedef7c4fc2c52281e318461d66c3c9fe10151449448',
                    timestamp: 1701716369,
                },
            });

        expect(
            await finalizeTokensArray(chronik, preliminaryTokensArray),
        ).toStrictEqual({
            tokens: [
                {
                    tokenId:
                        '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
                    balance: '100',
                    info: {
                        tokenTicker: 'tCRD',
                        tokenName: 'Test CRD',
                        url: 'https://crd.network/tcrd',
                        decimals: 4,
                        data: {
                            0: 0,
                            1: 0,
                            2: 0,
                            3: 0,
                            4: 0,
                            5: 0,
                            6: 0,
                            7: 0,
                            8: 0,
                        },
                        authPubkey:
                            '03d2dc0cea5c81593f1bfcd42763a21f5c85e7e8d053cdf990f8b383b892b72420',
                    },
                },
                {
                    tokenId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    balance: '0',
                    info: {
                        decimals: 0,
                        tokenTicker: 'UNKNOWN',
                        tokenName: 'Unknown Token',
                        url: 'N/A',
                    },
                },
            ],
            cachedTokens: mockTokens,
            newTokensToCache: true,
        });
    });
    it(`finalizeTokensArray successfully returns finalTokenArray and cachedTokenInfoById even if no cachedTokenInfoById is provided`, async () => {
        // Initialize chronik
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );
        /* 
        Mock the API response from chronik.token('tokenId') called 
        in returnGetTokenInfoChronikPromise -- for each tokenId used
    */
        chronik.token = jest.fn();
        for (let i = 0; i < mockChronikTxDetailsResponses.length; i += 1) {
            when(chronik.token)
                .calledWith(mockChronikTxDetailsResponses[i].tokenId)
                .mockResolvedValue(mockChronikTxDetailsResponses[i]);
        }

        expect(
            await finalizeTokensArray(chronik, mockPreliminaryTokensArray),
        ).toStrictEqual({
            tokens: mockFinalTokenArray,
            cachedTokens: mockFinalCachedTokenInfo,
            newTokensToCache: true,
        });
    });
    it(`finalizeTokensArray successfully returns finalTokenArray and cachedTokenInfoById when called with all token info in cache`, async () => {
        // Initialize chronik
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );

        expect(
            await finalizeTokensArray(
                chronik,
                mockPreliminaryTokensArrayClone,
                mockFinalCachedTokenInfo,
            ),
        ).toStrictEqual({
            tokens: mockFinalTokenArray,
            cachedTokens: mockFinalCachedTokenInfo,
            newTokensToCache: false,
        });
    });
    it(`updateCachedTokenInfoAndFinalizeTokensArray successfully returns finalTokenArray and cachedTokenInfoById when called with some token info in cache`, async () => {
        // Initialize chronik
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );
        /* 
        Mock the API response from chronik.token('tokenId') called 
        in returnGetTokenInfoChronikPromise -- for each tokenId used
    */
        chronik.token = jest.fn();
        for (
            let i = 0;
            i < mockPartialChronikTxDetailsResponses.length;
            i += 1
        ) {
            when(chronik.token)
                .calledWith(mockPartialChronikTxDetailsResponses[i].tokenId)
                .mockResolvedValue(mockPartialChronikTxDetailsResponses[i]);
        }

        expect(
            await finalizeTokensArray(
                chronik,
                mockPreliminaryTokensArrayCloneClone,
                mockPartialCachedTokenInfo,
            ),
        ).toStrictEqual({
            tokens: mockFinalTokenArray,
            cachedTokens: mockFinalCachedTokenInfo,
            newTokensToCache: true,
        });
    });
    it(`flattenChronikTxHistory successfully combines the result of getTxHistoryChronik into a single array`, async () => {
        expect(
            await flattenChronikTxHistory(mockTxHistoryOfAllAddresses),
        ).toStrictEqual(mockFlatTxHistoryNoUnconfirmed);
    });
    it(`getMintAddress successfully parses chronik.tx response to determine mint address for TabCash token`, async () => {
        // Initialize chronik
        const chronik = new ChronikClient(
            'https://FakeChronikUrlToEnsureMocksOnly.com',
        );
        /* 
        Mock the API response from chronik.tx('tokenId') called 
        in returnGetTokenInfoChronikPromise -- for each tokenId used
    */
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
        /* 
        Mock the API response from chronik.tx('tokenId') called 
        in returnGetTokenInfoChronikPromise -- for each tokenId used
    */
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

        /* 
        Mock the API response from chronik.tx('tokenId') called 
        in returnGetTokenInfoChronikPromise -- for each tokenId used
    */
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

        /* 
        Mock the API response from chronik.tx('tokenId') called 
        in returnGetTokenInfoChronikPromise -- for each tokenId used
    */
        chronik.tx = jest.fn();

        when(chronik.tx)
            .calledWith(mintingTxBuxSelfMint.txid)
            .mockResolvedValue(mintingTxBuxSelfMint);

        expect(await getMintAddress(chronik, mintingTxBuxSelfMint.txid)).toBe(
            mintingAddressBuxSelfMint,
        );
    });
    describe('Parses supported tx types', () => {
        const { expectedReturns, expectedErrors } = vectors.parseChronikTx;
        expectedReturns.forEach(expectedReturn => {
            const { description, tx, wallet, tokenInfoById, parsed } =
                expectedReturn;
            it(`parseChronikTx: ${description}`, () => {
                expect(parseChronikTx(tx, wallet, tokenInfoById)).toStrictEqual(
                    parsed,
                );
            });
        });
        expectedErrors.forEach(expectedError => {
            const { description, tx, wallet, tokenInfoById, errorMsg } =
                expectedError;
            it(`parseChronikTx throws error for: ${description}`, () => {
                expect(() => parseChronikTx(tx, wallet, tokenInfoById)).toThrow(
                    errorMsg,
                );
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
});

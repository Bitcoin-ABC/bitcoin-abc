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

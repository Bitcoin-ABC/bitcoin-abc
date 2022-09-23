import BigNumber from 'bignumber.js';
import {
    organizeUtxosByType,
    getPreliminaryTokensArray,
    finalizeTokensArray,
    finalizeSlpUtxos,
    getTokenStats,
    flattenChronikTxHistory,
    sortAndTrimChronikTxHistory,
    parseChronikTx,
} from 'utils/chronik';
import {
    mockChronikUtxos,
    mockOrganizedUtxosByType,
    mockPreliminaryTokensArray,
    mockPreliminaryTokensArrayClone,
    mockPreliminaryTokensArrayCloneClone,
    mockChronikTxDetailsResponses,
    mockFinalTokenArray,
    mockFinalCachedTokenInfo,
    mockPartialCachedTokenInfo,
    mockPartialChronikTxDetailsResponses,
    mockPreliminarySlpUtxos,
    mockFinalizedSlpUtxos,
    mockTokenInfoById,
} from '../__mocks__/chronikUtxos';
import {
    mockChronikTokenResponse,
    mockGetTokenStatsReturn,
} from '../__mocks__/mockChronikTokenStats';
import {
    mockTxHistoryOfAllAddresses,
    mockFlatTxHistoryNoUnconfirmed,
    mockSortedTxHistoryNoUnconfirmed,
    mockFlatTxHistoryWithUnconfirmed,
    mockSortedFlatTxHistoryWithUnconfirmed,
    mockFlatTxHistoryWithAllUnconfirmed,
    mockSortedFlatTxHistoryWithAllUnconfirmed,
    lambdaHash160s,
    lambdaIncomingXecTx,
    lambdaOutgoingXecTx,
    lambdaIncomingEtokenTx,
    lambdaOutgoingEtokenTx,
} from '../__mocks__/chronikTxHistory';
import { ChronikClient } from 'chronik-client';
import { when } from 'jest-when';

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
        mockGetTokenStatsReturn,
    );
});

it(`organizeUtxosByType successfully splits a chronikUtxos array into slpUtxos and nonSlpUtxos`, () => {
    expect(organizeUtxosByType(mockChronikUtxos)).toStrictEqual(
        mockOrganizedUtxosByType,
    );

    const resultingOrganizedUtxosObject = organizeUtxosByType(mockChronikUtxos);
    const { nonSlpUtxos, preliminarySlpUtxos } = resultingOrganizedUtxosObject;
    const utxosWithUnexpectedKeys = [];
    for (let i = 0; i < nonSlpUtxos.length; i += 1) {
        // None of the objects in mockOrganizedUtxosByType.nonSlpUtxos should have the `slpToken` key
        // Note: Some may have an `slpMeta` key, if the utxo is from a token burn
        const nonSlpUtxo = nonSlpUtxos[i];
        if ('slpToken' in nonSlpUtxo) {
            console.log(`unexpected nonSlpUtxo!`, nonSlpUtxo);
            utxosWithUnexpectedKeys.push(nonSlpUtxo);
        }
    }
    for (let i = 0; i < preliminarySlpUtxos.length; i += 1) {
        // All of the objects in mockOrganizedUtxosByType.slpUtxos should have the `slpMeta` and `slpToken` keys
        const slpUtxo = preliminarySlpUtxos[i];
        if (!('slpMeta' in slpUtxo) || !('slpToken' in slpUtxo)) {
            console.log(`unexpected slpUtxo!`, slpUtxo);
            utxosWithUnexpectedKeys.push(slpUtxo);
        }
    }
    expect(utxosWithUnexpectedKeys.length).toBe(0);
    // Length of organized utxos should match original
    expect(preliminarySlpUtxos.length + nonSlpUtxos.length).toBe(
        mockChronikUtxos.length,
    );
});

it(`getPreliminaryTokensArray successfully returns an array of all tokenIds and token balances (not yet adjusted for token decimals)`, () => {
    expect(
        getPreliminaryTokensArray(mockOrganizedUtxosByType.preliminarySlpUtxos),
    ).toStrictEqual(mockPreliminaryTokensArray);
});

it(`finalizeTokensArray successfully returns finalTokenArray and cachedTokenInfoById even if no cachedTokenInfoById is provided`, async () => {
    // Initialize chronik
    const chronik = new ChronikClient(
        'https://FakeChronikUrlToEnsureMocksOnly.com',
    );
    /* 
        Mock the API response from chronik.tx('tokenId') called 
        in returnGetTokenInfoChronikPromise -- for each tokenId used
    */
    chronik.tx = jest.fn();
    for (let i = 0; i < mockChronikTxDetailsResponses.length; i += 1) {
        when(chronik.tx)
            .calledWith(mockChronikTxDetailsResponses[i].txid)
            .mockResolvedValue(mockChronikTxDetailsResponses[i]);
    }

    expect(
        await finalizeTokensArray(chronik, mockPreliminaryTokensArray),
    ).toStrictEqual({
        finalTokenArray: mockFinalTokenArray,
        updatedTokenInfoById: mockFinalCachedTokenInfo,
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
        finalTokenArray: mockFinalTokenArray,
        updatedTokenInfoById: mockFinalCachedTokenInfo,
        newTokensToCache: false,
    });
});

it(`updateCachedTokenInfoAndFinalizeTokensArray successfully returns finalTokenArray and cachedTokenInfoById when called with some token info in cache`, async () => {
    // Initialize chronik
    const chronik = new ChronikClient(
        'https://FakeChronikUrlToEnsureMocksOnly.com',
    );
    /* 
        Mock the API response from chronik.tx('tokenId') called 
        in returnGetTokenInfoChronikPromise -- for each tokenId used
    */
    chronik.tx = jest.fn();
    for (let i = 0; i < mockPartialChronikTxDetailsResponses.length; i += 1) {
        when(chronik.tx)
            .calledWith(mockPartialChronikTxDetailsResponses[i].txid)
            .mockResolvedValue(mockPartialChronikTxDetailsResponses[i]);
    }

    expect(
        await finalizeTokensArray(
            chronik,
            mockPreliminaryTokensArrayCloneClone,
            mockPartialCachedTokenInfo,
        ),
    ).toStrictEqual({
        finalTokenArray: mockFinalTokenArray,
        updatedTokenInfoById: mockFinalCachedTokenInfo,
        newTokensToCache: true,
    });
});

it(`finalizeSlpUtxos successfully adds token quantity adjusted for token decimals to preliminarySlpUtxos`, async () => {
    expect(
        await finalizeSlpUtxos(mockPreliminarySlpUtxos, mockTokenInfoById),
    ).toStrictEqual(mockFinalizedSlpUtxos);
});

it(`flattenChronikTxHistory successfully combines the result of getTxHistoryChronik into a single array`, async () => {
    expect(
        await flattenChronikTxHistory(mockTxHistoryOfAllAddresses),
    ).toStrictEqual(mockFlatTxHistoryNoUnconfirmed);
});

it(`sortAndTrimChronikTxHistory successfully orders the result of flattenChronikTxHistory by blockheight and firstSeenTime if all txs are confirmed, and returns a result of expected length`, async () => {
    expect(
        await sortAndTrimChronikTxHistory(mockFlatTxHistoryNoUnconfirmed, 10),
    ).toStrictEqual(mockSortedTxHistoryNoUnconfirmed);
});

it(`sortAndTrimChronikTxHistory successfully orders the result of flattenChronikTxHistory by blockheight and firstSeenTime if some txs are confirmed and others unconfirmed, and returns a result of expected length`, async () => {
    expect(
        await sortAndTrimChronikTxHistory(mockFlatTxHistoryWithUnconfirmed, 10),
    ).toStrictEqual(mockSortedFlatTxHistoryWithUnconfirmed);
});

it(`sortAndTrimChronikTxHistory successfully orders the result of flattenChronikTxHistory by blockheight and firstSeenTime if all txs are unconfirmed, and returns a result of expected length`, async () => {
    expect(
        await sortAndTrimChronikTxHistory(
            mockFlatTxHistoryWithAllUnconfirmed,
            10,
        ),
    ).toStrictEqual(mockSortedFlatTxHistoryWithAllUnconfirmed);
});

it(`Successfully parses an incoming XEC tx`, () => {
    expect(parseChronikTx(lambdaIncomingXecTx, lambdaHash160s)).toStrictEqual({
        incoming: true,
        xecAmount: '42',
        isEtokenTx: false,
    });
});
it(`Successfully parses an outgoing XEC tx`, () => {
    expect(parseChronikTx(lambdaOutgoingXecTx, lambdaHash160s)).toStrictEqual({
        incoming: false,
        xecAmount: '222',
        isEtokenTx: false,
    });
});
it(`Successfully parses an incoming eToken tx`, () => {
    expect(
        parseChronikTx(lambdaIncomingEtokenTx, lambdaHash160s),
    ).toStrictEqual({
        incoming: true,
        xecAmount: '5.46',
        isEtokenTx: true,
        slpMeta: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
        },
        etokenAmount: '12',
    });
});
it(`Successfully parses an outgoing eToken tx`, () => {
    expect(
        parseChronikTx(lambdaOutgoingEtokenTx, lambdaHash160s),
    ).toStrictEqual({
        incoming: false,
        xecAmount: '5.46',
        isEtokenTx: true,
        slpMeta: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
        },
        etokenAmount: '17',
    });
});

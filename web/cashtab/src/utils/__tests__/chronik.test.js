import {
    organizeUtxosByType,
    getPreliminaryTokensArray,
    finalizeTokensArray,
    finalizeSlpUtxos,
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
import { ChronikClient } from 'chronik-client';
import { when } from 'jest-when';

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

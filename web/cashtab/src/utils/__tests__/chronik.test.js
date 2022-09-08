import {
    organizeUtxosByType,
    getPreliminaryTokensArray,
    updateCachedTokenInfoAndFinalizeTokensArray,
    finalizeTokensArray,
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
} from '../__mocks__/chronikUtxos';
import { ChronikClient } from 'chronik-client';
import { when } from 'jest-when';

it(`organizeUtxosByType successfully splits a chronikUtxos array into slpUtxos and nonSlpUtxos`, () => {
    expect(organizeUtxosByType(mockChronikUtxos)).toStrictEqual(
        mockOrganizedUtxosByType,
    );

    const resultingOrganizedUtxosObject = organizeUtxosByType(mockChronikUtxos);
    const { nonSlpUtxos, slpUtxos } = resultingOrganizedUtxosObject;
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
    for (let i = 0; i < slpUtxos.length; i += 1) {
        // All of the objects in mockOrganizedUtxosByType.slpUtxos should have the `slpMeta` and `slpToken` keys
        const slpUtxo = slpUtxos[i];
        if (!('slpMeta' in slpUtxo) || !('slpToken' in slpUtxo)) {
            console.log(`unexpected slpUtxo!`, slpUtxo);
            utxosWithUnexpectedKeys.push(slpUtxo);
        }
    }
    expect(utxosWithUnexpectedKeys.length).toBe(0);
    // Length of organized utxos should match original
    expect(slpUtxos.length + nonSlpUtxos.length).toBe(mockChronikUtxos.length);
});

it(`getPreliminaryTokensArray successfully returns an array of all tokenIds and token balances (not yet adjusted for token decimals)`, () => {
    expect(
        getPreliminaryTokensArray(mockOrganizedUtxosByType.slpUtxos),
    ).toStrictEqual(mockPreliminaryTokensArray);
});

it(`finalizeTokensArray successfully returns finalTokenArray`, async () => {
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
    ).toStrictEqual(mockFinalTokenArray);
});

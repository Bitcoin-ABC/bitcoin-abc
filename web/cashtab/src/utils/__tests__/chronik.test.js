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
    mockParseTxWallet,
    lambdaIncomingXecTx,
    lambdaOutgoingXecTx,
    lambdaIncomingEtokenTx,
    lambdaOutgoingEtokenTx,
    eTokenGenesisTx,
    anotherMockParseTxWallet,
} from '../__mocks__/chronikTxHistory';
import { ChronikClient } from 'chronik-client';
import { when } from 'jest-when';
import BCHJS from '@psf/bch-js';

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
    const BCH = new BCHJS({
        restURL: 'https://FakeBchApiUrlToEnsureMocksOnly.com',
    });
    // This function needs to be mocked as bch-js functions that require Buffer types do not work in jest environment
    BCH.Address.hash160ToCash = jest
        .fn()
        .mockReturnValue(
            'bitcoincash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvll3cvjwd',
        );
    expect(
        parseChronikTx(BCH, lambdaIncomingXecTx, mockParseTxWallet),
    ).toStrictEqual({
        incoming: true,
        xecAmount: '42',
        originatingHash160: '4e532257c01b310b3b5c1fd947c79a72addf8523',
        isEtokenTx: false,
        legacy: {
            airdropFlag: false,
            airdropTokenId: '',
            amountReceived: '42',
            amountSent: 0,
            decryptionSuccess: false,
            isCashtabMessage: false,
            isEncryptedMessage: false,
            opReturnMessage: '',
            outgoingTx: false,
            replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
            tokenTx: false,
        },
    });
});
it(`Successfully parses an outgoing XEC tx`, () => {
    const BCH = new BCHJS({
        restURL: 'https://FakeBchApiUrlToEnsureMocksOnly.com',
    });
    // This function needs to be mocked as bch-js functions that require Buffer types do not work in jest environment
    BCH.Address.hash160ToCash = jest
        .fn()
        .mockReturnValue(
            'bitcoincash:qpmytrdsakt0axrrlswvaj069nat3p9s7ct4lsf8k9',
        );
    expect(
        parseChronikTx(BCH, lambdaOutgoingXecTx, mockParseTxWallet),
    ).toStrictEqual({
        incoming: false,
        xecAmount: '222',
        originatingHash160: '76458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        isEtokenTx: false,
        legacy: {
            airdropFlag: false,
            airdropTokenId: '',
            amountReceived: 0,
            amountSent: '222',
            decryptionSuccess: false,
            isCashtabMessage: false,
            isEncryptedMessage: false,
            opReturnMessage: '',
            outgoingTx: true,
            replyAddress: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            tokenTx: false,
        },
    });
});
it(`Successfully parses an incoming eToken tx`, () => {
    const BCH = new BCHJS();
    // This function needs to be mocked as bch-js functions that require Buffer types do not work in jest environment
    BCH.Address.hash160ToCash = jest
        .fn()
        .mockReturnValue(
            'bitcoincash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvll3cvjwd',
        );
    expect(
        parseChronikTx(BCH, lambdaIncomingEtokenTx, mockParseTxWallet),
    ).toStrictEqual({
        incoming: true,
        xecAmount: '5.46',
        isEtokenTx: true,
        originatingHash160: '4e532257c01b310b3b5c1fd947c79a72addf8523',
        slpMeta: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
        },
        etokenAmount: '12',
        legacy: {
            airdropFlag: false,
            airdropTokenId: '',
            amountReceived: '5.46',
            amountSent: 0,
            decryptionSuccess: false,
            isCashtabMessage: false,
            isEncryptedMessage: false,
            opReturnMessage: '',
            outgoingTx: false,
            replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
            tokenTx: true,
        },
    });
});
it(`Successfully parses an outgoing eToken tx`, () => {
    const BCH = new BCHJS({
        restURL: 'https://FakeBchApiUrlToEnsureMocksOnly.com',
    });
    // This function needs to be mocked as bch-js functions that require Buffer types do not work in jest environment
    BCH.Address.hash160ToCash = jest
        .fn()
        .mockReturnValue(
            'bitcoincash:qpmytrdsakt0axrrlswvaj069nat3p9s7ct4lsf8k9',
        );
    expect(
        parseChronikTx(BCH, lambdaOutgoingEtokenTx, mockParseTxWallet),
    ).toStrictEqual({
        incoming: false,
        xecAmount: '5.46',
        isEtokenTx: true,
        originatingHash160: '76458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        slpMeta: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
        },
        etokenAmount: '17',
        legacy: {
            airdropFlag: false,
            airdropTokenId: '',
            amountReceived: 0,
            amountSent: '5.46',
            decryptionSuccess: false,
            isCashtabMessage: false,
            isEncryptedMessage: false,
            opReturnMessage: '',
            outgoingTx: true,
            replyAddress: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            tokenTx: true,
        },
    });
});
it(`Successfully parses a genesis eToken tx`, () => {
    const BCH = new BCHJS({
        restURL: 'https://FakeBchApiUrlToEnsureMocksOnly.com',
    });
    // This function needs to be mocked as bch-js functions that require Buffer types do not work in jest environment
    BCH.Address.hash160ToCash = jest
        .fn()
        .mockReturnValue(
            'bitcoincash:qz2708636snqhsxu8wnlka78h6fdp77ar5ulhz04hr',
        );
    expect(
        parseChronikTx(BCH, eTokenGenesisTx, anotherMockParseTxWallet),
    ).toStrictEqual({
        incoming: false,
        xecAmount: '0',
        originatingHash160: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
        isEtokenTx: true,
        etokenAmount: '7777777777',
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'GENESIS',
            tokenId:
                'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
        },
        legacy: {
            amountSent: '0',
            amountReceived: 0,
            outgoingTx: true,
            tokenTx: true,
            airdropFlag: false,
            airdropTokenId: '',
            opReturnMessage: '',
            isCashtabMessage: false,
            isEncryptedMessage: false,
            decryptionSuccess: false,
            replyAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        },
    });
});

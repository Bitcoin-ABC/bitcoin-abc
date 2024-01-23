import {
    organizeUtxosByType,
    getPreliminaryTokensArray,
    finalizeTokensArray,
    finalizeSlpUtxos,
    getTokenStats,
    flattenChronikTxHistory,
    sortAndTrimChronikTxHistory,
    parseChronikTx,
    getMintAddress,
} from 'chronik';
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
} from '../fixtures/chronikUtxos';
import {
    mockChronikTokenResponse,
    mockGetTokenStatsReturn,
} from '../fixtures/mockChronikTokenStats';
import {
    mockTxHistoryOfAllAddresses,
    mockFlatTxHistoryNoUnconfirmed,
    mockSortedTxHistoryNoUnconfirmed,
    mockFlatTxHistoryWithUnconfirmed,
    mockSortedFlatTxHistoryWithUnconfirmed,
    mockFlatTxHistoryWithAllUnconfirmed,
    mockSortedFlatTxHistoryWithAllUnconfirmed,
    mockParseTxWallet,
    mockParseAliasTxWallet,
    lambdaIncomingXecTx,
    lambdaOutgoingXecTx,
    lambdaIncomingEtokenTx,
    lambdaOutgoingEtokenTx,
    lambdaOutgoingAliasRegistrationTx,
    eTokenGenesisTx,
    receivedEtokenTxNineDecimals,
    anotherMockParseTxWallet,
    txHistoryTokenInfoById,
    mockAirdropTx,
    mockWalletWithPrivateKeys,
    mockSentEncryptedTx,
    mockReceivedEncryptedTx,
    mockTokenBurnTx,
    mockTokenBurnWithDecimalsTx,
    mockReceivedEtokenTx,
    mockSwapWallet,
    mockSwapTx,
    coinbaseTx,
} from '../fixtures/chronikTxHistory';
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
        tokens: mockFinalTokenArray,
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
        tokens: mockFinalTokenArray,
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
        tokens: mockFinalTokenArray,
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
it(`Successfully parses a staking rewards coinbase tx`, () => {
    expect(
        parseChronikTx(coinbaseTx, mockParseTxWallet, txHistoryTokenInfoById),
    ).toStrictEqual({
        incoming: true,
        xecAmount: '625008.97',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: 'N/A',
    });
});
it(`Successfully parses an incoming XEC tx`, () => {
    expect(
        parseChronikTx(
            lambdaIncomingXecTx,
            mockParseTxWallet,
            txHistoryTokenInfoById,
        ),
    ).toStrictEqual({
        incoming: true,
        xecAmount: '42',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
    });
});
it(`Successfully parses an outgoing XEC tx`, () => {
    expect(
        parseChronikTx(
            lambdaOutgoingXecTx,
            mockParseTxWallet,
            txHistoryTokenInfoById,
        ),
    ).toStrictEqual({
        incoming: false,
        xecAmount: '222',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
    });
});
it(`Successfully parses an outgoing Alias Registration tx`, () => {
    expect(
        parseChronikTx(
            lambdaOutgoingAliasRegistrationTx,
            mockParseAliasTxWallet,
            txHistoryTokenInfoById,
        ),
    ).toStrictEqual({
        incoming: false,
        xecAmount: '5.55',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: true,
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: 'bug2',
        replyAddress: 'ecash:qrwpz3mx89y0ph8mqrxyqlk6gxcjzuf66vc4ajscad',
    });
});
it(`Successfully parses an incoming eToken tx`, () => {
    expect(
        parseChronikTx(
            lambdaIncomingEtokenTx,
            mockParseTxWallet,
            txHistoryTokenInfoById,
        ),
    ).toStrictEqual({
        incoming: true,
        xecAmount: '5.46',
        isEtokenTx: true,
        isTokenBurn: false,
        slpMeta: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
        },
        genesisInfo: {
            decimals: 0,
            success: true,
            tokenDocumentHash: '',
            tokenDocumentUrl:
                'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/covid-19-vaccines',
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenName: 'Covid19 Lifetime Immunity',
            tokenTicker: 'NOCOVID',
        },
        etokenAmount: '12',
        airdropFlag: false,
        airdropTokenId: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
    });
});
it(`Successfully parses an outgoing eToken tx`, () => {
    expect(
        parseChronikTx(
            lambdaOutgoingEtokenTx,
            mockParseTxWallet,
            txHistoryTokenInfoById,
        ),
    ).toStrictEqual({
        incoming: false,
        xecAmount: '5.46',
        isEtokenTx: true,
        isTokenBurn: false,
        slpMeta: {
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
        },
        genesisInfo: {
            decimals: 0,
            success: true,
            tokenDocumentHash: '',
            tokenDocumentUrl:
                'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/covid-19-vaccines',
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            tokenName: 'Covid19 Lifetime Immunity',
            tokenTicker: 'NOCOVID',
        },
        etokenAmount: '17',
        airdropFlag: false,
        airdropTokenId: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        opReturnMessage: '',
        replyAddress: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
    });
});
it(`Successfully parses a genesis eToken tx`, () => {
    expect(
        parseChronikTx(
            eTokenGenesisTx,
            anotherMockParseTxWallet,
            txHistoryTokenInfoById,
        ),
    ).toStrictEqual({
        incoming: false,
        xecAmount: '0',
        isEtokenTx: true,
        isTokenBurn: false,
        etokenAmount: '777.7777777',
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'GENESIS',
            tokenId:
                'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
        },
        genesisInfo: {
            decimals: 7,
            success: true,
            tokenDocumentHash: '',
            tokenDocumentUrl: 'https://cashtab.com/',
            tokenId:
                'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
            tokenName: 'UpdateTest',
            tokenTicker: 'UDT',
        },
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
    });
});
it(`Successfully parses a received eToken tx with 9 decimal places`, () => {
    expect(
        parseChronikTx(
            receivedEtokenTxNineDecimals,
            anotherMockParseTxWallet,
            txHistoryTokenInfoById,
        ),
    ).toStrictEqual({
        incoming: true,
        xecAmount: '5.46',
        isEtokenTx: true,
        isTokenBurn: false,
        etokenAmount: '0.123456789',
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
        },
        genesisInfo: {
            decimals: 9,
            success: true,
            tokenDocumentHash: '',
            tokenDocumentUrl: 'https://cashtabapp.com/',
            tokenId:
                'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
            tokenName: 'CashTabBits',
            tokenTicker: 'CTB',
        },
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
    });
});
it(`Correctly parses a received airdrop transaction`, () => {
    expect(
        parseChronikTx(
            mockAirdropTx,
            anotherMockParseTxWallet,
            txHistoryTokenInfoById,
        ),
    ).toStrictEqual({
        incoming: true,
        xecAmount: '5.69',
        isEtokenTx: false,
        aliasFlag: false,
        airdropFlag: true,
        airdropTokenId:
            'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
        opReturnMessage: 'evc token service holders air drop🥇🌐🥇❤👌🛬🛬🍗🤴',
        isCashtabMessage: true,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qp36z7k8xt7k4l5xnxeypg5mfqeyvvyduu04m37fwd',
    });
});

it(`Correctly parses a sent encyrpted message transaction`, () => {
    expect(
        parseChronikTx(
            mockSentEncryptedTx,
            mockWalletWithPrivateKeys,
            txHistoryTokenInfoById,
        ),
    ).toStrictEqual({
        incoming: false,
        xecAmount: '12',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        opReturnMessage: 'Only the message recipient can view this',
        isCashtabMessage: true,
        isEncryptedMessage: true,
        replyAddress: 'ecash:qrhxmjw5p72a3cgx5cect3h63q5erw0gfcvjnyv7xt',
    });
});
it(`Correctly parses a received encrypted message transaction`, () => {
    expect(
        parseChronikTx(
            mockReceivedEncryptedTx,
            mockWalletWithPrivateKeys,
            txHistoryTokenInfoById,
        ),
    ).toStrictEqual({
        incoming: true,
        xecAmount: '11',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        aliasFlag: false,
        opReturnMessage: 'Encrypted Cashtab Msg',
        isCashtabMessage: true,
        isEncryptedMessage: true,
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
    });
});

it(`Correctly parses a token burn transaction`, () => {
    expect(
        parseChronikTx(
            mockTokenBurnTx,
            anotherMockParseTxWallet,
            txHistoryTokenInfoById,
        ),
    ).toStrictEqual({
        incoming: false,
        xecAmount: '0',
        isEtokenTx: true,
        isTokenBurn: true,
        etokenAmount: '12',
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
        },
        genesisInfo: {
            tokenTicker: 'LVV',
            tokenName: 'Lambda Variant Variants',
            tokenDocumentUrl: 'https://cashtabapp.com/',
            tokenDocumentHash: '',
            decimals: 0,
            tokenId:
                '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
            success: true,
        },
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
    });
});
it(`Correctly parses a token burn transaction with decimal places`, () => {
    expect(
        parseChronikTx(
            mockTokenBurnWithDecimalsTx,
            anotherMockParseTxWallet,
            txHistoryTokenInfoById,
        ),
    ).toStrictEqual({
        incoming: false,
        xecAmount: '0',
        isEtokenTx: true,
        etokenAmount: '0.1234567',
        isTokenBurn: true,
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
        },
        genesisInfo: {
            tokenTicker: 'WDT',
            tokenName:
                'Test Token With Exceptionally Long Name For CSS And Style Revisions',
            tokenDocumentUrl:
                'https://www.ImpossiblyLongWebsiteDidYouThinkWebDevWouldBeFun.org',
            tokenDocumentHash:
                '85b591c15c9f49531e39fcfeb2a5a26b2bd0f7c018fb9cd71b5d92dfb732d5cc',
            decimals: 7,
            tokenId:
                '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
            success: true,
        },
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
    });
});
it(`Correctly parses received quantity for a received eToken address`, () => {
    expect(
        parseChronikTx(
            mockReceivedEtokenTx,
            anotherMockParseTxWallet,
            txHistoryTokenInfoById,
        ),
    ).toStrictEqual({
        incoming: true,
        xecAmount: '5.46',
        isEtokenTx: true,
        etokenAmount: '0.123456789',
        isTokenBurn: false,
        slpMeta: {
            tokenType: 'FUNGIBLE',
            txType: 'SEND',
            tokenId:
                'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
        },
        genesisInfo: {
            tokenTicker: 'CTB',
            tokenName: 'CashTabBits',
            tokenDocumentUrl: 'https://cashtabapp.com/',
            tokenDocumentHash: '',
            decimals: 9,
            tokenId:
                'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
            success: true,
        },
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
    });
});
it(`Correctly parses an incoming eToken tx that sends only XEC to the Cashtab user recipient`, () => {
    expect(
        parseChronikTx(mockSwapTx, mockSwapWallet, txHistoryTokenInfoById),
    ).toStrictEqual({
        incoming: true,
        xecAmount: '10',
        isEtokenTx: false,
        aliasFlag: false,
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qzq2myl0727s9e3c8wnzgahl6u5arvnxp5fs9sem4x',
    });
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

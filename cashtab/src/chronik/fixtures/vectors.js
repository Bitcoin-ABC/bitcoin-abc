// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    mockParseTxWallet,
    mockAliasWallet,
    mockParseTxWalletAirdrop,
    mockParseTxWalletEncryptedMsg,
    stakingRwd,
    incomingXec,
    outgoingXec,
    aliasRegistration,
    incomingEtoken,
    outgoingEtoken,
    genesisTx,
    incomingEtokenNineDecimals,
    legacyAirdropTx,
    outgoingEncryptedMsg,
    incomingEncryptedMsg,
    tokenBurn,
    tokenBurnDecimals,
    swapTx,
    mockSwapWallet,
    PayButtonNoDataYesNonce,
    PayButtonYesDataYesNonce,
    PayButtonBadVersion,
    PayButtonOffSpec,
    PayButtonEmpty,
    PayButtonYesDataNoNonce,
    MsgFromElectrum,
    MsgFromEcashChat,
    unknownAppTx,
    mockFlatTxHistoryNoUnconfirmed,
    mockSortedTxHistoryNoUnconfirmed,
    mockFlatTxHistoryWithUnconfirmed,
    mockSortedFlatTxHistoryWithUnconfirmed,
    mockFlatTxHistoryWithAllUnconfirmed,
    mockSortedFlatTxHistoryWithAllUnconfirmed,
    AlpTx,
    SlpV1Mint,
    SlpNftParentFanTx,
    SlpNftMint,
    SlpParentGenesisTxMock,
    oneOutputReceivedTx,
} from './mocks';
import { mockChronikUtxos, mockOrganizedUtxosByType } from './chronikUtxos';
import { getHashes } from 'wallet';

export default {
    parseTx: {
        expectedReturns: [
            {
                description: 'Staking rewards coinbase tx',
                tx: stakingRwd.tx,
                hashes: getHashes(mockParseTxWallet),
                parsed: stakingRwd.parsed,
            },
            {
                description: 'Incoming XEC tx',
                tx: incomingXec.tx,
                hashes: getHashes(mockParseTxWallet),
                parsed: incomingXec.parsed,
            },
            {
                description: 'Outgoing XEC tx',
                tx: outgoingXec.tx,
                hashes: getHashes(mockParseTxWallet),
                parsed: outgoingXec.parsed,
            },
            {
                description: 'Alias registration',
                tx: aliasRegistration.tx,
                hashes: getHashes(mockAliasWallet),
                parsed: aliasRegistration.parsed,
            },
            {
                description: 'Incoming eToken',
                tx: incomingEtoken.tx,
                hashes: getHashes(mockParseTxWallet),
                parsed: incomingEtoken.parsed,
            },
            {
                description: 'Outgoing eToken',
                tx: outgoingEtoken.tx,
                hashes: getHashes(mockParseTxWallet),
                parsed: outgoingEtoken.parsed,
            },
            {
                description: 'Genesis tx',
                tx: genesisTx.tx,
                hashes: getHashes(mockParseTxWalletAirdrop),
                parsed: genesisTx.parsed,
            },
            {
                description: 'Incoming eToken tx with 9 decimals',
                tx: incomingEtokenNineDecimals.tx,
                hashes: getHashes(mockParseTxWalletAirdrop),
                parsed: incomingEtokenNineDecimals.parsed,
            },
            {
                description: 'Legacy airdrop tx',
                tx: legacyAirdropTx.tx,
                hashes: getHashes(mockParseTxWalletAirdrop),
                parsed: legacyAirdropTx.parsed,
            },
            {
                description: 'Outgoing encrypted msg (deprecated)',
                tx: outgoingEncryptedMsg.tx,
                hashes: getHashes(mockParseTxWalletEncryptedMsg),
                parsed: outgoingEncryptedMsg.parsed,
            },
            {
                description: 'Incoming encrypted msg (deprecated)',
                tx: incomingEncryptedMsg.tx,
                hashes: getHashes(mockParseTxWalletEncryptedMsg),
                parsed: incomingEncryptedMsg.parsed,
            },
            {
                description: 'Token burn tx',
                tx: tokenBurn.tx,
                hashes: getHashes(mockParseTxWalletAirdrop),
                parsed: tokenBurn.parsed,
            },
            {
                description: 'Token burn tx with decimals',
                tx: tokenBurnDecimals.tx,
                hashes: getHashes(mockParseTxWalletAirdrop),
                parsed: tokenBurnDecimals.parsed,
            },
            {
                description: 'SWaP tx',
                tx: swapTx.tx,
                hashes: getHashes(mockSwapWallet),
                parsed: swapTx.parsed,
            },
            {
                description: 'PayButton tx with no data and payment id',
                tx: PayButtonNoDataYesNonce.tx,
                hashes: ['f66d2760b20dc7a47d9cf1a2b2f49749bf7093f6'],
                parsed: PayButtonNoDataYesNonce.parsed,
            },
            {
                description: 'PayButton tx with data and payment id',
                tx: PayButtonYesDataYesNonce.tx,
                hashes: ['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc'],
                parsed: PayButtonYesDataYesNonce.parsed,
            },
            {
                description: 'PayButton tx with no data and no payment id',
                tx: PayButtonEmpty.tx,
                hashes: ['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc'],
                parsed: PayButtonEmpty.parsed,
            },
            {
                description: 'PayButton tx with data and no payment id',
                tx: PayButtonYesDataNoNonce.tx,
                hashes: ['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc'],
                parsed: PayButtonYesDataNoNonce.parsed,
            },
            {
                description: 'PayButton tx with unsupported version number',
                tx: PayButtonBadVersion.tx,
                hashes: ['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc'],
                parsed: PayButtonBadVersion.parsed,
            },
            {
                description:
                    'Paybutton tx that does not have spec number of pushes',
                tx: PayButtonOffSpec.tx,
                hashes: ['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc'],
                parsed: PayButtonOffSpec.parsed,
            },
            {
                description: 'External msg received from Electrum',
                tx: MsgFromElectrum.tx,
                hashes: ['4e532257c01b310b3b5c1fd947c79a72addf8523'],
                parsed: MsgFromElectrum.parsed,
            },
            {
                description: 'Unknown app tx',
                tx: unknownAppTx.tx,
                hashes: ['d18b7b500f17c5db64303fec630f9dbb85aa9596'],
                parsed: unknownAppTx.parsed,
            },
            {
                description: 'We can parse a received ALP tx',
                tx: AlpTx.tx,
                // Mock this as a received tx
                hashes: [AlpTx.tx.outputs[1].outputScript],
                parsed: AlpTx.parsed,
            },
            {
                description: 'SLP1 NFT Parent Fan-out tx',
                tx: SlpNftParentFanTx.tx,
                // Mock this as a received tx
                hashes: [SlpNftParentFanTx.tx.outputs[1].outputScript],
                parsed: SlpNftParentFanTx.parsed,
            },
            {
                description: 'SLP1 NFT Mint',
                tx: SlpNftMint.tx,
                // Mock this as a received tx
                hashes: [SlpNftMint.tx.outputs[1].outputScript],
                parsed: SlpNftMint.parsed,
            },
            {
                description: 'SLP1 Parent Genesis',
                tx: SlpParentGenesisTxMock.tx,
                hashes: [SlpParentGenesisTxMock.tx.outputs[1].outputScript],
                parsed: SlpParentGenesisTxMock.parsed,
            },
            {
                description: 'External msg received from eCash Chat',
                tx: MsgFromEcashChat.tx,
                hashes: ['0b7d35fda03544a08e65464d54cfae4257eb6db7'],
                parsed: MsgFromEcashChat.parsed,
            },
            {
                description: 'slp v1 mint tx',
                tx: SlpV1Mint.tx,
                hashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
                parsed: SlpV1Mint.parsed,
            },
            {
                description: 'received xec tx with no change',
                tx: oneOutputReceivedTx.tx,
                hashes: ['601efc2aa406fe9eaedd41d2b5d95d1f4db9041d'],
                parsed: oneOutputReceivedTx.parsed,
            },
        ],
    },
    sortAndTrimChronikTxHistory: {
        expectedReturns: [
            {
                description:
                    'successfully orders the result of flattenChronikTxHistory by blockheight and firstSeenTime if all txs are confirmed',
                flatTxHistoryArray: mockFlatTxHistoryNoUnconfirmed,
                txHistoryCount: 10,
                returned: mockSortedTxHistoryNoUnconfirmed,
            },
            {
                description:
                    'orders the result of flattenChronikTxHistory by blockheight and firstSeenTime if some txs are confirmed and others unconfirmed',
                flatTxHistoryArray: mockFlatTxHistoryWithUnconfirmed,
                txHistoryCount: 10,
                returned: mockSortedFlatTxHistoryWithUnconfirmed,
            },
            {
                description:
                    'orders the result of flattenChronikTxHistory by blockheight and firstSeenTime if all txs are unconfirmed,',
                flatTxHistoryArray: mockFlatTxHistoryWithAllUnconfirmed,
                txHistoryCount: 10,
                returned: mockSortedFlatTxHistoryWithAllUnconfirmed,
            },
        ],
    },
    organizeUtxosByType: {
        expectedReturns: [
            {
                description:
                    'Splits token utxos and non-token utxos using real in-node utxos',
                chronikUtxos: mockChronikUtxos,
                returned: mockOrganizedUtxosByType,
            },
            {
                description: 'Splits token utxos and non-token utxos',
                chronikUtxos: [{ token: 'true' }, { amount: 500 }],
                returned: {
                    slpUtxos: [{ token: 'true' }],
                    nonSlpUtxos: [{ amount: 500 }],
                },
            },
            {
                description:
                    'Returns empty array for nonSlpUtxos if all utxos are token utxos',
                chronikUtxos: [{ token: 'true' }, { token: 'true' }],
                returned: {
                    slpUtxos: [{ token: 'true' }, { token: 'true' }],
                    nonSlpUtxos: [],
                },
            },
            {
                description:
                    'Returns empty array for preliminarySlpUtxos if no token utxos found',
                chronikUtxos: [{ amount: 500 }, { amount: 500 }],
                returned: {
                    slpUtxos: [],
                    nonSlpUtxos: [{ amount: 500 }, { amount: 500 }],
                },
            },
        ],
    },
    getTokenGenesisInfo: {
        expectedReturns: [
            {
                description: 'slpv1 token with no minting batons',
                tokenId:
                    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                tokenInfo: {
                    tokenId:
                        'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'ABC',
                        tokenName: 'ABC',
                        url: 'https://cashtab.com/',
                        decimals: 0,
                        hash: '',
                    },
                    block: {
                        height: 832725,
                        hash: '000000000000000016d97961a24ac3460160bbc439810cd2af684264ae15083b',
                        timestamp: 1708607039,
                    },
                },
                genesisTx: {
                    txid: 'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                    version: 2,
                    inputs: [
                        {
                            prevOut: {
                                txid: '9866faa3294afc3f4dd5669c67ee4d0ded42db25d08728fe07166e9cda9ee8f9',
                                outIdx: 3,
                            },
                            inputScript:
                                '483045022100fb14b5f82605972478186c91ff6fab2051b46abd2a8aa9774b3e9276715daf39022046a62933cc3acf59129fbf373ef05480342312bc33aaa8bf7fb5a0495b5dc80e412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                            value: 1617,
                            sequenceNo: 4294967295,
                            outputScript:
                                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        },
                    ],
                    outputs: [
                        {
                            value: 0,
                            outputScript:
                                '6a04534c500001010747454e4553495303414243034142431468747470733a2f2f636173687461622e636f6d2f4c0001004c0008000000000000000c',
                        },
                        {
                            value: 546,
                            outputScript:
                                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                            token: {
                                tokenId:
                                    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                    number: 1,
                                },
                                amount: '12',
                                isMintBaton: false,
                                entryIdx: 0,
                            },
                            spentBy: {
                                txid: '41fd4cb3ce0162e44cfd5a446b389afa6b35461d466d55321be412a518c56d63',
                                outIdx: 0,
                            },
                        },
                    ],
                    lockTime: 0,
                    timeFirstSeen: 0,
                    size: 261,
                    isCoinbase: false,
                    tokenEntries: [
                        {
                            tokenId:
                                'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            txType: 'GENESIS',
                            isInvalid: false,
                            burnSummary: '',
                            failedColorings: [],
                            actualBurnAmount: '0',
                            intentionalBurn: '0',
                            burnsMintBatons: false,
                        },
                    ],
                    tokenFailedParsings: [],
                    tokenStatus: 'TOKEN_STATUS_NORMAL',
                    block: {
                        height: 832725,
                        hash: '000000000000000016d97961a24ac3460160bbc439810cd2af684264ae15083b',
                        timestamp: 1708607039,
                    },
                },
                returned: {
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'ABC',
                        tokenName: 'ABC',
                        url: 'https://cashtab.com/',
                        decimals: 0,
                        hash: '',
                    },
                    block: {
                        height: 832725,
                        hash: '000000000000000016d97961a24ac3460160bbc439810cd2af684264ae15083b',
                        timestamp: 1708607039,
                    },
                    genesisMintBatons: 0,
                    genesisOutputScripts: [
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    ],
                    genesisSupply: '12',
                },
            },
            {
                description:
                    'slpv1 token with no minting batons unconfirmed genesis tx',
                tokenId:
                    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                tokenInfo: {
                    tokenId:
                        'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'ABC',
                        tokenName: 'ABC',
                        url: 'https://cashtab.com/',
                        decimals: 0,
                        hash: '',
                    },
                },
                genesisTx: {
                    txid: 'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                    version: 2,
                    inputs: [
                        {
                            prevOut: {
                                txid: '9866faa3294afc3f4dd5669c67ee4d0ded42db25d08728fe07166e9cda9ee8f9',
                                outIdx: 3,
                            },
                            inputScript:
                                '483045022100fb14b5f82605972478186c91ff6fab2051b46abd2a8aa9774b3e9276715daf39022046a62933cc3acf59129fbf373ef05480342312bc33aaa8bf7fb5a0495b5dc80e412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                            value: 1617,
                            sequenceNo: 4294967295,
                            outputScript:
                                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        },
                    ],
                    outputs: [
                        {
                            value: 0,
                            outputScript:
                                '6a04534c500001010747454e4553495303414243034142431468747470733a2f2f636173687461622e636f6d2f4c0001004c0008000000000000000c',
                        },
                        {
                            value: 546,
                            outputScript:
                                '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                            token: {
                                tokenId:
                                    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                    number: 1,
                                },
                                amount: '12',
                                isMintBaton: false,
                                entryIdx: 0,
                            },
                            spentBy: {
                                txid: '41fd4cb3ce0162e44cfd5a446b389afa6b35461d466d55321be412a518c56d63',
                                outIdx: 0,
                            },
                        },
                    ],
                    lockTime: 0,
                    timeFirstSeen: 0,
                    size: 261,
                    isCoinbase: false,
                    tokenEntries: [
                        {
                            tokenId:
                                'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            txType: 'GENESIS',
                            isInvalid: false,
                            burnSummary: '',
                            failedColorings: [],
                            actualBurnAmount: '0',
                            intentionalBurn: '0',
                            burnsMintBatons: false,
                        },
                    ],
                    tokenFailedParsings: [],
                    tokenStatus: 'TOKEN_STATUS_NORMAL',
                },
                returned: {
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'ABC',
                        tokenName: 'ABC',
                        url: 'https://cashtab.com/',
                        decimals: 0,
                        hash: '',
                    },
                    genesisMintBatons: 0,
                    genesisOutputScripts: [
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    ],
                    genesisSupply: '12',
                },
            },
            {
                description: 'slpv1 token with minting baton',
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                tokenInfo: {
                    tokenId:
                        '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'TBC',
                        tokenName: 'tabcash',
                        url: 'https://cashtabapp.com/',
                        decimals: 0,
                        hash: '',
                    },
                    block: {
                        height: 674143,
                        hash: '000000000000000034c77993a35c74fe2dddace27198681ca1e89e928d0c2fff',
                        timestamp: 1613859311,
                    },
                },
                genesisTx: {
                    txid: '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                    version: 2,
                    inputs: [
                        {
                            prevOut: {
                                txid: 'be38b0488679e25823b7a72b925ac695a7b486e7f78122994b913f3079b0b939',
                                outIdx: 2,
                            },
                            inputScript:
                                '483045022100e28006843eb071ec6d8dd105284f2ca625a28f4dc85418910b59a5ab13fc6c2002205921fb12b541d1cd1a63e7e012aca5735df3398525f64bac04337d21029413614121034509251caa5f01e2787c436949eb94d71dcc451bcde5791ae5b7109255f5f0a3',
                            value: 91048,
                            sequenceNo: 4294967295,
                            outputScript:
                                '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                        },
                    ],
                    outputs: [
                        {
                            value: 0,
                            outputScript:
                                '6a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c0001000102080000000000000064',
                        },
                        {
                            value: 546,
                            outputScript:
                                '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                            token: {
                                tokenId:
                                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                    number: 1,
                                },
                                amount: '100',
                                isMintBaton: false,
                                entryIdx: 0,
                            },
                            spentBy: {
                                txid: '618d0dd8c0c5fa5a34c6515c865dd72bb76f8311cd6ee9aef153bab20dabc0e6',
                                outIdx: 1,
                            },
                        },
                        {
                            value: 546,
                            outputScript:
                                '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                            token: {
                                tokenId:
                                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                    number: 1,
                                },
                                amount: '0',
                                isMintBaton: true,
                                entryIdx: 0,
                            },
                        },
                        {
                            value: 89406,
                            outputScript:
                                '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                            spentBy: {
                                txid: '618d0dd8c0c5fa5a34c6515c865dd72bb76f8311cd6ee9aef153bab20dabc0e6',
                                outIdx: 0,
                            },
                        },
                    ],
                    lockTime: 0,
                    timeFirstSeen: 0,
                    size: 336,
                    isCoinbase: false,
                    tokenEntries: [
                        {
                            tokenId:
                                '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            txType: 'GENESIS',
                            isInvalid: false,
                            burnSummary: '',
                            failedColorings: [],
                            actualBurnAmount: '0',
                            intentionalBurn: '0',
                            burnsMintBatons: false,
                        },
                    ],
                    tokenFailedParsings: [],
                    tokenStatus: 'TOKEN_STATUS_NORMAL',
                    block: {
                        height: 674143,
                        hash: '000000000000000034c77993a35c74fe2dddace27198681ca1e89e928d0c2fff',
                        timestamp: 1613859311,
                    },
                },
                returned: {
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'TBC',
                        tokenName: 'tabcash',
                        url: 'https://cashtabapp.com/',
                        decimals: 0,
                        hash: '',
                    },
                    block: {
                        height: 674143,
                        hash: '000000000000000034c77993a35c74fe2dddace27198681ca1e89e928d0c2fff',
                        timestamp: 1613859311,
                    },
                    genesisMintBatons: 1,
                    genesisOutputScripts: [
                        '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                    ],
                    genesisSupply: '100',
                },
            },
            {
                description: 'ALP token with a minting baton',
                tokenId:
                    'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                tokenInfo: {
                    tokenId:
                        'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'CRD',
                        tokenName: 'Credo In Unum Deo',
                        url: 'https://crd.network/token',
                        decimals: 4,
                        data: {},
                        authPubkey:
                            '0334b744e6338ad438c92900c0ed1869c3fd2c0f35a4a9b97a88447b6e2b145f10',
                    },
                    block: {
                        height: 795680,
                        hash: '00000000000000000b7e89959ee52ca1cd691e1fc3b4891c1888f84261c83e73',
                        timestamp: 1686305735,
                    },
                },
                genesisTx: {
                    txid: 'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                    version: 1,
                    inputs: [
                        {
                            prevOut: {
                                txid: 'dd2020be54ad3dccf98548512e6f735cac002434bbddb61f19cbe6f3f1de04da',
                                outIdx: 0,
                            },
                            inputScript:
                                '4130ef71df9d2daacf48d05a0361e103e087b636f4d68af8decd769227caf198003991629bf7057fa1572fc0dd3581115a1b06b5c0eafc88555e58521956fe5cbc410768999600fc71a024752102d8cb55aaf01f84335130bf7b3751267e5cf3398a60e5162ff93ec8d77f14850fac',
                            value: 4000,
                            sequenceNo: 4294967295,
                            outputScript:
                                'a91464275fca443d169d23d077c85ad1bb7a31b6e05987',
                        },
                    ],
                    outputs: [
                        {
                            value: 0,
                            outputScript:
                                '6a504c63534c5032000747454e455349530343524411437265646f20496e20556e756d2044656f1968747470733a2f2f6372642e6e6574776f726b2f746f6b656e00210334b744e6338ad438c92900c0ed1869c3fd2c0f35a4a9b97a88447b6e2b145f10040001',
                        },
                        {
                            value: 546,
                            outputScript:
                                '76a914bbb6c4fecc56ecce35958f87c2367cd3f5e88c2788ac',
                            token: {
                                tokenId:
                                    'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                                tokenType: {
                                    protocol: 'ALP',
                                    type: 'ALP_TOKEN_TYPE_STANDARD',
                                    number: 0,
                                },
                                amount: '0',
                                isMintBaton: true,
                                entryIdx: 0,
                            },
                            spentBy: {
                                txid: 'ff06c312bef229f6f27989326d9be7e0e142aaa84538967b104b262af69f7f00',
                                outIdx: 0,
                            },
                        },
                    ],
                    lockTime: 777777,
                    timeFirstSeen: 0,
                    size: 308,
                    isCoinbase: false,
                    tokenEntries: [
                        {
                            tokenId:
                                'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_STANDARD',
                                number: 0,
                            },
                            txType: 'GENESIS',
                            isInvalid: false,
                            burnSummary: '',
                            failedColorings: [],
                            actualBurnAmount: '0',
                            intentionalBurn: '0',
                            burnsMintBatons: false,
                        },
                    ],
                    tokenFailedParsings: [],
                    tokenStatus: 'TOKEN_STATUS_NORMAL',
                    block: {
                        height: 795680,
                        hash: '00000000000000000b7e89959ee52ca1cd691e1fc3b4891c1888f84261c83e73',
                        timestamp: 1686305735,
                    },
                },
                returned: {
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'CRD',
                        tokenName: 'Credo In Unum Deo',
                        url: 'https://crd.network/token',
                        decimals: 4,
                        data: {},
                        authPubkey:
                            '0334b744e6338ad438c92900c0ed1869c3fd2c0f35a4a9b97a88447b6e2b145f10',
                    },
                    block: {
                        height: 795680,
                        hash: '00000000000000000b7e89959ee52ca1cd691e1fc3b4891c1888f84261c83e73',
                        timestamp: 1686305735,
                    },
                    genesisMintBatons: 1,
                    genesisOutputScripts: [
                        '76a914bbb6c4fecc56ecce35958f87c2367cd3f5e88c2788ac',
                    ],
                    genesisSupply: '0.0000',
                },
            },
            {
                description: 'slpv2 genesis tx',
                tokenId:
                    '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5', // BUX
                tokenInfo: {
                    tokenId:
                        '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'BUX',
                        tokenName: 'Badger Universal Token',
                        url: 'https://bux.digital',
                        decimals: 4,
                        hash: '',
                    },
                    block: {
                        height: 726564,
                        hash: '000000000000000010ea35897b2b7373261fdfbca3d02e4f9a6eeb79dc914315',
                        timestamp: 1644797123,
                    },
                },
                genesisTx: {
                    txid: '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                    version: 1,
                    inputs: [
                        {
                            prevOut: {
                                txid: 'b5605cdda8e5cc5f475f2473f34ad01b29fa0995bac5d37dcb54b858f76db61f',
                                outIdx: 0,
                            },
                            inputScript:
                                '41614bc7f35d66b30c017e111c98ad22086730435bea6cf0ec54188ca425863f2a60ee808a11564258d0defc2bfa1505953e18a8108409fb048cfa39bdacc82fce4121027e6cf8229495afadcb5a7e40365bbc82afcf145eacca3193151e68a61fc81743',
                            value: 3200,
                            sequenceNo: 4294967295,
                            outputScript:
                                '76a914502ee2f475081f2031861f3a275c52722199280e88ac',
                        },
                    ],
                    outputs: [
                        {
                            value: 0,
                            outputScript:
                                '6a04534c500001010747454e45534953034255581642616467657220556e6976657273616c20546f6b656e1368747470733a2f2f6275782e6469676974616c4c0001040102080000000000000000',
                        },
                        {
                            value: 2300,
                            outputScript:
                                'a9144d80de3cda49fd1bd98eb535da0f2e4880935ea987',
                            spentBy: {
                                txid: '459a8dbf3b31750ddaaed4d2c6a12fb42ef1b83fc0f67175f43332962932aa7d',
                                outIdx: 0,
                            },
                        },
                        {
                            value: 546,
                            outputScript:
                                'a91420d151c5ab4ca4154407626069eaafd8ce6306fc87',
                            token: {
                                tokenId:
                                    '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                    number: 1,
                                },
                                amount: '0',
                                isMintBaton: true,
                                entryIdx: 0,
                            },
                            spentBy: {
                                txid: '459a8dbf3b31750ddaaed4d2c6a12fb42ef1b83fc0f67175f43332962932aa7d',
                                outIdx: 1,
                            },
                        },
                    ],
                    lockTime: 0,
                    timeFirstSeen: 0,
                    size: 302,
                    isCoinbase: false,
                    tokenEntries: [
                        {
                            tokenId:
                                '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            txType: 'GENESIS',
                            isInvalid: false,
                            burnSummary: '',
                            failedColorings: [],
                            actualBurnAmount: '0',
                            intentionalBurn: '0',
                            burnsMintBatons: false,
                        },
                    ],
                    tokenFailedParsings: [],
                    tokenStatus: 'TOKEN_STATUS_NORMAL',
                    block: {
                        height: 726564,
                        hash: '000000000000000010ea35897b2b7373261fdfbca3d02e4f9a6eeb79dc914315',
                        timestamp: 1644797123,
                    },
                },
                returned: {
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'BUX',
                        tokenName: 'Badger Universal Token',
                        url: 'https://bux.digital',
                        decimals: 4,
                        hash: '',
                    },
                    block: {
                        height: 726564,
                        hash: '000000000000000010ea35897b2b7373261fdfbca3d02e4f9a6eeb79dc914315',
                        timestamp: 1644797123,
                    },
                    genesisMintBatons: 1,
                    genesisOutputScripts: [
                        'a91420d151c5ab4ca4154407626069eaafd8ce6306fc87',
                    ],
                    genesisSupply: '0.0000',
                },
            },
            {
                description: 'Slp type 2 token (BUX)',
                tokenId:
                    '52b12c03466936e7e3b2dcfcff847338c53c611ba8ab74dd8e4dadf7ded12cf6',
                tokenInfo: {
                    tokenId:
                        '52b12c03466936e7e3b2dcfcff847338c53c611ba8ab74dd8e4dadf7ded12cf6',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_MINT_VAULT',
                        number: 2,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'BUX',
                        tokenName: 'Badger Universal Token',
                        url: 'https://bux.digital',
                        decimals: 4,
                        mintVaultScripthash:
                            '08d6edf91c7b93d18306d3b8244587e43f11df4b',
                        hash: '',
                    },
                    block: {
                        height: 811408,
                        hash: '000000000000000016d3b567884f11f44592ce7cd2642e74014b1c65bc6a5c81',
                        timestamp: 1695700586,
                    },
                },
                genesisTx: {
                    txid: '52b12c03466936e7e3b2dcfcff847338c53c611ba8ab74dd8e4dadf7ded12cf6',
                    version: 1,
                    inputs: [
                        {
                            prevOut: {
                                txid: '8586a0e6dc08653dc5b88afe751efbb97d78246482985d01802c98b75f873fba',
                                outIdx: 10,
                            },
                            inputScript:
                                '473044022040b7bb9093b092003b5c41090f4b7560a7bcfed35278fd05d2f1083653529ea902205a11af8aea5d16a01dc7648397eb6b04369dda9e3e9ecc4a9efe3f5b4a41a1dd412102fafcdb1f5f0d2e49909fbafc18f339bcfc2b765b3def934d501eb798e626c7b3',
                            value: 3851630,
                            sequenceNo: 4294967294,
                            outputScript:
                                '76a91452558a0640aae72592c3b336a3a4959ce97906b488ac',
                        },
                    ],
                    outputs: [
                        {
                            value: 0,
                            outputScript:
                                '6a04534c500001020747454e45534953034255581642616467657220556e6976657273616c20546f6b656e1368747470733a2f2f6275782e6469676974616c4c0001041408d6edf91c7b93d18306d3b8244587e43f11df4b080000000000000000',
                        },
                        {
                            value: 546,
                            outputScript:
                                '76a91452558a0640aae72592c3b336a3a4959ce97906b488ac',
                        },
                        {
                            value: 3850752,
                            outputScript:
                                '76a914f4592a09e8da1a2157916963bc0fb7fe682df73e88ac',
                        },
                    ],
                    lockTime: 811407,
                    timeFirstSeen: 0,
                    size: 331,
                    isCoinbase: false,
                    tokenEntries: [
                        {
                            tokenId:
                                '52b12c03466936e7e3b2dcfcff847338c53c611ba8ab74dd8e4dadf7ded12cf6',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_MINT_VAULT',
                                number: 2,
                            },
                            txType: 'GENESIS',
                            isInvalid: false,
                            burnSummary: '',
                            failedColorings: [],
                            actualBurnAmount: '0',
                            intentionalBurn: '0',
                            burnsMintBatons: false,
                        },
                    ],
                    tokenFailedParsings: [],
                    tokenStatus: 'TOKEN_STATUS_NORMAL',
                    block: {
                        height: 811408,
                        hash: '000000000000000016d3b567884f11f44592ce7cd2642e74014b1c65bc6a5c81',
                        timestamp: 1695700586,
                    },
                },
                returned: {
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_MINT_VAULT',
                        number: 2,
                    },
                    timeFirstSeen: '0',
                    genesisInfo: {
                        tokenTicker: 'BUX',
                        tokenName: 'Badger Universal Token',
                        url: 'https://bux.digital',
                        decimals: 4,
                        mintVaultScripthash:
                            '08d6edf91c7b93d18306d3b8244587e43f11df4b',
                        hash: '',
                    },
                    block: {
                        height: 811408,
                        hash: '000000000000000016d3b567884f11f44592ce7cd2642e74014b1c65bc6a5c81',
                        timestamp: 1695700586,
                    },
                    genesisMintBatons: 0,
                    genesisOutputScripts: [],
                    genesisSupply: '0.0000',
                },
            },
        ],
        expectedErrors: [
            {
                description:
                    'Error is thrown if 1st chronik API call not completed successfully',
                tokenId:
                    '1111111111111111111111111111111111111111111111111111111111111111',
                tokenInfo: new Error(
                    'Bad response from chronik.token(tokenId)',
                ),
                genesisTx: {}, // non-error response
                msg: new Error('Bad response from chronik.token(tokenId)'),
            },
            {
                description:
                    'Error is thrown if 2nd chronik API call not completed successfully',
                tokenId:
                    '1111111111111111111111111111111111111111111111111111111111111111',
                tokenInfo: {}, // non-error response
                genesisTx: new Error('Bad response from chronik.tx(tokenId)'),
                msg: new Error('Bad response from chronik.tx(tokenId)'),
            },
        ],
    },
};

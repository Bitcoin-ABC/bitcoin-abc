// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { fromHex } from 'ecash-lib';
import { Utxo } from 'chronik-client';
import { tokenMockXecx } from 'components/Agora/fixtures/mocks';
import { FIRMA } from 'constants/tokens';
import { XecTxType } from 'chronik';
import { CashtabWallet, CashtabWalletPaths } from 'wallet';

/**
 * Etokens/fixtures/mocks.js
 * Mocks to populate mocked-chronik-client with token cache info for different token types
 *
 * When Cashtab supports a new token type, add it as a utxo in this wallet, and add a new mock object
 * with keys for tokenId, token, and tx
 * token is chronik response for chronik.token(tokenId)
 * tx is chronik response for chronik.tx(tokenId)
 */

// Used only for circulating suppply calculation
const MOCK_TOKEN_UTXO: Utxo = {
    token: {
        tokenId:
            '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        },
        atoms: 2999998798000000000n,
        isMintBaton: false,
    },
} as unknown as Utxo;

export const tokenTestWallet: CashtabWallet = {
    state: {
        balanceSats: 997081,
        slpUtxos: [
            {
                outpoint: {
                    txid: '250c93fd6bc2f1853a41d2fd1f5754a92f79f952f10ab038401be1600d5cbb88',
                    outIdx: 1,
                },
                blockHeight: 836452,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    isMintBaton: false,
                    atoms: 1000000n,
                },
                path: 1899,
                sats: 546n,
            },
            // XECX
            {
                outpoint: {
                    txid: '250c93fd6bc2f1853a41d2fd1f5754a92f79f952f10ab038401be1600d5cbb88',
                    outIdx: 1,
                },
                blockHeight: 836452,
                isCoinbase: false,
                sats: 546n,
                isFinal: true,
                token: {
                    tokenId: tokenMockXecx.tokenId,
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 1000000n,
                    isMintBaton: false,
                },
                path: 1899,
            },
            // FIRMA
            {
                outpoint: {
                    txid: '250c93fd6bc2f1853a41d2fd1f5754a92f79f952f10ab038401be1600d5cbb88',
                    outIdx: 1,
                },
                blockHeight: 836452,
                isCoinbase: false,
                sats: 546n,
                isFinal: true,
                token: {
                    tokenId: FIRMA.tokenId,
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 1000000n,
                    isMintBaton: false,
                },
                path: 1899,
            },
            {
                outpoint: {
                    txid: '74a8598eed00672e211553a69e22334128199883fe79eb4ad64f9c0b7909735c',
                    outIdx: 1,
                },
                blockHeight: 836457,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_UNKNOWN',
                        number: 255,
                    },
                    isMintBaton: false,
                    atoms: 0n,
                },
                path: 1899,
                sats: 1000n,
            },
            {
                outpoint: {
                    txid: '6fb5525bf35ec6eb6a0608c8a3624891801cdf4c1079fc78462a24230bad27e2',
                    outIdx: 1,
                },
                blockHeight: 836700,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '6fb5525bf35ec6eb6a0608c8a3624891801cdf4c1079fc78462a24230bad27e2',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 100000n,
                },
                path: 1899,
                sats: 546n,
            },
            // SLP MINT VAULT
            {
                outpoint: {
                    txid: '6fb5525bf35ec6eb6a0608c8a3624891801cdf4c1079fc78462a24230bad27e2',
                    outIdx: 1,
                },
                blockHeight: 836700,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '8ecb9c25978f429472f3e9f9c048222f6ac9977e7d1313781f0e9ac1bdba3251',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_MINT_VAULT',
                        number: 2,
                    },
                    isMintBaton: false,
                    atoms: 100000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'da3c897eb6d4e5299cb3ae2d8235d46632647303eab61236a1072885d5e56d66',
                    outIdx: 1,
                },
                blockHeight: 840233,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 111000000000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                    outIdx: 1,
                },
                blockHeight: -1,
                isCoinbase: false,
                isFinal: false,
                token: {
                    tokenId:
                        '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 18446744073709551615n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                    outIdx: 2,
                },
                blockHeight: -1,
                isCoinbase: false,
                isFinal: false,
                token: {
                    tokenId:
                        '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: true,
                    atoms: 0n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                    outIdx: 1,
                },
                blockHeight: 840011,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    isMintBaton: false,
                    atoms: 100n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                    outIdx: 2,
                },
                blockHeight: 840011,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    isMintBaton: true,
                    atoms: 0n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
                    outIdx: 1,
                },
                blockHeight: 841509,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                path: 1899,
                sats: 546n,
            },
        ],
        nonSlpUtxos: [
            {
                outpoint: {
                    txid: '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                    outIdx: 3,
                },
                blockHeight: -1,
                isCoinbase: false,
                isFinal: false,
                path: 1899,
                sats: 997081n,
            },
        ],
        tokens: new Map([
            [
                '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
                '100.0000',
            ],
            [
                '0000000000000000000000000000000000000000000000000000000000000000',
                '0',
            ],
            [
                '6fb5525bf35ec6eb6a0608c8a3624891801cdf4c1079fc78462a24230bad27e2',
                '100000',
            ],
            [
                '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                '111.000000000',
            ],
            [
                '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                '18446744073.709551615',
            ],
            [
                '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                '100',
            ],
        ]),
        parsedTxHistory: [
            {
                txid: '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '6fb5525bf35ec6eb6a0608c8a3624891801cdf4c1079fc78462a24230bad27e2',
                            outIdx: 2,
                        },
                        inputScript:
                            '4730440220350ea45bed94988b896e3b4fcf111cc433a3e851bf2bb43c84ef5a0a51f70adf02204fc1007f3840ab3ed278a3add81411249575caeb4b7416de1aed695b02bca2f94121020a725e4b7326b4af2b468ab95982d1393d062811a8f8204bf383bf3373dbc54f',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                        sats: 998857n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c500001010747454e45534953034d53420e4d696e742053656e64204275726e1468747470733a2f2f636173687461622e636f6d2f4c000109010208ffffffffffffffff',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                        token: {
                            tokenId:
                                '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 18446744073709551615n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                        token: {
                            tokenId:
                                '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: true,
                            entryIdx: 0,
                            atoms: 0n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                        sats: 997081n,
                    },
                ],
                lockTime: 0,
                isFinal: true,
                timeFirstSeen: 1713184114,
                size: 339,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        txType: 'GENESIS',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                parsed: {
                    xecTxType: XecTxType.Sent,
                    satoshisSent: 998173,
                    stackArray: [
                        '534c5000',
                        '01',
                        '47454e45534953',
                        '4d5342',
                        '4d696e742053656e64204275726e',
                        '68747470733a2f2f636173687461622e636f6d2f',
                        '',
                        '09',
                        '02',
                        'ffffffffffffffff',
                    ],
                    recipients: [],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: 'da3c897eb6d4e5299cb3ae2d8235d46632647303eab61236a1072885d5e56d66',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '490a06b01b8d1793b81b5230ce2045132af0f0ec9cc7be860bb72e6a727d5bd4',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100d5fc2c9824aa7ceb987dde5e32b17f1be000fa19480e59faaef6f5e7f235e5f7022039e8fa5e66c19c0a0e77b429a3056465db841a2b8e837552d01d38072edf0ed14121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 999867000000000n,
                        },
                        outputScript:
                            '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: '26638422f963da59e040c3eeb2bc766114f44026bff959ae5ee30be486b18fa7',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022038387900857b7f33214deff1ffc45f108a5ac9c60dd4d41d85662b2116d5644502201a56911fa1b7c86d967d04fd3c35348714c0b5c69fec025c549c1641b1049d654121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                        sats: 14846n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f80800000019d81d96000800038d45d53df800',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                        token: {
                            tokenId:
                                '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 111000000000n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                        token: {
                            tokenId:
                                '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 999756000000000n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                        sats: 13333n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713183812,
                size: 480,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        txType: 'SEND',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                block: {
                    height: 840233,
                    hash: '000000000000000019fa0a69b1b204692bb8e5696e0df32137e4a34b77e0d675',
                    timestamp: 1713183906,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Received,
                    satoshisSent: 546,
                    stackArray: [
                        '534c5000',
                        '01',
                        '53454e44',
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                        '00000019d81d9600',
                        '00038d45d53df800',
                    ],
                    recipients: [
                        'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: '6fb5525bf35ec6eb6a0608c8a3624891801cdf4c1079fc78462a24230bad27e2',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '1494a165306a2b5cb2e743f01e6c14b963fc75a62083a468d5e71e1e6245d1d9',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100b68ce47f60e254e0a980cf05f9ebc2a5bf943b3ffb57c567db6adce0e0aaf7c8022015813a924a50b310e2f9ab3d60db35b53e56d96eca6603e20a02ed7a4a623e0e4121020a725e4b7326b4af2b468ab95982d1393d062811a8f8204bf383bf3373dbc54f',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                        sats: 1000000n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c500001010747454e4553495301530753756c706875721468747470733a2f2f636173687461622e636f6d2f4c0001004c000800000000000186a0',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                        token: {
                            tokenId:
                                '6fb5525bf35ec6eb6a0608c8a3624891801cdf4c1079fc78462a24230bad27e2',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 100000n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                        spentBy: {
                            txid: '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                            outIdx: 0,
                        },
                        sats: 998857n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1710948156,
                size: 297,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            '6fb5525bf35ec6eb6a0608c8a3624891801cdf4c1079fc78462a24230bad27e2',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        txType: 'GENESIS',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                block: {
                    height: 836700,
                    hash: '000000000000000014a2459ce878eecab3abfca3aede8b71b30121f210b48117',
                    timestamp: 1710948609,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Sent,
                    satoshisSent: 999403,
                    stackArray: [
                        '534c5000',
                        '01',
                        '47454e45534953',
                        '53',
                        '53756c70687572',
                        '68747470733a2f2f636173687461622e636f6d2f',
                        '',
                        '00',
                        '',
                        '00000000000186a0',
                    ],
                    recipients: [],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: '74a8598eed00672e211553a69e22334128199883fe79eb4ad64f9c0b7909735c',
                version: 1,
                inputs: [
                    {
                        prevOut: {
                            txid: 'a65c0a7258fc9d9087351d77eacbad882e851d11ea7c11a238dc4c8360cb3ffa',
                            outIdx: 2,
                        },
                        inputScript:
                            '41c9594e4dd7338ad9ec44a81ab75db2ccb737b961b00f2f8a51e0f581158b5c25ff41b26357f432821917a642cad0fd68371a75686bd3b7847dc6daae26e3eb6a4121037bc7f6ca0474be3edf7a2ce4e753855998273e9db618b135c20ee0e4b5e9fce8',
                        sequenceNo: 4294967294,
                        token: {
                            tokenId:
                                '0000000000000000000000000000000000000000000000000000000000000000',
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_UNKNOWN',
                                number: 200,
                            },
                            isMintBaton: false,
                            entryIdx: 1,
                            atoms: 0n,
                        },
                        outputScript:
                            '76a914915132f6d7b707123b66ce4ac0a04a135c07a39988ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: 'a65c0a7258fc9d9087351d77eacbad882e851d11ea7c11a238dc4c8360cb3ffa',
                            outIdx: 3,
                        },
                        inputScript:
                            '418aafb5e789fbc194ed7ecbad3bea728d00d9c089d3005bd6cf3487a8f196b2444e1552c5079805a790ab7339b4ef1932749f19ded730852cbc993dd80a04189d4121033b5a78b9d86813dd402f05cf0627dc4273090c70a9e52109204da0f272980633',
                        sequenceNo: 4294967294,
                        token: {
                            tokenId:
                                '0000000000000000000000000000000000000000000000000000000000000000',
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_UNKNOWN',
                                number: 200,
                            },
                            isMintBaton: false,
                            entryIdx: 1,
                            atoms: 0n,
                        },
                        outputScript:
                            '76a914bd19517f5aa2f2286922d4c28f5dc4c89c49798488ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: 'f5c37336316d0b08eacf0791000c13e87182ef87188c55693dfb65218db08cb4',
                            outIdx: 0,
                        },
                        inputScript:
                            '414d72085dfe8b9deb741c15e83822d778f5825e35c44dbd3753937b697538e502d71aae0215881f07bd8c66112abfe466b95cb8ebc0d7e9ca0c4fd063853ad73e412102637953859a84e61e87df221c91ac3a38c59fa7e652e43894adc4443a373bcd10',
                        sequenceNo: 4294967294,
                        outputScript:
                            '76a91496345bfc72a63d798a7f1deace0be9edf209a24b88ac',
                        sats: 600n,
                    },
                ],
                outputs: [
                    {
                        outputScript: '6a5005534c5032ff',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                        token: {
                            tokenId:
                                '0000000000000000000000000000000000000000000000000000000000000000',
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_UNKNOWN',
                                number: 255,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 0n,
                        },
                        sats: 1000n,
                    },
                ],
                lockTime: 821417,
                timeFirstSeen: 1710792313,
                size: 484,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            '0000000000000000000000000000000000000000000000000000000000000000',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_UNKNOWN',
                            number: 255,
                        },
                        txType: 'UNKNOWN',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                    {
                        tokenId:
                            '0000000000000000000000000000000000000000000000000000000000000000',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_UNKNOWN',
                            number: 200,
                        },
                        txType: 'NONE',
                        isInvalid: true,
                        burnSummary: 'Unexpected burn: ',
                        failedColorings: [],
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NOT_NORMAL',
                block: {
                    height: 836457,
                    hash: '000000000000000017739c96aa947a25e7ff176eb1a669095f950cefade4f255',
                    timestamp: 1710794047,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Received,
                    satoshisSent: 1000,
                    stackArray: ['50', '534c5032ff'],
                    recipients: [],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: '250c93fd6bc2f1853a41d2fd1f5754a92f79f952f10ab038401be1600d5cbb88',
                version: 1,
                inputs: [
                    {
                        prevOut: {
                            txid: '3d087f1004d42876756c3c2b97e92e21d8ccfc45d1479776b6b0a35c44728111',
                            outIdx: 1,
                        },
                        inputScript:
                            '418c511d2a85d07f2d5313aeec82817321ee5c14212da7c44d0c4ab3799238c474065720a8ceb3329edaa2160f8f2948bbcfcc11203347f61dc7e58f46f70df972c12103ab36c95805dd2d9f40b5abde2e0a7c78858421c03383f0a138358eb514dc53dd',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_STANDARD',
                                number: 0,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 50000000n,
                        },
                        outputScript:
                            '76a914262261027093df1005f751174d87d780adfabbbf88ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: '18c7c49f5783f909224f59a435cc4f3b0e7174bda27b86e53e6e76e4fa48dab4',
                            outIdx: 82,
                        },
                        inputScript:
                            '41f7d042e3288f923e1f540ed7ce43db91d1295951ca21ed4ab24ce95d9ca6826ad7e5497f117f802fe1c9fda902ab7bf97af8bba4d29cb267d110d23e221f8cc7412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                        sats: 1000n,
                    },
                    {
                        prevOut: {
                            txid: '18c7c49f5783f909224f59a435cc4f3b0e7174bda27b86e53e6e76e4fa48dab4',
                            outIdx: 83,
                        },
                        inputScript:
                            '41d1e4f4970fea442cf46e71811eaf2f8271f2f1b3518fdb682bb0625160177adfa058707013453ed4c80887473238c7013007bf794a557fe6de449a51b4b4d06a412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                        sats: 1000n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a503d534c5032000453454e4449884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c0340420f000000dcadeb020000640000000000',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                        token: {
                            tokenId:
                                '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_STANDARD',
                                number: 0,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1000000n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a914262261027093df1005f751174d87d780adfabbbf88ac',
                        token: {
                            tokenId:
                                '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_STANDARD',
                                number: 0,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 48999900n,
                        },
                        spentBy: {
                            txid: 'f784a99870650fddc57360db8f91035bde12e4c278eb4704caa1256b682d7bc5',
                            outIdx: 0,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a914dee50f576362377dd2f031453c0bb09009acaf8188ac',
                        token: {
                            tokenId:
                                '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_STANDARD',
                                number: 0,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 100n,
                        },
                        sats: 546n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1710789095,
                size: 608,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        txType: 'SEND',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                block: {
                    height: 836452,
                    hash: '000000000000000010aa8982051dceef402d15f18adf260492e0829cc715b29b',
                    timestamp: 1710789519,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Received,
                    satoshisSent: 546,
                    stackArray: [
                        '50',
                        '534c5032000453454e4449884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c0340420f000000dcadeb020000640000000000',
                    ],
                    recipients: [
                        'ecash:qqnzycgzwzfa7yq97ag3wnv867q2m74mhufqefypm0',
                        'ecash:qr0w2r6hvd3rwlwj7qc520qtkzgqnt90sypk26yd2u',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: '1494a165306a2b5cb2e743f01e6c14b963fc75a62083a468d5e71e1e6245d1d9',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '825d6054498af4a899eb5bd6d539e7b808bc717968e68acb63f64dca209a9888',
                            outIdx: 1,
                        },
                        inputScript:
                            '4830450221008834c3f958b6de5c2d14385ef28c69671db6210f88b3dd80fb1c95edd03ecec9022079f16f8022e910a81570a86ce27f8b095553309a050028bb2ad43cd770d0a5a0412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 463935n,
                    },
                    {
                        prevOut: {
                            txid: '95db8b6c65a9494a1c33f646c9e61c34266900798fcaecee2ecfaba211d1246d',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100fe262318853a2a7660b21f63be1e9e3542236e4993be03495f706497e46ad59a022066838c3875a0bfa6fafac4c29318ec78ebede7dd1f2a4b1419da7abac17453c9412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 1100n,
                    },
                    {
                        prevOut: {
                            txid: 'dd025b3924544e1fdff406c8f32dd92d2ae736af23dd8d2ef4da24f8241e8342',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100911a595d3b7f549d25cb2aeaebc105d4c7959ea85cf946b267c5af49cd48d87802200a6c09b691ec570f88e390e24aab1b715907bd58433fa133ea83f2936d807cec412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 1100n,
                    },
                    {
                        prevOut: {
                            txid: '8b4c343250f7c2052b8aea274626774343cbb83327a755b164a9da483013f2f5',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402202a2df4c242582503b800a3852afc68f46a5de8b9554e97fe00313e95c3430ee902203e534510bd9754f1279ccfccd524b8baa7d521823ca2b87c4b5be813a3da8920412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 1100n,
                    },
                    {
                        prevOut: {
                            txid: '07f1f1c64e85f8a8192a979b215e1266f7f43c75ca50bca4bddc4e7e810afb8a',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402204deff67ff4bd3d146c2780a4d29f4f4757af0df5e5f5cffb0a9c8541bd86a67202201f4b467a220b5a84b5d7c6dc398720c4b1b86d41870cf8cc3fc7968c93b6bb91412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 2200n,
                    },
                    {
                        prevOut: {
                            txid: 'a55991681f7171821a52325897a5af2457dd4ecf2bfab717fe0be89b61dd615d',
                            outIdx: 0,
                        },
                        inputScript:
                            '473044022024894af3256a20173a10bb0195cd5d18edd54e7f78575fccb28306d824ef04b902201134383d62083011a1a90aae60e3899008c0894543e49bfc19db1bca639c2ca6412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 1100n,
                    },
                    {
                        prevOut: {
                            txid: 'c336d4a0e72551a0e22a9204a8cf28ac0ae704610b375b8fae3f5a387b2b1996',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100cf855ef9fd533ae6de13a21850b2ed772819480083828ab599ce56a4fe0d5014022062846bb895f11b3af532a8407dc4b7ccf40e5c6d6e6f7baed6aa276d22e648ec412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 2200n,
                    },
                    {
                        prevOut: {
                            txid: 'd491904e95406e51676a93552a64da22df5fd292e7820dfe0ef894c764c7f94a',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100828aa7fab0d9b3e8a7e84e9f9b058039010b7a7f339992357a820d6289239b3902206105c3174a82bad53310fcbf264dcb8ffdb5932006f528822671b07f9ba8f17b412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 1100n,
                    },
                    {
                        prevOut: {
                            txid: 'dc63c3a69858563ca3cc9d48d1d36f090705a4ed9c50da006bd3636e2ba65f98',
                            outIdx: 0,
                        },
                        inputScript:
                            '473044022015196c866fe452d1f55371ea4a2266c1e17738a941271063cc5a666d51bba7b502205dfba391e95fd3fe266a7619d8067de973631d3988b844af3b54f61cb29d6749412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 1100n,
                    },
                    {
                        prevOut: {
                            txid: '93309cd2654dc714fc5c907497cb4b1fee50480cae463389e8f51d18221c344c',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100dade26b499a7b8e7e14d4bf65dd0d959fc46343c1ad5b23956f2117afef81e0c022070177fc12d998e2f8e817423844bf122183d60964033766d4b58416f335c5ddf412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 1100n,
                    },
                    {
                        prevOut: {
                            txid: 'd3b4e33b04c1d9e7407446682924e4b6264ca0bf5704daa72c895bb215913b4b',
                            outIdx: 0,
                        },
                        inputScript:
                            '4830450221009c5499d0830d2ff8470c9c232c3ff8d984845a5e0a995f838c9def20413e48f6022003c96aa2453b48d045449564a8e591fbb1b098bb0ff25ca3b147fee0d2c9ddc2412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 1100n,
                    },
                    {
                        prevOut: {
                            txid: 'd09ba93e9916d390a6bce2b2168e93710315e30eb12d33b576fa780716dad5b7',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100869341ac1ca7f84ba5871f92444cf36a1c277e5e0bd3f084c3eac5674148bfda02200fc9c0a79de0937f8e71071e7f25518aa8cd8ef71a2260221dacd635d5de169a412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 1100n,
                    },
                    {
                        prevOut: {
                            txid: 'd2ff7500d9705ad21dcf666c89446abc6f1810b2f9ddf60d9b47f6052535d0b4',
                            outIdx: 0,
                        },
                        inputScript:
                            '4830450221008b7f0701d441d4d365181f8113dc249d7628098658341e233e65559eebacd31602204f614a4100d7c3cf6921983db601806a281e3d9af2c531c27ebf2b84898d254c412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 2200n,
                    },
                    {
                        prevOut: {
                            txid: '4c9610cc3e19f7b417cb8d5c018d13b0ea00486500f2e302d9387965ae6fba19',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100f05296911f971330353398cfca9ba4e894285bd5d46c499bd7fb926ca6053ba002206f630b424989e876df0efc4055895abfcbb73bd7962512fe1deb1999fc1ec3f1412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 4888538n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                        spentBy: {
                            txid: '6fb5525bf35ec6eb6a0608c8a3624891801cdf4c1079fc78462a24230bad27e2',
                            outIdx: 0,
                        },
                        sats: 1000000n,
                    },
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '2bbcbf5e5e8c753991a37402f4ae60e49a0927c20927dba32862cf9c4af87f25',
                            outIdx: 0,
                        },
                        sats: 4364651n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1710787899,
                size: 2146,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 836452,
                    hash: '000000000000000010aa8982051dceef402d15f18adf260492e0829cc715b29b',
                    timestamp: 1710789519,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Received,
                    satoshisSent: 1000000,
                    stackArray: [],
                    recipients: [
                        'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
        ],
    },
    mnemonic: 'away away away away away away away away away away away away',
    paths: new Map([
        [
            1899,
            {
                address: 'ecash:qqq9f9z3uhpzkxrgdjkd7dxuuey7tmpmugpmnw0kue',
                hash: '00549451e5c22b18686cacdf34dce649e5ec3be2',
                // Same as Transaction Fixtures in App/fixtures/mocks
                wif: 'KywWPgaLDwvW1tWUtUvs13jgqaaWMoNANLVYoKcK9Ddbpnch7Cmw',
                sk: fromHex(
                    '512d34d3b8f4d269219fd087c80e22b0212769227226dd6b23966cf0aa2f167f',
                ),
                pk: fromHex(
                    '031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
                ),
            },
        ],
    ]) as unknown as CashtabWalletPaths,
    name: 'Token Test',
};

// SLP 1 Fixed
export const slp1FixedMocks = {
    tokenId: '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
    token: {
        tokenId:
            '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        },
        timeFirstSeen: 0,
        genesisInfo: {
            tokenTicker: 'VSP',
            tokenName: 'Vespene Gas',
            url: 'https://simple.wikipedia.org/wiki/StarCraft#Gameplay',
            decimals: 9,
            hash: '',
        },
        block: {
            height: 763087,
            hash: '0000000000000000015abcebc15e74036598855a9fdd976868ad99bb23b87a89',
            timestamp: 1666631359,
        },
    },
    tx: {
        txid: '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'ac8be4ed7289014eb615cf8aa122cbd94283fe566142052d7ac8c6fab241fb51',
                    outIdx: 2,
                },
                inputScript:
                    '46304302200db47adc26bbb4ae4584ae455c5f078a4d2f624e898fab3159c74473677bc8b2021f371ea6c9acd051c96eaba2b229d06a0247dad2acf6cf0694792d22280dfe8e412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 1253n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010747454e45534953035653500b56657370656e65204761733468747470733a2f2f73696d706c652e77696b6970656469612e6f72672f77696b692f5374617243726166742347616d65706c61794c0001094c000829a2241af62c0000',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 3000000000000000000n,
                },
                spentBy: {
                    txid: 'fc1ada187e9f5da7616f481c79cd0fa3aafa3d4094288db6806e7508f76b5fcd',
                    outIdx: 1,
                },
                sats: 546n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 299,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                txType: 'GENESIS',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        block: {
            height: 763087,
            hash: '0000000000000000015abcebc15e74036598855a9fdd976868ad99bb23b87a89',
            timestamp: 1666631359,
        },
    },
    // Mock a single utxo with the supply you want to test
    utxos: [
        {
            ...MOCK_TOKEN_UTXO,
            token: {
                ...MOCK_TOKEN_UTXO.token,
                tokenId:
                    '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                atoms: 2999998798000000000n,
            },
        },
    ],
};

export const slp1FixedBear = {
    tokenId: '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
    token: {
        tokenId:
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        },
        timeFirstSeen: 0,
        genesisInfo: {
            tokenTicker: 'BEAR',
            tokenName: 'BearNip',
            url: 'https://cashtab.com/',
            decimals: 0,
            hash: '',
        },
        block: {
            height: 782665,
            hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
            timestamp: 1678408305,
        },
    },
    tx: {
        txid: '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '0e737a2f6373649341b406334341202a5ddbbdb389c55da40570b641dc23d036',
                    outIdx: 1,
                },
                inputScript:
                    '473044022055444db90f98b462ca29a6f51981da4015623ddc34dc1f575852426ccb785f0402206e786d4056be781ca1720a0a915b040e0a9e8716b8e4d30b0779852c191fdeb3412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967294,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 6231556n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010747454e45534953044245415207426561724e69701468747470733a2f2f636173687461622e636f6d2f4c0001004c0008000000000000115c',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 4444n,
                },
                spentBy: {
                    txid: '9e7f91826cfd3adf9867c1b3d102594eff4743825fad9883c35d26fb3bdc1693',
                    outIdx: 1,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '27a2471afab33d82b9404df12e1fa242488a9439a68e540dcf8f811ef39c11cf',
                    outIdx: 0,
                },
                sats: 6230555n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 299,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                txType: 'GENESIS',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        block: {
            height: 782665,
            hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
            timestamp: 1678408305,
        },
    },
    // Mock a single utxo with the supply you want to test
    utxos: [
        {
            ...MOCK_TOKEN_UTXO,
            token: {
                ...MOCK_TOKEN_UTXO.token,
                tokenId:
                    '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                atoms: 4441n,
            },
        },
    ],
};

export const slp1FixedCachet = {
    tokenId: 'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
    token: {
        tokenId:
            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        },
        timeFirstSeen: 1711776546,
        genesisInfo: {
            tokenTicker: 'CACHET',
            tokenName: 'Cachet',
            url: 'https://cashtab.com/',
            decimals: 2,
            hash: '',
        },
        block: {
            height: 838192,
            hash: '0000000000000000132232769161d6211f7e6e20cf63b26e5148890aacd26962',
            timestamp: 1711779364,
        },
    },
    tx: {
        txid: 'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'dd3eafefb1941fd67d8a29b7dd057ac48ec11712887e2ae7c008a7c72d0cd9fc',
                    outIdx: 0,
                },
                inputScript:
                    '4830450221009bb1fb7d49d9ac64b79ea041be2e2efa5a8709a470930b04c27c9fc46ed1906302206a0a9daf5e64e934a3467951dd2da37405969d4434d4006ddfea3ed39ff4e0ae412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 2200n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010747454e4553495306434143484554064361636865741468747470733a2f2f636173687461622e636f6d2f4c0001020102080000000000989680',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 10000000n,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: true,
                    entryIdx: 0,
                    atoms: 0n,
                },
                spentBy: {
                    txid: '4b5b2a0f8bcacf6bccc7ef49e7f82a894c9c599589450eaeaf423e0f5926c38e',
                    outIdx: 0,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '343356b9d4acd59065f90b1ace647c1f714f1fd4c411e2cf77081a0246c7416d',
                    outIdx: 3,
                },
                sats: 773n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1711776546,
        size: 335,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                txType: 'GENESIS',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        block: {
            height: 838192,
            hash: '0000000000000000132232769161d6211f7e6e20cf63b26e5148890aacd26962',
            timestamp: 1711779364,
        },
    },
    utxos: [
        {
            ...MOCK_TOKEN_UTXO,
            token: {
                ...MOCK_TOKEN_UTXO.token,
                tokenId:
                    '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                atoms: 2999998798000000000n,
            },
        },
    ],
};

// SLP 1 variable with mint baton
export const slp1VarMocks = {
    tokenId: '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
    token: {
        tokenId:
            '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        },
        timeFirstSeen: 1713184114,
        genesisInfo: {
            tokenTicker: 'MSB',
            tokenName: 'Mint Send Burn',
            url: 'https://cashtab.com/',
            decimals: 9,
            hash: '',
        },
    },
    tx: {
        txid: '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '6fb5525bf35ec6eb6a0608c8a3624891801cdf4c1079fc78462a24230bad27e2',
                    outIdx: 2,
                },
                inputScript:
                    '4730440220350ea45bed94988b896e3b4fcf111cc433a3e851bf2bb43c84ef5a0a51f70adf02204fc1007f3840ab3ed278a3add81411249575caeb4b7416de1aed695b02bca2f94121020a725e4b7326b4af2b468ab95982d1393d062811a8f8204bf383bf3373dbc54f',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                sats: 998857n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001010747454e45534953034d53420e4d696e742053656e64204275726e1468747470733a2f2f636173687461622e636f6d2f4c000109010208ffffffffffffffff',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                token: {
                    tokenId:
                        '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 18446744073709551615n,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                token: {
                    tokenId:
                        '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: true,
                    entryIdx: 0,
                    atoms: 0n,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                sats: 997081n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1713184114,
        size: 339,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                txType: 'GENESIS',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
    },
    utxos: [
        {
            ...MOCK_TOKEN_UTXO,
            token: {
                ...MOCK_TOKEN_UTXO.token,
                tokenId:
                    '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                atoms: 18446744073709551615n,
            },
        },
        // Note that Cashtab will mark a token as fixed supply if there are no mint batons in its utxos by tokenId
        {
            ...MOCK_TOKEN_UTXO,
            token: {
                ...MOCK_TOKEN_UTXO.token,
                tokenId:
                    '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                atoms: 0n,
                isMintBaton: true,
            },
        },
    ],
};

// SLP 1 NFT Parent with no children
export const slp1NftParentMocks = {
    tokenId: '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
    token: {
        tokenId:
            '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
            number: 129,
        },
        timeFirstSeen: 1712860458,
        genesisInfo: {
            tokenTicker: 'ABC',
            tokenName: 'ABC Blocks',
            url: 'https://bitcoinabc.org',
            decimals: 0,
            hash: '0a40beb8dbac1ff8938733a383d265fde5777da779135cab32e1720bd222c42c',
        },
        block: {
            height: 840011,
            hash: '00000000000000000a4385f4dc84c75f935c7b9d3d53964bb766a0fc19b7d837',
            timestamp: 1712861037,
        },
    },
    tx: {
        txid: '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '7a5c50cf24b732e13d54229b9c6842c2b53856d7902ecd94474ba60c0591fef7',
                    outIdx: 1,
                },
                inputScript:
                    '483045022100b72455dac63bfd2ba70be566d217b6ae734775b20410b5b524784aef6e07d799022023b960eab42d459b532b2661018a2639803f365a5115c1ca2a09149a285bfe3b4121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                sats: 2200n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001810747454e45534953034142430a41424320426c6f636b731668747470733a2f2f626974636f696e6162632e6f7267200a40beb8dbac1ff8938733a383d265fde5777da779135cab32e1720bd222c42c01000102080000000000000064',
                sats: 0n,
            },
            {
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                token: {
                    tokenId:
                        '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 100n,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                token: {
                    tokenId:
                        '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    isMintBaton: true,
                    entryIdx: 0,
                    atoms: 0n,
                },
                sats: 546n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1712860458,
        size: 335,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                txType: 'GENESIS',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        block: {
            height: 840011,
            hash: '00000000000000000a4385f4dc84c75f935c7b9d3d53964bb766a0fc19b7d837',
            timestamp: 1712861037,
        },
    },
    utxos: [
        {
            outpoint: {
                txid: '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                outIdx: 1,
            },
            blockHeight: 840011,
            isCoinbase: false,
            script: '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                atoms: 100n,
                isMintBaton: false,
            },
        },
        {
            outpoint: {
                txid: '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                outIdx: 2,
            },
            blockHeight: 840011,
            isCoinbase: false,
            script: '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                atoms: 0n,
                isMintBaton: true,
            },
        },
    ],
};

// SLP1 NFT Parent with children
export const slp1NftParentWithChildrenMocks = {
    tokenId: '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
    token: {
        tokenId:
            '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
            number: 129,
        },
        timeFirstSeen: 1713551159,
        genesisInfo: {
            tokenTicker: '4HC',
            tokenName: 'The Four Half-Coins of Jin-qua',
            url: 'en.wikipedia.org/wiki/Tai-Pan_(novel)',
            decimals: 0,
            hash: '2a6585a404fae1c33a43322b723b9dbd926cb07244ae9bea888add8f471511e0',
        },
        block: {
            height: 840791,
            hash: '00000000000000000be1576bcb0bf1c035bba940d5c696d7bb8a0d53c16076c5',
            timestamp: 1713551526,
        },
    },
    tx: {
        txid: '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '3dff51c3a8a78dcd56ef77dcf041aa5167e719ebd6d8c4f6cacb6e06d0b851f4',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100b8fdd47dd19070801a6e5ef306463fa0b21e88405fcb381a7983f13b268128f102202434a3ca71f00b9d8a98c170679cd90cf0b81c9c416c8b24e957adfb9c6e3ec3412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 32773546n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001810747454e45534953033448431e54686520466f75722048616c662d436f696e73206f66204a696e2d71756125656e2e77696b6970656469612e6f72672f77696b692f5461692d50616e5f286e6f76656c29202a6585a404fae1c33a43322b723b9dbd926cb07244ae9bea888add8f471511e001004c00080000000000000004',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 4n,
                },
                spentBy: {
                    txid: 'faaba128601942a858abcce56d0da002c1f1d95e8c49ba4105c3d08aa76959d8',
                    outIdx: 0,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '6ee862c41f8cf37bfd30b7a2e5ddf6bbad60b87753c6b810dd76527d97c10de4',
                    outIdx: 1,
                },
                sats: 32772256n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1713551159,
        size: 370,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                txType: 'GENESIS',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        block: {
            height: 840791,
            hash: '00000000000000000be1576bcb0bf1c035bba940d5c696d7bb8a0d53c16076c5',
            timestamp: 1713551526,
        },
    },
    utxos: [
        // NFT Mint Input
        {
            outpoint: {
                txid: 'faaba128601942a858abcce56d0da002c1f1d95e8c49ba4105c3d08aa76959d8',
                outIdx: 4,
            },
            blockHeight: 841414,
            isCoinbase: false,
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                atoms: 1n,
                isMintBaton: false,
            },
            path: 1899,
        },
    ],
};

// SLP 1 NFT Child
export const slp1NftChildMocks = {
    tokenId: '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
    token: {
        tokenId:
            '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
            number: 65,
        },
        timeFirstSeen: 1713910791,
        genesisInfo: {
            tokenTicker: 'GC',
            tokenName: 'Gordon Chen',
            url: 'https://en.wikipedia.org/wiki/Tai-Pan_(novel)',
            decimals: 0,
            hash: '8247001da3bf5680011e26628228761b994a9e0a4ba3f1fdd826ddbf044e5d72',
        },
        block: {
            height: 841509,
            hash: '000000000000000003f0e8a3f0a4de0689311c5708d26b25851bb24a44027753',
            timestamp: 1713913313,
        },
    },
    tx: {
        txid: '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'faaba128601942a858abcce56d0da002c1f1d95e8c49ba4105c3d08aa76959d8',
                    outIdx: 3,
                },
                inputScript:
                    '483045022100e394332d19812c6b78ac39484dd755473348cc11920ceaea00c9185dc36cac9302203f04fbb661cd9137d5536667f03f89f2096b487a95b7a9eddbf2a33c7fb12d93412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    isMintBaton: false,
                    entryIdx: 1,
                    atoms: 1n,
                },
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 546n,
            },
            {
                prevOut: {
                    txid: '5478bbf6ebe4a0f0ac05994608b4b980264ba1225259f7f6c0f573e998be98e6',
                    outIdx: 2,
                },
                inputScript:
                    '47304402200dd2615f8545e57157d0cba016db42d4e25688a265155c7c332cf049eec4300202206cc96ee2f25141302f5e2aaade959ef9d972739f054585cf5dedb6bfec2f5928412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 32767046n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a04534c500001410747454e455349530247430b476f72646f6e204368656e2d68747470733a2f2f656e2e77696b6970656469612e6f72672f77696b692f5461692d50616e5f286e6f76656c29208247001da3bf5680011e26628228761b994a9e0a4ba3f1fdd826ddbf044e5d7201004c00080000000000000001',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                token: {
                    tokenId:
                        '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    isMintBaton: false,
                    entryIdx: 0,
                    atoms: 1n,
                },
                sats: 546n,
            },
            {
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                sats: 32766028n,
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1713910791,
        size: 505,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                    number: 65,
                },
                txType: 'GENESIS',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                burnsMintBatons: false,
                groupTokenId:
                    '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
            },
            {
                tokenId:
                    '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                txType: 'NONE',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        block: {
            height: 841509,
            hash: '000000000000000003f0e8a3f0a4de0689311c5708d26b25851bb24a44027753',
            timestamp: 1713913313,
        },
    },
    utxos: [
        {
            outpoint: {
                txid: '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
                outIdx: 1,
            },
            blockHeight: 841509,
            isCoinbase: false,
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                    number: 65,
                },
                atoms: 1n,
                isMintBaton: false,
            },
            path: 1899,
        },
    ],
};

// ALP
// 7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849
export const alpMocks = {
    tokenId: '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
    token: {
        tokenId:
            '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
        tokenType: {
            protocol: 'ALP',
            type: 'ALP_TOKEN_TYPE_STANDARD',
            number: 0,
        },
        timeFirstSeen: 0,
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
    },
    tx: {
        txid: '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
        version: 1,
        inputs: [
            {
                prevOut: {
                    txid: '29a4f002cbfecb52f958f94183d2c8669fa1bd8ad46c9443bb02c6d5cc474a5f',
                    outIdx: 0,
                },
                inputScript:
                    '41a8814adcad71e619e25e6a175486c29896c1edc35fecc545280412374b1e6fe60ace588ecaf51db2bb1b3572d550796f7bc1bd4a3359c43100954277f56aec5241077de390000047182475210207447ce9b9e17ef1d8312ab3145a241f4d6f1a35eb4f381f324aa03e58913931ac',
                sequenceNo: 4294967295,
                outputScript: 'a914c5a7353c6e99facb5c254cc28e882a3feac12daa87',
                sats: 4000n,
            },
        ],
        outputs: [
            {
                outputScript:
                    '6a504c63534c5032000747454e4553495304744352440854657374204352441868747470733a2f2f6372642e6e6574776f726b2f74637264090000000000000000002103d2dc0cea5c81593f1bfcd42763a21f5c85e7e8d053cdf990f8b383b892b72420040001',
                sats: 0n,
            },
            {
                outputScript:
                    '76a91459ca25ea25f4f89a79b55c1c775ae515eb25b1fe88ac',
                token: {
                    tokenId:
                        '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    isMintBaton: true,
                    entryIdx: 0,
                    atoms: 0n,
                },
                spentBy: {
                    txid: '81ced8cfd5c69164a94cf50758f95750d3a589bfdd2cec6ee403f205cb29b5c3',
                    outIdx: 0,
                },
                sats: 546n,
            },
        ],
        lockTime: 777777,
        timeFirstSeen: 0,
        size: 308,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
                txType: 'GENESIS',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                burnsMintBatons: false,
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        block: {
            height: 821187,
            hash: '00000000000000002998aedef7c4fc2c52281e318461d66c3c9fe10151449448',
            timestamp: 1701716369,
        },
    },
    utxos: [
        {
            ...MOCK_TOKEN_UTXO,
            token: {
                ...MOCK_TOKEN_UTXO.token,
                tokenId:
                    '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
                atoms: 1113670000n,
            },
        },
        // Note that Cashtab will mark a token as fixed supply if there are no mint batons in its utxos by tokenId
        {
            ...MOCK_TOKEN_UTXO,
            token: {
                ...MOCK_TOKEN_UTXO.token,
                tokenId:
                    '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
                atoms: 0n,
                isMintBaton: true,
            },
        },
    ],
};

export const slpMintVaultMocks = {
    tokenId: '8ecb9c25978f429472f3e9f9c048222f6ac9977e7d1313781f0e9ac1bdba3251',
    token: {
        tokenId:
            '8ecb9c25978f429472f3e9f9c048222f6ac9977e7d1313781f0e9ac1bdba3251',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_MINT_VAULT',
            number: 2,
        },
        timeFirstSeen: 1747417871,
        genesisInfo: {
            tokenTicker: 'MVTT β',
            tokenName: 'Mint Vault Test Token Beta',
            url: 'cashtab.com',
            decimals: 0,
            mintVaultScripthash: '3630f1e9469f7c3b8a989dbc74bf982ed11e25b4',
            hash: '',
        },
        block: {
            height: 897132,
            hash: '00000000000000000384f5e6081f2a0ed3581a315a0d280a006b6c5c30f0f3ca',
            timestamp: 1747418044,
        },
    },
    tx: {
        txid: '8ecb9c25978f429472f3e9f9c048222f6ac9977e7d1313781f0e9ac1bdba3251',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '36acca8612c20ec7aca2b72090db9f96599f38d02c9b839046cdd3ce66324917',
                    outIdx: 3,
                },
                inputScript:
                    '4156caad48179e4db51623230205c3d28bc1074589ea79ab5af30c8ee72353f5cbc02c8e7d747767acd2d06fd881d30e56f984ee2f9f6c83bea943ab17c48fbd5d412103e2932c15fe3a40d1eca2d7d65935ac5b550b07b5829a706085c259a453bd7f37',
                sats: 12959541n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9143630f1e9469f7c3b8a989dbc74bf982ed11e25b488ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a04534c500001020747454e45534953074d56545420ceb21a4d696e74205661756c74205465737420546f6b656e20426574610b636173687461622e636f6d4c000100143630f1e9469f7c3b8a989dbc74bf982ed11e25b4080000000000989680',
            },
            {
                sats: 546n,
                outputScript:
                    '76a9143630f1e9469f7c3b8a989dbc74bf982ed11e25b488ac',
                token: {
                    tokenId:
                        '8ecb9c25978f429472f3e9f9c048222f6ac9977e7d1313781f0e9ac1bdba3251',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_MINT_VAULT',
                        number: 2,
                    },
                    atoms: 10000000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '0239fede6e9bde63403836ebb57c12ce6b789488d145dd0c81733d212bec1d8f',
                    outIdx: 0,
                },
            },
            {
                sats: 12958670n,
                outputScript:
                    '76a9143630f1e9469f7c3b8a989dbc74bf982ed11e25b488ac',
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1747417871,
        size: 325,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '8ecb9c25978f429472f3e9f9c048222f6ac9977e7d1313781f0e9ac1bdba3251',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_MINT_VAULT',
                    number: 2,
                },
                txType: 'GENESIS',
                isInvalid: false,
                burnSummary: '',
                failedColorings: [],
                actualBurnAtoms: 0n,
                intentionalBurnAtoms: 0n,
                burnsMintBatons: false,
            },
        ],
        tokenFailedParsings: [],
        tokenStatus: 'TOKEN_STATUS_NORMAL',
        isFinal: true,
        block: {
            height: 897132,
            hash: '00000000000000000384f5e6081f2a0ed3581a315a0d280a006b6c5c30f0f3ca',
            timestamp: 1747418044,
        },
    },
    utxos: [
        {
            ...MOCK_TOKEN_UTXO,
            token: {
                ...MOCK_TOKEN_UTXO.token,
                tokenId:
                    '8ecb9c25978f429472f3e9f9c048222f6ac9977e7d1313781f0e9ac1bdba3251',
                atoms: 10_000_000n,
            },
        },
        // NB no mint batons for a MINT VAULT token
    ],
};

// XECX
export const xecxMocks = {
    ...tokenMockXecx,
    token: tokenMockXecx.tokenInfo,
    utxos: [
        {
            ...MOCK_TOKEN_UTXO,
            token: {
                ...MOCK_TOKEN_UTXO.token,
                tokenId: tokenMockXecx.tokenId,
                atoms: 1781404606734n,
            },
        },
        // Include a mint baton as it is variable supply
        {
            ...MOCK_TOKEN_UTXO,
            token: {
                ...MOCK_TOKEN_UTXO.token,
                tokenId: tokenMockXecx.tokenId,
                atoms: 0n,
                isMintBaton: true,
            },
        },
    ],
};

// FIRMA
export const firmaMocks = {
    ...FIRMA,
    utxos: [
        {
            ...MOCK_TOKEN_UTXO,
            token: {
                ...MOCK_TOKEN_UTXO.token,
                tokenId: FIRMA.tokenId,
                atoms: 62500_0000n,
            },
        },
        // Include a mint baton as it is variable supply
        {
            ...MOCK_TOKEN_UTXO,
            token: {
                ...MOCK_TOKEN_UTXO.token,
                tokenId: FIRMA.tokenId,
                atoms: 0n,
                isMintBaton: true,
            },
        },
    ],
};

export const supportedTokens = [
    slp1FixedMocks,
    slp1VarMocks,
    slp1NftParentMocks,
    slp1NftParentWithChildrenMocks,
    slp1NftChildMocks,
    alpMocks,
    slpMintVaultMocks,
    xecxMocks,
    firmaMocks,
];

/**
 * Mocks to test Etokens.js component
 */

export const EtokensWalletMock: CashtabWallet = {
    state: {
        balanceSats: 97511071,
        slpUtxos: [
            {
                outpoint: {
                    txid: '525457276f1b6984170c9b35a8312d4988fce495723eabadd2afcdb3b872b2f1',
                    outIdx: 1,
                },
                blockHeight: 680782,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'bf24d955f59351e738ecd905966606a6837e478e1982943d724eab10caad82fd',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'b35c502f388cdfbdd6841b7a73e973149b3c8deca76295a3e4665939e0562796',
                    outIdx: 2,
                },
                blockHeight: 681191,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'dd84ca78db4d617221b58eabc6667af8fe2f7eadbfcc213d35be9f1b419beb8d',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '7987f68aa70d29ac0e0ac31d74354a8b1cd515c9893f6a5cdc7a3bf505e08b05',
                    outIdx: 1,
                },
                blockHeight: 685181,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '9e8483407944d9b75c331ebd6178b0cabc3e8c3b5bb0492b7b2256c8740f655a',
                    outIdx: 1,
                },
                blockHeight: 709251,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 1000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '18c0360f0db5399223cbed48f55c4cee9d9914c8a4a7dedcf9172a36201e9896',
                    outIdx: 1,
                },
                blockHeight: 717055,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'e859eeb52e7afca6217fb36784b3b6d3c7386a52f391dd0d00f2ec03a5e8e77b',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 10n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '3703d46c5c52b0e55f3bd549e14c5617a47f802413f4acf7a27545437eb51a38',
                    outIdx: 1,
                },
                blockHeight: 741200,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '8ead21ce4b3b9e7b57607b97b65b5013496dc6e3dfdea162c08ce7265a66ebc8',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 100000000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '696265ced15b8fdbacfa1a4f5e779575ff5faaf3ff4ad09e5691b2ed4cf50a84',
                    outIdx: 2,
                },
                blockHeight: 758209,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 311n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '28428450ffa24dae7427ba8456fd5465b0da478fd183be845a27fdc0205df45f',
                    outIdx: 1,
                },
                blockHeight: 758645,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 4588000000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '9a3522b610d153934b951cd6dd91676e5e4f3020531bd8a2e8015193c383029e',
                    outIdx: 1,
                },
                blockHeight: 758887,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 229400000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'e3752bd648b2234957690ae408b08fe4eaf95912aa1b9790dc569c99e2a1f37a',
                    outIdx: 1,
                },
                blockHeight: 759839,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 229400000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'b808f6a831dcdfda2bd4c5f857f94e1a746a4effeda6a5ad742be6137884a4fb',
                    outIdx: 1,
                },
                blockHeight: 760076,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 123456789n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '8b8a15bbcc69df215ac45bab882d8f122f3e09405c3ac093d12cd2dd79a141ec',
                    outIdx: 1,
                },
                blockHeight: 764737,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 1699n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '54cd8c25ff891a80f8276150244f052db7649a477eae2600ff17b49104258ee3',
                    outIdx: 2,
                },
                blockHeight: 767640,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 99999998n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '9d2b752d3d0bb0b6ffeab531b8c3ca0b2af56c116ad13fe7e799b0ab96348b29',
                    outIdx: 1,
                },
                blockHeight: 767649,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'ccf5fe5a387559c8ab9efdeb0c0ef1b444e677298cfddf07671245ce3cb3c79f',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 100000000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '7c75493d6e710173192ed1892273376ef54b755880cd5cb4aec3e2db309a1cce',
                    outIdx: 2,
                },
                blockHeight: 768787,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'a4e4438f1e5d2c680c5ad877a9c2e75b5eea05f7fc8a17e0cdb348f315e7dc49',
                    outIdx: 1,
                },
                blockHeight: 769675,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 200n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '019609426f88a9c2f13de980c7f7b2828c868fc6d53b1673421096b701ceae1a',
                    outIdx: 2,
                },
                blockHeight: 770363,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 9900n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '48ec9f7a4b7dfd5fbd419a70b748ded04e167778784e65a39c8edeb496b1f1de',
                    outIdx: 1,
                },
                blockHeight: 770363,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '157e0cdef5d5c51bdea00eac9ab821d809bb9d03cf98da85833614bedb129be6',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 82n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '07646eddeaa7c97431f3cf62c7ba4714473f4c7a6611740b9cac5d86c00f9a38',
                    outIdx: 2,
                },
                blockHeight: 770387,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 9989n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'c39cd34c68ccb43cf640dd09f639c1e0b46d47224722ce5f26151ace40c663b3',
                    outIdx: 2,
                },
                blockHeight: 772042,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'ccf5fe5a387559c8ab9efdeb0c0ef1b444e677298cfddf07671245ce3cb3c79f',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 42300000000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'd24e98159db1772819a76f1249f7190a9edb9924d0f7c5336b260f68b245a83a',
                    outIdx: 2,
                },
                blockHeight: 774343,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 999882000000000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'feafd053d4166601d42949a768b9c3e8ee1f27912fc84b6190aeb022fba7fa39',
                    outIdx: 2,
                },
                blockHeight: 776118,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '6e24e89b6d5284138c69777527760500b99614631bca7f2a5c38f4648dae9524',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 999999878n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '886da7de5f0143c8be863962e7345ea615cee30caec7532824641d0fd40cc5f2',
                    outIdx: 1,
                },
                blockHeight: 780736,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 2n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '886da7de5f0143c8be863962e7345ea615cee30caec7532824641d0fd40cc5f2',
                    outIdx: 2,
                },
                blockHeight: 780736,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 23n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'ce95a91b9d7ddc6efc6273f70d398cb18aeafe99fd75de6301406786d4d8be54',
                    outIdx: 2,
                },
                blockHeight: 780736,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 65n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'c04ae7f139eb16023a70d1bb39b1ae8745667edb09833e994a5b4d48976a111d',
                    outIdx: 2,
                },
                blockHeight: 782774,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'b9877d8f8d2364b983707df905d592f534a3ada18e52aa529a0f72fcc535abf7',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 3n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'f2859d3d19e741bb40e9207cc1109db730ca69c458c6c204d14c2ebe7603c966',
                    outIdx: 2,
                },
                blockHeight: 783389,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 123456844n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'ff5f864cfe257905e18f1db2dfd7f31b483e0ecdfe9a91391d21dd44a28e1803',
                    outIdx: 2,
                },
                blockHeight: 783638,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 995921n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '70ead4d94c43fe8c5576bb2528fd54380d8356f632ac962b1e03fb287607dfd4',
                    outIdx: 1,
                },
                blockHeight: 783693,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '70ead4d94c43fe8c5576bb2528fd54380d8356f632ac962b1e03fb287607dfd4',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 100n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'ff9aa6eebcd1331f8684d53b441cfa3060a4ffc403b417d5728de8ab231f5516',
                    outIdx: 1,
                },
                blockHeight: 783694,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'ff9aa6eebcd1331f8684d53b441cfa3060a4ffc403b417d5728de8ab231f5516',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 100n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'f077f207fc8a8557e5f0ffc6021685ab4b357e9b92d2b5c4192dcb7760ee6e29',
                    outIdx: 1,
                },
                blockHeight: 783695,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'f077f207fc8a8557e5f0ffc6021685ab4b357e9b92d2b5c4192dcb7760ee6e29',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 100n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'c2c6b5a7b37e983c4e193900fcde2b8139ef4c3db2fd9689c354f6ea65354f15',
                    outIdx: 2,
                },
                blockHeight: 784246,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '3adbf501e21c711d20118e003711168eb39f560c01f4c6d6736fa3f3fceaa577',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 999998999n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '27dee7774fdf4d5a268e498e6d9665bff2251a7049ef71b6d5671f395d8bd694',
                    outIdx: 1,
                },
                blockHeight: 784262,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '29793cfa3c533063211ad15f0567e6b815aab555aa8356388e2c96561d971644',
                    outIdx: 2,
                },
                blockHeight: 784460,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '3de671a7107d3803d78f7f4a4e5c794d0903a8d28d16076445c084943c1e2db8',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 2100n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'f6090755d5dcf233c1cf749c1433eabc0fb0722601101e981df67d44219325e6',
                    outIdx: 2,
                },
                blockHeight: 787547,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 2998978719999999999n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'e4d80b015e75fe2e54b5ef10571ce78c17086f96a7876d466f92d8c2a8c92b64',
                    outIdx: 2,
                },
                blockHeight: 792712,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 999824n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '6ffcc83e76226bd32821cc6862ce9b363b22594247a4e73ccf3701b0023592b2',
                    outIdx: 2,
                },
                blockHeight: 800716,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 999977636n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'fb70df00c07749082756054522d3f08691fd9caccd0e0abf736df23d22845a6e',
                    outIdx: 2,
                },
                blockHeight: 800716,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 5235120528888890n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '8f6676b602a9f074f10a7561fb7256bbce3b103a119f809a05485e42489d2233',
                    outIdx: 2,
                },
                blockHeight: 802851,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'b977630ae1b4a0fe3ab12385fdaaffd974e5bd352f2a817ce135c1ee6005a35d',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 75n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'b7f225b4c4e055a35c1e08ce5eea7c1f3cf53c44662d6d95b631504634b1a3d9',
                    outIdx: 2,
                },
                blockHeight: 802851,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'b977630ae1b4a0fe3ab12385fdaaffd974e5bd352f2a817ce135c1ee6005a35d',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 652n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '8a172dd9cd9eda533cdc731449c4d8728ab1924b843e5d5d2eda63535f7473d4',
                    outIdx: 2,
                },
                blockHeight: 803616,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '6376cae692cf0302ecdd63234c14cbb2b21cec75ab538335f90254cfb3ed44cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 78n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '1127651ed9d822cd4ba3ff30211d064116575fdb692c1352e59cab841e8caf4d',
                    outIdx: 2,
                },
                blockHeight: 803741,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '6376cae692cf0302ecdd63234c14cbb2b21cec75ab538335f90254cfb3ed44cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 43n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'a490c805218091549b2d802d6f0391c880cacd5145d0c516f62433637e49bd15',
                    outIdx: 1,
                },
                blockHeight: 824524,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 330000000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'f4f21422dbf0ad5fe455994ee4d791a9d2e127fdfb46aa87abc3c250312fbbd0',
                    outIdx: 2,
                },
                blockHeight: 824524,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 24999698951n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'd7c43e4eb6d341ac69b52f89125887b17d00a16872c01a9d47b39fd4e55d50cf',
                    outIdx: 1,
                },
                blockHeight: 825739,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '639a8dba34788ff3ebd3977d4ac045825394285ee648bb1d159e1c12b787ff25',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 1000000000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '2c791301f75284f8ae86707ab87f24f2394e4b92d81a4f59bed52b56eaf452e3',
                    outIdx: 1,
                },
                blockHeight: 825842,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '45f0ff5cae7e89da6b96c26c8c48a959214c5f0e983e78d0925f8956ca8848c6',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 5344445n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                    outIdx: 1,
                },
                blockHeight: 832625,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 1000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'a96f605eaf8b97889a73c5ee0e36597239f7fb17833a28076d2f3ca863f7ccfc',
                    outIdx: 1,
                },
                blockHeight: 832788,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 10000000000000000000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '423e24bf0715cfb80727e5e7a6ff7b9e37cb2f555c537ab06fdc7fd9b3a0ba3a',
                    outIdx: 1,
                },
                blockHeight: 833612,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 10000000000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '5167318214db9876a4095cae6d1d3b3e7a9af5467ee0e8344715ac12a2a871a9',
                    outIdx: 1,
                },
                blockHeight: 834541,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '79c5a1cec698350dd93f645fcae8d6ff3902b7cdc582839dfface3cb0c83d823',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 9899n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                    outIdx: 1,
                },
                blockHeight: 835482,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 21000000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'f18a297d1f2ab656ca284655704e07cf8ea269739f4d3af64c2dbd18bfe4d8ee',
                    outIdx: 1,
                },
                blockHeight: 836041,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '666c4318d1f7fef5f2c698262492c519018d4e9130f95d05f6be9f0fb7149e96',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 94n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'f37027d1560c62a845d15025e418bdd1d0b127bf6fcfb83dfd9e872eb66d0d09',
                    outIdx: 2,
                },
                blockHeight: 836041,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 4n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '583f0379a82249f86e1c19fef574ae3a499aa8d4b1980884ddf1c15d8bd50db3',
                    outIdx: 1,
                },
                blockHeight: 836456,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '9404761d1a01cca11c29eb8ed9ddc63966526d0eaa54f148e8862ab3e884132f',
                    outIdx: 1,
                },
                blockHeight: 836820,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '9404761d1a01cca11c29eb8ed9ddc63966526d0eaa54f148e8862ab3e884132f',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 55000000000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '0b1f0ecfe27292fb9f7031400d27d42b15ff13950635333c1a2774ba6e7eaa83',
                    outIdx: 1,
                },
                blockHeight: 837493,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '16b12bbacdbb8c8a799adbfd782bfff9843c1f9b0be148eaae02a1a7f74f95c4',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 844601876543211n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '79fae154e5c096321c656e167a71f4c2a043b2eac0af0f89301059c89c2c6b13',
                    outIdx: 2,
                },
                blockHeight: 837847,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 7700000000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '614efc82ae70823a1aa9d89327cd83c8f554317281afc7f908a35ad3f7167340',
                    outIdx: 1,
                },
                blockHeight: 838089,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '18625b25d4b9b9ebf23ee5575484a67ff2477873a253b16081f964b8f9ca7c28',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '344c74214af9e66ab760f55a9fbff301ed77803fc4f5d9d2c31720d5805c2927',
                    outIdx: 2,
                },
                blockHeight: 838098,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 8987n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '255349c31632d43693c3d891b3c537e004f21f2d1ea1b76fdb2f2d6929612556',
                    outIdx: 1,
                },
                blockHeight: 838183,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'b40d1f6acdb6ee68d7eca0167fe2753c076bc309b2e3b1af8bff70ca34b945b0',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 4999n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '3c844ed9f76207027a47dd2170a590a1f8d8a8ff9b797da4f050ad6394adf52a',
                    outIdx: 1,
                },
                blockHeight: 838312,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 112n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '97283f832815016e848612acf8a5d097089ed24bd62d407887b3be1d7aa8960f',
                    outIdx: 1,
                },
                blockHeight: 838367,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '97283f832815016e848612acf8a5d097089ed24bd62d407887b3be1d7aa8960f',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '97283f832815016e848612acf8a5d097089ed24bd62d407887b3be1d7aa8960f',
                    outIdx: 2,
                },
                blockHeight: 838367,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '97283f832815016e848612acf8a5d097089ed24bd62d407887b3be1d7aa8960f',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: true,
                    atoms: 0n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'c4c6565fa28e1d457ba01ee7d30ae2d6eac47d43190845281014ec3c4d848ee7',
                    outIdx: 1,
                },
                blockHeight: 839510,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '6a9305a13135625f4b533256e8d2e21a7343005331e1839348a39040f61e09d3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 33n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '4e478fca04ffdb207cce82bada5d3e8fb766892d5994fb20764739d57f31da97',
                    outIdx: 1,
                },
                blockHeight: 839792,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 1000000000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '6d177919e62e9efb84b05309079c0c55903838afe9c6dbde69f8ec152bf6bf0e',
                    outIdx: 1,
                },
                blockHeight: 839792,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'b39fdb53e21d67fa5fd3a11122f1452f15884047f2b80e8efe633c3b520b7a39',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '9e694e7fc3738975ce529ffa15937d6f192716059d32d663815c0d3f3682f1b5',
                    outIdx: 1,
                },
                blockHeight: 840030,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '9e694e7fc3738975ce529ffa15937d6f192716059d32d663815c0d3f3682f1b5',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 18446744073709551615n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'b0794f985a728aa65997e5606b79081aa20978d8a299da1d2ea709102f03a604',
                    outIdx: 1,
                },
                blockHeight: 840030,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'b0794f985a728aa65997e5606b79081aa20978d8a299da1d2ea709102f03a604',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 18446744073709551615n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'c3b56aef4744db0a9e21cd06dd3356bcdd7c1ca67fc132040c42b1f8c9c65419',
                    outIdx: 1,
                },
                blockHeight: 840030,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'c3b56aef4744db0a9e21cd06dd3356bcdd7c1ca67fc132040c42b1f8c9c65419',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 18446744073709551615n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '185cc0bdd6272f21ee09d9d5a1a17458af6b3ff968e371341d4b83d81540cdd7',
                    outIdx: 1,
                },
                blockHeight: 840237,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 3n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '4fb3b37c25c8a5cb43f0130435eb33c19b2fdaf4be98b113e580a66ec9340435',
                    outIdx: 2,
                },
                blockHeight: 840530,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: false,
                    atoms: 10010000n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '7d94a36482f6e8f5c6ed576212761a102ae4d106f06441fb8654e0ea6540f0b0',
                    outIdx: 2,
                },
                blockHeight: 840530,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    isMintBaton: true,
                    atoms: 0n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '1111111111111111111111111111111111111111111111111111111111111111',
                    outIdx: 1,
                },
                blockHeight: 840530,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                path: 1899,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '1111111111111111111111111111111111111111111111111111111111111111',
                    outIdx: 1,
                },
                blockHeight: 840530,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        'e2db39ade16e971afba2087bf6e29a83d7579137900eb73e5d955bdb769204bb',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                path: 1899,
                sats: 546n,
            },
        ],
        nonSlpUtxos: [
            {
                outpoint: {
                    txid: '4fb3b37c25c8a5cb43f0130435eb33c19b2fdaf4be98b113e580a66ec9340435',
                    outIdx: 3,
                },
                blockHeight: 840530,
                isCoinbase: false,
                sats: 97511071n,
                isFinal: true,
                path: 1899,
            },
        ],
        tokens: new Map([
            [
                'bf24d955f59351e738ecd905966606a6837e478e1982943d724eab10caad82fd',
                '1',
            ],
            [
                'dd84ca78db4d617221b58eabc6667af8fe2f7eadbfcc213d35be9f1b419beb8d',
                '1',
            ],
            [
                '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                '1',
            ],
            [
                'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
                '1200',
            ],
            [
                'e859eeb52e7afca6217fb36784b3b6d3c7386a52f391dd0d00f2ec03a5e8e77b',
                '1.0',
            ],
            [
                '8ead21ce4b3b9e7b57607b97b65b5013496dc6e3dfdea162c08ce7265a66ebc8',
                '1.00000000',
            ],
            [
                'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0',
                '311',
            ],
            [
                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                '504680.0000',
            ],
            [
                'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
                '.246913633',
            ],
            [
                '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917',
                '1699',
            ],
            [
                'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb',
                '.99999998',
            ],
            [
                'ccf5fe5a387559c8ab9efdeb0c0ef1b444e677298cfddf07671245ce3cb3c79f',
                '424.00000000',
            ],
            [
                '7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1',
                '1',
            ],
            [
                'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
                '19889',
            ],
            [
                '157e0cdef5d5c51bdea00eac9ab821d809bb9d03cf98da85833614bedb129be6',
                '82',
            ],
            [
                '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a',
                '999883.000000000',
            ],
            [
                '6e24e89b6d5284138c69777527760500b99614631bca7f2a5c38f4648dae9524',
                '999999878',
            ],
            [
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                '996012',
            ],
            [
                'b9877d8f8d2364b983707df905d592f534a3ada18e52aa529a0f72fcc535abf7',
                '3',
            ],
            [
                '70ead4d94c43fe8c5576bb2528fd54380d8356f632ac962b1e03fb287607dfd4',
                '100',
            ],
            [
                'ff9aa6eebcd1331f8684d53b441cfa3060a4ffc403b417d5728de8ab231f5516',
                '100',
            ],
            [
                'f077f207fc8a8557e5f0ffc6021685ab4b357e9b92d2b5c4192dcb7760ee6e29',
                '100',
            ],
            [
                '3adbf501e21c711d20118e003711168eb39f560c01f4c6d6736fa3f3fceaa577',
                '999998999',
            ],
            [
                '3de671a7107d3803d78f7f4a4e5c794d0903a8d28d16076445c084943c1e2db8',
                '21.00',
            ],
            [
                '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                '2998978719.999999999',
            ],
            [
                '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                '999824',
            ],
            [
                '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
                '999977636',
            ],
            [
                '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                '523512085.8888890',
            ],
            [
                'b977630ae1b4a0fe3ab12385fdaaffd974e5bd352f2a817ce135c1ee6005a35d',
                '727',
            ],
            [
                '6376cae692cf0302ecdd63234c14cbb2b21cec75ab538335f90254cfb3ed44cc',
                '121',
            ],
            [
                'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba',
                '24.999698951',
            ],
            [
                '639a8dba34788ff3ebd3977d4ac045825394285ee648bb1d159e1c12b787ff25',
                '1.000000000',
            ],
            [
                '45f0ff5cae7e89da6b96c26c8c48a959214c5f0e983e78d0925f8956ca8848c6',
                '53.44445',
            ],
            [
                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                '1000',
            ],
            [
                'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                '10000000000.000000000',
            ],
            [
                'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                '100000000.00',
            ],
            [
                '79c5a1cec698350dd93f645fcae8d6ff3902b7cdc582839dfface3cb0c83d823',
                '9899',
            ],
            [
                '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                '21000000',
            ],
            [
                '666c4318d1f7fef5f2c698262492c519018d4e9130f95d05f6be9f0fb7149e96',
                '94',
            ],
            [
                'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                '5',
            ],
            [
                '9404761d1a01cca11c29eb8ed9ddc63966526d0eaa54f148e8862ab3e884132f',
                '55.000000000',
            ],
            [
                '16b12bbacdbb8c8a799adbfd782bfff9843c1f9b0be148eaae02a1a7f74f95c4',
                '844601.876543211',
            ],
            [
                'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
                '770.0000000',
            ],
            [
                '18625b25d4b9b9ebf23ee5575484a67ff2477873a253b16081f964b8f9ca7c28',
                '1',
            ],
            [
                'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
                '8987',
            ],
            [
                'b40d1f6acdb6ee68d7eca0167fe2753c076bc309b2e3b1af8bff70ca34b945b0',
                '4999',
            ],
            [
                '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6',
                '112',
            ],
            [
                '97283f832815016e848612acf8a5d097089ed24bd62d407887b3be1d7aa8960f',
                '0.000000001',
            ],
            [
                '6a9305a13135625f4b533256e8d2e21a7343005331e1839348a39040f61e09d3',
                '33',
            ],
            [
                'b39fdb53e21d67fa5fd3a11122f1452f15884047f2b80e8efe633c3b520b7a39',
                '1',
            ],
            [
                '9e694e7fc3738975ce529ffa15937d6f192716059d32d663815c0d3f3682f1b5',
                '1844674407370955161.5',
            ],
            [
                'b0794f985a728aa65997e5606b79081aa20978d8a299da1d2ea709102f03a604',
                '1844674407370955.1615',
            ],
            [
                'c3b56aef4744db0a9e21cd06dd3356bcdd7c1ca67fc132040c42b1f8c9c65419',
                '1844674407370.9551615',
            ],
            [
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                '3',
            ],
            [
                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                '100100.00',
            ],
            [
                'e2db39ade16e971afba2087bf6e29a83d7579137900eb73e5d955bdb769204bb',
                '1',
            ],
            [
                '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                '1',
            ],
        ]),
        parsedTxHistory: [
            {
                txid: '4fb3b37c25c8a5cb43f0130435eb33c19b2fdaf4be98b113e580a66ec9340435',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '0381ae28ab1938c89683afbea5b40c9352acae97291ce2f287b2f07ab2662dea',
                            outIdx: 1,
                        },
                        inputScript:
                            '4830450221009a9c4098a8ed4b5931ff66ec5ecab91f877765dbc2098d181c2bd23b80624f4102204a557291fa03ce16b87f9c63adfa9a7bae01976c871e8ecb9cb599291992d701412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 8900n,
                        },
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: '8e2ec3b27b26fc9a75ce24858af7fad0d43c274d79f73e5c3862d9dedabfc7f0',
                            outIdx: 1,
                        },
                        inputScript:
                            '47304402203f6961f869a29932590309857947106f8c8743c9243ff6b9bbf42d263602e76d0220322df57c7f1e0e9ac9abf4380a4f9ec611fc0d2a41e13f89da169d70595f5fa4412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1000n,
                        },
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: '80baab3dc64a3922c8d3ca11bacc6af4f05b103e15e18e9ea7592d926612c829',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100c22c37e76fa9287a4f483ec6365d23ed7c183d57dbb34fbef1b85b5f853b03fc02206c512e08ae4c56b4d1e6bc793e36583bf4f6b18cda2c0d66796aa101ba4c24e8412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 10000n,
                        },
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: 'aa13c6f214ff58f36ed5e108a7f36d8f98729c50186b27a53b989c7f36fbf517',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022016c50d564beb53141475b40f6f8a6d293d991d92ea2cfea63598a2a28c22bb7602202ed5d105e1eac1b4544cbef32ab16953414d782290b30304b3dab1fd4a4ab3c7412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 9990000n,
                        },
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: '313a13c60491d6de89478a30379195b92591bff39e8f3184fd3a595842b8f2d6',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100911e802166e1da86307a596eda6389f0b9b2aeeaaebda15dc4fbb90b2f5382d7022039b29d16cdc748094e8bb5f321e7c1a981cd9d764240f033282accb972621663412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 100n,
                        },
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: '7d94a36482f6e8f5c6ed576212761a102ae4d106f06441fb8654e0ea6540f0b0',
                            outIdx: 1,
                        },
                        inputScript:
                            '47304402206ed93aed3cb97601f5d3c7fa61856393441b0c612fd36ab7c02694770963b4f102200184d69dbe32958163775975cdbbc5485245a07794a250229eec3d74216a56ff412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 100000000n,
                        },
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: '7d94a36482f6e8f5c6ed576212761a102ae4d106f06441fb8654e0ea6540f0b0',
                            outIdx: 3,
                        },
                        inputScript:
                            '47304402201532d4e8b70d074ccc996fb467febcb32dcfd64b88f97bba6607931fde979c4d02207dd94604b37b77e42552c348735aed7a8ea5f3d1c29e4751aa440f04f62dd768412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 97510108n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1080000000005f5e10008000000000098bd90',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 100000000n,
                        },
                        spentBy: {
                            txid: '93caf3748905f905f178238603a9595d68b2bf864f8dd3eb211d73d93cdbaa3d',
                            outIdx: 0,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 10010000n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 97511071n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713393875,
                size: 1217,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        txType: 'SEND',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                block: {
                    height: 840530,
                    hash: '0000000000000000248d6bde23611725c98c415a9246e28852187e6613e68998',
                    timestamp: 1713394342,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Sent,
                    satoshisSent: 546,
                    stackArray: [
                        '534c5000',
                        '01',
                        '53454e44',
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        '0000000005f5e100',
                        '000000000098bd90',
                    ],
                    recipients: [
                        'ecash:qzppgpav9xfls6zzyuqy7syxpqhnlqqa5u68m4qw6l',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: '7d94a36482f6e8f5c6ed576212761a102ae4d106f06441fb8654e0ea6540f0b0',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '0381ae28ab1938c89683afbea5b40c9352acae97291ce2f287b2f07ab2662dea',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100bd25833e31e8e0949a52a2d12cf096e0a8cadd7be5dbfa21a3049a98a936e05f0220568df8a60747f94c74a4d492d6b442f65a5d0b63c154ad09079ad89c0a5e8a77412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: true,
                            entryIdx: 0,
                            atoms: 0n,
                        },
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: 'fb6086e1e98f88fdef7abab312dfb68449d1b43d511e1f15c488a8cb804f1c51',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100c5704411451982cf6dfbe423c77d2be6ce3999681781344eaf00438b36cf88b1022002b1c4d6249170be38b691c2846c29e09dd15e6de489d72729ad84a2cc40e6d7412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 97511128n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c50000101044d494e5420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb10102080000000005f5e100',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 100000000n,
                        },
                        spentBy: {
                            txid: '4fb3b37c25c8a5cb43f0130435eb33c19b2fdaf4be98b113e580a66ec9340435',
                            outIdx: 5,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: true,
                            entryIdx: 0,
                            atoms: 0n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '4fb3b37c25c8a5cb43f0130435eb33c19b2fdaf4be98b113e580a66ec9340435',
                            outIdx: 6,
                        },
                        sats: 97510108n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713393855,
                size: 474,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        txType: 'MINT',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                block: {
                    height: 840530,
                    hash: '0000000000000000248d6bde23611725c98c415a9246e28852187e6613e68998',
                    timestamp: 1713394342,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Sent,
                    satoshisSent: 97511200,
                    stackArray: [
                        '534c5000',
                        '01',
                        '4d494e54',
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        '02',
                        '0000000005f5e100',
                    ],
                    recipients: [],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: 'fb6086e1e98f88fdef7abab312dfb68449d1b43d511e1f15c488a8cb804f1c51',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'aa13c6f214ff58f36ed5e108a7f36d8f98729c50186b27a53b989c7f36fbf517',
                            outIdx: 3,
                        },
                        inputScript:
                            '483045022100a38edd91b2a69b3f8724972b2fbb16a5e9ec5ddd6d5f5c709493bec2d0692d400220075b65ffd9cd61a1ee76c40e77ee85ff55d3a3e6ba0e84aa940c4e774b2434d2412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 2872n,
                    },
                    {
                        prevOut: {
                            txid: '313a13c60491d6de89478a30379195b92591bff39e8f3184fd3a595842b8f2d6',
                            outIdx: 3,
                        },
                        inputScript:
                            '47304402201c148e93b1f610125cf1055af515a4d9895dada109c3ddbb4a64d35ee0be01c902200b9b4b3fd7a4db4a8125743f298fc96e1c83b7061cec83a20533b90c3d145b17412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 112409506n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        spentBy: {
                            txid: 'b01def0a01ae29f905298af3f9e496dd630ed205d14d2b11f5bba0d50f9a9a08',
                            outIdx: 1,
                        },
                        sats: 14900876n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '7d94a36482f6e8f5c6ed576212761a102ae4d106f06441fb8654e0ea6540f0b0',
                            outIdx: 1,
                        },
                        sats: 97511128n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713393807,
                size: 373,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 840530,
                    hash: '0000000000000000248d6bde23611725c98c415a9246e28852187e6613e68998',
                    timestamp: 1713394342,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Sent,
                    satoshisSent: 14900876,
                    stackArray: [],
                    recipients: [
                        'ecash:qzppgpav9xfls6zzyuqy7syxpqhnlqqa5u68m4qw6l',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: '313a13c60491d6de89478a30379195b92591bff39e8f3184fd3a595842b8f2d6',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '4b5b2a0f8bcacf6bccc7ef49e7f82a894c9c599589450eaeaf423e0f5926c38e',
                            outIdx: 1,
                        },
                        inputScript:
                            '47304402202af39ca462ee08a32e7984d629ebf704cfa6342deb5a85d4962cba040400d23302207a6f54568437e03ad786242bc4f8fbac825136f0f3f81acab16ba13ecfe303c5412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 100n,
                        },
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: 'dd9018d0037fee4094c2445b23ed9eef65d456db3f2b9c053ad39ee6505fca44',
                            outIdx: 1,
                        },
                        inputScript:
                            '473044022073f20d5d3c4575b8b06e4a71e5e33ccf8cee8ccc4ae3b23552f7db0f9fc3cb4202200297d074d2d67c2b06c7243057951c46140c276edd538ab7a4d8665c00bf7efb412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 10000n,
                        },
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: '8b52c1b2bc9be9077ed2c73b17f11ce3ebb59b70e105234a720c1631eea286c8',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100affdf4978adb42d4995114ea175aa4094e14f25f73bcbeb22689a2f25819ac3002202da51d160fb29abca76bbd0e70fc460ff072cf3f4d35d1617904817dd3ce46bd412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 112410135n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1080000000000002710080000000000000064',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 10000n,
                        },
                        spentBy: {
                            txid: 'f35f1d584acdcef33ce86ae28925458ff792559c47857d425fe75fb0395db701',
                            outIdx: 0,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 100n,
                        },
                        spentBy: {
                            txid: '4fb3b37c25c8a5cb43f0130435eb33c19b2fdaf4be98b113e580a66ec9340435',
                            outIdx: 4,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: 'fb6086e1e98f88fdef7abab312dfb68449d1b43d511e1f15c488a8cb804f1c51',
                            outIdx: 1,
                        },
                        sats: 112409506n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713392130,
                size: 627,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        txType: 'SEND',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                block: {
                    height: 840524,
                    hash: '00000000000000000dc214713fb8afc4aeacac08c696cbf9cba5799c7d7e49bd',
                    timestamp: 1713392944,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Sent,
                    satoshisSent: 546,
                    stackArray: [
                        '534c5000',
                        '01',
                        '53454e44',
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        '0000000000002710',
                        '0000000000000064',
                    ],
                    recipients: [
                        'ecash:qzppgpav9xfls6zzyuqy7syxpqhnlqqa5u68m4qw6l',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: '80baab3dc64a3922c8d3ca11bacc6af4f05b103e15e18e9ea7592d926612c829',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'aa13c6f214ff58f36ed5e108a7f36d8f98729c50186b27a53b989c7f36fbf517',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100b3d201ce34fce4807a0ab776db473c80e76b4f5fb800ee9c950a38434fe149fc0220694356ff2841b3d0ff14858dab5a97e3205ef9ef889833ee5120bfc71aef5afb41210353f81d61d41d6e22c73ab449476113dea124afe3972991cd237e654f15950b7c',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 10000n,
                        },
                        outputScript:
                            '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: '8b52c1b2bc9be9077ed2c73b17f11ce3ebb59b70e105234a720c1631eea286c8',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100def98fe39629278379cd5d011b8ab896e8ff20af983a0ec3a04a1872fa8cfc1d02205c95f7474b78d3821e3104dce3e8b15af0b36452451eb85983313c573238f0a741210353f81d61d41d6e22c73ab449476113dea124afe3972991cd237e654f15950b7c',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        sats: 100000n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1080000000000002710',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 10000n,
                        },
                        spentBy: {
                            txid: '4fb3b37c25c8a5cb43f0130435eb33c19b2fdaf4be98b113e580a66ec9340435',
                            outIdx: 2,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        spentBy: {
                            txid: 'f35f1d584acdcef33ce86ae28925458ff792559c47857d425fe75fb0395db701',
                            outIdx: 1,
                        },
                        sats: 99562n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713384542,
                size: 438,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        txType: 'SEND',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                block: {
                    height: 840499,
                    hash: '000000000000000035b621834b4408d0b1a8da7d975cb14c0b9330d1e2398d8b',
                    timestamp: 1713384866,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Received,
                    satoshisSent: 546,
                    stackArray: [
                        '534c5000',
                        '01',
                        '53454e44',
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        '0000000000002710',
                    ],
                    recipients: [
                        'ecash:qzppgpav9xfls6zzyuqy7syxpqhnlqqa5u68m4qw6l',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: '8b52c1b2bc9be9077ed2c73b17f11ce3ebb59b70e105234a720c1631eea286c8',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '993a634141e8428ff8ec519bf96287ffc72de5bec0d56a832a18c7aaaf543302',
                            outIdx: 0,
                        },
                        inputScript:
                            '473044022014504fa4841a91e50a3e48fd671b76133354a3f6c784b397984de3b72682cc280220287f9c61f9323da0e0e17e819c94b765c4a58f707d31e67baf0414f9550efc6d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 2200n,
                    },
                    {
                        prevOut: {
                            txid: 'b37d047060424681b914496e683c6c9f255b77eb09232368c28d55d560f3a324',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402204c8f88e31740207c2cde15d8f62e5b9a2888d6cf4c745105d804a0ccc7bd321a0220091f177c1e190e543963213e4a442ecc5fa1737aa50a3c72f5a3c7f8c683b78b412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 3300n,
                    },
                    {
                        prevOut: {
                            txid: '0073e74617e57959dbf114be355e83ea4401f25c6bc7aa550deae852788f7bfd',
                            outIdx: 1,
                        },
                        inputScript:
                            '4730440220583e29a8409e3e543e41706a4d7b20a8930dae28a94f5e0b88b7834fe47147a202201a2a4fc1f5d1c6b4e466d44e168d596ff9d55052c20e1d242ed09799bf426446412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 3300n,
                    },
                    {
                        prevOut: {
                            txid: '228487a363d841c531feeb0a6ef7ed8825888d57f8e6c42bea911bfb192dd26d',
                            outIdx: 0,
                        },
                        inputScript:
                            '4730440220532fd0e44539838bbd461d81a9c22f3abbb069aa9ca031945ea660d31d49533f022059535b4da01d876910e79affe3c6924491959fba1948fe3c26b423d33cb2a144412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 3300n,
                    },
                    {
                        prevOut: {
                            txid: 'f67081fbc94ffe25c36f8ad007ee280a4d935489effd8ec60b7c8e9be57888d5',
                            outIdx: 1,
                        },
                        inputScript:
                            '473044022015514f1729be1458981512d1c9d2ef627320d532ad8c0bc30600088fb0d567fd02202f09d9db49ba637e52eb30a42131fa5ed61b7eeb553baeeb9a6d0301bdc5be54412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: '2c1b0dea56fb660ddfb9fd87734118437ec12bec6b884210724ced813ce66cc8',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100a4515e9c6f5ee2330d8835f86d1104812d6f7496ed879e6d61d6118b5073cc1b02201b0aeab935ed7404813bca6a2cc3762062e13b778c8488b493c17f91d7c62ee9412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 3300n,
                    },
                    {
                        prevOut: {
                            txid: '85baae6a594ba3414e62974a41987dcef1e3bb0a0eb4bcd1a92a510885be44e7',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100e32fb5d3afef0aebe1f7547e284f953d14da3de49c86164b0fc85d6e4cb3ef4902201cac811ad621c99248b5154a3e4d25a55d1240e1ac8aa0dc7dcf1cde18ae9532412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 3500n,
                    },
                    {
                        prevOut: {
                            txid: 'c9d93d05dbb03ab054e85ff83f675b204660199327331c460cc4690d17e094e2',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100d720e9d5e91d3b601ac45f5d430c71a87630672adb501c48c060e5edf37079f002203309785c97f2788d1a72c54e052b2560e695f5a13460e1685b8c86ab45c70885412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 112491951n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        spentBy: {
                            txid: '80baab3dc64a3922c8d3ca11bacc6af4f05b103e15e18e9ea7592d926612c829',
                            outIdx: 1,
                        },
                        sats: 100000n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '313a13c60491d6de89478a30379195b92591bff39e8f3184fd3a595842b8f2d6',
                            outIdx: 2,
                        },
                        sats: 112410135n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713384516,
                size: 1257,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 840499,
                    hash: '000000000000000035b621834b4408d0b1a8da7d975cb14c0b9330d1e2398d8b',
                    timestamp: 1713384866,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Sent,
                    satoshisSent: 100000,
                    stackArray: [],
                    recipients: [
                        'ecash:qzppgpav9xfls6zzyuqy7syxpqhnlqqa5u68m4qw6l',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: 'aa13c6f214ff58f36ed5e108a7f36d8f98729c50186b27a53b989c7f36fbf517',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100f7f2eac186605f5d37a038b17367a4b6fc5458ca7485ce6b77baf19b4160bcd8022029b5ef41a2ebb4642e9802d32a1649d84c7daf2e978c32ebc7342b90e9427cc1412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 10000000n,
                        },
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: 'd8a081bed886b085194410fd879286393734f428c9f64d9ece1c0afffb2695a2',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100b0404d5d553867df9ed190ce52ec13565aaf6e3c8986b712c150acac6d3853f70220727abe6d27a333f72249a08f3b40cd15346c6096466b6118248f92279201b5f7412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 3899n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1080000000000002710080000000000986f70',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 10000n,
                        },
                        spentBy: {
                            txid: '80baab3dc64a3922c8d3ca11bacc6af4f05b103e15e18e9ea7592d926612c829',
                            outIdx: 0,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        token: {
                            tokenId:
                                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 9990000n,
                        },
                        spentBy: {
                            txid: '4fb3b37c25c8a5cb43f0130435eb33c19b2fdaf4be98b113e580a66ec9340435',
                            outIdx: 3,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: 'fb6086e1e98f88fdef7abab312dfb68449d1b43d511e1f15c488a8cb804f1c51',
                            outIdx: 0,
                        },
                        sats: 2872n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713384502,
                size: 481,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        txType: 'SEND',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                block: {
                    height: 840499,
                    hash: '000000000000000035b621834b4408d0b1a8da7d975cb14c0b9330d1e2398d8b',
                    timestamp: 1713384866,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Sent,
                    satoshisSent: 546,
                    stackArray: [
                        '534c5000',
                        '01',
                        '53454e44',
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        '0000000000002710',
                        '0000000000986f70',
                    ],
                    recipients: [
                        'ecash:qzppgpav9xfls6zzyuqy7syxpqhnlqqa5u68m4qw6l',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: '85baae6a594ba3414e62974a41987dcef1e3bb0a0eb4bcd1a92a510885be44e7',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '56e7d3b268e6ecff59e5ddc47af000351fa8e451b4bd668ac08b9c40b2d323b9',
                            outIdx: 2,
                        },
                        inputScript:
                            '47304402205c644dac10bbd0cc7b72a39f76803e49c4ef5b34a1e211e77bbad0b6fe79986f02204c562e4e567cd778b2cf5ce579a673846226fa20a1df32c2046ac80b4dcb83774121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                        sats: 44081133n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '8b52c1b2bc9be9077ed2c73b17f11ce3ebb59b70e105234a720c1631eea286c8',
                            outIdx: 6,
                        },
                        sats: 3500n,
                    },
                    {
                        outputScript:
                            '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                        sats: 44077178n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713325314,
                size: 225,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 840433,
                    hash: '00000000000000002b65f361a83af2188ef1a1863166b61bf3f4cf3a31aae8e2',
                    timestamp: 1713325389,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Received,
                    satoshisSent: 3500,
                    stackArray: [],
                    recipients: [
                        'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: 'c9d93d05dbb03ab054e85ff83f675b204660199327331c460cc4690d17e094e2',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '83df946b2adab3ca9bd3da4e406f5a5494738532fe4da2f8a55a775080ea3d31',
                            outIdx: 7,
                        },
                        inputScript:
                            '483045022100db79043fdea632ea235b0310c145119c13ad20a18eaefa3e5ede437987b84d050220483e4069e9ddbd02e52b138e2bd317cb78c5d5cac53fb62e76d6fde91c6a2d08412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 112494377n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                        sats: 2200n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '8b52c1b2bc9be9077ed2c73b17f11ce3ebb59b70e105234a720c1631eea286c8',
                            outIdx: 7,
                        },
                        sats: 112491951n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713325296,
                size: 226,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 840433,
                    hash: '00000000000000002b65f361a83af2188ef1a1863166b61bf3f4cf3a31aae8e2',
                    timestamp: 1713325389,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Sent,
                    satoshisSent: 2200,
                    stackArray: [],
                    recipients: [
                        'ecash:qqxefwshnmppcsjp0fc6w7rnkdsexc7cagdus7ugd0',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: '2c1b0dea56fb660ddfb9fd87734118437ec12bec6b884210724ced813ce66cc8',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'f67081fbc94ffe25c36f8ad007ee280a4d935489effd8ec60b7c8e9be57888d5',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022001817a057685873e3a02cea695f4d13e9a7a4bbb1477da41d10e1ac6673ae81b022047339ed9b3b1d46d48a7186af023f99c02683be26cefb9a67b81b954f9045941412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 4954677n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '8b52c1b2bc9be9077ed2c73b17f11ce3ebb59b70e105234a720c1631eea286c8',
                            outIdx: 5,
                        },
                        sats: 3300n,
                    },
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 4950922n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713289173,
                size: 225,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 840369,
                    hash: '0000000000000000277b46dec1b257e7263ee60265d9fcc71b314df14653998d',
                    timestamp: 1713289283,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Received,
                    satoshisSent: 3300,
                    stackArray: [],
                    recipients: [
                        'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: 'f67081fbc94ffe25c36f8ad007ee280a4d935489effd8ec60b7c8e9be57888d5',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '228487a363d841c531feeb0a6ef7ed8825888d57f8e6c42bea911bfb192dd26d',
                            outIdx: 1,
                        },
                        inputScript:
                            '473044022075c9fab550a514fb0acddf1b354099dcb58c803f3fc5d5d1be0949bf89320f0502204acfff31d5ceb1fe8fcc4a4e82218dea13d74422a7955e134a61a37e24885811412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 4955730n,
                    },
                ],
                outputs: [
                    {
                        outputScript: '6a04007461620a66696e616c697a696e67',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '8b52c1b2bc9be9077ed2c73b17f11ce3ebb59b70e105234a720c1631eea286c8',
                            outIdx: 4,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '2c1b0dea56fb660ddfb9fd87734118437ec12bec6b884210724ced813ce66cc8',
                            outIdx: 0,
                        },
                        sats: 4954677n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713277179,
                size: 251,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 840343,
                    hash: '0000000000000000203af5adb7c5ebafe7e91a4ebb83b5924386bfdbe30f0e2b',
                    timestamp: 1713278396,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Received,
                    satoshisSent: 546,
                    stackArray: ['00746162', '66696e616c697a696e67'],
                    recipients: [
                        'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: '228487a363d841c531feeb0a6ef7ed8825888d57f8e6c42bea911bfb192dd26d',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '0073e74617e57959dbf114be355e83ea4401f25c6bc7aa550deae852788f7bfd',
                            outIdx: 2,
                        },
                        inputScript:
                            '47304402200be288a1814a0bc0751a8e443eb74d283e9f0baa135010a1e21b15e7ee58197c022047478418d5a48a064c4a3043aaeb2c008543776ef07355f2771c2e2e930f9a59412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 4959485n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '8b52c1b2bc9be9077ed2c73b17f11ce3ebb59b70e105234a720c1631eea286c8',
                            outIdx: 3,
                        },
                        sats: 3300n,
                    },
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: 'f67081fbc94ffe25c36f8ad007ee280a4d935489effd8ec60b7c8e9be57888d5',
                            outIdx: 0,
                        },
                        sats: 4955730n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713274636,
                size: 225,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 840340,
                    hash: '00000000000000000f924a5abaa971e7731dc55b8ce20fa9350a46c1b730b882',
                    timestamp: 1713274758,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Received,
                    satoshisSent: 3300,
                    stackArray: [],
                    recipients: [
                        'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: '0073e74617e57959dbf114be355e83ea4401f25c6bc7aa550deae852788f7bfd',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'b37d047060424681b914496e683c6c9f255b77eb09232368c28d55d560f3a324',
                            outIdx: 1,
                        },
                        inputScript:
                            '47304402203393d6b9903aae9175ba9831e0197c8e96859034f9d5ac79bed49b6396cce79002203dac68c34b52e46034ccb187a73e8b08c28082cc78eaa13b6ec59fa473568521412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 4963348n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04007461622674657374696e67206176616c616e6368652066696e616c697a656420747820686973746f7279',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '8b52c1b2bc9be9077ed2c73b17f11ce3ebb59b70e105234a720c1631eea286c8',
                            outIdx: 2,
                        },
                        sats: 3300n,
                    },
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '228487a363d841c531feeb0a6ef7ed8825888d57f8e6c42bea911bfb192dd26d',
                            outIdx: 0,
                        },
                        sats: 4959485n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713268788,
                size: 279,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 840335,
                    hash: '00000000000000002bca9ce259a2e0913a92fbff00cd822253053518421fa141',
                    timestamp: 1713270512,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Received,
                    satoshisSent: 3300,
                    stackArray: [
                        '00746162',
                        '74657374696e67206176616c616e6368652066696e616c697a656420747820686973746f7279',
                    ],
                    recipients: [
                        'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: 'b37d047060424681b914496e683c6c9f255b77eb09232368c28d55d560f3a324',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '185cc0bdd6272f21ee09d9d5a1a17458af6b3ff968e371341d4b83d81540cdd7',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100b527adaa6310884771e286c3152e2942f584bf698c5ccdac9678c0f9dbec979f022077346d14477adc9891ea0c4e5701ff84274e366e4e64711a2b46d21f3699cc64412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 668n,
                    },
                    {
                        prevOut: {
                            txid: 'd8a081bed886b085194410fd879286393734f428c9f64d9ece1c0afffb2695a2',
                            outIdx: 0,
                        },
                        inputScript:
                            '473044022044b3ce9e8a443300b9e9c3d0739554b627eadb48c1cb47904b2f6545347970eb022002ea69d239498e09b9fe2d0c12c6179a54f120765bf874f986d12aa8a040ea81412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: '993a634141e8428ff8ec519bf96287ffc72de5bec0d56a832a18c7aaaf543302',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100e9180af3b4a30a6b260ed934559e8fa7acea487907f607560ed22f07f4cd92a602203b874888634813a218bf358050759b26c12a48df4f64a8f1ba9034a484e5bb96412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 4966484n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '8b52c1b2bc9be9077ed2c73b17f11ce3ebb59b70e105234a720c1631eea286c8',
                            outIdx: 1,
                        },
                        sats: 3300n,
                    },
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '0073e74617e57959dbf114be355e83ea4401f25c6bc7aa550deae852788f7bfd',
                            outIdx: 0,
                        },
                        sats: 4963348n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713267426,
                size: 521,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 840334,
                    hash: '0000000000000000234e3b649b952014149a5e88f44a84ed8f7b846f15fd9a61',
                    timestamp: 1713267975,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Received,
                    satoshisSent: 3300,
                    stackArray: [],
                    recipients: [
                        'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: '993a634141e8428ff8ec519bf96287ffc72de5bec0d56a832a18c7aaaf543302',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'bb18ea2566cab82ed6862efbcff05c99d720b4e99845365c0a8d884b55f8fd5f',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100f194668e2d0c29742a1f959b1447de0604752cf6ad73569315b23e83c9450557022074001cdc88d6f21a0c3f1988515a2a04e417993e96c6dbc8dc205eed3b78442d412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 4969139n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '8b52c1b2bc9be9077ed2c73b17f11ce3ebb59b70e105234a720c1631eea286c8',
                            outIdx: 0,
                        },
                        sats: 2200n,
                    },
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: 'b37d047060424681b914496e683c6c9f255b77eb09232368c28d55d560f3a324',
                            outIdx: 2,
                        },
                        sats: 4966484n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713225454,
                size: 226,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 840264,
                    hash: '00000000000000001a036ba6ec1cf775cdaf890c2814d1fb8160236034014ff5',
                    timestamp: 1713227574,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Received,
                    satoshisSent: 2200,
                    stackArray: [],
                    recipients: [
                        'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: 'd8a081bed886b085194410fd879286393734f428c9f64d9ece1c0afffb2695a2',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'b05e7bbd402c0e04c192c532e5e35a3e3fb926d698c7eff8140fe304382af7b9',
                            outIdx: 1,
                        },
                        inputScript:
                            '473044022040c2a7becb3f92d93d80e654a1a75dab014db97c9fd4a07d62eb33aea2ac96e8022039ce536f6beeb913e45f9bb66e73c0d58bea3e4a385138981f2ac3a5b10dd291412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 550n,
                    },
                    {
                        prevOut: {
                            txid: '83df946b2adab3ca9bd3da4e406f5a5494738532fe4da2f8a55a775080ea3d31',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100f9450b18a10ea812c3ffc364d30f09b11e8b29bff589b852b39499d55a32fc4002202332a4cd95b543838282ee0a3841f4e14dd9b58f8cf70048bb01718b616c6fe4412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 4269n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: 'b37d047060424681b914496e683c6c9f255b77eb09232368c28d55d560f3a324',
                            outIdx: 1,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: 'aa13c6f214ff58f36ed5e108a7f36d8f98729c50186b27a53b989c7f36fbf517',
                            outIdx: 1,
                        },
                        sats: 3899n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713215165,
                size: 373,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 840260,
                    hash: '0000000000000000039a926e889bcca1771fbe710f327691e3713d0f0388f523',
                    timestamp: 1713216844,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Sent,
                    satoshisSent: 546,
                    stackArray: [],
                    recipients: [
                        'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: '83df946b2adab3ca9bd3da4e406f5a5494738532fe4da2f8a55a775080ea3d31',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '1efbeeb65c4bd31abd6d865d09b422c3ce7328b14e068ec75a8a218ced89300e',
                            outIdx: 1,
                        },
                        inputScript:
                            '4730440220419ca5831e327778a182a29e74933eea793b5e29302a6fcf7df9aae90f2769fb0220012de904e74fa2b09cbd12e7983a1e3a952f16d1a28d14afb5442ecfed0e5c9d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 550n,
                    },
                    {
                        prevOut: {
                            txid: '49856f9917f158af4b13c67455439fc2abaf22f2b7b561297144c65b62708b81',
                            outIdx: 1,
                        },
                        inputScript:
                            '47304402207035c52fafabfdb801f23864dbddc6d0fd8786d11f9bc043779734fc209f6656022078c118b885eefbb9577f5b5dc85390a6930336158813298fec760650fffd4693412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 550n,
                    },
                    {
                        prevOut: {
                            txid: 'f7cec7b4f8ec4b9863c1f4ad30a2006169286db571b29550d87f5ff0da096dcd',
                            outIdx: 1,
                        },
                        inputScript:
                            '4730440220130c5767c4a5fe03841b8382f00544e4d32b796de881d153f7a195277ee2a90c02203304a27609f5ea996917292c8ffcb8cbff1f6d77093f63430dd909ae4644ea5b412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: 'bb18ea2566cab82ed6862efbcff05c99d720b4e99845365c0a8d884b55f8fd5f',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100c855f8cccf2aa2f94c93b0e11419090f0685484134e3cea6e36f692c3057526702206c9d77279873dc16069a01d48be902249a70265814f83133d6cb51db4cf2f9ac412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 3300n,
                    },
                    {
                        prevOut: {
                            txid: '9e694e7fc3738975ce529ffa15937d6f192716059d32d663815c0d3f3682f1b5',
                            outIdx: 2,
                        },
                        inputScript:
                            '483045022100f8783e83fb1ba78ff2cb1bbc6a0032b7658c17f66a33610718726a0b0e462eac0220461749498d83bd8b19c800d3595fa64371a7f53f54ecf2fafad5f7f0932e92d7412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 1354n,
                    },
                    {
                        prevOut: {
                            txid: 'c3b56aef4744db0a9e21cd06dd3356bcdd7c1ca67fc132040c42b1f8c9c65419',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022032709d0e9b5651e037ff4fbeea15a6ce6eef909b37585bfe7490536d6c5ae1c9022017954addf6e6305a6a60dbcbcfbcff96b7da386ccdc5355b391a7657510beed3412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 112544758n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a0464726f702050d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a914a5417349420ec53b27522fed1a63b1672c0f28ff88ac',
                        sats: 12807n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: 'd8a081bed886b085194410fd879286393734f428c9f64d9ece1c0afffb2695a2',
                            outIdx: 1,
                        },
                        sats: 4269n,
                    },
                    {
                        outputScript:
                            '76a914d4fa9121bcd065dd93e58831569cf51ef5a74f6188ac',
                        sats: 12807n,
                    },
                    {
                        outputScript:
                            '76a914c1aadc99f96fcfcfe5642ca29a53e701f0b801c388ac',
                        sats: 4269n,
                    },
                    {
                        outputScript:
                            '76a914a714013e6336a0378a1f71ade875b2138813a3ec88ac',
                        sats: 17076n,
                    },
                    {
                        outputScript:
                            '76a914ee8cbaa5642d1c5d1af1503edda6a55044e8106e88ac',
                        sats: 4269n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: 'c9d93d05dbb03ab054e85ff83f675b204660199327331c460cc4690d17e094e2',
                            outIdx: 0,
                        },
                        sats: 112494377n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713214152,
                size: 1180,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 840258,
                    hash: '0000000000000000206e36055520619fd93f187ce67049e77134d9cdc77aa48c',
                    timestamp: 1713214540,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Sent,
                    satoshisSent: 51228,
                    stackArray: [
                        '64726f70',
                        '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                    ],
                    recipients: [
                        'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
                        'ecash:qr204yfphngxthvnukyrz45u7500tf60vyqspva5a6',
                        'ecash:qrq64hyel9hulnl9vsk29xjnuuqlpwqpcv6mk9pqly',
                        'ecash:qzn3gqf7vvm2qdu2rac6m6r4kgfcsyaras7jfqja3m',
                        'ecash:qrhgew49vsk3chg679grahdx54gyf6qsdcurky8xms',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: '185cc0bdd6272f21ee09d9d5a1a17458af6b3ff968e371341d4b83d81540cdd7',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '17edc94a524f4fbe6673f7e0719d37c1ba5f392c6993456424049f3fc09b62a9',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100d4a2eeb012456186bfe22b7653664a1de29596c67e59b109ea9fe25af63b94ae0220288c31fbf49fc870c66011b784476bf7704b95e2d8ad47597173a4c14bb17fbf412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: '6605bb88f89bf0d4df6006c6b2c2498e1261ea770dc3fffc91e2248e51b9b026',
                            outIdx: 1,
                        },
                        inputScript:
                            '473044022034309ad3a4f18eb953a5d9b36e02bd4b85a6c8c885d8c3d83467c02b3999159802200c5ee31b15afc8ffc11b84169a95d571dae3b983d3ca7f578cda02abddefa1ad412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: '94bf7fb1b2d37fed71085f9f32415f7426ed7cde692b9a9320ff6c811aa2db74',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100e4a4cdb74a8c4950febd1609ad991a76e40700726f0229352c316af8f800333b0220442ab534fadf3dc874e0a0adf9e0dd4da06efa1d0ff190348928bcb3e7879514412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 1n,
                        },
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 546n,
                    },
                    {
                        prevOut: {
                            txid: '49856f9917f158af4b13c67455439fc2abaf22f2b7b561297144c65b62708b81',
                            outIdx: 2,
                        },
                        inputScript:
                            '4830450221009ec6fca46fc588f61b2183a90bf77078b3203c2cb1bfa3bae55cffad1d42dbdf0220165989031ebaa54573bf7275c657e319822b714044d66927be060e61266d921b412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 1052n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c500001010453454e44203fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109080000000000000003',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        token: {
                            tokenId:
                                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 3n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: 'b37d047060424681b914496e683c6c9f255b77eb09232368c28d55d560f3a324',
                            outIdx: 0,
                        },
                        sats: 668n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713187945,
                size: 733,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        txType: 'SEND',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                block: {
                    height: 840237,
                    hash: '00000000000000002cc404f4a2c0327a2d9e1e42d29fe6d6946eae00e5eadd4f',
                    timestamp: 1713188909,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Received,
                    satoshisSent: 546,
                    stackArray: [
                        '534c5000',
                        '01',
                        '53454e44',
                        '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                        '0000000000000003',
                    ],
                    recipients: [
                        'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    ],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: 'b05e7bbd402c0e04c192c532e5e35a3e3fb926d698c7eff8140fe304382af7b9',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '1efbeeb65c4bd31abd6d865d09b422c3ce7328b14e068ec75a8a218ced89300e',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022063a275d60a80f247d01061789adda57130c04a837285c145ec9653468ae14beb02202684d99dc0e33a371caa084b36a8cfa7c1695180664171deb5c04a6ed9468fb5412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        sats: 1339n,
                    },
                ],
                outputs: [
                    {
                        outputScript: '6a04636861740474657374',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: 'd8a081bed886b085194410fd879286393734f428c9f64d9ece1c0afffb2695a2',
                            outIdx: 0,
                        },
                        sats: 550n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1713016209,
                size: 211,
                isCoinbase: false,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
                block: {
                    height: 840122,
                    hash: '000000000000000017c3805e03ec4153b158452be04f2df1450f0ad337c07ebe',
                    timestamp: 1713016680,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Received,
                    satoshisSent: 550,
                    stackArray: ['63686174', '74657374'],
                    recipients: [],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
            {
                txid: '9e694e7fc3738975ce529ffa15937d6f192716059d32d663815c0d3f3682f1b5',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: 'ffeec164aa32f9a1e3cdff4d5b1ee17ca4761291ede89bcf149020171886c6dc',
                            outIdx: 0,
                        },
                        inputScript:
                            '473044022015da9381d87b0954dd047882b440a1c9357109f5b6fd83abc93e226772a0331702206c50261655afb351c9ff3049171f705103717e7fe031391644fccf824d910269412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        sats: 2200n,
                    },
                ],
                outputs: [
                    {
                        outputScript:
                            '6a04534c500001010747454e45534953024d67094d61676e657369756d1468747470733a2f2f636173687461622e636f6d2f4c0001014c0008ffffffffffffffff',
                        sats: 0n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        token: {
                            tokenId:
                                '9e694e7fc3738975ce529ffa15937d6f192716059d32d663815c0d3f3682f1b5',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            isMintBaton: false,
                            entryIdx: 0,
                            atoms: 18446744073709551615n,
                        },
                        sats: 546n,
                    },
                    {
                        outputScript:
                            '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                        spentBy: {
                            txid: '83df946b2adab3ca9bd3da4e406f5a5494738532fe4da2f8a55a775080ea3d31',
                            outIdx: 4,
                        },
                        sats: 1354n,
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1712879286,
                size: 299,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            '9e694e7fc3738975ce529ffa15937d6f192716059d32d663815c0d3f3682f1b5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        txType: 'GENESIS',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        burnsMintBatons: false,
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                block: {
                    height: 840030,
                    hash: '000000000000000004e831e42308b70404225ed112f84e34df1e048a12e3aeac',
                    timestamp: 1712880601,
                },
                isFinal: true,
                parsed: {
                    xecTxType: XecTxType.Sent,
                    satoshisSent: 1900,
                    stackArray: [
                        '534c5000',
                        '01',
                        '47454e45534953',
                        '4d67',
                        '4d61676e657369756d',
                        '68747470733a2f2f636173687461622e636f6d2f',
                        '',
                        '01',
                        '',
                        'ffffffffffffffff',
                    ],
                    recipients: [],
                    appActions: [],
                    parsedTokenEntries: [],
                },
            },
        ],
    },
    mnemonic: 'army army army army army army army army army army army army',
    paths: new Map([
        [
            1899,
            {
                address: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                hash: '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
                wif: '',
                sk: new Uint8Array(),
                pk: new Uint8Array(),
            },
        ],
    ]) as unknown as CashtabWalletPaths,
    name: 'Etokens Test',
};
export const EtokensStoredCashtabCache = {
    tokens: [
        [
            '0000000000000000000000000000000000000000000000000000000000000000',
            {
                tokenType: {
                    protocol: 'UNKNOWN',
                    type: 'UNKNOWN',
                    number: 0,
                },
                timeFirstSeen: 0,
                genesisInfo: {
                    tokenTicker: 'UNKNOWN',
                    tokenName: 'UNKNOWN',
                    url: 'UNKNOWN',
                    decimals: 0,
                    hash: 'UNKNOWN',
                },
                block: {
                    height: 0,
                    hash: 'UNKNOWN',
                    timestamp: 0,
                },
                genesisSupply: '0',
                genesisMintBatons: 0,
                genesisOutputScripts: [],
            },
        ],
        [
            '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
            {
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
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
                timeFirstSeen: '0',
                genesisSupply: '0.0000',
                genesisOutputScripts: [
                    '76a91459ca25ea25f4f89a79b55c1c775ae515eb25b1fe88ac',
                ],
                genesisMintBatons: 1,
                block: {
                    height: 821187,
                    hash: '00000000000000002998aedef7c4fc2c52281e318461d66c3c9fe10151449448',
                    timestamp: 1701716369,
                },
            },
        ],
        [
            '6fb5525bf35ec6eb6a0608c8a3624891801cdf4c1079fc78462a24230bad27e2',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'S',
                    tokenName: 'Sulphur',
                    url: 'https://cashtab.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '1710948156',
                genesisSupply: '100000',
                genesisOutputScripts: [
                    '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 836700,
                    hash: '000000000000000014a2459ce878eecab3abfca3aede8b71b30121f210b48117',
                    timestamp: 1710948609,
                },
            },
        ],
        [
            '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'VSP',
                    tokenName: 'Vespene Gas',
                    url: 'https://simple.wikipedia.org/wiki/StarCraft#Gameplay',
                    decimals: 9,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '3000000000.000000000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 763087,
                    hash: '0000000000000000015abcebc15e74036598855a9fdd976868ad99bb23b87a89',
                    timestamp: 1666631359,
                },
            },
        ],
        [
            '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'MSB',
                    tokenName: 'Mint Send Burn',
                    url: 'https://cashtab.com/',
                    decimals: 9,
                    hash: '',
                },
                timeFirstSeen: '1713184114',
                genesisSupply: '18446744073.709551615',
                genesisOutputScripts: [
                    '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                ],
                genesisMintBatons: 1,
                block: {
                    height: 840234,
                    hash: '00000000000000002c472b6939a90669b7348149cde579904c3bc394c644605f',
                    timestamp: 1713184929,
                },
            },
        ],
        [
            'bf24d955f59351e738ecd905966606a6837e478e1982943d724eab10caad82fd',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'ST',
                    tokenName: 'ST',
                    url: 'developer.bitcoin.com',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '399',
                genesisOutputScripts: [
                    '76a9142ba1f72161a53720df933ea9b2116351c4162abd88ac',
                ],
                genesisMintBatons: 1,
                block: {
                    height: 625949,
                    hash: '00000000000000000071fae486bb8a703faacb1fdcc613bd024ac1c0870e16d8',
                    timestamp: 1583919726,
                },
            },
        ],
        [
            'dd84ca78db4d617221b58eabc6667af8fe2f7eadbfcc213d35be9f1b419beb8d',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'TAP',
                    tokenName: 'Thoughts and Prayers',
                    url: '',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '1000000',
                genesisOutputScripts: [
                    '76a914458ea8631f32b296df9ab677b6e8a7e422e7161e88ac',
                ],
                genesisMintBatons: 1,
                block: {
                    height: 580703,
                    hash: '000000000000000000d4d1d3ecb1a6134e3e4bb2ffd457f267e5e44139f2505f',
                    timestamp: 1556742931,
                },
            },
        ],
        [
            '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'TBC',
                    tokenName: 'tabcash',
                    url: 'https://cashtabapp.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '100',
                genesisOutputScripts: [
                    '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                ],
                genesisMintBatons: 1,
                block: {
                    height: 674143,
                    hash: '000000000000000034c77993a35c74fe2dddace27198681ca1e89e928d0c2fff',
                    timestamp: 1613859311,
                },
            },
        ],
        [
            'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'POW',
                    tokenName: 'ProofofWriting.com Token',
                    url: 'https://www.proofofwriting.com/26',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '1000000',
                genesisOutputScripts: [
                    '76a91485bab3680833cd9b3cc60953344fa740a2235bbd88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 685949,
                    hash: '0000000000000000436e71d5291d2fb067decc838dcb85a99ff6da1d28b89fad',
                    timestamp: 1620712051,
                },
            },
        ],
        [
            'e859eeb52e7afca6217fb36784b3b6d3c7386a52f391dd0d00f2ec03a5e8e77b',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'test',
                    tokenName: 'test',
                    url: 'https://cashtab.com/',
                    decimals: 1,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '1.0',
                genesisOutputScripts: [
                    '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 717055,
                    hash: '0000000000000000113b17f038ac607eb5ef3c5636bf47088f692695b229d1cf',
                    timestamp: 1639066280,
                },
            },
        ],
        [
            '8ead21ce4b3b9e7b57607b97b65b5013496dc6e3dfdea162c08ce7265a66ebc8',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'IFP',
                    tokenName: 'Infrastructure Funding Proposal Token',
                    url: 'ifp.cash',
                    decimals: 8,
                    hash: 'b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553',
                },
                timeFirstSeen: '0',
                genesisSupply: '21000000.00000000',
                genesisOutputScripts: [
                    '76a9146e68110cc00a5d5f1c6c796c1a54f26b364cf06988ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 650236,
                    hash: '0000000000000000029d56ae91f48538121ce5e64c656053a1ddfda72249338d',
                    timestamp: 1598560882,
                },
            },
        ],
        [
            'da9460ce4b1c92b4f6ef4e4a6bc2d05539f49d02b17681389d9ce22b8dca50f0',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'SA',
                    tokenName: 'Spinner Alpha',
                    url: 'https://cashtabapp.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '333',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 700677,
                    hash: '000000000000000000b31f812d4eacbe21ac1b6b55542cdc92de2634b263c8b7',
                    timestamp: 1629467912,
                },
            },
        ],
        [
            '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'Alita',
                    tokenName: 'Alita',
                    url: 'alita.cash',
                    decimals: 4,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '21000000000.0000',
                genesisOutputScripts: [
                    '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 756373,
                    hash: '00000000000000000d62f1b66c08f0976bcdec2f08face2892ae4474b50100d9',
                    timestamp: 1662611972,
                },
            },
        ],
        [
            'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'CTB',
                    tokenName: 'CashTabBits',
                    url: 'https://cashtabapp.com/',
                    decimals: 9,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '10000000000.000000000',
                genesisOutputScripts: [
                    '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                ],
                genesisMintBatons: 1,
                block: {
                    height: 662874,
                    hash: '000000000000000055df35f930c6e9ef6f4c51f1df6650d53eb3390cb92503fa',
                    timestamp: 1606935101,
                },
            },
        ],
        [
            '0916e71779c9de7ee125741d3f5ab01f556356dbc86fd327a24f1e9e22ebc917',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'CTL2',
                    tokenName: 'Cashtab Token Launch Launch Token v2',
                    url: 'thecryptoguy.com',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '2000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 684993,
                    hash: '00000000000000004c2f629c06444ec73fd059e1ee55e99d5e4b7bbff24f176a',
                    timestamp: 1620160437,
                },
            },
        ],
        [
            'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'NAKAMOTO',
                    tokenName: 'NAKAMOTO',
                    url: '',
                    decimals: 8,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '21000000.00000000',
                genesisOutputScripts: [
                    '76a91433c0448680ca324225eeca7a230cf191ab88400288ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 555671,
                    hash: '000000000000000000aeb2168da809c07ede4de5ec2109df43bf49ef13805ddc',
                    timestamp: 1541634138,
                },
            },
        ],
        [
            'ccf5fe5a387559c8ab9efdeb0c0ef1b444e677298cfddf07671245ce3cb3c79f',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'XGB',
                    tokenName: 'Garmonbozia',
                    url: 'https://twinpeaks.fandom.com/wiki/Garmonbozia',
                    decimals: 8,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '1000.00000000',
                genesisOutputScripts: [
                    '76a914d4fa9121bcd065dd93e58831569cf51ef5a74f6188ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 685147,
                    hash: '00000000000000000955aad3a91d39a54197e5eb567660a41cb25c08430a991a',
                    timestamp: 1620241359,
                },
            },
        ],
        [
            '7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'HONK',
                    tokenName: 'HONK HONK',
                    url: 'THE REAL HONK SLP TOKEN',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '100000000000',
                genesisOutputScripts: [
                    '76a91453c0098567382f003437a016edcc47de1436746988ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 576633,
                    hash: '000000000000000001400c74bf6ea59af97680bb6ee5b8918f0296795191dc56',
                    timestamp: 1554290938,
                },
            },
        ],
        [
            'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'Service',
                    tokenName: 'Evc token',
                    url: 'https://cashtab.com',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '95000000000',
                genesisOutputScripts: [
                    '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 715115,
                    hash: '000000000000000008685ec611c9ab59dd1062431e3b40a7e27c0320c4993f68',
                    timestamp: 1637890451,
                },
            },
        ],
        [
            '157e0cdef5d5c51bdea00eac9ab821d809bb9d03cf98da85833614bedb129be6',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'CLNSP',
                    tokenName: 'ComponentLongNameSpeedLoad',
                    url: 'https://cashtabapp.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '100',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 685168,
                    hash: '00000000000000001cd7cfe38ef8173732989f73bd4818e13db2b909c4cea007',
                    timestamp: 1620249731,
                },
            },
        ],
        [
            '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'XBIT',
                    tokenName: 'eBits',
                    url: 'https://boomertakes.com/',
                    decimals: 9,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '1000000.000000000',
                genesisOutputScripts: [
                    '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                ],
                genesisMintBatons: 1,
                block: {
                    height: 680776,
                    hash: '00000000000000003667d7cd150a1a29c78f5fab9360ab3c0e32eba99f9e2c08',
                    timestamp: 1617733350,
                },
            },
        ],
        [
            '6e24e89b6d5284138c69777527760500b99614631bca7f2a5c38f4648dae9524',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'CBB',
                    tokenName: 'Cashtab Beta Bits',
                    url: 'https://cashtabapp.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '1000000000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 700469,
                    hash: '00000000000000000bb5f9bb8e292c0017c34e05708f74eae3ae09ff18f6bc89',
                    timestamp: 1629339994,
                },
            },
        ],
        [
            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'NOCOVID',
                    tokenName: 'Covid19 Lifetime Immunity',
                    url: 'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/covid-19-vaccines',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '1000000',
                genesisOutputScripts: [
                    '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                ],
                genesisMintBatons: 1,
                block: {
                    height: 680063,
                    hash: '000000000000000012ad3d6dfb3505616ab9c3cb3772abac0448ddfc25043df4',
                    timestamp: 1617304616,
                },
            },
        ],
        [
            'b9877d8f8d2364b983707df905d592f534a3ada18e52aa529a0f72fcc535abf7',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'SRM',
                    tokenName: 'Server Redundancy Mint',
                    url: 'https://cashtab.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '5',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 757433,
                    hash: '000000000000000006f6ed1242ab08be563c8ea6898a38fa09b986e9507b8003',
                    timestamp: 1663251085,
                },
            },
        ],
        [
            '70ead4d94c43fe8c5576bb2528fd54380d8356f632ac962b1e03fb287607dfd4',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'NCBT',
                    tokenName: 'newChatBotTest',
                    url: 'alias.etokens.cash',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '100',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 783693,
                    hash: '000000000000000008db6b50a881d28867d152ada018afb4b995d3b64a1e17eb',
                    timestamp: 1679073789,
                },
            },
        ],
        [
            'ff9aa6eebcd1331f8684d53b441cfa3060a4ffc403b417d5728de8ab231f5516',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'NCBT',
                    tokenName: 'newChatBotTest',
                    url: 'alias.etokens.cash',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '100',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 783694,
                    hash: '00000000000000000bf1b32605951ddcf4d4d9d240f73f19b4f505b8d935fb1b',
                    timestamp: 1679074454,
                },
            },
        ],
        [
            'f077f207fc8a8557e5f0ffc6021685ab4b357e9b92d2b5c4192dcb7760ee6e29',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'NCBT',
                    tokenName: 'newChatBotTest',
                    url: 'alias.etokens.cash',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '100',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 783695,
                    hash: '000000000000000015ade1e6be40db716077affda1e9c38d163a63981d4fab41',
                    timestamp: 1679077205,
                },
            },
        ],
        [
            '3adbf501e21c711d20118e003711168eb39f560c01f4c6d6736fa3f3fceaa577',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'OMI',
                    tokenName: 'Omicron',
                    url: 'cdc.gov',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '1000000000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 717653,
                    hash: '000000000000000004cc2d26068bcd8dcab87841b0ce6b5150f4f8b6ccff6d10',
                    timestamp: 1639430827,
                },
            },
        ],
        [
            '3de671a7107d3803d78f7f4a4e5c794d0903a8d28d16076445c084943c1e2db8',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'CLB',
                    tokenName: 'Cashtab Local Beta',
                    url: 'boomertakes.com',
                    decimals: 2,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '22.22',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 688194,
                    hash: '00000000000000003d718f77c7b914230be2357a1863542d9ce99994836e5eac',
                    timestamp: 1622049539,
                },
            },
        ],
        [
            '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'LVV',
                    tokenName: 'Lambda Variant Variants',
                    url: 'https://cashtabapp.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '1000000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 700722,
                    hash: '0000000000000000260ee4c3b4f4ddde127bc0105d685c0ef31775b612627222',
                    timestamp: 1629500864,
                },
            },
        ],
        [
            '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'DVV',
                    tokenName: 'Delta Variant Variants',
                    url: 'https://cashtabapp.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '999999999',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 700469,
                    hash: '00000000000000000bb5f9bb8e292c0017c34e05708f74eae3ae09ff18f6bc89',
                    timestamp: 1629339994,
                },
            },
        ],
        [
            '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'WDT',
                    tokenName:
                        'Test Token With Exceptionally Long Name For CSS And Style Revisions',
                    url: 'https://www.ImpossiblyLongWebsiteDidYouThinkWebDevWouldBeFun.org',
                    decimals: 7,
                    hash: '85b591c15c9f49531e39fcfeb2a5a26b2bd0f7c018fb9cd71b5d92dfb732d5cc',
                },
                timeFirstSeen: '0',
                genesisSupply: '100000.0000000',
                genesisOutputScripts: [
                    '76a91419884c453167cf3011a3363b4b1ebd926bde059f88ac',
                ],
                genesisMintBatons: 1,
                block: {
                    height: 659948,
                    hash: '000000000000000002e096ec3fda458dab941cd2ab40a7be10d54e88c9b06f37',
                    timestamp: 1604423892,
                },
            },
        ],
        [
            'b977630ae1b4a0fe3ab12385fdaaffd974e5bd352f2a817ce135c1ee6005a35d',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'DNR',
                    tokenName: 'Denarius',
                    url: 'https://cashtab.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '753',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 767340,
                    hash: '00000000000000000aa6f475f0ef63c88c19d56217972534fb5cb6f98586845a',
                    timestamp: 1669201819,
                },
            },
        ],
        [
            '6376cae692cf0302ecdd63234c14cbb2b21cec75ab538335f90254cfb3ed44cc',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'CLT',
                    tokenName: 'Cashtab Local Tests',
                    url: 'https://cashtab.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '50000',
                genesisOutputScripts: [
                    '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 720056,
                    hash: '00000000000000001539b8b8d9e7d9459eb16ad84d387fc13326a34d7e09633d',
                    timestamp: 1640867749,
                },
            },
        ],
        [
            'bd1acc4c986de57af8d6d2a64aecad8c30ee80f37ae9d066d758923732ddc9ba',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'TBS',
                    tokenName: 'TestBits',
                    url: 'https://thecryptoguy.com/',
                    decimals: 9,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '10000000000.000000000',
                genesisOutputScripts: [
                    '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
                ],
                genesisMintBatons: 1,
                block: {
                    height: 662989,
                    hash: '000000000000000022f3b95ea9544c77938f232601b87a82b5c375b81e0123ae',
                    timestamp: 1607034208,
                },
            },
        ],
        [
            '639a8dba34788ff3ebd3977d4ac045825394285ee648bb1d159e1c12b787ff25',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'CFL',
                    tokenName: 'Cashtab Facelift',
                    url: 'https://cashtab.com/',
                    decimals: 9,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '10000.000000000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 726826,
                    hash: '000000000000000007ba9fcd82bc10d70a55d4d74cb041cf234699c746d1c635',
                    timestamp: 1644953895,
                },
            },
        ],
        [
            '45f0ff5cae7e89da6b96c26c8c48a959214c5f0e983e78d0925f8956ca8848c6',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'CMA',
                    tokenName: 'CashtabMintAlpha',
                    url: 'https://cashtabapp.com/',
                    decimals: 5,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '55.55555',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 685170,
                    hash: '000000000000000025782a5b5b44efb49f9c3f86ef7355dc36010afc6624e3fd',
                    timestamp: 1620250206,
                },
            },
        ],
        [
            'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'IWF',
                    tokenName: 'Insanity Wolf',
                    url: 'https://cashtab.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '1000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 832625,
                    hash: '00000000000000001677f56a57d820e02079e4a3ed62d7aeb0acbf7fa937b8bb',
                    timestamp: 1708546646,
                },
            },
        ],
        [
            'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'GYP',
                    tokenName: 'Gypsum',
                    url: 'https://cashtab.com/',
                    decimals: 9,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '10000000000.000000000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 832778,
                    hash: '000000000000000002113ac0f6519d1a51a933bb5c8f665875d5ff5ead6e0274',
                    timestamp: 1708641780,
                },
            },
        ],
        [
            'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'GRP',
                    tokenName: 'GRUMPY',
                    url: 'https://bit.ly/GrumpyDoc',
                    decimals: 2,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '10000000000.00',
                genesisOutputScripts: [
                    '76a9141c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 713853,
                    hash: '0000000000000000006a051e51b50e44d3394ab49c9db896c2484770ed613fb2',
                    timestamp: 1637109257,
                },
            },
        ],
        [
            '79c5a1cec698350dd93f645fcae8d6ff3902b7cdc582839dfface3cb0c83d823',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'TRIB',
                    tokenName: 'eCash Herald',
                    url: 'https://cashtab.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '10000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 782665,
                    hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
                    timestamp: 1678408305,
                },
            },
        ],
        [
            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'BULL',
                    tokenName: 'Bull',
                    url: 'https://cashtab.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '21000000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 835482,
                    hash: '0000000000000000133bf16cb7fdab5c6ff64a874632eb2fe80265e34a6ad99f',
                    timestamp: 1710174132,
                },
            },
        ],
        [
            '666c4318d1f7fef5f2c698262492c519018d4e9130f95d05f6be9f0fb7149e96',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'CPG',
                    tokenName: 'Cashtab Prod Gamma',
                    url: 'thecryptoguy.com',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '100',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 688495,
                    hash: '000000000000000028aa42a7c622846b742465dfaaf41d29f955c1b8ee890c9e',
                    timestamp: 1622237370,
                },
            },
        ],
        [
            'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'ABC',
                    tokenName: 'ABC',
                    url: 'https://cashtab.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '12',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 832725,
                    hash: '000000000000000016d97961a24ac3460160bbc439810cd2af684264ae15083b',
                    timestamp: 1708607039,
                },
            },
        ],
        [
            '9404761d1a01cca11c29eb8ed9ddc63966526d0eaa54f148e8862ab3e884132f',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'CAFF',
                    tokenName: 'Coffee',
                    url: 'https://cashtab.com/',
                    decimals: 9,
                    hash: '',
                },
                timeFirstSeen: '1711020786',
                genesisSupply: '55.000000000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 836820,
                    hash: '00000000000000000afa24f7d3cab51184e1469cecd61bf472d3a3fcc907bc19',
                    timestamp: 1711021281,
                },
            },
        ],
        [
            '16b12bbacdbb8c8a799adbfd782bfff9843c1f9b0be148eaae02a1a7f74f95c4',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'CGEN',
                    tokenName: 'Cashtab Genesis',
                    url: 'https://boomertakes.com/',
                    decimals: 9,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '1000000.000000000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 684837,
                    hash: '00000000000000001d065fdd22416c4e8e99803964f4fb9c91af6feb5ead5ff3',
                    timestamp: 1620082584,
                },
            },
        ],
        [
            'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'UDT',
                    tokenName: 'UpdateTest',
                    url: 'https://cashtab.com/',
                    decimals: 7,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '777.7777777',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 759037,
                    hash: '00000000000000000bc95bfdd45e71585f27139e71b56dd5bc86ef05d35b502f',
                    timestamp: 1664226709,
                },
            },
        ],
        [
            '18625b25d4b9b9ebf23ee5575484a67ff2477873a253b16081f964b8f9ca7c28',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: '223',
                    tokenName: '.223',
                    url: 'https://cashtab.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '22300000',
                genesisOutputScripts: [
                    '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 768943,
                    hash: '000000000000000009afb1b7ed53dc59b24732cb0a0a7841654d1acd073d29bd',
                    timestamp: 1670166309,
                },
            },
        ],
        [
            'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'CTD',
                    tokenName: 'Cashtab Dark',
                    url: 'https://cashtab.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '10000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 726043,
                    hash: '00000000000000000182db32e000171006b7b7820181676b5fd8f29cc90d2b9c',
                    timestamp: 1644455332,
                },
            },
        ],
        [
            'b40d1f6acdb6ee68d7eca0167fe2753c076bc309b2e3b1af8bff70ca34b945b0',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'KAT',
                    tokenName: 'KA_Test',
                    url: 'https://cashtab.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '100000000',
                genesisOutputScripts: [
                    '76a914a528a001f9f027aae05085928d0b23172fd4b5a188ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 727176,
                    hash: '00000000000000000a37233b9ed0520368c58437fc4ce5edbda386a4619440f5',
                    timestamp: 1645146139,
                },
            },
        ],
        [
            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'CACHET',
                    tokenName: 'Cachet',
                    url: 'https://cashtab.com/',
                    decimals: 2,
                    hash: '',
                },
                timeFirstSeen: '1711776546',
                genesisSupply: '100000.00',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 1,
                block: {
                    height: 838192,
                    hash: '0000000000000000132232769161d6211f7e6e20cf63b26e5148890aacd26962',
                    timestamp: 1711779364,
                },
            },
        ],
        [
            '77ec4036ef8546ac46df6d3a5374e961216f92624627eaeef5d2e1a253df9fc6',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'CTLv3',
                    tokenName: 'Cashtab Token Launch Launch Token v3',
                    url: 'coinex.com',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '333',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 684994,
                    hash: '0000000000000000384706dfb07ac54ff08d0b143bebc51b130dac5caa7c4eae',
                    timestamp: 1620160484,
                },
            },
        ],
        [
            '97283f832815016e848612acf8a5d097089ed24bd62d407887b3be1d7aa8960f',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'BOHR',
                    tokenName: 'Atoms',
                    url: 'https://cashtab.com/',
                    decimals: 9,
                    hash: '',
                },
                timeFirstSeen: '1711894363',
                genesisSupply: '0.000000001',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 1,
                block: {
                    height: 838367,
                    hash: '00000000000000000ea296488585ea491bd08a8ed68f5de714f92238f91e85d6',
                    timestamp: 1711894594,
                },
            },
        ],
        [
            '6a9305a13135625f4b533256e8d2e21a7343005331e1839348a39040f61e09d3',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'SCOOG',
                    tokenName: 'Scoogi Alpha',
                    url: 'cashtab.com',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '6969',
                genesisOutputScripts: [
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 714695,
                    hash: '0000000000000000004cfe7cf02020f469d84a4e0eca90f1b646a89b9f018ccf',
                    timestamp: 1637624763,
                },
            },
        ],
        [
            'b39fdb53e21d67fa5fd3a11122f1452f15884047f2b80e8efe633c3b520b7a39',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'SCΩΩG',
                    tokenName: 'Scoogi Omega',
                    url: 'https://cashtab.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '6969',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 715111,
                    hash: '0000000000000000029e7e0884d9f8b94437d146476ba12aa52815320d497be2',
                    timestamp: 1637879760,
                },
            },
        ],
        [
            '9e694e7fc3738975ce529ffa15937d6f192716059d32d663815c0d3f3682f1b5',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'Mg',
                    tokenName: 'Magnesium',
                    url: 'https://cashtab.com/',
                    decimals: 1,
                    hash: '',
                },
                timeFirstSeen: '1712879286',
                genesisSupply: '1844674407370955161.5',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 840030,
                    hash: '000000000000000004e831e42308b70404225ed112f84e34df1e048a12e3aeac',
                    timestamp: 1712880601,
                },
            },
        ],
        [
            'b0794f985a728aa65997e5606b79081aa20978d8a299da1d2ea709102f03a604',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'Mo',
                    tokenName: 'Molybdenum',
                    url: 'https://cashtab.com/',
                    decimals: 4,
                    hash: '',
                },
                timeFirstSeen: '1712878861',
                genesisSupply: '1844674407370955.1615',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 840030,
                    hash: '000000000000000004e831e42308b70404225ed112f84e34df1e048a12e3aeac',
                    timestamp: 1712880601,
                },
            },
        ],
        [
            'c3b56aef4744db0a9e21cd06dd3356bcdd7c1ca67fc132040c42b1f8c9c65419',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'Se',
                    tokenName: 'Selenium',
                    url: 'https://cashtab.com/',
                    decimals: 7,
                    hash: '',
                },
                timeFirstSeen: '1712878385',
                genesisSupply: '1844674407370.9551615',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 840030,
                    hash: '000000000000000004e831e42308b70404225ed112f84e34df1e048a12e3aeac',
                    timestamp: 1712880601,
                },
            },
        ],
        [
            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'BEAR',
                    tokenName: 'BearNip',
                    url: 'https://cashtab.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '4444',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 782665,
                    hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
                    timestamp: 1678408305,
                },
            },
        ],
        [
            '27277911435164c511c7dbc3ef00ba5ce9edf8c1ccab93681cb0ad984b801ef1',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'SCOOG',
                    tokenName: 'Scoogi Alpha',
                    url: 'cashtab.com',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '6969',
                genesisOutputScripts: [
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 714695,
                    hash: '0000000000000000004cfe7cf02020f469d84a4e0eca90f1b646a89b9f018ccf',
                    timestamp: 1637624763,
                },
            },
        ],
        [
            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'COVID',
                    tokenName: 'COVID-19',
                    url: 'https://en.wikipedia.org/wiki/COVID-19',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '10000000000',
                genesisOutputScripts: [
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 716909,
                    hash: '00000000000000000fc11b1bc4bb87ac76efbde32abdeb1c6aa1102c5d0a9718',
                    timestamp: 1638980176,
                },
            },
        ],
        [
            'bfddfcfc9fb9a8d61ed74fa94b5e32ccc03305797eea461658303df5805578ef',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'Sending Token',
                    tokenName: 'Sending Token',
                    url: 'developer.bitcoin.com',
                    decimals: 9,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '100.999999999',
                genesisOutputScripts: [
                    '76a9142ba1f72161a53720df933ea9b2116351c4162abd88ac',
                ],
                genesisMintBatons: 1,
                block: {
                    height: 625313,
                    hash: '000000000000000000ca9ad079ac05c01231d25fa368b48562dc760a2e04dc42',
                    timestamp: 1583536827,
                },
            },
        ],
        [
            '48090bcd94cf53289ce84e1d4aeb8035f6ea7d80d37baa6343d0f71e7d67a3ef',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'WP5',
                    tokenName: 'Webpack 5',
                    url: 'boomertakes.com',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '100',
                genesisOutputScripts: [
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 732781,
                    hash: '00000000000000000bb4868228eb63c5190e5aa852c1c8b8baf75bb6bd4de93d',
                    timestamp: 1648502195,
                },
            },
        ],
        [
            '8b402aab7682e1cef3da83bf754ae722cc95c3118dfe6e2149267f9a9e2ecc63',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'AUG5',
                    tokenName: 'August 5',
                    url: 'https://cashtab.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '365',
                genesisOutputScripts: [
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 751457,
                    hash: '00000000000000000f462910437da35eb21da18e998777055eee03d5b0e34520',
                    timestamp: 1659723124,
                },
            },
        ],
        [
            '2502bdc75d3afdce0742505d53e6d50cefb1268d7c2a835c06b701702b79e1b8',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'SCOOG',
                    tokenName: 'Scoogi Epsilon',
                    url: 'cashtab.com',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '6969',
                genesisOutputScripts: [
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 714701,
                    hash: '00000000000000000b5132db556d73331d9731b08f8663019ab18fede2c31415',
                    timestamp: 1637627213,
                },
            },
        ],
        [
            'f29939b961d8f3b27d7826e3f22451fcf9273ac84421312a20148b1e083a5bb0',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'SCOOG',
                    tokenName: 'Scoogi Beta',
                    url: 'cashtab.com',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '6969',
                genesisOutputScripts: [
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 714696,
                    hash: '000000000000000000fa0f63e6872937c69bcc243334d61d3deca19ab7d6dbdb',
                    timestamp: 1637625748,
                },
            },
        ],
        [
            'edb693529851379bcbd75008f78940df8232510e6a1c64d8dc81693ae2a53f66',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'SCOOG',
                    tokenName: 'Scoogi Eta',
                    url: 'cashtab.com',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '6969',
                genesisOutputScripts: [
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 714823,
                    hash: '000000000000000007a61693852f08085075cd6f49eda1997eb410769eae937c',
                    timestamp: 1637696526,
                },
            },
        ],
        [
            'c70d5f036368e184d2a52389b2f4c2471855aebaccbd418db24d4515ce062dbe',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'SCOOG',
                    tokenName: 'Scoogi Zeta',
                    url: 'cashtab.com',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '6969',
                genesisOutputScripts: [
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 714823,
                    hash: '000000000000000007a61693852f08085075cd6f49eda1997eb410769eae937c',
                    timestamp: 1637696526,
                },
            },
        ],
        [
            '55180a2527901ed4d7ef8f4d61d38d3543b0e7ac3aba04e7f4d3165c3320a6da',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'cARRRl',
                    tokenName: 'Dachshund Pirate Token',
                    url: 'https://cashtab.com/',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '10000',
                genesisOutputScripts: [
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 753313,
                    hash: '000000000000000005da78d538eaf54b1f741fef665f0c2081968b4ea54ecf04',
                    timestamp: 1660837488,
                },
            },
        ],
        [
            'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'CTP',
                    tokenName: 'Cash Tab Points',
                    url: 'https://cashtabapp.com/',
                    decimals: 9,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '1000000000.000000000',
                genesisOutputScripts: [
                    '76a91419884c453167cf3011a3363b4b1ebd926bde059f88ac',
                ],
                genesisMintBatons: 1,
                block: {
                    height: 660971,
                    hash: '00000000000000000334795ce566d1202a804e71422d05c93beb6afc4eb99cf3',
                    timestamp: 1605037203,
                },
            },
        ],
        [
            'a3add503bba986398b39fa2200ce658423a597b4f7fe9de04a2da4501f8b05a3',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'SCOOG',
                    tokenName: 'Scoogi Gamma',
                    url: 'cashtab.com',
                    decimals: 0,
                    hash: '',
                },
                timeFirstSeen: '0',
                genesisSupply: '6969',
                genesisOutputScripts: [
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 714696,
                    hash: '000000000000000000fa0f63e6872937c69bcc243334d61d3deca19ab7d6dbdb',
                    timestamp: 1637625748,
                },
            },
        ],
        [
            'b47fd1da27ae1a940b727efffbe410cbd5c18bc0fbd1d5193d083c47d4c459f0',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                genesisInfo: {
                    tokenTicker: 'PLUTO',
                    tokenName: 'Plutonium',
                    url: 'https://cashtab.com/',
                    decimals: 9,
                    hash: '',
                },
                timeFirstSeen: '1711717550',
                genesisSupply: '9999.000000000',
                genesisOutputScripts: [
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                ],
                genesisMintBatons: 0,
                block: {
                    height: 838096,
                    hash: '000000000000000004e9f52e566c10a95a0eb57a6c74abb4cc41eb10641af403',
                    timestamp: 1711717943,
                },
            },
        ],
        // NFT Collection
        [
            '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                timeFirstSeen: 1716324230,
                genesisInfo: {
                    tokenTicker: 'MASCOTS',
                    tokenName: 'Mascots',
                    url: 'cashtab.com',
                    decimals: 0,
                    hash: '2d0f7be21838551f43872cddda2213659f6603d0aec566dd8f917e49e172f27d',
                },
                block: {
                    height: 845656,
                    hash: '00000000000000001c7f33318a0ac58f2256696b302c2047ab73315943c0c6d7',
                    timestamp: 1716327571,
                },
                genesisSupply: '100',
                genesisOutputScripts: [
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                ],
                genesisMintBatons: 0,
            },
        ],
        // NFT
        [
            'e2db39ade16e971afba2087bf6e29a83d7579137900eb73e5d955bdb769204bb',
            {
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                    number: 65,
                },
                timeFirstSeen: 1725914476,
                genesisInfo: {
                    tokenTicker: 'S5',
                    tokenName: 'Saturn V',
                    url: 'en.wikipedia.org/wiki/Saturn_V',
                    decimals: 0,
                    hash: 'ce2f92283c966e1e0f98ecf79b5a9122aac5e32cb865ecf1953820710ee62969',
                },
                block: {
                    height: 861567,
                    hash: '00000000000000001be902c2068d3848695eea5aa539383636ec62f5814fb9c8',
                    timestamp: 1725914985,
                },
                genesisSupply: '100',
                genesisOutputScripts: [
                    '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                ],
                genesisMintBatons: 0,
            },
        ],
    ],
};

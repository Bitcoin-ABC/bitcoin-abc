// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

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
const MOCK_TOKEN_UTXO = {
    token: {
        tokenId:
            '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        },
        amount: '2999998798000000000',
        isMintBaton: false,
    },
};

export const tokenTestWallet = {
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
                path: 1899,
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
                path: 1899,
            },
            {
                outpoint: {
                    txid: '6fb5525bf35ec6eb6a0608c8a3624891801cdf4c1079fc78462a24230bad27e2',
                    outIdx: 1,
                },
                blockHeight: 836700,
                isCoinbase: false,
                value: 546,
                isFinal: true,
                token: {
                    tokenId:
                        '6fb5525bf35ec6eb6a0608c8a3624891801cdf4c1079fc78462a24230bad27e2',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '100000',
                    isMintBaton: false,
                },
                path: 1899,
            },
            {
                outpoint: {
                    txid: 'da3c897eb6d4e5299cb3ae2d8235d46632647303eab61236a1072885d5e56d66',
                    outIdx: 1,
                },
                blockHeight: 840233,
                isCoinbase: false,
                value: 546,
                isFinal: true,
                token: {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '111000000000',
                    isMintBaton: false,
                },
                path: 1899,
            },
            {
                outpoint: {
                    txid: '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                    outIdx: 1,
                },
                blockHeight: -1,
                isCoinbase: false,
                value: 546,
                isFinal: false,
                token: {
                    tokenId:
                        '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '18446744073709551615',
                    isMintBaton: false,
                },
                path: 1899,
            },
            {
                outpoint: {
                    txid: '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                    outIdx: 2,
                },
                blockHeight: -1,
                isCoinbase: false,
                value: 546,
                isFinal: false,
                token: {
                    tokenId:
                        '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    amount: '0',
                    isMintBaton: true,
                },
                path: 1899,
            },
            {
                outpoint: {
                    txid: '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                    outIdx: 1,
                },
                blockHeight: 840011,
                isCoinbase: false,
                value: 546,
                isFinal: true,
                token: {
                    tokenId:
                        '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    amount: '100',
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
                value: 546,
                isFinal: true,
                token: {
                    tokenId:
                        '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    amount: '0',
                    isMintBaton: true,
                },
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
                value: 997081,
                isFinal: false,
                path: 1899,
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
                        value: 998857,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a04534c500001010747454e45534953034d53420e4d696e742053656e64204275726e1468747470733a2f2f636173687461622e636f6d2f4c000109010208ffffffffffffffff',
                    },
                    {
                        value: 546,
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
                            amount: '18446744073709551615',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 546,
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
                            amount: '0',
                            isMintBaton: true,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 997081,
                        outputScript:
                            '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
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
                        actualBurnAmount: '0',
                        intentionalBurn: '0',
                        burnsMintBatons: false,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                parsed: {
                    xecTxType: 'Sent',
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
                        value: 546,
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            amount: '999867000000000',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        outputScript:
                            '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                    },
                    {
                        prevOut: {
                            txid: '26638422f963da59e040c3eeb2bc766114f44026bff959ae5ee30be486b18fa7',
                            outIdx: 2,
                        },
                        inputScript:
                            '473044022038387900857b7f33214deff1ffc45f108a5ac9c60dd4d41d85662b2116d5644502201a56911fa1b7c86d967d04fd3c35348714c0b5c69fec025c549c1641b1049d654121021d7fd45a888292cf3a022a95acdbcf82f9f2d5bbbfbdbc740acd558a9f25b5d0',
                        value: 14846,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f80800000019d81d96000800038d45d53df800',
                    },
                    {
                        value: 546,
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
                            amount: '111000000000',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 546,
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
                            amount: '999756000000000',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 13333,
                        outputScript:
                            '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
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
                        actualBurnAmount: '0',
                        intentionalBurn: '0',
                        burnsMintBatons: false,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                block: {
                    height: 840233,
                    hash: '000000000000000019fa0a69b1b204692bb8e5696e0df32137e4a34b77e0d675',
                    timestamp: 1713183906,
                },
                parsed: {
                    xecTxType: 'Received',
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
                        value: 1000000,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a04534c500001010747454e4553495301530753756c706875721468747470733a2f2f636173687461622e636f6d2f4c0001004c000800000000000186a0',
                    },
                    {
                        value: 546,
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
                            amount: '100000',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 998857,
                        outputScript:
                            '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                        spentBy: {
                            txid: '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                            outIdx: 0,
                        },
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
                        actualBurnAmount: '0',
                        intentionalBurn: '0',
                        burnsMintBatons: false,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                block: {
                    height: 836700,
                    hash: '000000000000000014a2459ce878eecab3abfca3aede8b71b30121f210b48117',
                    timestamp: 1710948609,
                },
                parsed: {
                    xecTxType: 'Sent',
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
                        value: 546,
                        sequenceNo: 4294967294,
                        token: {
                            tokenId:
                                '0000000000000000000000000000000000000000000000000000000000000000',
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_UNKNOWN',
                                number: 200,
                            },
                            amount: '0',
                            isMintBaton: false,
                            entryIdx: 1,
                        },
                        outputScript:
                            '76a914915132f6d7b707123b66ce4ac0a04a135c07a39988ac',
                    },
                    {
                        prevOut: {
                            txid: 'a65c0a7258fc9d9087351d77eacbad882e851d11ea7c11a238dc4c8360cb3ffa',
                            outIdx: 3,
                        },
                        inputScript:
                            '418aafb5e789fbc194ed7ecbad3bea728d00d9c089d3005bd6cf3487a8f196b2444e1552c5079805a790ab7339b4ef1932749f19ded730852cbc993dd80a04189d4121033b5a78b9d86813dd402f05cf0627dc4273090c70a9e52109204da0f272980633',
                        value: 546,
                        sequenceNo: 4294967294,
                        token: {
                            tokenId:
                                '0000000000000000000000000000000000000000000000000000000000000000',
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_UNKNOWN',
                                number: 200,
                            },
                            amount: '0',
                            isMintBaton: false,
                            entryIdx: 1,
                        },
                        outputScript:
                            '76a914bd19517f5aa2f2286922d4c28f5dc4c89c49798488ac',
                    },
                    {
                        prevOut: {
                            txid: 'f5c37336316d0b08eacf0791000c13e87182ef87188c55693dfb65218db08cb4',
                            outIdx: 0,
                        },
                        inputScript:
                            '414d72085dfe8b9deb741c15e83822d778f5825e35c44dbd3753937b697538e502d71aae0215881f07bd8c66112abfe466b95cb8ebc0d7e9ca0c4fd063853ad73e412102637953859a84e61e87df221c91ac3a38c59fa7e652e43894adc4443a373bcd10',
                        value: 600,
                        sequenceNo: 4294967294,
                        outputScript:
                            '76a91496345bfc72a63d798a7f1deace0be9edf209a24b88ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript: '6a5005534c5032ff',
                    },
                    {
                        value: 1000,
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
                            amount: '0',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
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
                        actualBurnAmount: '0',
                        intentionalBurn: '0',
                        burnsMintBatons: false,
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
                        actualBurnAmount: '0',
                        intentionalBurn: '0',
                        burnsMintBatons: false,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NOT_NORMAL',
                block: {
                    height: 836457,
                    hash: '000000000000000017739c96aa947a25e7ff176eb1a669095f950cefade4f255',
                    timestamp: 1710794047,
                },
                parsed: {
                    xecTxType: 'Received',
                    satoshisSent: 1000,
                    stackArray: ['50', '534c5032ff'],
                    recipients: [],
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
                        value: 546,
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_STANDARD',
                                number: 0,
                            },
                            amount: '50000000',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        outputScript:
                            '76a914262261027093df1005f751174d87d780adfabbbf88ac',
                    },
                    {
                        prevOut: {
                            txid: '18c7c49f5783f909224f59a435cc4f3b0e7174bda27b86e53e6e76e4fa48dab4',
                            outIdx: 82,
                        },
                        inputScript:
                            '41f7d042e3288f923e1f540ed7ce43db91d1295951ca21ed4ab24ce95d9ca6826ad7e5497f117f802fe1c9fda902ab7bf97af8bba4d29cb267d110d23e221f8cc7412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                        value: 1000,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                    },
                    {
                        prevOut: {
                            txid: '18c7c49f5783f909224f59a435cc4f3b0e7174bda27b86e53e6e76e4fa48dab4',
                            outIdx: 83,
                        },
                        inputScript:
                            '41d1e4f4970fea442cf46e71811eaf2f8271f2f1b3518fdb682bb0625160177adfa058707013453ed4c80887473238c7013007bf794a557fe6de449a51b4b4d06a412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                        value: 1000,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                    },
                ],
                outputs: [
                    {
                        value: 0,
                        outputScript:
                            '6a503d534c5032000453454e4449884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c0340420f000000dcadeb020000640000000000',
                    },
                    {
                        value: 546,
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
                            amount: '1000000',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                    {
                        value: 546,
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
                            amount: '48999900',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        spentBy: {
                            txid: 'f784a99870650fddc57360db8f91035bde12e4c278eb4704caa1256b682d7bc5',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 546,
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
                            amount: '100',
                            isMintBaton: false,
                            entryIdx: 0,
                        },
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
                        actualBurnAmount: '0',
                        intentionalBurn: '0',
                        burnsMintBatons: false,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                block: {
                    height: 836452,
                    hash: '000000000000000010aa8982051dceef402d15f18adf260492e0829cc715b29b',
                    timestamp: 1710789519,
                },
                parsed: {
                    xecTxType: 'Received',
                    satoshisSent: 546,
                    stackArray: [
                        '50',
                        '534c5032000453454e4449884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c0340420f000000dcadeb020000640000000000',
                    ],
                    recipients: [
                        'ecash:qqnzycgzwzfa7yq97ag3wnv867q2m74mhufqefypm0',
                        'ecash:qr0w2r6hvd3rwlwj7qc520qtkzgqnt90sypk26yd2u',
                    ],
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
                        value: 463935,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: '95db8b6c65a9494a1c33f646c9e61c34266900798fcaecee2ecfaba211d1246d',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100fe262318853a2a7660b21f63be1e9e3542236e4993be03495f706497e46ad59a022066838c3875a0bfa6fafac4c29318ec78ebede7dd1f2a4b1419da7abac17453c9412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 1100,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: 'dd025b3924544e1fdff406c8f32dd92d2ae736af23dd8d2ef4da24f8241e8342',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100911a595d3b7f549d25cb2aeaebc105d4c7959ea85cf946b267c5af49cd48d87802200a6c09b691ec570f88e390e24aab1b715907bd58433fa133ea83f2936d807cec412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 1100,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: '8b4c343250f7c2052b8aea274626774343cbb83327a755b164a9da483013f2f5',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402202a2df4c242582503b800a3852afc68f46a5de8b9554e97fe00313e95c3430ee902203e534510bd9754f1279ccfccd524b8baa7d521823ca2b87c4b5be813a3da8920412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 1100,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: '07f1f1c64e85f8a8192a979b215e1266f7f43c75ca50bca4bddc4e7e810afb8a',
                            outIdx: 0,
                        },
                        inputScript:
                            '47304402204deff67ff4bd3d146c2780a4d29f4f4757af0df5e5f5cffb0a9c8541bd86a67202201f4b467a220b5a84b5d7c6dc398720c4b1b86d41870cf8cc3fc7968c93b6bb91412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 2200,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: 'a55991681f7171821a52325897a5af2457dd4ecf2bfab717fe0be89b61dd615d',
                            outIdx: 0,
                        },
                        inputScript:
                            '473044022024894af3256a20173a10bb0195cd5d18edd54e7f78575fccb28306d824ef04b902201134383d62083011a1a90aae60e3899008c0894543e49bfc19db1bca639c2ca6412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 1100,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: 'c336d4a0e72551a0e22a9204a8cf28ac0ae704610b375b8fae3f5a387b2b1996',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100cf855ef9fd533ae6de13a21850b2ed772819480083828ab599ce56a4fe0d5014022062846bb895f11b3af532a8407dc4b7ccf40e5c6d6e6f7baed6aa276d22e648ec412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 2200,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: 'd491904e95406e51676a93552a64da22df5fd292e7820dfe0ef894c764c7f94a',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100828aa7fab0d9b3e8a7e84e9f9b058039010b7a7f339992357a820d6289239b3902206105c3174a82bad53310fcbf264dcb8ffdb5932006f528822671b07f9ba8f17b412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 1100,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: 'dc63c3a69858563ca3cc9d48d1d36f090705a4ed9c50da006bd3636e2ba65f98',
                            outIdx: 0,
                        },
                        inputScript:
                            '473044022015196c866fe452d1f55371ea4a2266c1e17738a941271063cc5a666d51bba7b502205dfba391e95fd3fe266a7619d8067de973631d3988b844af3b54f61cb29d6749412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 1100,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: '93309cd2654dc714fc5c907497cb4b1fee50480cae463389e8f51d18221c344c',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100dade26b499a7b8e7e14d4bf65dd0d959fc46343c1ad5b23956f2117afef81e0c022070177fc12d998e2f8e817423844bf122183d60964033766d4b58416f335c5ddf412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 1100,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: 'd3b4e33b04c1d9e7407446682924e4b6264ca0bf5704daa72c895bb215913b4b',
                            outIdx: 0,
                        },
                        inputScript:
                            '4830450221009c5499d0830d2ff8470c9c232c3ff8d984845a5e0a995f838c9def20413e48f6022003c96aa2453b48d045449564a8e591fbb1b098bb0ff25ca3b147fee0d2c9ddc2412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 1100,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: 'd09ba93e9916d390a6bce2b2168e93710315e30eb12d33b576fa780716dad5b7',
                            outIdx: 0,
                        },
                        inputScript:
                            '483045022100869341ac1ca7f84ba5871f92444cf36a1c277e5e0bd3f084c3eac5674148bfda02200fc9c0a79de0937f8e71071e7f25518aa8cd8ef71a2260221dacd635d5de169a412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 1100,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: 'd2ff7500d9705ad21dcf666c89446abc6f1810b2f9ddf60d9b47f6052535d0b4',
                            outIdx: 0,
                        },
                        inputScript:
                            '4830450221008b7f0701d441d4d365181f8113dc249d7628098658341e233e65559eebacd31602204f614a4100d7c3cf6921983db601806a281e3d9af2c531c27ebf2b84898d254c412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 2200,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                    {
                        prevOut: {
                            txid: '4c9610cc3e19f7b417cb8d5c018d13b0ea00486500f2e302d9387965ae6fba19',
                            outIdx: 1,
                        },
                        inputScript:
                            '483045022100f05296911f971330353398cfca9ba4e894285bd5d46c499bd7fb926ca6053ba002206f630b424989e876df0efc4055895abfcbb73bd7962512fe1deb1999fc1ec3f1412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                        value: 4888538,
                        sequenceNo: 4294967295,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    },
                ],
                outputs: [
                    {
                        value: 1000000,
                        outputScript:
                            '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
                        spentBy: {
                            txid: '6fb5525bf35ec6eb6a0608c8a3624891801cdf4c1079fc78462a24230bad27e2',
                            outIdx: 0,
                        },
                    },
                    {
                        value: 4364651,
                        outputScript:
                            '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                        spentBy: {
                            txid: '2bbcbf5e5e8c753991a37402f4ae60e49a0927c20927dba32862cf9c4af87f25',
                            outIdx: 0,
                        },
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
                parsed: {
                    xecTxType: 'Received',
                    satoshisSent: 1000000,
                    stackArray: [],
                    recipients: [
                        'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                    ],
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
                wif: '',
            },
        ],
    ]),
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
                value: 1253,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010747454e45534953035653500b56657370656e65204761733468747470733a2f2f73696d706c652e77696b6970656469612e6f72672f77696b692f5374617243726166742347616d65706c61794c0001094c000829a2241af62c0000',
            },
            {
                value: 546,
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
                    amount: '3000000000000000000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'fc1ada187e9f5da7616f481c79cd0fa3aafa3d4094288db6806e7508f76b5fcd',
                    outIdx: 1,
                },
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
                actualBurnAmount: '0',
                intentionalBurn: '0',
                burnsMintBatons: false,
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
                amount: '2999998798000000000',
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
                value: 6231556,
                sequenceNo: 4294967294,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010747454e45534953044245415207426561724e69701468747470733a2f2f636173687461622e636f6d2f4c0001004c0008000000000000115c',
            },
            {
                value: 546,
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
                    amount: '4444',
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '9e7f91826cfd3adf9867c1b3d102594eff4743825fad9883c35d26fb3bdc1693',
                    outIdx: 1,
                },
            },
            {
                value: 6230555,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '27a2471afab33d82b9404df12e1fa242488a9439a68e540dcf8f811ef39c11cf',
                    outIdx: 0,
                },
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
                actualBurnAmount: '0',
                intentionalBurn: '0',
                burnsMintBatons: false,
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
                amount: '4441',
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
                value: 2200,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010747454e4553495306434143484554064361636865741468747470733a2f2f636173687461622e636f6d2f4c0001020102080000000000989680',
            },
            {
                value: 546,
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
                    amount: '10000000',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 546,
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
                    amount: '0',
                    isMintBaton: true,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '4b5b2a0f8bcacf6bccc7ef49e7f82a894c9c599589450eaeaf423e0f5926c38e',
                    outIdx: 0,
                },
            },
            {
                value: 773,
                outputScript:
                    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                spentBy: {
                    txid: '343356b9d4acd59065f90b1ace647c1f714f1fd4c411e2cf77081a0246c7416d',
                    outIdx: 3,
                },
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
                actualBurnAmount: '0',
                intentionalBurn: '0',
                burnsMintBatons: false,
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
                amount: '2999998798000000000',
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
                value: 998857,
                sequenceNo: 4294967295,
                outputScript:
                    '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001010747454e45534953034d53420e4d696e742053656e64204275726e1468747470733a2f2f636173687461622e636f6d2f4c000109010208ffffffffffffffff',
            },
            {
                value: 546,
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
                    amount: '18446744073709551615',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 546,
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
                    amount: '0',
                    isMintBaton: true,
                    entryIdx: 0,
                },
            },
            {
                value: 997081,
                outputScript:
                    '76a91400549451e5c22b18686cacdf34dce649e5ec3be288ac',
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
                actualBurnAmount: '0',
                intentionalBurn: '0',
                burnsMintBatons: false,
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
                amount: '18446744073709551615',
            },
        },
        // Note that Cashtab will mark a token as fixed supply if there are no mint batons in its utxos by tokenId
        {
            ...MOCK_TOKEN_UTXO,
            token: {
                ...MOCK_TOKEN_UTXO.token,
                tokenId:
                    '182679afdec6d93fe7243f3ec5d032838cf9f268cf9656c4959a227617d076ef',
                amount: '0',
                isMintBaton: true,
            },
        },
    ],
};

// SLP 1 NFT Parent
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
                value: 2200,
                sequenceNo: 4294967295,
                outputScript:
                    '76a9140d94ba179ec21c42417a71a77873b3619363d8ea88ac',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a04534c500001810747454e45534953034142430a41424320426c6f636b731668747470733a2f2f626974636f696e6162632e6f7267200a40beb8dbac1ff8938733a383d265fde5777da779135cab32e1720bd222c42c01000102080000000000000064',
            },
            {
                value: 546,
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
                    amount: '100',
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                value: 546,
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
                    amount: '0',
                    isMintBaton: true,
                    entryIdx: 0,
                },
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
                actualBurnAmount: '0',
                intentionalBurn: '0',
                burnsMintBatons: false,
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
            value: 546,
            isFinal: true,
            token: {
                tokenId:
                    '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                amount: '100',
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
            value: 546,
            isFinal: true,
            token: {
                tokenId:
                    '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 129,
                },
                amount: '0',
                isMintBaton: true,
            },
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
                value: 4000,
                sequenceNo: 4294967295,
                outputScript: 'a914c5a7353c6e99facb5c254cc28e882a3feac12daa87',
            },
        ],
        outputs: [
            {
                value: 0,
                outputScript:
                    '6a504c63534c5032000747454e4553495304744352440854657374204352441868747470733a2f2f6372642e6e6574776f726b2f74637264090000000000000000002103d2dc0cea5c81593f1bfcd42763a21f5c85e7e8d053cdf990f8b383b892b72420040001',
            },
            {
                value: 546,
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
                    amount: '0',
                    isMintBaton: true,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '81ced8cfd5c69164a94cf50758f95750d3a589bfdd2cec6ee403f205cb29b5c3',
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
                actualBurnAmount: '0',
                intentionalBurn: '0',
                burnsMintBatons: false,
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
                amount: '1113670000',
            },
        },
        // Note that Cashtab will mark a token as fixed supply if there are no mint batons in its utxos by tokenId
        {
            ...MOCK_TOKEN_UTXO,
            token: {
                ...MOCK_TOKEN_UTXO.token,
                tokenId:
                    '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
                amount: '0',
                isMintBaton: true,
            },
        },
    ],
};

export const supportedTokens = [
    slp1FixedMocks,
    slp1VarMocks,
    slp1NftParentMocks,
    alpMocks,
];

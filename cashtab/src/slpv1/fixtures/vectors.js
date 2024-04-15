// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Test vectors for slpv1 functions
import appConfig from 'config/app';
import { mockBurnOpReturnTokenUtxos, mockBurnAllTokenUtxos } from './mocks';
import { BN } from 'slp-mdm';
import { MAX_MINT_AMOUNT_TOKEN_SATOSHIS } from 'slpv1';

const GENESIS_MINT_ADDRESS = 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y';
export const SEND_DESTINATION_ADDRESS =
    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx';
export const MOCK_TOKEN_ID =
    '1111111111111111111111111111111111111111111111111111111111111111';

export default {
    getSlpGenesisTargetOutput: {
        expectedReturns: [
            {
                description: 'Fixed supply eToken mint for token with decimals',
                genesisConfig: {
                    name: 'ethantest',
                    ticker: 'ETN',
                    documentUrl: 'https://cashtab.com/',
                    decimals: '3',
                    initialQty: '5000',
                    documentHash: '',
                    mintBatonVout: null,
                },
                targetOutputs: [
                    {
                        value: 0,
                        script: '6a04534c500001010747454e455349530345544e09657468616e746573741468747470733a2f2f636173687461622e636f6d2f4c0001034c000800000000004c4b40',
                    },
                    {
                        value: appConfig.dustSats,
                    },
                ],
            },
            {
                description:
                    'Variable supply eToken mint for token with decimals',
                genesisConfig: {
                    name: 'ethantest',
                    ticker: 'ETN',
                    documentUrl: 'https://cashtab.com/',
                    decimals: '3',
                    initialQty: '5000',
                    documentHash: '',
                    mintBatonVout: 2,
                },
                targetOutputs: [
                    {
                        value: 0,
                        script: '6a04534c500001010747454e455349530345544e09657468616e746573741468747470733a2f2f636173687461622e636f6d2f4c00010301020800000000004c4b40',
                    },
                    {
                        value: appConfig.dustSats,
                    },
                    {
                        value: appConfig.dustSats,
                    },
                ],
            },
            {
                description:
                    'Fixed supply eToken mint for tokenId 50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                genesisConfig: {
                    name: 'tabcash',
                    ticker: 'TBC',
                    documentUrl: 'https://cashtabapp.com/',
                    decimals: '0',
                    initialQty: '100',
                    documentHash: '',
                    mintBatonVout: 2,
                },
                targetOutputs: [
                    {
                        value: 0,
                        script: '6a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c0001000102080000000000000064',
                    },
                    {
                        value: appConfig.dustSats,
                    },
                ],
            },
            {
                description:
                    'Fixed supply eToken mint at max supply for 9 decimal token',
                genesisConfig: {
                    name: 'tabcash',
                    ticker: 'TBC',
                    documentUrl: 'https://cashtabapp.com/',
                    decimals: '9',
                    initialQty: '18446744073.709551615',
                    documentHash: '',
                    mintBatonVout: null,
                },
                targetOutputs: [
                    {
                        value: 0,
                        script: '6a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c0001094c0008ffffffffffffffff',
                    },
                    {
                        value: appConfig.dustSats,
                    },
                ],
            },
            {
                description:
                    'Variable supply eToken mint at max supply for 0 decimal token',
                genesisConfig: {
                    name: 'tabcash',
                    ticker: 'TBC',
                    documentUrl: 'https://cashtabapp.com/',
                    decimals: '0',
                    initialQty: MAX_MINT_AMOUNT_TOKEN_SATOSHIS,
                    documentHash: '',
                    mintBatonVout: 2,
                },
                targetOutputs: [
                    {
                        value: 0,
                        script: '6a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c000100010208ffffffffffffffff',
                    },
                    {
                        value: appConfig.dustSats,
                        address: GENESIS_MINT_ADDRESS,
                    },
                ],
            },
        ],
        expectedErrors: [
            {
                description:
                    'Variable supply eToken with mint baton at index other than 2',
                genesisConfig: {
                    name: 'ethantest',
                    ticker: 'ETN',
                    documentUrl: 'https://cashtab.com/',
                    decimals: '3',
                    initialQty: '5000',
                    documentHash: '',
                    mintBatonVout: 3,
                },
                errorMsg:
                    'Cashtab only supports slpv1 genesis txs for fixed supply tokens or tokens with mint baton at index 2',
            },
            {
                description: 'Exceed 0xffffffffffffffff for genesis qty',
                genesisConfig: {
                    name: 'ethantest',
                    ticker: 'ETN',
                    documentUrl: 'https://cashtab.com/',
                    decimals: '0',
                    initialQty: `${MAX_MINT_AMOUNT_TOKEN_SATOSHIS}1`,
                    documentHash: '',
                    mintBatonVout: 2,
                },
                errorMsg: 'bn outside of range',
            },
            {
                description: 'Invalid document hash',
                genesisConfig: {
                    name: 'tabcash',
                    ticker: 'TBC',
                    documentUrl: 'https://cashtabapp.com/',
                    decimals: '0',
                    initialQty: '100',
                    documentHash: 'not hex and not the right length',
                    mintBatonVout: 2,
                },
                errorMsg: 'documentHash must be either 0 or 32 hex bytes',
            },
            {
                description: 'Missing decimals',
                genesisConfig: {
                    name: 'some token name',
                    ticker: 'some ticker',
                    documentUrl: 'https://cashtab.com/',
                    initialQty: '100',
                    documentHash: '',
                    mintBatonVout: null,
                },
                errorMsg: 'bn not an integer',
            },
            {
                description: 'Non-string name',
                genesisConfig: {
                    name: { tokenName: 'theName' },
                    ticker: 'some ticker',
                    documentUrl: 'https://cashtab.com/',
                    initialQty: '100',
                    documentHash: '',
                    mintBatonVout: null,
                },
                errorMsg:
                    'The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of Object',
            },
        ],
    },
    burnTxs: {
        expectedReturns: [
            {
                // https://explorer.e.cash/tx/60a189da01e115776e9234429a6d2559d0e9ed49fc3e52f8a88341712571e3b7
                description: 'Burn a fraction of balance',
                tokenId:
                    '4209be6bd48937263edef94ceaf77a417ab1b35b0c69559cfdf4a435e2bf1a88',
                burnQty: '1000',
                tokenUtxos: mockBurnOpReturnTokenUtxos,
                tokenInputInfo: {
                    // we don't need tokenUtxos as an input param for burns
                    tokenId:
                        '4209be6bd48937263edef94ceaf77a417ab1b35b0c69559cfdf4a435e2bf1a88',
                    sendAmounts: [new BN('100000'), new BN('49900000')],
                },
                decimals: 2,
                outputScriptHex:
                    '6a04534c500001010453454e44204209be6bd48937263edef94ceaf77a417ab1b35b0c69559cfdf4a435e2bf1a88080000000002f969e0',
            },
            {
                // https://explorer.e.cash/tx/3ec07567e5f205a312db3f7704d68a6d8ea9451a44ade3e4d9d3e75f59e681ec
                description: 'Burn all balance',
                tokenId:
                    '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                burnQty: '888.00888888',
                tokenUtxos: mockBurnAllTokenUtxos,
                decimals: 8,
                tokenInputInfo: {
                    // we don't need tokenUtxos as an input param for burns
                    tokenId:
                        '56e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55',
                    sendAmounts: [new BN('88800888888')],
                },
                outputScriptHex:
                    '6a04534c500001010453454e442056e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55080000000000000000',
            },
        ],
    },
    getAllSendUtxos: {
        expectedReturns: [
            {
                description:
                    'In-node: We can get a single token utxo from an array including other token utxos and non-token utxos',
                utxos: [
                    {
                        value: 546,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: 546,
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                ],
                tokenId:
                    'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                tokenUtxos: [
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                ],
            },
            {
                description:
                    'In-node: We can get a multiple token utxos from an array including other token utxos and non-token utxos',
                utxos: [
                    {
                        value: 546,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: 546,
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            amount: '4588000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            amount: '229400000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            amount: '229400000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                ],
                tokenId:
                    '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                tokenUtxos: [
                    {
                        value: 546,
                        token: {
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            amount: '4588000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            amount: '229400000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            amount: '229400000',
                            isMintBaton: false,
                        },
                    },
                ],
            },
            {
                description:
                    'We return an empty array if no matches are found from a bad tokenId',
                utxos: [
                    {
                        value: 546,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: 546,
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                ],
                tokenId: 'justsomestring',
                tokenUtxos: [],
            },
            {
                description:
                    'In-node: We return an empty array if we have no tokenUtxos for a given tokenId',
                utxos: [
                    {
                        value: 546,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: 546,
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                ],
                tokenId:
                    '55180a2527901ed4d7ef8f4d61d38d3543b0e7ac3aba04e7f4d3165c3320a6da',
                tokenUtxos: [],
            },
        ],
    },
    getSendTokenInputs: {
        expectedReturns: [
            {
                description: 'Token send with change output',
                allSendUtxos: [
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                ],
                sendQty: '15',
                tokenId: MOCK_TOKEN_ID,
                decimals: 0,
                tokenInputs: [
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                ],
                sendAmounts: [new BN('15'), new BN('5')],
                targetOutputs: [
                    {
                        value: 0,
                        script: '6a04534c500001010453454e4420111111111111111111111111111111111111111111111111111111111111111108000000000000000f080000000000000005',
                    },
                    {
                        value: appConfig.dustSats,
                        address: SEND_DESTINATION_ADDRESS,
                    },
                ],
            },
            {
                description: 'Token send with no change output',
                allSendUtxos: [
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                ],
                sendQty: '30',
                tokenId: MOCK_TOKEN_ID,
                decimals: 0,
                tokenInputs: [
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                ],
                sendAmounts: [new BN('30')],
                targetOutputs: [
                    {
                        value: 0,
                        script: '6a04534c500001010453454e4420111111111111111111111111111111111111111111111111111111111111111108000000000000001e',
                    },
                    {
                        value: appConfig.dustSats,
                        address: SEND_DESTINATION_ADDRESS,
                    },
                ],
            },
            {
                description: 'Token send with decimals and change output',
                allSendUtxos: [
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                ],
                sendQty: '15',
                tokenId: MOCK_TOKEN_ID,
                decimals: 7,
                tokenInputs: [
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                ],
                sendAmounts: [new BN('150000000'), new BN('50000000')],
                targetOutputs: [
                    {
                        value: 0,
                        script: '6a04534c500001010453454e44201111111111111111111111111111111111111111111111111111111111111111080000000008f0d180080000000002faf080',
                    },
                    {
                        value: appConfig.dustSats,
                        address: SEND_DESTINATION_ADDRESS,
                    },
                ],
            },
        ],
        expectedErrors: [
            {
                description:
                    'Sending more than utxos with decimals and change output',
                allSendUtxos: [
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                ],
                sendQty: '35',
                tokenId: MOCK_TOKEN_ID,
                decimals: 7,
                errorMsg:
                    'tokenUtxos have insufficient balance 30.0000000 to send 35.0000000',
            },
            {
                description: 'Sending more than utxos with no decimals',
                allSendUtxos: [
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                ],
                sendQty: '350000000',
                tokenId: MOCK_TOKEN_ID,
                decimals: 0,
                errorMsg:
                    'tokenUtxos have insufficient balance 300000000 to send 350000000',
            },
            {
                description: 'Invalid decimals',
                allSendUtxos: [
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                ],
                sendQty: '35',
                tokenId: MOCK_TOKEN_ID,
                decimals: 10,
                errorMsg:
                    'Invalid decimals 10 for tokenId 1111111111111111111111111111111111111111111111111111111111111111. Decimals must be an integer 0-9.',
            },
            {
                description: 'No token utxos',
                allSendUtxos: [
                    {
                        token: {
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                ],
                sendQty: '35',
                tokenId: MOCK_TOKEN_ID,
                decimals: 10,
                errorMsg:
                    'No token utxos for tokenId "1111111111111111111111111111111111111111111111111111111111111111"',
            },
            {
                description: 'Send qty is empty string',
                allSendUtxos: [
                    {
                        token: {
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                ],
                sendQty: '',
                tokenId: MOCK_TOKEN_ID,
                decimals: 10,
                errorMsg:
                    'Invalid sendQty empty string. sendQty must be a decimalized number as a string.',
            },
        ],
    },
    explicitBurns: {
        expectedReturns: [
            {
                description: 'Burn a single token utxo',
                burnUtxos: [
                    {
                        value: 546,
                        token: {
                            tokenId:
                                '3333333333333333333333333333333333333333333333333333333333333333',
                            amount: '100',
                        },
                    },
                ],
                decimals: 9,
                outputScriptHex:
                    '6a04534c50000101044255524e20333333333333333333333333333333333333333333333333333333333333333308000000174876e800',
            },
            {
                description: 'Burns multiple token utxos',
                burnUtxos: [
                    {
                        value: 546,
                        token: {
                            tokenId:
                                '3333333333333333333333333333333333333333333333333333333333333333',
                            amount: '100',
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                '3333333333333333333333333333333333333333333333333333333333333333',
                            amount: '197200',
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                '3333333333333333333333333333333333333333333333333333333333333333',
                            amount: '12500',
                        },
                    },
                ],
                decimals: 9,
                outputScriptHex:
                    '6a04534c50000101044255524e203333333333333333333333333333333333333333333333333333333333333333080000becfde795000',
            },
            {
                description: 'Burns max slp quantity for 9 decimals',
                burnUtxos: [
                    {
                        value: 546,
                        token: {
                            tokenId:
                                '3333333333333333333333333333333333333333333333333333333333333333',
                            amount: '10000000000',
                        },
                    },
                ],
                decimals: 9,
                outputScriptHex:
                    '6a04534c50000101044255524e203333333333333333333333333333333333333333333333333333333333333333088ac7230489e80000',
            },
        ],
    },
    getMintBatons: {
        expectedReturns: [
            {
                description: 'We can get a single mint baton',
                utxos: [
                    {
                        value: 546,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                    {
                        value: 546,
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                ],
                tokenId: MOCK_TOKEN_ID,
                returned: [
                    {
                        value: 546,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                ],
            },
            {
                description:
                    'We can get the correct mint baton from from an array including other token utxos, mint batons, and non-token utxos',
                utxos: [
                    {
                        value: 546,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                    {
                        value: 546,
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            amount: '4588000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            amount: '229400000',
                            isMintBaton: true,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            amount: '229400000',
                            isMintBaton: true,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                ],
                tokenId: MOCK_TOKEN_ID,
                returned: [
                    {
                        value: 546,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                ],
            },
            {
                description: 'We can get multiple mint batons',
                utxos: [
                    {
                        value: 546,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                    {
                        value: 546,
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            amount: '4588000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            amount: '229400000',
                            isMintBaton: true,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            amount: '229400000',
                            isMintBaton: true,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                ],
                tokenId: MOCK_TOKEN_ID,
                returned: [
                    {
                        value: 546,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                ],
            },
            {
                description:
                    'We return an empty array if no matches are found from a bad tokenId',
                utxos: [
                    {
                        value: 546,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: 546,
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                ],
                tokenId: 'justsomestring',
                returned: [],
            },
            {
                description:
                    'We return an empty array if we have no mint batons for a given tokenId',
                utxos: [
                    {
                        value: 546,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                    {
                        value: 546,
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                    {
                        value: 546,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                ],
                tokenId: MOCK_TOKEN_ID,
                returned: [],
            },
        ],
    },
    getMintTargetOutputs: {
        expectedReturns: [
            {
                description:
                    'Creates expected mint outputs for a 0-decimal token',
                tokenId: MOCK_TOKEN_ID,
                decimals: 0,
                mintQty: '1000',
                script: `6a04534c50000101044d494e5420${MOCK_TOKEN_ID}01020800000000000003e8`,
            },
            {
                description:
                    'Creates expected mint outputs for a 9-decimal token',
                tokenId: MOCK_TOKEN_ID,
                decimals: 9,
                mintQty: '1000.123456789',
                script: `6a04534c50000101044d494e5420${MOCK_TOKEN_ID}010208000000e8dc00dd15`,
            },
            {
                description:
                    'Can create a target output for the largest mint qty supported by slpv1',
                tokenId: MOCK_TOKEN_ID,
                decimals: 0,
                mintQty: '18446744073709551615',
                script: `6a04534c50000101044d494e5420${MOCK_TOKEN_ID}010208ffffffffffffffff`,
            },
        ],
        expectedErrors: [
            {
                description:
                    'Throws expected error if asked to mint 1 more than slpv1 max qty',
                tokenId: MOCK_TOKEN_ID,
                decimals: 0,
                mintQty: '18446744073709551616',
                error: 'bn outside of range',
            },
        ],
    },
    getMaxMintAmount: {
        expectedReturns: [
            {
                description: '0 decimals',
                decimals: 0,
                returned: MAX_MINT_AMOUNT_TOKEN_SATOSHIS,
            },
            {
                description: '1 decimals',
                decimals: 1,
                returned: '1844674407370955161.5',
            },
            {
                description: '2 decimals',
                decimals: 2,
                returned: '184467440737095516.15',
            },
            {
                description: '3 decimals',
                decimals: 3,
                returned: '18446744073709551.615',
            },
            {
                description: '4 decimals',
                decimals: 4,
                returned: '1844674407370955.1615',
            },
            {
                description: '5 decimals',
                decimals: 5,
                returned: '184467440737095.51615',
            },
            {
                description: '6 decimals',
                decimals: 6,
                returned: '18446744073709.551615',
            },
            {
                description: '7 decimals',
                decimals: 7,
                returned: '1844674407370.9551615',
            },
            {
                description: '8 decimals',
                decimals: 8,
                returned: '184467440737.09551615',
            },
            {
                description: '9 decimals',
                decimals: 9,
                returned: '18446744073.709551615',
            },
        ],
    },
    getNftParentGenesisTargetOutputs: {
        expectedReturns: [
            {
                description: 'Fixed supply NFT1 parent',
                genesisConfig: {
                    name: 'NFT1 Parent Test',
                    ticker: 'NPT',
                    documentUrl: 'https://cashtab.com/',
                    initialQty: '100',
                    documentHash:
                        '0000000000000000108da5cf31407c9261d489171db51a88cc400c7590eb087c',
                    mintBatonVout: null,
                },
                targetOutputs: [
                    {
                        value: 0,
                        script: Buffer.from(
                            '6a04534c500001810747454e45534953034e5054104e46543120506172656e7420546573741468747470733a2f2f636173687461622e636f6d2f200000000000000000108da5cf31407c9261d489171db51a88cc400c7590eb087c01004c00080000000000000064',
                            'hex',
                        ),
                    },
                    {
                        value: appConfig.dustSats,
                    },
                ],
            },
            {
                description: 'Variable supply NFT1 parent',
                genesisConfig: {
                    name: 'NFT1 Parent Test',
                    ticker: 'NPT',
                    documentUrl: 'https://cashtab.com/',
                    initialQty: '100',
                    documentHash:
                        '0000000000000000108da5cf31407c9261d489171db51a88cc400c7590eb087c',
                    mintBatonVout: 2,
                },
                targetOutputs: [
                    {
                        value: 0,
                        script: Buffer.from(
                            '6a04534c500001810747454e45534953034e5054104e46543120506172656e7420546573741468747470733a2f2f636173687461622e636f6d2f200000000000000000108da5cf31407c9261d489171db51a88cc400c7590eb087c01000102080000000000000064',
                            'hex',
                        ),
                    },
                    {
                        value: appConfig.dustSats,
                    },
                    {
                        value: appConfig.dustSats,
                    },
                ],
            },
            {
                description: 'NFT1 parent genesis at max supply',
                genesisConfig: {
                    name: 'NFT1 Parent Test',
                    ticker: 'NPT',
                    documentUrl: 'https://cashtab.com/',
                    initialQty: MAX_MINT_AMOUNT_TOKEN_SATOSHIS,
                    documentHash:
                        '0000000000000000108da5cf31407c9261d489171db51a88cc400c7590eb087c',
                    mintBatonVout: null,
                },
                targetOutputs: [
                    {
                        value: 0,
                        script: Buffer.from(
                            '6a04534c500001810747454e45534953034e5054104e46543120506172656e7420546573741468747470733a2f2f636173687461622e636f6d2f200000000000000000108da5cf31407c9261d489171db51a88cc400c7590eb087c01004c0008ffffffffffffffff',
                            'hex',
                        ),
                    },
                    {
                        value: appConfig.dustSats,
                    },
                ],
            },
        ],
        expectedErrors: [
            {
                description:
                    'Variable supply NFT1 parent with mintBatonVout !== 2',
                genesisConfig: {
                    name: 'NFT1 Parent Test',
                    ticker: 'NPT',
                    documentUrl: 'https://cashtab.com/',
                    initialQty: '100',
                    documentHash:
                        '0000000000000000108da5cf31407c9261d489171db51a88cc400c7590eb087c',
                    mintBatonVout: 3,
                },
                errorMsg:
                    'Cashtab only supports slpv1 genesis txs for fixed supply tokens or tokens with mint baton at index 2',
            },
            {
                description: 'Exceed 0xffffffffffffffff for genesis qty',
                genesisConfig: {
                    name: 'NFT1 Parent Test',
                    ticker: 'NPT',
                    documentUrl: 'https://cashtab.com/',
                    initialQty: `${MAX_MINT_AMOUNT_TOKEN_SATOSHIS}1`,
                    documentHash:
                        '0000000000000000108da5cf31407c9261d489171db51a88cc400c7590eb087c',
                    mintBatonVout: null,
                },
                mintAddress: GENESIS_MINT_ADDRESS,
                errorMsg: 'bn outside of range',
            },
            {
                description: 'Initial qty is not an integer',
                genesisConfig: {
                    name: 'NFT1 Parent Test',
                    ticker: 'NPT',
                    documentUrl: 'https://cashtab.com/',
                    initialQty: new BN(100.123),
                    documentHash:
                        '0000000000000000108da5cf31407c9261d489171db51a88cc400c7590eb087c',
                    mintBatonVout: null,
                },
                errorMsg: 'bn not an integer',
            },
        ],
    },
    getNftParentMintTargetOutputs: {
        expectedReturns: [
            {
                description:
                    'Generates expected outputs for an NFT1 parent mint',
                tokenId: MOCK_TOKEN_ID,
                mintQty: '1000',
                targetOutputs: [
                    {
                        value: 0,
                        script: Buffer.from(
                            `6a04534c50000181044d494e5420${MOCK_TOKEN_ID}01020800000000000003e8`,
                            'hex',
                        ),
                    },
                    { value: 546 },
                    { value: 546 },
                ],
            },
            {
                description:
                    'Can create a target output for the largest mint qty supported by slpv1',
                tokenId: MOCK_TOKEN_ID,
                mintQty: '18446744073709551615',
                targetOutputs: [
                    {
                        value: 0,
                        script: Buffer.from(
                            `6a04534c50000181044d494e5420${MOCK_TOKEN_ID}010208ffffffffffffffff`,
                            'hex',
                        ),
                    },
                    { value: 546 },
                    { value: 546 },
                ],
            },
        ],
        expectedErrors: [
            {
                description:
                    'Throws expected error if asked to mint 1 more than slpv1 max qty',
                tokenId: MOCK_TOKEN_ID,
                mintQty: '18446744073709551616',
                error: 'bn outside of range',
            },
            {
                description:
                    'Throws expected error if asked to mint a non-integer quantity',
                tokenId: MOCK_TOKEN_ID,
                mintQty: '100.123',
                error: 'bn not an integer',
            },
        ],
    },
};

// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Test vectors for slpv1 functions
import appConfig from 'config/app';
import { mockBurnOpReturnTokenUtxos, mockBurnAllTokenUtxos } from './mocks';
import { BN } from 'slp-mdm';
import {
    MAX_MINT_AMOUNT_TOKEN_SATOSHIS,
    SLP1_NFT_CHILD_GENESIS_AMOUNT,
} from 'slpv1';

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
                    genesisQty: '5000',
                    documentHash: '',
                    mintBatonVout: null,
                },
                targetOutputs: [
                    {
                        value: 0,
                        script: Buffer.from(
                            '6a04534c500001010747454e455349530345544e09657468616e746573741468747470733a2f2f636173687461622e636f6d2f4c0001034c000800000000004c4b40',
                            'hex',
                        ),
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
                    genesisQty: '5000',
                    documentHash: '',
                    mintBatonVout: 2,
                },
                targetOutputs: [
                    {
                        value: 0,
                        script: Buffer.from(
                            '6a04534c500001010747454e455349530345544e09657468616e746573741468747470733a2f2f636173687461622e636f6d2f4c00010301020800000000004c4b40',
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
                description:
                    'Variable supply eToken mint for tokenId 50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                genesisConfig: {
                    name: 'tabcash',
                    ticker: 'TBC',
                    documentUrl: 'https://cashtabapp.com/',
                    decimals: '0',
                    genesisQty: '100',
                    documentHash: '',
                    mintBatonVout: 2,
                },
                targetOutputs: [
                    {
                        value: 0,
                        script: Buffer.from(
                            '6a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c0001000102080000000000000064',
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
                description:
                    'Fixed supply eToken mint at max supply for 9 decimal token',
                genesisConfig: {
                    name: 'tabcash',
                    ticker: 'TBC',
                    documentUrl: 'https://cashtabapp.com/',
                    decimals: '9',
                    genesisQty: '18446744073.709551615',
                    documentHash: '',
                    mintBatonVout: null,
                },
                targetOutputs: [
                    {
                        value: 0,
                        script: Buffer.from(
                            '6a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c0001094c0008ffffffffffffffff',
                            'hex',
                        ),
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
                    genesisQty: MAX_MINT_AMOUNT_TOKEN_SATOSHIS,
                    documentHash: '',
                    mintBatonVout: 2,
                },
                targetOutputs: [
                    {
                        value: 0,
                        script: Buffer.from(
                            '6a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c000100010208ffffffffffffffff',
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
                    genesisQty: '5000',
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
                    genesisQty: `${MAX_MINT_AMOUNT_TOKEN_SATOSHIS}1`,
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
                    genesisQty: '100',
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
                    genesisQty: '100',
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
                    genesisQty: '100',
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
                targetOutputs: [
                    {
                        value: 0,
                        script: Buffer.from(
                            '6a04534c500001010453454e44204209be6bd48937263edef94ceaf77a417ab1b35b0c69559cfdf4a435e2bf1a88080000000002f969e0',
                            'hex',
                        ),
                    },
                    { value: appConfig.dustSats },
                ],
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
                targetOutputs: [
                    {
                        value: 0,
                        script: Buffer.from(
                            '6a04534c500001010453454e442056e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55080000000000000000',
                            'hex',
                        ),
                    },
                    { value: appConfig.dustSats },
                ],
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
                        script: Buffer.from(
                            '6a04534c500001010453454e4420111111111111111111111111111111111111111111111111111111111111111108000000000000000f080000000000000005',
                            'hex',
                        ),
                    },
                    {
                        value: appConfig.dustSats,
                        address: SEND_DESTINATION_ADDRESS,
                    },
                    {
                        value: appConfig.dustSats,
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
                        script: Buffer.from(
                            '6a04534c500001010453454e4420111111111111111111111111111111111111111111111111111111111111111108000000000000001e',
                            'hex',
                        ),
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
                        script: Buffer.from(
                            '6a04534c500001010453454e44201111111111111111111111111111111111111111111111111111111111111111080000000008f0d180080000000002faf080',
                            'hex',
                        ),
                    },
                    {
                        value: appConfig.dustSats,
                        address: SEND_DESTINATION_ADDRESS,
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
                targetOutputs: [
                    {
                        value: 0,
                        script: Buffer.from(
                            `6a04534c50000101044d494e5420${MOCK_TOKEN_ID}01020800000000000003e8`,
                            'hex',
                        ),
                    },
                    { value: appConfig.dustSats },
                    { value: appConfig.dustSats },
                ],
            },
            {
                description:
                    'Creates expected mint outputs for a 9-decimal token',
                tokenId: MOCK_TOKEN_ID,
                decimals: 9,
                mintQty: '1000.123456789',
                targetOutputs: [
                    {
                        value: 0,
                        script: Buffer.from(
                            `6a04534c50000101044d494e5420${MOCK_TOKEN_ID}010208000000e8dc00dd15`,
                            'hex',
                        ),
                    },
                    { value: appConfig.dustSats },
                    { value: appConfig.dustSats },
                ],
            },
            {
                description:
                    'Can create a target output for the largest mint qty supported by slpv1',
                tokenId: MOCK_TOKEN_ID,
                decimals: 0,
                mintQty: '18446744073709551615',
                targetOutputs: [
                    {
                        value: 0,
                        script: Buffer.from(
                            `6a04534c50000101044d494e5420${MOCK_TOKEN_ID}010208ffffffffffffffff`,
                            'hex',
                        ),
                    },
                    { value: appConfig.dustSats },
                    { value: appConfig.dustSats },
                ],
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
                    genesisQty: '100',
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
                    genesisQty: '100',
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
                    genesisQty: MAX_MINT_AMOUNT_TOKEN_SATOSHIS,
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
                    genesisQty: '100',
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
                    genesisQty: `${MAX_MINT_AMOUNT_TOKEN_SATOSHIS}1`,
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
                    genesisQty: new BN(100.123),
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
    getNftParentFanInputs: {
        expectedReturns: [
            {
                description: 'Gets NFT1 parent spendable utxo with qty !== 1',
                tokenId: MOCK_TOKEN_ID,
                slpUtxos: [
                    { value: 546 },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100',
                            isMintBaton: false,
                        },
                    },
                ],
                returned: [
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100',
                            isMintBaton: false,
                        },
                    },
                ],
            },
            {
                description:
                    'Ignores NFT1 parent spendable utxo with qty === 1',
                tokenId: MOCK_TOKEN_ID,
                slpUtxos: [
                    { value: 546 },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1',
                            isMintBaton: false,
                        },
                    },
                ],
                returned: [],
            },
            {
                description:
                    'Returns multiple utxos at multiple amounts and ignores amount === 1',
                tokenId: MOCK_TOKEN_ID,
                slpUtxos: [
                    { value: 546 },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '2',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '3',
                            isMintBaton: false,
                        },
                    },
                ],
                returned: [
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '2',
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '3',
                            isMintBaton: false,
                        },
                    },
                ],
            },
            {
                description:
                    'Ignores a utxo if it has the right tokenId, the right amount, but is a mint baton for some reason (not expected to ever happen)',
                tokenId: MOCK_TOKEN_ID,
                slpUtxos: [
                    [
                        { value: 546 },
                        {
                            token: {
                                tokenId: MOCK_TOKEN_ID,
                                amount: '2',
                                isMintBaton: true,
                            },
                        },
                    ],
                ],
                returned: [],
            },
            {
                description:
                    'Ignores a utxo if it has the right amount, is not a mint baton, but has the wrong token id',
                tokenId: MOCK_TOKEN_ID,
                slpUtxos: [
                    [
                        { value: 546 },
                        {
                            token: {
                                tokenId:
                                    '2222222222222222222222222222222222222222222222222222222222222222',
                                amount: '100',
                                isMintBaton: false,
                            },
                        },
                    ],
                ],
                returned: [],
            },
        ],
    },
    getNftParentFanTxTargetOutputs: {
        expectedReturns: [
            {
                description:
                    'Gets 19 fan outputs for an NFT1 parent fan tx for max outputs and no change',
                fanInputs: [
                    {
                        outpoint: {
                            txid: '1111111111111111111111111111111111111111111111111111111111111111',
                            outIdx: 0,
                        },
                        value: 546,
                        token: { tokenId: MOCK_TOKEN_ID, amount: '19' },
                        path: 1899,
                    },
                ],
                returned: [
                    {
                        value: 0,
                        script: Buffer.from(
                            '6a04534c500001810453454e44201111111111111111111111111111111111111111111111111111111111111111080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001',
                            'hex',
                        ),
                    },
                ].concat(Array(19).fill({ value: appConfig.dustSats })),
                rawTx: {
                    hex: '02000000021111111111111111111111111111111111111111111111111111111111111111000000006441a052a96ddf50be866be7f320d493ed00d4095f0b2568ebe2469c9194af093399788bf96d448fff97b4f55fd8b373d16bd86dac80c7b7384d685c3c5280450941412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a800000000644183ddac59e648aea5776c2c4cd9cf04bce0c4d52f5511c91c49534d415a3c307668f31cc4cf697054016430c155fdb3d9a159ac5b886e7d5ff916dde2d7965dc3412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff150000000000000000d96a04534c500001810453454e4420111111111111111111111111111111111111111111111111111111111111111108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000122020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac2e170f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
                    txid: 'c2e390182ae4a60d72a6e84d749b96aa0345a6d46e1d7f858741862b6338f476',
                },
            },
            {
                description:
                    'Gets 18 fan outputs for an NFT1 parent fan tx for max outputs if we have change',
                fanInputs: [
                    {
                        outpoint: {
                            txid: '1111111111111111111111111111111111111111111111111111111111111112',
                            outIdx: 0,
                        },
                        value: 546,
                        token: { tokenId: MOCK_TOKEN_ID, amount: '100' },
                        path: 1899,
                    },
                ],
                returned: [
                    {
                        value: 0,
                        script: Buffer.from(
                            '6a04534c500001810453454e44201111111111111111111111111111111111111111111111111111111111111111080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000052',
                            'hex',
                        ),
                    },
                ].concat(Array(19).fill({ value: appConfig.dustSats })),
                rawTx: {
                    hex: '0200000002121111111111111111111111111111111111111111111111111111111111111100000000644174469e041aea3eb24860cb0f0e0eededd2cf331d9488c8404c2aeb1905b43ae8d421e8d53d385db63f2f5b63ffe6ccd5b911139bc4082aebacefc38bcbe94322412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a8000000006441d1ac7ebb818bed5b6aee56ee958a3fbd04cb38dae5cc1beceab5a47b3b830b6367011ec5ac4618a2366541193229047093a758b5ac196dc03b864b39119021eb412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff150000000000000000d96a04534c500001810453454e4420111111111111111111111111111111111111111111111111111111111111111108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000005222020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac2e170f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
                    txid: '406da5277c8efc497cd9efd826047ff3dc310a8a307d3f72e9f1792993f9079d',
                },
            },
            {
                description:
                    'Gets token amount fan outputs for an NFT1 parent fan tx if user has less than 19 of this token left',
                fanInputs: [
                    {
                        outpoint: {
                            txid: '1111111111111111111111111111111111111111111111111111111111111114',
                            outIdx: 0,
                        },
                        value: 546,
                        token: { tokenId: MOCK_TOKEN_ID, amount: '12' },
                        path: 1899,
                    },
                ],
                returned: [
                    {
                        value: 0,
                        script: Buffer.from(
                            '6a04534c500001810453454e44201111111111111111111111111111111111111111111111111111111111111111080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001',
                            'hex',
                        ),
                    },
                ].concat(Array(12).fill({ value: appConfig.dustSats })),
                rawTx: {
                    hex: '02000000021411111111111111111111111111111111111111111111111111111111111111000000006441f4a858c46ba25b9ffc56e9738b0dfc36799754696761fae70489f0aafaddea3310074cf0bdb710f890a3658ee0ae6390f0a7461c057b4137b173d2324a1dada9412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff4b451a9cdbc0ee92420e5b8179b432fa9af11a9fa835c4aefcd1a5d3882365a80000000064412e1501aceab58ac24d3fa0d8d58307a57fd820e216b65e62b342ff09e79278734e2a671c4671a93889b4093459ff2a43ee1dfaefd9ac61f9a61ebfcfe118f859412103b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921ffffffff0e00000000000000009a6a04534c500001810453454e4420111111111111111111111111111111111111111111111111111111111111111108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000122020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac22020000000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac49270f00000000001976a914c38232a045a85c84e5733d60e867dcee9ad4b18d88ac00000000',
                    txid: 'c4209cf2035c092b484d9649424727a911705e4ab8855f5165d38aeb21485ec9',
                },
            },
        ],
        expectedErrors: [
            {
                description: 'Throws error if called with no fanInputs',
                fanInputs: [],
                error: new Error(
                    'No eligible inputs for this NFT parent fan tx',
                ),
            },
        ],
    },
    getNftChildGenesisInput: {
        expectedReturns: [
            {
                description:
                    'Returns a single utxo of amount 1 if it exists in given utxo set',
                tokenId: MOCK_TOKEN_ID,
                slpUtxos: [
                    { value: 546 },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: SLP1_NFT_CHILD_GENESIS_AMOUNT,
                            isMintBaton: false,
                        },
                    },
                ],
                returned: [
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: SLP1_NFT_CHILD_GENESIS_AMOUNT,
                            isMintBaton: false,
                        },
                    },
                ],
            },
            {
                description:
                    'Does not return a single utxo of amount 1 if it exists in given utxo set and is a mint baton (not expected to ever happen)',
                tokenId: MOCK_TOKEN_ID,
                slpUtxos: [
                    { value: 546 },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: SLP1_NFT_CHILD_GENESIS_AMOUNT,
                            isMintBaton: true,
                        },
                    },
                ],
                returned: [],
            },
            {
                description:
                    'Returns a single utxo of amount 1 even if more than 1 eligible utxos exist in given utxo set',
                tokenId: MOCK_TOKEN_ID,
                slpUtxos: [
                    { value: 546 },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: SLP1_NFT_CHILD_GENESIS_AMOUNT,
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: SLP1_NFT_CHILD_GENESIS_AMOUNT,
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: SLP1_NFT_CHILD_GENESIS_AMOUNT,
                            isMintBaton: false,
                        },
                    },
                ],
                returned: [
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: SLP1_NFT_CHILD_GENESIS_AMOUNT,
                            isMintBaton: false,
                        },
                    },
                ],
            },
            {
                description:
                    'Returns an empty array even if parent token utxos exist but do not have amount === 1',
                tokenId: MOCK_TOKEN_ID,
                slpUtxos: [
                    { value: 546 },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            amount: '2',
                            isMintBaton: false,
                        },
                    },
                ],
                returned: [],
            },
            {
                description:
                    'Returns an empty array if no utxos of correct tokenId and amount exist',
                tokenId: MOCK_TOKEN_ID,
                slpUtxos: [
                    { value: 546 },
                    {
                        token: {
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                            amount: '1',
                            isMintBaton: false,
                        },
                    },
                ],
                returned: [],
            },
        ],
    },
    getNftChildGenesisTargetOutputs: {
        expectedReturns: [
            {
                description:
                    'We can generate the correct targetOutput for minting an NFT child genesis tx with data in all available fields',
                childGenesisConfig: {
                    ticker: 'TEST',
                    name: 'My favorite NFT',
                    documentUrl: 'cashtab.com',
                    documentHash:
                        '3333333333333333333333333333333333333333333333333333333333333333',
                },
                returned: [
                    {
                        value: 0,
                        script: Buffer.from(
                            '6a04534c500001410747454e4553495304544553540f4d79206661766f72697465204e46540b636173687461622e636f6d20333333333333333333333333333333333333333333333333333333333333333301004c00080000000000000001',
                            'hex',
                        ),
                    },
                    {
                        value: appConfig.dustSats,
                    },
                ],
            },
            {
                description:
                    'We can generate the correct targetOutput for minting an NFT child genesis tx with no data in any available fields',
                childGenesisConfig: {
                    ticker: '',
                    name: '',
                    documentUrl: '',
                    documentHash: '',
                },
                returned: [
                    {
                        value: 0,
                        script: Buffer.from(
                            '6a04534c500001410747454e455349534c004c004c004c0001004c00080000000000000001',
                            'hex',
                        ),
                    },
                    {
                        value: appConfig.dustSats,
                    },
                ],
            },
        ],
    },
    getNft: {
        expectedReturns: [
            {
                description: 'Returns the NFT if it exists in given utxo set',
                tokenId: MOCK_TOKEN_ID,
                slpUtxos: [
                    { value: 546 },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                        },
                    },
                ],
                returned: [
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                        },
                    },
                ],
            },
            {
                description:
                    'Returns an empty array if no utxos of correct tokenId are in this utxo set',
                tokenId: MOCK_TOKEN_ID,
                slpUtxos: [
                    { value: 546 },
                    {
                        token: {
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                        },
                    },
                ],
                returned: [],
            },
        ],
    },
    getNftChildSendTargetOutputs: {
        expectedReturns: [
            {
                description: 'We can get the target outputs for sending an NFT',
                tokenId: MOCK_TOKEN_ID,
                destinationAddress: SEND_DESTINATION_ADDRESS,
                returned: [
                    {
                        value: 0,
                        script: Buffer.from(
                            `6a04534c500001410453454e4420${MOCK_TOKEN_ID}080000000000000001`,
                            'hex',
                        ),
                    },
                    {
                        address: SEND_DESTINATION_ADDRESS,
                        value: appConfig.dustSats,
                    },
                ],
            },
        ],
    },
};

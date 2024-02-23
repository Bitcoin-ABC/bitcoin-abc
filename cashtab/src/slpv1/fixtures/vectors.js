// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Test vectors for slpv1 functions
import appConfig from 'config/app';
import { mockBurnOpReturnTokenUtxos, mockBurnAllTokenUtxos } from './mocks';
import { BN } from 'slp-mdm';

const GENESIS_MINT_ADDRESS = 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y';
export const SEND_DESTINATION_ADDRESS =
    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx';
export const MOCK_TOKEN_ID =
    '1111111111111111111111111111111111111111111111111111111111111111';

export default {
    genesisTxs: {
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
                mintAddress: GENESIS_MINT_ADDRESS,
                targetOutputs: [
                    {
                        value: 0,
                        script: '6a04534c500001010747454e455349530345544e09657468616e746573741468747470733a2f2f636173687461622e636f6d2f4c0001034c000800000000004c4b40',
                    },
                    {
                        value: appConfig.dustSats,
                        address: GENESIS_MINT_ADDRESS,
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
                mintAddress: GENESIS_MINT_ADDRESS,
                targetOutputs: [
                    {
                        value: 0,
                        script: '6a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c0001000102080000000000000064',
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
                mintAddress: GENESIS_MINT_ADDRESS,
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
                mintAddress: GENESIS_MINT_ADDRESS,
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
                mintAddress: GENESIS_MINT_ADDRESS,
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
                tokenUtxos: mockBurnOpReturnTokenUtxos,
                burnQty: '1000',
                outputScriptHex:
                    '6a04534c500001010453454e44204209be6bd48937263edef94ceaf77a417ab1b35b0c69559cfdf4a435e2bf1a88080000000002f969e0',
            },
            {
                // https://explorer.e.cash/tx/3ec07567e5f205a312db3f7704d68a6d8ea9451a44ade3e4d9d3e75f59e681ec
                description: 'Burn all balance',
                tokenUtxos: mockBurnAllTokenUtxos,
                burnQty: '888.00888888',
                outputScriptHex:
                    '6a04534c500001010453454e442056e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55080000000000000000',
            },
        ],
        expectedErrors: [
            {
                description: 'burnQty is not a string',
                tokenUtxos: mockBurnOpReturnTokenUtxos,
                burnQty: 1000,
                errorMsg: 'burnQty must be a string',
            },
            {
                description: 'tokenUtxos insufficient to cover burnQty',
                tokenUtxos: mockBurnOpReturnTokenUtxos,
                burnQty: '500000.01',
                errorMsg:
                    'tokenUtxos have insufficient balance 500000 to burn 500000.01',
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
                    'In-node and NNG: We return an empty array if no matches are found from a bad tokenId',
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
            // NNG
            {
                description:
                    'NNG: We can get a single token utxo from an array including other token utxos and non-token utxos',
                utxos: [
                    {
                        tokenId:
                            'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                        slpToken: { isMintBaton: false },
                    },
                ],
                tokenId:
                    'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                tokenUtxos: [
                    {
                        tokenId:
                            'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                        slpToken: { isMintBaton: false },
                    },
                ],
            },
            {
                description:
                    'NNG: We can get a multiple token utxos from an array including other token utxos and non-token utxos, ignoring mint baton',
                utxos: [
                    {
                        tokenId:
                            '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                        slpToken: { isMintBaton: false },
                    },
                    {
                        tokenId:
                            '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                        slpToken: { isMintBaton: false },
                    },
                    {
                        tokenId:
                            '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                        slpToken: { isMintBaton: false },
                    },
                    // mint baton not returned
                    {
                        tokenId:
                            '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                        slpToken: { isMintBaton: true },
                    },
                    {
                        tokenId: 'notamatch',
                        slpToken: { isMintBaton: false },
                    },
                ],
                tokenId:
                    '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                tokenUtxos: [
                    {
                        tokenId:
                            '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                        slpToken: { isMintBaton: false },
                    },
                    {
                        tokenId:
                            '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                        slpToken: { isMintBaton: false },
                    },
                    {
                        tokenId:
                            '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                        slpToken: { isMintBaton: false },
                    },
                ],
            },
            {
                description:
                    'NNG: We return an empty array if we have no tokenUtxos for a given tokenId',
                utxos: [
                    {
                        tokenId: 'notamatch',
                        slpToken: { isMintBaton: false },
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
                // https://explorer.e.cash/tx/727eddeaea7fb52333f91f38491e027cd150f86ea8dbdc9b04deaf819231e79b
                description:
                    'Legacy unit test of deprecated function generateSendOpReturn',
                allSendUtxos: [
                    {
                        slpToken: {
                            amount: '49995000',
                            isMintBaton: false,
                        },
                        tokenId:
                            '961ad8759908e7c8923f3c918e3c3d61ee67723c8f7b4664b7fe0ebcc17bbe48',
                        decimals: 3,
                    },
                ],
                tokenId:
                    '961ad8759908e7c8923f3c918e3c3d61ee67723c8f7b4664b7fe0ebcc17bbe48',
                sendQty: '50',
                tokenInputs: [
                    {
                        slpToken: {
                            amount: '49995000',
                            isMintBaton: false,
                        },
                        tokenId:
                            '961ad8759908e7c8923f3c918e3c3d61ee67723c8f7b4664b7fe0ebcc17bbe48',
                        decimals: 3,
                    },
                ],
                sendAmounts: [new BN('50000'), new BN('49945000')],
                targetOutputs: [
                    {
                        value: 0,
                        script: '6a04534c500001010453454e4420961ad8759908e7c8923f3c918e3c3d61ee67723c8f7b4664b7fe0ebcc17bbe4808000000000000c350080000000002fa19a8',
                    },
                    {
                        value: appConfig.etokenSats,
                        address: SEND_DESTINATION_ADDRESS,
                    },
                    {
                        value: appConfig.etokenSats,
                    },
                ],
            },
            {
                // https://explorer.e.cash/tx/0d943c72c3cbfaf7d1a5b889e62a6ef6e11a3df3a64792bea4499515e884b80a
                description: 'Token send with change output',
                allSendUtxos: [
                    {
                        slpToken: {
                            amount: '1',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 0,
                    },
                    {
                        slpToken: {
                            amount: '9999999688',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 0,
                    },
                ],
                tokenId:
                    '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                sendQty: '189',
                tokenInputs: [
                    {
                        slpToken: {
                            amount: '1',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 0,
                    },
                    {
                        slpToken: {
                            amount: '9999999688',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 0,
                    },
                ],
                sendAmounts: [new BN('189'), new BN('9999999500')],
                targetOutputs: [
                    {
                        value: 0,
                        script: '6a04534c500001010453454e44207bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b0800000000000000bd0800000002540be20c',
                    },
                    {
                        value: appConfig.etokenSats,
                        address: SEND_DESTINATION_ADDRESS,
                    },
                    {
                        value: appConfig.etokenSats,
                    },
                ],
            },
            {
                // https://explorer.e.cash/tx/0d943c72c3cbfaf7d1a5b889e62a6ef6e11a3df3a64792bea4499515e884b80a
                description:
                    'We ignore un-needed utxos in a token send with change output',
                // Double the utxos so we have more than just the exact qty needed
                allSendUtxos: [
                    {
                        slpToken: {
                            amount: '1',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 0,
                    },
                    {
                        slpToken: {
                            amount: '9999999688',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 0,
                    },
                    {
                        slpToken: {
                            amount: '1',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 0,
                    },
                    {
                        slpToken: {
                            amount: '9999999688',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 0,
                    },
                ],
                tokenId:
                    '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                sendQty: '189',
                tokenInputs: [
                    {
                        slpToken: {
                            amount: '1',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 0,
                    },
                    {
                        slpToken: {
                            amount: '9999999688',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 0,
                    },
                ],
                sendAmounts: [new BN('189'), new BN('9999999500')],
                targetOutputs: [
                    {
                        value: 0,
                        script: '6a04534c500001010453454e44207bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b0800000000000000bd0800000002540be20c',
                    },
                    {
                        value: appConfig.etokenSats,
                        address: SEND_DESTINATION_ADDRESS,
                    },
                    {
                        value: appConfig.etokenSats,
                    },
                ],
            },
            {
                // Not a real tx
                description: 'Token send with change output and decimals',
                allSendUtxos: [
                    {
                        slpToken: {
                            amount: '106',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 1,
                    },
                    {
                        slpToken: {
                            amount: '106',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 1,
                    },
                ],
                tokenId:
                    '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                sendQty: '21',
                tokenInputs: [
                    {
                        slpToken: {
                            amount: '106',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 1,
                    },
                    {
                        slpToken: {
                            amount: '106',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 1,
                    },
                ],
                sendAmounts: [new BN('210'), new BN('2')],
                targetOutputs: [
                    {
                        value: 0,
                        script: '6a04534c500001010453454e44207bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b0800000000000000d2080000000000000002',
                    },
                    {
                        value: appConfig.etokenSats,
                        address: SEND_DESTINATION_ADDRESS,
                    },
                    {
                        value: appConfig.etokenSats,
                    },
                ],
            },
            {
                // https://explorer.e.cash/tx/c83ba773641a05170b28bbea57a32945ba0df1f05aff48be606703d04be84368
                description: 'Token send with no change output',
                allSendUtxos: [
                    {
                        slpToken: {
                            amount: '9999999500',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 0,
                    },
                ],
                tokenId:
                    '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                sendQty: '9999999500',
                tokenInputs: [
                    {
                        slpToken: {
                            amount: '9999999500',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 0,
                    },
                ],
                sendAmounts: [new BN('9999999500')],
                targetOutputs: [
                    {
                        value: 0,
                        script: '6a04534c500001010453454e44207bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b0800000002540be20c',
                    },
                    {
                        value: appConfig.etokenSats,
                        address: SEND_DESTINATION_ADDRESS,
                    },
                ],
            },
            {
                // https://explorer.e.cash/tx/c83ba773641a05170b28bbea57a32945ba0df1f05aff48be606703d04be84368
                description: 'We ignore un-needed utxos in a tx with no change',
                // Double the utxos so we have more than just the exact qty needed
                allSendUtxos: [
                    {
                        slpToken: {
                            amount: '9999999500',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 0,
                    },
                    {
                        slpToken: {
                            amount: '9999999500',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 0,
                    },
                ],
                tokenId:
                    '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                sendQty: '9999999500',
                tokenInputs: [
                    {
                        slpToken: {
                            amount: '9999999500',
                            isMintBaton: false,
                        },
                        tokenId:
                            '7bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b',
                        decimals: 0,
                    },
                ],
                sendAmounts: [new BN('9999999500')],
                targetOutputs: [
                    {
                        value: 0,
                        script: '6a04534c500001010453454e44207bbf452698a24b138b0357f689587fc6ea58410c34503b1179b91e40e10bba8b0800000002540be20c',
                    },
                    {
                        value: appConfig.etokenSats,
                        address: SEND_DESTINATION_ADDRESS,
                    },
                ],
            },
            {
                description: 'Sending from a genesis tx with change',
                allSendUtxos: [
                    {
                        value: 546,
                        slpToken: {
                            amount: '12',
                            isMintBaton: false,
                        },
                        address:
                            'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                        tokenId:
                            'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                        decimals: 0,
                    },
                ],
                tokenId:
                    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                sendQty: '3',
                tokenInputs: [
                    {
                        value: 546,
                        slpToken: {
                            amount: '12',
                            isMintBaton: false,
                        },
                        address:
                            'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                        tokenId:
                            'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
                        decimals: 0,
                    },
                ],
                sendAmounts: [new BN('3'), new BN('9')],
                targetOutputs: [
                    {
                        value: 0,
                        script: '6a04534c500001010453454e4420b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7080000000000000003080000000000000009',
                    },
                    {
                        value: appConfig.etokenSats,
                        address: SEND_DESTINATION_ADDRESS,
                    },
                    {
                        value: appConfig.etokenSats,
                    },
                ],
            },
        ],
        expectedErrors: [
            {
                description: 'Token with decimals sending more than utxos',
                allSendUtxos: [
                    {
                        slpToken: {
                            amount: '49995000',
                            isMintBaton: false,
                        },
                        tokenId:
                            '961ad8759908e7c8923f3c918e3c3d61ee67723c8f7b4664b7fe0ebcc17bbe48',
                        decimals: 3,
                    },
                ],
                tokenId:
                    '961ad8759908e7c8923f3c918e3c3d61ee67723c8f7b4664b7fe0ebcc17bbe48',
                sendQty: '50000',
                errorMsg:
                    'tokenUtxos have insufficient balance 49995.000 to send 50000.000',
            },
            {
                description: 'Token with no decimals sending more than utxos',
                allSendUtxos: [
                    {
                        slpToken: {
                            amount: '49995000',
                            isMintBaton: false,
                        },
                        tokenId:
                            '961ad8759908e7c8923f3c918e3c3d61ee67723c8f7b4664b7fe0ebcc17bbe48',
                        decimals: 0,
                    },
                ],
                tokenId:
                    '961ad8759908e7c8923f3c918e3c3d61ee67723c8f7b4664b7fe0ebcc17bbe48',
                sendQty: '50000000',
                errorMsg:
                    'tokenUtxos have insufficient balance 49995000 to send 50000000',
            },
        ],
    },
    getSendTokenInputsInNode: {
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
                        value: appConfig.etokenSats,
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
                        value: appConfig.etokenSats,
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
                        value: appConfig.etokenSats,
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
};

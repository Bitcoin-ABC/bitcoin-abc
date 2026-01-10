// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Test vectors for slpv1 functions
import appConfig from 'config/app';
import { mockBurnOpReturnTokenUtxos, mockBurnAllTokenUtxos } from './mocks';
import {
    MAX_OUTPUT_AMOUNT_SLP_ATOMS,
    SLP1_NFT_CHILD_GENESIS_AMOUNT,
} from 'token-protocols/slpv1';
import { Script, fromHex } from 'ecash-lib';
import { undecimalizeTokenAmount } from 'wallet';

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
                genesisInfo: {
                    tokenName: 'ethantest',
                    tokenTicker: 'ETN',
                    url: 'https://cashtab.com/',
                    hash: '',
                    decimals: 3,
                },
                initialQuantity: BigInt(undecimalizeTokenAmount('5000', 3)),
                mintBatonOutIdx: undefined,
                targetOutputs: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a04534c500001010747454e455349530345544e09657468616e746573741468747470733a2f2f636173687461622e636f6d2f4c0001034c000800000000004c4b40',
                            ),
                        ),
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
                    },
                ],
            },
            {
                description:
                    'Variable supply eToken mint for token with decimals',
                genesisInfo: {
                    tokenName: 'ethantest',
                    tokenTicker: 'ETN',
                    url: 'https://cashtab.com/',
                    hash: '',
                    decimals: 3,
                },
                initialQuantity: BigInt(undecimalizeTokenAmount('5000', 3)),
                mintBatonOutIdx: 2,
                targetOutputs: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a04534c500001010747454e455349530345544e09657468616e746573741468747470733a2f2f636173687461622e636f6d2f4c00010301020800000000004c4b40',
                            ),
                        ),
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
                    },
                ],
            },
            {
                description:
                    'Variable supply eToken mint for tokenId 50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                genesisInfo: {
                    tokenName: 'tabcash',
                    tokenTicker: 'TBC',
                    url: 'https://cashtabapp.com/',
                    hash: '',
                    decimals: 0,
                },
                initialQuantity: 100n,
                mintBatonOutIdx: 2,
                targetOutputs: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c0001000102080000000000000064',
                            ),
                        ),
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
                    },
                ],
            },
            {
                description:
                    'Fixed supply eToken mint at max supply for 9 decimal token',
                genesisInfo: {
                    tokenName: 'tabcash',
                    tokenTicker: 'TBC',
                    url: 'https://cashtabapp.com/',
                    hash: '',
                    decimals: 9,
                },
                initialQuantity: BigInt(
                    undecimalizeTokenAmount('18446744073.709551615', 9),
                ),
                mintBatonOutIdx: undefined,
                targetOutputs: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c0001094c0008ffffffffffffffff',
                            ),
                        ),
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
                    },
                ],
            },
            {
                description:
                    'Variable supply eToken mint at max supply for 0 decimal token',
                genesisInfo: {
                    tokenName: 'tabcash',
                    tokenTicker: 'TBC',
                    url: 'https://cashtabapp.com/',
                    hash: '',
                    decimals: 0,
                },
                initialQuantity: MAX_OUTPUT_AMOUNT_SLP_ATOMS,
                mintBatonOutIdx: 2,
                targetOutputs: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a04534c500001010747454e455349530354424307746162636173681768747470733a2f2f636173687461626170702e636f6d2f4c000100010208ffffffffffffffff',
                            ),
                        ),
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
                    },
                ],
            },
        ],
        expectedErrors: [
            {
                description:
                    'Variable supply eToken with mint baton at index other than 2',
                genesisInfo: {
                    tokenName: 'ethantest',
                    tokenTicker: 'ETN',
                    url: 'https://cashtab.com/',
                    hash: '',
                    decimals: 3,
                },
                initialQuantity: BigInt(undecimalizeTokenAmount('5000', 3)),
                mintBatonOutIdx: 3,
                errorMsg:
                    'Cashtab only supports slpv1 genesis txs for fixed supply tokens or tokens with mint baton at index 2',
            },
            {
                description: 'Exceed 0xffffffffffffffff for genesis qty',
                genesisInfo: {
                    tokenName: 'ethantest',
                    tokenTicker: 'ETN',
                    url: 'https://cashtab.com/',
                    hash: '',
                    decimals: 0,
                },
                initialQuantity: BigInt(
                    `${MAX_OUTPUT_AMOUNT_SLP_ATOMS.toString()}1`,
                ),
                mintBatonOutIdx: 2,
                errorMsg: 'Atoms out of range: 184467440737095516151',
            },
            {
                description: 'Invalid document hash',
                genesisInfo: {
                    tokenName: 'tabcash',
                    tokenTicker: 'TBC',
                    url: 'https://cashtabapp.com/',
                    hash: 'not hex and not the right length',
                    decimals: 0,
                },
                initialQuantity: BigInt(undecimalizeTokenAmount('100', 0)),
                mintBatonOutIdx: 2,
                errorMsg: 'Invalid hex pair: no, at index 0',
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
                    sendAmounts: [100000n, 49900000n],
                },
                decimals: 2,
                targetOutputs: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a04534c500001010453454e44204209be6bd48937263edef94ceaf77a417ab1b35b0c69559cfdf4a435e2bf1a88080000000002f969e0',
                            ),
                        ),
                    },
                    { sats: BigInt(appConfig.dustSats) },
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
                    sendAmounts: [88800888888n],
                },
                targetOutputs: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a04534c500001010453454e442056e9b1d16c9989186c846187db57d9a9389c3ecc74e7237c1d1d0327cf904a55080000000000000000',
                            ),
                        ),
                    },
                    { sats: BigInt(appConfig.dustSats) },
                ],
            },
        ],
    },
    getMintBatons: {
        expectedReturns: [
            {
                description: 'We can get a single mint baton',
                utxos: [
                    {
                        sats: 546n,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 1000n,
                            isMintBaton: true,
                        },
                    },
                    {
                        sats: 546n,
                    },
                    {
                        sats: 546n,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
                            isMintBaton: true,
                        },
                    },
                    {
                        sats: 546n,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
                            isMintBaton: false,
                        },
                    },
                ],
                tokenId: MOCK_TOKEN_ID,
                returned: [
                    {
                        sats: 546n,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 1000n,
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
                        sats: 546n,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 1000n,
                            isMintBaton: true,
                        },
                    },
                    {
                        sats: 546n,
                    },
                    {
                        sats: 546n,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
                            isMintBaton: true,
                        },
                    },
                    {
                        sats: 546n,
                        token: {
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            atoms: 4588000000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        sats: 546n,
                        token: {
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            atoms: 229400000n,
                            isMintBaton: true,
                        },
                    },
                    {
                        sats: 546n,
                        token: {
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            atoms: 229400000n,
                            isMintBaton: true,
                        },
                    },
                    {
                        sats: 546n,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
                            isMintBaton: false,
                        },
                    },
                ],
                tokenId: MOCK_TOKEN_ID,
                returned: [
                    {
                        sats: 546n,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 1000n,
                            isMintBaton: true,
                        },
                    },
                ],
            },
            {
                description: 'We can get multiple mint batons',
                utxos: [
                    {
                        sats: 546n,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 1000n,
                            isMintBaton: true,
                        },
                    },
                    {
                        sats: 546n,
                    },
                    {
                        sats: 546n,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
                            isMintBaton: true,
                        },
                    },
                    {
                        sats: 546n,
                        token: {
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            atoms: 4588000000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        sats: 546n,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 1000n,
                            isMintBaton: true,
                        },
                    },
                    {
                        sats: 546n,
                        token: {
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            atoms: 229400000n,
                            isMintBaton: true,
                        },
                    },
                    {
                        sats: 546n,
                        token: {
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            atoms: 229400000n,
                            isMintBaton: true,
                        },
                    },
                    {
                        sats: 546n,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
                            isMintBaton: false,
                        },
                    },
                ],
                tokenId: MOCK_TOKEN_ID,
                returned: [
                    {
                        sats: 546n,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 1000n,
                            isMintBaton: true,
                        },
                    },
                    {
                        sats: 546n,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 1000n,
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
                        sats: 546n,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 1000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        sats: 546n,
                    },
                    {
                        sats: 546n,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
                            isMintBaton: true,
                        },
                    },
                    {
                        sats: 546n,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
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
                        sats: 546n,
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 1000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        sats: 546n,
                    },
                    {
                        sats: 546n,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
                            isMintBaton: true,
                        },
                    },
                    {
                        sats: 546n,
                        token: {
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
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
                tokenProtocolNumber: 1,
                targetOutputs: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                `6a04534c50000101044d494e5420${MOCK_TOKEN_ID}01020800000000000003e8`,
                            ),
                        ),
                    },
                    { sats: BigInt(appConfig.dustSats) },
                    { sats: BigInt(appConfig.dustSats) },
                ],
            },
            {
                description:
                    'Creates expected mint outputs for a 9-decimal token',
                tokenId: MOCK_TOKEN_ID,
                decimals: 9,
                mintQty: '1000.123456789',
                tokenProtocolNumber: 1,
                targetOutputs: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                `6a04534c50000101044d494e5420${MOCK_TOKEN_ID}010208000000e8dc00dd15`,
                            ),
                        ),
                    },
                    { sats: BigInt(appConfig.dustSats) },
                    { sats: BigInt(appConfig.dustSats) },
                ],
            },
            {
                description:
                    'Can create a target output for the largest mint qty supported by slpv1',
                tokenId: MOCK_TOKEN_ID,
                decimals: 0,
                mintQty: '18446744073709551615',
                tokenProtocolNumber: 1,
                targetOutputs: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                `6a04534c50000101044d494e5420${MOCK_TOKEN_ID}010208ffffffffffffffff`,
                            ),
                        ),
                    },
                    { sats: BigInt(appConfig.dustSats) },
                    { sats: BigInt(appConfig.dustSats) },
                ],
            },
            {
                description:
                    'Can create a target output for the largest mint qty supported by slpv1 for an NFT1 parent',
                tokenId: MOCK_TOKEN_ID,
                decimals: 0,
                mintQty: '18446744073709551615',
                tokenProtocolNumber: 0x81,
                targetOutputs: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                `6a04534c500001${'81'}044d494e5420${MOCK_TOKEN_ID}010208ffffffffffffffff`,
                            ),
                        ),
                    },
                    { sats: BigInt(appConfig.dustSats) },
                    { sats: BigInt(appConfig.dustSats) },
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
                tokenProtocolNumber: 1,
                error: 'Atoms out of range: 18446744073709551616',
            },
        ],
    },
    getMaxDecimalizedSlpQty: {
        expectedReturns: [
            {
                description: '0 decimals',
                decimals: 0,
                returned: MAX_OUTPUT_AMOUNT_SLP_ATOMS.toString(),
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
                genesisInfo: {
                    tokenName: 'NFT1 Parent Test',
                    tokenTicker: 'NPT',
                    url: 'https://cashtab.com/',
                    hash: '0000000000000000108da5cf31407c9261d489171db51a88cc400c7590eb087c',
                    decimals: 0,
                },
                initialQuantity: BigInt(100),
                mintBatonOutIdx: undefined,
                targetOutputs: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a04534c500001810747454e45534953034e5054104e46543120506172656e7420546573741468747470733a2f2f636173687461622e636f6d2f200000000000000000108da5cf31407c9261d489171db51a88cc400c7590eb087c01004c00080000000000000064',
                            ),
                        ),
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
                    },
                ],
            },
            {
                description: 'Variable supply NFT1 parent',
                genesisInfo: {
                    tokenName: 'NFT1 Parent Test',
                    tokenTicker: 'NPT',
                    url: 'https://cashtab.com/',
                    hash: '0000000000000000108da5cf31407c9261d489171db51a88cc400c7590eb087c',
                    decimals: 0,
                },
                initialQuantity: BigInt(100),
                mintBatonOutIdx: 2,
                targetOutputs: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a04534c500001810747454e45534953034e5054104e46543120506172656e7420546573741468747470733a2f2f636173687461622e636f6d2f200000000000000000108da5cf31407c9261d489171db51a88cc400c7590eb087c01000102080000000000000064',
                            ),
                        ),
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
                    },
                ],
            },
            {
                description: 'NFT1 parent genesis at max supply',
                genesisInfo: {
                    tokenName: 'NFT1 Parent Test',
                    tokenTicker: 'NPT',
                    url: 'https://cashtab.com/',
                    hash: '0000000000000000108da5cf31407c9261d489171db51a88cc400c7590eb087c',
                },
                initialQuantity: BigInt(MAX_OUTPUT_AMOUNT_SLP_ATOMS),
                mintBatonOutIdx: undefined,
                targetOutputs: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a04534c500001810747454e45534953034e5054104e46543120506172656e7420546573741468747470733a2f2f636173687461622e636f6d2f200000000000000000108da5cf31407c9261d489171db51a88cc400c7590eb087c01004c0008ffffffffffffffff',
                            ),
                        ),
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
                    },
                ],
            },
        ],
        expectedErrors: [
            {
                description:
                    'Variable supply NFT1 parent with mintBatonVout !== 2',
                genesisInfo: {
                    tokenName: 'NFT1 Parent Test',
                    tokenTicker: 'NPT',
                    url: 'https://cashtab.com/',
                    hash: '0000000000000000108da5cf31407c9261d489171db51a88cc400c7590eb087c',
                },
                initialQuantity: BigInt(100),
                mintBatonOutIdx: 3,
                errorMsg:
                    'Cashtab only supports slpv1 genesis txs for fixed supply tokens or tokens with mint baton at index 2',
            },
            {
                description: 'Exceed 0xffffffffffffffff for genesis qty',
                genesisInfo: {
                    tokenName: 'NFT1 Parent Test',
                    tokenTicker: 'NPT',
                    url: 'https://cashtab.com/',
                    documentHash:
                        '0000000000000000108da5cf31407c9261d489171db51a88cc400c7590eb087c',
                },
                initialQuantity: BigInt(
                    `${MAX_OUTPUT_AMOUNT_SLP_ATOMS.toString()}1`,
                ),
                mintBatonOutIdx: undefined,
                mintAddress: GENESIS_MINT_ADDRESS,
                errorMsg: 'Atoms out of range: 184467440737095516151',
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
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                `6a04534c50000181044d494e5420${MOCK_TOKEN_ID}01020800000000000003e8`,
                            ),
                        ),
                    },
                    { sats: 546n },
                    { sats: 546n },
                ],
            },
            {
                description:
                    'Can create a target output for the largest mint qty supported by slpv1',
                tokenId: MOCK_TOKEN_ID,
                mintQty: '18446744073709551615',
                targetOutputs: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                `6a04534c50000181044d494e5420${MOCK_TOKEN_ID}010208ffffffffffffffff`,
                            ),
                        ),
                    },
                    { sats: 546n },
                    { sats: 546n },
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
                    { sats: 546n },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 100n,
                            isMintBaton: false,
                        },
                    },
                ],
                returned: [
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 100n,
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
                    { sats: 546n },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 1n,
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
                    { sats: 546n },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 1n,
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 2n,
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 3n,
                            isMintBaton: false,
                        },
                    },
                ],
                returned: [
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 2n,
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 3n,
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
                        { sats: 546n },
                        {
                            token: {
                                tokenId: MOCK_TOKEN_ID,
                                atoms: 2n,
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
                        { sats: 546n },
                        {
                            token: {
                                tokenId:
                                    '2222222222222222222222222222222222222222222222222222222222222222',
                                atoms: 100n,
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
                        sats: 546n,
                        token: { tokenId: MOCK_TOKEN_ID, atoms: 19n },
                    },
                ],
                returned: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a04534c500001810453454e44201111111111111111111111111111111111111111111111111111111111111111080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001',
                            ),
                        ),
                    },
                ].concat(Array(19).fill({ sats: BigInt(appConfig.dustSats) })),
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
                        sats: 546n,
                        token: { tokenId: MOCK_TOKEN_ID, atoms: 100n },
                    },
                ],
                returned: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a04534c500001810453454e44201111111111111111111111111111111111111111111111111111111111111111080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000052',
                            ),
                        ),
                    },
                ].concat(Array(19).fill({ sats: BigInt(appConfig.dustSats) })),
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
                        sats: 546n,
                        token: { tokenId: MOCK_TOKEN_ID, atoms: 12n },
                    },
                ],
                returned: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a04534c500001810453454e44201111111111111111111111111111111111111111111111111111111111111111080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001080000000000000001',
                            ),
                        ),
                    },
                ].concat(Array(12).fill({ sats: BigInt(appConfig.dustSats) })),
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
                    { sats: 546n },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: SLP1_NFT_CHILD_GENESIS_AMOUNT,
                            isMintBaton: false,
                        },
                    },
                ],
                returned: [
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: SLP1_NFT_CHILD_GENESIS_AMOUNT,
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
                    { sats: 546n },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: SLP1_NFT_CHILD_GENESIS_AMOUNT,
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
                    { sats: 546n },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: SLP1_NFT_CHILD_GENESIS_AMOUNT,
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: SLP1_NFT_CHILD_GENESIS_AMOUNT,
                            isMintBaton: false,
                        },
                    },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: SLP1_NFT_CHILD_GENESIS_AMOUNT,
                            isMintBaton: false,
                        },
                    },
                ],
                returned: [
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: SLP1_NFT_CHILD_GENESIS_AMOUNT,
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
                    { sats: 546n },
                    {
                        token: {
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 2n,
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
                    { sats: 546n },
                    {
                        token: {
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                            atoms: 1n,
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
                genesisInfo: {
                    tokenTicker: 'TEST',
                    tokenName: 'My favorite NFT',
                    url: 'cashtab.com',
                    hash: '3333333333333333333333333333333333333333333333333333333333333333',
                    decimals: 0,
                },
                returned: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a04534c500001410747454e4553495304544553540f4d79206661766f72697465204e46540b636173687461622e636f6d20333333333333333333333333333333333333333333333333333333333333333301004c00080000000000000001',
                            ),
                        ),
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
                    },
                ],
            },
            {
                description:
                    'We can generate the correct targetOutput for minting an NFT child genesis tx with no data in any available fields',
                genesisInfo: {
                    tokenTicker: '',
                    tokenName: '',
                    url: '',
                    hash: '',
                    decimals: 0,
                },
                returned: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a04534c500001410747454e455349534c004c004c004c0001004c00080000000000000001',
                            ),
                        ),
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
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
                    { sats: 546n },
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
                    { sats: 546n },
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
    isTokenDustChangeOutput: {
        expectedReturns: [
            {
                description:
                    'A token dust change targetOutput is recognized as such',
                targetOutput: { sats: BigInt(appConfig.dustSats) },
                returned: true,
            },
            {
                description:
                    'If value is 1 satoshi more than dust, not a token dust change output',
                targetOutput: { sats: BigInt(appConfig.dustSats) + 1n },
                returned: false,
            },
            {
                description:
                    'If we have a key other than value, not a token dust change output',
                targetOutput: {
                    sats: BigInt(appConfig.dustSats),
                    script: 'some script',
                },
                returned: false,
            },
        ],
    },
};

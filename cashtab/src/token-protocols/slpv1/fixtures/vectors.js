// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Test vectors for slpv1 functions
import appConfig from 'config/app';
import { mockBurnOpReturnTokenUtxos, mockBurnAllTokenUtxos } from './mocks';
import {
    MAX_OUTPUT_AMOUNT_SLP_ATOMS,
} from 'token-protocols/slpv1';
import { Script, fromHex } from 'ecash-lib';

export const SEND_DESTINATION_ADDRESS =
    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx';
export const MOCK_TOKEN_ID =
    '1111111111111111111111111111111111111111111111111111111111111111';

export default {
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

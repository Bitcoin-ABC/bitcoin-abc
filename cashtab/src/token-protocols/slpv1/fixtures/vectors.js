// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Test vectors for slpv1 functions
import {
    MAX_OUTPUT_AMOUNT_SLP_ATOMS,
} from 'token-protocols/slpv1';

export const SEND_DESTINATION_ADDRESS =
    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx';
export const MOCK_TOKEN_ID =
    '1111111111111111111111111111111111111111111111111111111111111111';

export default {
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
};

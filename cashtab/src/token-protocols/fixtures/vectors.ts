// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { CashtabUtxo, TokenUtxo, SlpDecimals } from 'wallet';
import { TokenTargetOutput } from 'token-protocols';
import { OutPoint, Token, TokenType } from 'chronik-client';
import appConfig from 'config/app';
import { Script, fromHex } from 'ecash-lib';

interface GetAllSendUtxosReturn {
    description: string;
    utxos: CashtabUtxo[];
    tokenId: string;
    tokenUtxos: TokenUtxo[];
}
interface GetSendTokenInputsReturn {
    description: string;
    allSendUtxos: TokenUtxo[];
    sendQty: string;
    tokenInputs: TokenUtxo[];
    tokenId: string;
    decimals: SlpDecimals;
    sendAmounts: bigint[];
    targetOutputs: TokenTargetOutput[];
}
interface GetSendTokenInputsError {
    description: string;
    allSendUtxos: CashtabUtxo[];
    sendQty: string;
    tokenId: string;
    decimals: SlpDecimals;
    errorMsg: string;
}
interface GetMaxDecimalizedQtyReturn {
    description: string;
    protocol: 'ALP' | 'SLP';
    decimals: SlpDecimals;
    returned: string;
}
interface TokenProtocolsVectors {
    getAllSendUtxos: { expectedReturns: GetAllSendUtxosReturn[] };
    getSendTokenInputs: {
        expectedReturns: GetSendTokenInputsReturn[];
        expectedErrors: GetSendTokenInputsError[];
    };
    getMaxDecimalizedQty: {
        expectedReturns: GetMaxDecimalizedQtyReturn[];
    };
}

const MOCK_TOKEN_ID =
    '1111111111111111111111111111111111111111111111111111111111111111';
const SEND_DESTINATION_ADDRESS =
    'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx';
const DUMMY_OUTPOINT: OutPoint = {
    txid: '0000000000000000000000000000000000000000000000000000000000000000',
    outIdx: 0,
};
const DUMMY_TOKEN_TYPE: TokenType = {
    protocol: 'SLP',
    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
    number: 1,
};
const DUMMY_TOKEN: Token = {
    tokenType: DUMMY_TOKEN_TYPE,
    tokenId: MOCK_TOKEN_ID,
    amount: '1000',
    isMintBaton: false,
};
const DUMMY_UTXO: CashtabUtxo = {
    outpoint: DUMMY_OUTPOINT,
    value: 546,
    blockHeight: 800000,
    isCoinbase: false,
    isFinal: true,
    path: 1899,
};
const vectors: TokenProtocolsVectors = {
    getAllSendUtxos: {
        expectedReturns: [
            {
                description:
                    'In-node: We can get a single token utxo from an array including other token utxos and non-token utxos',
                utxos: [
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                    { ...DUMMY_UTXO, value: 546 },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
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
                        ...DUMMY_UTXO,
                        value: 546,
                        token: {
                            ...DUMMY_TOKEN,
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
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                    { ...DUMMY_UTXO, value: 546 },
                    {
                        ...DUMMY_UTXO,
                        value: 546,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        value: 546,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            amount: '4588000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        value: 546,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            amount: '229400000',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        value: 546,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            amount: '229400000',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        value: 546,
                        token: {
                            ...DUMMY_TOKEN,
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
                        ...DUMMY_UTXO,
                        value: 546,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            amount: '4588000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        value: 546,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            amount: '229400000',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        value: 546,
                        token: {
                            ...DUMMY_TOKEN,
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
                        ...DUMMY_UTXO,
                        value: 546,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                    { ...DUMMY_UTXO, value: 546 },
                    {
                        ...DUMMY_UTXO,
                        value: 546,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        value: 546,
                        token: {
                            ...DUMMY_TOKEN,
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
                        ...DUMMY_UTXO,
                        value: 546,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '1000',
                            isMintBaton: false,
                        },
                    },
                    { ...DUMMY_UTXO, value: 546 },
                    {
                        ...DUMMY_UTXO,
                        value: 546,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            amount: '1000',
                            isMintBaton: true,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        value: 546,
                        token: {
                            ...DUMMY_TOKEN,
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
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
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
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                ],
                sendAmounts: [15n, 5n],
                targetOutputs: [
                    {
                        value: 0,
                        script: new Script(
                            fromHex(
                                '6a04534c500001010453454e4420111111111111111111111111111111111111111111111111111111111111111108000000000000000f080000000000000005',
                            ),
                        ),
                    },
                    {
                        value: appConfig.dustSats,
                        script: Script.fromAddress(SEND_DESTINATION_ADDRESS),
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
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
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
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '10',
                            isMintBaton: false,
                        },
                    },
                ],
                sendAmounts: [30n],
                targetOutputs: [
                    {
                        value: 0,
                        script: new Script(
                            fromHex(
                                '6a04534c500001010453454e4420111111111111111111111111111111111111111111111111111111111111111108000000000000001e',
                            ),
                        ),
                    },
                    {
                        value: appConfig.dustSats,
                        script: Script.fromAddress(SEND_DESTINATION_ADDRESS),
                    },
                ],
            },
            {
                description: 'Token send with decimals and change output',
                allSendUtxos: [
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
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
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                ],
                sendAmounts: [150000000n, 50000000n],
                targetOutputs: [
                    {
                        value: 0,
                        script: new Script(
                            fromHex(
                                '6a04534c500001010453454e44201111111111111111111111111111111111111111111111111111111111111111080000000008f0d180080000000002faf080',
                            ),
                        ),
                    },
                    {
                        value: appConfig.dustSats,
                        script: Script.fromAddress(SEND_DESTINATION_ADDRESS),
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
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
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
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
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
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                ],
                sendQty: '35',
                tokenId: MOCK_TOKEN_ID,
                decimals: 10 as SlpDecimals, // it's not but we are testing this error
                errorMsg:
                    'Invalid decimals 10 for tokenId 1111111111111111111111111111111111111111111111111111111111111111. Decimals must be an integer 0-9.',
            },
            {
                description: 'No token utxos',
                allSendUtxos: [
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                ],
                sendQty: '35',
                tokenId: MOCK_TOKEN_ID,
                decimals: 9,
                errorMsg:
                    'No token utxos for tokenId "1111111111111111111111111111111111111111111111111111111111111111"',
            },
            {
                description: 'Send qty is empty string',
                allSendUtxos: [
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                            amount: '100000000',
                            isMintBaton: false,
                        },
                    },
                ],
                sendQty: '',
                tokenId: MOCK_TOKEN_ID,
                decimals: 9,
                errorMsg:
                    'Invalid sendQty empty string. sendQty must be a decimalized number as a string.',
            },
        ],
    },
    getMaxDecimalizedQty: {
        expectedReturns: [
            {
                description: 'We get expected ALP qty for ALP token type',
                protocol: 'ALP',
                decimals: 0,
                returned: '281474976710655',
            },
            {
                description: 'We get expected SLP qty for SLP token type',
                protocol: 'SLP',
                decimals: 0,
                returned: '18446744073709551615',
            },
        ],
    },
};

export default vectors;

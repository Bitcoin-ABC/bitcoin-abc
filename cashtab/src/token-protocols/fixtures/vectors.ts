// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { CashtabUtxo, TokenUtxo, SlpDecimals } from 'wallet';
import { TokenTargetOutput, RenderedTokenType } from 'token-protocols';
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

interface GetRenderedTokenTypeReturn {
    description: string;
    tokenType: TokenType;
    returned: RenderedTokenType;
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
    getRenderedTokenType: {
        expectedReturns: GetRenderedTokenTypeReturn[];
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
    atoms: 1000n,
    isMintBaton: false,
};
const DUMMY_UTXO: CashtabUtxo = {
    outpoint: DUMMY_OUTPOINT,
    sats: 546n,
    blockHeight: 800000,
    isCoinbase: false,
    isFinal: true,
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
                            atoms: 1000n,
                            isMintBaton: false,
                        },
                    },
                    { ...DUMMY_UTXO, sats: 546n },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
                            isMintBaton: true,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
                            isMintBaton: false,
                        },
                    },
                ],
                tokenId:
                    'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                tokenUtxos: [
                    {
                        ...DUMMY_UTXO,
                        sats: 546n,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
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
                            atoms: 1000n,
                            isMintBaton: false,
                        },
                    },
                    { ...DUMMY_UTXO, sats: 546n },
                    {
                        ...DUMMY_UTXO,
                        sats: 546n,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
                            isMintBaton: true,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        sats: 546n,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            atoms: 4588000000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        sats: 546n,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            atoms: 229400000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        sats: 546n,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            atoms: 229400000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        sats: 546n,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
                            isMintBaton: false,
                        },
                    },
                ],
                tokenId:
                    '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                tokenUtxos: [
                    {
                        ...DUMMY_UTXO,
                        sats: 546n,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            atoms: 4588000000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        sats: 546n,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            atoms: 229400000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        sats: 546n,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                            atoms: 229400000n,
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
                        sats: 546n,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 1000n,
                            isMintBaton: false,
                        },
                    },
                    { ...DUMMY_UTXO, sats: 546n },
                    {
                        ...DUMMY_UTXO,
                        sats: 546n,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
                            isMintBaton: true,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        sats: 546n,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
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
                        sats: 546n,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 1000n,
                            isMintBaton: false,
                        },
                    },
                    { ...DUMMY_UTXO, sats: 546n },
                    {
                        ...DUMMY_UTXO,
                        sats: 546n,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
                            isMintBaton: true,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        sats: 546n,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                'a6050bea718f77e7964d140c4bb89cd88a1816eed1633f19d097835d5fa48df5',
                            atoms: 1000n,
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
                            atoms: 10n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 10n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 10n,
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
                            atoms: 10n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 10n,
                            isMintBaton: false,
                        },
                    },
                ],
                sendAmounts: [15n, 5n],
                targetOutputs: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a04534c500001010453454e4420111111111111111111111111111111111111111111111111111111111111111108000000000000000f080000000000000005',
                            ),
                        ),
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
                        script: Script.fromAddress(SEND_DESTINATION_ADDRESS),
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
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
                            atoms: 10n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 10n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 10n,
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
                            atoms: 10n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 10n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 10n,
                            isMintBaton: false,
                        },
                    },
                ],
                sendAmounts: [30n],
                targetOutputs: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a04534c500001010453454e4420111111111111111111111111111111111111111111111111111111111111111108000000000000001e',
                            ),
                        ),
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
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
                            atoms: 100000000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 100000000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 100000000n,
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
                            atoms: 100000000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 100000000n,
                            isMintBaton: false,
                        },
                    },
                ],
                sendAmounts: [150000000n, 50000000n],
                targetOutputs: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a04534c500001010453454e44201111111111111111111111111111111111111111111111111111111111111111080000000008f0d180080000000002faf080',
                            ),
                        ),
                    },
                    {
                        sats: BigInt(appConfig.dustSats),
                        script: Script.fromAddress(SEND_DESTINATION_ADDRESS),
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
                    'Sending more than utxos with decimals and change output',
                allSendUtxos: [
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 100000000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 100000000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 100000000n,
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
                            atoms: 100000000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 100000000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 100000000n,
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
                            atoms: 100000000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 100000000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId: MOCK_TOKEN_ID,
                            atoms: 100000000n,
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
                            atoms: 100000000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                            atoms: 100000000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                            atoms: 100000000n,
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
                            atoms: 100000000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                            atoms: 100000000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        ...DUMMY_UTXO,
                        token: {
                            ...DUMMY_TOKEN,
                            tokenId:
                                '2222222222222222222222222222222222222222222222222222222222222222',
                            atoms: 100000000n,
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
    getRenderedTokenType: {
        // note I use number:1 everywhere here as it is not (currently) used by the function
        expectedReturns: [
            {
                description: 'Renders ALP_TOKEN_TYPE_STANDARD',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 1,
                },
                returned: RenderedTokenType.ALP,
            },
            {
                description: 'Renders ALP_TOKEN_TYPE_UNKNOWN',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_UNKNOWN',
                    number: 1,
                },
                returned: RenderedTokenType.ALP_UNKNOWN,
            },
            {
                description: 'Renders SLP_TOKEN_TYPE_FUNGIBLE',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                returned: RenderedTokenType.SLP,
            },
            {
                description: 'Renders SLP_TOKEN_TYPE_MINT_VAULT',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_MINT_VAULT',
                    number: 1,
                },
                returned: RenderedTokenType.MINTVAULT,
            },
            {
                description: 'Renders SLP_TOKEN_TYPE_NFT1_GROUP',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                    number: 1,
                },
                returned: RenderedTokenType.COLLECTION,
            },
            {
                description: 'Renders SLP_TOKEN_TYPE_NFT1_CHILD',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                    number: 1,
                },
                returned: RenderedTokenType.NFT,
            },
            {
                description: 'Renders SLP_TOKEN_TYPE_UNKNOWN',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_UNKNOWN',
                    number: 1,
                },
                returned: RenderedTokenType.SLP_UNKNOWN,
            },
            {
                description: 'Renders a totally unknown token',
                tokenType: {
                    protocol: 'SLPALP' as 'SLP', // some totally new type
                    type: 'SLP_TOKEN_TYPE_ERC20' as 'SLP_TOKEN_TYPE_UNKNOWN',
                    number: 1,
                },
                returned: RenderedTokenType.UNKNOWN_UNKNOWN,
            },
        ],
    },
};

export default vectors;

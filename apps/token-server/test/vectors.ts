// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    OutPoint,
    TxInput_InNode,
    TxOutput_InNode,
    Token_InNode,
    Tx_InNode,
} from 'chronik-client';

const MOCK_CHECKED_ADDRESS = 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035';
const MOCK_CHECKED_OUTPUTSCRIPT =
    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac';
const MOCK_OTHER_CHECKED_OUTPUTSCRIPT =
    '76a914a24e2b67689c3753983d3b408bc7690d31b1b74d88ac';
const MOCK_REWARD_TOKENID =
    'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa';
const MOCK_OTHER_TOKENID =
    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7';

const MOCK_OUTPOINT: OutPoint = {
    txid: 'n/a',
    outIdx: 0,
};

const MOCK_TX_INPUT: TxInput_InNode = {
    outputScript: 'should be overwritten in tests',
    prevOut: MOCK_OUTPOINT,
    inputScript: '',
    value: 550,
    sequenceNo: 100,
};

const MOCK_TX_OUTPUT: TxOutput_InNode = {
    value: 546,
    outputScript: 'to be updated in test',
};

const MOCK_TX_INNODE: Tx_InNode = {
    txid: 'n/a',
    version: 2,
    inputs: [MOCK_TX_INPUT],
    outputs: [MOCK_TX_OUTPUT],
    lockTime: 1000, // n/a
    timeFirstSeen: 0,
    size: 100,
    isCoinbase: false,
    tokenEntries: [],
    tokenFailedParsings: [],
    tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
};

const MOCK_TX_OUTPUT_TOKEN: Token_InNode = {
    tokenId: 'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
    tokenType: {
        protocol: 'SLP',
        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
        number: 1,
    },
    amount: '1',
    isMintBaton: false,
    entryIdx: 0,
};

interface HasInputsFromOutputScriptVector {
    returns: HasInputsFromOutputScriptReturn[];
}

interface HasInputsFromOutputScriptReturn {
    description: string;
    tx: Tx_InNode;
    outputScript: string;
    returned: boolean;
}

interface AddressReceivedTokenReturnVector {
    returns: AddressReceivedTokenReturn[];
}

interface AddressReceivedTokenReturn {
    description: string;
    tx: Tx_InNode;
    address: string;
    tokenId: string;
    returned: boolean;
}

interface TestVectors {
    hasInputsFromOutputScript: HasInputsFromOutputScriptVector;
    addressReceivedToken: AddressReceivedTokenReturnVector;
}

const vectors: TestVectors = {
    // chronik/parse.ts
    hasInputsFromOutputScript: {
        returns: [
            {
                description:
                    'Returns true for a tx with one input from the given outputScript',
                tx: {
                    ...MOCK_TX_INNODE,
                    inputs: [
                        {
                            ...MOCK_TX_INPUT,
                            outputScript: MOCK_CHECKED_OUTPUTSCRIPT,
                        },
                    ],
                },
                outputScript: MOCK_CHECKED_OUTPUTSCRIPT,
                returned: true,
            },
            {
                description:
                    'Returns false for a tx with one input not from given outputScript',
                tx: {
                    ...MOCK_TX_INNODE,
                    inputs: [
                        {
                            ...MOCK_TX_INPUT,
                            outputScript: MOCK_CHECKED_OUTPUTSCRIPT,
                        },
                    ],
                },
                outputScript: MOCK_OTHER_CHECKED_OUTPUTSCRIPT,
                returned: false,
            },
            {
                description:
                    'Returns true for a multi-input tx with the last input from given outputScript',
                tx: {
                    ...MOCK_TX_INNODE,
                    inputs: [
                        {
                            ...MOCK_TX_INPUT,
                            outputScript: MOCK_OTHER_CHECKED_OUTPUTSCRIPT,
                        },
                        {
                            ...MOCK_TX_INPUT,
                            outputScript: MOCK_OTHER_CHECKED_OUTPUTSCRIPT,
                        },
                        {
                            ...MOCK_TX_INPUT,
                            outputScript: MOCK_CHECKED_OUTPUTSCRIPT,
                        },
                    ],
                },
                outputScript: MOCK_CHECKED_OUTPUTSCRIPT,
                returned: true,
            },
            {
                description:
                    'Returns false for a multi-input tx with the no inputs from the given outputScript',
                tx: {
                    ...MOCK_TX_INNODE,
                    inputs: [
                        {
                            ...MOCK_TX_INPUT,
                            outputScript: MOCK_OTHER_CHECKED_OUTPUTSCRIPT,
                        },
                        {
                            ...MOCK_TX_INPUT,
                            outputScript: MOCK_OTHER_CHECKED_OUTPUTSCRIPT,
                        },
                        {
                            ...MOCK_TX_INPUT,
                            outputScript: MOCK_OTHER_CHECKED_OUTPUTSCRIPT,
                        },
                    ],
                },
                outputScript: MOCK_CHECKED_OUTPUTSCRIPT,
                returned: false,
            },
        ],
    },
    addressReceivedToken: {
        returns: [
            {
                description:
                    'Returns true for a one-output tx that includes the given tokenId at the given outputScript',
                tx: {
                    ...MOCK_TX_INNODE,
                    outputs: [
                        {
                            ...MOCK_TX_OUTPUT,
                            outputScript: MOCK_CHECKED_OUTPUTSCRIPT,
                            token: {
                                ...MOCK_TX_OUTPUT_TOKEN,
                                tokenId: MOCK_REWARD_TOKENID,
                            },
                        },
                    ],
                },
                address: MOCK_CHECKED_ADDRESS,
                tokenId: MOCK_REWARD_TOKENID,
                returned: true,
            },
            {
                description:
                    'Returns true for tx with multiple outputs that includes an output with the given tokenId at the given outputScript',
                tx: {
                    ...MOCK_TX_INNODE,
                    outputs: [
                        {
                            ...MOCK_TX_OUTPUT,
                            outputScript: MOCK_CHECKED_OUTPUTSCRIPT,
                            token: {
                                ...MOCK_TX_OUTPUT_TOKEN,
                                tokenId: MOCK_OTHER_TOKENID,
                            },
                        },
                        {
                            ...MOCK_TX_OUTPUT,
                            outputScript: MOCK_CHECKED_OUTPUTSCRIPT,
                            // we do not specify a token key to confirm no error is thrown
                        },
                        {
                            ...MOCK_TX_OUTPUT,
                            outputScript: MOCK_CHECKED_OUTPUTSCRIPT,
                            token: {
                                ...MOCK_TX_OUTPUT_TOKEN,
                                tokenId: MOCK_REWARD_TOKENID,
                            },
                        },
                    ],
                },
                address: MOCK_CHECKED_ADDRESS,
                tokenId: MOCK_REWARD_TOKENID,
                returned: true,
            },
            {
                description:
                    'Returns false for a one-output tx that does not include a token output',
                tx: {
                    ...MOCK_TX_INNODE,
                    outputs: [
                        {
                            ...MOCK_TX_OUTPUT,
                            outputScript: MOCK_CHECKED_OUTPUTSCRIPT,
                            // we do not specify a token key to confirm no error is thrown
                        },
                    ],
                },
                address: MOCK_CHECKED_ADDRESS,
                tokenId: MOCK_REWARD_TOKENID,
                returned: false,
            },
            {
                description:
                    'Returns false for a one-output tx that includes a token not of the given tokenId',
                tx: {
                    ...MOCK_TX_INNODE,
                    outputs: [
                        {
                            ...MOCK_TX_OUTPUT,
                            outputScript: MOCK_CHECKED_OUTPUTSCRIPT,
                            token: {
                                ...MOCK_TX_OUTPUT_TOKEN,
                                tokenId: MOCK_OTHER_TOKENID,
                            },
                        },
                    ],
                },
                address: MOCK_CHECKED_ADDRESS,
                tokenId: MOCK_REWARD_TOKENID,
                returned: false,
            },
            {
                description:
                    'Returns false for a tx with outputs array of length > 1 that includes a token not of the given tokenId and a non-token output',
                tx: {
                    ...MOCK_TX_INNODE,
                    outputs: [
                        {
                            ...MOCK_TX_OUTPUT,
                            outputScript: MOCK_CHECKED_OUTPUTSCRIPT,
                            // we do not specify a token key to confirm no error is thrown
                        },
                        {
                            ...MOCK_TX_OUTPUT,
                            outputScript: MOCK_CHECKED_OUTPUTSCRIPT,
                            token: {
                                ...MOCK_TX_OUTPUT_TOKEN,
                                tokenId: MOCK_OTHER_TOKENID,
                            },
                        },
                    ],
                },
                address: MOCK_CHECKED_ADDRESS,
                tokenId: MOCK_REWARD_TOKENID,
                returned: false,
            },
        ],
    },
};

export default vectors;

// Copyright (c) 2024-2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    OutPoint,
    TxInput,
    TxOutput,
    Token,
    Tx,
    BlockMetadata,
    ScriptUtxo,
    TokenType,
} from 'chronik-client';

const IFP_ADDRESS = 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07';
const IFP_OUTPUTSCRIPT = 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087';
const MOCK_CHECKED_ADDRESS = 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035';
const MOCK_DESTINATION_ADDRESS =
    'ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7ratqfx';
const MOCK_CHECKED_OUTPUTSCRIPT =
    '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac';
const MOCK_OTHER_CHECKED_OUTPUTSCRIPT =
    '76a914a24e2b67689c3753983d3b408bc7690d31b1b74d88ac';
const MOCK_TOKENID_ONES =
    '1111111111111111111111111111111111111111111111111111111111111111';

const MOCK_REWARD_TOKENID =
    'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa';
const MOCK_OTHER_TOKENID =
    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7';

export const MOCK_OUTPOINT: OutPoint = {
    txid: '1111111111111111111111111111111111111111111111111111111111111111',
    outIdx: 0,
};

const MOCK_TX_INPUT: TxInput = {
    outputScript: 'should be overwritten in tests',
    prevOut: MOCK_OUTPOINT,
    inputScript: '',
    sats: 550n,
    sequenceNo: 100,
};

const MOCK_TX_OUTPUT: TxOutput = {
    sats: 546n,
    outputScript: 'to be updated in test',
};

const MOCK_TX: Tx = {
    txid: 'n/a',
    version: 2,
    inputs: [MOCK_TX_INPUT],
    outputs: [MOCK_TX_OUTPUT],
    lockTime: 1000, // n/a
    timeFirstSeen: 0,
    size: 100,
    isCoinbase: false,
    isFinal: false,
    tokenEntries: [],
    tokenFailedParsings: [],
    tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
};

export const MOCK_SCRIPT_UTXO: ScriptUtxo = {
    outpoint: MOCK_OUTPOINT,
    blockHeight: 800000,
    isCoinbase: false,
    sats: 546n,
    isFinal: true,
};

const MOCK_TOKEN_TYPE: TokenType = {
    protocol: 'SLP',
    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
    number: 1,
};
export const MOCK_UTXO_TOKEN: Token = {
    tokenId: MOCK_TOKENID_ONES,
    tokenType: MOCK_TOKEN_TYPE,
    atoms: 1n,
    isMintBaton: false,
};
export const MOCK_SPENDABLE_TOKEN_UTXO: ScriptUtxo = {
    ...MOCK_SCRIPT_UTXO,
    token: MOCK_UTXO_TOKEN,
};

const MOCK_BLOCK_METADATA: BlockMetadata = {
    hash: '0000000000000000115e051672e3d4a6c523598594825a1194862937941296fe',
    height: 800000,
    timestamp: 1688808780,
};

const MOCK_TX_OUTPUT_TOKEN: Token = {
    tokenId: 'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
    tokenType: {
        protocol: 'SLP',
        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
        number: 1,
    },
    atoms: 1n,
    isMintBaton: false,
    entryIdx: 0,
};

interface HasInputsFromOutputScriptVector {
    returns: HasInputsFromOutputScriptReturn[];
}

interface HasInputsFromOutputScriptReturn {
    description: string;
    tx: Tx;
    outputScript: string;
    returned: boolean;
}

interface AddressReceivedTokenReturnVector {
    returns: AddressReceivedTokenReturn[];
}

interface AddressReceivedTokenReturn {
    description: string;
    tx: Tx;
    address: string;
    tokenId: string;
    returned: boolean;
}

interface GetTxTimestampReturnVector {
    returns: GetTxTimestampReturn[];
}

interface GetTxTimestampReturn {
    description: string;
    tx: Tx;
    timestamp: number;
}

interface GetHistoryAfterTimestampVector {
    returns: GetHistoryAfterTimestampReturn[];
    errors: GetHistoryAfterTimestampError[];
}

interface GetHistoryAfterTimestampReturn {
    description: string;
    mocks: ChronikMock;
    address: string;
    timestamp: number;
    pageSize: number;
    returned: Tx[];
}

interface GetHistoryAfterTimestampError {
    description: string;
    mocks: ChronikMock;
    address: string;
    timestamp: number;
    pageSize: number;
    error: Error;
}

interface ChronikMock {
    history: Tx[] | Error;
}

interface isAddressEligibleForTokenRewardVector {
    returns: isAddressEligibleForTokenRewardReturn[];
}
interface isAddressEligibleForTokenRewardReturn {
    description: string;
    address: string;
    tokenId: string;
    tokenServerOutputScript: string;
    historySinceEligibilityTimestamp: Tx[];
    returned: boolean | number;
}

interface SendRewardVector {
    returns: SendRewardReturn[];
    errors: SendRewardError[];
}

interface SendRewardReturn {
    description: string;
    utxos: ScriptUtxo[];
    tokenId: string;
    rewardAmountTokenSats: bigint;
    destinationAddress: string;
    rawTx: string;
    returned: { success: boolean; broadcasted: string[] };
}
interface SendRewardError {
    description: string;
    utxos: Error | ScriptUtxo[];
    tokenId: string;
    rewardAmountTokenSats: bigint;
    destinationAddress: string;
    error: Error;
}

interface SendXecAirdropVector {
    returns: SendXecAirdropReturn[];
    errors: SendXecAirdropError[];
}

interface SendXecAirdropReturn {
    description: string;
    utxos: ScriptUtxo[];
    xecAirdropAmountSats: bigint;
    destinationAddress: string;
    rawTx: string;
    returned: { success: boolean; broadcasted: string[] };
}

interface SendXecAirdropError {
    description: string;
    utxos: Error | ScriptUtxo[];
    xecAirdropAmountSats: bigint;
    destinationAddress: string;
    error: Error;
}

interface TestVectors {
    hasInputsFromOutputScript: HasInputsFromOutputScriptVector;
    addressReceivedToken: AddressReceivedTokenReturnVector;
    getTxTimestamp: GetTxTimestampReturnVector;
    getHistoryAfterTimestamp: GetHistoryAfterTimestampVector;
    isAddressEligibleForTokenReward: isAddressEligibleForTokenRewardVector;
    sendReward: SendRewardVector;
    sendXecAirdrop: SendXecAirdropVector;
}

const vectors: TestVectors = {
    // chronik/parse.ts
    hasInputsFromOutputScript: {
        returns: [
            {
                description:
                    'Returns true for a tx with one input from the given outputScript',
                tx: {
                    ...MOCK_TX,
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
                    ...MOCK_TX,
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
                    ...MOCK_TX,
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
                    ...MOCK_TX,
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
                    ...MOCK_TX,
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
                    ...MOCK_TX,
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
                    ...MOCK_TX,
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
                    ...MOCK_TX,
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
                    ...MOCK_TX,
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
    getTxTimestamp: {
        returns: [
            {
                description: 'Returns timeFirstSeen if it is not 0',
                tx: { ...MOCK_TX, timeFirstSeen: 2222222222 },
                timestamp: 2222222222,
            },
            {
                description:
                    'Returns block.timestamp if timeFirstSeen is 0 and the tx has confirmed',
                tx: {
                    ...MOCK_TX,
                    timeFirstSeen: 0,
                    block: {
                        ...MOCK_BLOCK_METADATA,
                        timestamp: 1111111111,
                    },
                },
                timestamp: 1111111111,
            },
            {
                description:
                    'Returns -1 for edge case of timeFirstSeen 0 and unconfirmed tx',
                tx: { ...MOCK_TX, timeFirstSeen: 0 },
                timestamp: -1,
            },
        ],
    },
    // chronik/clientHandler.ts
    getHistoryAfterTimestamp: {
        returns: [
            {
                description: 'A tx exactly at the given timestamp is returned',
                mocks: { history: [{ ...MOCK_TX, timeFirstSeen: 10 }] },
                address: IFP_ADDRESS,
                timestamp: 10,
                pageSize: 2,
                returned: [{ ...MOCK_TX, timeFirstSeen: 10 }],
            },
            {
                description: 'A tx before the given timestamp is ignored',
                mocks: { history: [{ ...MOCK_TX, timeFirstSeen: 9 }] },
                address: IFP_ADDRESS,
                timestamp: 10,
                pageSize: 2,
                returned: [],
            },
            {
                description:
                    'If all txs on first page are at or before the given timestamp, we return an empty array',
                mocks: {
                    history: [
                        { ...MOCK_TX, timeFirstSeen: 9 },
                        { ...MOCK_TX, timeFirstSeen: 8 },
                    ],
                },
                address: IFP_ADDRESS,
                timestamp: 10,
                pageSize: 2,
                returned: [],
            },
            {
                description:
                    'If all txs on first page are at or after the given timestamp, we get the next page and return the ones there that are also after',
                mocks: {
                    history: [
                        { ...MOCK_TX, timeFirstSeen: 12 },
                        { ...MOCK_TX, timeFirstSeen: 11 },
                        { ...MOCK_TX, timeFirstSeen: 10 },
                    ],
                },
                address: IFP_ADDRESS,
                timestamp: 10,
                pageSize: 2,
                returned: [
                    { ...MOCK_TX, timeFirstSeen: 12 },
                    { ...MOCK_TX, timeFirstSeen: 11 },
                    { ...MOCK_TX, timeFirstSeen: 10 },
                ],
            },
            {
                description:
                    'If all txs on first page are at or after the given timestamp, and some are and some arent on the 2nd page, we only return the txs after expected timestamp',
                mocks: {
                    history: [
                        { ...MOCK_TX, timeFirstSeen: 12 },
                        { ...MOCK_TX, timeFirstSeen: 11 },
                        { ...MOCK_TX, timeFirstSeen: 10 },
                        { ...MOCK_TX, timeFirstSeen: 9 },
                    ],
                },
                address: IFP_ADDRESS,
                timestamp: 10,
                pageSize: 2,
                returned: [
                    { ...MOCK_TX, timeFirstSeen: 12 },
                    { ...MOCK_TX, timeFirstSeen: 11 },
                    { ...MOCK_TX, timeFirstSeen: 10 },
                ],
            },
        ],
        errors: [
            {
                description:
                    'If chronik API call throws an error, the function throws an error',
                mocks: { history: new Error('Some chronik error') },
                address: IFP_ADDRESS,
                timestamp: 10,
                pageSize: 2,
                error: new Error('Some chronik error'),
            },
        ],
    },
    // rewards.ts
    isAddressEligibleForTokenReward: {
        returns: [
            {
                description:
                    'An address with no historySinceEligibilityTimestamp is eligible for rewards',
                address: MOCK_CHECKED_ADDRESS,
                tokenId: MOCK_REWARD_TOKENID,
                tokenServerOutputScript: IFP_OUTPUTSCRIPT,
                historySinceEligibilityTimestamp: [],
                returned: true,
            },
            {
                description:
                    'An address that has received a non-token tx from the server in historySinceEligibilityTimestamp is eligible for rewards',
                address: MOCK_CHECKED_ADDRESS,
                tokenId: MOCK_REWARD_TOKENID,
                tokenServerOutputScript: IFP_OUTPUTSCRIPT,
                historySinceEligibilityTimestamp: [
                    {
                        ...MOCK_TX,
                        inputs: [
                            {
                                ...MOCK_TX_INPUT,
                                outputScript: IFP_OUTPUTSCRIPT,
                            },
                        ],
                        outputs: [
                            {
                                ...MOCK_TX_OUTPUT,
                                sats: 546n,
                                outputScript: MOCK_CHECKED_OUTPUTSCRIPT,
                            },
                        ],
                    },
                ],
                returned: true,
            },
            {
                description:
                    'An address that has received a token tx from some other tokenId from the server in historySinceEligibilityTimestamp is eligible for rewards',
                address: MOCK_CHECKED_ADDRESS,
                tokenId: MOCK_REWARD_TOKENID,
                tokenServerOutputScript: IFP_OUTPUTSCRIPT,
                historySinceEligibilityTimestamp: [
                    {
                        ...MOCK_TX,
                        inputs: [
                            {
                                ...MOCK_TX_INPUT,
                                outputScript: IFP_OUTPUTSCRIPT,
                            },
                        ],
                        outputs: [
                            {
                                ...MOCK_TX_OUTPUT,
                                sats: 546n,
                                token: {
                                    ...MOCK_TX_OUTPUT_TOKEN,
                                    tokenId: 'someOtherTokenId',
                                },
                                outputScript: MOCK_CHECKED_OUTPUTSCRIPT,
                            },
                        ],
                    },
                ],
                returned: true,
            },
            {
                description:
                    'An address that has received a token tx of the given tokenId from the server in historySinceEligibilityTimestamp is NOT eligible for rewards',
                address: MOCK_CHECKED_ADDRESS,
                tokenId: MOCK_REWARD_TOKENID,
                tokenServerOutputScript: IFP_OUTPUTSCRIPT,
                historySinceEligibilityTimestamp: [
                    {
                        ...MOCK_TX,
                        inputs: [
                            {
                                ...MOCK_TX_INPUT,
                                outputScript: IFP_OUTPUTSCRIPT,
                            },
                        ],
                        outputs: [
                            {
                                ...MOCK_TX_OUTPUT,
                                sats: 546n,
                                token: {
                                    ...MOCK_TX_OUTPUT_TOKEN,
                                    tokenId: MOCK_REWARD_TOKENID,
                                },
                                outputScript: MOCK_CHECKED_OUTPUTSCRIPT,
                            },
                        ],
                        timeFirstSeen: 111111,
                    },
                ],
                returned: 111111,
            },
        ],
    },
    sendReward: {
        returns: [
            {
                description: 'Token reward tx with no token change',
                utxos: [
                    { ...MOCK_SCRIPT_UTXO, sats: 10000n },
                    {
                        ...MOCK_SPENDABLE_TOKEN_UTXO,
                        outpoint: { ...MOCK_OUTPOINT, outIdx: 1 },
                    },
                ],
                tokenId: MOCK_TOKENID_ONES,
                rewardAmountTokenSats: 1n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                rawTx: '02000000021111111111111111111111111111111111111111111111111111111111111111000000006441c877154b78ac6c96d6fa23efb1f607c97ade73a78ce8a78467e518e503860c2cd1a58779976acf9af9c987847434406fad0762931821cd17fa782b6387f5ac6a41210357e84997196580b5e39b202f85ca353e92d051efa13f7f356834a15a36076e0affffffff1111111111111111111111111111111111111111111111111111111111111111010000006441c0a1edbd5459595b90d947de9d66196a86eaec6977a8c4083416dd4593ec47851bd624e517f154734a7c3acda0f64b5b2d8eaee9100362940bdff93b6181c31641210357e84997196580b5e39b202f85ca353e92d051efa13f7f356834a15a36076e0affffffff030000000000000000376a04534c500001010453454e4420111111111111111111111111111111111111111111111111111111111111111108000000000000000122020000000000001976a914000000000000000000000000000000000000000088ac68250000000000001976a914a5aff40b97ab2a15add0185bdcd4cd0fa3dd7b1888ac00000000',
                returned: {
                    success: true,
                    broadcasted: [
                        '7fef362d4749cbeb7519c89d7db6e561c5c6ea19d12cb516de48013271bd8450',
                    ],
                },
            },
            {
                description: 'Token reward tx with change',
                utxos: [
                    { ...MOCK_SCRIPT_UTXO, sats: 10000n },
                    {
                        ...MOCK_SPENDABLE_TOKEN_UTXO,
                        outpoint: { ...MOCK_OUTPOINT, outIdx: 1 },
                        token: { ...MOCK_UTXO_TOKEN, atoms: 10n },
                    },
                ],
                tokenId: MOCK_TOKENID_ONES,
                rewardAmountTokenSats: 5n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                rawTx: '0200000002111111111111111111111111111111111111111111111111111111111111111100000000644121ae6cfd7dd7477805ddc450105989439d2528a6b826b5114b434e8896afc02a44c2334ad62224e0a75fa933fb37d4bc0b9577835875d61aba95334bf2d7ef4b41210357e84997196580b5e39b202f85ca353e92d051efa13f7f356834a15a36076e0affffffff11111111111111111111111111111111111111111111111111111111111111110100000064411f607711df2017150dc78bc9b0964d8ec5b5c2a1c13ff5cff274d5a0327ddef5d2dd7b82d8b04e2ce79fc43c4bcb4212fe76c34f3b0e01e838af7035ce45979d41210357e84997196580b5e39b202f85ca353e92d051efa13f7f356834a15a36076e0affffffff040000000000000000406a04534c500001010453454e4420111111111111111111111111111111111111111111111111111111111111111108000000000000000508000000000000000522020000000000001976a914000000000000000000000000000000000000000088ac22020000000000001976a914a5aff40b97ab2a15add0185bdcd4cd0fa3dd7b1888ac1b230000000000001976a914a5aff40b97ab2a15add0185bdcd4cd0fa3dd7b1888ac00000000',
                returned: {
                    success: true,
                    broadcasted: [
                        '5f35bddd3f2736b05319da64a9df2abca91bf5ae2726338254500fc4dcffd62f',
                    ],
                },
            },
        ],
        errors: [
            {
                description: 'Expected error if wallet fails to sync utxo set',
                utxos: new Error('Some chronik error trying to fetch utxos'),
                tokenId: MOCK_TOKENID_ONES,
                rewardAmountTokenSats: 100n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                error: new Error('Some chronik error trying to fetch utxos'),
            },
            {
                description: 'Expected error if insufficient token balance',
                utxos: [
                    { ...MOCK_SCRIPT_UTXO, sats: 10000n },
                    {
                        ...MOCK_SPENDABLE_TOKEN_UTXO,
                        outpoint: { ...MOCK_OUTPOINT, outIdx: 1 },
                    },
                ],
                tokenId: MOCK_TOKENID_ONES,
                rewardAmountTokenSats: 2n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                error: new Error(
                    'Missing required token utxos: 1111111111111111111111111111111111111111111111111111111111111111 => Missing 1 atom',
                ),
            },
        ],
    },
    sendXecAirdrop: {
        returns: [
            {
                description: 'XEC Airdrop with no change',
                utxos: [{ ...MOCK_SCRIPT_UTXO, sats: 2185n }],
                xecAirdropAmountSats: 2000n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                rawTx: '0200000001111111111111111111111111111111111111111111111111111111111111111100000000644119ee30fd7a03ffe1b969c994842e5190a47e64a634efb4a8743762c7db6a9e76996fd119abddbc84c911bcab99da86e361d49d1a7452871f918f9ab7574cf3d041210357e84997196580b5e39b202f85ca353e92d051efa13f7f356834a15a36076e0affffffff01d0070000000000001976a914000000000000000000000000000000000000000088ac00000000',
                returned: {
                    success: true,
                    broadcasted: [
                        '9bc8d27609cf7b70317de9c9f1137c5d0211100be38d10847b7054da0feb551c',
                    ],
                },
            },
            {
                description:
                    'XEC Airdrop with no change, where we try to build the tx without enough XEC to cover the fee',
                utxos: [
                    { ...MOCK_SCRIPT_UTXO, sats: 2001n },
                    {
                        ...MOCK_SCRIPT_UTXO,
                        sats: 546n,
                        outpoint: { ...MOCK_OUTPOINT, outIdx: 1 },
                    },
                ],
                xecAirdropAmountSats: 2000n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                rawTx: '02000000021111111111111111111111111111111111111111111111111111111111111111000000006441f3db06231bd7aed9e487caf1f509aa99b28b3685ac98b4410003ba1458989989b19d844e987f0b3a7fbfaae5dc56fee2a74c81856d68b492cab1e1321b1e0ca841210357e84997196580b5e39b202f85ca353e92d051efa13f7f356834a15a36076e0affffffff1111111111111111111111111111111111111111111111111111111111111111010000006441cce8ff45845e94742322d073244151c8558c4e346ed5f017dd3e0fc5476a12a7cdffdaf737d2e8a9cdade5a780e1ad96217868cbfc4f06340646d4c2c9b5d70341210357e84997196580b5e39b202f85ca353e92d051efa13f7f356834a15a36076e0affffffff01d0070000000000001976a914000000000000000000000000000000000000000088ac00000000',
                returned: {
                    success: true,
                    broadcasted: [
                        '00016cda2a142789255bcc5a15fa18744e18f662172159ed90b5e4362cb51e2a',
                    ],
                },
            },
            {
                description: 'XEC Airdrop with change',
                utxos: [{ ...MOCK_SCRIPT_UTXO, sats: 10000n }],
                xecAirdropAmountSats: 2000n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                rawTx: '02000000011111111111111111111111111111111111111111111111111111111111111111000000006441180e2b57a8e5f90717049afc9800699a95e84b260004c1b67f178e1a111b663cc3692d7b7890b2dce93003ebbfce466c465000137d8c0aa5a4e5c5d3719a729841210357e84997196580b5e39b202f85ca353e92d051efa13f7f356834a15a36076e0affffffff02d0070000000000001976a914000000000000000000000000000000000000000088ac651e0000000000001976a914a5aff40b97ab2a15add0185bdcd4cd0fa3dd7b1888ac00000000',
                returned: {
                    success: true,
                    broadcasted: [
                        '59e8251fec3ef6ead7fde0f23bff39ddd5d814e0d92d7d3e1dc0beca3112db55',
                    ],
                },
            },
        ],
        errors: [
            {
                description: 'Expected error if wallet fails to sync utxo set',
                utxos: new Error('Some chronik error trying to fetch utxos'),
                xecAirdropAmountSats: 2000n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                error: new Error('Some chronik error trying to fetch utxos'),
            },
            {
                description:
                    'Expected error if XEC balance is one satoshi too little to cover the tx',
                utxos: [{ ...MOCK_SCRIPT_UTXO, sats: 2184n }],
                xecAirdropAmountSats: 2000n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                error: new Error(
                    'Insufficient satoshis in available utxos (2184) to cover outputs of this tx (2000) + fee',
                ),
            },
            {
                description:
                    'Expected error if XEC balance is sufficient to cover the tx, but the only available utxos are token utxos (we confirm token utxos are not spent)',
                utxos: [
                    {
                        ...MOCK_SPENDABLE_TOKEN_UTXO,
                        sats: 20000n,
                        outpoint: { ...MOCK_OUTPOINT, outIdx: 1 },
                    },
                ],
                xecAirdropAmountSats: 2000n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                error: new Error(
                    'Insufficient sats to complete tx. Need 2000 additional satoshis to complete this Action.',
                ),
            },
        ],
    },
};

export default vectors;

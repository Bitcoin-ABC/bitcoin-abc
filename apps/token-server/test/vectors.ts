// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    OutPoint,
    TxInput_InNode,
    TxOutput_InNode,
    Token_InNode,
    Tx_InNode,
    BlockMetadata_InNode,
    ScriptUtxo_InNode,
    TokenType,
} from 'chronik-client';
import { ServerWallet } from '../src/wallet';
import {
    SlpInputsAndOutputs,
    RewardBroadcastSuccess,
} from '../src/transactions';
import { Request } from 'express';
import { Script } from 'ecash-lib';

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
const MOCK_TOKENID_TWOS =
    '2222222222222222222222222222222222222222222222222222222222222222';
const MOCK_REWARD_TOKENID =
    'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa';
const MOCK_OTHER_TOKENID =
    'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7';

const MOCK_WALLET = {
    address: 'ecash:qzj6laqtj74j59dd6qv9hhx5e5868htmrqrttcqzxn',
    sk: Uint8Array.from(
        Buffer.from(
            'd8b9d9868e5e55f98e241a48f905dce1fc6ae5d0d7be69109ccac8c7d09ce57a',
            'hex',
        ),
    ),
    utxos: [],
};

export const MOCK_OUTPOINT: OutPoint = {
    txid: '1111111111111111111111111111111111111111111111111111111111111111',
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

export const MOCK_SCRIPT_UTXO: ScriptUtxo_InNode = {
    outpoint: MOCK_OUTPOINT,
    blockHeight: 800000,
    isCoinbase: false,
    value: 546,
    isFinal: true,
};

const MOCK_TOKEN_TYPE: TokenType = {
    protocol: 'SLP',
    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
    number: 1,
};
export const MOCK_UTXO_TOKEN: Token_InNode = {
    tokenId: MOCK_TOKENID_ONES,
    tokenType: MOCK_TOKEN_TYPE,
    amount: '1',
    isMintBaton: false,
};
export const MOCK_SPENDABLE_TOKEN_UTXO: ScriptUtxo_InNode = {
    ...MOCK_SCRIPT_UTXO,
    token: MOCK_UTXO_TOKEN,
};
const MOCK_MINT_BATON_TOKEN_UTXO: ScriptUtxo_InNode = {
    ...MOCK_SPENDABLE_TOKEN_UTXO,
    token: {
        ...MOCK_UTXO_TOKEN,
        amount: '0',
        isMintBaton: true,
    },
};

const MOCK_BLOCK_METADATA_INNODE: BlockMetadata_InNode = {
    hash: '0000000000000000115e051672e3d4a6c523598594825a1194862937941296fe',
    height: 800000,
    timestamp: 1688808780,
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

interface GetTxTimestampReturnVector {
    returns: GetTxTimestampReturn[];
}

interface GetTxTimestampReturn {
    description: string;
    tx: Tx_InNode;
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
    returned: Tx_InNode[];
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
    history: Tx_InNode[] | Error;
}

interface isAddressEligibleForTokenRewardVector {
    returns: isAddressEligibleForTokenRewardReturn[];
}
interface isAddressEligibleForTokenRewardReturn {
    description: string;
    address: string;
    tokenId: string;
    tokenServerOutputScript: string;
    historySinceEligibilityTimestamp: Tx_InNode[];
    returned: boolean | number;
}

interface IsTokenImageRequestReturn {
    description: string;
    req: Request;
    returned: boolean;
}

interface IsTokenImageRequestVector {
    returns: IsTokenImageRequestReturn[];
}

interface GetWalletFromSeedReturn {
    description: string;
    mnemonic: string;
    returned: ServerWallet;
}

interface GetWalletFromSeedError {
    description: string;
    mnemonic: string;
    error: Error;
}

interface GetWalletFromSeedVector {
    returns: GetWalletFromSeedReturn[];
    errors: GetWalletFromSeedError[];
}

interface SyncWalletVector {
    returns: SyncWalletReturn[];
    errors: SyncWalletError[];
}

interface SyncWalletReturn {
    description: string;
    wallet: ServerWallet;
    mockUtxos: ScriptUtxo_InNode[];
    returned: ServerWallet;
}

interface SyncWalletError {
    description: string;
    wallet: ServerWallet;
    error: Error;
}

interface GetSlpInputsAndOutputsVector {
    returns: GetSlpInputsAndOutputsReturn[];
    errors: GetSlpInputsAndOutputsError[];
}

interface GetSlpInputsAndOutputsReturn {
    description: string;
    rewardAmountTokenSats: bigint;
    destinationAddress: string;
    tokenId: string;
    utxos: ScriptUtxo_InNode[];
    changeAddress: string;
    returned: SlpInputsAndOutputs;
}

interface GetSlpInputsAndOutputsError {
    description: string;
    rewardAmountTokenSats: bigint;
    destinationAddress: string;
    tokenId: string;
    utxos: ScriptUtxo_InNode[];
    changeAddress: string;
    error: Error;
}

interface SendRewardVector {
    returns: SendRewardReturn[];
    errors: SendRewardError[];
}

interface SendRewardReturn {
    description: string;
    wallet: ServerWallet;
    utxos: ScriptUtxo_InNode[];
    tokenId: string;
    rewardAmountTokenSats: bigint;
    destinationAddress: string;
    returned: RewardBroadcastSuccess;
}
interface SendRewardError {
    description: string;
    wallet: ServerWallet;
    utxos: Error | ScriptUtxo_InNode[];
    tokenId: string;
    rewardAmountTokenSats: bigint;
    destinationAddress: string;
    error: Error;
}

interface TestVectors {
    hasInputsFromOutputScript: HasInputsFromOutputScriptVector;
    addressReceivedToken: AddressReceivedTokenReturnVector;
    getTxTimestamp: GetTxTimestampReturnVector;
    getHistoryAfterTimestamp: GetHistoryAfterTimestampVector;
    isAddressEligibleForTokenReward: isAddressEligibleForTokenRewardVector;
    isTokenImageRequest: IsTokenImageRequestVector;
    getWalletFromSeed: GetWalletFromSeedVector;
    syncWallet: SyncWalletVector;
    getSlpInputsAndOutputs: GetSlpInputsAndOutputsVector;
    sendReward: SendRewardVector;
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
    getTxTimestamp: {
        returns: [
            {
                description: 'Returns timeFirstSeen if it is not 0',
                tx: { ...MOCK_TX_INNODE, timeFirstSeen: 2222222222 },
                timestamp: 2222222222,
            },
            {
                description:
                    'Returns block.timestamp if timeFirstSeen is 0 and the tx has confirmed',
                tx: {
                    ...MOCK_TX_INNODE,
                    timeFirstSeen: 0,
                    block: {
                        ...MOCK_BLOCK_METADATA_INNODE,
                        timestamp: 1111111111,
                    },
                },
                timestamp: 1111111111,
            },
            {
                description:
                    'Returns -1 for edge case of timeFirstSeen 0 and unconfirmed tx',
                tx: { ...MOCK_TX_INNODE, timeFirstSeen: 0 },
                timestamp: -1,
            },
        ],
    },
    // chronik/clientHandler.ts
    getHistoryAfterTimestamp: {
        returns: [
            {
                description: 'A tx exactly at the given timestamp is returned',
                mocks: { history: [{ ...MOCK_TX_INNODE, timeFirstSeen: 10 }] },
                address: IFP_ADDRESS,
                timestamp: 10,
                pageSize: 2,
                returned: [{ ...MOCK_TX_INNODE, timeFirstSeen: 10 }],
            },
            {
                description: 'A tx before the given timestamp is ignored',
                mocks: { history: [{ ...MOCK_TX_INNODE, timeFirstSeen: 9 }] },
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
                        { ...MOCK_TX_INNODE, timeFirstSeen: 9 },
                        { ...MOCK_TX_INNODE, timeFirstSeen: 8 },
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
                        { ...MOCK_TX_INNODE, timeFirstSeen: 12 },
                        { ...MOCK_TX_INNODE, timeFirstSeen: 11 },
                        { ...MOCK_TX_INNODE, timeFirstSeen: 10 },
                    ],
                },
                address: IFP_ADDRESS,
                timestamp: 10,
                pageSize: 2,
                returned: [
                    { ...MOCK_TX_INNODE, timeFirstSeen: 12 },
                    { ...MOCK_TX_INNODE, timeFirstSeen: 11 },
                    { ...MOCK_TX_INNODE, timeFirstSeen: 10 },
                ],
            },
            {
                description:
                    'If all txs on first page are at or after the given timestamp, and some are and some arent on the 2nd page, we only return the txs after expected timestamp',
                mocks: {
                    history: [
                        { ...MOCK_TX_INNODE, timeFirstSeen: 12 },
                        { ...MOCK_TX_INNODE, timeFirstSeen: 11 },
                        { ...MOCK_TX_INNODE, timeFirstSeen: 10 },
                        { ...MOCK_TX_INNODE, timeFirstSeen: 9 },
                    ],
                },
                address: IFP_ADDRESS,
                timestamp: 10,
                pageSize: 2,
                returned: [
                    { ...MOCK_TX_INNODE, timeFirstSeen: 12 },
                    { ...MOCK_TX_INNODE, timeFirstSeen: 11 },
                    { ...MOCK_TX_INNODE, timeFirstSeen: 10 },
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
                        ...MOCK_TX_INNODE,
                        inputs: [
                            {
                                ...MOCK_TX_INPUT,
                                outputScript: IFP_OUTPUTSCRIPT,
                            },
                        ],
                        outputs: [
                            {
                                ...MOCK_TX_OUTPUT,
                                value: 546,
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
                        ...MOCK_TX_INNODE,
                        inputs: [
                            {
                                ...MOCK_TX_INPUT,
                                outputScript: IFP_OUTPUTSCRIPT,
                            },
                        ],
                        outputs: [
                            {
                                ...MOCK_TX_OUTPUT,
                                value: 546,
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
                        ...MOCK_TX_INNODE,
                        inputs: [
                            {
                                ...MOCK_TX_INPUT,
                                outputScript: IFP_OUTPUTSCRIPT,
                            },
                        ],
                        outputs: [
                            {
                                ...MOCK_TX_OUTPUT,
                                value: 546,
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
    // validation.ts
    isTokenImageRequest: {
        returns: [
            {
                description: 'Expected token icon request is identified',
                req: {
                    url: '/512/3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109.png',
                } as Request,
                returned: true,
            },
            {
                description:
                    'Expected token icon request is valid for any size, as long as it contains numbers only',
                req: {
                    url: '/123456789/3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109.png',
                } as Request,
                returned: true,
            },
            {
                description: 'A non-number size is invalid',
                req: {
                    url: '/sometext/3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109.png',
                } as Request,
                returned: false,
            },
            {
                description: 'Additional route prefixes are invalid',
                req: {
                    url: '/tokenicons/512/3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109.png',
                } as Request,
                returned: false,
            },
            {
                description:
                    'Since the server only stores images as png, we do not recognize requests for other asset types',
                req: {
                    url: '/512/3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109.jpg',
                } as Request,
                returned: false,
            },
            {
                description:
                    'If tokenId is not 64 characters, it is not a token icon request',
                req: {
                    url: '/512/3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d10.png',
                } as Request,
                returned: false,
            },
            {
                description: 'non-hex string is not a token icon request',
                req: {
                    url: '/512/somehexstring.png',
                } as Request,
                returned: false,
            },
        ],
    },
    // wallet.ts
    getWalletFromSeed: {
        returns: [
            {
                description:
                    'We can get an ecash address and a wif from a valid 12-word bip39 seed',
                mnemonic:
                    'prevent history faith square peace prevent year frame curtain excite issue vicious',
                returned: {
                    address: 'ecash:qrha2rrjwcqq7q384f5ndq4mnsg28dx23cqs9c397r',
                    sk: Uint8Array.from(
                        Buffer.from(
                            'f7f7c12f3857082e9a4ecec79fded199bf78040de0b4ac8f0a7d5f9552b28031',
                            'hex',
                        ),
                    ),
                },
            },
        ],
        errors: [
            {
                description:
                    'We throw expected error if called with an invalid bip39 mnemonic',
                mnemonic: 'just some string',
                error: new Error(
                    'getWalletFromSeed called with invalid mnemonic',
                ),
            },
        ],
    },
    // Todo add mock utxos
    // todo test, confirm the object changes without passing the var
    syncWallet: {
        returns: [
            {
                description: 'We can update the utxo set of a wallet',
                wallet: {
                    address: 'ecash:qpm0kyq9x2clugajdycwwqqalaucn5km25zv644uxe',
                    sk: Uint8Array.from(
                        Buffer.from(
                            '78c6bfffd52b70404de0719962966adb34b61cf20414feebed7435b96dca479a',
                            'hex',
                        ),
                    ),
                    utxos: [],
                },
                mockUtxos: [
                    MOCK_SCRIPT_UTXO,
                    MOCK_SCRIPT_UTXO,
                    MOCK_SCRIPT_UTXO,
                ],
                returned: {
                    address: 'ecash:qpm0kyq9x2clugajdycwwqqalaucn5km25zv644uxe',
                    sk: Uint8Array.from(
                        Buffer.from(
                            '78c6bfffd52b70404de0719962966adb34b61cf20414feebed7435b96dca479a',
                            'hex',
                        ),
                    ),
                    utxos: [
                        MOCK_SCRIPT_UTXO,
                        MOCK_SCRIPT_UTXO,
                        MOCK_SCRIPT_UTXO,
                    ],
                },
            },
        ],
        errors: [
            {
                description: 'We throw expected error if chronik call fails',
                wallet: {
                    address: 'ecash:qpm0kyq9x2clugajdycwwqqalaucn5km25zv644uxe',
                    sk: Uint8Array.from(
                        Buffer.from(
                            '78c6bfffd52b70404de0719962966adb34b61cf20414feebed7435b96dca479a',
                            'hex',
                        ),
                    ),
                    utxos: [],
                },
                error: new Error('error from chronik'),
            },
        ],
    },
    getSlpInputsAndOutputs: {
        returns: [
            {
                description:
                    'We get expected inputs and outputs if we have sufficient token utxos to exactly cover the reward amount',
                rewardAmountTokenSats: 3n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                tokenId: MOCK_TOKENID_ONES,
                utxos: [
                    MOCK_SPENDABLE_TOKEN_UTXO,
                    MOCK_SPENDABLE_TOKEN_UTXO,
                    MOCK_SPENDABLE_TOKEN_UTXO,
                ],
                changeAddress: MOCK_WALLET.address,
                returned: {
                    slpInputs: [
                        MOCK_SPENDABLE_TOKEN_UTXO,
                        MOCK_SPENDABLE_TOKEN_UTXO,
                        MOCK_SPENDABLE_TOKEN_UTXO,
                    ],
                    slpOutputs: [
                        {
                            script: new Script(
                                new Uint8Array([
                                    106, 4, 83, 76, 80, 0, 1, 1, 4, 83, 69, 78,
                                    68, 32, 17, 17, 17, 17, 17, 17, 17, 17, 17,
                                    17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17,
                                    17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17,
                                    17, 8, 0, 0, 0, 0, 0, 0, 0, 3,
                                ]),
                            ),
                            value: 0,
                        },
                        {
                            script: Script.fromAddress(
                                'ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7ratqfx',
                            ),
                            value: 546,
                        },
                    ],
                },
            },
            {
                description:
                    'We get expected inputs and outputs if we have sufficient token utxos to cover the reward amount with change',
                rewardAmountTokenSats: 3n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                tokenId: MOCK_TOKENID_ONES,
                utxos: [
                    {
                        ...MOCK_SPENDABLE_TOKEN_UTXO,
                        token: {
                            ...MOCK_UTXO_TOKEN,
                            amount: '5',
                        },
                    },
                ],
                changeAddress: MOCK_WALLET.address,
                returned: {
                    slpInputs: [
                        {
                            ...MOCK_SPENDABLE_TOKEN_UTXO,
                            token: {
                                ...MOCK_UTXO_TOKEN,
                                amount: '5',
                            },
                        },
                    ],
                    slpOutputs: [
                        {
                            script: new Script(
                                new Uint8Array([
                                    106, 4, 83, 76, 80, 0, 1, 1, 4, 83, 69, 78,
                                    68, 32, 17, 17, 17, 17, 17, 17, 17, 17, 17,
                                    17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17,
                                    17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17,
                                    17, 8, 0, 0, 0, 0, 0, 0, 0, 3, 8, 0, 0, 0,
                                    0, 0, 0, 0, 2,
                                ]),
                            ),
                            value: 0,
                        },
                        {
                            script: Script.fromAddress(
                                'ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7ratqfx',
                            ),
                            value: 546,
                        },
                        {
                            script: Script.fromAddress(MOCK_WALLET.address),
                            value: 546,
                        },
                    ],
                },
            },
        ],
        errors: [
            {
                description: 'We have insufficient utxos if we have no utxos',
                rewardAmountTokenSats: 1n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                tokenId: MOCK_TOKENID_ONES,
                utxos: [],
                changeAddress: MOCK_WALLET.address,
                error: new Error('Insufficient token utxos'),
            },
            {
                description:
                    'We have insufficient utxos if we have utxos of total amount one less than rewardAmountTokenSats',
                rewardAmountTokenSats: 3n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                tokenId: MOCK_TOKENID_ONES,
                utxos: [MOCK_SPENDABLE_TOKEN_UTXO, MOCK_SPENDABLE_TOKEN_UTXO],
                changeAddress: MOCK_WALLET.address,
                error: new Error('Insufficient token utxos'),
            },
            {
                description:
                    'We have insufficient utxos if we have mint batons, eCash utxos, and spendable token utxos of other tokenIds, but not enough spendable utxos for the right token',
                rewardAmountTokenSats: 5n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                tokenId: MOCK_TOKENID_ONES,
                utxos: [
                    MOCK_MINT_BATON_TOKEN_UTXO,
                    MOCK_SPENDABLE_TOKEN_UTXO,
                    MOCK_MINT_BATON_TOKEN_UTXO,
                    {
                        ...MOCK_SPENDABLE_TOKEN_UTXO,
                        token: {
                            ...MOCK_UTXO_TOKEN,
                            tokenId: MOCK_TOKENID_TWOS,
                            amount: '5',
                        },
                    },
                ],
                changeAddress: MOCK_WALLET.address,
                error: new Error('Insufficient token utxos'),
            },
            {
                description:
                    'We have insufficient utxos if we have only mint batons, even if they are (somehow) of enough quantity',
                rewardAmountTokenSats: 1n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                tokenId: MOCK_TOKENID_ONES,
                utxos: [
                    {
                        ...MOCK_MINT_BATON_TOKEN_UTXO,
                        token: {
                            ...MOCK_UTXO_TOKEN,
                            isMintBaton: true,
                            amount: '5',
                        },
                    },
                ],
                changeAddress: MOCK_WALLET.address,
                error: new Error('Insufficient token utxos'),
            },
        ],
    },
    sendReward: {
        returns: [
            {
                description: 'Token reward tx with no token change',
                wallet: MOCK_WALLET,
                utxos: [
                    { ...MOCK_SCRIPT_UTXO, value: 10000 },
                    {
                        ...MOCK_SPENDABLE_TOKEN_UTXO,
                        outpoint: { ...MOCK_OUTPOINT, outIdx: 1 },
                    },
                ],
                tokenId: MOCK_TOKENID_ONES,
                rewardAmountTokenSats: 1n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                returned: {
                    hex: '02000000021111111111111111111111111111111111111111111111111111111111111111010000006441bd8fbfe0948c55c240cc59a2310383cfcf8384bbef43f006e10a9066bc5326598da467b04cf5a3923c483f5f71e70562d9e9857b44223873e7d356655081573541210357e84997196580b5e39b202f85ca353e92d051efa13f7f356834a15a36076e0affffffff1111111111111111111111111111111111111111111111111111111111111111000000006441488697564a9838c49c43060b65cfdce99007f7cb7ba4934d3e8bd190e7f23fdb5c4649b2b1e9d7893feb5130cb6e71969bb54b4150e8af7d4f5e3cf6a2a4ab6941210357e84997196580b5e39b202f85ca353e92d051efa13f7f356834a15a36076e0affffffff030000000000000000376a04534c500001010453454e4420111111111111111111111111111111111111111111111111111111111111111108000000000000000122020000000000001976a914000000000000000000000000000000000000000088ac68250000000000001976a914a5aff40b97ab2a15add0185bdcd4cd0fa3dd7b1888ac00000000',
                    response: {
                        txid: '67be6282c95a9462db206f4618f74d6a61f76e2306ee8f444951e86aa17c79ba',
                    },
                },
            },
            {
                description: 'Token reward tx with change',
                wallet: MOCK_WALLET,
                utxos: [
                    { ...MOCK_SCRIPT_UTXO, value: 10000 },
                    {
                        ...MOCK_SPENDABLE_TOKEN_UTXO,
                        outpoint: { ...MOCK_OUTPOINT, outIdx: 1 },
                        token: { ...MOCK_UTXO_TOKEN, amount: '10' },
                    },
                ],
                tokenId: MOCK_TOKENID_ONES,
                rewardAmountTokenSats: 5n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                returned: {
                    hex: '02000000021111111111111111111111111111111111111111111111111111111111111111010000006441a65f21241c03203fd90c1573fc8d464ad5e70f1122195137da262eca3110c573532f9729a6b21dbcf27d3f8d493af74a256d54279bbaf6a028516e1c75f1d62c41210357e84997196580b5e39b202f85ca353e92d051efa13f7f356834a15a36076e0affffffff11111111111111111111111111111111111111111111111111111111111111110000000064417d207e7edb2e1fb7cdd4e1933bba1ef52e835055b8f73707d9c061b9597b8be84071917b9e9264aa676190143a4479f1e3a5fc23eafef6852495610517dc6bb941210357e84997196580b5e39b202f85ca353e92d051efa13f7f356834a15a36076e0affffffff040000000000000000406a04534c500001010453454e4420111111111111111111111111111111111111111111111111111111111111111108000000000000000508000000000000000522020000000000001976a914000000000000000000000000000000000000000088ac22020000000000001976a914a5aff40b97ab2a15add0185bdcd4cd0fa3dd7b1888ac1b230000000000001976a914a5aff40b97ab2a15add0185bdcd4cd0fa3dd7b1888ac00000000',
                    response: {
                        txid: 'a5acb50ef2e93ffc19dcd19b93c536fdda8dc41c430dfc619eb1458658e615c1',
                    },
                },
            },
        ],
        errors: [
            {
                description: 'Expected error if wallet fails to sync utxo set',
                wallet: MOCK_WALLET,
                utxos: new Error('Some chronik error trying to fetch utxos'),
                tokenId: MOCK_TOKENID_ONES,
                rewardAmountTokenSats: 100n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                error: new Error('Some chronik error trying to fetch utxos'),
            },
            {
                description: 'Expected error if insufficient token balance',
                wallet: MOCK_WALLET,
                utxos: [
                    { ...MOCK_SCRIPT_UTXO, value: 10000 },
                    {
                        ...MOCK_SPENDABLE_TOKEN_UTXO,
                        outpoint: { ...MOCK_OUTPOINT, outIdx: 1 },
                    },
                ],
                tokenId: MOCK_TOKENID_ONES,
                rewardAmountTokenSats: 2n,
                destinationAddress: MOCK_DESTINATION_ADDRESS,
                error: new Error('Insufficient token utxos'),
            },
        ],
    },
};

export default vectors;

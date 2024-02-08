// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { WsSubScriptClient } from '../index';

interface ValidationVectors {
    description: string;
    subscription: WsSubScriptClient;
    result: boolean | string;
}

const expectedReturns: ValidationVectors[] = [
    {
        description: 'Valid p2pkh sub',
        subscription: {
            scriptType: 'p2pkh',
            payload: 'd37c4c809fe9840e7bfa77b86bd47163f6fb6c60',
        },
        result: true,
    },
    {
        description: 'Valid p2sh sub',
        subscription: {
            scriptType: 'p2sh',
            payload: 'd37c4c809fe9840e7bfa77b86bd47163f6fb6c60',
        },
        result: true,
    },
    {
        description: 'Valid 33-byte p2pk sub',
        subscription: {
            scriptType: 'p2pk',
            payload:
                '10d141b856a092ee169c5405323895e1962c6b0d7c101120d360164c9e4b3997bd',
        },
        result: true,
    },
    {
        description: 'Valid 65-byte p2pk sub',
        subscription: {
            scriptType: 'p2pk',
            payload:
                '047fa64f6874fb7213776b24c40bc915451b57ef7f17ad7b982561f99f7cdc7010d141b856a092ee169c5405323895e1962c6b0d7c101120d360164c9e4b3997bd',
        },
        result: true,
    },
    {
        description: 'Valid other sub',
        subscription: {
            scriptType: 'other',
            payload: 'deadbeef',
        },
        result: true,
    },
    {
        description: 'Otherwise valid hex that is upper case is rejected',
        subscription: {
            scriptType: 'other',
            payload: 'DEADBEEF',
        },
        result: 'Invalid hex: "DEADBEEF". Payload must be lowercase hex string.',
    },
    {
        description: 'Otherwise valid hex that is mixed case is rejected',
        subscription: {
            scriptType: 'other',
            payload: 'DEADbeef',
        },
        result: 'Invalid hex: "DEADbeef". Payload must be lowercase hex string.',
    },
    {
        description: 'Invalid sub: odd length (applies to any type)',
        subscription: {
            scriptType: 'invalid' as any as 'other',
            payload: 'dea',
        },
        result: 'Odd hex length: dea',
    },
    {
        description: 'Invalid sub: bad hex (applies to any type',
        subscription: {
            scriptType: 'invalid' as any as 'other',
            payload: 'nothex',
        },
        result: 'Invalid hex: "nothex". Payload must be lowercase hex string.',
    },
    {
        description: 'Invalid p2pkh: bad length',
        subscription: {
            scriptType: 'p2pkh',
            payload: 'ddd37c4c809fe9840e7bfa77b86bd47163f6fb6c60',
        },
        result: 'Invalid length, expected 20 bytes but got 21 bytes',
    },
    {
        description: 'Invalid p2sh: bad length',
        subscription: {
            scriptType: 'p2sh',
            payload: 'ddd37c4c809fe9840e7bfa77b86bd47163f6fb6c60',
        },
        result: 'Invalid length, expected 20 bytes but got 21 bytes',
    },
    {
        description: 'Invalid p2pk: bad length',
        subscription: {
            scriptType: 'p2pk',
            payload:
                '04047fa64f6874fb7213776b24c40bc915451b57ef7f17ad7b982561f99f7cdc7010d141b856a092ee169c5405323895e1962c6b0d7c101120d360164c9e4b3997bd',
        },
        result: 'Invalid length, expected one of [33, 65] but got 66 bytes',
    },
    {
        description: 'Invalid script type',
        subscription: {
            scriptType: 'madeitup' as any as 'other',
            payload: 'deadbeef',
        },
        result: 'Invalid scriptType: madeitup',
    },
];

export default {
    isValidWsSubscription: {
        expectedReturns,
    },
};

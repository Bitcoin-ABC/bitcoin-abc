// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    TokenTargetOutput,
    TOKEN_DUST_CHANGE_OUTPUT,
    TokenInputInfo,
} from 'token-protocols';
import { MAX_OUTPUT_AMOUNT_ALP_ATOMS } from 'token-protocols/alp';
import { SlpDecimals } from 'wallet';
import { Script, fromHex } from 'ecash-lib';

const MOCK_TOKEN_ID =
    '1111111111111111111111111111111111111111111111111111111111111111';

interface GetMaxDecimalizedAlpQtyReturn {
    description: string;
    decimals: SlpDecimals;
    returned: string;
}
interface GetAlpBurnTargetOutputsReturn {
    description: string;
    tokenInputInfo: TokenInputInfo;
    returned: TokenTargetOutput[];
}
interface AlpVectors {
    getMaxDecimalizedAlpQty: {
        expectedReturns: GetMaxDecimalizedAlpQtyReturn[];
    };
    getAlpBurnTargetOutputs: {
        expectedReturns: GetAlpBurnTargetOutputsReturn[];
    };
}
const vectors: AlpVectors = {
    getMaxDecimalizedAlpQty: {
        expectedReturns: [
            {
                description: '0 decimals',
                decimals: 0,
                returned: MAX_OUTPUT_AMOUNT_ALP_ATOMS.toString(),
            },
            {
                description: '1 decimals',
                decimals: 1,
                returned: '28147497671065.5',
            },
            {
                description: '2 decimals',
                decimals: 2,
                returned: '2814749767106.55',
            },
            {
                description: '3 decimals',
                decimals: 3,
                returned: '281474976710.655',
            },
            {
                description: '4 decimals',
                decimals: 4,
                returned: '28147497671.0655',
            },
            {
                description: '5 decimals',
                decimals: 5,
                returned: '2814749767.10655',
            },
            {
                description: '6 decimals',
                decimals: 6,
                returned: '281474976.710655',
            },
            {
                description: '7 decimals',
                decimals: 7,
                returned: '28147497.6710655',
            },
            {
                description: '8 decimals',
                decimals: 8,
                returned: '2814749.76710655',
            },
            {
                description: '9 decimals',
                decimals: 9,
                returned: '281474.976710655',
            },
        ],
    },
    getAlpBurnTargetOutputs: {
        expectedReturns: [
            {
                description: 'We can burn all input qty with no token change',
                tokenInputInfo: {
                    tokenId: MOCK_TOKEN_ID,
                    tokenInputs: [],
                    sendAmounts: [100n],
                },
                returned: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a5030534c503200044255524e1111111111111111111111111111111111111111111111111111111111111111640000000000',
                            ),
                        ),
                    },
                    // Self send dust output to make sure the tx has at least one output of at least dust
                    {
                        ...TOKEN_DUST_CHANGE_OUTPUT,
                    },
                ],
            },
            {
                description: 'We can burn some input qty with token change',
                tokenInputInfo: {
                    tokenId: MOCK_TOKEN_ID,
                    tokenInputs: [],
                    sendAmounts: [100n, 20n],
                },
                returned: [
                    {
                        sats: 0n,
                        script: new Script(
                            fromHex(
                                '6a5030534c503200044255524e111111111111111111111111111111111111111111111111111111111111111164000000000031534c5032000453454e44111111111111111111111111111111111111111111111111111111111111111101140000000000',
                            ),
                        ),
                    },
                    // Self send dust output -- in this case it is a token utxo holding change
                    {
                        ...TOKEN_DUST_CHANGE_OUTPUT,
                    },
                ],
            },
        ],
    },
};

export default vectors;

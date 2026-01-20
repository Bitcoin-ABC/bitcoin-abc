// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { MAX_OUTPUT_AMOUNT_ALP_ATOMS } from 'token-protocols/alp';
import { SlpDecimals } from 'wallet';

interface GetMaxDecimalizedAlpQtyReturn {
    description: string;
    decimals: SlpDecimals;
    returned: string;
}
interface AlpVectors {
    getMaxDecimalizedAlpQty: {
        expectedReturns: GetMaxDecimalizedAlpQtyReturn[];
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
};

export default vectors;

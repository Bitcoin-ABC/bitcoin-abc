// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Test vectors for agora functions
export default {
    isEqualTypedArray: {
        expectedReturns: [
            {
                description: 'Empty Uint8Arrays are equal',
                a: new Uint8Array(),
                b: new Uint8Array(),
                returned: true,
            },
            {
                description:
                    'Arrays with equal length and equal entries are equal',
                a: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]),
                b: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]),
                returned: true,
            },
            {
                description:
                    'Arrays with unequal length and equal entries are not equal',
                a: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]),
                b: new Uint8Array([0, 0, 0, 0, 0, 0, 0]),
                returned: false,
            },
            {
                description:
                    'Arrays with equal length and unequal entries are not equal',
                a: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]),
                b: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1]),
                returned: false,
            },
        ],
    },
};

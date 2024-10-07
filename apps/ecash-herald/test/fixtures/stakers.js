// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
module.exports = [
    {
        coinbaseTx: {
            outputs: [
                {
                    value: '362501148',
                    outputScript:
                        '76a9141b1bbcb888b4440a573427f526cb221f657318cf88ac',
                    slpToken: undefined,
                    spentBy: undefined,
                },
                {
                    value: '200000632',
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                    slpToken: undefined,
                    spentBy: undefined,
                },
                {
                    value: '62500197',
                    outputScript:
                        '76a914066f83c9a49e2639b5f0fb03f4da1b387c7e8ad188ac',
                    slpToken: undefined,
                    spentBy: undefined,
                },
            ],
            block: {
                height: 818670,
                hash: '000000000000000003e79cfe757a675909fd2bffde52158ce4ec826e5ac6ae79',
                timestamp: '1700051210',
            },
        },
        staker: {
            staker: '76a914066f83c9a49e2639b5f0fb03f4da1b387c7e8ad188ac',
            reward: 62500197,
        },
    },
    {
        coinbaseTx: {
            outputs: [
                {
                    value: '575000000',
                    outputScript:
                        '76a914a24e2b67689c3753983d3b408bc7690d31b1b74d88ac',
                    slpToken: undefined,
                    spentBy: undefined,
                },
                {
                    value: '50000000',
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                    slpToken: undefined,
                    spentBy: undefined,
                },
            ],

            block: {
                height: 818669,
                hash: '000000000000000012bfb536bdae6dfdd47a40c4878c776eeecad4d36b0154c0',
                timestamp: '1700050358',
            },
        },
        staker: false,
    },
    // Returns false if can't parse staker, i.e. weird miner allocation
    {
        coinbaseTx: {
            outputs: [
                {
                    value: '268750850',
                    outputScript:
                        '76a9141b1bbcb888b4440a573427f526cb221f657318cf88ac',
                    slpToken: undefined,
                    spentBy: undefined,
                },
                {
                    value: '200000632',
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                    slpToken: undefined,
                    spentBy: undefined,
                },
                {
                    value: '156250494',
                    outputScript:
                        '76a914066f83c9a49e2639b5f0fb03f4da1b387c7e8ad188ac',
                    slpToken: undefined,
                    spentBy: undefined,
                },
            ],
            block: {
                height: 1000000, // fake block higher than staking activation
                hash: '000000000000000012bfb536bdae6dfdd47a40c4878c776eeecad4d36b0154c0',
                timestamp: '1700050358',
            },
        },
        staker: false,
    },
];

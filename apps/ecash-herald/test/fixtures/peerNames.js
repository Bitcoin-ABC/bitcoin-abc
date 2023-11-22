// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const recentStakersApiResponse = require('../mocks/recentStakersApiResponse');

module.exports = [
    {
        parsedBlock: {
            height: 819341,
            staker: {
                staker: 'ecash:qzs8hq2pj4hu5j09fdr5uhha3986h2mthvfp7362nu',
                reward: 625000,
            },
        },
        apiResponse: recentStakersApiResponse,
        peerName: 'ec9b9b',
    },
    {
        parsedBlock: {
            height: 819333,
            staker: {
                staker: 'ecash:qrumdwtakfk0uga6drejum42gnhqreh28sfl4llkqe',
                reward: 625005.38,
            },
        },
        apiResponse: recentStakersApiResponse,
        peerName: 'K',
    },
    {
        parsedBlock: {
            height: 819346,
            staker: {
                staker: 'ecash:qrpkjsd0fjxd7m332mmlu9px6pwkzaufpcn2u7jcwt',
                reward: 625000.0,
            },
        },
        apiResponse: recentStakersApiResponse,
        peerName: '\ud83d\ude80',
    },
    // No change on bad API call
    {
        parsedBlock: {
            height: 819333,
            staker: {
                staker: 'ecash:qrumdwtakfk0uga6drejum42gnhqreh28sfl4llkqe',
                reward: 625005.38,
            },
        },
        apiResponse: false,
        peerName: 'K',
    },
];

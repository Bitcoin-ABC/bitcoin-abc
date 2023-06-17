// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
/**
 * miners.js
 * Constants related to parsing for known miners of ecash blocks
 *
 * Store as a map keyed by outputScript
 */
module.exports = {
    dataType: 'Map',
    value: [
        [
            '76a914f1c075a01882ae0972f95d3a4177c86c852b7d9188ac',
            {
                miner: 'ViaBTC',
                coinbaseHexFragment: '566961425443',
                parseableCoinbase: true,
            },
        ],
        [
            '76a914a24e2b67689c3753983d3b408bc7690d31b1b74d88ac',
            {
                miner: 'Mining-Dutch',
                coinbaseHexFragment: '4d696e696e672d4475746368',
            },
        ],
        [
            '76a914ce8c8cf69a922a607e8e03e27ec014fbc24882e088ac',
            {
                miner: 'Hathor-MM',
                // While Hathor-MM block coinbase scripts do contain "mm",
                // this is judged insufficient to uniquely identify
                coinbaseHexFragment: null,
            },
        ],
        [
            '76a9141b1bbcb888b4440a573427f526cb221f657318cf88ac',
            {
                miner: 'Zulu Pool',
                coinbaseHexFragment: '5a554c55506f6f4c',
            },
        ],
        [
            '76a914c857e19f313157ead29b6fa0fa9c772a9ec6c06888ac',
            {
                miner: 'CK Pool',
                coinbaseHexFragment: '636b706f6f6c',
            },
        ],
        [
            '76a91497b4ae75a3bfab8bf10ef17e133efe34a4a13df788ac',
            {
                miner: 'zpool',
                coinbaseHexFragment: '7a706f6f6c2e6361',
            },
        ],
        [
            '76a914b89b7be97f768291ed94c0409e8dfdbbdeb32ed088ac',
            {
                miner: 'Molepool',
                coinbaseHexFragment: '6d6f6c65706f6f6c2e636f6d', // ascii molepool.com
            },
        ],
    ],
};

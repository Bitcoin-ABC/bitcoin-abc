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
        [
            '76a914637e48a57a3f3d6184f3aaf68b9e2a77400f372c88ac',
            {
                miner: 'CoinMinerz.com',
                coinbaseHexFragment: '436f696e4d696e65727a2e636f6d', // ascii CoinMinerz.com
            },
        ],
        [
            '76a914b70bd84221a2c3f23b9aff76f453edb8d1c6ae0788ac',
            {
                miner: 'zergpool.com',
                coinbaseHexFragment: '7a657267706f6f6c2e636f6d', // ascii zergpool.com
            },
        ],
        [
            '76a914f4728f398bb962656803346fb4ac45d776041a2e88ac',
            {
                miner: 'solopool.org',
                coinbaseHexFragment: '736f6c6f706f6f6c2e6f7267', // ascii solopool.org
            },
        ],
    ],
};

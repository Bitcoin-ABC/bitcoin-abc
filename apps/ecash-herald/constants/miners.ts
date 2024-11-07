// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * miners.js
 * Constants related to parsing for known miners of ecash blocks
 *
 * Store as a map keyed by outputScript
 */
export interface MinerInfo {
    miner: string;
    coinbaseHexFragment: string;
    parseableCoinbase?: boolean; // Note: Added optional property since it's not present in all entries
}

export interface Miners {
    dataType: 'Map';
    value: Array<[string, MinerInfo]>;
}

export type KnownMiners = Map<string, MinerInfo>;

const miners: Miners = {
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
            '76a9141c2a7324dc6b7a2fd5d1e385f49f98bbef0e318b88ac',
            {
                miner: 'Hathor-MM',
                // Alt receiving addr for Hathor-MM
                coinbaseHexFragment: '48617468', // Hath
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
        [
            '41047fa64f6874fb7213776b24c40bc915451b57ef7f17ad7b982561f99f7cdc7010d141b856a092ee169c5405323895e1962c6b0d7c101120d360164c9e4b3997bdac',
            {
                miner: 'p2p-spb',
                coinbaseHexFragment: '7370622e78797a', // ascii spb.xyz
            },
        ],
        [
            '76a91478b7743efa732c16c1b956f19fd5ec623e71981388ac',
            {
                miner: 'Cminors-Pools',
                coinbaseHexFragment: '436d696e6f72732d506f6f6c73', // ascii Cminors-Pools
            },
        ],
        [
            '76a914c5c9fb1bef0c5c6a0df37a4bf41e186b6980c43b88ac',
            {
                miner: 'AnandrajSingh Pool',
                coinbaseHexFragment: '416e616e6472616a53696e676820506f6f6c', // ascii AnandrajSingh Pool
            },
        ],
        [
            '76a91402a7c7b4fdc5047d8789da27ac6c1a659b3edce588ac',
            {
                miner: 'nodeStratum',
                coinbaseHexFragment: '6e6f64655374726174756d', // ascii nodeStratum
            },
        ],
        [
            '76a9148a60441e461b776d0ede8ec941e7d2aaa4f25a5d88ac',
            {
                miner: 'westpool',
                coinbaseHexFragment: '77657374706f6f6c', // ascii westpool
            },
        ],
        [
            '76a914e2abcdbaa56d6258a483980408a4ecad5d686de288ac',
            {
                miner: 'eastpool',
                coinbaseHexFragment: '65617374706f6f6c', // ascii eastpool
            },
        ],
    ],
};

export default miners;

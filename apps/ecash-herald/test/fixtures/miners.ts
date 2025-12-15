// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

const minerTestFixtures = [
    {
        height: 791160,
        coinbaseHex:
            '0378120c182f5669614254432f4d696e6564206279203236303738362f103b6fa20ff3648a69acc31ed9b4946c00',
        payoutOutputScript:
            '76a914f1c075a01882ae0972f95d3a4177c86c852b7d9188ac',
        parsed: 'ViaBTC, Mined by 260786',
    },
    {
        height: 791162,
        coinbaseHex:
            '037a120c1b2f5669614254432f4d696e656420627920616e6d6f6c393934362f10506fba0b63c1be4232055d9432860000',
        payoutOutputScript:
            '76a914f1c075a01882ae0972f95d3a4177c86c852b7d9188ac',
        parsed: 'ViaBTC, Mined by anmol9946',
    },
    {
        height: 791152,
        coinbaseHex:
            '0370120c192f5669614254432f4d696e6564206279207374616c6365722f10eb6ea10f92ef957d84c8bb6769e22d00',
        payoutOutputScript:
            '76a914f1c075a01882ae0972f95d3a4177c86c852b7d9188ac',
        parsed: 'ViaBTC, Mined by stalcer',
    },
    {
        height: 791169,
        coinbaseHex:
            '0381120c04498b5a6408fabe6d6d2824fdd18ac6fdbf7196476428cc714e3841f1ff289127197ca59466b3ae739a0001000000000000000000115bba02001401112f4d696e696e672d44757463682f2d3231',
        payoutOutputScript:
            '76a914a24e2b67689c3753983d3b408bc7690d31b1b74d88ac',
        parsed: 'Mining-Dutch',
    },
    {
        height: 791165,
        coinbaseHex:
            '037d120c04b7895a6408fabe6d6d3552401c3f02d70ca60a4bd927ab08f4bd7412821435244a72d4002d5baf3e52000100000000000000003b4dbeab12001b01112f4d696e696e672d44757463682f2d3231',
        payoutOutputScript:
            '76a914a24e2b67689c3753983d3b408bc7690d31b1b74d88ac',
        parsed: 'Mining-Dutch',
    },
    {
        height: 790644,
        coinbaseHex:
            '0374100c0402c4546408fabe6d6dd9cb39f3ab01d745d7cf94bb2da744d5238ce6d91f2b495d697719dacbde4122000100000000000000a3b914314cf2000c01112f4d696e696e672d44757463682f2d3234',
        payoutOutputScript:
            '76a914a24e2b67689c3753983d3b408bc7690d31b1b74d88ac',
        parsed: 'Mining-Dutch',
    },
    {
        height: 791154,
        coinbaseHex:
            '0372120c04ca6f5a640cfabe6d6d0000000000000000000000000000000000000000000000000000000000000000010000000000000017ffe3db2f2981010000000015663561663031393839363731656539633239383034',
        payoutOutputScript:
            '76a914ce8c8cf69a922a607e8e03e27ec014fbc24882e088ac',
        parsed: 'unknown, ...863u',
    },
    {
        height: 790242,
        coinbaseHex:
            '03e20e0c04cdc250640cfabe6d6d00000000000000000000000000000000000000000000000000000000000000000100000000000000780131c9f83700000000000015303637373062323039393135643332643630303333',
        payoutOutputScript:
            '76a914ce8c8cf69a922a607e8e03e27ec014fbc24882e088ac',
        parsed: 'unknown, ...863u',
    },
    {
        height: 790837,
        coinbaseHex:
            '0335110c0408fa56640cfabe6d6d000000000000000000000000000000000000000000000000000000000000000001000000000000005ffff258d57091000000000015653364396135343132373039306165353131333437',
        payoutOutputScript:
            '76a914ce8c8cf69a922a607e8e03e27ec014fbc24882e088ac',
        parsed: 'unknown, ...863u',
    },
    {
        height: 785677,
        coinbaseHex:
            '030dfd0b48617468a881a54b5fbc28b27eb3ed59fc4924a3b991033fee7a78b919170a92d9b7beaf5a554c55506f6f4c2d584543000011d8e9bb1b00',
        payoutOutputScript:
            '76a9141b1bbcb888b4440a573427f526cb221f657318cf88ac',
        parsed: 'Zulu Pool',
    },
    {
        height: 790413,
        coinbaseHex:
            '038d0f0c48617468606e02e2feb6112decb0dbe728053841e8e16bcd643fc0cb4389e7e1a318bb735a554c55506f6f4c2d58454300002714214b0598',
        payoutOutputScript:
            '76a9141b1bbcb888b4440a573427f526cb221f657318cf88ac',
        parsed: 'Zulu Pool',
    },
    {
        height: 789691,
        coinbaseHex:
            '03bb0c0c48617468bb1017e3800bb814cc6912cdaa37488fd50a70da9e19b09a7e271bde7417d42d5a554c55506f6f4c2d5845430000171fcc948505',
        payoutOutputScript:
            '76a9141b1bbcb888b4440a573427f526cb221f657318cf88ac',
        parsed: 'Zulu Pool',
    },
    {
        // ck pool but different address from IceBerg
        height: 788631,
        parsed: 'CK Pool',
        coinbaseHex:
            '0397080c04181678a1046498416404bb67ca0d0c3692416477630100000000000a636b706f6f6c',
        payoutOutputScript:
            '76a914c857e19f313157ead29b6fa0fa9c772a9ec6c06888ac',
    },
    {
        height: 791069,
        parsed: 'IceBerg',
        coinbaseHex:
            '031d120c041821710c04556e5964043c958a2e0c4a794764d2ea1400000000000a636b706f6f6c122f6d696e656420627920496365426572672f',
        payoutOutputScript:
            '76a914c857e19f313157ead29b6fa0fa9c772a9ec6c06888ac',
    },
    {
        height: 788164,
        coinbaseHex:
            '03c4060c04181750ed0429773d6404180b99200c20493a6402911a00000000000a636b706f6f6c122f6d696e656420627920496365426572672f',
        payoutOutputScript:
            '76a914c857e19f313157ead29b6fa0fa9c772a9ec6c06888ac',
        parsed: 'IceBerg',
    },
    {
        height: 821592,
        parsed: 'iceberg',
        coinbaseHex:
            '0358890c00042dc37165044fc5a6120c40bf716509756caf200000000a636b706f6f6c122f6d696e656420627920696365626572672f',
        payoutOutputScript:
            '76a9149bbc716500000000ca3d0b0000000000a5bc716588ac',
    },
    {
        height: 790863,
        coinbaseHex:
            '034f110c04602a5764084200079077422b017a706f6f6c2e636100fabe6d6da821294426652ebd8cff8df5e02ffcbbdc1b1d9e9022832acf4d071e9bfa2d952000000000000000',
        payoutOutputScript:
            '76a91497b4ae75a3bfab8bf10ef17e133efe34a4a13df788ac',
        parsed: 'zpool',
    },
    {
        height: '0',
        coinbaseHex:
            '04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73',
        payoutOutputScript:
            '4104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac',
        parsed: 'unknown',
    },
    // Molepool.com
    {
        height: '796646',
        coinbaseHex:
            '03e6270c047d258c6400189620e6fee4e2170e2f6d6f6c65706f6f6c2e636f6d2f',
        payoutOutputScript:
            '76a914b89b7be97f768291ed94c0409e8dfdbbdeb32ed088ac',
        parsed: 'Molepool',
    },
    {
        height: '796654',
        coinbaseHex:
            '03ee270c04ef3b8c64006a6b7b05ab3df6000e2f6d6f6c65706f6f6c2e636f6d2f',
        payoutOutputScript:
            '76a914b89b7be97f768291ed94c0409e8dfdbbdeb32ed088ac',
        parsed: 'Molepool',
    },
    {
        height: '796655',
        coinbaseHex:
            '03ef270c04df408c6400157575e61ef6b9010e2f6d6f6c65706f6f6c2e636f6d2f',
        payoutOutputScript:
            '76a914b89b7be97f768291ed94c0409e8dfdbbdeb32ed088ac',
        parsed: 'Molepool',
    },
    {
        height: '787515',
        coinbaseHex:
            '033b040c04929a37640862c9c313191b1e00102f436f696e4d696e65727a2e636f6d2f',
        payoutOutputScript:
            '76a914637e48a57a3f3d6184f3aaf68b9e2a77400f372c88ac',
        parsed: 'CoinMinerz.com',
    },
    {
        height: '806676',
        coinbaseHex:
            '03144f0c04b01ee76408810609082dc306007a657267706f6f6c2e636f6d00fabe6d6d27401f3db7d7af865afebab80d7cb5357e7df5aae8621e46c2aa7c90bbfcdbca0200000000000000',
        payoutOutputScript:
            '76a914b70bd84221a2c3f23b9aff76f453edb8d1c6ae0788ac',
        parsed: 'zergpool.com',
    },
    {
        height: '806713',
        coinbaseHex:
            '03394f0c04529ee76408f51eecb651d049040c736f6c6f706f6f6c2e6f7267',
        payoutOutputScript:
            '76a914f4728f398bb962656803346fb4ac45d776041a2e88ac',
        parsed: 'solopool.org',
    },
    // Determined from pubkey tag output
    {
        height: '821556',
        coinbaseHex:
            '0334890c2cfabe6d6d2a357fe8c5668c1edd58a42eaaa181f49afcf397cd6ae2475393ec06cfca62f010000000000000007032702d7370622e78797a',
        payoutOutputScript:
            '41047fa64f6874fb7213776b24c40bc915451b57ef7f17ad7b982561f99f7cdc7010d141b856a092ee169c5405323895e1962c6b0d7c101120d360164c9e4b3997bdac',
        parsed: 'p2p-spb',
    },
    // Determined from coinbasehex fragment
    {
        height: '821556',
        coinbaseHex:
            '0334890c2cfabe6d6d2a357fe8c5668c1edd58a42eaaa181f49afcf397cd6ae2475393ec06cfca62f010000000000000007032702d7370622e78797a',
        payoutOutputScript: 'some new payout address',
        parsed: 'p2p-spb',
    },
    {
        height: '823276',
        coinbaseHex:
            '03ec8f0c486174683dec223b763544f28819df8ba957944bbac2e35cb8de151b030edee88a90135073e02f191d000000',
        payoutOutputScript:
            '76a9141c2a7324dc6b7a2fd5d1e385f49f98bbef0e318b88ac',
        parsed: 'Hathor-MM',
    },
    // Parse from hex
    {
        height: '823308',
        coinbaseHex:
            '030c900c486174685359f0bc84593a22dfc02d55f9121478a99352c1575208aeb484c82cb15fbb752f9701151d000000',
        payoutOutputScript: 'some new payout address',
        parsed: 'Hathor-MM',
    },
    // Parse from payout script
    {
        height: '825737',
        coinbaseHex: '0389990c04be0697650060002d03f7f5010004656b7534',
        payoutOutputScript:
            '76a91488fd36dad8f1e49913502922c867fab9ce27092288ac',
        parsed: 'unknown, ...pv7l',
    },
    {
        height: '826279',
        coinbaseHex: '03a79b0c04f5769c650030000215dacb0200026638',
        payoutOutputScript:
            '76a914fe4e85f56ae06e5a67e402354f8f73cab8fc19ce88ac',
        parsed: 'unknown, ...3cst',
    },
    {
        height: '826256',
        coinbaseHex: '03909b0c0474679c65003000021796240200026135',
        payoutOutputScript:
            '76a914d4b32e161eec0cb2e63a6a0d82e79463fb7f9f6b88ac',
        parsed: 'unknown, ...qud4',
    },
    {
        height: '825775',
        coinbaseHex: '03af990c04e68197650060002dbb36000000026f78',
        payoutOutputScript:
            '76a91472dce9d2b169bfc20501b4dac5927b16bd6f71e388ac',
        parsed: 'unknown, ...87xc',
    },
    // Parsed from coinbase hex fragment
    {
        height: '827550',
        coinbaseHex:
            '039ea00c0429c1a765088100001fa15a6800436d696e6f72732d506f6f6c7300fabe6d6df36f3ced97aac363e4f5202e4b39d539454d9d21c408df8ac4be8eb93660420b0100000000000000',
        payoutOutputScript: 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
        parsed: 'Cminors-Pools',
    },
    // Both coinbase fragment and payout script
    {
        height: '827558',
        coinbaseHex:
            '03a6a00c04edcda76508810000d1209af801436d696e6f72732d506f6f6c7300fabe6d6dc86e6540b56678f671a630b0d148ed2c4247abd1640348ce0fa3b82b60cf60bb0100000000000000',
        payoutOutputScript:
            '76a91478b7743efa732c16c1b956f19fd5ec623e71981388ac',
        parsed: 'Cminors-Pools',
    },
    {
        height: '840619',
        coinbaseHex:
            '03abd30c00046a362166046994e2100c601f21668868440000000000204d696e65642062792077697468204f6d20506f776572202f416e616e6472616a53696e676820506f6f6c2f0d20f09f8f86f09f8f86f09f8f86',
        payoutOutputScript:
            '76a914c5c9fb1bef0c5c6a0df37a4bf41e186b6980c43b88ac',
        parsed: 'AnandrajSingh Pool',
    },
    {
        height: '840619',
        coinbaseHex:
            '03abd30c00046a362166046994e2100c601f21668868440000000000204d696e65642062792077697468204f6d20506f776572202f416e616e6472616a53696e676820506f6f6c2f0d20f09f8f86f09f8f86f09f8f86',
        payoutOutputScript: 'not the one so it is parsed from hex',
        parsed: 'AnandrajSingh Pool',
    },
    {
        height: '856227',
        coinbaseHex:
            '03a3100d04ab46ae6608fabe6d6d1d595adb5776912c79ed2964f63c8add8b37db9e3d7052af3e2b50497057feb50400000000000000b156db64601400000d2f6e6f64655374726174756d2f',
        payoutOutputScript:
            '76a91402a7c7b4fdc5047d8789da27ac6c1a659b3edce588ac',
        parsed: 'nodeStratum',
    },
    {
        height: '856227',
        coinbaseHex:
            '03a3100d04ab46ae6608fabe6d6d1d595adb5776912c79ed2964f63c8add8b37db9e3d7052af3e2b50497057feb50400000000000000b156db64601400000d2f6e6f64655374726174756d2f',
        payoutOutputScript: 'not the one so it is parsed from hex',
        parsed: 'nodeStratum',
    },
    {
        height: '869806',
        coinbaseHex:
            '03ae450d0004c22d2b67047466c52d0ce7162b67322145e9d3070c000a636b706f6f6c0877657374706f6f6c',
        payoutOutputScript:
            '76a9148a60441e461b776d0ede8ec941e7d2aaa4f25a5d88ac',
        parsed: 'westpool',
    },
    {
        height: '869806',
        coinbaseHex:
            '03ae450d0004c22d2b67047466c52d0ce7162b67322145e9d3070c000a636b706f6f6c0877657374706f6f6c',
        payoutOutputScript: 'not the one so it is parsed from hex',
        parsed: 'westpool',
    },
    {
        height: '869806',
        coinbaseHex:
            '034f460d0004b29c2c6704225621300c6e702c678c55243e9d7af5000a636b706f6f6c0865617374706f6f6c',
        payoutOutputScript:
            '76a914e2abcdbaa56d6258a483980408a4ecad5d686de288ac',
        parsed: 'eastpool',
    },
    {
        height: '869967',
        coinbaseHex:
            '034f460d0004b29c2c6704225621300c6e702c678c55243e9d7af5000a636b706f6f6c0865617374706f6f6c',
        payoutOutputScript: 'not the one so it is parsed from hex',
        parsed: 'eastpool',
    },
    {
        height: '888960',
        coinbaseHex:
            '0380900d02114b08118f2927ec650400162f736f6c6f2e6d696e656d696e652e6f6e6c696e652f',
        payoutOutputScript:
            '76a9146657bcc784bfa56301962567c62feda9d1eb37ba88ac',
        parsed: 'solo.minemine.online',
    },
    {
        height: '888960',
        coinbaseHex:
            '0380900d02114b08118f2927ec650400162f736f6c6f2e6d696e656d696e652e6f6e6c696e652f',
        payoutOutputScript: 'not the one so it is parsed from hex',
        parsed: 'solo.minemine.online',
    },
    {
        height: '890855',
        coinbaseHex:
            '03e7970d047e48ee672f706f6f6c2e6b7279707465782e636f6d2f3132373761666337626139333936366600001dba129d000000000000',
        payoutOutputScript:
            '76a9149f9528b4e5b68220dbb1324cf65880066ad3b91488ac',
        parsed: 'Kryptex',
    },
    {
        height: '890855',
        coinbaseHex:
            '03e7970d047e48ee672f706f6f6c2e6b7279707465782e636f6d2f3132373761666337626139333936366600001dba129d000000000000',
        payoutOutputScript: 'not the one so it is parsed from hex',
        parsed: 'Kryptex',
    },
    {
        height: '892704',
        coinbaseHex:
            '03209f0d028cbe08d4959c7a6e410300162f706f6f6c2e6d696e656d696e652e6f6e6c696e652f',
        payoutOutputScript:
            '76a9147e10ebf54a4f7425b124d7faf9c4ef1916c1563b88ac',
        parsed: 'pool.minemine.online',
    },
    {
        height: '892704',
        coinbaseHex:
            '03209f0d028cbe08d4959c7a6e410300162f706f6f6c2e6d696e656d696e652e6f6e6c696e652f',
        payoutOutputScript: 'not the one so it is parsed from hex',
        parsed: 'pool.minemine.online',
    },
    {
        height: '899450',
        coinbaseHex:
            '037ab90d04e2d53c680cfabe6d6d000000000000000000000000000000000000000000000000000000000000000001000000000000006800000661c4dee1ef0a000016393020303120507465204c7464203664323033393235',
        payoutOutputScript:
            '76a9147c4b31ab24ebafdb7b1770ac08b51ac77fc3839388ac',
        parsed: '90 01 Pte Ltd',
    },
    {
        height: '899450',
        coinbaseHex:
            '037ab90d04e2d53c680cfabe6d6d000000000000000000000000000000000000000000000000000000000000000001000000000000006800000661c4dee1ef0a000016393020303120507465204c7464203664323033393235',
        payoutOutputScript: 'not the one so it is parsed from hex',
        parsed: '90 01 Pte Ltd',
    },
    // Node Miner - parsed from payout script
    {
        height: '905735',
        coinbaseHex:
            '0307d20d000453d6766804dbbb590e0be6e984b7a07c7ee00629000a062f6e6f64652f',
        payoutOutputScript:
            '76a9147b5e3b3c03c577cabc88275af797b15637b0fdcd88ac',
        parsed: 'Node Miner',
    },
    // Node Miner - parsed from coinbase hex fragment
    {
        height: '905736',
        coinbaseHex:
            '0308d20d000458dd7668047fc02c3b0b81637c16d693af36702d000a062f6e6f64652f',
        payoutOutputScript: 'not the one so it is parsed from hex',
        parsed: 'Node Miner',
    },
    // LSoftware DMCC - parsed from payout script
    {
        height: '917134',
        coinbaseHex:
            '038efe0d044b42df680cfabe6d6d000000000000000000000000000000000000000000000000000000000000000001000000000000000000008daf871ed1e62d0000174c536f66747761726520444d4343206266633539383637',
        payoutOutputScript:
            '76a91467e5fd9e06f01bc40627ad0bdbb5a014c743a81788ac',
        parsed: 'LSoftware DMCC',
    },
    // LSoftware DMCC - parsed from coinbase hex fragment
    {
        height: '917133',
        coinbaseHex:
            '038dfe0d049541df680cfabe6d6d0000000000000000000000000000000000000000000000000000000000000000010000000000000027fffc2cb0f72c102e2d0000174c536f66747761726520444d4343206439306433393437',
        payoutOutputScript: 'not the one so it is parsed from hex',
        parsed: 'LSoftware DMCC',
    },
    // hash-hut.net - parsed from payout script
    {
        height: '927610',
        coinbaseHex:
            '037a270e04abfc3f6908b6f388e9290000004e2f686173682d6875742e6e65742f31386263666877476a376e7234373262fabe6d6dceeb5dbb501d3c59f0b00178078803b2631257356ef2bffe33d888bd14befb77200000008e00000000000000',
        payoutOutputScript:
            '76a914a1a16b0c06361696165c638b12e2f5cf714bc18f88ac',
        parsed: 'hash-hut.net',
    },
    // hash-hut.net - parsed from coinbase hex fragment
    {
        height: '927611',
        coinbaseHex:
            '037a270e04abfc3f6908b6f388e9290000004e2f686173682d6875742e6e65742f31386263666877476a376e7234373262fabe6d6dceeb5dbb501d3c59f0b00178078803b2631257356ef2bffe33d888bd14befb77200000008e00000000000000',
        payoutOutputScript: 'not the one so it is parsed from hex',
        parsed: 'hash-hut.net',
    },
];

export default minerTestFixtures;

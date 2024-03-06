// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
// @generated
'use strict';

module.exports = { 
  mockBlockInfo: {
      blockInfo: {
        hash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
        prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
        height: 0,
        nBits: 486604799,
        timestamp: '1231006505',
        blockSize: '285',
        numTxs: '1',
        numInputs: '1',
        numOutputs: '1',
        sumInputSats: '0',
        sumCoinbaseOutputSats: '5000000000',
        sumNormalOutputSats: '0',
        sumBurnedSats: '0'
      },
      blockDetails: {
        version: 1,
        merkleRoot: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
        nonce: '2083236893',
        medianTimestamp: '1231006505'
      },
      rawHeader: '0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a29ab5f49ffff001d1dac2b7c',
      txs: [
        {
          txid: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
          version: 1,
          inputs: [Array],
          outputs: [Array],
          lockTime: 0,
          slpTxData: undefined,
          slpErrorMsg: undefined,
          block: [Object],
          timeFirstSeen: '0',
          size: 204,
          isCoinbase: true,
          network: 'XEC'
        }
      ]
  },
  mockTxInfo: {
      txid: '0f3c3908a2ddec8dea91d2fe1f77295bbbb158af869bff345d44ae800f0a5498',
      version: 2,
      inputs: [
        {
          prevOut: [Object],
          inputScript: '473044022042349e5e9e58c4c7b1fc9cbcdd1a1c9774b2ae95b7704ce40c7058ef14ba2854022022ba0cd4ead86982e7fc090ad06569a72c165efa3634feac4e722eee405b92674121022d577b731fb05971d54951e4cb8bd11120327eba3e0fdd5a4d18f74a882df1a4',
          outputScript: '76a914d15b9793d6af77663f8acf7e2c884f114ef901da88ac',
          value: '546',
          sequenceNo: 4294967295,
          slpBurn: undefined,
          slpToken: [Object]
        },
        {
          prevOut: [Object],
          inputScript: '473044022076e0c764b7d5a5f738304fec1df97db4ba6fc35f8ccb2438de8aabff781edb5c022002016344d4432a5837569b9c764b88aa71f98dbfb76c48cbd0ad9f18dc15be0e4121022d577b731fb05971d54951e4cb8bd11120327eba3e0fdd5a4d18f74a882df1a4',
          outputScript: '76a914d15b9793d6af77663f8acf7e2c884f114ef901da88ac',
          value: '100000',
          sequenceNo: 4294967295,
          slpBurn: undefined,
          slpToken: undefined
        }
      ],
      outputs: [
        {
          value: '0',
          outputScript: '6a04534c500001010453454e44200daf200e3418f2df1158efef36fbb507f12928f1fdcf3543703e64e75a4a90730800000000004c4b40080000000002aea540',
          slpToken: undefined,
          spentBy: undefined
        },
        {
          value: '546',
          outputScript: '76a9149c371def7e7cf89b30a62d658147937e679a965388ac',
          slpToken: [Object],
          spentBy: [Object]
        },
        {
          value: '546',
          outputScript: '76a914e7b4f63ec550ada1aed74960ddc4e0e107cd6cd188ac',
          slpToken: [Object],
          spentBy: [Object]
        },
        {
          value: '98938',
          outputScript: '76a914d15b9793d6af77663f8acf7e2c884f114ef901da88ac',
          slpToken: undefined,
          spentBy: [Object]
        }
      ],
      lockTime: 0,
      slpTxData: {
        slpMeta: {
          tokenType: 'FUNGIBLE',
          txType: 'SEND',
          tokenId: '0daf200e3418f2df1158efef36fbb507f12928f1fdcf3543703e64e75a4a9073',
          groupTokenId: undefined
        },
        genesisInfo: undefined
      },
      slpErrorMsg: undefined,
      block: {
        height: 697728,
        hash: '0000000000000000452f19532a6297ea194eaacac6d3bbcbf7c08a74cad84b44',
        timestamp: '1627790415'
      },
      timeFirstSeen: '0',
      size: 479,
      isCoinbase: false,
      network: 'XEC'
    },
    mockTokenInfo: {
      slpTxData: {
        slpMeta: {
          tokenType: "FUNGIBLE",
          txType: "GENESIS",
          tokenId: "f1ff5ccc51d325dd3b3931d31f3fece46e439a423b73a770e8dd07c3114b8505"
        },
        genesisInfo: {
          tokenTicker: "ETT",
          tokenName: "ethantest",
          tokenDocumentUrl: "https://cashtab.com/",
          tokenDocumentHash: "",
          decimals: 2
        }
      },
      tokenStats: {
        totalMinted: "500000000",
        totalBurned: "0"
      },
      block: {
        height: 803945,
        hash: "000000000000000012211c6284cb31f2753070986a333bd4a1bd11c3180257de",
        timestamp: "1691224546"
      },
      timeFirstSeen: "1691224388",
      initialTokenQuantity: "500000000",
      containsBaton: false,
      network: "XEC"
    },
    mockTxHistory: {
      txs: [
        {
          txid: '308858d2281302d7d534cf271f041afbb103f35a3fcb772c4948bf0830ad3b0b',
          version: 2,
          inputs: [Array],
          outputs: [Array],
          lockTime: 0,
          slpTxData: undefined,
          slpErrorMsg: undefined,
          block: [Object],
          timeFirstSeen: '1691996839',
          size: 226,
          isCoinbase: false,
          network: 'XEC'
        },
        {
          txid: '47617c1aeb4c1d5d623b1959261db6cccf2167e938403480c88e97951997a7e4',
          version: 2,
          inputs: [Array],
          outputs: [Array],
          lockTime: 0,
          slpTxData: undefined,
          slpErrorMsg: undefined,
          block: [Object],
          timeFirstSeen: '1691833154',
          size: 226,
          isCoinbase: false,
          network: 'XEC'
        }
      ],
      numPages: 1
    },
    mockSimpleP2pkhUtxos: [
      {
        "outputScript": "76a914dc1147663948f0dcfb00cc407eda41b121713ad388ac",
        "utxos": [
          {
            "outpoint": {
              "txid": "245caf1b79dd547b73eb05fc52008ece339dfdae83ddb1ee330e687e43e4a5bd",
              "outIdx": 2
            },
            "blockHeight": 812504,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "a65a53850f85e97b0e96d8e7d87ba734bf2e473992ea535f6cc0db509f8be164"
            },
            "slpToken": {
              "amount": "100",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "1fa8370451d8bc05fc74564436905a46c3f734555f9ec9e4434e7fc2dfab8d0c",
              "outIdx": 0
            },
            "blockHeight": -1,
            "isCoinbase": false,
            "value": "5000",
            "network": "XEC"
          }
        ]
      }
    ],
    mockP2pkhUtxos: [
      {
        "outputScript": "76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac",
        "utxos": [
          {
            "outpoint": {
              "txid": "b3f4427b4358aec002330f0501e2daab59b273e9418427580029b88c50c1210f",
              "outIdx": 1
            },
            "blockHeight": 761405,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484"
            },
            "slpToken": {
              "amount": "15000000000",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "9e5a4286b7157d5f3aee856f6f2ae48cca40d5f78deead7f98be86ae7ca2ab4e",
              "outIdx": 1
            },
            "blockHeight": 767635,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "861dede36f7f73f0af4e979fc3a3f77f37d53fe27be4444601150c21619635f4"
            },
            "slpToken": {
              "amount": "550",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "d67763057d19056ba485e9d1c51c84e992e7a7e4ac7436a24f5e0b8fabce8fec",
              "outIdx": 1
            },
            "blockHeight": 770420,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "861dede36f7f73f0af4e979fc3a3f77f37d53fe27be4444601150c21619635f4"
            },
            "slpToken": {
              "amount": "50",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "6ed1be901c6fea4b7fe54304d426be2ea392d9be2fcbc11ff8a47e0afbcb092c",
              "outIdx": 1
            },
            "blockHeight": 783287,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "3ecf2c5c1bfb65c686b6f0f7369dc3f084adb45c26eef6bc052d2c6fc8caf8d8"
            },
            "slpToken": {
              "amount": "10",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "ddd8ae571bc44cd64b85666744879e8880d9bf5a8ea1b540b0b56bce4633c758",
              "outIdx": 1
            },
            "blockHeight": 783497,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "3ecf2c5c1bfb65c686b6f0f7369dc3f084adb45c26eef6bc052d2c6fc8caf8d8"
            },
            "slpToken": {
              "amount": "10",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "ddd8ae571bc44cd64b85666744879e8880d9bf5a8ea1b540b0b56bce4633c758",
              "outIdx": 2
            },
            "blockHeight": 783497,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "3ecf2c5c1bfb65c686b6f0f7369dc3f084adb45c26eef6bc052d2c6fc8caf8d8"
            },
            "slpToken": {
              "amount": "30",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "a86315e9f7eff2dfbd2d42c34cf4b7f3ea8e66abc54d932fa7decd54983171f5",
              "outIdx": 1
            },
            "blockHeight": 789786,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "524aa21e99318dfb4be282433fee38cc48cc716b1311c69e20583d29c53bc217"
            },
            "slpToken": {
              "amount": "100",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "a86315e9f7eff2dfbd2d42c34cf4b7f3ea8e66abc54d932fa7decd54983171f5",
              "outIdx": 2
            },
            "blockHeight": 789786,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "524aa21e99318dfb4be282433fee38cc48cc716b1311c69e20583d29c53bc217"
            },
            "slpToken": {
              "amount": "190",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "489e9cf15d2308ca1bc726c5fba69114339506c08ab749e652b8c265cb134234",
              "outIdx": 1
            },
            "blockHeight": 789801,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "42b10218dfb1f997d5723d181f28a960e064987a3e184406f47b772395aeb85f"
            },
            "slpToken": {
              "amount": "5000",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "7f9fc35f4d28b9aea7a3fbfae7c837c52061d85c1c2624b35dbf75989e50cc36",
              "outIdx": 1
            },
            "blockHeight": 789953,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "18e5cc79b608f03ed461f99240424b308b137c5e4fa683058a558600df0ee11d"
            },
            "slpToken": {
              "amount": "5000",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "8512cce7726a939cef969671d8a3b888ba8a8d551c335d8b21097516060c4c45",
              "outIdx": 1
            },
            "blockHeight": 789953,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "18e5cc79b608f03ed461f99240424b308b137c5e4fa683058a558600df0ee11d"
            },
            "slpToken": {
              "amount": "200",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "601591db9b84659e998aa3dd2286f094da147cd08bd4d1124635f1ed57806355",
              "outIdx": 1
            },
            "blockHeight": 797846,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3"
            },
            "slpToken": {
              "amount": "1",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "fbcb7147770f63aa74eab0e3bf219d1a39489cecd420ad48a368113e47deefbb",
              "outIdx": 2
            },
            "blockHeight": 797888,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "e1aab3e7f68de43c288982bfc53f9502de7463b352beb545fc9ef919fd58f222"
            },
            "slpToken": {
              "amount": "4734000",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "f189376fd662b113e5da5904e318123aee5f573221e57a2545849ac556f31130",
              "outIdx": 2
            },
            "blockHeight": 798068,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "867342146adfe1e95e8de4fdc9550b8b74f5472215e98661bbf1c4bb689115ab"
            },
            "slpToken": {
              "amount": "495000",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "620b019c5a824655f862d1e39b23f86fc22fcc5ee75c483922890de86ac9ad22",
              "outIdx": 1
            },
            "blockHeight": 798086,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "ce9e6c09e6b85b94366776459e6ff5cdc4eddd03ef26219a17716c7fa766e71b"
            },
            "slpToken": {
              "amount": "100",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "aaccd2934d15bae314e7cdc9c0fefbb9ccf36b6d2407a922fb0cb8167187fc33",
              "outIdx": 1
            },
            "blockHeight": 798086,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "524aa21e99318dfb4be282433fee38cc48cc716b1311c69e20583d29c53bc217"
            },
            "slpToken": {
              "amount": "100",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "19c1a55234e9295ad78375fb8f748408fc4903c2426757cf5985dd159d9f80e2",
              "outIdx": 2
            },
            "blockHeight": 798122,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "e1aab3e7f68de43c288982bfc53f9502de7463b352beb545fc9ef919fd58f222"
            },
            "slpToken": {
              "amount": "95000",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "40d3da44d497a52b87495e2edabafb178365d715f69c76a09ca376b17f641313",
              "outIdx": 2
            },
            "blockHeight": 798123,
            "isCoinbase": false,
            "value": "546",
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "e1aab3e7f68de43c288982bfc53f9502de7463b352beb545fc9ef919fd58f222"
            },
            "slpToken": {
              "amount": "48000",
              "isMintBaton": false
            },
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "1b59feeb756e59c8df26af0f636dfb7c6fd466743539617cee49d60ffda02994",
              "outIdx": 0
            },
            "blockHeight": 799480,
            "isCoinbase": false,
            "value": "900",
            "network": "XEC"
          },
          {
            "outpoint": {
              "txid": "1b59feeb756e59c8df26af0f636dfb7c6fd466743539617cee49d60ffda02994",
              "outIdx": 1
            },
            "blockHeight": 799480,
            "isCoinbase": false,
            "value": "38052",
            "network": "XEC"
          }
        ]
      }
    ],
    mockBlockchainInfo: {
      "tipHash": "000000000000000003950ae8f423803842b44e1be916e1332bd238a40b55bc5e",
      "tipHeight": 807382
    },
    mockRawTxHex: '0200000001076682ecbf1a38e08cd773d3da3c87cbfa30c296bf1a85edd791720f895ed2f3010000006b483045022100a4b774d4734df0909f73470dadc2f3c7edd179ee35ed1f42dcd05b60cf76efcb022042011b283795ebb2e8b27855404e6ef5ba0bdcc00ef598c0536357a92ade86a44121027388cc87347171e7dbd714ce6a06e74235b181a7e4e0700042cf0546d7717d7effffffff0288130000000000001976a9148dcf6103a371e2c7216cff3b0243c13f5cf63a5a88ac7327c905000000001976a914a46b94c091f0569a61a00a48e16beafbd4084b8f88ac00000000',
    mockSendXecRawTxHex: '02000000010c8dabdfc27f4e43e4c99e5f5534f7c3465a9036445674fc05bcd8510437a81f000000006a473044022061f2900cc89145eabbb80e94780e2833631c5a99196094cc85190f91a759ea9902205354409761734992096006ebaefeafe6bd103b46a50037da1524124fb8ea8b11412102560c43edaa6a058c9096c90ce5d4a3bbbf70fd18b2030d26614bc32379151de9ffffffff023a020000000000001976a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac6c100000000000001976a91457b07862d8c1a1ac4e8bccc5213443969c264ed988ac00000000',
    mockSendXecNoChangeRawTxHex: '02000000010c8dabdfc27f4e43e4c99e5f5534f7c3465a9036445674fc05bcd8510437a81f000000006b4830450221008c86fe8d3fee5082c4429eef064a2063fcc1ea9216afd88cba1ff8cfe7b7083602204c1655728b1bbfc5ded78d46db00968a67e2f4c7c8072fe808feff4ccfd29d74412102560c43edaa6a058c9096c90ce5d4a3bbbf70fd18b2030d26614bc32379151de9ffffffff0194110000000000001976a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac00000000',
};

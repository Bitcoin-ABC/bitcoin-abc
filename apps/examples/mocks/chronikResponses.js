// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
// @generated
'use strict';

module.exports = {
        tx: {
            '816d32c855e40c4221482eb85390a72ba0906360197c297a787125e6979e674e': {
              txid: '816d32c855e40c4221482eb85390a72ba0906360197c297a787125e6979e674e',
      version: 2,
      inputs: [
          {
              prevOut: [Object],
              inputScript:
                  '483045022100906aaa871331afbdeab6cf7a4638835f1b259529a5ecd0081ce3cf19946e822a0220753b695fd001319361bdc4f6d2f2e0f262b467108b8cec55876acae81cd017ed412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
              outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
              value: '5018901',
              sequenceNo: 4294967294,
              slpBurn: undefined,
              slpToken: undefined,
          },
      ],
      outputs: [
          {
              value: '1200000',
              outputScript: '76a914816f64372275a81cea291d89328a4f38b8d01ef788ac',
              slpToken: undefined,
              spentBy: undefined,
          },
          {
              value: '3818446',
              outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
              slpToken: undefined,
              spentBy: [Object],
          },
      ],
      lockTime: 0,
      slpTxData: undefined,
      slpErrorMsg: undefined,
      block: {
          height: 776426,
          hash: '000000000000000006a599a9539863a62661692bdfeb88be19b2886d5cb2eff0',
          timestamp: '1674688510',
      },
      timeFirstSeen: '1674687499',
      size: 226,
      isCoinbase: false,
      network: 'XEC',
    },
  },
  txHistoryMock: {
      "txs": [
        {
          "txid": "40d3da44d497a52b87495e2edabafb178365d715f69c76a09ca376b17f641313",
          "version": 2,
          "inputs": [
            {
              "prevOut": {
                "txid": "19c1a55234e9295ad78375fb8f748408fc4903c2426757cf5985dd159d9f80e2",
                "outIdx": 3
              },
              "inputScript": "4730440220537c15a8318852f75c77ef26e7427706449289dcd3e8c2575026b8dcac4e3c15022023d2dcac963c23779dbee20f8e53c37cc6290641696b320dad046b03bf52c855412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e",
              "outputScript": "76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac",
              "value": "59565",
              "sequenceNo": 4294967295
            },
            {
              "prevOut": {
                "txid": "c557e33c7c943965fa932189cb8ab7c4f126a90dca9d7e9b3bbe2b2697c553df",
                "outIdx": 1
              },
              "inputScript": "483045022100f9985398aeaad35cb3876de78183248c5da5a4ac5b01bdc93a833c1fe07c46e30220431b8aa9382e5d10dd506e0be61d7feeff27ffc7c877d4f276dd702907fde7d1412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e",
              "outputScript": "76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac",
              "value": "546",
              "sequenceNo": 4294967295,
              "slpToken": {
                "amount": "50000",
                "isMintBaton": false
              }
            }
          ],
          "outputs": [
            {
              "value": "0",
              "outputScript": "6a04534c500001010453454e4420e1aab3e7f68de43c288982bfc53f9502de7463b352beb545fc9ef919fd58f2220800000000000007d008000000000000bb80"
            },
            {
              "value": "546",
              "outputScript": "76a914a2fa76106dbfa8944cceded8a28c951cb09043a588ac",
              "slpToken": {
                "amount": "2000",
                "isMintBaton": false
              }
            },
            {
              "value": "546",
              "outputScript": "76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac",
              "slpToken": {
                "amount": "48000",
                "isMintBaton": false
              }
            },
            {
              "value": "57882",
              "outputScript": "76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac"
            }
          ],
          "lockTime": 0,
          "slpTxData": {
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "e1aab3e7f68de43c288982bfc53f9502de7463b352beb545fc9ef919fd58f222"
            }
          },
          "block": {
            "height": 798123,
            "hash": "00000000000000000472afc725ff9cade35412be037097ac90b5f154381b690c",
            "timestamp": "1687793123"
          },
          "timeFirstSeen": "1687793093",
          "size": 480,
          "isCoinbase": false,
          "network": "XEC"
        },
        {
          "txid": "19c1a55234e9295ad78375fb8f748408fc4903c2426757cf5985dd159d9f80e2",
          "version": 2,
          "inputs": [
            {
              "prevOut": {
                "txid": "fd1f2eb1c87281717d2c45a163bd340addec9aa886f41b68bd63f8f6e1b8614e",
                "outIdx": 0
              },
              "inputScript": "4830450221009dbf2d1ebb5e1e189ef523e4fee75019c55e7a06f5ec75f7d8444b99e297c238022046496eabd7c13a3c3ac3290416eec728e44fd3f45954ed1b8ab927bcd782f99b412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e",
              "outputScript": "76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac",
              "value": "1200",
              "sequenceNo": 4294967295
            },
            {
              "prevOut": {
                "txid": "bd6ed16b16c00808ee242e570a2672f596434c09da5290ff77cadf52387bd2f3",
                "outIdx": 1
              },
              "inputScript": "47304402206a427b20c493acbe5023aa2c1e1d6f43a1ba781c463936235644753840adae7a02203d166ad727d3dce775dbba733e845b49f27e0dfe90765b2d29271c1a16ec7eb1412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e",
              "outputScript": "76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac",
              "value": "648",
              "sequenceNo": 4294967295
            },
            {
              "prevOut": {
                "txid": "ce555a8725d08c15825d8fb11e1ea488b0bd1e4270613a786ece34e5a5a1e55a",
                "outIdx": 1
              },
              "inputScript": "483045022100bb60971e234b8c4b62da664477d1c84a85bf6f85cae318fcbaf64a05bc09837d02203d9f286714b78cb9a66bbdf0f57726b5312d966b9675f9f9971a7ed75bd6aecf412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e",
              "outputScript": "76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac",
              "value": "59995",
              "sequenceNo": 4294967295
            },
            {
              "prevOut": {
                "txid": "ede9d5d96c5fc9bc9c25fdab06febdd7f71fd6316dd81584226112ff0b019626",
                "outIdx": 1
              },
              "inputScript": "473044022042d213eaffa1c74445e28a0405761ad10a1ab679b99c7e67c433c396facdafca02203d085e6e928eaecf4f3d4c43ad4f36078c9100a4491aa9bdc08d81c9a8ec6bf0412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e",
              "outputScript": "76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac",
              "value": "546",
              "sequenceNo": 4294967295,
              "slpToken": {
                "amount": "100000",
                "isMintBaton": false
              }
            }
          ],
          "outputs": [
            {
              "value": "0",
              "outputScript": "6a04534c500001010453454e4420e1aab3e7f68de43c288982bfc53f9502de7463b352beb545fc9ef919fd58f222080000000000001388080000000000017318"
            },
            {
              "value": "546",
              "outputScript": "76a914a2fa76106dbfa8944cceded8a28c951cb09043a588ac",
              "slpToken": {
                "amount": "5000",
                "isMintBaton": false
              }
            },
            {
              "value": "546",
              "outputScript": "76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac",
              "slpToken": {
                "amount": "95000",
                "isMintBaton": false
              }
            },
            {
              "value": "59565",
              "outputScript": "76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac",
              "spentBy": {
                "txid": "40d3da44d497a52b87495e2edabafb178365d715f69c76a09ca376b17f641313",
                "outIdx": 0
              }
            }
          ],
          "lockTime": 0,
          "slpTxData": {
            "slpMeta": {
              "tokenType": "FUNGIBLE",
              "txType": "SEND",
              "tokenId": "e1aab3e7f68de43c288982bfc53f9502de7463b352beb545fc9ef919fd58f222"
            }
          },
          "block": {
            "height": 798122,
            "hash": "00000000000000001783fcb58d27ee1f33694233204641921c1963d4be44d1be",
            "timestamp": "1687793082"
          },
          "timeFirstSeen": "1687793076",
          "size": 775,
          "isCoinbase": false,
          "network": "XEC"
        },
        {
          "txid": "bd6ed16b16c00808ee242e570a2672f596434c09da5290ff77cadf52387bd2f3",
          "version": 2,
          "inputs": [
            {
              "prevOut": {
                "txid": "2ab95f95bafe4bc54d09d96faeee1e6d0d85205d8984095fe366f5f415a545b8",
                "outIdx": 0
              },
              "inputScript": "483045022100dde262285fe109a42b288e602806aa2eb13e13538c4f0d0c26d14702c62e9418022053caac2312d513cf6375f5a1aa3c8fe812479a587f213a0bfd54005a58760350412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e",
              "outputScript": "76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac",
              "value": "1100",
              "sequenceNo": 4294967295
            },
            {
              "prevOut": {
                "txid": "85cc11f9d90d6ef5c8f69ef104e05db4ca02bef19a8664f510cec15b62de9bdd",
                "outIdx": 0
              },
              "inputScript": "483045022100f4b1c61b642b5fc142c3cb9152f44a52272fbe511bf29d43db86a62caf1617e602204ba4089e05dd5ef803876415c9ea4f3c45adc63f0dd5692f7b422ec8448713ae412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e",
              "outputScript": "76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac",
              "value": "1000",
              "sequenceNo": 4294967295
            }
          ],
          "outputs": [
            {
              "value": "700",
              "outputScript": "76a914a2fa76106dbfa8944cceded8a28c951cb09043a588ac"
            },
            {
              "value": "648",
              "outputScript": "76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac",
              "spentBy": {
                "txid": "19c1a55234e9295ad78375fb8f748408fc4903c2426757cf5985dd159d9f80e2",
                "outIdx": 1
              }
            }
          ],
          "lockTime": 0,
          "block": {
            "height": 798122,
            "hash": "00000000000000001783fcb58d27ee1f33694233204641921c1963d4be44d1be",
            "timestamp": "1687793082"
          },
          "timeFirstSeen": "1687793059",
          "size": 374,
          "isCoinbase": false,
          "network": "XEC"
        },
        {
          "txid": "ce555a8725d08c15825d8fb11e1ea488b0bd1e4270613a786ece34e5a5a1e55a",
          "version": 2,
          "inputs": [
            {
              "prevOut": {
                "txid": "b2530bf986f870526ce67b3ac8caca18d7c69813aa71d5a0fbd35bbce366c35e",
                "outIdx": 0
              },
              "inputScript": "47304402205d397575897d32330d4879895ad5d74e3e9353161286d880fdf93feb4101b8af02206cf272f952dcf8f0f41ef7dd05b5384e014e542108e5f03b2484188a19b3203e412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e",
              "outputScript": "76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac",
              "value": "600",
              "sequenceNo": 4294967295
            },
            {
              "prevOut": {
                "txid": "b2530bf986f870526ce67b3ac8caca18d7c69813aa71d5a0fbd35bbce366c35e",
                "outIdx": 1
              },
              "inputScript": "47304402207a8d3fc0c1bfa1e79999477381641b4ca44f790dd41c7fde81ea05661eb6dcdd022028c27c287182da925e2f2edbeb5eab252d24ba5d6f5265a2356ed55b64daf00b412102394542bf928bc707dcc156acf72e87c9d2fef77eaefc5f6b836d9ceeb0fc6a3e",
              "outputScript": "76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac",
              "value": "60747",
              "sequenceNo": 4294967295
            }
          ],
          "outputs": [
            {
              "value": "600",
              "outputScript": "76a914a2fa76106dbfa8944cceded8a28c951cb09043a588ac"
            },
            {
              "value": "59995",
              "outputScript": "76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac",
              "spentBy": {
                "txid": "19c1a55234e9295ad78375fb8f748408fc4903c2426757cf5985dd159d9f80e2",
                "outIdx": 2
              }
            }
          ],
          "lockTime": 0,
          "block": {
            "height": 798122,
            "hash": "00000000000000001783fcb58d27ee1f33694233204641921c1963d4be44d1be",
            "timestamp": "1687793082"
          },
          "timeFirstSeen": "1687793044",
          "size": 372,
          "isCoinbase": false,
          "network": "XEC"
        },
        {
          "txid": "fd1f2eb1c87281717d2c45a163bd340addec9aa886f41b68bd63f8f6e1b8614e",
          "version": 2,
          "inputs": [
            {
              "prevOut": {
                "txid": "92389f02c592ce42cd83e4e6b04a2ff48dcc0c2d1d8e40b00f2bca2c73f5b0b9",
                "outIdx": 2
              },
              "inputScript": "483045022100eb31b781a004d95fbb3906faedbbfae7d303247ce91e0f4a122bffce2be45a4702200841a02cbc4bb94b5e17ed562aefab204db23957c61562cdc069a8afdb534dbf4121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454",
              "outputScript": "76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac",
              "value": "550",
              "sequenceNo": 4294967295
            },
            {
              "prevOut": {
                "txid": "e3e8b0a20c26c53cf97db0d76a02208ae92b3640a89397c083042dc5afe53484",
                "outIdx": 3
              },
              "inputScript": "483045022100c8bb9d3427e797fff518fd87cf1c9f92b529360014c5bf5be300b86586f4f7a402206f56df632f7fe790c44c1d301618bee5400dbc5a32a8c786a58645510f384b914121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454",
              "outputScript": "76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac",
              "value": "550",
              "sequenceNo": 4294967295
            },
            {
              "prevOut": {
                "txid": "003657eeb27f44d09ad86b44ee361482d8b895c6a831d4935d0928ce52082adc",
                "outIdx": 3
              },
              "inputScript": "483045022100c711456dd10812597dde2efb975a48750797b25a301d217a864d1cba9ecb388402205eff853a16c493b2d63efaec952105da99109bf452451660a693218188ed3a504121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454",
              "outputScript": "76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac",
              "value": "1000",
              "sequenceNo": 4294967295
            },
            {
              "prevOut": {
                "txid": "281c8cfcae82d34c1011706c2fd2b4770c53ee69b28a9072c86b59af1b683e8c",
                "outIdx": 3
              },
              "inputScript": "483045022100a091eee5119bed42ce18ef34dc11deea0b221f7c8c6dda4582cffe3352f4a99502201f19e46856aed895ec97ed7cdb60d325992b1e3650f9b67da54f66cc85b5aa364121031e9483074a9f0ee7380131a870edbe9403e7b807a4b5611b01540a150f6aa454",
              "outputScript": "76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac",
              "value": "550",
              "sequenceNo": 4294967295
            }
          ],
          "outputs": [
            {
              "value": "1200",
              "outputScript": "76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac",
              "spentBy": {
                "txid": "19c1a55234e9295ad78375fb8f748408fc4903c2426757cf5985dd159d9f80e2",
                "outIdx": 0
              }
            }
          ],
          "lockTime": 0,
          "block": {
            "height": 798086,
            "hash": "0000000000000000088d37a19baff4c32d4e3b235c4eab9940adf3cece8468a6",
            "timestamp": "1687766390"
          },
          "timeFirstSeen": "1687766340",
          "size": 636,
          "isCoinbase": false,
          "network": "XEC"
        }
      ],
      "numPages": 1
  },
};

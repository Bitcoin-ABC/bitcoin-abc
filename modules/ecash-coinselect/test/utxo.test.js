// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const {
    getInputUtxos,
    parseChronikUtxos,
    calcP2pkhByteCount,
} = require('../src/utxo');
const {
    chronikUtxos,
    parsedChronikUtxos,
    chronikUtxosSlpOnly,
    chronikUtxosXecOnly,
    parsedChronikUtxosSlpOnly,
    parsedChronikUtxosXecOnly,
} = require('../mocks/mockChronikUtxos');

/**
 * Validates whether rawTxHex's byte size is within the acceptable range of byteCount
 *
 * `calcP2pkhByteCount` uses the max possible size approach. In this logic the signature
 * is set to 72 bytes in the input size. Since it is highly unlikely to get a signature
 * that is not 71 or 72 bytes, combined with the fact the sighash byte is separately
 * accounted for, then the actual byte size can only be over-evaluated by 1 byte per input.
 * Therefore the range used below caters for the maximum delta based on inputCount * 1 byte.
 */
function isWithinByteCountRange(rawTxHex, byteCount, inputCount) {
    const rawTxHexBytes = rawTxHex.length / 2;
    const isWithinValidRange =
        // Validate rawTxHexBytes is within the maximum range from byteCount
        rawTxHexBytes >= byteCount - inputCount &&
        // Validate the byteCount is always the maximum size
        rawTxHexBytes <= byteCount;

    // Note: can't return on the above boolean evaluations directly otherwise
    // the '&&' operator will cause JS to return the inherent undefined value
    return isWithinValidRange;
}

it('parseChronikUtxos() correctly returns an empty parsed object for an empty utxo set', function () {
    const result = parseChronikUtxos([]);
    assert.deepEqual(result, {
        xecUtxos: [],
        slpUtxos: [],
    });
});

it('parseChronikUtxos() correctly returns a parsed object for a mixed XEC/SLP utxo set', function () {
    const result = parseChronikUtxos(chronikUtxos);
    assert.deepEqual(result, parsedChronikUtxos);
});

it('parseChronikUtxos() correctly returns a parsed object for an XEC only utxo set', function () {
    const result = parseChronikUtxos(chronikUtxosXecOnly);
    assert.deepEqual(result, parsedChronikUtxosXecOnly);
});

it('parseChronikUtxos() correctly returns a parsed object for an SLP only utxo set', function () {
    const result = parseChronikUtxos(chronikUtxosSlpOnly);
    assert.deepEqual(result, parsedChronikUtxosSlpOnly);
});

it('calcP2pkhByteCount() returns a correct byte count for a p2pkh tx with 1 input and 2 outputs', function () {
    const inputCount = 1;
    const outputCount = 2;
    const rawTxHex =
        '0200000001076682ecbf1a38e08cd773d3da3c87cbfa30c296bf1a85edd791720f895ed2f3010000006b483045022100a4b774d4734df0909f73470dadc2f3c7edd179ee35ed1f42dcd05b60cf76efcb022042011b283795ebb2e8b27855404e6ef5ba0bdcc00ef598c0536357a92ade86a44121027388cc87347171e7dbd714ce6a06e74235b181a7e4e0700042cf0546d7717d7effffffff0288130000000000001976a9148dcf6103a371e2c7216cff3b0243c13f5cf63a5a88ac7327c905000000001976a914a46b94c091f0569a61a00a48e16beafbd4084b8f88ac00000000';
    const byteCount = calcP2pkhByteCount(inputCount, outputCount);
    assert.equal(isWithinByteCountRange(rawTxHex, byteCount, inputCount), true);
});

it('calcP2pkhByteCount() returns a correct byte count for a p2pkh tx with 20 inputs and 1 output', function () {
    const inputCount = 20;
    const outputCount = 1;
    const rawTxHex =
        '0100000014326e656ce70db23365cfdb2515ea07cf9aed43db796a701ed3395f3bfc33d11a320000006a47304402201f6c45459ae029db63cb9758652179771662a9a03e6e271153f016396e35c5e402205cc5f5f8d48a74a008ed73697f262ae864a1365f251aca4d3915196d6d0b51ae4121027d13e055c8310b474d11857ac598333422e2615e0520801757f252b1927abf73ffffffff1405e211865256970b175182faa7bb4720f04e8257f19bc1870af53cc8fba0a9000000006b4830450221008a3d4d1ac9c6b493e79153fb1b36d776a605922b3d331eb51a1eb0f3c0c44203022045afe2b894943ef78fd77021e97dd40e00cf70257072cfd86f9a64af19c4e0664121031ca581d5f01efbd1126ab5ee190b3f01a6f93516e8a0b3371afe3ef1e56405f0ffffffff9299b5b68a3bf0745812a295e864bbc0a93e9148e122204eb4341fec49d60b36000000006b483045022100fd42a70e9eccc35412aa036796e8693d5a760228090e6c9f279cb7341010f2c902206dbd4ade763a4c9c44597e7b440460f1c6903e0eae941c51b6bb1df6d75a05e64121031ca581d5f01efbd1126ab5ee190b3f01a6f93516e8a0b3371afe3ef1e56405f0ffffffffbdc12910d02670f84da5396371ec9c5fd00901022faaba2faeccc0e28609298d000000006b483045022100f34b5b428d0a127c37d9c8ddd0969c43e96727d799623614b1262a9bcc113a53022006b6ab607fbe8ec347eb1355cc94c994212122b138a60fb513fc1aeb6f0899b54121031ca581d5f01efbd1126ab5ee190b3f01a6f93516e8a0b3371afe3ef1e56405f0ffffffff1ec3abe18b5c150e301071768cfbabc07417305f6db4865a1cab85a3ddd42324010000006b483045022100c2c28a52bc5981d15b6e658f9d61bd0da2dd5a557df19494541d6e6e33e144e102202e42c362895e3896bb2cb4983cc81a5bb401bd123a092c2706aa133a256cb6984121031ca581d5f01efbd1126ab5ee190b3f01a6f93516e8a0b3371afe3ef1e56405f0ffffffff9f8ff404da7782a19bc4ac8c352a97046242ee0e4ab0f09e32559297c17d948d000000006a47304402203e613dc7589cca4c24c9ec057aed0c09de9aa67af219f076f88c03e4bf466bbd022000ebfca4217db06a86b38c48bd9435dedabb327ff2460e9ea0fbba2661bfe55f4121039ecd017789c3e82e0c3c547a2a500b16a7d59585b7ba7f8b5b4dfc49a43592d7ffffffff93cb6cc69eb8f542b7b9ef8bbb6f8b588c5426a28d4b541a144c0a19974c1aee080000006a473044022079094e7ab38d8ee3a47ad15b6f59c4c0d7b04bb69ff646c3b0fb45e9a12a4cfd02204196a68d5678f99fd2be77fb6bbde5f7ab7315a3b09cb7b344897370556d6d4f4121026c1885f2822f1fd58d9c58ecbc504531af72c62944f7d34a582660da38e45837ffffffff326e656ce70db23365cfdb2515ea07cf9aed43db796a701ed3395f3bfc33d11a390000006b483045022100cc64789815bc7258c44de15e1a6e0d827a941e87e4caed9f132747936800a1a802202f340793570627ae1201d9f26802c84f933a954e7e0ea95b609ee8ca1fbc88b2412103d145942fe060c1b9d6a6be86cf47bf0256d690bfcd85305632b9798eb776ce14ffffffff326e656ce70db23365cfdb2515ea07cf9aed43db796a701ed3395f3bfc33d11a1c0000006a4730440220365423e46f7910230aaa3351b17d8e551588fa1c4a707c9669b868be328cfd9802205eb1eb8b66d9280fcb0821aa286741d2c9d5aee9a928eeffb4890f860771ff90412102e2e40b93c683d6d3f66e991d25836d6e5fbfaacd94b43354ef8cb2a00a1f09beffffffff6282ec04a480da2b90edaa36af8926a9a4cec690dd862afe42fafcc0aa27bc70000000006a47304402202ef95b58e68ca9fc47a0ca1ded4bfe6412f9053f7ba5d0e0ed9cb6bb7602c60902207db5c583177658082e2d4ebd1839a23e55e396a1fd9f4e9e256df1f42fe9b415412103b661e06fb535c47b489118aeb0b7b72238a8c70fb75635e1491c3e314798ec4dffffffffd9d6a44b288ecdb4474038b89818ae6dd640956a3c014209acff2d4ea086ce88000000006b483045022100895ae20735035b97b27d1dacce207ed067a755fa7d7cdc870aefdf0736f84fc3022021235b27682a59d2b5a791482934f7a14f701aa5449097793c57dec9b10d40ea412103b661e06fb535c47b489118aeb0b7b72238a8c70fb75635e1491c3e314798ec4dffffffff3a50b453c5bff1ffc113a0ed55888ed467232ac2ac93116f5a1d507ea5309fed000000006a4730440220461cd20f8b68cbc54d88c5207a04bf92cd6e553a86ee1adde3668dbae33f4ab402200703cba4134b7dda4f61c818426dafb0172d70b6d480f9a7d3a3bd6c862e914c412103b661e06fb535c47b489118aeb0b7b72238a8c70fb75635e1491c3e314798ec4dffffffff326e656ce70db23365cfdb2515ea07cf9aed43db796a701ed3395f3bfc33d11a210000006a47304402205215adfdccb38ea7de504e9c44d6e838c3b72b5fcf0e11ea1e9b714740775fac02200f97bbd3941fe7faf5c4b4b2048d59cc10a1043622de4c9bcdcbc9ea3cfbcfac412102dc202f4cbc6a40d6f82ae40d2839fcda280196d1e8f01aa7b2bd1ed9f8bad076ffffffffd71b8e35db2e41454347b3a725650b4dd1704900a8cfb43e6fe3ae5dca95edba000000006b483045022100913acf757b3cd919c114c2a59586c7900267dbd018f38edc9b15a851ff010407022027a4a83fa55638d8027859e7102a4ab9065388f1f928e66e7aef44a00f821d274121037e7e1d2236bb20e2b34750e9702e886828a90c9b48503c74ac28db78b8b0ac3fffffffffa39b8668bf5492763b75c5fe769844b9f42e5427d9fe3d02f9ce2d8ef71263a5000000006a47304402206dba5a127c3cba2ed6ba390dbeef1852758319ea22ef7cb1017db054e84aaada02206e1ecbb1bee0708a3e48863c7bf1060230c9d6d746dbf63aea18def4bee85f864121037e7e1d2236bb20e2b34750e9702e886828a90c9b48503c74ac28db78b8b0ac3fffffffff326e656ce70db23365cfdb2515ea07cf9aed43db796a701ed3395f3bfc33d11a0e0000006a473044022040c86dc497409763cba953578fa45e4e87e1ed89e93e5667cfba83d6372c0b2d022042d19cb9749619594469182901bf295a538de9db959696ed774e4d9264b3ed40412103bab7775c3dd312457431be187763f285fadd6f87914e1158a203017f8523cca0ffffffff326e656ce70db23365cfdb2515ea07cf9aed43db796a701ed3395f3bfc33d11a000000006a47304402204fb28c73ab3f5b42384de91344e6fcad273190bb3f089793d8db1fafe35d393402201a1cae1a8ae628518273d0f45d05a78d27bd4111c483aff8ef1b7418106b311f4121037c065074b60e5f4bab2716ee51efe29aabea3aa835812247706a5cdd3607ee3affffffff326e656ce70db23365cfdb2515ea07cf9aed43db796a701ed3395f3bfc33d11a2d0000006b483045022100e24fe798f65adcd6a55abfffdcab403830d19ad4d327a9667738986bd1a1ee1c02201d64d19dde5b1149b25032e949517df26ae4fe330cbf9d8a713424b0c8109c86412102cf089e85b13e39fad2d1c809a310fc35c7e0aefa33b7280039d14beb4983d683ffffffffe851840960a106acd053ba8690dfad8fc3c4466114fb79fe52ee06816cf866bc000000006b483045022100b21821646ccb57dbb012a826639169ff02ee9eca5bc8402d697a49721aec7b5a0220079fd92a06823592e4b9d84f2133f58f12bafb0a65e13e2e589553b990b7144e412102ae4ec8fd5df90d3dee60572916801d51d9ba440dcbd51ac099222fedc05cfbf1ffffffff93cb6cc69eb8f542b7b9ef8bbb6f8b588c5426a28d4b541a144c0a19974c1aee040000006a4730440220214e1d1164c78bd3076efba801c58c4ca42de47bb0496f38c507eb145353262f022076560537dd0775fda0ff74d3a0fe1cae796569eb630dabb75797951625f6384b412103ed5fabeb20086066fd91917bdfb2c1f348051b4f3e22f63d5fbe442e73b065d7ffffffff01e4392c82120000001976a914231f7087937684790d1049294f3aef9cfb7b05dd88ac00000000';
    const rawTxHexBytes = rawTxHex.length / 2;
    const byteCount = calcP2pkhByteCount(inputCount, outputCount);
    assert.equal(isWithinByteCountRange(rawTxHex, byteCount, inputCount), true);
});

it('calcP2pkhByteCount() returns a correct byte count for a p2pkh tx with 6 inputs and 4 outputs', function () {
    const inputCount = 6;
    const outputCount = 4;
    const rawTxHex =
        '010000000609bd22e3fae25a049a374bb6d1888bb2ea79e2ee4ebac511922d1d7513cc6158020000006441c5b9040987521876f381d2897598de8002a444502b1a47da913f6b06e840b0d3a1ae1d67b1d7d447508afa53bd083cceb5d9e1d2b336c31f4a10dc649e879a8cc121023eaeda390915c1c68c5c372b84ae6ebfd2b13235a020b4bfbf200614d5ad1a4dffffffff719522dbe8786c20379a798be10289af848b281ee2b2c5ec0221ce26eaa8c7ac010000006441aaff0d67934ce2c462971b35acbdf5a03b40eeaded7a559cd76fe3520deaf58707f43a5f8ffd356da3aba7f235f6ce89b82eeb3e125e827259220ccd125db30dc121023eaeda390915c1c68c5c372b84ae6ebfd2b13235a020b4bfbf200614d5ad1a4dffffffff6bba80d653823b255a70e7564c4c49a2463748eb47dcc2ac4af441590d8f49211d00000064414f88a0fe1493c3a604f7411a34518dfaa7b862aa954b00049ac41eeac9ca76cf27f35403cae8de335e9ca99a2a7648af0f6d449570b3d8da8a4a1b3f38889fad412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31ffffffff6bba80d653823b255a70e7564c4c49a2463748eb47dcc2ac4af441590d8f49211e00000064416c0dcb69746bf4b7d987bea83b0def0cb780a5c4d6cf54e8a842fc0d2f764694d7f5ba659cfa42853a4da42d28ad9448cac4c303cddd9b30e5856f15837a4ed7412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31ffffffff6bba80d653823b255a70e7564c4c49a2463748eb47dcc2ac4af441590d8f49211f000000644190fb8d19235d4ad4ec222a86d69512e4c4a085e5a4e9fafb5cd2bf15c88e09204bb8a7d88caf7b961c77ec9d81ae97e5ab134359fef3fc5302dee6ff76c5f3c7412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31ffffffff6bba80d653823b255a70e7564c4c49a2463748eb47dcc2ac4af441590d8f492120000000644148c7171db8d7e8a615b2ee298d31cc87565286d14a1ce5f79ae544a7e2c34fd5848a3ad349976b1bbabfa112199ea93c01b66f2c58d66b35c2a8cc60935d2c4e412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31ffffffff040000000000000000406a503d534c5032000453454e4445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd03400600000000e0470000000000000000000022020000000000001976a914dee50f576362377dd2f031453c0bb09009acaf8188aca80700000000000017a914598df6ad1783bf1bb16bd16ca2d4c899ab637b408722020000000000001976a91436ca3d0fe6bba7b7deae86967546ec1b745aace388ac00000000';
    const rawTxHexBytes = rawTxHex.length / 2;
    const byteCount = calcP2pkhByteCount(inputCount, outputCount);
    assert.equal(isWithinByteCountRange(rawTxHex, byteCount, inputCount), true);
});

it('getInputUtxos() correctly collects enough XEC utxos for a single element outputArray', function () {
    const outputArray = [
        {
            address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
            value: 900, // 9 XEC
        },
    ];
    const result = getInputUtxos(chronikUtxos, outputArray);

    // The first XEC utxo in `chronikUtxos` is 900 sats, hence result should contain this 900 sat
    // utxo plus one other XEC utxo to cover fees
    const expectedResult = {
        inputs: [
            {
                outpoint: {
                    txid: '1b59feeb756e59c8df26af0f636dfb7c6fd466743539617cee49d60ffda02994',
                    outIdx: 0,
                },
                blockHeight: 799480,
                isCoinbase: false,
                value: '900',
                network: 'XEC',
            },
            {
                outpoint: {
                    txid: '1b59feeb756e59c8df26af0f636dfb7c6fd466743539617cee49d60ffda02994',
                    outIdx: 1,
                },
                blockHeight: 799480,
                isCoinbase: false,
                value: '38052',
                network: 'XEC',
            },
        ],
        changeAmount: 37678,
        txFee: 374,
    };
    assert.deepEqual(result, expectedResult);
});

it('getInputUtxos() correctly collects enough XEC utxos where a change output is not required', function () {
    const outputArray = [
        {
            address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
            value: 590, // 5.9 XEC
        },
    ];
    const result = getInputUtxos(chronikUtxos, outputArray);

    // The first XEC utxo in `chronikUtxos` is 900 sats, which covers the send amount and tx fee without needing a change output
    const expectedResult = {
        inputs: [
            {
                outpoint: {
                    txid: '1b59feeb756e59c8df26af0f636dfb7c6fd466743539617cee49d60ffda02994',
                    outIdx: 0,
                },
                blockHeight: 799480,
                isCoinbase: false,
                value: '900',
                network: 'XEC',
            },
        ],
        changeAmount: 0,
        txFee: 192,
    };
    assert.deepEqual(result, expectedResult);
});

it('getInputUtxos() correctly collects enough XEC utxos for a multi-element outputArray', function () {
    const outputArray = [
        {
            address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
            value: 900, // 9 XEC
        },
        {
            address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
            value: 9000, // 90 XEC
        },
        {
            address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
            value: 5000, // 50 XEC
        },
    ];
    const result = getInputUtxos(chronikUtxos, outputArray);

    // The first two XEC utxo (900+38052) in `chronikUtxos` will cover the total 14900 sats send value and fee
    const expectedResult = {
        inputs: [
            {
                outpoint: {
                    txid: '1b59feeb756e59c8df26af0f636dfb7c6fd466743539617cee49d60ffda02994',
                    outIdx: 0,
                },
                blockHeight: 799480,
                isCoinbase: false,
                value: '900',
                network: 'XEC',
            },
            {
                outpoint: {
                    txid: '1b59feeb756e59c8df26af0f636dfb7c6fd466743539617cee49d60ffda02994',
                    outIdx: 1,
                },
                blockHeight: 799480,
                isCoinbase: false,
                value: '38052',
                network: 'XEC',
            },
        ],
        changeAmount: 23610,
        txFee: 442,
    };
    assert.deepEqual(result, expectedResult);
});

it('getInputUtxos() correctly throws an error if there are not enough XEC utxos for a given send amount in satoshis', function () {
    const outputArray = [
        {
            address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
            value: 50000000000, // 500m XEC
        },
    ];
    assert.rejects(
        () => {
            getInputUtxos(chronikUtxos, outputArray);
        },
        {
            name: 'Error',
            message: 'Insufficient balance',
        },
    );
});

it('getInputUtxos() correctly throws an error if a non array outputArray is supplied', function () {
    const outputArray = {
        address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
        value: 50000000000, // 500m XEC
    };
    assert.rejects(
        () => {
            getInputUtxos(chronikUtxos, outputArray);
        },
        {
            name: 'Error',
            message: 'Invalid output supplied',
        },
    );
});

it('getInputUtxos() correctly throws an error if a non-p2pkh address is in outputArray', function () {
    const outputArray = [
        {
            // p2pkh address
            address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
            value: 900, // 9 XEC
        },
        {
            // p2sh address
            address: 'ecash:pzwgdlqrf0g45yy20exkeyevuhjp9hjvksa4n0wakr',
            value: 9000, // 90 XEC
        },
    ];
    assert.rejects(
        () => {
            getInputUtxos(chronikUtxos, outputArray);
        },
        {
            name: 'Error',
            message: `${outputArray[1].address} is not a p2pkh address (only supported type for now)`,
        },
    );
});

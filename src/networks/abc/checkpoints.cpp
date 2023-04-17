// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <common/system.h>
#include <util/chaintype.h>

static CCheckpointData mainNetCheckpointData = {
    .mapCheckpoints = {
        {11111, BlockHash::fromHex("0000000069e244f73d78e8fd29ba2fd2ed6"
                                   "18bd6fa2ee92559f542fdb26e7c1d")},
        {33333, BlockHash::fromHex("000000002dd5588a74784eaa7ab0507a18a"
                                   "d16a236e7b1ce69f00d7ddfb5d0a6")},
        {74000, BlockHash::fromHex("0000000000573993a3c9e41ce34471c079d"
                                   "cf5f52a0e824a81e7f953b8661a20")},
        {105000, BlockHash::fromHex("00000000000291ce28027faea320c8d2b0"
                                    "54b2e0fe44a773f3eefb151d6bdc97")},
        {134444, BlockHash::fromHex("00000000000005b12ffd4cd315cd34ffd4"
                                    "a594f430ac814c91184a0d42d2b0fe")},
        {168000, BlockHash::fromHex("000000000000099e61ea72015e79632f21"
                                    "6fe6cb33d7899acb35b75c8303b763")},
        {193000, BlockHash::fromHex("000000000000059f452a5f7340de6682a9"
                                    "77387c17010ff6e6c3bd83ca8b1317")},
        {210000, BlockHash::fromHex("000000000000048b95347e83192f69cf03"
                                    "66076336c639f9b7228e9ba171342e")},
        {216116, BlockHash::fromHex("00000000000001b4f4b433e81ee46494af"
                                    "945cf96014816a4e2370f11b23df4e")},
        {225430, BlockHash::fromHex("00000000000001c108384350f74090433e"
                                    "7fcf79a606b8e797f065b130575932")},
        {250000, BlockHash::fromHex("000000000000003887df1f29024b06fc22"
                                    "00b55f8af8f35453d7be294df2d214")},
        {279000, BlockHash::fromHex("0000000000000001ae8c72a0b0c301f67e"
                                    "3afca10e819efa9041e458e9bd7e40")},
        {295000, BlockHash::fromHex("00000000000000004d9b4ef50f0f9d686f"
                                    "d69db2e03af35a100370c64632a983")},
        // UAHF fork block.
        {478558, BlockHash::fromHex("0000000000000000011865af4122fe3b14"
                                    "4e2cbeea86142e8ff2fb4107352d43")},
        // Nov, 13 DAA activation block.
        {504031, BlockHash::fromHex("0000000000000000011ebf65b60d0a3de8"
                                    "0b8175be709d653b4c1a1beeb6ab9c")},
        // Monolith activation.
        {530359, BlockHash::fromHex("0000000000000000011ada8bd08f46074f"
                                    "44a8f155396f43e38acf9501c49103")},
        // Magnetic anomaly activation.
        {556767, BlockHash::fromHex("0000000000000000004626ff6e3b936941"
                                    "d341c5932ece4357eeccac44e6d56c")},
        // Great wall activation.
        {582680, BlockHash::fromHex("000000000000000001b4b8e36aec7d4f96"
                                    "71a47872cb9a74dc16ca398c7dcc18")},
        // Graviton activation.
        {609136, BlockHash::fromHex("000000000000000000b48bb207faac5ac6"
                                    "55c313e41ac909322eaa694f5bc5b1")},
        // Phonon activation.
        {635259, BlockHash::fromHex("00000000000000000033dfef1fc2d6a5d5"
                                    "520b078c55193a9bf498c5b27530f7")},
        // Axion activation.
        {661648, BlockHash::fromHex("000000000000000004284c9d8b2c8ff731efeaec6b"
                                    "e50729bdc9bd07f910757d")},
        {664198, BlockHash::fromHex("00000000000000000c2f90578cede892ff39592cce"
                                    "34b2fb89b6d2a122468260")},
        {680140, BlockHash::fromHex("0000000000000000232c48568b63451d4ac445210"
                                    "9aa46f8b38c65c3f62f7c0b")},
        // Tachyon activation
        {686621, BlockHash::fromHex("00000000000000003c8fe6f7570a9f6d5480dcfc9"
                                    "5f8228ae9d60b98bee5b745")},
        // Selectron activation.
        {713661, BlockHash::fromHex("00000000000000000676f84307c7ccb53a0f19083f"
                                    "eace753cb73a38eaaaef8d")},
        // Gluon activation.
        {739536, BlockHash::fromHex("000000000000000006db04cd4609560905fe5a7be6"
                                    "2f2429b159ce6b59fc7b61")},
        // Jefferson activation.
        {766195, BlockHash::fromHex("0000000000000000102bc94853715b9ade9610eb31"
                                    "b4ed7d955529b76d24e094")},
        // Wellington activation.
        {792118, BlockHash::fromHex("00000000000000000b360176b8456de45b662fce6d"
                                    "557c6238dec17362d197f3")},
        // Cowperthwaite activation.
        {818670, BlockHash::fromHex("000000000000000003e79cfe757a675909fd2bffde"
                                    "52158ce4ec826e5ac6ae79")},
        // Lee Kuan Yew activation.
        {844743, BlockHash::fromHex("0000000000000000053b80210677e6821a2ac0ed73"
                                    "b949a78667e1bfb3dfa6eb")},
        // Augusto activation.
        {871168, BlockHash::fromHex("0000000000000000232d2ec92c9a2dd3a6e887dabc"
                                    "254c85f10e804239ff7274")},
    }};

static CCheckpointData testNetCheckpointData = {
    .mapCheckpoints = {
        {546, BlockHash::fromHex("000000002a936ca763904c3c35fce2f3556c5"
                                 "59c0214345d31b1bcebf76acb70")},
        // UAHF fork block.
        {1155875,
         BlockHash::fromHex("00000000f17c850672894b9a75b63a1e72830bbd5f"
                            "4c8889b5c1a80e7faef138")},
        // Nov, 13. DAA activation block.
        {1188697,
         BlockHash::fromHex("0000000000170ed0918077bde7b4d36cc4c91be69f"
                            "a09211f748240dabe047fb")},
        // Great wall activation.
        {1303885,
         BlockHash::fromHex("00000000000000479138892ef0e4fa478ccc938fb9"
                            "4df862ef5bde7e8dee23d3")},
        // Graviton activation.
        {1341712,
         BlockHash::fromHex("00000000fffc44ea2e202bd905a9fbbb9491ef9e9d"
                            "5a9eed4039079229afa35b")},
        // Phonon activation.
        {1378461,
         BlockHash::fromHex("0000000099f5509b5f36b1926bcf82b21d936ebeade"
                            "e811030dfbbb7fae915d7")},
        // Axion activation.
        {1421481, BlockHash::fromHex("00000000062c7f32591d883c99fc89ebe74a83287"
                                     "c0f2b7ffeef72e62217d40b")},
        // Tachyon activation.
        {1450540, BlockHash::fromHex("00000000001085419e7328a2bacaf6216dd913c40"
                                     "0f0b7da4bde43a8ebf6ed4e")},
        // Selectron activation.
        {1477500, BlockHash::fromHex("000000000004057554e6f83253e3080774c37ae8a"
                                     "940ffbc38d77525274709ae")},
        // Gluon activation.
        {1503557, BlockHash::fromHex("00000000000dbd764814fb67b5ff5aab606faa1f5"
                                     "881dc86f57639a1396e11ba")},
        // Jefferson activation.
        {1530063, BlockHash::fromHex("00000000013102d35674688b5fd478c3a048660d6"
                                     "fea862401734a4b914132bf")},
        // Wellington activation.
        {1556121, BlockHash::fromHex("000000000eb806d6dbc9a200a9d533c7a11fc7d45"
                                     "ab67a3c8440cc1b5c4e741f")},
        // Cowperthwaite activation.
        {1584486, BlockHash::fromHex("000000000bdc9ee694295e611be29fcad7189f116"
                                     "04edeb8f6c0ab65b40c3370")},
        // Lee Kuan Yew activation.
        {1608805, BlockHash::fromHex("00000000000ad004602681a2458bc6304196ec483"
                                     "f336cce7d031309e4d3592d")},
        // Augusto activation.
        {1635241, BlockHash::fromHex("00000000082c7e223785dffb1f62db4ec737b8fd1"
                                     "4faaf4dfb7c5a8bbf22bd2d")},
    }};

static CCheckpointData regTestCheckpointData = {
    .mapCheckpoints = {
        {0, BlockHash::fromHex("0f9188f13cb7b2c71f2a335e3a4fc328bf5beb4"
                               "36012afca590b1a11466e2206")},
    }};

const CCheckpointData &CheckpointData(const ChainType chain) {
    switch (chain) {
        case ChainType::MAIN:
            return mainNetCheckpointData;
        case ChainType::TESTNET:
            return testNetCheckpointData;
        case ChainType::REGTEST:
            return regTestCheckpointData;
    }
    throw std::invalid_argument(
        strprintf("%s: Invalid ChainType value", __func__));
}

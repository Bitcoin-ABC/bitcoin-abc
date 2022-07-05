// satoshisToSend: 600
// totalInputUtxos: 1100
// txFee: 455
// output:
//    bitcoincash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqqkm80dnl6,6
export const mockOneToOneSendXecTxBuilderObj = {
    transaction: {
        prevTxMap: {
            '9a6bdfba2a33ce3e1615d19651cdeb8771e3228ef2706179f113ec153ffd378a:0': 0,
        },
        network: {
            hashGenesisBlock:
                '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
            port: 8333,
            portRpc: 8332,
            protocol: {
                magic: 3652501241,
            },
            seedsDns: [
                'seed.bitcoinabc.org',
                'seed-abc.bitcoinforks.org',
                'btccash-seeder.bitcoinunlimited.info',
                'seed.bitprim.org',
                'seed.deadalnix.me',
                'seeder.criptolayer.net',
            ],
            versions: {
                bip32: {
                    private: 76066276,
                    public: 76067358,
                },
                bip44: 145,
                private: 128,
                public: 0,
                scripthash: 5,
                messagePrefix: '\u0018BitcoinCash Signed Message:\n',
            },
            name: 'BitcoinCash',
            per1: 100000000,
            unit: 'BCH',
            testnet: false,
            messagePrefix: '\u0018BitcoinCash Signed Message:\n',
            bip32: {
                public: 76067358,
                private: 76066276,
            },
            pubKeyHash: 0,
            scriptHash: 5,
            wif: 128,
            dustThreshold: null,
        },
        maximumFeeRate: 2500,
        inputs: [
            {
                value: 1100,
                pubKeys: [
                    {
                        type: 'Buffer',
                        data: [
                            3, 30, 148, 131, 7, 74, 159, 14, 231, 56, 1, 49,
                            168, 112, 237, 190, 148, 3, 231, 184, 7, 164, 181,
                            97, 27, 1, 84, 10, 21, 15, 106, 164, 84,
                        ],
                    },
                ],
                signatures: [
                    {
                        type: 'Buffer',
                        data: [
                            48, 68, 2, 32, 14, 123, 142, 157, 227, 237, 219, 37,
                            223, 63, 183, 205, 107, 192, 95, 233, 228, 86, 51,
                            13, 114, 64, 239, 83, 215, 155, 206, 1, 13, 5, 169,
                            166, 2, 32, 100, 18, 61, 85, 212, 59, 28, 148, 8,
                            231, 70, 207, 116, 66, 40, 236, 58, 92, 76, 223, 74,
                            207, 145, 202, 252, 102, 218, 43, 226, 229, 199, 60,
                            65,
                        ],
                    },
                ],
                signScript: {
                    type: 'Buffer',
                    data: [
                        118, 169, 20, 152, 70, 182, 179, 143, 247, 19, 51, 74,
                        193, 159, 227, 207, 133, 26, 31, 152, 192, 123, 0, 136,
                        172,
                    ],
                },
                signType: 'pubkeyhash',
                prevOutScript: {
                    type: 'Buffer',
                    data: [
                        118, 169, 20, 152, 70, 182, 179, 143, 247, 19, 51, 74,
                        193, 159, 227, 207, 133, 26, 31, 152, 192, 123, 0, 136,
                        172,
                    ],
                },
                prevOutType: 'pubkeyhash',
                witness: false,
            },
        ],
        bitcoinCash: true,
        tx: {
            version: 2,
            locktime: 0,
            ins: [
                {
                    hash: {
                        type: 'Buffer',
                        data: [
                            154, 107, 223, 186, 42, 51, 206, 62, 22, 21, 209,
                            150, 81, 205, 235, 135, 113, 227, 34, 142, 242, 112,
                            97, 121, 241, 19, 236, 21, 63, 253, 55, 138,
                        ],
                    },
                    index: 0,
                    script: {
                        type: 'Buffer',
                        data: [],
                    },
                    sequence: 4294967295,
                    witness: [],
                },
            ],
            outs: [
                {
                    script: {
                        type: 'Buffer',
                        data: [
                            118, 169, 20, 152, 70, 182, 179, 143, 247, 19, 51,
                            74, 193, 159, 227, 207, 133, 26, 31, 152, 192, 123,
                            0, 136, 172,
                        ],
                    },
                    value: 600,
                },
            ],
        },
    },
    DEFAULT_SEQUENCE: 4294967295,
    hashTypes: {
        SIGHASH_ALL: 1,
        SIGHASH_NONE: 2,
        SIGHASH_SINGLE: 3,
        SIGHASH_ANYONECANPAY: 128,
        SIGHASH_BITCOINCASH_BIP143: 64,
        ADVANCED_TRANSACTION_MARKER: 0,
        ADVANCED_TRANSACTION_FLAG: 1,
    },
    signatureAlgorithms: {
        ECDSA: 0,
        SCHNORR: 1,
    },
    bip66: {},
    bip68: {},
    p2shInput: false,
};

// satoshisToSend: 1650
// totalInputUtxos: 20586
// txFee: 1186
// outputs:
//    bitcoincash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0ul96a2ens,5.5
//    bitcoincash:qq9h6d0a5q65fgywv4ry64x04ep906mdku7ymranw3,5.5
//    bitcoincash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqqkm80dnl6,5.5
export const mockOneToManySendXecTxBuilderObj = {
    transaction: {
        prevTxMap: {
            '5be79a985c819b4f6393ab7aba48a2f1ce9d13320a8dbb674f6ba55c7f96b7cb:0': 0,
            '19cf1a4004a4cd67a953239b0cea35c9690e878a1abb62512b34cb9e0c137500:0': 1,
            '19cf1a4004a4cd67a953239b0cea35c9690e878a1abb62512b34cb9e0c137500:1': 2,
        },
        network: {
            hashGenesisBlock:
                '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
            port: 8333,
            portRpc: 8332,
            protocol: {
                magic: 3652501241,
            },
            seedsDns: [
                'seed.bitcoinabc.org',
                'seed-abc.bitcoinforks.org',
                'btccash-seeder.bitcoinunlimited.info',
                'seed.bitprim.org',
                'seed.deadalnix.me',
                'seeder.criptolayer.net',
            ],
            versions: {
                bip32: {
                    private: 76066276,
                    public: 76067358,
                },
                bip44: 145,
                private: 128,
                public: 0,
                scripthash: 5,
                messagePrefix: '\u0018BitcoinCash Signed Message:\n',
            },
            name: 'BitcoinCash',
            per1: 100000000,
            unit: 'BCH',
            testnet: false,
            messagePrefix: '\u0018BitcoinCash Signed Message:\n',
            bip32: {
                public: 76067358,
                private: 76066276,
            },
            pubKeyHash: 0,
            scriptHash: 5,
            wif: 128,
            dustThreshold: null,
        },
        maximumFeeRate: 2500,
        inputs: [
            {
                value: 1000,
                pubKeys: [
                    {
                        type: 'Buffer',
                        data: [
                            3, 30, 148, 131, 7, 74, 159, 14, 231, 56, 1, 49,
                            168, 112, 237, 190, 148, 3, 231, 184, 7, 164, 181,
                            97, 27, 1, 84, 10, 21, 15, 106, 164, 84,
                        ],
                    },
                ],
                signatures: [
                    {
                        type: 'Buffer',
                        data: [
                            48, 69, 2, 33, 0, 224, 8, 173, 44, 219, 146, 255,
                            243, 66, 255, 60, 118, 32, 120, 36, 228, 23, 230,
                            39, 9, 231, 51, 235, 155, 70, 173, 162, 75, 48, 23,
                            180, 101, 2, 32, 94, 137, 18, 23, 35, 68, 146, 141,
                            57, 11, 155, 214, 31, 239, 219, 58, 41, 237, 26, 25,
                            201, 47, 1, 254, 64, 183, 107, 91, 229, 209, 106,
                            134, 65,
                        ],
                    },
                ],
                signScript: {
                    type: 'Buffer',
                    data: [
                        118, 169, 20, 152, 70, 182, 179, 143, 247, 19, 51, 74,
                        193, 159, 227, 207, 133, 26, 31, 152, 192, 123, 0, 136,
                        172,
                    ],
                },
                signType: 'pubkeyhash',
                prevOutScript: {
                    type: 'Buffer',
                    data: [
                        118, 169, 20, 152, 70, 182, 179, 143, 247, 19, 51, 74,
                        193, 159, 227, 207, 133, 26, 31, 152, 192, 123, 0, 136,
                        172,
                    ],
                },
                prevOutType: 'pubkeyhash',
                witness: false,
            },
            {
                value: 600,
                pubKeys: [
                    {
                        type: 'Buffer',
                        data: [
                            3, 30, 148, 131, 7, 74, 159, 14, 231, 56, 1, 49,
                            168, 112, 237, 190, 148, 3, 231, 184, 7, 164, 181,
                            97, 27, 1, 84, 10, 21, 15, 106, 164, 84,
                        ],
                    },
                ],
                signatures: [
                    {
                        type: 'Buffer',
                        data: [
                            48, 69, 2, 33, 0, 195, 158, 165, 43, 132, 105, 113,
                            114, 23, 168, 71, 99, 197, 87, 40, 47, 40, 110, 147,
                            215, 147, 216, 116, 59, 210, 157, 182, 155, 2, 255,
                            68, 211, 2, 32, 66, 120, 191, 80, 126, 119, 43, 247,
                            94, 7, 31, 103, 171, 189, 152, 154, 215, 202, 239,
                            163, 61, 176, 130, 109, 228, 54, 12, 76, 0, 212, 31,
                            191, 65,
                        ],
                    },
                ],
                signScript: {
                    type: 'Buffer',
                    data: [
                        118, 169, 20, 152, 70, 182, 179, 143, 247, 19, 51, 74,
                        193, 159, 227, 207, 133, 26, 31, 152, 192, 123, 0, 136,
                        172,
                    ],
                },
                signType: 'pubkeyhash',
                prevOutScript: {
                    type: 'Buffer',
                    data: [
                        118, 169, 20, 152, 70, 182, 179, 143, 247, 19, 51, 74,
                        193, 159, 227, 207, 133, 26, 31, 152, 192, 123, 0, 136,
                        172,
                    ],
                },
                prevOutType: 'pubkeyhash',
                witness: false,
            },
            {
                value: 18986,
                pubKeys: [
                    {
                        type: 'Buffer',
                        data: [
                            3, 30, 148, 131, 7, 74, 159, 14, 231, 56, 1, 49,
                            168, 112, 237, 190, 148, 3, 231, 184, 7, 164, 181,
                            97, 27, 1, 84, 10, 21, 15, 106, 164, 84,
                        ],
                    },
                ],
                signatures: [
                    {
                        type: 'Buffer',
                        data: [
                            48, 69, 2, 33, 0, 135, 77, 245, 24, 246, 28, 182,
                            147, 160, 170, 164, 162, 110, 145, 86, 219, 183,
                            218, 112, 251, 254, 145, 158, 49, 214, 144, 157,
                            185, 166, 253, 116, 42, 2, 32, 80, 178, 234, 92, 86,
                            155, 55, 122, 238, 144, 189, 174, 28, 69, 217, 241,
                            169, 124, 217, 253, 159, 149, 183, 191, 193, 47, 50,
                            151, 254, 150, 167, 180, 65,
                        ],
                    },
                ],
                signScript: {
                    type: 'Buffer',
                    data: [
                        118, 169, 20, 152, 70, 182, 179, 143, 247, 19, 51, 74,
                        193, 159, 227, 207, 133, 26, 31, 152, 192, 123, 0, 136,
                        172,
                    ],
                },
                signType: 'pubkeyhash',
                prevOutScript: {
                    type: 'Buffer',
                    data: [
                        118, 169, 20, 152, 70, 182, 179, 143, 247, 19, 51, 74,
                        193, 159, 227, 207, 133, 26, 31, 152, 192, 123, 0, 136,
                        172,
                    ],
                },
                prevOutType: 'pubkeyhash',
                witness: false,
            },
        ],
        bitcoinCash: true,
        tx: {
            version: 2,
            locktime: 0,
            ins: [
                {
                    hash: {
                        type: 'Buffer',
                        data: [
                            91, 231, 154, 152, 92, 129, 155, 79, 99, 147, 171,
                            122, 186, 72, 162, 241, 206, 157, 19, 50, 10, 141,
                            187, 103, 79, 107, 165, 92, 127, 150, 183, 203,
                        ],
                    },
                    index: 0,
                    script: {
                        type: 'Buffer',
                        data: [],
                    },
                    sequence: 4294967295,
                    witness: [],
                },
                {
                    hash: {
                        type: 'Buffer',
                        data: [
                            25, 207, 26, 64, 4, 164, 205, 103, 169, 83, 35, 155,
                            12, 234, 53, 201, 105, 14, 135, 138, 26, 187, 98,
                            81, 43, 52, 203, 158, 12, 19, 117, 0,
                        ],
                    },
                    index: 0,
                    script: {
                        type: 'Buffer',
                        data: [],
                    },
                    sequence: 4294967295,
                    witness: [],
                },
                {
                    hash: {
                        type: 'Buffer',
                        data: [
                            25, 207, 26, 64, 4, 164, 205, 103, 169, 83, 35, 155,
                            12, 234, 53, 201, 105, 14, 135, 138, 26, 187, 98,
                            81, 43, 52, 203, 158, 12, 19, 117, 0,
                        ],
                    },
                    index: 1,
                    script: {
                        type: 'Buffer',
                        data: [],
                    },
                    sequence: 4294967295,
                    witness: [],
                },
            ],
            outs: [
                {
                    script: {
                        type: 'Buffer',
                        data: [
                            118, 169, 20, 246, 39, 229, 16, 1, 165, 26, 26, 146,
                            216, 146, 120, 8, 112, 19, 115, 207, 41, 38, 127,
                            136, 172,
                        ],
                    },
                    value: 550,
                },
                {
                    script: {
                        type: 'Buffer',
                        data: [
                            118, 169, 20, 11, 125, 53, 253, 160, 53, 68, 160,
                            142, 101, 70, 77, 84, 207, 174, 66, 87, 235, 109,
                            183, 136, 172,
                        ],
                    },
                    value: 550,
                },
                {
                    script: {
                        type: 'Buffer',
                        data: [
                            118, 169, 20, 152, 70, 182, 179, 143, 247, 19, 51,
                            74, 193, 159, 227, 207, 133, 26, 31, 152, 192, 123,
                            0, 136, 172,
                        ],
                    },
                    value: 550,
                },
                {
                    script: {
                        type: 'Buffer',
                        data: [
                            118, 169, 20, 152, 70, 182, 179, 143, 247, 19, 51,
                            74, 193, 159, 227, 207, 133, 26, 31, 152, 192, 123,
                            0, 136, 172,
                        ],
                    },
                    value: 17750,
                },
            ],
        },
    },
    DEFAULT_SEQUENCE: 4294967295,
    hashTypes: {
        SIGHASH_ALL: 1,
        SIGHASH_NONE: 2,
        SIGHASH_SINGLE: 3,
        SIGHASH_ANYONECANPAY: 128,
        SIGHASH_BITCOINCASH_BIP143: 64,
        ADVANCED_TRANSACTION_MARKER: 0,
        ADVANCED_TRANSACTION_FLAG: 1,
    },
    signatureAlgorithms: {
        ECDSA: 0,
        SCHNORR: 1,
    },
    bip66: {},
    bip68: {},
    p2shInput: false,
};

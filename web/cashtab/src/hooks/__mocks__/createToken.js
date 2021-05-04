// @generated
export default {
    invalidWallet: {},
    wallet: {
        Path1899: {
            cashAddress:
                'bitcoincash:qpuvjl7l3crt3apc62gmtf49pfsluu7s9gsex3qnhn',
            slpAddress:
                'simpleledger:qpuvjl7l3crt3apc62gmtf49pfsluu7s9guzd24nfd',
            fundingWif: 'L2gH81AegmBdnvEZuUpnd3robG8NjBaVjPddWrVD4169wS6Mqyxn',
            fundingAddress:
                'simpleledger:qpuvjl7l3crt3apc62gmtf49pfsluu7s9guzd24nfd',
            legacyAddress: '1C1fUT99KT4SjbKjCE2fSCdhc6Bvj5gQjG',
        },
        tokens: [],
        state: {
            balances: [],
            utxos: [],
            hydratedUtxoDetails: [],
            tokens: [],
            slpBalancesAndUtxos: {
                nonSlpUtxos: [
                    {
                        height: 0,
                        tx_hash:
                            'e0d6d7d46d5fc6aaa4512a7aca9223c6d7ca30b8253dee1b40b8978fe7dc501e',
                        tx_pos: 0,
                        value: 1000000,
                        txid:
                            'e0d6d7d46d5fc6aaa4512a7aca9223c6d7ca30b8253dee1b40b8978fe7dc501e',
                        vout: 0,
                        isValid: false,
                        address:
                            'bitcoincash:qpuvjl7l3crt3apc62gmtf49pfsluu7s9gsex3qnhn',
                        wif:
                            'L2gH81AegmBdnvEZuUpnd3robG8NjBaVjPddWrVD4169wS6Mqyxn',
                    },
                ],
            },
        },
    },
    configObj: {
        name: 'Cashtab Unit Test Token',
        ticker: 'CUTT',
        documentUrl: 'https://cashtabapp.com/',
        decimals: '2',
        initialQty: '100',
        documentHash: '',
        mintBatonVout: null,
    },
    expectedTxId:
        '9e9738e9ac3ff202736bf7775f875ebae6f812650df577a947c20c52475e43da',
    expectedHex: [
        '02000000011e50dce78f97b8401bee3d25b830cad7c62392ca7a2a51a4aac65f6dd4d7d6e0000000006a4730440220150c19f4274b30415174c7517ff5e3e79c224ac6aff6967537a8e1ab71880bbb0220537a8c7a91672fe3dc2f703dcb319c94a1717e220b52111f406f0d80adeb4c15412102322fe90c5255fe37ab321c386f9446a86e80c3940701d430f22325094fdcec60ffffffff030000000000000000546a04534c500001010747454e455349530443555454174361736874616220556e6974205465737420546f6b656e1768747470733a2f2f636173687461626170702e636f6d2f4c0001024c0008000000000000271022020000000000001976a91478c97fdf8e06b8f438d291b5a6a50a61fe73d02a88ac283d0f00000000001976a91478c97fdf8e06b8f438d291b5a6a50a61fe73d02a88ac00000000',
    ],
};

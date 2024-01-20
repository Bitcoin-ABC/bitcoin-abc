import { toXec } from 'wallet';
import appConfig from 'config/app';

export default {
    utxos: [
        {
            height: 0,
            tx_hash:
                '6e83b4bf54b5a85b6c40c4e2076a6e3945b86e4d219a931d0eb93ba1a1e3bd6f',
            tx_pos: 1,
            value: 131689,
            address: 'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05',
            satoshis: 131689,
            txid: '6e83b4bf54b5a85b6c40c4e2076a6e3945b86e4d219a931d0eb93ba1a1e3bd6f',
            outpoint: {
                outIdx: 1,
                txid: '6e83b4bf54b5a85b6c40c4e2076a6e3945b86e4d219a931d0eb93ba1a1e3bd6f',
            },
            isValid: false,
            wif: 'L3ufcMjHZ2u8v2NeyHB2pCSE5ezCk8dvR7kcLLX2B3xK5VgK9wz4',
        },
    ],
    wallet: {
        Path245: {
            cashAddress:
                'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05',
            fundingWif: 'L2gH81AegmBdnvEZuUpnd3robG8NjBaVjPddWrVD4169wS6Mqyxn',
        },
        Path145: {
            cashAddress:
                'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05',
            fundingWif: 'L2gH81AegmBdnvEZuUpnd3robG8NjBaVjPddWrVD4169wS6Mqyxn',
        },
        Path1899: {
            cashAddress:
                'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05',
            fundingWif: 'L2gH81AegmBdnvEZuUpnd3robG8NjBaVjPddWrVD4169wS6Mqyxn',
        },
    },
    destinationAddress:
        'bitcoincash:qr2npxqwznhp7gphatcqzexeclx0hhwdxg386ez36n',
    sendAmount: toXec(appConfig.dustSats).toString(),
    expectedTxId:
        '7a39961bbd7e27d804fb3169ef38a83234710fbc53897a4eb0c98454854a26d1',
    expectedHex: [
        '02000000016fbde3a1a13bb90e1d939a214d6eb845396e6a07e2c4406c5ba8b554bfb4836e010000006b483045022100a2680866c3fb8993455c97b41db95b358df8117bafd5ff506bc66607c9c074ba0220531d8fe4cad88da664f93c9f33f3ed4659200530f2c543f2b3c0d048035fe939412102322fe90c5255fe37ab321c386f9446a86e80c3940701d430f22325094fdcec60ffffffff0226020000000000001976a914d530980e14ee1f2037eaf00164d9c7ccfbddcd3288ac7cfe0100000000001976a914c5c649ec64e02a16a5bd7a6c8f1fa5aaa7e488eb88ac00000000',
    ],
};

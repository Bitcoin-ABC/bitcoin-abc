import { fromSmallestDenomination } from '@utils/cashMethods';
import { currency } from '@components/Common/Ticker';

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
            txid:
                '6e83b4bf54b5a85b6c40c4e2076a6e3945b86e4d219a931d0eb93ba1a1e3bd6f',
            vout: 1,
            isValid: false,
            wif: 'L3ufcMjHZ2u8v2NeyHB2pCSE5ezCk8dvR7kcLLX2B3xK5VgK9wz4',
        },
    ],
    wallet: {
        Path145: {
            cashAddress:
                'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05',
        },
        Path1899: {
            cashAddress:
                'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05',
        },
    },
    destinationAddress:
        'bitcoincash:qr2npxqwznhp7gphatcqzexeclx0hhwdxg386ez36n',
    sendAmount: fromSmallestDenomination(currency.dustSats).toString(),
    expectedTxId:
        '7a39961bbd7e27d804fb3169ef38a83234710fbc53897a4eb0c98454854a26d1',
    expectedHex: [
        '02000000016fbde3a1a13bb90e1d939a214d6eb845396e6a07e2c4406c5ba8b554bfb4836e010000006b483045022100d52237ac2c000c0be195bb27d5488b378559cf4a7958c9a1b1ce7a6850773a2b02202e3c148450c6efdb11f199a9398332b313b54686ff98cf74b254f9ae144b0c7d4121032d9ea429b4782e9a2c18a383362c23a44efa2f6d6641d63f53788b4bf45c1decffffffff0222020000000000001976a914d530980e14ee1f2037eaf00164d9c7ccfbddcd3288ac62ff0100000000001976a914c5c649ec64e02a16a5bd7a6c8f1fa5aaa7e488eb88ac00000000',
    ],
};

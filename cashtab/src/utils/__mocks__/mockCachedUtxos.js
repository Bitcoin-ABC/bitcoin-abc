// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { BN } from 'slp-mdm';

export const utxosLoadedFromCache = {
    balances: {
        totalBalance: '0',
        totalBalanceInSatoshis: '0',
    },
    nonSlpUtxos: [],
    tokens: [
        {
            info: {
                height: 681188,
                tx_hash:
                    '5b74e05ced6b7d862fe9cab94071b2ccfa475c0cef94b90c7edb8a06f90e5ad6',
                tx_pos: 1,
                value: 546,
                txid: '5b74e05ced6b7d862fe9cab94071b2ccfa475c0cef94b90c7edb8a06f90e5ad6',
                vout: 1,
                utxoType: 'token',
                transactionType: 'send',
                tokenId:
                    '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                tokenTicker: 'WDT',
                tokenName:
                    'Test Token With Exceptionally Long Name For CSS And Style Revisions',
                tokenDocumentUrl:
                    'https://www.ImpossiblyLongWebsiteDidYouThinkWebDevWouldBeFun.org',
                tokenDocumentHash:
                    '����\\�IS\u001e9�����k+���\u0018���\u001b]�߷2��',
                decimals: 7,
                tokenType: 1,
                tokenQty: '1e-7',
                isValid: true,
                address:
                    'bitcoincash:qqartrrq3npyzpcqswq2hcslstzu38mq8gvgtuqfpf',
            },
            tokenId:
                '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
            balance: new BN({
                s: 1,
                e: 1,
                c: [66, 10000000],
                _isBigNumber: true,
            }),
            hasBaton: false,
        },
        {
            info: {
                height: 681190,
                tx_hash:
                    '52fe0ccf7b5936095bbdadebc0de9f844a99457096ca4f7b45543a2badefdf35',
                tx_pos: 1,
                value: 546,
                txid: '52fe0ccf7b5936095bbdadebc0de9f844a99457096ca4f7b45543a2badefdf35',
                vout: 1,
                utxoType: 'token',
                transactionType: 'send',
                tokenId:
                    '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                tokenTicker: 'NOCOVID',
                tokenName: 'Covid19 Lifetime Immunity',
                tokenDocumentUrl:
                    'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/covid-19-vaccines',
                tokenDocumentHash: '',
                decimals: 0,
                tokenType: 1,
                tokenQty: '4',
                isValid: true,
                address:
                    'bitcoincash:qqartrrq3npyzpcqswq2hcslstzu38mq8gvgtuqfpf',
            },
            tokenId:
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            balance: new BN({
                s: 1,
                e: 1,
                c: [15],
                _isBigNumber: true,
            }),
            hasBaton: false,
        },
        {
            info: {
                height: 681190,
                tx_hash:
                    'e9dca9aa954131a0004325fff11dfddcd6e5843c468116cf4d38cb264032cdc0',
                tx_pos: 1,
                value: 546,
                txid: 'e9dca9aa954131a0004325fff11dfddcd6e5843c468116cf4d38cb264032cdc0',
                vout: 1,
                utxoType: 'token',
                transactionType: 'send',
                tokenId:
                    '1f6a65e7a4bde92c0a012de2bcf4007034504a765377cdf08a3ee01d1eaa6901',
                tokenTicker: '🍔',
                tokenName: 'Burger',
                tokenDocumentUrl:
                    'https://c4.wallpaperflare.com/wallpaper/58/564/863/giant-hamburger-wallpaper-preview.jpg',
                tokenDocumentHash: '',
                decimals: 0,
                tokenType: 1,
                tokenQty: '1',
                isValid: true,
                address:
                    'bitcoincash:qqartrrq3npyzpcqswq2hcslstzu38mq8gvgtuqfpf',
            },
            tokenId:
                '1f6a65e7a4bde92c0a012de2bcf4007034504a765377cdf08a3ee01d1eaa6901',
            balance: new BN({
                s: 1,
                e: 0,
                c: [1],
                _isBigNumber: true,
            }),
            hasBaton: false,
        },
        {
            info: {
                height: 681191,
                tx_hash:
                    'b35c502f388cdfbdd6841b7a73e973149b3c8deca76295a3e4665939e0562796',
                tx_pos: 1,
                value: 546,
                txid: 'b35c502f388cdfbdd6841b7a73e973149b3c8deca76295a3e4665939e0562796',
                vout: 1,
                utxoType: 'token',
                transactionType: 'send',
                tokenId:
                    'dd84ca78db4d617221b58eabc6667af8fe2f7eadbfcc213d35be9f1b419beb8d',
                tokenTicker: 'TAP',
                tokenName: 'Thoughts and Prayers',
                tokenDocumentUrl: '',
                tokenDocumentHash: '',
                decimals: 0,
                tokenType: 1,
                tokenQty: '1',
                isValid: true,
                address:
                    'bitcoincash:qqartrrq3npyzpcqswq2hcslstzu38mq8gvgtuqfpf',
            },
            tokenId:
                'dd84ca78db4d617221b58eabc6667af8fe2f7eadbfcc213d35be9f1b419beb8d',
            balance: new BN({
                s: 1,
                e: 0,
                c: [1],
                _isBigNumber: true,
            }),
            hasBaton: false,
        },
        {
            info: {
                height: 681191,
                tx_hash:
                    'c70408fca1a5bf48f338f7ef031e586293be6948a5bff1fbbdd4eb923ef11e59',
                tx_pos: 1,
                value: 546,
                txid: 'c70408fca1a5bf48f338f7ef031e586293be6948a5bff1fbbdd4eb923ef11e59',
                vout: 1,
                utxoType: 'token',
                transactionType: 'send',
                tokenId:
                    'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb',
                tokenTicker: 'NAKAMOTO',
                tokenName: 'NAKAMOTO',
                tokenDocumentUrl: '',
                tokenDocumentHash: '',
                decimals: 8,
                tokenType: 1,
                tokenQty: '1e-8',
                isValid: true,
                address:
                    'bitcoincash:qqartrrq3npyzpcqswq2hcslstzu38mq8gvgtuqfpf',
            },
            tokenId:
                'df808a41672a0a0ae6475b44f272a107bc9961b90f29dc918d71301f24fe92fb',
            balance: new BN({
                s: 1,
                e: -8,
                c: [1000000],
                _isBigNumber: true,
            }),
            hasBaton: false,
        },
        {
            info: {
                height: 681191,
                tx_hash:
                    'e1097932e5a607c100dc73fa18169be2e501e1782c7c94500742974d6353476c',
                tx_pos: 1,
                value: 546,
                txid: 'e1097932e5a607c100dc73fa18169be2e501e1782c7c94500742974d6353476c',
                vout: 1,
                utxoType: 'token',
                transactionType: 'send',
                tokenId:
                    '7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1',
                tokenTicker: 'HONK',
                tokenName: 'HONK HONK',
                tokenDocumentUrl: 'THE REAL HONK SLP TOKEN',
                tokenDocumentHash: '',
                decimals: 0,
                tokenType: 1,
                tokenQty: '1',
                isValid: true,
                address:
                    'bitcoincash:qqartrrq3npyzpcqswq2hcslstzu38mq8gvgtuqfpf',
            },
            tokenId:
                '7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1',
            balance: new BN({
                s: 1,
                e: 0,
                c: [1],
                _isBigNumber: true,
            }),
            hasBaton: false,
        },
        {
            info: {
                height: 681191,
                tx_hash:
                    'f6ef57f697219aaa576bf43d69a7f8b8753dcbcbb502f602259a7d14fafd52c5',
                tx_pos: 1,
                value: 546,
                txid: 'f6ef57f697219aaa576bf43d69a7f8b8753dcbcbb502f602259a7d14fafd52c5',
                vout: 1,
                utxoType: 'token',
                transactionType: 'send',
                tokenId:
                    '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a',
                tokenTicker: 'XBIT',
                tokenName: 'eBits',
                tokenDocumentUrl: 'https://boomertakes.com/',
                tokenDocumentHash: '',
                decimals: 9,
                tokenType: 1,
                tokenQty: '1e-9',
                isValid: true,
                address:
                    'bitcoincash:qqartrrq3npyzpcqswq2hcslstzu38mq8gvgtuqfpf',
            },
            tokenId:
                '1101bd5d7b6bbc3176fb2b93d08e76ab532b04ff731d71502249e3cb9b6fcb1a',
            balance: new BN({
                s: 1,
                e: -8,
                c: [1600000],
                _isBigNumber: true,
            }),
            hasBaton: false,
        },
        {
            info: {
                height: 681329,
                tx_hash:
                    '16ccf6a34209b25fe78f6a3cdf685eb89f498a7edf144b9e049958c8eda2b439',
                tx_pos: 1,
                value: 546,
                txid: '16ccf6a34209b25fe78f6a3cdf685eb89f498a7edf144b9e049958c8eda2b439',
                vout: 1,
                utxoType: 'token',
                transactionType: 'send',
                tokenId:
                    'd849fbb04ce77870deaf0e2d9a67146b055f6d8bba18285f5c5f662e20d23199',
                tokenTicker: 'BBT',
                tokenName: 'BurnBits',
                tokenDocumentUrl: 'https://cashtabapp.com/',
                tokenDocumentHash: '',
                decimals: 9,
                tokenType: 1,
                tokenQty: '1e-9',
                isValid: true,
                address:
                    'bitcoincash:qqartrrq3npyzpcqswq2hcslstzu38mq8gvgtuqfpf',
            },
            tokenId:
                'd849fbb04ce77870deaf0e2d9a67146b055f6d8bba18285f5c5f662e20d23199',
            balance: new BN({
                s: 1,
                e: -9,
                c: [100000],
                _isBigNumber: true,
            }),
            hasBaton: false,
        },
    ],
};

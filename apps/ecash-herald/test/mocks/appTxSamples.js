// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
// @generated
'use strict';
module.exports = {
    // https://github.com/vinarmani/swap-protocol/blob/master/swap-protocol-spec.md
    swaps: [
        // 0101 https://explorer.e.cash/tx/b03883ca0b106ea5e7113d6cbe46b9ec37ac6ba437214283de2d9cf2fbdc997f
        {
            hex: '045357500001010101204de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf0453454c4c02025801002090dfb75fef5f07e384df4703b853a2741b8e6f3ef31ef8e5187a17fb107547f801010100',
            msg: 'Signal|SLP Atomic Swap|<a href="https://explorer.e.cash/tx/4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf">SPICE</a>|SELL for 6 XEC|Min trade: 0 XEC',
            stackArray: [
                '53575000',
                '01',
                '01',
                '4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf',
                '53454c4c',
                '0258',
                '00',
                '90dfb75fef5f07e384df4703b853a2741b8e6f3ef31ef8e5187a17fb107547f8',
                '01',
                '00',
            ],
            tokenId:
                '4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf',
            tokenInfo: { tokenTicker: 'SPICE' },
        },
        // 0101 ascii example https://explorer.e.cash/tx/2308e1c36d8355edd86dd7d643da41994ab780c852fdfa8d032b1a337bf18bb6
        // Sell price is hex, min price is ascii
        {
            hex: '04535750000101010120fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa0453454c4c01320100202b08df65b0b265be60fbc3346c70729d1378ddfca66da8e6645b74e26d75e61501010831303030303030300100',
            msg: `Signal|SLP Atomic Swap|<a href="https://explorer.e.cash/tx/fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa">GRP</a>|SELL for 0.5 XEC|Min trade: 100,000 XEC`,
            stackArray: [
                '53575000',
                '01',
                '01',
                'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                '53454c4c',
                '32',
                '00',
                '2b08df65b0b265be60fbc3346c70729d1378ddfca66da8e6645b74e26d75e615',
                '01',
                '3130303030303030', // ASCII for 10000000 or hex for 3,544,385,890,265,608,000, greater than total XEC supply
                '00', // Unknown extra info, seems like mb they mean for this to be 0 hex as the min sell amount
            ],
            tokenId:
                'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
            tokenInfo: { tokenTicker: 'GRP' },
        },
        // 0101 ascii 2, https://explorer.e.cash/tx/dfad6b85a8f0e4b338f4f3bc67d2b7f73fb27f82b6d71ad3e2be955643fe6e42
        // Both are ascii
        {
            hex: '04535750000101010120b46c6e0a485f0fade147696e54d3b523071860fd745fbfa97a515846bd3019a60453454c4c0434343030010020c2e13f79c49f8825832f57df10985ecdd6e28253cf589ffe28e4e95ece174629010204343430300100',
            msg: 'Signal|SLP Atomic Swap|<a href="https://explorer.e.cash/tx/b46c6e0a485f0fade147696e54d3b523071860fd745fbfa97a515846bd3019a6">BTCinu</a>|SELL for 44 XEC|Min trade: 44 XEC',
            stackArray: [
                '53575000',
                '01',
                '01',
                'b46c6e0a485f0fade147696e54d3b523071860fd745fbfa97a515846bd3019a6',
                '53454c4c',
                '34343030', // ASCII 4400
                '00',
                'c2e13f79c49f8825832f57df10985ecdd6e28253cf589ffe28e4e95ece174629',
                '02',
                '34343030', // ASCII 4400
                '00', // Unknown extra info, seems like mb they mean for this to be 0 hex as the min sell amount
            ],
            tokenId:
                'b46c6e0a485f0fade147696e54d3b523071860fd745fbfa97a515846bd3019a6',
            tokenInfo: { tokenTicker: 'BTCinu' },
        },
        // 0101 ascii 3, https://explorer.e.cash/tx/e52daad4006ab27b9e103c7ca0e58bd483f8c6c377ba5075cf7f412fbb272971
        // Recent gorbeious tx
        {
            hex: '04535750000101010120aebcae9afe88d61d8b8ed7b8c83c7c2a555583bf8f8591c94a2c9eb82f34816c0453454c4c093130303030303030300100206338e4674afaa2ef153187ae774ca5e26f0f3447e4dd398c9945b467056a28cf010201000566616c7365',
            msg: 'Signal|SLP Atomic Swap|<a href="https://explorer.e.cash/tx/aebcae9afe88d61d8b8ed7b8c83c7c2a555583bf8f8591c94a2c9eb82f34816c">GORB</a>|SELL for 1,000,000 XEC|Min trade: 0 XEC',
            stackArray: [
                '53575000',
                '01',
                '01',
                'aebcae9afe88d61d8b8ed7b8c83c7c2a555583bf8f8591c94a2c9eb82f34816c',
                '53454c4c',
                '313030303030303030', // ASCII 100,000,000
                '00',
                '6338e4674afaa2ef153187ae774ca5e26f0f3447e4dd398c9945b467056a28cf',
                '02',
                '00', // hex 00
                '66616c7365', // ASCII for 'false' ... does not match spec, mb used for something. Weird to do this in ASCII
            ],
            tokenId:
                'aebcae9afe88d61d8b8ed7b8c83c7c2a555583bf8f8591c94a2c9eb82f34816c',
            tokenInfo: { tokenTicker: 'GORB' },
        },
        // 0102 https://explorer.e.cash/tx/70c2842e1b2c7eb49ee69cdecf2d6f3cd783c307c4cbeef80f176159c5891484
        // Note, this example uses faulty pushdata at the end
        {
            hex: '045357500001010102202ee326cabee15bab127baad3aadbe39f18877933ea064203de5d08bba9654e69056a65746f6e0e657363726f772d706172656a617301002102f5515a2e17826c72011f608d2e8458580ea8cbaba3128abe7f4ae2df4d51572920b6919ed649c4710799cb01e2e66bf0fdb2eccee219fd8c4775d3a85431a9984f0101222102188904278ebf33059093f596a2697cf3668b3bec9a3a0c6408a455147ab3db934c000100',
            msg: 'Signal|Multi-Party Escrow',
            stackArray: [
                '53575000',
                '01',
                '02',
                '2ee326cabee15bab127baad3aadbe39f18877933ea064203de5d08bba9654e69',
                '6a65746f6e',
                '657363726f772d706172656a6173',
                '00',
                '02f5515a2e17826c72011f608d2e8458580ea8cbaba3128abe7f4ae2df4d515729',
                'b6919ed649c4710799cb01e2e66bf0fdb2eccee219fd8c4775d3a85431a9984f',
                '01',
                '2102188904278ebf33059093f596a2697cf3668b3bec9a3a0c6408a455147ab3db93',
                '00',
            ],
            tokenId: false,
            tokenInfo: false,
        },
        // 0103 https://explorer.e.cash/tx/565c84990aacfbd006d4ed2ee14bfb0f3bb27a84a6c9adcabccb6fb8e17e64c5
        {
            hex: '0453575000010101032668747470733a2f2f7377617063726f776466756e642e636f6d2f736f6d6563616d706169676e4502a0860100000000001976a914da74026d67264c0acfede38e8302704ef7d8cfb288acf0490200000000001976a914ac656e2dd5378ca9c45fd5cd44aa7da87c7bfa8288ac',
            msg: 'Signal|Threshold Crowdfunding',
            stackArray: [
                '53575000',
                '01',
                '03',
                '68747470733a2f2f7377617063726f776466756e642e636f6d2f736f6d6563616d706169676e',
                '02a0860100000000001976a914da74026d67264c0acfede38e8302704ef7d8cfb288acf0490200000000001976a914ac656e2dd5378ca9c45fd5cd44aa7da87c7bfa8288ac',
            ],
            tokenId: false,
            tokenInfo: false,
        },
        // 0201 N/A in spec, pending spotting in the wild
        // 0202 N/A in spec, pending spotting in the wild
        // 0203 N/A in spec, pending spotting in the wild
        // Malformed swap
        {
            hex: '045357500001010105204de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf0453454c4c02025801002090dfb75fef5f07e384df4703b853a2741b8e6f3ef31ef8e5187a17fb107547f801010100',
            msg: 'Signal|Malformed SWaP tx',
            stackArray: [
                '53575000',
                '01',
                '05', // instead of 01
                '4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf',
                '53454c4c',
                '0258',
                '00',
                '90dfb75fef5f07e384df4703b853a2741b8e6f3ef31ef8e5187a17fb107547f8',
                '01',
                '00',
            ],
            tokenId: false,
            tokenInfo: { tokenTicker: 'SPICE' },
        },
    ],
    airdrops: [
        // With a cashtab msg, non-empp
        {
            txid: 'f86c75efd60be3e46c032dfd45125f90d1730852141a7e742266473d12cad116',
            hex: '0464726f70207c06091e745037b46c5ea60def8ad526274c2caabb1fae6c4ac89fad02fedf9a04007461624643736f6e676f72206261627920686173206265656e20626f726e2e2054616b652074686973206c6974746c6520676966742066726f6d20612070726f75642066617468657221',
            stackArray: [
                '64726f70',
                '7c06091e745037b46c5ea60def8ad526274c2caabb1fae6c4ac89fad02fedf9a',
                '00746162',
                '43736f6e676f72206261627920686173206265656e20626f726e2e2054616b652074686973206c6974746c6520676966742066726f6d20612070726f75642066617468657221',
            ],
            airdropSendingAddress:
                'ecash:qqft3ujdpn45h0phqkwdw0nnxfu8y7zm7qdwlh5yd0',
            airdropRecipientsKeyValueArray: [
                [
                    '6a0464726f70207c06091e745037b46c5ea60def8ad526274c2caabb1fae6c4ac89fad02fedf9a04007461624643736f6e676f72206261627920686173206265656e20626f726e2e2054616b652074686973206c6974746c6520676966742066726f6d20612070726f75642066617468657221',
                    0,
                ],
                ['76a9142ec5281864fc989dab543b054631c9703809689e88ac', 892857],
                ['76a914efa3a87fc4022378a5f7e8e0a5c112094f3fb9be88ac', 892857],
                ['76a9142a6572780193dbcb3422773c2e353048805c2cb888ac', 892857],
                ['76a914ce9650c2d64f487739798d2815ab9e0a38fe8f9b88ac', 89286],
                ['76a91473ef17c5b9f551eae3f3b4fadf61f93cae5e6aea88ac', 89286],
                ['76a9143efd4899993b5c6e554238187577b81ed1f6bb4188ac', 89286],
                ['76a914198d8c7a32b750cbdbe1f97103d404f5e6a9465788ac', 892857],
                ['76a91457499920b99c483d745f9925adf9eecbe46c583d88ac', 535714],
                ['76a9140d17fb5b181b676fc5ed2825c0b2b25cc578f3ea88ac', 89286],
                ['76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac', 446429],
                ['76a91469003998c2c32ac81951b88416a9a15df3a1992988ac', 89286],
            ],
            tokenId:
                '7c06091e745037b46c5ea60def8ad526274c2caabb1fae6c4ac89fad02fedf9a',
            tokenInfo: {
                tokenTicker: 'ePLK',
                tokenName: 'ePalinka',
                tokenDocumentUrl: 'http://www.hungarikum.hu/en',
                tokenDocumentHash: '',
                decimals: 3,
            },
            coingeckoPrices: [
                { fiat: 'usd', price: 0.00003333, ticker: 'XEC' },
                { fiat: 'usd', price: 25000, ticker: 'BTC' },
                { fiat: 'usd', price: 1900, ticker: 'ETH' },
            ],
            msg: 'qqf...yd0 airdropped $2 to 12 holders of <a href="https://explorer.e.cash/tx/7c06091e745037b46c5ea60def8ad526274c2caabb1fae6c4ac89fad02fedf9a">ePLK</a>|Csongor baby has been born. Take this little gift from a proud father!',
            msgApiFailure:
                'qqf...yd0 airdropped 50,000 XEC to 12 holders of <a href="https://explorer.e.cash/tx/7c06091e745037b46c5ea60def8ad526274c2caabb1fae6c4ac89fad02fedf9a">7c0...f9a</a>|Csongor baby has been born. Take this little gift from a proud father!',
        },
        // no cashtab msg, non-empp
        {
            txid: '4403b0cc00ca159b64f219a7cc7cccd2e4440ddecbbcb6a0b82e78e350f8f72e',
            hex: '0464726f70201c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e0400746162',
            stackArray: [
                '64726f70',
                '1c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e',
                '00746162', // prefix for msg is there but no msg
            ],
            airdropSendingAddress:
                'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48',
            airdropRecipientsKeyValueArray: [
                [
                    '6a0464726f70201c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e0400746162',
                    0,
                ],
                ['76a9147ab07df481649eb27c7ad9afda52b2a93d2f722a88ac', 2000],
                ['76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac', 1000],
                ['76a914b82361c5851f4ec48b995175a2e1c3646338e07688ac', 2000],
            ],
            tokenId:
                '1c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e',
            tokenInfo: {
                tokenTicker: 'DET',
                tokenName: 'Dividend eToken',
                tokenDocumentUrl: 'https://cashtab.com/',
                tokenDocumentHash: '',
                decimals: 8,
            },
            coingeckoPrices: [
                { fiat: 'usd', price: 0.00003333, ticker: 'XEC' },
                { fiat: 'usd', price: 25000, ticker: 'BTC' },
                { fiat: 'usd', price: 1900, ticker: 'ETH' },
            ],
            msg: 'qrm...r48 airdropped $0 to 4 holders of <a href="https://explorer.e.cash/tx/1c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e">DET</a>',
            msgApiFailure:
                'qrm...r48 airdropped 50 XEC to 4 holders of <a href="https://explorer.e.cash/tx/1c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e">1c6...f5e</a>',
        },
    ],
};

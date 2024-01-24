// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
// Disable as these are "used" to match the expected tg format
/* eslint no-useless-escape: 0 */
const opReturn = require('../../constants/op_return');
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
        // 0201 | Payment - SLP Atomic Swap
        {
            hex: '045357500001020101206350c611819b7e84a2afd9611d33a98de5b3426c33561f516d49147dc1c4106b',
            msg: 'Payment|SLP Atomic Swap',
            stackArray: [
                '53575000',
                '02',
                '01',
                '6350c611819b7e84a2afd9611d33a98de5b3426c33561f516d49147dc1c4106b',
            ],
            tokenId: false,
            tokenInfo: false,
        },
        // 0202 N/A in spec, pending spotting in the wild
        // 0203 N/A in spec, pending spotting in the wild
        // Malformed swap
        {
            hex: '045357500001010105204de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf0453454c4c02025801002090dfb75fef5f07e384df4703b853a2741b8e6f3ef31ef8e5187a17fb107547f801010100',
            msg: 'Signal|Invalid SWaP',
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
        // Mod 0101 https://explorer.e.cash/tx/b03883ca0b106ea5e7113d6cbe46b9ec37ac6ba437214283de2d9cf2fbdc997f
        {
            hex: '0453575000',
            msg: 'Invalid SWaP',
            stackArray: ['53575000'],
            tokenId: false,
            tokenInfo: false,
        },
        // Mod 0101 with bad tokenId
        {
            hex: '0453575000010101011fe69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf0453454c4c02025801002090dfb75fef5f07e384df4703b853a2741b8e6f3ef31ef8e5187a17fb107547f801010100',
            msg: 'Signal|SLP Atomic Swap|Invalid tokenId|SELL for 6 XEC|Min trade: 0 XEC',
            stackArray: [
                '53575000',
                '01',
                '01',
                'e69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf', // 63 char, invalid tokenId
                '53454c4c',
                '0258',
                '00',
                '90dfb75fef5f07e384df4703b853a2741b8e6f3ef31ef8e5187a17fb107547f8',
                '01',
                '00',
            ],
            tokenId: false,
            tokenInfo: false,
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
                'qqf...yd0 airdropped 50k XEC to 12 holders of <a href="https://explorer.e.cash/tx/7c06091e745037b46c5ea60def8ad526274c2caabb1fae6c4ac89fad02fedf9a">7c0...f9a</a>|Csongor baby has been born. Take this little gift from a proud father!',
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
            msg: 'qrm...r48 airdropped $0.002 to 4 holders of <a href="https://explorer.e.cash/tx/1c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e">DET</a>',
            msgApiFailure:
                'qrm...r48 airdropped 50 XEC to 4 holders of <a href="https://explorer.e.cash/tx/1c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e">1c6...f5e</a>',
        },
        // Token id is not 64 char
        {
            txid: 'mod of 4403b0cc00ca159b64f219a7cc7cccd2e4440ddecbbcb6a0b82e78e350f8f72e',
            hex: '0464726f701f6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e0400746162',
            stackArray: [
                '64726f70',
                '6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e', // 63 chars
                '00746162', // prefix for msg is there but no msg
            ],
            airdropSendingAddress:
                'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48',
            airdropRecipientsKeyValueArray: [
                [
                    '6a0464726f701f6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e0400746162',
                    0,
                ],
                ['76a9147ab07df481649eb27c7ad9afda52b2a93d2f722a88ac', 2000],
                ['76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac', 1000],
                ['76a914b82361c5851f4ec48b995175a2e1c3646338e07688ac', 2000],
            ],
            tokenId: false,
            tokenInfo: false,
            coingeckoPrices: [
                { fiat: 'usd', price: 0.00003333, ticker: 'XEC' },
                { fiat: 'usd', price: 25000, ticker: 'BTC' },
                { fiat: 'usd', price: 1900, ticker: 'ETH' },
            ],
            msg: 'Invalid Airdrop',
            msgApiFailure: 'Invalid Airdrop',
        },
        // No stackArray[1]
        {
            txid: 'mod of 4403b0cc00ca159b64f219a7cc7cccd2e4440ddecbbcb6a0b82e78e350f8f72e',
            hex: '0464726f70',
            stackArray: ['64726f70'],
            airdropSendingAddress:
                'ecash:qrmz0egsqxj35x5jmzf8szrszdeu72fx0uxgwk3r48',
            airdropRecipientsKeyValueArray: [
                ['6a0464726f70', 0],
                ['76a9147ab07df481649eb27c7ad9afda52b2a93d2f722a88ac', 2000],
                ['76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac', 1000],
                ['76a914b82361c5851f4ec48b995175a2e1c3646338e07688ac', 2000],
            ],
            tokenId: false,
            tokenInfo: false,
            coingeckoPrices: [
                { fiat: 'usd', price: 0.00003333, ticker: 'XEC' },
                { fiat: 'usd', price: 25000, ticker: 'BTC' },
                { fiat: 'usd', price: 1900, ticker: 'ETH' },
            ],
            msg: 'Invalid Airdrop',
            msgApiFailure: 'Invalid Airdrop',
        },
    ],
    cashtabMsgs: [
        {
            txid: 'b9c95c8cb8436be0574946071932aed3b82e5a8631d4de7a64ea29f7fba84759',
            hex: '04007461623165436173684461793a2058454346617563657420546f70757020666f722045617374657220456767206769766561776179',
            stackArray: [
                '00746162',
                '65436173684461793a2058454346617563657420546f70757020666f722045617374657220456767206769766561776179',
            ],
            msg: 'eCashDay: XECFaucet Topup for Easter Egg giveaway',
        },
        // no stackArray[1]
        {
            txid: 'N/A, mod of b9c95c8cb8436be0574946071932aed3b82e5a8631d4de7a64ea29f7fba84759',
            hex: '0400746162',
            stackArray: ['00746162'],
            msg: 'Invalid Cashtab Msg',
        },
    ],
    encryptedCashtabMsgs: [
        {
            txid: 'c9abffe59ef104408bf2fd4f602f76096a7ab78f2801ae320cadac53e1be4c5d',
            hex: '04657461624c810281d8b3db5585bf24903022d9c5f3b8cafed757f254840c0f7bc872fda070745cb6cef3d645fc7e4403e2bc212e616db6691ab415cd1f7e9abcebdd8738e775a05ebeb14fadbdbf5941e0e4804e0c075239d0906ca5d5c00a93ebae11df7770c4aeeaef5b804abca08c10520fa47a6dc3df018378334a15f7ea3075bc9b8840a8',
            sendingAddress: 'ecash:qq4fd9zdqecq3q4mmxz8v8vunepptukh3czav3gjyt',
            xecReceivingOutputsKeyValueArray: [
                [
                    '6a04657461624c810281d8b3db5585bf24903022d9c5f3b8cafed757f254840c0f7bc872fda070745cb6cef3d645fc7e4403e2bc212e616db6691ab415cd1f7e9abcebdd8738e775a05ebeb14fadbdbf5941e0e4804e0c075239d0906ca5d5c00a93ebae11df7770c4aeeaef5b804abca08c10520fa47a6dc3df018378334a15f7ea3075bc9b8840a8',
                    0,
                ],
                [
                    '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                    24242424,
                ],
            ],
            stackArray: [
                '65746162',
                '0281d8b3db5585bf24903022d9c5f3b8cafed757f254840c0f7bc872fda070745cb6cef3d645fc7e4403e2bc212e616db6691ab415cd1f7e9abcebdd8738e775a05ebeb14fadbdbf5941e0e4804e0c075239d0906ca5d5c00a93ebae11df7770c4aeeaef5b804abca08c10520fa47a6dc3df018378334a15f7ea3075bc9b8840a8',
            ],
            coingeckoPrices: [
                { fiat: 'usd', price: 0.00003333, ticker: 'XEC' },
                { fiat: 'usd', price: 25000, ticker: 'BTC' },
                { fiat: 'usd', price: 1900, ticker: 'ETH' },
            ],
            msg: 'qq4...jyt sent an encrypted message and $8 to qr6...xkv',
            msgApiFailure:
                'qq4...jyt sent an encrypted message and 242k XEC to qr6...xkv',
        },
        {
            txid: 'c43c01feb0563ed7293e86bccbc695fdce88807c4bf6dfb0b48134eb16d076b7',
            hex: '04657461624cd1034e582d3789a6ff5119c9ef243b4e126eacc51a922504439b2edba9cbb313a170a34e9e763943a59af3345867aa364ba8f089f992d1072cefedf02ce0dbb9b56023aa115ab180cc521b25553735f5ae58fbd2ff6bb750c710792dcbb356cf816604deec3ee9767e7a76fd757f617d174b127cef0b3162dc888075e99147b25014ab61d86108abae51421efbc060f6eff7edffff9d54f17f64ced6b0f973a8f44164b58337470a5a60d9f8ecb43a82dd8c989f409285e97ec3417426ceaca6a919a7b3bb8cdcfa679c9af950972ee43160',
            sendingAddress: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
            xecReceivingOutputsKeyValueArray: [
                [
                    '6a04657461624cd1026d3ebca7776500d72ee640e56509cefcedee044b25584f0cc32d15c54766bc8960b179d07838f6ffb221c49c7f74d9a9bf4101cdb4a78d5507620ca020eab052d24995bcca37e9dd5b1baa210045b2942438e31a43062ef35c019250cef35dff2fd4b6999b98a103344d05c70847aa5124ac76d8528f737f4a504e96b46dbbe05b8a80bdc4b98bb0bb0f12ad12a3271550e79524ebae01dece0a231bfd546dab7714167bc73989613b73d94a5b48fbeda4913dbf42daedd52a3239a1654e4d3ded120b714eecffc3f3b1a37aed9e2d3b',
                    0,
                ],
                ['76a914f627e51001a51a1a92d8927808701373cf29267f88ac', 600],
                // manually give it another output to test
                ['76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac', 100],
            ],
            stackArray: [
                '65746162',
                '034e582d3789a6ff5119c9ef243b4e126eacc51a922504439b2edba9cbb313a170a34e9e763943a59af3345867aa364ba8f089f992d1072cefedf02ce0dbb9b56023aa115ab180cc521b25553735f5ae58fbd2ff6bb750c710792dcbb356cf816604deec3ee9767e7a76fd757f617d174b127cef0b3162dc888075e99147b25014ab61d86108abae51421efbc060f6eff7edffff9d54f17f64ced6b0f973a8f44164b58337470a5a60d9f8ecb43a82dd8c989f409285e97ec3417426ceaca6a919a7b3bb8cdcfa679c9af950972ee43160',
            ],
            coingeckoPrices: [
                { fiat: 'usd', price: 0.00003333, ticker: 'XEC' },
                { fiat: 'usd', price: 25000, ticker: 'BTC' },
                { fiat: 'usd', price: 1900, ticker: 'ETH' },
            ],
            msg: 'qq9...fgx sent an encrypted message and $0.0002 to qrm...r48 and 1 other',
            msgApiFailure:
                'qq9...fgx sent an encrypted message and 7 XEC to qrm...r48 and 1 other',
        },
    ],
    slp2PushVectors: [
        {
            push: '534c503200044d494e5445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd0150c30000000000',
            msg: 'MINT|<a href="https://explorer.e.cash/tx/cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145">CRD</a>|0.0',
        },
        {
            push: '534c5032000453454e4445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd03204e00000000cc7400000000640000000000',
            msg: 'SEND|<a href="https://explorer.e.cash/tx/cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145">CRD</a>|0.142',
        },
        {
            push: '534c503200044255524e45e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd204e00000000',
            msg: 'BURN',
        },
    ],
    slp2TxVectors: [
        {
            txid: '05fbc4dcea9cc73e298b9f7bfe58de7b11dbbb3917c2bbdc5c9c93035e84b9fa',
            hex: '5032534c503200044d494e5445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd0150c30000000000',
            emppStackArray: [
                '50',
                '534c503200044d494e5445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd0150c30000000000',
            ],
            msg: `${opReturn.knownApps.slp2.app}:MINT|<a href="https://explorer.e.cash/tx/cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145">CRD</a>|0.0`,
        },
        {
            txid: '6f907d8d0f31315fbac8f860052e92899866869326f726393fd4fd4b5f7b8a7f',
            hex: '503d534c5032000453454e4445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd03204e00000000cc7400000000640000000000',
            emppStackArray: [
                '50',
                '534c5032000453454e4445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd03204e00000000cc7400000000640000000000',
            ],
            msg: `${opReturn.knownApps.slp2.app}:SEND|<a href=\"https://explorer.e.cash/tx/cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145\">CRD</a>|0.142`,
        },
        {
            txid: 'f0548510095dfbbe31cbeb27e3c0a340aabaad12f98d4ec6f563602a9f3f5499',
            hex: '5030534c503200044255524e45e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd204e00000000',
            emppStackArray: [
                '50',
                '534c503200044255524e45e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd204e00000000',
            ],
            msg: `${opReturn.knownApps.slp2.app}:BURN`,
        },
        {
            txid: 'c60db447e7eabee94100567953985ec245a02368e604dd8436733624af38aa3c',
            hex: '5030534c5032c8044255524e0748dae47347c2cf32838eaddedc60866160f0772a022b17463aa435809ac635102700000000',
            emppStackArray: [
                '50',
                '534c5032c8044255524e0748dae47347c2cf32838eaddedc60866160f0772a022b17463aa435809ac635102700000000',
            ],
            msg: `${opReturn.knownApps.slp2.app}:Unknown token type|BURN`,
        },
        {
            txid: 'e3e24259c06b6cc61647239f5bab24d4433747ab80456c72a641dc5219d81b94',
            hex: '503d534c5032c80453454e440748dae47347c2cf32838eaddedc60866160f0772a022b17463aa435809ac63503102700000000584d00000000640000000000',
            emppStackArray: [
                '50',
                '534c5032c80453454e440748dae47347c2cf32838eaddedc60866160f0772a022b17463aa435809ac63503102700000000584d00000000640000000000',
            ],
            msg: `${opReturn.knownApps.slp2.app}:Unknown token type|SEND|<a href="https://explorer.e.cash/tx/35c69a8035a43a46172b022a77f060618660dcdead8e8332cfc24773e4da4807">35c...807</a>`,
        },
        // Manually add a cashtab msg push
        {
            txid: 'e3e24259c06b6cc61647239f5bab24d4433747ab80456c72a641dc5219d81b94',
            hex: '503d534c5032c80453454e440748dae47347c2cf32838eaddedc60866160f0772a022b17463aa435809ac63503102700000000584d000000006400000000002e04007461622846726f6d20467265657865632c207468616e6b20796f7520666f7220796f757220737570706f7274',
            emppStackArray: [
                '50',
                '534c5032c80453454e440748dae47347c2cf32838eaddedc60866160f0772a022b17463aa435809ac63503102700000000584d00000000640000000000',
                '04007461622846726f6d20467265657865632c207468616e6b20796f7520666f7220796f757220737570706f7274',
            ],
            msg: `${opReturn.knownApps.slp2.app}:Unknown token type|SEND|<a href=\"https://explorer.e.cash/tx/35c69a8035a43a46172b022a77f060618660dcdead8e8332cfc24773e4da4807\">35c...807</a>|Unknown App:\u0004\u0000tab(From Freexec, thank you for your support`,
        },
    ],
    aliasRegistrations: [
        {
            txid: 'dafea3b4ace4d56aec6aed106c6a654d7a1b0bc2f5bfa0599f679da77825e165',
            hex: '042e78656300046c616d6215000b7d35fda03544a08e65464d54cfae4257eb6db7',
            stackArray: [
                '2e786563',
                '00',
                '6c616d62',
                '000b7d35fda03544a08e65464d54cfae4257eb6db7',
            ],
            msg: 'lamb',
        },
        {
            txid: '79372d596c1dd14189720b5dc205350d46edfd0fffb108c717b9d0afbcf5869f',
            hex: '042e78656300046d6f6f6e15000b7d35fda03544a08e65464d54cfae4257eb6db7',
            stackArray: [
                '2e786563',
                '00',
                '6d6f6f6e',
                '000b7d35fda03544a08e65464d54cfae4257eb6db7',
            ],
            msg: 'moon',
        },
        {
            txid: '65c6afcf8a90d8b69729a0f048d736fda1a40451c3e83867c5a5f5a4c5226694',
            hex: '042e786563000670616e67616915000b7d35fda03544a08e65464d54cfae4257eb6db7',
            stackArray: [
                '2e786563',
                '00',
                '70616e676169',
                '000b7d35fda03544a08e65464d54cfae4257eb6db7',
            ],
            msg: 'pangai',
        },
        // Invalid alias tx with correct protocol identifier but incomplete stack
        {
            txid: 'N/A',
            hex: '042e78656305426f6f6d21',
            stackArray: ['2e786563', '426f6f6d21'],
            msg: 'Invalid alias registration',
        },
        // Invalid alias tx with correct protocol identifier but empty stack after protocol identifier
        {
            txid: 'N/A',
            hex: '042e786563',
            stackArray: ['2e786563'],
            msg: 'Invalid alias registration',
        },
        // Different version # for whatever reason
        {
            txid: 'N/A',
            hex: '042e78656301010670616e67616915000b7d35fda03544a08e65464d54cfae4257eb6db7',
            stackArray: [
                '2e786563',
                '01',
                '70616e676169',
                '000b7d35fda03544a08e65464d54cfae4257eb6db7',
            ],
            msg: 'Invalid alias registration',
        },
    ],
    payButtonTxs: [
        // on spec tx with no data
        {
            txid: 'd1e7036e920ac9c2f50495641a4b9771c6c8f1e932304a5865096a6d3a514303',
            hex: '04504159000000089057dd10be17a66a',
            stackArray: ['50415900', '00', '00', '9057dd10be17a66a'],
            msg: 'no data',
        },
        // on spec tx with data
        {
            txid: 'd1e7036e920ac9c2f50495641a4b9771c6c8f1e932304a5865096a6d3a514303',
            hex: '045041590000087465737464617461089057dd10be17a66a',
            stackArray: [
                '50415900',
                '00',
                '7465737464617461',
                '9057dd10be17a66a',
            ],
            msg: 'testdata',
        },
        // Unsupported version
        {
            txid: 'd1e7036e920ac9c2f50495641a4b9771c6c8f1e932304a5865096a6d3a514303',
            hex: '04504159000101087465737464617461089057dd10be17a66a',
            stackArray: [
                '50415900',
                '01',
                '7465737464617461',
                '9057dd10be17a66a',
            ],
            msg: 'Unsupported version: 0x01',
        },
        // Tx does not have enough pushes to parse
        {
            txid: 'd1e7036e920ac9c2f50495641a4b9771c6c8f1e932304a5865096a6d3a514303',
            hex: '04504159000101',
            stackArray: ['50415900', '01'],
            msg: '[off spec]',
        },
    ],
};

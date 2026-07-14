// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { ParseFixture, NotificationFixture } from './vectors';
import { XecTxType } from '../types';

const walletHash = '69535ed57a629cb83609de1e958a3c87a2d5e9db';

export const powParseFixtures: ParseFixture[] = [
    {
        description: 'Proof of Writing post tx',
        tx: {
            txid: 'c3a1a35aefc0111481c3246df2121d1321cb27516fd27e794b3fd4f461f6d6a3',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c441a95229e4a7b06f0ae62e7964fcaa1f148bf933d8d6a9b5c71209dc017768',
                        outIdx: 2,
                    },
                    inputScript:
                        '4160b48670db8fa89d83bf8ecaa125b5b4fb665a8da0e5a0b1353695cc006bfe328a0af4c6159758b3be4efb6c8324c4015443a879403c14cc3358e063df85015a412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 92163n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04504f5752005120532eaabd9574880dbf76b9b8cc00832c20a6ec113d682299550d7a6e0f345e25',
                },
                {
                    sats: 10000n,
                    outputScript:
                        '76a914dd1a2c6207afd46643e2af1c8134c92e636d15c788ac',
                },
                {
                    sats: 81894n,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1783526856,
            size: 269,
            isCoinbase: false,
            isFinal: true,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: [walletHash],
        parsed: {
            satoshisSent: 10000,
            stackArray: [
                '504f5752',
                '00',
                '51',
                '532eaabd9574880dbf76b9b8cc00832c20a6ec113d682299550d7a6e0f345e25',
            ],
            xecTxType: XecTxType.Sent,
            recipients: ['ecash:qrw35trzq7hagejru2h3eqf5eyhxxmg4cul69u7am3'],
            appActions: [
                {
                    lokadId: '504f5752',
                    app: 'Proof of Writing',
                    isValid: true,
                    action: {
                        type: 'post',
                        contentHash:
                            '532eaabd9574880dbf76b9b8cc00832c20a6ec113d682299550d7a6e0f345e25',
                    },
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Proof of Writing reply tx',
        tx: {
            txid: '2782443f28af38f4291f32ad9865407cdc7a3f6e785ce2d947cd66b60b4b2eee',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'eb2fce8fb7dc86cd1bcb2abbe8e9898af8cba1c6412ca735f9436c0a9410013d',
                        outIdx: 2,
                    },
                    inputScript:
                        '413b0d1345b7a900f46ea22fa00eff64157147bf3df99ead1051d334a6cd3beb5add1633b5d71766857e64039cba2eea4d22c7fce854a59d70ab612572c0ef0400412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 21766050n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04504f575200522027a3bc4c1524c7ff86fe5268fbdb46b270dff2a210364ec817578842a676ae5020aad4c6f3706197cdb0baf81ef906943b1d7aad9956403749791555087b753d56',
                },
                {
                    sats: 9400n,
                    outputScript:
                        '76a91404c261cfa8908283e64c12e45a519e856e8ce57888ac',
                },
                {
                    sats: 600n,
                    outputScript:
                        '76a914dd1a2c6207afd46643e2af1c8134c92e636d15c788ac',
                },
                {
                    sats: 21755714n,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1783568886,
            size: 336,
            isCoinbase: false,
            isFinal: true,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: [walletHash],
        parsed: {
            satoshisSent: 10000,
            stackArray: [
                '504f5752',
                '00',
                '52',
                '27a3bc4c1524c7ff86fe5268fbdb46b270dff2a210364ec817578842a676ae50',
                'aad4c6f3706197cdb0baf81ef906943b1d7aad9956403749791555087b753d56',
            ],
            xecTxType: XecTxType.Sent,
            recipients: [
                'ecash:qqzvycw04zgg9qlxfsfwgkj3n6zkar890qjckr302y',
                'ecash:qrw35trzq7hagejru2h3eqf5eyhxxmg4cul69u7am3',
            ],
            appActions: [
                {
                    lokadId: '504f5752',
                    app: 'Proof of Writing',
                    isValid: true,
                    action: {
                        type: 'reply',
                        targetTxid:
                            '27a3bc4c1524c7ff86fe5268fbdb46b270dff2a210364ec817578842a676ae50',
                        contentHash:
                            'aad4c6f3706197cdb0baf81ef906943b1d7aad9956403749791555087b753d56',
                    },
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Proof of Writing quote tx',
        tx: {
            txid: '156619e4718a6d9a18ff1f571e3639df9eace7d596a5c8ac6788d418d19f0fde',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'a1a37718b497923cc3496926e78fc13374ed8eb8ab3bc78e16ab455e0fdd99ef',
                        outIdx: 2,
                    },
                    inputScript:
                        '41b1b3024394cd000a0d0dc669a8e79ff6020538e96cd65b4a0198eec6f9120e2a2b06d7aae8037518586d0ac108ecfcd18c5bd7eecf53d3bce970eef9ef4dc99c412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 60461n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04504f57520053207938be0085fae6a9e81b10bf1410aa766c892c3caa181d03c5f6666741be72e520de3bbd0fd7945e42581643b18cdf28dd3ed61d9c3d541b7b016081564b65a3f3',
                },
                {
                    sats: 10000n,
                    outputScript:
                        '76a914dd1a2c6207afd46643e2af1c8134c92e636d15c788ac',
                },
                {
                    sats: 50159n,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1783492942,
            size: 302,
            isCoinbase: false,
            isFinal: true,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: [walletHash],
        parsed: {
            satoshisSent: 10000,
            stackArray: [
                '504f5752',
                '00',
                '53',
                '7938be0085fae6a9e81b10bf1410aa766c892c3caa181d03c5f6666741be72e5',
                'de3bbd0fd7945e42581643b18cdf28dd3ed61d9c3d541b7b016081564b65a3f3',
            ],
            xecTxType: XecTxType.Sent,
            recipients: ['ecash:qrw35trzq7hagejru2h3eqf5eyhxxmg4cul69u7am3'],
            appActions: [
                {
                    lokadId: '504f5752',
                    app: 'Proof of Writing',
                    isValid: true,
                    action: {
                        type: 'quote',
                        targetTxid:
                            '7938be0085fae6a9e81b10bf1410aa766c892c3caa181d03c5f6666741be72e5',
                        contentHash:
                            'de3bbd0fd7945e42581643b18cdf28dd3ed61d9c3d541b7b016081564b65a3f3',
                    },
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Proof of Writing repost tx',
        tx: {
            txid: 'aace15c9e2e4c4d5750786aa4098b045c123ff87afa1bc01c276891021f4e0c8',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c3f0d2e61ebea964480373ccd13885689b0086e9da8c781209a37cf8ff6e699b',
                        outIdx: 1,
                    },
                    inputScript:
                        '4182801dc6d96f57df5dc970bf4cd57e9a40de3ec6c164aa676764c45d939b8f95e3b291d28d9ec13fb5b3cfb15694cc3da5f15d6c073b630a73375f510105d8d7412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 9400n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
                {
                    prevOut: {
                        txid: 'c3f0d2e61ebea964480373ccd13885689b0086e9da8c781209a37cf8ff6e699b',
                        outIdx: 3,
                    },
                    inputScript:
                        '41d15c38f52d946f7b13216f6208fa29cb3cc9dc6051364ed9251b0a6254069c23f321ba2798dee0178e11432b1148f1baa958a9870535854966d9181ad35a0d2c412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 1621402n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04504f5752005420c3f0d2e61ebea964480373ccd13885689b0086e9da8c781209a37cf8ff6e699b',
                },
                {
                    sats: 9400n,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
                {
                    sats: 600n,
                    outputScript:
                        '76a914dd1a2c6207afd46643e2af1c8134c92e636d15c788ac',
                },
                {
                    sats: 1620358n,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1783384860,
            size: 444,
            isCoinbase: false,
            isFinal: true,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: [walletHash],
        parsed: {
            satoshisSent: 600,
            stackArray: [
                '504f5752',
                '00',
                '54',
                'c3f0d2e61ebea964480373ccd13885689b0086e9da8c781209a37cf8ff6e699b',
            ],
            xecTxType: XecTxType.Sent,
            recipients: ['ecash:qrw35trzq7hagejru2h3eqf5eyhxxmg4cul69u7am3'],
            appActions: [
                {
                    lokadId: '504f5752',
                    app: 'Proof of Writing',
                    isValid: true,
                    action: {
                        type: 'repost',
                        targetTxid:
                            'c3f0d2e61ebea964480373ccd13885689b0086e9da8c781209a37cf8ff6e699b',
                    },
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Proof of Writing like tx',
        tx: {
            txid: 'a8b76c155069dbd78f281a90ab3da3e3647222cc52a305a7c21daced6cc1977b',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '7938be0085fae6a9e81b10bf1410aa766c892c3caa181d03c5f6666741be72e5',
                        outIdx: 2,
                    },
                    inputScript:
                        '41448b68a5d69635b37c2e4a68ae5342b5cc4febbd6ba6972624c6b494a40d5dd64f9f0c3c0f410185109d3e0bff997cc538a2e67e90cf5767f59914cbfb10fb1e412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 1260422n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04504f57520055207938be0085fae6a9e81b10bf1410aa766c892c3caa181d03c5f6666741be72e5',
                },
                {
                    sats: 94000n,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
                {
                    sats: 6000n,
                    outputScript:
                        '76a914dd1a2c6207afd46643e2af1c8134c92e636d15c788ac',
                },
                {
                    sats: 1160119n,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1783492917,
            size: 303,
            isCoinbase: false,
            isFinal: true,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: [walletHash],
        parsed: {
            satoshisSent: 6000,
            stackArray: [
                '504f5752',
                '00',
                '55',
                '7938be0085fae6a9e81b10bf1410aa766c892c3caa181d03c5f6666741be72e5',
            ],
            xecTxType: XecTxType.Sent,
            recipients: ['ecash:qrw35trzq7hagejru2h3eqf5eyhxxmg4cul69u7am3'],
            appActions: [
                {
                    lokadId: '504f5752',
                    app: 'Proof of Writing',
                    isValid: true,
                    action: {
                        type: 'like',
                        targetTxid:
                            '7938be0085fae6a9e81b10bf1410aa766c892c3caa181d03c5f6666741be72e5',
                    },
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Proof of Writing publish tx',
        tx: {
            txid: 'eafbaa6dd8429c617e3050b2d22026806732ca298a042e0f7a68af16b1857dc9',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '84eeebf0402f500b8924d7e07d41ed108b96909648147cfed6d368113072343c',
                        outIdx: 2,
                    },
                    inputScript:
                        '41c1b89ead2fa5023c3fff60cb529cae390eedbd00f94d8cc65d3e825811845ff37890425c9b980d8240d8916800cabb384963c783cfa817c402f7465d30826454412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 19755175n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04504f5752005620a4ac8f1b29e923b294eeb5705b516fa347039a12ad295b2c6660ea06b487d32b',
                },
                {
                    sats: 10000n,
                    outputScript:
                        '76a914dd1a2c6207afd46643e2af1c8134c92e636d15c788ac',
                },
                {
                    sats: 19744906n,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1783569910,
            size: 269,
            isCoinbase: false,
            isFinal: true,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: [walletHash],
        parsed: {
            satoshisSent: 10000,
            stackArray: [
                '504f5752',
                '00',
                '56',
                'a4ac8f1b29e923b294eeb5705b516fa347039a12ad295b2c6660ea06b487d32b',
            ],
            xecTxType: XecTxType.Sent,
            recipients: ['ecash:qrw35trzq7hagejru2h3eqf5eyhxxmg4cul69u7am3'],
            appActions: [
                {
                    lokadId: '504f5752',
                    app: 'Proof of Writing',
                    isValid: true,
                    action: {
                        type: 'publish',
                        contentHash:
                            'a4ac8f1b29e923b294eeb5705b516fa347039a12ad295b2c6660ea06b487d32b',
                    },
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Proof of Writing unlock tx',
        tx: {
            txid: 'f846d4693c1e44dfb9a11aa9e182d92b908c31f61c3943707eaf4cdc123550f2',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '95813427e8fdab85399ad20a2a06ff34edfb7058ff30fe9f66c20f56d6211095',
                        outIdx: 3,
                    },
                    inputScript:
                        '419097c84ee1162e333d91299d4bda818f39c69bb4d4cef4636b5e940b9bdd2720fa3339c3a500c9bf9a93db03e1b8d61384a1ce7372cda42bbd34eb26c97ed7b0412102827d32b0200a2fe0b5daa40d7d0a2b6d66fd9fc3c4aa5955aa2be36fd5f7b307',
                    sats: 35439n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91499806512c53344dc195971f6cd3ece262f281a3088ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript: '6a04504f57520057',
                },
                {
                    sats: 9400n,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
                {
                    sats: 600n,
                    outputScript:
                        '76a914dd1a2c6207afd46643e2af1c8134c92e636d15c788ac',
                },
                {
                    sats: 25169n,
                    outputScript:
                        '76a91499806512c53344dc195971f6cd3ece262f281a3088ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1783493180,
            size: 270,
            isCoinbase: false,
            isFinal: true,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: [walletHash],
        parsed: {
            satoshisSent: 9400,
            stackArray: ['504f5752', '00', '57'],
            xecTxType: XecTxType.Received,
            recipients: [
                'ecash:qrw35trzq7hagejru2h3eqf5eyhxxmg4cul69u7am3',
                'ecash:qzvcqegjc5e5fhqet9cldnf7ecnz72q6xqmzet7dse',
            ],
            replyAddress: 'ecash:qzvcqegjc5e5fhqet9cldnf7ecnz72q6xqmzet7dse',
            appActions: [
                {
                    lokadId: '504f5752',
                    app: 'Proof of Writing',
                    isValid: true,
                    action: {
                        type: 'unlock',
                    },
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Proof of Writing auth tx',
        tx: {
            txid: 'df4c499cf2d2e7f4262ccf8a68e27476999c8c6dfc4db19d8416dd9d70bc1ec8',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c3a1a35aefc0111481c3246df2121d1321cb27516fd27e794b3fd4f461f6d6a3',
                        outIdx: 2,
                    },
                    inputScript:
                        '410ad1bcae903144fe3392271d9cf86edeb15facb8550e57165779d1dfd314f5af04ae2671bec284f61130dece1f9ddb30ce1e94548d6f2f20dbb4b3985591bc1e412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 81894n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04504f575200582432623335633765362d366431362d343463352d626338312d363036363838383131396639',
                },
                {
                    sats: 550n,
                    outputScript:
                        '76a9143cf8ca7c797eeaf9820a8d3254977e96e264e0d588ac',
                },
                {
                    sats: 81071n,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1783554805,
            size: 273,
            isCoinbase: false,
            isFinal: true,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: [walletHash],
        parsed: {
            satoshisSent: 550,
            stackArray: [
                '504f5752',
                '00',
                '58',
                '32623335633765362d366431362d343463352d626338312d363036363838383131396639',
            ],
            xecTxType: XecTxType.Sent,
            recipients: ['ecash:qq703jnu09lw47vzp2xny4yh06twye8q65najumgcy'],
            appActions: [
                {
                    lokadId: '504f5752',
                    app: 'Proof of Writing',
                    isValid: true,
                    action: {
                        type: 'auth',
                        nonce: '32623335633765362d366431362d343463352d626338312d363036363838383131396639',
                    },
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Proof of Writing handle tx',
        tx: {
            txid: '84eeebf0402f500b8924d7e07d41ed108b96909648147cfed6d368113072343c',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'aa68738bfb40d858690fb34aa3bf363c27f333bb04954063da50dfd1bdb0a95a',
                        outIdx: 2,
                    },
                    inputScript:
                        '4127c518c13cf964bad6c0ef2434072bd61ea5ca9a05fbe56775355a5cad3364d1ea1b5a61edcc50d7557a67a8975642f95288e3ea84547a9451a17db34f4211fd412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 20755448n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04504f575200592432316532306534332d643261392d343439662d396164312d373133376664303065663162',
                },
                {
                    sats: 1000000n,
                    outputScript:
                        '76a9143cf8ca7c797eeaf9820a8d3254977e96e264e0d588ac',
                },
                {
                    sats: 19755175n,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1783569314,
            size: 273,
            isCoinbase: false,
            isFinal: true,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: [walletHash],
        parsed: {
            satoshisSent: 1000000,
            stackArray: [
                '504f5752',
                '00',
                '59',
                '32316532306534332d643261392d343439662d396164312d373133376664303065663162',
            ],
            xecTxType: XecTxType.Sent,
            recipients: ['ecash:qq703jnu09lw47vzp2xny4yh06twye8q65najumgcy'],
            appActions: [
                {
                    lokadId: '504f5752',
                    app: 'Proof of Writing',
                    isValid: true,
                    action: {
                        type: 'handle',
                        nonce: '32316532306534332d643261392d343439662d396164312d373133376664303065663162',
                    },
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Proof of Writing comment tx',
        tx: {
            txid: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c441a95229e4a7b06f0ae62e7964fcaa1f148bf933d8d6a9b5c71209dc017768',
                        outIdx: 2,
                    },
                    inputScript:
                        '4160b48670db8fa89d83bf8ecaa125b5b4fb665a8da0e5a0b1353695cc006bfe328a0af4c6159758b3be4efb6c8324c4015443a879403c14cc3358e063df85015a412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 92163n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04504f5752005a20532eaabd9574880dbf76b9b8cc00832c20a6ec113d682299550d7a6e0f345e25',
                },
                {
                    sats: 10000n,
                    outputScript:
                        '76a914dd1a2c6207afd46643e2af1c8134c92e636d15c788ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 300,
            isCoinbase: false,
            isFinal: true,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: [walletHash],
        parsed: {
            satoshisSent: 10000,
            stackArray: [
                '504f5752',
                '00',
                '5a',
                '532eaabd9574880dbf76b9b8cc00832c20a6ec113d682299550d7a6e0f345e25',
            ],
            xecTxType: XecTxType.Sent,
            recipients: ['ecash:qrw35trzq7hagejru2h3eqf5eyhxxmg4cul69u7am3'],
            appActions: [
                {
                    lokadId: '504f5752',
                    app: 'Proof of Writing',
                    isValid: true,
                    action: {
                        type: 'comment',
                        contentHash:
                            '532eaabd9574880dbf76b9b8cc00832c20a6ec113d682299550d7a6e0f345e25',
                    },
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Proof of Writing comment_reply tx',
        tx: {
            txid: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c441a95229e4a7b06f0ae62e7964fcaa1f148bf933d8d6a9b5c71209dc017768',
                        outIdx: 2,
                    },
                    inputScript:
                        '4160b48670db8fa89d83bf8ecaa125b5b4fb665a8da0e5a0b1353695cc006bfe328a0af4c6159758b3be4efb6c8324c4015443a879403c14cc3358e063df85015a412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 92163n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04504f5752005b2027a3bc4c1524c7ff86fe5268fbdb46b270dff2a210364ec817578842a676ae5020aad4c6f3706197cdb0baf81ef906943b1d7aad9956403749791555087b753d56',
                },
                {
                    sats: 10000n,
                    outputScript:
                        '76a914dd1a2c6207afd46643e2af1c8134c92e636d15c788ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 300,
            isCoinbase: false,
            isFinal: true,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: [walletHash],
        parsed: {
            satoshisSent: 10000,
            stackArray: [
                '504f5752',
                '00',
                '5b',
                '27a3bc4c1524c7ff86fe5268fbdb46b270dff2a210364ec817578842a676ae50',
                'aad4c6f3706197cdb0baf81ef906943b1d7aad9956403749791555087b753d56',
            ],
            xecTxType: XecTxType.Sent,
            recipients: ['ecash:qrw35trzq7hagejru2h3eqf5eyhxxmg4cul69u7am3'],
            appActions: [
                {
                    lokadId: '504f5752',
                    app: 'Proof of Writing',
                    isValid: true,
                    action: {
                        type: 'comment_reply',
                        targetTxid:
                            '27a3bc4c1524c7ff86fe5268fbdb46b270dff2a210364ec817578842a676ae50',
                        contentHash:
                            'aad4c6f3706197cdb0baf81ef906943b1d7aad9956403749791555087b753d56',
                    },
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Invalid Proof of Writing tx (bad version)',
        tx: {
            txid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c441a95229e4a7b06f0ae62e7964fcaa1f148bf933d8d6a9b5c71209dc017768',
                        outIdx: 2,
                    },
                    inputScript:
                        '4160b48670db8fa89d83bf8ecaa125b5b4fb665a8da0e5a0b1353695cc006bfe328a0af4c6159758b3be4efb6c8324c4015443a879403c14cc3358e063df85015a412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 92163n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04504f5752515120532eaabd9574880dbf76b9b8cc00832c20a6ec113d682299550d7a6e0f345e25',
                },
                {
                    sats: 10000n,
                    outputScript:
                        '76a914dd1a2c6207afd46643e2af1c8134c92e636d15c788ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 300,
            isCoinbase: false,
            isFinal: true,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: [walletHash],
        parsed: {
            satoshisSent: 10000,
            stackArray: [
                '504f5752',
                '51',
                '51',
                '532eaabd9574880dbf76b9b8cc00832c20a6ec113d682299550d7a6e0f345e25',
            ],
            xecTxType: XecTxType.Sent,
            recipients: ['ecash:qrw35trzq7hagejru2h3eqf5eyhxxmg4cul69u7am3'],
            appActions: [
                {
                    lokadId: '504f5752',
                    app: 'Proof of Writing',
                    isValid: false,
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Invalid Proof of Writing tx (handle missing nonce)',
        tx: {
            txid: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c441a95229e4a7b06f0ae62e7964fcaa1f148bf933d8d6a9b5c71209dc017768',
                        outIdx: 2,
                    },
                    inputScript:
                        '4160b48670db8fa89d83bf8ecaa125b5b4fb665a8da0e5a0b1353695cc006bfe328a0af4c6159758b3be4efb6c8324c4015443a879403c14cc3358e063df85015a412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 92163n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript: '6a04504f57520059',
                },
                {
                    sats: 10000n,
                    outputScript:
                        '76a914dd1a2c6207afd46643e2af1c8134c92e636d15c788ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 300,
            isCoinbase: false,
            isFinal: true,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: [walletHash],
        parsed: {
            satoshisSent: 10000,
            stackArray: ['504f5752', '00', '59'],
            xecTxType: XecTxType.Sent,
            recipients: ['ecash:qrw35trzq7hagejru2h3eqf5eyhxxmg4cul69u7am3'],
            appActions: [
                {
                    lokadId: '504f5752',
                    app: 'Proof of Writing',
                    isValid: false,
                },
            ],
            parsedTokenEntries: [],
        },
    },
];

export const powNotificationFixtures: NotificationFixture[] = [
    {
        description: 'Proof of Writing post notification',
        parsedTx: powParseFixtures[0].parsed,
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        expected: 'Proof of Writing | Sent 100.00 XEC | post',
    },
    {
        description: 'Proof of Writing unlock notification',
        parsedTx: powParseFixtures[6].parsed,
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        expected: 'Proof of Writing | Received 94.00 XEC | unlock',
    },
    {
        description: 'Proof of Writing auth notification',
        parsedTx: powParseFixtures[7].parsed,
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        expected: 'Proof of Writing | Sent 5.50 XEC | auth',
    },
    {
        description: 'Proof of Writing handle notification',
        parsedTx: powParseFixtures[8].parsed,
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        expected: 'Proof of Writing | Sent 10k XEC | handle',
    },
    {
        description: 'Proof of Writing comment notification',
        parsedTx: powParseFixtures[9].parsed,
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        expected: 'Proof of Writing | Sent 100.00 XEC | comment',
    },
];

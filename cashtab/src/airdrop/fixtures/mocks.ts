// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { TokenIdUtxos, TokenInfo } from 'chronik-client';
// In-node chronik return data for chronik.tokenId(50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e).utxos()
export const tokenUtxos: TokenIdUtxos = {
    tokenId: '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
    utxos: [
        {
            outpoint: {
                txid: '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                outIdx: 2,
            },
            blockHeight: 674143,
            isCoinbase: false,
            script: '76a914b8d9512d2adf8b4e70c45c26b6b00d75c28eaa9688ac',
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 0n,
                isMintBaton: true,
            },
        },
        {
            outpoint: {
                txid: 'ffe3a7500dbcc98021ad581c98d9947054d1950a7f3416664715066d3d20ad72',
                outIdx: 1,
            },
            blockHeight: 674444,
            isCoinbase: false,
            script: '76a914a5417349420ec53b27522fed1a63b1672c0f28ff88ac',
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 3n,
                isMintBaton: false,
            },
        },
        {
            outpoint: {
                txid: '7987f68aa70d29ac0e0ac31d74354a8b1cd515c9893f6a5cdc7a3bf505e08b05',
                outIdx: 1,
            },
            blockHeight: 685181,
            isCoinbase: false,
            script: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 1n,
                isMintBaton: false,
            },
        },
        {
            outpoint: {
                txid: '40875e397c133ef6c4ec69f5e949806841aef85b27055438bec7d48ccce235a3',
                outIdx: 2,
            },
            blockHeight: 701432,
            isCoinbase: false,
            script: '76a914d4fa9121bcd065dd93e58831569cf51ef5a74f6188ac',
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 2n,
                isMintBaton: false,
            },
        },
        {
            outpoint: {
                txid: '9007a24f172a04cfa8f98bdb5e66ec3756b346343e6b8a2c19953d72aea17c1a',
                outIdx: 1,
            },
            blockHeight: 701432,
            isCoinbase: false,
            script: '76a914d4fa9121bcd065dd93e58831569cf51ef5a74f6188ac',
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 1n,
                isMintBaton: false,
            },
        },
        {
            outpoint: {
                txid: '115fd4e77d9358eb860dee125968dc371f7828c1b0a8527fc258720cb172d4d5',
                outIdx: 1,
            },
            blockHeight: 770092,
            isCoinbase: false,
            script: '76a914c1aadc99f96fcfcfe5642ca29a53e701f0b801c388ac',
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 1n,
                isMintBaton: false,
            },
        },
        {
            outpoint: {
                txid: '115fd4e77d9358eb860dee125968dc371f7828c1b0a8527fc258720cb172d4d5',
                outIdx: 2,
            },
            blockHeight: 770092,
            isCoinbase: false,
            script: '76a914a714013e6336a0378a1f71ade875b2138813a3ec88ac',
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 4n,
                isMintBaton: false,
            },
        },
        {
            outpoint: {
                txid: 'e057b9cefb0864e8d0f5cc9ffaf16a31ad49e99d7002d15426a68a3eb47c5de2',
                outIdx: 1,
            },
            blockHeight: 836942,
            isCoinbase: false,
            script: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 42n,
                isMintBaton: false,
            },
        },
        {
            outpoint: {
                txid: 'e057b9cefb0864e8d0f5cc9ffaf16a31ad49e99d7002d15426a68a3eb47c5de2',
                outIdx: 2,
            },
            blockHeight: 836942,
            isCoinbase: false,
            script: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 46n,
                isMintBaton: false,
            },
        },
    ],
};
export const p2pkhHoldersTokenUtxos = new Map([
    ['76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac', 88n],
    ['76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac', 1n],
    ['76a914a5417349420ec53b27522fed1a63b1672c0f28ff88ac', 3n],
    ['76a914a714013e6336a0378a1f71ade875b2138813a3ec88ac', 4n],
    ['76a914c1aadc99f96fcfcfe5642ca29a53e701f0b801c388ac', 1n],
    ['76a914d4fa9121bcd065dd93e58831569cf51ef5a74f6188ac', 3n],
]);

// Build tokenUtxos with no p2pkh or p2sh scripts
const badUtxos = [];
for (const utxo of tokenUtxos.utxos) {
    badUtxos.push({ ...utxo, script: '6a0401020304' });
}
export const badScriptTokenUtxos = { ...tokenUtxos, utxos: badUtxos };

export const tokenUtxosDecimals = {
    tokenId: 'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1',
    utxos: [
        {
            outpoint: {
                txid: 'b622b770f74f056e07e5d2ea4d7f8da1c4d865e21e11c31a263602a38d4a2474',
                outIdx: 2,
            },
            blockHeight: 660978,
            isCoinbase: false,
            script: '76a91419884c453167cf3011a3363b4b1ebd926bde059f88ac',
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 0n,
                isMintBaton: true,
            },
        },
        {
            outpoint: {
                txid: 'eb6ec82bad393ed16a74f030249d998cd2936a2e59005bf5e1445cf05683050d',
                outIdx: 1,
            },
            blockHeight: 661789,
            isCoinbase: false,
            script: '76a914740b0728a1b61c017cd731405ae2c9915801ef2c88ac',
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 10000000000000n,
                isMintBaton: false,
            },
        },
        {
            outpoint: {
                txid: '0158981b89b75bd923d511aaaaccd94b8d1d86babeeb69c29e3caf71e33bcc11',
                outIdx: 2,
            },
            blockHeight: 692599,
            isCoinbase: false,
            script: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 1003456790n,
                isMintBaton: false,
            },
        },
        {
            outpoint: {
                txid: '1ef9ad7d3e01fd9d83983eac92eefb4900b343225a80c29bff025deff9aab57c',
                outIdx: 2,
            },
            blockHeight: 692599,
            isCoinbase: false,
            script: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 880000000n,
                isMintBaton: false,
            },
        },
        {
            outpoint: {
                txid: 'f3b309956c5784f6984372bcaa9a6daa077bd6ed3e3025ec469085a2fafe5e37',
                outIdx: 1,
            },
            blockHeight: 766176,
            isCoinbase: false,
            script: '76a9146ffbe7c7d7bd01295eb1e371de9550339bdcf9fd88ac',
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 1n,
                isMintBaton: false,
            },
        },
        {
            outpoint: {
                txid: 'fd9716a332e4b55dff884a87dbfc66de690c5037bf71789d722178b6b2b22cac',
                outIdx: 1,
            },
            blockHeight: 825706,
            isCoinbase: false,
            script: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            sats: 546n,
            isFinal: true,
            token: {
                tokenId:
                    'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 230000000n,
                isMintBaton: false,
            },
        },
    ],
};
export const decimalsTokenInfo: TokenInfo = {
    tokenId: 'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1',
    tokenType: {
        protocol: 'SLP',
        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
        number: 1,
    },
    timeFirstSeen: 0,
    genesisInfo: {
        tokenTicker: 'CTP',
        tokenName: 'Cash Tab Points',
        url: 'https://cashtabapp.com/',
        decimals: 9,
        hash: '',
    },
    block: {
        height: 660971,
        hash: '00000000000000000334795ce566d1202a804e71422d05c93beb6afc4eb99cf3',
        timestamp: 1605037203,
    },
};
export const decimalsTokenGenesis = {
    txid: 'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: '9c491d74a3fd32b4fc95fc16e7bff2f87c52667bb309efd02e1c82f34062486a',
                outIdx: 3,
            },
            inputScript:
                '4830450221008627b5457b1c00a6eb45b8143db3c5d8967436ab828c371252987c3565b4b8cf022043350e78f1397e2e9738f71732c3ed51a84c75e45672294bbea8109b734b5a6141210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 91092350n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '27e27bdada08aa953eb74d6064bf90990316cc5fb1f7b6cabb38a37bf77a4355',
                outIdx: 0,
            },
            inputScript:
                '483045022100a20e5f247c2264b8906ff73282281e2d616a9b3eb56c5ac0ae3011c7ad713b1802207a8b78cbb7aacfed777b018703fdfb9b086cd06f71d86fb32d4207045144119541210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1810n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '64bc637895d21bf91185eaf52e3cd54acd5724924bb99113fb6a1ef80581f05a',
                outIdx: 0,
            },
            inputScript:
                '483045022100de97a6604699b0af2726e41e8ff4b0a31cbeee03fdcebf4bb71f52548528cc82022028f7473609089d2a6cfb0a0a5981000371ef4ec54b7df83433d8b7adf3265bf141210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1710n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '99fb7fbe0f4980a63ad4c869f06bb3cb52bb26b40db9a8ba98de3d0807f703fe',
                outIdx: 0,
            },
            inputScript:
                '473044022040b0fa1d7a20c55f4ba04f8d3e2c5f22190877fcd8fd954836116638de8b20ea02204d10006ae4cf36a8dcaee3c88bdd8a35d96798345311dce68e959cf1b9e0fd5d41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 10100n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '83f230c90480e97c8f39528c2380a3f981599205f4306458a86ceb47ae5ac46e',
                outIdx: 0,
            },
            inputScript:
                '47304402207b4bee7f7738f922a32e6734f587aa951bfb6fccc1edb1aee57afc827afdf24f0220016c73b1c785debe37bc1c9c5359773467ad509cb90d7b510b003f6f572adde841210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1730n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'd4026c6e75283e4e0e85f2e9288680fd2ed9daba08f6e812eee94622f12a3c94',
                outIdx: 0,
            },
            inputScript:
                '483045022100da3d93a14017fe32227afbfcdce619bdeb2cf2720f50efedaf2c81c9d3212ab6022050a5ac02a3f396b022ee3d8945e1a02c4032a3f3d7fa574632f9d7e405f6a78141210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 10200n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '8e7b41d6f3380a40a3748dedb2f7dc20332cb9d1598536cfd6e936356ea7ab25',
                outIdx: 0,
            },
            inputScript:
                '47304402201aaeec2a255055d91d5cc28e7110a04364effcea0754b6733740f5f9d97ca670022045f1920890a326d3e0df116e9a63a81654878422504aee4fb2320e0187cab47441210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 10300n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '0aa845fa08881a8e12c35764dd59d6767714554c2aec817f193dc25b6da659d9',
                outIdx: 0,
            },
            inputScript:
                '473044022054a4424f1d4961bff856bf470291f3e78a246be54b40151fe19b8f817ce66eb5022003dc24f1c0478da7b6a919d6326f3e90b30692021fdd564fe874ce2cba5f228841210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1740n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '6cf2c5bc7d90f17e629787b71bf0a60939c71be1fed46f1ae018d964ce5d4e90',
                outIdx: 0,
            },
            inputScript:
                '473044022002b17abe57c58476eee6ab0b5c5584a4d47de9c16479fb810b47e6dac2d76b99022074b1081354bbf873a6fcc5bce55b86a4302175d69fe8513f3381a847128ffe9741210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 10400n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'e144d8de3a94a68422cf9653e8ff0107cb9c730d45c7160b01fce9f69f77348d',
                outIdx: 0,
            },
            inputScript:
                '483045022100dbf1f4da13943d44bdeb67f3f0e6163b66b704079fc1c5d20898d2e7015e82e6022074f071687a91e4137178baf9b3714465b8a25ba0b65a550df18e581b9ee3e40841210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1750n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '28369624fa39ffe30b72c4498c1ae2e611dfcccfeff512e7d5025ff96cb36a13',
                outIdx: 0,
            },
            inputScript:
                '473044022032e325b1b84a427642570d176c4b7b933355f76cd8594c6062ad7bb6e86413ee02204ce9d379df347aea67c8816efb7a17751af36270fe5a70e3686abc8e467d3e4841210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1760n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'eda398cfaa05f8f0a2293a66e78f41f231eb9652c7bb51853608abb8a1b4f83a',
                outIdx: 0,
            },
            inputScript:
                '483045022100a998ba1209c7ef1e87b4a1648fd284667ca32bd68568cfd45e4df738245c50fe022053d4429b72b5ce5466d138444ad947cfa249dd34479102f614a0591a35274c7041210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 10500n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '0301275a8869797d4bf14a1b3df3892088c88b42d3674fc5ffc4cc2a4b1af8c2',
                outIdx: 0,
            },
            inputScript:
                '473044022036b78d4f903c169b959cf8555e3f62e5a6772810cd4bc2215eb47e8a0352bf5f0220790a9ab0d9d84880c8eee946374958319c279bc0e5c284f730537741b51a040141210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 10600n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '1edf7158ed7195b6d53e0983cd96bc1b910d23ae6a9a283acfcbb0030c559616',
                outIdx: 0,
            },
            inputScript:
                '4730440220331668fb7d8134ff3025fa81631608319ab89b1f233559b44de945673b9d0d5702207df6f50387253b6083945589f731e7d3bfb11219608199f92165570a57774a5241210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1770n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '50184ba24de7e238a6509c0dd48db175f163cb3c968ab98265da294118c49953',
                outIdx: 0,
            },
            inputScript:
                '483045022100b9cf245ee16d20476f59e74b3fed0f1e23bbd06e4f935f1ff57a53ef8d2d4e4602205a398f4fbf620a93ea358b9156b89219fd3b8aa94d3973bb678350cc79f3867b41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1780n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '6c5da609e82a06a4c919c14e6a078c91c41f59f4988380ed8bd7af2f85ab939e',
                outIdx: 0,
            },
            inputScript:
                '483045022100fa419d0c299883aa3e006d928401948ae2a1077b37e4357f959b4bf9cb7784a102202975313fbf80afc577a9ed7cbcb17de4d10f91a86a29406b3621f20c5032504d41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1790n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '54a615851c6f681541a7b98745bfddd98838c1896542b45650c2d056555955e5',
                outIdx: 0,
            },
            inputScript:
                '483045022100d0931b5d01854387e0911ff2c7f8c4198f79ca87457ef163b9a940000d5ae5d00220601c1ae5be7b78283c6a2f7f8e04d7e9b5db5be3f8688abdd80180bff98c3fb841210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1800n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '8ec65d15890eb606aa3d6408271c96f260397468e66575d58b914f28686e5d1b',
                outIdx: 0,
            },
            inputScript:
                '47304402207b7856e4f0bc77d616d2641a3ff5e6efc9052aa2d986831ba5348764b479e8f802202f0e8bedaf8579b3444edaca07e6e1221aa664091725c981cc84e36224f9221c41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 19000n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '5736080ed1066c7e001d2fb770e27c476433a110d9daf3e1589a68dc8f67ae1e',
                outIdx: 0,
            },
            inputScript:
                '47304402200109e9bd05b5a4a8c909bf45b0e70f8837d68f65441ea9e1427b9beb0b0b4b4d02200ef92bd399cb64a51e029973d06a10865cef82fd4570e75f94c4ec20d59d2e5941210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 10100n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '2e8718619cf6bd87fa3a3b4bc9c6b96a5601ff216de13e81ebd8e5804d10dceb',
                outIdx: 0,
            },
            inputScript:
                '473044022074286c4bbe7c2c93ff9530b0388614e4c63646ed6c6401bf28381b55d27bbf6f02202010f3c4ea6f77209c5f8db2b61f517dfb6274d7c9592b1326a149b5fe82f60741210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1300n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'd89c70a1d9d31f4ef99d4e29deff2f4b13a95f2744768fdea1d30e5e11a94fb7',
                outIdx: 0,
            },
            inputScript:
                '483045022100d68f868717064787cb0dfd474a1260a270580ccf9f2fb192a6f6252a673e8728022040a09caf1c71f6d6b8f7c1056bf17563cd5f2f66e12aafb58f014ea9b6c683ea41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1310n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '0ef3b2ff213728dfb7f72d3ec9ab907ca1ef819724b37516b7f7b9a246da88c5',
                outIdx: 0,
            },
            inputScript:
                '47304402201c9e473a550660279b4a57bd0c6b2ba5722e8f52759707201684487bc22115f202200725266680f79b40a3b651826b2c2717576d16e1ca353970fe6ccdc00db66bb741210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1320n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '4388d865dfa9f12f6bc73af0ab6cfd5e3a96e55a5008a64d1aa144debf773444',
                outIdx: 0,
            },
            inputScript:
                '47304402200b3d5b5c0e2efa3e34a4d766e8a9e627875dd118684c18b3dd3f36985a7a0dd8022021f2431a17398f6b74aa617f2b9591bffd33039da7bc618b67ae8cbf90a6f16141210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1330n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '3e5fa9bd7dc8c0d0977f04dfe14b13fd02abf7bb5420eb668dec0113910c6a1e',
                outIdx: 0,
            },
            inputScript:
                '473044022045f73a617b6b133bc4614a27a35f3951226fef4eaf112a71ec91b302fb275ecd02205c67a423772b71000f4d58f76f626b84b81f63428cd8ff1e1e42ee3343e286c241210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1340n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '91ca027d4755acf6f2a5f5dcaf72da5787b40e81ce96ad8f3075d78a6d2f2228',
                outIdx: 0,
            },
            inputScript:
                '483045022100fee6677a8eafd856c729ee989ee3550e64477396104b70ea9ac2fdf3a495536c0220786c38930ffd1aa4e987a70ea3769e4e50b136d1bc4e7dc5e3921a09df9c0da641210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1350n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '209aca7c3d906b2f7b012ea18d217bcb8081af0ac715f76f9b08187965ed80ab',
                outIdx: 0,
            },
            inputScript:
                '483045022100de880611d05e9cdb7f9b6a08ba2bbcf335c5d79206dcb8593eb8bf2a6023a9d0022061bbaded68bb6ab1db579b7e1220b98910b8e3af18d2cb982bcc649934073ed841210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1360n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '8aa29b912e09b4fa9dc37ae5465fdc1e576d206424547b0fd3baa930ba858f6d',
                outIdx: 0,
            },
            inputScript:
                '47304402204a3ebd83e2a10d5b51afb24b27cb85f52119fc302e7c89c7f252fe401b6f217102203ac4c2fb2ac56dc72802a40e97a0513511ab3115077ba2a0fb5c92238424a8b941210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1370n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'd4c718c44c89357212735e7310e50a56cce08e2ff9a119216e6b1dbee307b1f4',
                outIdx: 0,
            },
            inputScript:
                '483045022100f97e3aa523d9b9569742e617f8d57d3d62cb7fcd8dddefba84ad6d8f6c8e3ca902206539749e1968e49e350863841ecfc6af6e3e557dac1943c921d0d1ce51861fae41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1380n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '83e8a2982f817fb9d9416ea6830848d00aef401658e68087c345339da67385d1',
                outIdx: 0,
            },
            inputScript:
                '483045022100d12b94da2836686007dd146fd254873cacf48ca4f8cb373ccfb55586a3be263a02206efc1857eb662b3c68493e3106c0124d5066dcb08f6c172facb9416a3cca1e9441210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1390n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'c66b5095f30ecdc60f97e390367c2adf528018f1035e683cca19a0af1f7fc734',
                outIdx: 0,
            },
            inputScript:
                '473044022070bf0c9e56991256f11af9522601a4b6721946a94c155df1272088374da8506e0220208552f1cc140b6fc45b0de7658f4b5393539dedcc124f2d5a23ce7efe020d2741210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1400n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '108f23996b06e1db55ca8fadc03587ece30db438c9b0cef3219bf81e97c93929',
                outIdx: 0,
            },
            inputScript:
                '483045022100f9d16180de35103075259edad7eb0185a2c679ee74ee4527c3299cbf2b1235db022035f5d60d75360a1f5b492ac59666da305bc833c15690a48712bfd3bd07108cad41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 10400n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '1d33bc2ffaf534dd9b21c57fde910fd2a48bb59e1a46916e29fb4aa6b3cb0d8c',
                outIdx: 0,
            },
            inputScript:
                '47304402203c3fe1d67fe2a126f69ed9b369ca9e6278c14579284c96beaefc6565e8a95d62022066709c55382ea723c0d30cc3f7b7c18fa3ff919b273859deb7b8849838c0e65141210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1410n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'deeade44d8c325976bbbc4ed4439d486e92630e6e24a01dee9cf0d3d917f87e7',
                outIdx: 0,
            },
            inputScript:
                '483045022100f04a8c5971377ef3657ad24cbd1153ee54a4eab0d5c70a1eecd4b9a6d26b82f702205c8856e60ea4c94439dd2ba6c1ec44bdd62b6d10c3e0aa0e338ced4e3b273d8841210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1420n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'b7aa94cbfbaa95ebaf89d3b99ca825c238a44f09062ca509d17b65652bb347c3',
                outIdx: 0,
            },
            inputScript:
                '473044022002dfc8134bccd2db489c16d80b96a1bb0388c65e2581ed9d9eee6e33612be4d7022036e6f7ffc27daf2d5bed23bf56fdd77b885ea43a5920e33556076efdc78a05d541210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1430n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '2128868ae0359373751c46160fea8029914b9e9a3a195213db7b38909ea1cf7a',
                outIdx: 0,
            },
            inputScript:
                '473044022036c81f11d312ee072977a5d625b68fa09db4499d33c94274bac2a146f69f651202202d2f02c76bc1aeb02c2756c84ba81a878b652384cf669831e81aa24f816a659741210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1440n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'c7e56112f298c56cd6111b457e763449aee0a9692b97bd6c80f9d3dde6fc3310',
                outIdx: 0,
            },
            inputScript:
                '47304402206c67d37becfb94ecdc2bcbf374348934c131555cfdd5b78db65c293ff074d7ec022005e0a2467ef9e313916e00a5e9fa34482f37d4bed0a13983bcf4b54456ff8d9a41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1460n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'fe7097a6914eaf6387cbd8e5dfd782bccb008b1185ce2e518a19569b0247024b',
                outIdx: 0,
            },
            inputScript:
                '47304402205f99486ccb64ba693115f1e5f5e73f05876c5b757b75641c02cb7c02c09da52c0220383f3629ded0f4c8e8b78607b5374a5cd7758f355a34fecff7855540e96e4ca141210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1470n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '167802579f3e23af196c3328885efd316f8a757286675cf6c646529583d68df3',
                outIdx: 0,
            },
            inputScript:
                '47304402204721a1f70e31df19d3c5975adf262edfb9a25cdc6eac938c910f6ad3e188ad1d02201c0b4dc4ef5851cd8d9d907c8d2876c1cbf585efd7c48b03e89bccda176591e641210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1480n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'e6c3e2e0e8b990b1506978eb62513f8f69bc9bad5715984001dddec0f251e1bf',
                outIdx: 0,
            },
            inputScript:
                '473044022023aae7ed74bfaa0f38b58c0ec26a1b5d88ac70cea251cb13dac977b6844c10c902203aabd4dd8740c62e4b01ac88d81f8f70495dc6ee83f610534ecfd098a90d016f41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1490n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'f1180c7649eb145574c6b3450ee244ada609f1b2a05ececed8c3af43e2ed6272',
                outIdx: 0,
            },
            inputScript:
                '47304402207db7b7e0e5d41bcf0f8af3a4101589a1327d0a497fd4a7ce6399c4085e6ce2d102205143a27f8c75763c10e81355e6dd9c18eb50cf107124d58e8093b750d69cca5e41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1490n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'f99278b2cb5457684966330164b8ee27b131313b614d3d54bd91cc2e6a82265f',
                outIdx: 0,
            },
            inputScript:
                '473044022028c3bd40e487a4f1663f019ae2954d7e3f9b8420a08c487c1410702b66d56e7b022031a1b01ce7f42c910574facf1031fada94eac2ab1d8edfb5346ee9ad2b2831f641210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1500n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'd7d34bde36c703d8f401832f1422185cc4c25acd9e65fa5635aa58d189dbe102',
                outIdx: 0,
            },
            inputScript:
                '47304402206f44301ddf80d818fd9db6a2c7e0ab65c7589022b2aead2178f3982858a03fca02201b6374e8314cc2a79187309c7b781030ef8b00595f0ba2cfe5da650c6216d73541210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1510n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '0aa8e97f9f2112b60db4395020fdddc7b2a93abddc8824e15b21ddc80a3900d7',
                outIdx: 0,
            },
            inputScript:
                '47304402206c91250082b80ad9859831c1b61bc0dafb3b0da6639bb862d0540c69e9576d6402201a6cfb3e21ae0f9e67e9e7ebc3bdf764ade2d3278b5fa21fabfc4c8738f234da41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1520n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'f663bd57bbfa2d9b72aa3f5b001d6a50ca56c1b11789ff8aba96d3cb1bd31f70',
                outIdx: 0,
            },
            inputScript:
                '47304402204a2d7e81abd32099a0dfeeda11a6c05cc696108acc145d92c5d5c496f0b69307022022105ac287550d8f33ba25b7206eabf5807d8bb4d2051dcc307b86b9bc6dfc3741210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1530n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '4148db649a3dd4cdc7651b937116b2325d675bfaf1c3da22f9d1bda8d69dfebd',
                outIdx: 0,
            },
            inputScript:
                '4730440220677784f32681855d38b38e5a43e2bc0d2fec47e622c78b717efcb2d0def0f3ad022010af29a7218860ee973292c24e0281db73aca0b6861afcea3eb82f4325cb279141210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1530n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '3356431e58c73c0c26d971d24b154a163a0338cc815d71408204e874d1b14970',
                outIdx: 0,
            },
            inputScript:
                '4730440220174327eb6d54456dc744b807fd4b76f233aa1fa17b1e7709bd1c23221d9191dc02205af7d5a97a85b14282a5e4c138ec6c7d0f9ec220b194c67dedf3e5d15da7550d41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1540n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'ecdd577ccdc7455239fc2de4ec37d6c986216c9f88ea8ac8ea9c11c7d8c4c4c3',
                outIdx: 0,
            },
            inputScript:
                '483045022100f41eab18eb3100bbcc2041244f863b4618bd2152ae86b11eb16e4978165c23cd022015d49a864cb1835030f232d9467c8042bc27d9eaff50db771effe88fdca885d841210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1550n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '212f2f720957facf44d353f319825fac5510dcb590a4c40f2880902b7d49d813',
                outIdx: 0,
            },
            inputScript:
                '483045022100e611405a361b82c86bc58f544314e0b3f0eddd3217d2ffcfa62ab5810584948e02202bc7b9a3ac21bf9f0804bb9e94987136043cf66d0740ba48ccdc165ec2b1f37f41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1560n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '3c464bb33eddd4d6b154a5fa34d8c84348814aa8427b3796cbfd78fe2ba6d9e0',
                outIdx: 0,
            },
            inputScript:
                '473044022031073ca855dbd63f2e8d5424be78781b5088cc73cb338d5a62290475c6091be302205788fb4ef343398248825c0301a7c74e52272a495bd1051eb01aca280b37567c41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1570n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'c0976d917ab60ac47169e17a103ba08b4520ee7bb1bdf1b579cdb14fc28f435c',
                outIdx: 0,
            },
            inputScript:
                '4730440220314798dbb0b3170520e392009a8634faf1bdd4f32a6e08d769f335432a1afcad02207048da8b93fb8aa910357a915fbc7fe468f17f407a9140b25bb1a1dae1535dc641210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1580n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '1dcefa13abcf04a7e055e2c7698353e7690730a48976eac89e1f3a9f1e3e8061',
                outIdx: 0,
            },
            inputScript:
                '473044022011b0ed47dddc3a82ed31b1a18ab550bb844d78ef239a09157d1f20f9ddb30f3e02205511a9218c18cc6e638831dd0230262d1859d2c228104fead6f4d95a6c0bde3641210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1590n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'b50c85ed88fc190032979bd56194c5e25b3c619fc22563405fa224981ca47660',
                outIdx: 0,
            },
            inputScript:
                '483045022100f5487c67b17e8fa8a4a5534258dceb5cdefd5a076c0ad429f11701685a3995fb02201c2b53e2acb4b4fe99db0c8ce407f65ca7aa57084c0d1b286b9eb928cdc9123e41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1600n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '54a6ca51bfd692e04803ac3b0dc32fdf1c08e4da9dc16515ff7929bdcbfdb840',
                outIdx: 0,
            },
            inputScript:
                '47304402200299fd809bea50ff28accd671257e1a85d1b289c1f8db5e4915734deae05d817022076ff59c2fb424d488591689f25ceb7d51053a8aec040a456b6422a5e90bb788041210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1610n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '204427871040783a43926e4f14a43fd3379136b6f189f8b392d2f2dea4b3c950',
                outIdx: 0,
            },
            inputScript:
                '483045022100e16a4ecbbf8ec11af5f7dbb43522b333b881fe964055e0589d1f56b4753b29b702202aeda60ed547f95c502c2ec635cf3725b86560adca1a650cfb19b2587e53368e41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1620n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '6114f419c2b7ed62febf719d58a9318f736575fc0ab2f1ed06934cab9c0d95f4',
                outIdx: 0,
            },
            inputScript:
                '47304402203d7af9cbcd91ec8bec60c27decae42ad6048a659052f160ea6b135b267bc76d102202d5a8f3e1d360b22173aca32ebc16a436f23489ec2be46afe9c81cf3b14ac5d641210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1630n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '6ff43f8fa23efbe29d54e074f7a4359979ca26497b0a153d4c3d48768c40b46b',
                outIdx: 0,
            },
            inputScript:
                '483045022100c55804d4f129b6f7a6765469ebf66144a9f64752e3e40b3b6a6ba11aae0071930220625ed9c4b840159b8bc81bebf91db15887beb1aa55a3ac0b0d2f1627dba6f0d441210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1630n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '92e6e05a8e01c5495793a8ae4588661c1b6e4e7b53168020b5074b2ac937f9fc',
                outIdx: 0,
            },
            inputScript:
                '4730440220029166621cd321c350153116103865bc42f1f84d95522533cc93d6bd02953c7b02201bb3a9f3912b88d575a1e3d60e3689d2779132fa6b3268bfbfce5c1998e652d641210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1640n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '38bde8b9667e76d4755b01e662c4abf5140544da28c26e87a1814e29992b63aa',
                outIdx: 0,
            },
            inputScript:
                '473044022017bca7479b1e67405819a96478417181e9b62a6d126b29e097de4661cc01629402205e7a76e2745b2f092a94e103655927c0f081c4b5b46abfb7d719ff1336bf97ac41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1650n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '84ce26f24db68be5c5b6b8ca64baac96914eb707ca1986bc96ef8142e0022c4a',
                outIdx: 0,
            },
            inputScript:
                '483045022100bb284a549b6ff618fa6d485297293192fde39e2665593a11e5a0865654741f5e02206a445415ed15f8ecbae5d6d90fd47ff0ff541a713521cc128a4e4b609851624141210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1660n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '85138b6c203b21fbfe3d54c8f2638039f68c1e4e59c3147daa044f5532afe978',
                outIdx: 0,
            },
            inputScript:
                '4830450221008f4462e27887f6a57d7068252feeb77119b757f6c5c86847f0b99052c43dd32d02203a9b59a4fbe1a074044da61d880cf10ed81cad33cae40004640c880c55233f0c41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1670n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'f0fbced92a1fa846a00596cd40ed9b1323a24349473ec0b4021b49472c7bfd29',
                outIdx: 0,
            },
            inputScript:
                '4730440220272bc400f151d18d0d5f19fff1c247ad1a5d7d215f5bd238513b4b6b9caf8cd302201d672f7d18e594087ec6b24e4aface500cb20ef09de8f765a87e7b15f3cd741441210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1680n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'd67f5497e8940d8a5686e9f432271ef3ebfedd4197413772ce64fc18ae1443c7',
                outIdx: 0,
            },
            inputScript:
                '4730440220028e93a9d587108919a5219370ab1760a87314da7198d77067b1f042545179d702204f49541731be881e8fc586bc457031ec4363f7a71e9ed7d49f9b7b26116c76b041210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 10000n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'e73f9f2d0ba99d6664dd8da2a7c28637d989ab6a03d20fdef6fb8e37154c9cf1',
                outIdx: 0,
            },
            inputScript:
                '483045022100dd8da977abf1b2826fe8df7754dd03a7602eb131aeeb64bfe40113ee33154c4a022012ac8c25d1e089714104cf0867b818b959688ef83f446ecbafa095e51b3a7d2241210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 11000n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '108a923ae68e00a445047bf3c4c6dd594d55f464b1a21f627f56df808218bace',
                outIdx: 0,
            },
            inputScript:
                '47304402201e7c599f2041f04b6aac329203a5776b71abd45b09963156e35551c1b7d837540220413acc322536219b7235235f9c12b0b2daa0494b5a72cc516f746605139012e841210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 12000n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'dea163e61534e4aed2da51077cacc5f1bfb65d9f287118719644772e2c0eeca3',
                outIdx: 0,
            },
            inputScript:
                '483045022100a0f0fd95a5bdf41c10f295ea1705792e2301af0e9c81bf5c018dd1e9c196194202207b783ef3aed112c5e3510c541bfd7b216dc89cc7b4de754147b9f0039f65e0e241210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 13000n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'deb63dfb5df4c30ad8893f5a79bd87031ef4f87fc3716248c451cc27c4edf5be',
                outIdx: 0,
            },
            inputScript:
                '4830450221008b4edfa0cda2c59a36fa189564144247b731938564f462bff9453f1c8db1ad7002206d3c553fec8fd17365ccb4fef8bb724cdad2de431e14306ca8695632001c3d7b41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 14000n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '18fef25c659e6b264e388fe274fc3a7d386ef468774f42e7290fc6d5e3af1320',
                outIdx: 0,
            },
            inputScript:
                '4830450221009a0877791357afbc2aecb9788acbb3ac10627ddfd29a5697a98fb3a1b6a3f59d022045682951b4ff2fa3aa76a332c6bb713df5fa2561da39eebc79bd8ef28ccac0ca41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 15000n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'ee94a10693cdcd3c3b1e171f983c400f510a7be867a0833fa7fc240dd6c9f149',
                outIdx: 0,
            },
            inputScript:
                '483045022100c46d94ce3a63875aed32f0185494f45f315d52a3ddc2ef21032d0b94ffb0ec8702200c50117154f3cdf5a824699812fdd96bff534bf30391391ec36d7bf2da834e4d41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 16000n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'cec9de5c7296bbebd3d9ec3da40a5da90e2915bb00e8ab263d9ecf266bf3cd52',
                outIdx: 0,
            },
            inputScript:
                '4730440220775b873f49bbef953c2ea146b737db327f615cb75698b438c9534cb891a8e5d30220499cde73bcb63273a756c733819108d0684fb7822e3c6e754d7b0bb55d448d7c41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 17000n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'e5639b4fef35807f0986aa0e7fa2814fe027d9d4d42c01315141ceef36f50bd8',
                outIdx: 0,
            },
            inputScript:
                '47304402207b3eaac1b30ae9f6ec09195189bf5d9c15962c84f76ece7f43f17412face37600220289cc651258b277bb94b70eba03560f464f4746bd0ec70d12444f414aabd4c7b41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 18000n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '7b685ced60deac82cab9045b2794e30d991e8155cc5b17046307fc8c18ab6f7d',
                outIdx: 0,
            },
            inputScript:
                '473044022036685cfbdb4791ae36d3c09e8af109787cfbda5c2348408a188fea723c418e4c0220765019480f691fef4ca4a32f3069dc9e4da797eff69cd58c02184fab0b66270641210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1000n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '820f74dd4914d9c231a65c795d30b07cd7e2d9034c58d9880e806963cd519791',
                outIdx: 0,
            },
            inputScript:
                '47304402202e68351ea3f61736fca1c0fd4a627b26de8188c6dd70ddb780d63596a70ea52702204d42610d86a0bf6bd887ff640888c7961e5dd1d24cd00fef3b5210fa2127c17c41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1010n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'eccb73e07e556888ef01dbcbe272ad3a093df22a4a1d265f18b814dc68b053c5',
                outIdx: 0,
            },
            inputScript:
                '473044022051dd5d93afa70a9cf86465b14fbea941ed68fb11faa766174117d81ccc3ef9390220574c23b8b1171e1d802038cf85da661b8fe47ccd7342cafa1174d1c92ad839c941210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1020n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'b4b055315d9c162653d0f0f8c1da223e4a6c79c69a98ed8f7761faec4ed429ef',
                outIdx: 0,
            },
            inputScript:
                '4730440220653b3a3a317288b79e6dfca0e2d9374f0bcc600d173b1114a8cadaff979f09e102207618e87419432b44bdef0c912c2e123af5c2bc91a54783a1d95b6f53dbef97c641210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1030n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '228b2b03636d4e7b7c9d808c973295786fff4841639d724840e9103e427cfbb9',
                outIdx: 0,
            },
            inputScript:
                '47304402206f3b2a887c702af71926ae282f35ec51908965403e4416988a4b9173a0b1328802206a5ef00bb0e2b4d2707a12535bc29d140abd7176f4b13933987e7afd48d9a51641210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1040n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '8fa3d295981f7d00067d4bf50f975f0b80aaff5c318a3ec79a3fa62546023d99',
                outIdx: 0,
            },
            inputScript:
                '473044022062846c2456e37ea475b0b08e8976005eafb2463984fa2918500256741e3e4719022018807cf18c6edb8bd1e7dbc25cd870356cbf99aa959f9838c863c566c3da135741210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1050n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'cf7161f41ae6da322bdcf05028d2cfe925866f3a432163c024fadf7354d89eef',
                outIdx: 0,
            },
            inputScript:
                '483045022100cb00c19e384743a9674be6a2551318ce7a9bd2be934f3bf934cc75cb5f75f05902207a6b72b6eca13110cde57e8fdb91e4182a1b54fcd3b3b304f0e52ba23380370c41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1070n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '5e33b1bf1a7f0fe3251cf811d172968787b48dbf1b37868718fddaa11cb84fd6',
                outIdx: 0,
            },
            inputScript:
                '4730440220524942fdddd3d26eca9400df9cbaa485fb06e19fd0da7a5d001923236fd77e1102206e2677b2e0a6d960403de35b6ff3e29f54d5aac19bdee1e4aaaca66cb28bc39241210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1090n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '9d5e87160b6d105d4cfe1d9fac8babd07b4692f1991d9dea2631827a615a438a',
                outIdx: 0,
            },
            inputScript:
                '483045022100c935a7daddfeb7f9fad0f5478a870ad2012d8b72ad214f108d7e28be473249da022074f09885973691682bfd349078a24df60bec2d03548ecb234157681b1340282141210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1100n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'a7c6a8f45f0e7faca3d430beaa42a7079f85f2a18779950d40a48637f26c4357',
                outIdx: 0,
            },
            inputScript:
                '473044022066a30d4dd0c0afc7252354b5c97feed9645806935af42d1431e3a8c0417d400a0220368299fcf1e8414c88ec203b6883ce76c118287c62efd6659fee00c36eeb062941210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1110n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'bb705feb9334b98fcc2e6fed21d1179829874484f1e065fdc5d205b1b3753f06',
                outIdx: 0,
            },
            inputScript:
                '473044022021db4e6200b3abba9c317cc7be2e05a08a3c40c86e915af33eb644f5fd4d845c022071782dc15ef37b640cc5bcc35fef83e2f8a85e2a9aee4ddadf2a402a005d8a2641210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1120n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'f78c4bffdbe24052d20db343ffe46ccdaf02192137e230f1995a6096a37b6039',
                outIdx: 0,
            },
            inputScript:
                '47304402206caba28761baa160e7112ff94bf5cac7425c0ea57a8ed4efa919921bcdf4001c02203c1b883c584a7fc97e8597aa88d84dff0b9376bfb15eb345b87cd52649eeab8d41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1130n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '26c0aa7de1612627796b571c7a14a3071e2c96ea3366c9790df455fa5eab4b3f',
                outIdx: 0,
            },
            inputScript:
                '47304402200aa6957eed0466618b9b5dbee92caa51d21e90ecfd3f31a5546377341bebc3b102202b9be42cb6ce493523308db83c4803ca4a64f0f3713c5e2ff532b9cfbf5a0ccf41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1140n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '4f66bf9e8320d32540faf22c9a1c225e15ad399026cfd9a8fddc275617aac237',
                outIdx: 0,
            },
            inputScript:
                '483045022100ee2f163c6522caa388c6f59a54bda5475a17674349ba8b4bddf423571485e6e602207637b549e89ffc21649995d65af5c96157cd4d47dc0fcd49cec0f6649e6b3c2241210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1150n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '5bd2b4307f3abf8077207544364414ebe2f68220d11c77d788fb2993bfded1e9',
                outIdx: 0,
            },
            inputScript:
                '483045022100a5b96373c284c03da571591f901679616b30c513e80f361748176d08ef77fa4902204dd52e876472ade12f73cd448afbe96850e5a5226e3c4e3adf9b6b091d92e09b41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1160n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'c9808df869d1e2957b6371b5385af97e3cc91967eed78afd37b4c972d4bafb95',
                outIdx: 0,
            },
            inputScript:
                '483045022100a25082572444b1014ff7af10915c01427ed9f048d15902247d9e6209edbf5c2f0220753d769fb4d226f9b5d867c6086b47338c128acff46f493984518cb165fa401741210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1170n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '4c2496a09f52501d191592075e2b723bbc9e976599b881456f590bd87509f7e9',
                outIdx: 0,
            },
            inputScript:
                '473044022037622b8f1248a78aacc47c58398bac1af29ad190e74d9cbdebd03641011c7c9b022033ea619ebb734e31a683b32e87fe50f9f2d18c2e3e457dd7b1f754840b00ddf841210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1180n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '602272f5602d3d998322c9b5dd0c837f13d28ba660e0905ecc7635c3e96ad8aa',
                outIdx: 0,
            },
            inputScript:
                '483045022100a45102a6ceaef1921b17768f4cd7a09bd4abf0ddbd9296f1375b71057ba0a019022078325fa1c5cd2b4f2dcf140fdb7ff1cfab203302572a531447dbaa6f2d0bd3d341210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1190n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '114513c07b4faa92341fc324b4ffb5244391c9c843fcbdeb1425e099e1717e3e',
                outIdx: 0,
            },
            inputScript:
                '483045022100d15593b29f5a6edf131b4b8febb5abf1179619533a12c8d7ce6272d0a79f857a02205948d8e23d7d01cf07cd9f1b6ebda9ba6e3228e6ad051c13f850e08dbe67039341210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1200n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'f46d133de7a2f74413a795087357ffd4a0ebadc4d011c42019431e78b679fc03',
                outIdx: 0,
            },
            inputScript:
                '47304402204a5c6c51eeaec4eb467e735cb5dea54048060eaaf7f22ba5139804378a95cd610220447f03bb9e338b9c220f74d154b974e751cef86fce7c7093bf48af8b514e22d841210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1210n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '1b065b91724b530858bd0168589edc36d381a607d4f595a96c0a3887b45f8b39',
                outIdx: 0,
            },
            inputScript:
                '473044022031c3be64ae92cf33f817d3c54b544c00c302a840e697d142c0839b44bcda3afb022073a96837c3e4d46fbba14685f846356e7af43596b1f24bb661b7fb3e4511718e41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1220n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '556f083f96b71e2f5aa060c1939e8616505381df275ec8101969482dcc627b43',
                outIdx: 0,
            },
            inputScript:
                '4730440220280487685077040632e224aa4a9c2eb1215d4c6b3b601feb4778915e033b87c702200bf2e0f3ca0a6b40e9c0d8e50e345844f5ec925045534b4bc504edded4eabf8841210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1230n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '37314425cba131bb44f9c65353450e9eb4ee7e76c22adfae685ca6859ae474d5',
                outIdx: 0,
            },
            inputScript:
                '47304402204629f075e2a3a3b38c64d427d4105a0e14398ff14627b5b08a9e361520aa000102205b0949d5c70798a0a90e7f2c98c07c6dfa5c74031a0330580d0a8fa45f84e87841210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1240n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'f2cb43738287f58da5c15dc441c7d223449d2b49d47e8e2b2ebe723850366e7c',
                outIdx: 0,
            },
            inputScript:
                '473044022034ff428fcab08a1a257038df2d7173dab09317428b01281b3f14a78824d227f5022038691625f7cf77d5df7f18fa4e40e2d648e5cf14703dbd4377c6dbcbd8e66c1541210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1250n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '054f441b4194ed1bf1550705250c6cab77b75a53de34ad5fad3c822b6c4f23fd',
                outIdx: 0,
            },
            inputScript:
                '47304402203eee679ee4dffc56b4e203711bf35f328daec653c7d333f4d52413b27da885fc022044399bfaa57c53e8b7d092b9417e9ba9902f76dec9e5e6743d4c02e21d6f935b41210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1260n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: '3371415aa270dfa4323ab62d8430975cac152aec9308855de6bd1275c01c0166',
                outIdx: 0,
            },
            inputScript:
                '47304402202406f36d5469f515aaeb96b356beffa84c6fb9fca3d2d828acc6c375470e201d0220264d42f87c1a2e132e1dfc3e02950daa6ef95d2cf9d5615a2de5e8bceb98794441210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1270n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
        {
            prevOut: {
                txid: 'da133d2f98d3cb3a66b8e4abf0ff1a19b31b92604faba1f855620a43e4930f07',
                outIdx: 0,
            },
            inputScript:
                '48304502210089d9ffcc120d48dda34e8ad7d0bbe73e26a765a2207f650a07caf68e62503de702207bebd26030f2d143eaecc19b810691d1057b1035cd7342408a13db68fe8ad52241210361c15c24d617d75b51bd057e418020b3e7a07d91a41ddd0365bf168b418f79f6',
            sats: 1270n,
            sequenceNo: 4294967295,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
        },
    ],
    outputs: [
        {
            sats: 0n,
            outputScript:
                '6a04534c500001010747454e45534953034354500f436173682054616220506f696e74731768747470733a2f2f636173687461626170702e636f6d2f4c0001090102080de0b6b3a7640000',
        },
        {
            sats: 546n,
            outputScript: '76a91419884c453167cf3011a3363b4b1ebd926bde059f88ac',
            token: {
                tokenId:
                    'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 1000000000000000000n,
                isMintBaton: false,
                entryIdx: 0,
            },
            spentBy: {
                txid: 'ff46ab7730194691b89301e7d5d4805c304db83522e8aa4e5fa8b592c8aecf41',
                outIdx: 1,
            },
        },
        {
            sats: 546n,
            outputScript: '76a91419884c453167cf3011a3363b4b1ebd926bde059f88ac',
            token: {
                tokenId:
                    'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 0n,
                isMintBaton: true,
                entryIdx: 0,
            },
            spentBy: {
                txid: '345cde8f670d8406104f9dab46e141ddba97973f80ccfed45809828e2a53250f',
                outIdx: 1,
            },
        },
        {
            sats: 91405165n,
            outputScript: '76a914f1f529e136738f1d93c5dc4be9306913a7f1855e88ac',
            spentBy: {
                txid: 'ff46ab7730194691b89301e7d5d4805c304db83522e8aa4e5fa8b592c8aecf41',
                outIdx: 0,
            },
        },
    ],
    lockTime: 0,
    timeFirstSeen: 0,
    size: 14491,
    isCoinbase: false,
    tokenEntries: [
        {
            tokenId:
                'bef614aac85c0c866f4d39e4d12a96851267d38d1bca5bdd6488bbd42e28b6b1',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            txType: 'GENESIS',
            isInvalid: false,
            burnSummary: '',
            failedColorings: [],
            actualBurnAtoms: 0n,
            intentionalBurnAtoms: 0n,
            burnsMintBatons: false,
        },
    ],
    tokenFailedParsings: [],
    tokenStatus: 'TOKEN_STATUS_NORMAL',
    block: {
        height: 660971,
        hash: '00000000000000000334795ce566d1202a804e71422d05c93beb6afc4eb99cf3',
        timestamp: 1605037203,
    },
};

// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Script, slpSend, fromHex } from 'ecash-lib';
import { AgoraOneshot, AgoraOffer } from 'ecash-agora';
import { decodeCashAddress } from 'ecashaddrjs';
import { ActiveCashtabWallet } from 'wallet';
import { Token } from 'chronik-client';

export const nftMarketWallet: ActiveCashtabWallet = {
    state: {
        balanceSats: 987865,
        slpUtxos: [
            {
                outpoint: {
                    txid: '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    outIdx: 2,
                },
                blockHeight: 853000,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP' as const,
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP' as const,
                        number: 129,
                    },
                    isMintBaton: true,
                    atoms: 0n,
                },
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 2,
                },
                blockHeight: 853000,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP' as const,
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP' as const,
                        number: 129,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 3,
                },
                blockHeight: 853000,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP' as const,
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP' as const,
                        number: 129,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 4,
                },
                blockHeight: 853000,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP' as const,
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP' as const,
                        number: 129,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 5,
                },
                blockHeight: 853000,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP' as const,
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP' as const,
                        number: 129,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 6,
                },
                blockHeight: 853000,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP' as const,
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP' as const,
                        number: 129,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 7,
                },
                blockHeight: 853000,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP' as const,
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP' as const,
                        number: 129,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 8,
                },
                blockHeight: 853000,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP' as const,
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP' as const,
                        number: 129,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 9,
                },
                blockHeight: 853000,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP' as const,
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP' as const,
                        number: 129,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 10,
                },
                blockHeight: 853000,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP' as const,
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP' as const,
                        number: 129,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 11,
                },
                blockHeight: 853000,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP' as const,
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP' as const,
                        number: 129,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                    outIdx: 12,
                },
                blockHeight: 853000,
                isCoinbase: false,
                isFinal: true,
                token: {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP' as const,
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP' as const,
                        number: 129,
                    },
                    isMintBaton: false,
                    atoms: 1n,
                },
                sats: 546n,
            },
        ],
        nonSlpUtxos: [
            {
                outpoint: {
                    txid: '0d029d72aa24838081385357738be213ef01693323dfecd090976b358be5cbb6',
                    outIdx: 2,
                },
                blockHeight: 853000,
                isCoinbase: false,
                isFinal: true,
                sats: 1754n,
            },
            {
                outpoint: {
                    txid: '72b34a8e646f81d91dfab33747f7b9176fb4db94fef47d16a6a31709c79e373a',
                    outIdx: 2,
                },
                blockHeight: 853000,
                isCoinbase: false,
                isFinal: true,
                sats: 986111n,
            },
        ],
        tokens: new Map([
            [
                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                '11',
            ],
        ]),
    },
    mnemonic:
        'awake task silly salmon always lonely illegal canal narrow soda hip flat',
    address: 'ecash:qplvc8a5eyfehtwjyu539xwsck9dw0clpqah3r8al9',
    hash: '7ecc1fb4c9139badd227291299d0c58ad73f1f08',
    sk: '13d5a0d64418638a4b8eeb6c0934df55106b960119d3b6c7203f412f006bdc25',
    pk: '038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71de',
    name: 'NFT Trading [BURNED]',
};

// NFTs with necessary mock data
const SLP_ONE_TOKEN_NUMBER = 65;
const BASE_AGORA_OFFER_TOKEN = {
    atoms: 1n,
    isMintBaton: false,
    tokenId: '0000000000000000000000000000000000000000000000000000000000000000',
    tokenType: {
        number: SLP_ONE_TOKEN_NUMBER,
        protocol: 'SLP' as const,
        type: 'SLP_TOKEN_TYPE_NFT1_CHILD' as const,
    },
};

// SATURN FIVE (Saturn V)
export const saturnFive = {
    groupTokenId:
        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
    tokenId: 'e2db39ade16e971afba2087bf6e29a83d7579137900eb73e5d955bdb769204bb',
    listPriceSatoshis: 100000,
    sellerAddress: 'ecash:qplvc8a5eyfehtwjyu539xwsck9dw0clpqah3r8al9',
    cancelPk: fromHex(nftMarketWallet.pk),
    outpoint: {
        outIdx: 1,
        txid: 'dc85418411897d28cec4a3ef817424f03006b52ae3cf9503caaa5b27a87e02c0',
    },
    groupCache: {
        genesisInfo: {
            tokenTicker: 'CLS',
            tokenName: 'Classics',
            url: 'cashtab.com',
            decimals: 0,
            hash: 'a6700396f7f7b6a49bf9517192d3264d3b22d7be37838a62cd5db77fd45865e0',
        },
        tokenType: {
            protocol: 'SLP' as const,
            type: 'SLP_TOKEN_TYPE_NFT1_GROUP' as const,
            number: 129,
        },
        genesisMintBatons: 0,
        genesisOutputScripts: [
            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
        ],
        genesisSupply: '12',
        timeFirstSeen: 0,
    },
    cache: {
        genesisInfo: {
            tokenTicker: 'S5',
            tokenName: 'Saturn V',
            url: 'en.wikipedia.org/wiki/Saturn_V',
            decimals: 0,
            hash: 'ce2f92283c966e1e0f98ecf79b5a9122aac5e32cb865ecf1953820710ee62969',
        },
        genesisMintBatons: 0,
        genesisOutputScripts: [
            '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
        ],
        genesisSupply: '1',
        groupTokenId:
            '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
        timeFirstSeen: 0,
        tokenType: {
            protocol: 'SLP' as const,
            type: 'SLP_TOKEN_TYPE_NFT1_CHILD' as const,
            number: 65,
        },
    },
};

const saturnFiveEnforcedOutputs = [
    {
        sats: BigInt(0),
        script: slpSend(saturnFive.groupTokenId, SLP_ONE_TOKEN_NUMBER, [
            0n,
            BigInt(1),
        ]),
    },
    {
        sats: BigInt(saturnFive.listPriceSatoshis),
        script: Script.p2pkh(
            fromHex(decodeCashAddress(saturnFive.sellerAddress).hash),
        ),
    },
];
const saturnFiveOneshot = new AgoraOneshot({
    enforcedOutputs: saturnFiveEnforcedOutputs,
    cancelPk: saturnFive.cancelPk,
});
export const saturnFiveAgoraOffer = new AgoraOffer({
    variant: {
        type: 'ONESHOT',
        params: saturnFiveOneshot,
    },
    status: 'OPEN',
    outpoint: saturnFive.outpoint,
    txBuilderInput: {
        prevOut: saturnFive.outpoint,
        signData: {
            sats: 546n,
            redeemScript: saturnFiveOneshot.script(),
        },
    },
    token: { ...BASE_AGORA_OFFER_TOKEN, tokenId: saturnFive.tokenId } as Token,
});

// Flags
export const transvaal = {
    groupTokenId:
        '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
    tokenId: 'c08d91411b4f76e55c35afa893420314ab156acb689b75b40c254eb10f580d3b',
    listPriceSatoshis: 6487200,
    sellerAddress: 'ecash:pqwc89dgxj293aqzh8k30dd2t8stckhzmqklh8l2zp',
    cancelPk: new Uint8Array(33),
    outpoint: {
        outIdx: 1,
        txid: '337617019dbe046ba8e3597b8240e3f9d303a504ca88b98346fded8784794347',
    },
    groupCache: {
        genesisInfo: {
            tokenTicker: 'FLAGS',
            tokenName: 'Flags',
            url: 'cashtab.com',
            decimals: 0,
            hash: '10b8a6aa2fa7b6dd9ebae9018851bf25bd84c14c80de3ee2bfd0badef668b90c',
        },
        tokenType: {
            protocol: 'SLP' as const,
            type: 'SLP_TOKEN_TYPE_NFT1_GROUP' as const,
            number: 129,
        },
        genesisMintBatons: 0,
        genesisOutputScripts: [
            '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
        ],
        genesisSupply: '190',
        timeFirstSeen: 0,
    },
    cache: {
        genesisInfo: {
            tokenTicker: 'TT3',
            tokenName: 'Transvaal Take 3',
            url: 'https://en.wikipedia.org/wiki/South_African_Republic',
            decimals: 0,
            hash: '77d7ee52d03d81a5b7b9acee2f7854a7f9fb287f94103c8fddb388742a24fe7c',
        },
        genesisMintBatons: 0,
        genesisOutputScripts: [
            '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
        ],
        genesisSupply: '1',
        groupTokenId:
            '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
        timeFirstSeen: 0,
        tokenType: {
            protocol: 'SLP' as const,
            type: 'SLP_TOKEN_TYPE_NFT1_CHILD' as const,
            number: 65,
        },
    },
};
const transvaalEnforcedOutputs = [
    {
        sats: BigInt(0),
        script: slpSend(transvaal.groupTokenId, SLP_ONE_TOKEN_NUMBER, [
            0n,
            BigInt(1),
        ]),
    },
    {
        sats: BigInt(transvaal.listPriceSatoshis),
        script: Script.p2pkh(
            fromHex(decodeCashAddress(transvaal.sellerAddress).hash),
        ),
    },
];
const transvaalOneshot = new AgoraOneshot({
    enforcedOutputs: transvaalEnforcedOutputs,
    cancelPk: transvaal.cancelPk,
});
export const transvaalAgoraOffer = new AgoraOffer({
    variant: {
        type: 'ONESHOT',
        params: transvaalOneshot,
    },
    status: 'OPEN',
    outpoint: transvaal.outpoint,
    txBuilderInput: {
        prevOut: transvaal.outpoint,
        signData: {
            sats: 546n,
            redeemScript: transvaalOneshot.script(),
        },
    },
    token: { ...BASE_AGORA_OFFER_TOKEN, tokenId: transvaal.tokenId } as Token,
});

export const argentina = {
    groupTokenId:
        '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
    tokenId: 'c64ff2282ccb00ee21e1c02a4801e53c246250459d03b7c824305538ebab73d3',
    listPriceSatoshis: 30000,
    sellerAddress: 'ecash:pzq3s6ghhvxxn9a4m0vartygt2ukxqrm5g8u0uwt9m',
    cancelPk: new Uint8Array(33),
    outpoint: {
        outIdx: 1,
        txid: '394d0464d623bdc6267c7e8766d4e56aab7e1d5ecf5f56d7fb29d3787b7035d7',
    },
    groupCache: {
        genesisInfo: {
            tokenTicker: 'FLAGS',
            tokenName: 'Flags',
            url: 'cashtab.com',
            decimals: 0,
            hash: '10b8a6aa2fa7b6dd9ebae9018851bf25bd84c14c80de3ee2bfd0badef668b90c',
        },
        tokenType: {
            protocol: 'SLP' as const,
            type: 'SLP_TOKEN_TYPE_NFT1_GROUP' as const,
            number: 129,
        },
        genesisMintBatons: 0,
        genesisOutputScripts: [
            '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
        ],
        genesisSupply: '190',
        timeFirstSeen: 0,
    },
    cache: {
        genesisInfo: {
            tokenTicker: 'ARG',
            tokenName: 'Argentina',
            url: 'https://en.wikipedia.org/wiki/Argentina',
            decimals: 0,
            hash: '0fff95599be8fbcafeccc403b7255931174b178e9742c823ce42901515eae4cb',
        },
        genesisMintBatons: 0,
        genesisOutputScripts: [
            '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
        ],
        genesisSupply: '1',
        groupTokenId:
            '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
        timeFirstSeen: 0,
        tokenType: {
            protocol: 'SLP' as const,
            type: 'SLP_TOKEN_TYPE_NFT1_CHILD' as const,
            number: 65,
        },
    },
};
const argentinaEnforcedOutputs = [
    {
        sats: BigInt(0),
        script: slpSend(argentina.groupTokenId, SLP_ONE_TOKEN_NUMBER, [
            0n,
            BigInt(1),
        ]),
    },
    {
        sats: BigInt(argentina.listPriceSatoshis),
        script: Script.p2pkh(
            fromHex(decodeCashAddress(argentina.sellerAddress).hash),
        ),
    },
];
const argentinaOneshot = new AgoraOneshot({
    enforcedOutputs: argentinaEnforcedOutputs,
    cancelPk: argentina.cancelPk,
});
export const argentinaAgoraOffer = new AgoraOffer({
    variant: {
        type: 'ONESHOT',
        params: argentinaOneshot,
    },
    status: 'OPEN',
    outpoint: argentina.outpoint,
    txBuilderInput: {
        prevOut: argentina.outpoint,
        signData: {
            sats: 546n,
            redeemScript: argentinaOneshot.script(),
        },
    },
    token: { ...BASE_AGORA_OFFER_TOKEN, tokenId: argentina.tokenId } as Token,
});

/**
 * token and tx mocks for all tokens needed
 * for NFT integration tests
 */

export const nftIntegrationTokenAndTxMocks = {
    '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc': {
        tx: {
            txid: '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '23b0d8651893382448b103eed760c0b3c6e428a231b5629d9f22632b66defb2e',
                        outIdx: 0,
                    },
                    inputScript:
                        '4120d5d5999c3e0ebe4396aa6057b351983dc7a670bbcc9ec9c4f28dda1be8dbec831ede7f150701bd303770db01bc0d960e3d266768d133cbbf5a521707537c304121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71de',
                    sats: 1000000n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04534c500001810747454e4553495303434c5308436c6173736963730b636173687461622e636f6d20a6700396f7f7b6a49bf9517192d3264d3b22d7be37838a62cd5db77fd45865e00100010208000000000000000c',
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                    token: {
                        tokenId:
                            '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        atoms: 12n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                        outIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                    token: {
                        tokenId:
                            '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        atoms: 0n,
                        isMintBaton: true,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 998206n,
                    outputScript:
                        '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                    spentBy: {
                        txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 349,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
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
            isFinal: true,
            block: {
                height: 853000,
                hash: '00000000000000001bb87bef1ddc687c02d584d59392108ff5321992a7d9c9d3',
                timestamp: 1720807766,
            },
        },
        token: {
            tokenId:
                '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                number: 129,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'CLS',
                tokenName: 'Classics',
                url: 'cashtab.com',
                decimals: 0,
                hash: 'a6700396f7f7b6a49bf9517192d3264d3b22d7be37838a62cd5db77fd45865e0',
            },
            block: {
                height: 853000,
                hash: '00000000000000001bb87bef1ddc687c02d584d59392108ff5321992a7d9c9d3',
                timestamp: 1720807766,
            },
        },
    },
    'e2db39ade16e971afba2087bf6e29a83d7579137900eb73e5d955bdb769204bb': {
        tx: {
            txid: 'e2db39ade16e971afba2087bf6e29a83d7579137900eb73e5d955bdb769204bb',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                        outIdx: 2,
                    },
                    inputScript:
                        '410e1bc1af1ec11db40ec3338ef6ce9946a392752026c8a8c673f1ec69399189e567cb634f571824ddfd6d6170ada6269b5c9a7acded0cf6ffc174a99de3c1a7ef4121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71de',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        atoms: 1n,
                        isMintBaton: false,
                        entryIdx: 1,
                    },
                    outputScript:
                        '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                },
                {
                    prevOut: {
                        txid: '9f4be3d53933e5a8a05a30145cf0126a39c533c39fa7a2f99ea5fdad37795d0e',
                        outIdx: 1,
                    },
                    inputScript:
                        '413bf714bc792df889afbeb43671a56031e158675fa1903bd97b3d8be8b2ba6935e621a7661e8130fd278c0b620b86f4cdfc4df37720ca0b52483f99689319cb584121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71de',
                    sats: 954194n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04534c500001410747454e455349530253350853617475726e20561e656e2e77696b6970656469612e6f72672f77696b692f53617475726e5f5620ce2f92283c966e1e0f98ecf79b5a9122aac5e32cb865ecf1953820710ee6296901004c00080000000000000001',
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                    token: {
                        tokenId:
                            'e2db39ade16e971afba2087bf6e29a83d7579137900eb73e5d955bdb769204bb',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        atoms: 1n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '6fe7b81691bbe1455adc5b9de5f2db96e1dde9562c50539cc411e348a3c3fb9e',
                        outIdx: 0,
                    },
                },
                {
                    sats: 953241n,
                    outputScript:
                        '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                    spentBy: {
                        txid: '7178ac04268db5f526a899ed1e0bfadd24580241f94bfcc6b21eb0658aa33d6e',
                        outIdx: 2,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 474,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'e2db39ade16e971afba2087bf6e29a83d7579137900eb73e5d955bdb769204bb',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    txType: 'GENESIS',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                    burnsMintBatons: false,
                    groupTokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                },
                {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    txType: 'NONE',
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
            isFinal: true,
            block: {
                height: 861567,
                hash: '00000000000000001be902c2068d3848695eea5aa539383636ec62f5814fb9c8',
                timestamp: 1725914985,
            },
        },
        token: {
            tokenId:
                'e2db39ade16e971afba2087bf6e29a83d7579137900eb73e5d955bdb769204bb',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                number: 65,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'S5',
                tokenName: 'Saturn V',
                url: 'en.wikipedia.org/wiki/Saturn_V',
                decimals: 0,
                hash: 'ce2f92283c966e1e0f98ecf79b5a9122aac5e32cb865ecf1953820710ee62969',
            },
            block: {
                height: 861567,
                hash: '00000000000000001be902c2068d3848695eea5aa539383636ec62f5814fb9c8',
                timestamp: 1725914985,
            },
        },
    },
    '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316': {
        tx: {
            txid: '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'd86269d91e8e48aaed24dc05f0a1d9316d90cd0b316d0aa65c3db62d3d55854b',
                        outIdx: 2,
                    },
                    inputScript:
                        '41c75e59af0509f230cb5c5bdb533aaa328739a2b0b9ce7ab70bd168bdd9f074db343a5537012539ea262bd21178b87a176553db1fb50d59347b24cf2f3a81ac8341210303c463774d543f31cb8daedc2610e25f62f6e59868e01533a71765896de2c71d',
                    sats: 1163282n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04534c500001810747454e4553495305464c41475305466c6167730b636173687461622e636f6d2010b8a6aa2fa7b6dd9ebae9018851bf25bd84c14c80de3ee2bfd0badef668b90c010001020800000000000000be',
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
                    token: {
                        tokenId:
                            '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        atoms: 190n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'a041ad156aef884e1105dd336b8706668d92d7c57d825d516dba925eec6d02fd',
                        outIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
                    token: {
                        tokenId:
                            '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        atoms: 0n,
                        isMintBaton: true,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 1161490n,
                    outputScript:
                        '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
                    spentBy: {
                        txid: 'e9e99c450dc442cd9f25c647882a8d3403fef31433a2e52a2545fa49997f8f12',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 348,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
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
            isFinal: true,
            block: {
                height: 851583,
                hash: '00000000000000000a2ef4ea25215f42bb9f45f125a682f09c22004d4355fb28',
                timestamp: 1719963566,
            },
        },
        token: {
            tokenId:
                '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                number: 129,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'FLAGS',
                tokenName: 'Flags',
                url: 'cashtab.com',
                decimals: 0,
                hash: '10b8a6aa2fa7b6dd9ebae9018851bf25bd84c14c80de3ee2bfd0badef668b90c',
            },
            block: {
                height: 851583,
                hash: '00000000000000000a2ef4ea25215f42bb9f45f125a682f09c22004d4355fb28',
                timestamp: 1719963566,
            },
        },
    },
    'c08d91411b4f76e55c35afa893420314ab156acb689b75b40c254eb10f580d3b': {
        tx: {
            txid: 'c08d91411b4f76e55c35afa893420314ab156acb689b75b40c254eb10f580d3b',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'a041ad156aef884e1105dd336b8706668d92d7c57d825d516dba925eec6d02fd',
                        outIdx: 4,
                    },
                    inputScript:
                        '4138c4cff3f131d88c4e5fba05a167f6f97a407cf31a18db0d51edeff88f9cba335e9008f5e4fe7835a6f58b5026c3ecca324f3b0cb66cd4a18be33bc9497d661d41210303c463774d543f31cb8daedc2610e25f62f6e59868e01533a71765896de2c71d',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        atoms: 1n,
                        isMintBaton: false,
                        entryIdx: 1,
                    },
                    outputScript:
                        '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
                },
                {
                    prevOut: {
                        txid: '322d2d6a5c29c1cd76abe42fd99efc40bec5a589cc66945ecc13ff44a8cf5261',
                        outIdx: 2,
                    },
                    inputScript:
                        '415243db55d77bec4e135a67b020a30b00a82835f3a06f36f38f98c03f960d77fa56741685514687433602c23ad651580f6250236280fe2bc16023863886eb23e341210303c463774d543f31cb8daedc2610e25f62f6e59868e01533a71765896de2c71d',
                    sats: 1239962n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04534c500001410747454e4553495303545433105472616e737661616c2054616b6520333468747470733a2f2f656e2e77696b6970656469612e6f72672f77696b692f536f7574685f4166726963616e5f52657075626c69632077d7ee52d03d81a5b7b9acee2f7854a7f9fb287f94103c8fddb388742a24fe7c01004c00080000000000000001',
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
                    token: {
                        tokenId:
                            'c08d91411b4f76e55c35afa893420314ab156acb689b75b40c254eb10f580d3b',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        atoms: 1n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'bc83e442270acb0d3206de2af7a1f07b52a6090a7d4b7b008fd0fdbc14a234ca',
                        outIdx: 0,
                    },
                },
                {
                    sats: 1238946n,
                    outputScript:
                        '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
                    spentBy: {
                        txid: 'bc83e442270acb0d3206de2af7a1f07b52a6090a7d4b7b008fd0fdbc14a234ca',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 505,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'c08d91411b4f76e55c35afa893420314ab156acb689b75b40c254eb10f580d3b',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    txType: 'GENESIS',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                    burnsMintBatons: false,
                    groupTokenId:
                        '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
                },
                {
                    tokenId:
                        '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    txType: 'NONE',
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
            isFinal: true,
            block: {
                height: 851692,
                hash: '000000000000000000249e7811d0d2c7993b2937ccf3c63048915270f2634476',
                timestamp: 1720012233,
            },
        },
        token: {
            tokenId:
                'c08d91411b4f76e55c35afa893420314ab156acb689b75b40c254eb10f580d3b',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                number: 65,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'TT3',
                tokenName: 'Transvaal Take 3',
                url: 'https://en.wikipedia.org/wiki/South_African_Republic',
                decimals: 0,
                hash: '77d7ee52d03d81a5b7b9acee2f7854a7f9fb287f94103c8fddb388742a24fe7c',
            },
            block: {
                height: 851692,
                hash: '000000000000000000249e7811d0d2c7993b2937ccf3c63048915270f2634476',
                timestamp: 1720012233,
            },
        },
    },
    'c64ff2282ccb00ee21e1c02a4801e53c246250459d03b7c824305538ebab73d3': {
        tx: {
            txid: 'c64ff2282ccb00ee21e1c02a4801e53c246250459d03b7c824305538ebab73d3',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'a041ad156aef884e1105dd336b8706668d92d7c57d825d516dba925eec6d02fd',
                        outIdx: 7,
                    },
                    inputScript:
                        '41b6cdfffc12ffbb3d0576cedbf3555be2a5f352a17c1f063bf5ecbbb94072db13ab8fb3a8554f5765c11b82608efa7f2fa90d6ffe71cd42e2eba93c76ac60cee241210303c463774d543f31cb8daedc2610e25f62f6e59868e01533a71765896de2c71d',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        atoms: 1n,
                        isMintBaton: false,
                        entryIdx: 1,
                    },
                    outputScript:
                        '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
                },
                {
                    prevOut: {
                        txid: '849d7fb131b191aa050d3364caceac695b4dbeba66adfbd84d15afc1bbbdb688',
                        outIdx: 2,
                    },
                    inputScript:
                        '41e7ad51f37ec73bef3a0f7b701307110a87794fefbdf7927851fb0df4bc1679ce74109e5bd349b8a854e0a411a461af5d7e201f8623b4da967cfd1682eb65fb4f41210303c463774d543f31cb8daedc2610e25f62f6e59868e01533a71765896de2c71d',
                    sats: 791n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
                },
                {
                    prevOut: {
                        txid: 'bf8ca012a6a63cb29357c6721b3118a34363b5e3672431449e257c5694e5828c',
                        outIdx: 2,
                    },
                    inputScript:
                        '419a8a790c8a15d99c30d4ec2c3ad6090b6750ae9a1f344f0b17681d8b57f8fbd5438c3592cc87393487f667fbeca6d9830bf07edb2a910f8b95f4c4d1266b10eb41210303c463774d543f31cb8daedc2610e25f62f6e59868e01533a71765896de2c71d',
                    sats: 1754n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04534c500001410747454e455349530341524709417267656e74696e612768747470733a2f2f656e2e77696b6970656469612e6f72672f77696b692f417267656e74696e61200fff95599be8fbcafeccc403b7255931174b178e9742c823ce42901515eae4cb01004c00080000000000000001',
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
                    token: {
                        tokenId:
                            'c64ff2282ccb00ee21e1c02a4801e53c246250459d03b7c824305538ebab73d3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        atoms: 1n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '6847c08cc2396050dfc10590848ae7a1132813d90ecec407555037d5e6155d85',
                        outIdx: 0,
                    },
                },
                {
                    sats: 1286n,
                    outputScript:
                        '76a914ef9ed343e3e9ef97b589145625d69c26407ae09988ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 626,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'c64ff2282ccb00ee21e1c02a4801e53c246250459d03b7c824305538ebab73d3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    txType: 'GENESIS',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                    burnsMintBatons: false,
                    groupTokenId:
                        '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
                },
                {
                    tokenId:
                        '0fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab316',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    txType: 'NONE',
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
            isFinal: true,
            block: {
                height: 861069,
                hash: '0000000000000000081e9bf75143d95883f5a6c5c3730f2a7518c3d64fbcd1a6',
                timestamp: 1725627766,
            },
        },
        token: {
            tokenId:
                'c64ff2282ccb00ee21e1c02a4801e53c246250459d03b7c824305538ebab73d3',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                number: 65,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'ARG',
                tokenName: 'Argentina',
                url: 'https://en.wikipedia.org/wiki/Argentina',
                decimals: 0,
                hash: '0fff95599be8fbcafeccc403b7255931174b178e9742c823ce42901515eae4cb',
            },
            block: {
                height: 861069,
                hash: '0000000000000000081e9bf75143d95883f5a6c5c3730f2a7518c3d64fbcd1a6',
                timestamp: 1725627766,
            },
        },
    },
    '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794': {
        tx: {
            txid: '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                        outIdx: 1,
                    },
                    inputScript:
                        '410fcaa044599c5b81e3e3183262307fb38373299cf5a815b35b517e2d82a42f318d116a445ca322ac724f4b16bbc090936bce955600e12c1523339841622eaf8d4121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71de',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        atoms: 1n,
                        isMintBaton: false,
                        entryIdx: 1,
                    },
                    outputScript:
                        '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                },
                {
                    prevOut: {
                        txid: '91b3c836bd5c654f4c71179798d61800e986376d767fc1dca8ea83f340b744bf',
                        outIdx: 13,
                    },
                    inputScript:
                        '41fe365a742dd691ac847bd2919cc4e15a2d5fa7753c3e9091efe101e9c507ee209c8389999f3872a74181b3abd079601144b3c7d073a2c035f41cac2c95575b4f4121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71de',
                    sats: 990397n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04534c500001410747454e45534953063639463235300e3139363920466f7264204632353023656e2e77696b6970656469612e6f72672f77696b692f466f72645f462d53657269657320462840cc9a384225f46225ef5179a3cb1becbbf2920f7420ab37da4a5bcf8bb101004c00080000000000000001',
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                    token: {
                        tokenId:
                            '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        atoms: 1n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '72b34a8e646f81d91dfab33747f7b9176fb4db94fef47d16a6a31709c79e373a',
                        outIdx: 0,
                    },
                },
                {
                    sats: 989414n,
                    outputScript:
                        '76a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac',
                    spentBy: {
                        txid: '72b34a8e646f81d91dfab33747f7b9176fb4db94fef47d16a6a31709c79e373a',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 489,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    txType: 'GENESIS',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                    burnsMintBatons: false,
                    groupTokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                },
                {
                    tokenId:
                        '631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    txType: 'NONE',
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
            isFinal: true,
            block: {
                height: 853000,
                hash: '00000000000000001bb87bef1ddc687c02d584d59392108ff5321992a7d9c9d3',
                timestamp: 1720807766,
            },
        },
        token: {
            tokenId:
                '9f0f14f88fc78f64394eee852bac2617a38fac577fdb8097b2f596b1dc25b794',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                number: 65,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: '69F250',
                tokenName: '1969 Ford F250',
                url: 'en.wikipedia.org/wiki/Ford_F-Series',
                decimals: 0,
                hash: '462840cc9a384225f46225ef5179a3cb1becbbf2920f7420ab37da4a5bcf8bb1',
            },
            block: {
                height: 853000,
                hash: '00000000000000001bb87bef1ddc687c02d584d59392108ff5321992a7d9c9d3',
                timestamp: 1720807766,
            },
        },
    },
    '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109': {
        tx: {
            txid: '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '0e737a2f6373649341b406334341202a5ddbbdb389c55da40570b641dc23d036',
                        outIdx: 1,
                    },
                    inputScript:
                        '473044022055444db90f98b462ca29a6f51981da4015623ddc34dc1f575852426ccb785f0402206e786d4056be781ca1720a0a915b040e0a9e8716b8e4d30b0779852c191fdeb3412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sats: 6231556n,
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04534c500001010747454e45534953044245415207426561724e69701468747470733a2f2f636173687461622e636f6d2f4c0001004c0008000000000000115c',
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                        tokenType: {
                            protocol: 'SLP' as const,
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE' as const,
                            number: 1,
                        },
                        atoms: 4444n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '9e7f91826cfd3adf9867c1b3d102594eff4743825fad9883c35d26fb3bdc1693',
                        outIdx: 1,
                    },
                },
                {
                    sats: 6230555n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '27a2471afab33d82b9404df12e1fa242488a9439a68e540dcf8f811ef39c11cf',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 299,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
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
            isFinal: true,
            block: {
                height: 782665,
                hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
                timestamp: 1678408305,
            },
        },
        token: {
            tokenId:
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            timeFirstSeen: 0,
            genesisInfo: {
                tokenTicker: 'BEAR',
                tokenName: 'BearNip',
                url: 'https://cashtab.com/',
                decimals: 0,
                hash: '',
            },
            block: {
                height: 782665,
                hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
                timestamp: 1678408305,
            },
        },
    },
};

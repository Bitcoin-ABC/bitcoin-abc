// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ActiveCashtabWallet } from 'wallet';

const wallet: ActiveCashtabWallet = {
    mnemonic:
        'beauty shoe decline spend still weird slot snack coach flee between paper',
    name: 'Transaction Fixtures',
    hash: '3a5fb236934ec078b4507c303d3afd82067f8fc1',
    address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
    sk: '512d34d3b8f4d269219fd087c80e22b0212769227226dd6b23966cf0aa2f167f',
    pk: '031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
    state: {
        balanceSats: 135000,
        slpUtxos: [],
        nonSlpUtxos: [
            {
                outpoint: {
                    txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
                    outIdx: 0,
                },
                blockHeight: -1,
                isCoinbase: false,
                isFinal: true,
                sats: 25000n,
            },
            {
                outpoint: {
                    txid: '901406ff35293a6a75388ae48cf672010e3d06e56f2d030aff29ad359425fb09',
                    outIdx: 0,
                },
                blockHeight: -1,
                isCoinbase: false,
                isFinal: true,
                sats: 100000n,
            },
            {
                outpoint: {
                    txid: 'bc202cce79a686c8c846fad372677a07fa7821980aab95a1fb6bcf86f53f3450',
                    outIdx: 0,
                },
                blockHeight: -1,
                isCoinbase: false,
                isFinal: true,
                sats: 10000n,
            },
        ],
        tokens: new Map(),
    },
};

const walletWithCoinbaseUtxos: ActiveCashtabWallet = {
    mnemonic:
        'beauty shoe decline spend still weird slot snack coach flee between paper',
    name: 'Transaction Fixtures',
    hash: '3a5fb236934ec078b4507c303d3afd82067f8fc1',
    address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
    sk: '512d34d3b8f4d269219fd087c80e22b0212769227226dd6b23966cf0aa2f167f',
    pk: '031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
    state: {
        balanceSats: 135000,
        slpUtxos: [],
        nonSlpUtxos: [
            {
                outpoint: {
                    txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
                    outIdx: 0,
                },
                blockHeight: 800000,
                isCoinbase: true,
                isFinal: true,
                sats: 25000n,
            },
            {
                outpoint: {
                    txid: '901406ff35293a6a75388ae48cf672010e3d06e56f2d030aff29ad359425fb09',
                    outIdx: 0,
                },
                blockHeight: 800000,
                isCoinbase: true,
                isFinal: true,
                sats: 100000n,
            },
            {
                outpoint: {
                    txid: 'bc202cce79a686c8c846fad372677a07fa7821980aab95a1fb6bcf86f53f3450',
                    outIdx: 0,
                },
                blockHeight: 800000,
                isCoinbase: true,
                isFinal: true,
                sats: 10000n,
            },
        ],
        tokens: new Map([]),
    },
};

// Create a wallet with very large utxos
const TOTAL_ECASH_SUPPLY_SATS = 2100000000000000n;
const allTheXecWallet = structuredClone(wallet);
const largeUtxo = {
    outpoint: {
        txid: '6854f1eeed12293926e0223e0b59f9b3db3650fe486680ca7d705a0c990b1dc3',
        outIdx: 0,
    },
    blockHeight: -1,
    isCoinbase: false,
    isFinal: true,
    sats: TOTAL_ECASH_SUPPLY_SATS,
};

allTheXecWallet.state.nonSlpUtxos = [largeUtxo];
(allTheXecWallet as ActiveCashtabWallet).state.balanceSats = Number(
    largeUtxo.sats,
);

const walletWithTokensInNode: ActiveCashtabWallet = {
    mnemonic:
        'industry limit sense cruel neglect loud chase usual advance method talk come',
    name: 'SLP V1 Send',
    hash: 'c38232a045a85c84e5733d60e867dcee9ad4b18d',
    address: 'ecash:qrpcyv4qgk59ep89wv7kp6r8mnhf449335wt7lud8u',
    sk: '3c0898e4d10337cb51a651fe3ff6653a5683cbe9ce1698094463e48372e9bbfb',
    pk: '03b9fefe35855c7bf75f3132718b2107bb30d0d1f0193fdb8a11f9cb781fc7c921',
    state: {
        balanceSats: 1000000,
        slpUtxos: [
            {
                outpoint: {
                    txid: '4fa08436ac4611ee2523eede281c4c8d7c1d1a9367661e1754775d8b7ae2b199',
                    outIdx: 1,
                },
                token: {
                    tokenType: {
                        number: 1,
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    },
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    isMintBaton: false,
                    atoms: 1000000000n,
                },
                isCoinbase: false,
                isFinal: true,
                blockHeight: 800000,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '51bc5da566c85b486b37f1c4d3c0220b7bc11ad992c1b92f99233cf35a8794c1',
                    outIdx: 1,
                },
                token: {
                    tokenType: {
                        number: 1,
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    },
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    isMintBaton: false,
                    atoms: 9999996998999999999n,
                },
                isCoinbase: false,
                isFinal: true,
                blockHeight: 800000,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: '56cc72b07a374990d767a569120308812d0da4ef0c0d669a1966a648e759669a',
                    outIdx: 1,
                },
                token: {
                    tokenType: {
                        number: 1,
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    },
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    isMintBaton: false,
                    atoms: 1000000000000n,
                },
                isCoinbase: false,
                isFinal: true,
                blockHeight: 800000,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'c294d534331256c1f00016fb487f0079b926ab69bd8339350e4c356a1e17dc0d',
                    outIdx: 1,
                },
                token: {
                    tokenType: {
                        number: 1,
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    },
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    isMintBaton: false,
                    atoms: 1n,
                },
                isCoinbase: false,
                isFinal: true,
                blockHeight: 800000,
                sats: 546n,
            },
            {
                outpoint: {
                    txid: 'd8c694714c2d39a22b8d867530f37e796937ac4b9bc7c9528926649788d15f43',
                    outIdx: 1,
                },
                token: {
                    tokenType: {
                        number: 1,
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    },
                    tokenId:
                        'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                    isMintBaton: false,
                    atoms: 2000000000000n,
                },
                isCoinbase: false,
                isFinal: true,
                blockHeight: 800000,
                sats: 546n,
            },
        ],
        nonSlpUtxos: [
            {
                outpoint: {
                    txid: 'a8652388d3a5d1fcaec435a89f1af19afa32b479815b0e4292eec0db9c1a454b',
                    outIdx: 0,
                },
                blockHeight: -1,
                isCoinbase: false,
                isFinal: false,
                sats: 1000000n,
            },
        ],
        tokens: new Map([
            [
                'b19b4c83056f6e3dace0e786446a8ccd73f22cfc42c3013808c532ab43490a14',
                '10000000000',
            ],
        ]),
    },
};

module.exports = {
    wallet,
    walletWithCoinbaseUtxos,
    allTheXecWallet,
    walletWithTokensInNode,
};

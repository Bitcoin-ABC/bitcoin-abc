// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { Tx } from 'chronik-client';
import { parseTx } from './parseTx';
import { getTxNotificationMsg } from './getTxNotificationMsg';

const TOKEN_BUTTER =
    '488fb8fb66ce0a0a3800b83720d45b7d5acd5337b4aba71d63590708bfb4688c';
const TOKEN_GUNS =
    '4b7ac96d8348e48d7935bddb5d3cd1352f5e8f02a1ce4b6091cb63473b27056c';

/** Buyer (Cashtab test wallet) */
const BUYER_HASH = '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d';
/** LP sales wallet (seller inventory + postage) */
const SELLER_HASH = '4552019a7d57c0bb0260f22a243959a1ec19b9e3';
/** Maker/LP fee: ecash:qqk7skx0u94avx4znwfj2ryv49plngf855v32pfn3c */
const MAKER_FEE_HASH = '2de858cfe16bd61aa29b93250c8ca943f9a127a5';
/** Platform fee: ecash:qqfuy9k04vxglgqy8v5f6p89ks7h94msycf95lpern */
const PLATFORM_FEE_HASH = '13c216cfab0c8fa0043b289d04e5b43d72d77026';

/**
 * Confirmed alp-dex settle (exact-in 1.0 BUTTER → Guns).
 * https://explorer.e.cash/tx/f5f7e211cd673eba886292752224b21bdfeaf801cafef358d7e5512630f0eb6c
 */
const alpDexSettleTx = {
    txid: 'f5f7e211cd673eba886292752224b21bdfeaf801cafef358d7e5512630f0eb6c',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: 'b4fe7143e352fef9cfb02f4a6350f4020500d105585bfb08dc7c81409b115655',
                outIdx: 1,
            },
            inputScript:
                '41051ba57dcd8697ad37c5ad95d15b2231773fc0242939689fc9fc47d63304ba58611b25aec54848ae2a86e13f2e2eb774ae3c149ad0ac4bd517401c8677cefe66c12103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
            sats: 546n,
            sequenceNo: 4294967295,
            token: {
                tokenId: TOKEN_BUTTER,
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
                atoms: 1000000n,
                isMintBaton: false,
                entryIdx: 0,
            },
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
        },
        {
            prevOut: {
                txid: '722ab3fff8cd09372ffe3047b92fcc9666eefd8630be8835c40ab5c3ff0e4c15',
                outIdx: 1,
            },
            inputScript:
                '418d9accf09b29ab077adbeb98a98b5414c4578bf7451e319fa0525430dd34cda51bf94cc18fd4a3ea3cebc1dee31fac0c256445aca0e792c8b25d09631d0b07a6412102171e4a9cd90645ae27facf07ed0f4579b6a6198052ce795ba09b5508e7e554f1',
            sats: 546n,
            sequenceNo: 4294967295,
            token: {
                tokenId: TOKEN_GUNS,
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
                atoms: 2000n,
                isMintBaton: false,
                entryIdx: 1,
            },
            outputScript: '76a9144552019a7d57c0bb0260f22a243959a1ec19b9e388ac',
        },
        {
            prevOut: {
                txid: '4651ad4962c560e82bf7fa484cc6fb8edf8cf061e575886b1b01ae4431f77c93',
                outIdx: 2,
            },
            inputScript:
                '41c6bc8fe2d6f8c8883d8584577127330c93a210a17b385752bf6d35fcea51f7bcd7e2144b207dfd005ad8d27b91b7cd5a4ad3c69d11efa351c11e2df4f40b91d2412102171e4a9cd90645ae27facf07ed0f4579b6a6198052ce795ba09b5508e7e554f1',
            sats: 1340n,
            sequenceNo: 4294967295,
            outputScript: '76a9144552019a7d57c0bb0260f22a243959a1ec19b9e388ac',
        },
        {
            prevOut: {
                txid: 'a0b647e655191bba1a95c8b63a65c584decbc333c577506ae1c50b7f756c652b',
                outIdx: 2,
            },
            inputScript:
                '4191654892c464a2bcab118bee5b679906ab65c85185af18f910e3ef463c4ab7a28e67ce822e5374e5fe15ee909b41d94877937cd4a8e265f3f0511e99892e0203412102171e4a9cd90645ae27facf07ed0f4579b6a6198052ce795ba09b5508e7e554f1',
            sats: 9440n,
            sequenceNo: 4294967295,
            outputScript: '76a9144552019a7d57c0bb0260f22a243959a1ec19b9e388ac',
        },
    ],
    outputs: [
        {
            sats: 0n,
            outputScript:
                '6a504c4f534c5032000453454e448c68b4bf080759631da7abb43753cd5a7d5bd42037b800380a0ace66fbb88f4806a326000000006300000000000a0000000000000000000000000000000000301b0f00000049534c5032000453454e446c05273b4763cb91604bcea1028f5e2f35d13c5ddbbd35798de448836dc97a4b050000000000000000000000000000000000006200000000006e0700000000',
        },
        {
            sats: 546n,
            outputScript: '76a9149ee291ccce035e375060873f38d848a3cc6a09d288ac',
            token: {
                tokenId: TOKEN_BUTTER,
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
                atoms: 9891n,
                isMintBaton: false,
                entryIdx: 0,
            },
        },
        {
            sats: 546n,
            outputScript: '76a9142de858cfe16bd61aa29b93250c8ca943f9a127a588ac',
            token: {
                tokenId: TOKEN_BUTTER,
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
                atoms: 99n,
                isMintBaton: false,
                entryIdx: 0,
            },
        },
        {
            sats: 546n,
            outputScript: '76a91413c216cfab0c8fa0043b289d04e5b43d72d7702688ac',
            token: {
                tokenId: TOKEN_BUTTER,
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
                atoms: 10n,
                isMintBaton: false,
                entryIdx: 0,
            },
        },
        {
            sats: 546n,
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            token: {
                tokenId: TOKEN_GUNS,
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
                atoms: 98n,
                isMintBaton: false,
                entryIdx: 1,
            },
        },
        {
            sats: 546n,
            outputScript: '76a9149ee291ccce035e375060873f38d848a3cc6a09d288ac',
            token: {
                tokenId: TOKEN_GUNS,
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
                atoms: 1902n,
                isMintBaton: false,
                entryIdx: 1,
            },
        },
        {
            sats: 546n,
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            token: {
                tokenId: TOKEN_BUTTER,
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
                },
                atoms: 990000n,
                isMintBaton: false,
                entryIdx: 0,
            },
        },
    ],
    lockTime: 0,
    timeFirstSeen: 1784117569,
    size: 944,
    isCoinbase: false,
    tokenEntries: [
        {
            tokenId: TOKEN_BUTTER,
            tokenType: {
                protocol: 'ALP',
                type: 'ALP_TOKEN_TYPE_STANDARD',
                number: 0,
            },
            txType: 'SEND',
            isInvalid: false,
            burnSummary: '',
            failedColorings: [],
            actualBurnAtoms: 0n,
            intentionalBurnAtoms: 0n,
            burnsMintBatons: false,
        },
        {
            tokenId: TOKEN_GUNS,
            tokenType: {
                protocol: 'ALP',
                type: 'ALP_TOKEN_TYPE_STANDARD',
                number: 0,
            },
            txType: 'SEND',
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
} as unknown as Tx;

describe('AlpSwap parseTx', () => {
    it('Buyer wallet: from, to, and total fee (maker + platform)', () => {
        const parsed = parseTx(alpDexSettleTx, [BUYER_HASH]);
        assert.deepStrictEqual(parsed.alpSwap, {
            role: 'buyer',
            fromTokenId: TOKEN_BUTTER,
            toTokenId: TOKEN_GUNS,
            feeTokenId: TOKEN_BUTTER,
            fromAtoms: '10000',
            toAtoms: '98',
            feeAtoms: '109',
        });
    });

    it('Seller / LP sales wallet: sold to-token for from-token price leg', () => {
        const parsed = parseTx(alpDexSettleTx, [SELLER_HASH]);
        assert.deepStrictEqual(parsed.alpSwap, {
            role: 'seller',
            fromTokenId: TOKEN_BUTTER,
            toTokenId: TOKEN_GUNS,
            fromAtoms: '9891',
            toAtoms: '98',
        });
    });

    it('Maker fee wallet: received alp-dex fee only', () => {
        const parsed = parseTx(alpDexSettleTx, [MAKER_FEE_HASH]);
        assert.deepStrictEqual(parsed.alpSwap, {
            role: 'makerFee',
            tokenId: TOKEN_BUTTER,
            atoms: '99',
        });
    });

    it('Platform fee wallet: received platform fee only', () => {
        const parsed = parseTx(alpDexSettleTx, [PLATFORM_FEE_HASH]);
        assert.deepStrictEqual(parsed.alpSwap, {
            role: 'platformFee',
            tokenId: TOKEN_BUTTER,
            atoms: '10',
        });
    });

    it('Unrelated wallet: no alpSwap classification', () => {
        const parsed = parseTx(alpDexSettleTx, [
            '0000000000000000000000000000000000000000',
        ]);
        assert.strictEqual(parsed.alpSwap, undefined);
    });

    // FIRMA→XECX e02902d5... funded miner fee from token dust only; the
    // postage-input heuristic missed to-token and the fee wallet fell through
    // to generic SEND rows (0.0030 FIRMA + phantom 0.30 XECX).
    it('Fee wallet: still makerFee when settle has no postage input', () => {
        const noPostage = {
            ...alpDexSettleTx,
            inputs: alpDexSettleTx.inputs.filter(
                input => typeof input.token !== 'undefined',
            ),
        };
        const parsed = parseTx(noPostage, [MAKER_FEE_HASH]);
        assert.deepStrictEqual(parsed.alpSwap, {
            role: 'makerFee',
            tokenId: TOKEN_BUTTER,
            atoms: '99',
        });
        assert.deepStrictEqual(parseTx(noPostage, [SELLER_HASH]).alpSwap, {
            role: 'seller',
            fromTokenId: TOKEN_BUTTER,
            toTokenId: TOKEN_GUNS,
            fromAtoms: '9891',
            toAtoms: '98',
        });
    });

    it('Notifications: buyer / seller / maker fee / platform fee', () => {
        const butterGenesis = {
            tokenTicker: 'BUTTER',
            tokenName: 'BUTTER',
            url: '',
            decimals: 4,
            data: '',
            authPubkey: '',
        };

        const buyerParsed = parseTx(alpDexSettleTx, [BUYER_HASH]);
        // Buyer toast is owned by the AlpSwap UI (from → to).
        assert.strictEqual(
            getTxNotificationMsg(
                buyerParsed,
                null,
                'en-US',
                'USD',
                butterGenesis,
            ),
            undefined,
        );

        const sellerParsed = parseTx(alpDexSettleTx, [SELLER_HASH]);
        assert.strictEqual(
            getTxNotificationMsg(
                sellerParsed,
                null,
                'en-US',
                'USD',
                butterGenesis,
            ),
            // to-token (Guns) has no genesisInfo here → atoms + truncated id
            'Sold 98 4b7ac...7056c for .9891 BUTTER',
        );

        const makerParsed = parseTx(alpDexSettleTx, [MAKER_FEE_HASH]);
        assert.strictEqual(
            getTxNotificationMsg(
                makerParsed,
                null,
                'en-US',
                'USD',
                butterGenesis,
            ),
            'Received alp-dex fee 0.0099 BUTTER',
        );

        const platformParsed = parseTx(alpDexSettleTx, [PLATFORM_FEE_HASH]);
        assert.strictEqual(
            getTxNotificationMsg(
                platformParsed,
                null,
                'en-US',
                'USD',
                butterGenesis,
            ),
            'Received platform fee 0.0010 BUTTER',
        );
    });
});

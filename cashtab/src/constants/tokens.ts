// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Tx, TokenInfo } from 'chronik-client';

interface TokenConst {
    tokenId: string;
    token: TokenInfo;
    tx: Tx;
}

/**
 * Hot wallet that handles XECX redemptions to XEC
 * In practice, any redemption must be <= the balance of this wallet
 * to be instantly accepted
 *
 * We alert Cashtab users the "max instant redemption", and include
 * a notice that larger amounts can expect redemption within 24 hrs
 */
export const XECX_SWEEPER_ADDRESS =
    'ecash:qqrjf6n3gvavhw3f35zd0p96m3heujujcs4458vcwf';

export const FIRMA_REDEEM_ADDRESS =
    'ecash:qr8hdk8rxjc5nj6f450eth3nnslxa8k4gysrtyfxc5';

/** EDJ token - everydayjackpot.com bets (100 EDJ = 1 FIRMA) */
export const EDJ_TOKEN_ID =
    '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84';

/** CACHET token - free plays (10 CACHET = 1 free bet) */
export const CACHET_TOKEN_ID =
    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1';

/** EDJ.com game addresses - CACHET/EDJ/FIRMA sent here = bet */
export const EDJ_COM_GAME_ADDRESSES = [
    'ecash:qzqcq9p5lxa3jhc5lhwaefua9cjfhfjvcvsj887fg5',
];

/** firma.cash min fee for redemptions */
export const FIRMA_REDEEM_FEE_MIN = 2;

/** firma.cash charges 1% for redemptions */
export const FIRMA_REDEEM_FEE_PCT = 0.01;

/**
 * Amounts >  FIRMA_REDEEM_AMOUNT_THRESHOLD are charged (FIRMA_REDEEM_FEE_PCT*redeemAmountFirma)
 * Amounts <= FIRMA_REDEEM_AMOUNT_THRESHOLD are charged FIRMA_REDEEM_FEE_MIN
 *
 * Calc here as useful for getFirmaRedeemFee and depends on the above constants
 */
export const FIRMA_REDEEM_AMOUNT_THRESHOLD =
    FIRMA_REDEEM_FEE_MIN / FIRMA_REDEEM_FEE_PCT;

// 8-char lokad + 64-char for 32-byte sol pk
export const FIRMA_REDEEM_EMPP_RAW_LENGTH = 72;

export const FIRMA: TokenConst = {
    tokenId: '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
    token: {
        tokenId:
            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
        tokenType: {
            protocol: 'ALP',
            type: 'ALP_TOKEN_TYPE_STANDARD',
            number: 0,
        },
        timeFirstSeen: 1740005671,
        genesisInfo: {
            tokenTicker: 'FIRMA',
            tokenName: 'Firma',
            url: 'firma.cash',
            decimals: 4,
            data: '',
            authPubkey:
                '03fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105',
        },
        block: {
            height: 884824,
            hash: '0000000000000000042420f0d007398b85c2a4b02d894575de72441c055099fc',
            timestamp: 1740006660,
        },
    },
    tx: {
        txid: '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'dc13a52129537222797ca324f4f0a130e7ae0f9c57bb36e53ff13c3510b88496',
                    outIdx: 0,
                },
                inputScript:
                    '41a753034ede0327bf8188d14f5407c774c61d78208a317a83bd30475adb14ba0760990fe1f25a4ea885bf0c0ffcae23122148541ac5a89397ebfffb4840f78fbb412103fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105',
                sats: 4200n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914cf76d8e334b149cb49ad1f95de339c3e6e9ed54188ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a504c50534c5032000747454e45534953054649524d41054669726d610a6669726d612e63617368002103fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d1050401807c814a000003',
            },
            {
                sats: 546n,
                outputScript:
                    '76a914cf76d8e334b149cb49ad1f95de339c3e6e9ed54188ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 1250000000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: '83b7d403d5b7ae295ff1e2a66ef220ed6ae190b019df4822643bea545518734a',
                    outIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a914cf76d8e334b149cb49ad1f95de339c3e6e9ed54188ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 0n,
                    isMintBaton: true,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 0n,
                    isMintBaton: true,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'd6fafa6977a24133789fcdec7922c14cfaf3120072ae82e21abcc3a68b6ed6c7',
                    outIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a914a66cd958eed093c209643e62a7f56fc9eb46622c88ac',
                token: {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    atoms: 0n,
                    isMintBaton: true,
                    entryIdx: 0,
                },
            },
            {
                sats: 1602n,
                outputScript:
                    '76a914cf76d8e334b149cb49ad1f95de339c3e6e9ed54188ac',
                spentBy: {
                    txid: '83b7d403d5b7ae295ff1e2a66ef220ed6ae190b019df4822643bea545518734a',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 1740005671,
        size: 414,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                tokenType: {
                    protocol: 'ALP',
                    type: 'ALP_TOKEN_TYPE_STANDARD',
                    number: 0,
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
            height: 884824,
            hash: '0000000000000000042420f0d007398b85c2a4b02d894575de72441c055099fc',
            timestamp: 1740006660,
        },
    },
};

// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    Block,
    BlockchainInfo,
    Tx,
    TokenInfo,
    ScriptUtxo,
    Utxo,
} from 'chronik-client';

interface ChronikMocks {
    tipHeight: number;
    tipHash: string;
    block: Block;
    blockchainInfo: BlockchainInfo;
    txid: string;
    tx: Tx;
    tokenId: string;
    token: TokenInfo;
    rawTx: string;
    scriptUtxo: ScriptUtxo;
    utxo: Utxo;
}
const DUMMY_SCRIPT_UTXO: ScriptUtxo = {
    outpoint: { txid: '00'.repeat(32), outIdx: 0 },
    blockHeight: 800000,
    isCoinbase: false,
    sats: 546n,
    isFinal: true,
};
const DUMMY_UTXO: Utxo = {
    outpoint: { txid: '00'.repeat(32), outIdx: 0 },
    script: `76a914${'00'.repeat(20)}88ac`,
    blockHeight: 800000,
    isCoinbase: false,
    sats: 546n,
    isFinal: true,
};
const chronikMocks: ChronikMocks = {
    tipHeight: 800000,
    tipHash: '0000000000000000115e051672e3d4a6c523598594825a1194862937941296fe',
    block: {
        blockInfo: {
            hash: '0000000000000000115e051672e3d4a6c523598594825a1194862937941296fe',
            prevHash:
                '0000000000000000023ab587190a05e44cdb76fe1dd7949f6187f1e632d2e123',
            height: 800000,
            nBits: 403943060,
            timestamp: 1688808780,
            isFinal: true,
            blockSize: 3094,
            numTxs: 9,
            numInputs: 13,
            numOutputs: 26,
            sumInputSats: 859760862n,
            sumCoinbaseOutputSats: 625005728n,
            sumNormalOutputSats: 859755134n,
            sumBurnedSats: 0n,
        },
    },
    blockchainInfo: {
        tipHash:
            '0000000000000000115e051672e3d4a6c523598594825a1194862937941296fe',
        tipHeight: 800000,
    },
    txid: '2c1540131fb7611b72ec3ca9a215ac5c408248327d3c5b5ff987cd2a959ee1d2',
    tx: {
        txid: '2c1540131fb7611b72ec3ca9a215ac5c408248327d3c5b5ff987cd2a959ee1d2',
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: '1cb37ece9d9dbc19ef2c6d57766ca3b91bdc3e56d203aa0fc1b41a7268c0c9d2',
                    outIdx: 2,
                },
                inputScript:
                    '41ebe634094888c4215b8690546b74695a048a9c49c8a5c6efedd940591ec9039e91cf2a6f7836107afbc41bb6e13fb22d99739aeadf1a740f75efea177cfcd86641210353f81d61d41d6e22c73ab449476113dea124afe3972991cd237e654f15950b7c',
                sats: 546n,
                sequenceNo: 4294967295,
                token: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    atoms: 455320000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                outputScript:
                    '76a914821407ac2993f8684227004f4086082f3f801da788ac',
            },
            {
                prevOut: {
                    txid: '1cb37ece9d9dbc19ef2c6d57766ca3b91bdc3e56d203aa0fc1b41a7268c0c9d2',
                    outIdx: 3,
                },
                inputScript:
                    '412e7de41834aaf15d16347a59c954cb886d8ec00584bb566252e16f8e1779ce2e4d6ddd91782bd6ba2f695a28ce4115cd0561d27c1ae16b3d8bf77f8186235b1441210353f81d61d41d6e22c73ab449476113dea124afe3972991cd237e654f15950b7c',
                sats: 94518653n,
                sequenceNo: 4294967295,
                outputScript:
                    '76a914821407ac2993f8684227004f4086082f3f801da788ac',
            },
        ],
        outputs: [
            {
                sats: 0n,
                outputScript:
                    '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb108000000000000271008000000001b237ab0',
            },
            {
                sats: 546n,
                outputScript:
                    '76a914a805a320360fa685f83605d8e56de6f9d8a7a99988ac',
                token: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    atoms: 10000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
            },
            {
                sats: 546n,
                outputScript:
                    '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                token: {
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    atoms: 455310000n,
                    isMintBaton: false,
                    entryIdx: 0,
                },
                spentBy: {
                    txid: 'b334ad4ee98718707142a7a951163f1cb94817269b55ac840a7b416ce256eecd',
                    outIdx: 0,
                },
            },
            {
                sats: 94517640n,
                outputScript:
                    '76a914821407ac2993f8684227004f4086082f3f801da788ac',
                spentBy: {
                    txid: 'b334ad4ee98718707142a7a951163f1cb94817269b55ac840a7b416ce256eecd',
                    outIdx: 1,
                },
            },
        ],
        lockTime: 0,
        timeFirstSeen: 0,
        size: 467,
        isCoinbase: false,
        tokenEntries: [
            {
                tokenId:
                    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
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
        isFinal: false,
        block: {
            height: 866581,
            hash: '000000000000000000860f542fac8cbb10614e40ab0f37f90ec4d41b126eb5d9',
            timestamp: 1728930658,
        },
    },
    tokenId: 'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
    token: {
        tokenId:
            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
        tokenType: {
            protocol: 'SLP',
            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
            number: 1,
        },
        timeFirstSeen: 1711776546,
        genesisInfo: {
            tokenTicker: 'CACHET',
            tokenName: 'Cachet',
            url: 'https://cashtab.com/',
            decimals: 2,
            hash: '',
        },
        block: {
            height: 838192,
            hash: '0000000000000000132232769161d6211f7e6e20cf63b26e5148890aacd26962',
            timestamp: 1711779364,
        },
    },
    rawTx: '0200000002d2c9c068721ab4c10faa03d2563edc1bb9a36c76576d2cef19bc9d9dce7eb31c020000006441ebe634094888c4215b8690546b74695a048a9c49c8a5c6efedd940591ec9039e91cf2a6f7836107afbc41bb6e13fb22d99739aeadf1a740f75efea177cfcd86641210353f81d61d41d6e22c73ab449476113dea124afe3972991cd237e654f15950b7cffffffffd2c9c068721ab4c10faa03d2563edc1bb9a36c76576d2cef19bc9d9dce7eb31c0300000064412e7de41834aaf15d16347a59c954cb886d8ec00584bb566252e16f8e1779ce2e4d6ddd91782bd6ba2f695a28ce4115cd0561d27c1ae16b3d8bf77f8186235b1441210353f81d61d41d6e22c73ab449476113dea124afe3972991cd237e654f15950b7cffffffff040000000000000000406a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb108000000000000271008000000001b237ab022020000000000001976a914a805a320360fa685f83605d8e56de6f9d8a7a99988ac22020000000000001976a914821407ac2993f8684227004f4086082f3f801da788ac8839a205000000001976a914821407ac2993f8684227004f4086082f3f801da788ac00000000',
    scriptUtxo: DUMMY_SCRIPT_UTXO,
    utxo: DUMMY_UTXO,
};

export default chronikMocks;

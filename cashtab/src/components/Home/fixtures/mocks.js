// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { fromHex } from 'ecash-lib';

export const walletWithZeroBalanceZeroHistory = {
    mnemonic:
        'beauty shoe decline spend still weird slot snack coach flee between paper',
    name: 'Transaction Fixtures',
    paths: new Map([
        [
            145,
            {
                hash: 'a28f8852f868f88e71ec666c632d6f86e978f046',
                address: 'ecash:qz3glzzjlp503rn3a3nxccedd7rwj78sgczljhvzv3',
                wif: 'L2HnC8ZT5JuwVFjrAjJUBs2tmmBoxdVa1MVCJccqV8S9YPoR1NuZ',
                sk: fromHex(
                    '9747c0c6a6b4a1025b222a79ccad3df7330cbf3e6731de58500f865d0370b861',
                ),
                pk: fromHex(
                    '03939a29fd67fa602926637a82f53e1826696353613cac03e34160f040ae2dfcb5',
                ),
            },
        ],
        [
            245,
            {
                pk: fromHex(
                    '03f73fe2631da9732f2480debbc7ff8d99c5c06764e0f5095b789ff190788bee72',
                ),
                hash: '600efb12a6f813eccf13171a8bc62055212d8d6c',
                address: 'ecash:qpsqa7cj5mup8mx0zvt34z7xyp2jztvdds67wajntk',
                wif: 'L3ndnMkn4574McqhPujguusu48NrmeLUgWYMkRpYQGLXDGAwGmPq',
                sk: fromHex(
                    'c3f637ba1e3cdd10cace41350058a3698c5bd413b69a358a2a2b955843ea043c',
                ),
            },
        ],
        [
            1899,
            {
                pk: fromHex(
                    '031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d',
                ),
                hash: '3a5fb236934ec078b4507c303d3afd82067f8fc1',
                address: 'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g',
                wif: 'KywWPgaLDwvW1tWUtUvs13jgqaaWMoNANLVYoKcK9Ddbpnch7Cmw',
                sk: fromHex(
                    '512d34d3b8f4d269219fd087c80e22b0212769227226dd6b23966cf0aa2f167f',
                ),
            },
        ],
    ]),
    state: {
        balanceSats: 0,
        slpUtxos: [],
        nonSlpUtxos: [],
        tokens: new Map(),
        parsedTxHistory: [],
    },
};

export const mockReceivedTxData = {
    txid: 'b3ca2414e646fbc53c6d789a242ea9afc1e84ec1e62ed8f5d58ab93d43207b66',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: '649123ec1b2357baa4588581a83aa6aa3da7825f9d736d93f77752caa156fd26',
                outIdx: 1,
            },
            inputScript:
                '483045022100ab8ac5d74583663d7e4a04491464923395571d9eb3fc59b2a713937d0143713f0220272ae4275c619661413d6258dafcd80a52e4134cf5ab1e9715d33821f0fd8f08412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            value: '1100',
            sequenceNo: 4294967295,
        },
        {
            prevOut: {
                txid: 'eabf97c801b53fad1835200b2b0e59b7dc215dc65ab23482e86e06cb8f413afd',
                outIdx: 0,
            },
            inputScript:
                '483045022100a53c4148dad5a5e8a1d48eb387ea4479b823833b62ac30efaa9d222937bab99e02206b20c74a7a2edbb2ca93463e4bb762213942fbd5e0fe6a39efde05c57651d81b412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
            value: '2200',
            sequenceNo: 4294967295,
        },
    ],
    outputs: [
        {
            value: '1100',
            outputScript: '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
        },
        {
            value: '1448',
            outputScript: '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
        },
    ],
    lockTime: 0,
    block: {
        height: 827065,
        hash: '00000000000000001073027625a3ada23fab0e79be89b9ce517b3d2e1303b69e',
        timestamp: 1705207595,
    },
    timeFirstSeen: 1705207211,
    size: 374,
    isCoinbase: false,
    network: 'XEC',
    parsed: {
        incoming: true,
        xecAmount: '11',
        isEtokenTx: false,
        airdropFlag: false,
        airdropTokenId: '',
        opReturnMessage: '',
        isCashtabMessage: false,
        isEncryptedMessage: false,
        replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
        aliasFlag: false,
    },
};

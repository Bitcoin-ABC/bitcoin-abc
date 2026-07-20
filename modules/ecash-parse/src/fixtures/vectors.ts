// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { GenesisInfo, Tx } from 'chronik-client';
import type { ParsedTx } from '../types';

export type NotificationFixture = {
    description: string;
    parsedTx: ParsedTx;
    tx?: Tx;
    walletHashes?: string[];
    fiatPrice: number | null;
    userLocale: string;
    selectedFiatTicker: string;
    genesisInfo?: GenesisInfo;
    expected: string | undefined;
};

export type ParseFixture = {
    description: string;
    tx: Tx;
    walletHashes: string[];
    parsed: ParsedTx;
};

export const notificationFixtures = [
    {
        description: 'NFToa Authentication TX (Proof of Access)',
        parsedTx: {
            satoshisSent: 550,
            replyAddress: 'ecash:qpxg7yac5xemj2ta25akklxsy9vtny28u5m73jvduu',
            stackArray: [
                '4e465400',
                '4c6f67696e20746f2047617564696f20417070',
                'eb0c601b84975437',
            ],
            xecTxType: 'Received',
            appActions: [
                {
                    app: 'NFToa',
                    lokadId: '4e465400',
                    isValid: true,
                    action: {
                        data: 'Login to Gaudio App',
                        nonce: 'eb0c601b84975437',
                    },
                },
            ],
            parsedTokenEntries: [],
            recipients: [],
        },
        tx: {
            txid: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'feedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedface',
                        outIdx: 0,
                    },
                    inputScript:
                        '41fc1401150778a0d47d5279ccdaa13298cfa43e25d8d37d37570291207a92098beefa8fb25b8fb9cb2c4d7b5f98b7ff377c54932e0e67f4db2fc127ed86e01b1a4121024b60abfca9302b9bf5731faca03fd4f0b06391621a4cd1d57fffd6f1179bb9ba',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a9144c8f13b8a1b3b9297d553b6b7cd02158b99147e588ac',
                    sats: 10000n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a044e465400134c6f67696e20746f2047617564696f2041707008eb0c601b84975437',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914c73d119dede21aca5b3f1d959634bb6fee87899688ac',
                    sats: 550n,
                },
            ],
            lockTime: 0,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: ['c73d119dede21aca5b3f1d959634bb6fee878996'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'NFToa | Received 5.50 XEC | Login to Gaudio App',
    },
    {
        description: 'NFToa Regular Message TX',
        parsedTx: {
            satoshisSent: 550,
            replyAddress: 'ecash:qpxg7yac5xemj2ta25akklxsy9vtny28u5m73jvduu',
            stackArray: [
                '4e465400',
                '48656c6c6f20576f726c642066726f6d204e46546f61',
            ],
            xecTxType: 'Received',
            appActions: [
                {
                    app: 'NFToa',
                    lokadId: '4e465400',
                    isValid: true,
                    action: {
                        data: 'Hello World from NFToa',
                        nonce: '',
                    },
                },
            ],
            parsedTokenEntries: [],
            recipients: [],
        },
        tx: {
            txid: 'dcba4321dcba4321dcba4321dcba4321dcba4321dcba4321dcba4321dcba4321',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'feedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedface',
                        outIdx: 0,
                    },
                    inputScript:
                        '41fc1401150778a0d47d5279ccdaa13298cfa43e25d8d37d37570291207a92098beefa8fb25b8fb9cb2c4d7b5f98b7ff377c54932e0e67f4db2fc127ed86e01b1a4121024b60abfca9302b9bf5731faca03fd4f0b06391621a4cd1d57fffd6f1179bb9ba',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a9144c8f13b8a1b3b9297d553b6b7cd02158b99147e588ac',
                    sats: 10000n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a044e4654001648656c6c6f20576f726c642066726f6d204e46546f61',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914c73d119dede21aca5b3f1d959634bb6fee87899688ac',
                    sats: 550n,
                },
            ],
            lockTime: 0,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: ['c73d119dede21aca5b3f1d959634bb6fee878996'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'NFToa | Received 5.50 XEC | Hello World from NFToa',
    },
    {
        description: 'Off-spec NFToa TX',
        parsedTx: {
            satoshisSent: 550,
            replyAddress: 'ecash:qpxg7yac5xemj2ta25akklxsy9vtny28u5m73jvduu',
            stackArray: ['4e465400'],
            xecTxType: 'Received',
            appActions: [
                {
                    app: 'NFToa',
                    lokadId: '4e465400',
                    isValid: false,
                },
            ],
            recipients: [],
            parsedTokenEntries: [],
        },
        tx: {
            txid: '0badc0de0badc0de0badc0de0badc0de0badc0de0badc0de0badc0de0badc0de',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'feedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedface',
                        outIdx: 0,
                    },
                    inputScript:
                        '41fc1401150778a0d47d5279ccdaa13298cfa43e25d8d37d37570291207a92098beefa8fb25b8fb9cb2c4d7b5f98b7ff377c54932e0e67f4db2fc127ed86e01b1a4121024b60abfca9302b9bf5731faca03fd4f0b06391621a4cd1d57fffd6f1179bb9ba',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a9144c8f13b8a1b3b9297d553b6b7cd02158b99147e588ac',
                    sats: 10000n,
                },
            ],
            outputs: [
                {
                    outputScript: '6a044e465400',
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a914c73d119dede21aca5b3f1d959634bb6fee87899688ac',
                    sats: 0n,
                },
            ],
            lockTime: 0,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: ['c73d119dede21aca5b3f1d959634bb6fee878996'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'Received 5.50 XEC | Invalid NFToa',
    },
    {
        description: 'Staking rewards coinbase tx',
        parsedTx: {
            satoshisSent: 62500897,
            stackArray: [],
            xecTxType: 'Staking Reward',
            recipients: [
                'ecash:qr689ree3wukyetgqv6xld9vghthvpq69cg04xjp57',
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
            ],
            appActions: [],
            parsedTokenEntries: [],
        },
        tx: {
            txid: 'c8b0783e36ab472f26108007ffa522ee82b79db3777c84b0448f5b9ef35be895',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: '0000000000000000000000000000000000000000000000000000000000000000',
                        outIdx: 4294967295,
                    },
                    inputScript:
                        '03f07d0c0439e5546508edc754ac9b2939000c736f6c6f706f6f6c2e6f7267',
                    sequenceNo: 0,
                    sats: 0n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '76a914f4728f398bb962656803346fb4ac45d776041a2e88ac',
                    spentBy: {
                        txid: '6a26b853ba356cdc4a927c43afe33f03d30ef2367bd1f2c190a8c2e15f77fb6d',
                        outIdx: 1,
                    },
                    sats: 362505204n,
                },
                {
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                    spentBy: {
                        txid: 'c5621e2312eaabcfa53af46b62384f1751c509b9ff50d1bf218f92723be01bc7',
                        outIdx: 2,
                    },
                    sats: 200002871n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    spentBy: {
                        txid: '98e47dda8c20facafff11fec7c6453f9d8afdd24281eb6129b76bfef90dd6bab',
                        outIdx: 0,
                    },
                    sats: 62500897n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 182,
            isCoinbase: true,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 818672,
                hash: '000000000000000009520291eb09aacd13b7bb802f329b584dafbc036a15b4cb',
                timestamp: 1700062633,
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        fiatPrice: 0.000033,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'New staking reward: 625.01k XEC ($20.63 USD)',
    },
    {
        description: 'Handles missing fiat price',
        parsedTx: {
            satoshisSent: 62500897,
            stackArray: [],
            xecTxType: 'Staking Reward',
            recipients: [
                'ecash:qr689ree3wukyetgqv6xld9vghthvpq69cg04xjp57',
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
            ],
            appActions: [],
            parsedTokenEntries: [],
        },
        tx: {
            txid: 'c8b0783e36ab472f26108007ffa522ee82b79db3777c84b0448f5b9ef35be895',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: '0000000000000000000000000000000000000000000000000000000000000000',
                        outIdx: 4294967295,
                    },
                    inputScript:
                        '03f07d0c0439e5546508edc754ac9b2939000c736f6c6f706f6f6c2e6f7267',
                    sequenceNo: 0,
                    sats: 0n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '76a914f4728f398bb962656803346fb4ac45d776041a2e88ac',
                    spentBy: {
                        txid: '6a26b853ba356cdc4a927c43afe33f03d30ef2367bd1f2c190a8c2e15f77fb6d',
                        outIdx: 1,
                    },
                    sats: 362505204n,
                },
                {
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                    spentBy: {
                        txid: 'c5621e2312eaabcfa53af46b62384f1751c509b9ff50d1bf218f92723be01bc7',
                        outIdx: 2,
                    },
                    sats: 200002871n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    spentBy: {
                        txid: '98e47dda8c20facafff11fec7c6453f9d8afdd24281eb6129b76bfef90dd6bab',
                        outIdx: 0,
                    },
                    sats: 62500897n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 182,
            isCoinbase: true,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 818672,
                hash: '000000000000000009520291eb09aacd13b7bb802f329b584dafbc036a15b4cb',
                timestamp: 1700062633,
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'New staking reward: 625.01k XEC',
    },
    {
        description: 'Handles non-decimal locale',
        parsedTx: {
            satoshisSent: 62500897,
            stackArray: [],
            xecTxType: 'Staking Reward',
            recipients: [
                'ecash:qr689ree3wukyetgqv6xld9vghthvpq69cg04xjp57',
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
            ],
            appActions: [],
            parsedTokenEntries: [],
        },
        tx: {
            txid: 'c8b0783e36ab472f26108007ffa522ee82b79db3777c84b0448f5b9ef35be895',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: '0000000000000000000000000000000000000000000000000000000000000000',
                        outIdx: 4294967295,
                    },
                    inputScript:
                        '03f07d0c0439e5546508edc754ac9b2939000c736f6c6f706f6f6c2e6f7267',
                    sequenceNo: 0,
                    sats: 0n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '76a914f4728f398bb962656803346fb4ac45d776041a2e88ac',
                    spentBy: {
                        txid: '6a26b853ba356cdc4a927c43afe33f03d30ef2367bd1f2c190a8c2e15f77fb6d',
                        outIdx: 1,
                    },
                    sats: 362505204n,
                },
                {
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                    spentBy: {
                        txid: 'c5621e2312eaabcfa53af46b62384f1751c509b9ff50d1bf218f92723be01bc7',
                        outIdx: 2,
                    },
                    sats: 200002871n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    spentBy: {
                        txid: '98e47dda8c20facafff11fec7c6453f9d8afdd24281eb6129b76bfef90dd6bab',
                        outIdx: 0,
                    },
                    sats: 62500897n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 182,
            isCoinbase: true,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 818672,
                hash: '000000000000000009520291eb09aacd13b7bb802f329b584dafbc036a15b4cb',
                timestamp: 1700062633,
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        fiatPrice: 0.000033,
        userLocale: 'fr-FR',
        selectedFiatTicker: 'EUR',
        genesisInfo: undefined,
        expected: 'New staking reward: 625,01k XEC (20,63 € EUR)',
    },
    {
        description: 'Incoming XEC tx',
        parsedTx: {
            satoshisSent: 4200,
            stackArray: [],
            xecTxType: 'Received',
            recipients: ['ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6'],
            replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
            appActions: [],
            parsedTokenEntries: [],
        },
        tx: {
            txid: 'ac83faac54059c89c41dea4c3d6704e4f74fb82e4ad2fb948e640f1d19b760de',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '783428349b7b040b473ca9720ddbb2eda6fe28db16883ae47f3113b7a0977915',
                        outIdx: 1,
                    },
                    inputScript:
                        '48304502210094c497d6a0ce9ca6d79819467a1bb3953084b2e003ac7edac3b4f0634800baab02205729e229bd96d3a35cece712e3e9ec2d3f610a43d7712928f806983f209fbd72412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    sats: 517521n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    spentBy: {
                        txid: '23b4ac14065f0b8bb594e35a366cb707b52c4630398439d79c4cd179d005a298',
                        outIdx: 2,
                    },
                    sats: 4200n,
                },
                {
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    spentBy: {
                        txid: '0f4e0e3ad405a5b40a3f0cef78d55093729aa6504e420dc5ceaf1445beecbded',
                        outIdx: 0,
                    },
                    sats: 512866n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 226,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 739911,
                hash: '00000000000000000a6da230a41e268bb42ad7f4e9f939b6875c4fb2293bcd6f',
                timestamp: 1652812528,
            },
            isFinal: true,
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'Received 42.00 XEC from qp8...gg6',
    },
    {
        description: 'Outgoing XEC tx',
        parsedTx: {
            satoshisSent: 22200,
            stackArray: [],
            xecTxType: 'Sent',
            recipients: ['ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6'],
            appActions: [],
            parsedTokenEntries: [],
        },
        tx: {
            txid: 'b82a67f929d256c9beb04a850ad735f3b322156cc9df2e37cadc130cc4fab660',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'bb161d20f884ce45374fa3f9f1452290a2e52e93c8b552f559fad8ccd1ca33cc',
                        outIdx: 5,
                    },
                    inputScript:
                        '473044022054a6b2065a0b0bbe70048e782aa9be048cc8bee0a241d08d0b98fcd74505a90202201ed5224f34c9ff73dc0c581390247686af521476a977a58e55ed33c4afd177c2412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 4400000n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    spentBy: {
                        txid: '692a900ae6607d2b798df2cc1e8856aa812b158880c99295041d8a8b70c88d01',
                        outIdx: 1,
                    },
                    sats: 22200n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    spentBy: {
                        txid: '69b060294e7b49fdf45f0a6eb500a03a881a2f54c86238b54718880470629cee',
                        outIdx: 0,
                    },
                    sats: 4377345n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 225,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 739925,
                hash: '00000000000000001456e79aafc77f5cfecd77cda1252698d8f03e04b0a299d1',
                timestamp: 1652824018,
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'Sent 222.00 XEC to qp8...gg6',
    },
    {
        description: 'Incoming eToken',
        parsedTx: {
            satoshisSent: 546,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                '000000000000000c',
                '00000000000000e4',
            ],
            xecTxType: 'Received',
            recipients: ['ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6'],
            replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'SEND',
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenSatoshis: '12',
                },
            ],
        },
        tx: {
            txid: '46cf8bf009dbc6da45045c23af878cd2fd6dd3d3f62bf524d675e75959d5fdbd',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '51c18b220c2ff1d3ead60c3031316f15ed1c7fa43fbfe563c8227e107f218751',
                        outIdx: 1,
                    },
                    inputScript:
                        '473044022004db23a179194d5e2d8446159859a3e55521239c807f14d4666c772d1493a7d402206d6ea22a4fb8ef20cd6159d200a7292a3ff0181c8d596e7a3e1b9027e6912103412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    sats: 3891539n,
                },
                {
                    prevOut: {
                        txid: '66f0663e79f6a7fa3bf0834a16b48cb86fa42076c0df25ae89b402d5ee97c311',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100c45951e15402b907c419f8a80bd76d374521faf885327ba3e55021345c2eb41902204cdb84e0190a5f671dd049b6b656f6b9e8b57254ec0123308345d5a634802acd412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 240n,
                    },
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    sats: 546n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000c0800000000000000e4',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 12n,
                    },
                    spentBy: {
                        txid: '96ddf598c00edd493a020fea6ac382b708753cc8b7690f673685af64916089dd',
                        outIdx: 7,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    token: {
                        tokenId:
                            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 228n,
                    },
                    spentBy: {
                        txid: 'cd4b0008e90b2a872dc92e19cdd87f52466b801f037641193196e75ff10f6990',
                        outIdx: 2,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    spentBy: {
                        txid: '648b9f3a7e9c52f7654b6bba0e00c73bcf58aeed2a9381c4ab45ee32d214284b',
                        outIdx: 0,
                    },
                    sats: 3889721n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 480,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 739924,
                hash: '000000000000000010d2929cd5721cd975ea4425a39c5cb12cfcf5e20f52628a',
                timestamp: 1652822224,
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'Received 4bd14...0b0c3',
    },
    {
        description: 'Outgoing eToken',
        parsedTx: {
            satoshisSent: 546,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                '0000000000000011',
                '0000000000000034',
            ],
            xecTxType: 'Sent',
            recipients: ['ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6'],
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'SEND',
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenSatoshis: '17',
                },
            ],
        },
        tx: {
            txid: '3d60d2d130eee3e45e6a2d0e88e2ecae82d70c1ed1afc8f62ca9c8564d38108d',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'bf7a7d1a063751d8f9c67e88523b3e6ffe8bb133e54ebf3cf500b859adfe16e0',
                        outIdx: 1,
                    },
                    inputScript:
                        '473044022047077b516d8554aba4deb36c66b789b5136bf16657bf1675ae866fd8a62834f5022035a7bd45422e0d0c343ac832a5efb0c05269ebe591ea400a33c23849cfa7c3a0412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 450747149n,
                },
                {
                    prevOut: {
                        txid: '66f0663e79f6a7fa3bf0834a16b48cb86fa42076c0df25ae89b402d5ee97c311',
                        outIdx: 1,
                    },
                    inputScript:
                        '47304402203ba0eff663f253805a4ae75fecf5886d7dbaf6369c9e6f0bbf5c114184223fa202207992c5f1a8cb69b552b1af54a75bbab341bfcf90591e535282bd9409981d8464412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 69n,
                    },
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 546n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3080000000000000011080000000000000034',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    token: {
                        tokenId:
                            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 17n,
                    },
                    spentBy: {
                        txid: 'fa2e8951ee2ba44bab33e38c5b903bf77657363cffe268e8ae9f4728e14b04d8',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 52n,
                    },
                    spentBy: {
                        txid: 'fb12358a18b6d6e563b7790f8e08ca9c9260df747c5e9113901fed04094be03d',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    spentBy: {
                        txid: '23b4ac14065f0b8bb594e35a366cb707b52c4630398439d79c4cd179d005a298',
                        outIdx: 3,
                    },
                    sats: 450745331n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 479,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 739925,
                hash: '00000000000000001456e79aafc77f5cfecd77cda1252698d8f03e04b0a299d1',
                timestamp: 1652824018,
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'Sent 4bd14...0b0c3',
    },
    {
        description: 'Genesis tx',
        parsedTx: {
            satoshisSent: 546,
            stackArray: [
                '534c5000',
                '01',
                '47454e45534953',
                '554454',
                '55706461746554657374',
                '68747470733a2f2f636173687461622e636f6d2f',
                '',
                '07',
                '',
                '00000001cf977871',
            ],
            xecTxType: 'Sent',
            recipients: [],
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'GENESIS',
                    tokenId:
                        'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
                    tokenSatoshis: '7777777777',
                },
            ],
        },
        tx: {
            txid: 'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'b142b79dbda8ae4aa580220bec76ae5ee78ff2c206a39ce20138c4f371c22aca',
                        outIdx: 0,
                    },
                    inputScript:
                        '483045022100ab2a1e04a156e9cc5204e11e77ba399347f3b7ea3e05d45897c7fb7c6854a7ff022065c7e096e0526a0af223ce32e5e162aa577c42f7da231c13e28ebc3532396f20412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1300n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953035544540a557064617465546573741468747470733a2f2f636173687461622e636f6d2f4c0001074c000800000001cf977871',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 7777777777n,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 268,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'GENESIS',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 759037,
                hash: '00000000000000000bc95bfdd45e71585f27139e71b56dd5bc86ef05d35b502f',
                timestamp: 1664226709,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: '⚗️ Genesis | Created cf601...17c50',
    },
    {
        description: 'ALP agora listing',
        parsedTx: {
            recipients: ['ecash:pqg9jcmymvendmrj8nn74g5kula8m0s8qce724yjtn'],
            satoshisSent: 546,
            stackArray: [
                '50',
                '41475230075041525449414c0001a4540000000000009006000000000000a4540000000000006f67825703771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                '534c5032000453454e443f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e1101228301000000',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'Agora Offer',
                    tokenId:
                        '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                    tokenSatoshis: '99106',
                },
            ],
        },
        tx: {
            txid: 'cf7f6c07bd838dbc7f7b05f5f879d498789d087e6c76dde91fdedeb802230587',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '59a60227b112221130f11fd890100ba623944f8243cc8322e7f4c8fd17ab6ee2',
                        outIdx: 2,
                    },
                    inputScript:
                        '41063618b40515cc62f4c2802f4f76ae729cfe31351f419634560bff37fbb8fa3dce1efb084e12a5e983beb893e945854470f409c1ec1c8c48b2baf7f5d80cb5e1412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 98082n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: 'cbded16a00885493d76e6534d932a58083f1918be220b8604897181c6b611609',
                        outIdx: 1,
                    },
                    inputScript:
                        '41c143430106e44093436317fb23c3eb96e453ea500e47ea4d1952fdb917c4423abc52a51f0163e193704c6879fd0ff005423ae60ff4f75c7ff234cb6d45ef0391412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1024n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a504b41475230075041525449414c0001a4540000000000009006000000000000a4540000000000006f67825703771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba631534c5032000453454e443f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e1101228301000000',
                    sats: 0n,
                },
                {
                    outputScript:
                        'a91410596364db3336ec723ce7eaa296e7fa7dbe070687',
                    plugins: {
                        agora: {
                            groups: [
                                '5003771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                                '54116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                                '46116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                            ],
                            data: [
                                '5041525449414c',
                                '00',
                                '01',
                                'a454000000000000',
                                '9006000000000000',
                                'a454000000000000',
                                '6f678257',
                            ],
                        },
                    },
                    token: {
                        tokenId:
                            '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 99106n,
                    },
                    spentBy: {
                        txid: 'a6d65d619bbb03c4490498f7fe1d5413e92df064915a3533a09e8a4ba1762255',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1732642801,
            size: 461,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 872745,
                hash: '000000000000000017dce1ee0a66873715acd1987aa18d018cc94e2943c2608b',
                timestamp: 1732642958,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'TB',
            tokenName: 'Tiberium',
            url: 'cashtab.com',
            decimals: 0,
            data: [],
            authPubkey:
                '03771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
        },
        expected: undefined,
    },
    {
        description: 'ALP agora listing + we can handle no genesisInfo',
        parsedTx: {
            recipients: ['ecash:pqg9jcmymvendmrj8nn74g5kula8m0s8qce724yjtn'],
            satoshisSent: 546,
            stackArray: [
                '50',
                '41475230075041525449414c0001a4540000000000009006000000000000a4540000000000006f67825703771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                '534c5032000453454e443f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e1101228301000000',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'Agora Offer',
                    tokenId:
                        '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                    tokenSatoshis: '99106',
                },
            ],
        },
        tx: {
            txid: 'cf7f6c07bd838dbc7f7b05f5f879d498789d087e6c76dde91fdedeb802230587',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '59a60227b112221130f11fd890100ba623944f8243cc8322e7f4c8fd17ab6ee2',
                        outIdx: 2,
                    },
                    inputScript:
                        '41063618b40515cc62f4c2802f4f76ae729cfe31351f419634560bff37fbb8fa3dce1efb084e12a5e983beb893e945854470f409c1ec1c8c48b2baf7f5d80cb5e1412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 98082n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: 'cbded16a00885493d76e6534d932a58083f1918be220b8604897181c6b611609',
                        outIdx: 1,
                    },
                    inputScript:
                        '41c143430106e44093436317fb23c3eb96e453ea500e47ea4d1952fdb917c4423abc52a51f0163e193704c6879fd0ff005423ae60ff4f75c7ff234cb6d45ef0391412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1024n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a504b41475230075041525449414c0001a4540000000000009006000000000000a4540000000000006f67825703771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba631534c5032000453454e443f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e1101228301000000',
                    sats: 0n,
                },
                {
                    outputScript:
                        'a91410596364db3336ec723ce7eaa296e7fa7dbe070687',
                    plugins: {
                        agora: {
                            groups: [
                                '5003771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                                '54116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                                '46116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                            ],
                            data: [
                                '5041525449414c',
                                '00',
                                '01',
                                'a454000000000000',
                                '9006000000000000',
                                'a454000000000000',
                                '6f678257',
                            ],
                        },
                    },
                    token: {
                        tokenId:
                            '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 99106n,
                    },
                    spentBy: {
                        txid: 'a6d65d619bbb03c4490498f7fe1d5413e92df064915a3533a09e8a4ba1762255',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1732642801,
            size: 461,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 872745,
                hash: '000000000000000017dce1ee0a66873715acd1987aa18d018cc94e2943c2608b',
                timestamp: 1732642958,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: undefined,
    },
    {
        description: 'Token burn tx',
        parsedTx: {
            satoshisSent: 546,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                '00000000000f41b9',
            ],
            xecTxType: 'Sent',
            recipients: [],
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'BURN',
                    tokenId:
                        '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                    tokenSatoshis: '12',
                },
            ],
        },
        tx: {
            txid: '312553668f596bfd61287aec1b7f0f035afb5ddadf40b6f9d1ffcec5b7d4b684',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
                        outIdx: 0,
                    },
                    inputScript:
                        '473044022025c68cf0ab9c1a4d6b35b2b58f7e397722f469412841eb09d38d1973dc5ef7120220712e1f3c8740fff2af75c1062a773eef167550ee008deaef9089537cd17c35f0412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 2300n,
                },
                {
                    prevOut: {
                        txid: '1efe359a0bfa83c409433c487b025fb446a3a9bfa51a718c8dd9a56401656e33',
                        outIdx: 2,
                    },
                    inputScript:
                        '47304402206a2f53497eb734ea94ca158951aa005f6569c184675a497d33d061b78c66c25b02201f826fa71be5943ce63740d92a278123974e44846c3766c5cb58ef5ad307ba36412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 2n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: '49f825370128056333af945eb4f4d9712171c9e88954deb189ca6f479564f2ee',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100efa3c767b749abb2dc958932348e2b19b845964e581c9f6de706cd43dac3f087022059afad6ff3c1e49cc0320499381e78eab922f18b00e0409228ad417e0220bf5d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 999875n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e44204db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c8750800000000000f41b9',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 999865n,
                    },
                    spentBy: {
                        txid: '657646f7a4e7237fca4ed8231c27d95afc8086f678244d5560be2230d920ff70',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 550,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: 'Unexpected burn: Burns 12 base tokens',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 12n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NOT_NORMAL',
            block: {
                height: 760213,
                hash: '000000000000000010150c61dcde7dffb6af223a7f3f45be599d43ae972cbf67',
                timestamp: 1664921460,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: '🔥 Burned 4db25...6c875',
    },
    {
        description: 'We can parse a received ALP tx',
        parsedTx: {
            satoshisSent: 546,
            stackArray: [
                '50',
                '534c5032000453454e4445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd038a02000000003e3000000000948f00000000',
            ],
            xecTxType: 'Received',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'SEND',
                    tokenId:
                        'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                    tokenSatoshis: '650',
                },
            ],
            recipients: [
                'ecash:pzctlwr4prjjqwqrfyxz7wy36pq0wu46pud7n9ffz3',
                'ecash:qpt4z9kg4h6czlyel3da4jxmrrgscfts859gzp2zuu',
            ],
            replyAddress: 'ecash:qpt4z9kg4h6czlyel3da4jxmrrgscfts859gzp2zuu',
        },
        tx: {
            txid: '791c460c6d5b513283b98b92b83f0e6fa662fc279f39fd00bd27047370ba4647',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: '927bf59fee669509ffee3f3cad5d283694adaf8e44e37e2ae62df53e51116052',
                        outIdx: 1,
                    },
                    inputScript:
                        '41482340e636feab0d15efb309e72eac0f559d0b85eb1799e0a1419430e95448a6a5c1e3961c92861e653dde4428e6e3a79c90d10911b045e7469f7beeae62fc56c1210378d370d2cd269a77ac2f37c28d98b392e5b9892f3b3406bfec8794c82244b039',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 49756n,
                    },
                    outputScript:
                        '76a914575116c8adf5817c99fc5bdac8db18d10c25703d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: 'd848d41122437eb049f75142674bb5ec810815955ed2a85a9cfc6142c72e7d00',
                        outIdx: 2,
                    },
                    inputScript:
                        '4152ed9a66a0c40759e400a1484df1a1d2b152c9d6917abf3beaf974f21a935d60853490ae5a07c237531016ceae6c1f01cce9cf2a1417b2b2bcbbc4737ea2fe35412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                    sats: 1000n,
                },
                {
                    prevOut: {
                        txid: 'd848d41122437eb049f75142674bb5ec810815955ed2a85a9cfc6142c72e7d00',
                        outIdx: 3,
                    },
                    inputScript:
                        '412a65517b4df68bb03ba2b7cd85e70af662503bbc8be209e7fbf18bb0950ff7e0d589f0b3e8119b5e67314fbedd856968890556593d97db58c78e86d2417f27d7412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                    sats: 1000n,
                },
                {
                    prevOut: {
                        txid: 'd848d41122437eb049f75142674bb5ec810815955ed2a85a9cfc6142c72e7d00',
                        outIdx: 4,
                    },
                    inputScript:
                        '412c9a66d04d341b1f0c3a15689265729a18f5605269909ad9f7b842ea03d96f8540e1b5b272ddc9db5f2d392a8e0569428a7ba4b5d99bbc707168898399f00da7412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                    sats: 1000n,
                },
                {
                    prevOut: {
                        txid: 'd848d41122437eb049f75142674bb5ec810815955ed2a85a9cfc6142c72e7d00',
                        outIdx: 5,
                    },
                    inputScript:
                        '41f2ffdbd5f3694669d448899d3f6d939a8165d70cba6be2eaa8416847d56d4630a7b3ac8a35641705e4eb583b391a46c204920641dd85e2b7e04dd18553422651412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                    sats: 1000n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a503d534c5032000453454e4445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd038a02000000003e3000000000948f00000000',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914dee50f576362377dd2f031453c0bb09009acaf8188ac',
                    token: {
                        tokenId:
                            'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 650n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        'a914b0bfb87508e5203803490c2f3891d040f772ba0f87',
                    token: {
                        tokenId:
                            'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 12350n,
                    },
                    sats: 1960n,
                },
                {
                    outputScript:
                        '76a914575116c8adf5817c99fc5bdac8db18d10c25703d88ac',
                    token: {
                        tokenId:
                            'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 36756n,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1710439161,
            size: 888,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 835924,
                hash: '00000000000000000cb5f7d96ddff0d04096c405a0361196bcbe60622ea0e44f',
                timestamp: 1710440413,
            },
        },
        walletHashes: ['76a914dee50f576362377dd2f031453c0bb09009acaf8188ac'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'Received cdcdc...2e145',
    },
    {
        description: 'SLP1 NFT Parent Fan-out tx',
        parsedTx: {
            recipients: [],
            satoshisSent: 32771207,
            stackArray: [
                '534c5000',
                '81',
                '53454e44',
                '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                '0000000000000001',
                '0000000000000001',
                '0000000000000001',
                '0000000000000001',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    nftFanInputsCreated: 4,
                    renderedTokenType: 'Collection',
                    renderedTxType: 'Fan Out',
                    tokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                    tokenSatoshis: '0',
                },
            ],
        },
        tx: {
            txid: 'faaba128601942a858abcce56d0da002c1f1d95e8c49ba4105c3d08aa76959d8',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100a5e4824f76bad8f224412fca2442c11598d6dd29848b67ae0e8c6f74a5a80b2c022049ee636ac6b951eba8273f300bcab8ffc31525f4d96ca738cfbb62e73769bf3a412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 4n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: '73c8333ffbf94d14a52c0284a67a7e0cb71dac08d6ae9da989f7c3b97339df7f',
                        outIdx: 3,
                    },
                    inputScript:
                        '483045022100dfe70b028211bf747a9d634f03f6f024264f75ef37f9dd4b40c8d8dfddfeff9702205ccb832e674c5c865353707fc46c5b4206dd807797d6b64f146441fa2d85bf94412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 32771801n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001810453454e442012a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3080000000000000001080000000000000001080000000000000001080000000000000001',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    spentBy: {
                        txid: 'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
                        outIdx: 0,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
                        outIdx: 1,
                    },
                    sats: 32769023n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1713825841,
            size: 567,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 841414,
                hash: '00000000000000000e074b0e1067d96e33a0b4df2a352dab1abbb6f28645563a',
                timestamp: 1713826095,
            },
        },
        walletHashes: ['76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: '4HC',
            tokenName: 'The Four Half-Coins of Jin-qua',
            url: 'en.wikipedia.org/wiki/Tai-Pan_(novel)',
            decimals: 0,
            hash: '2a6585a404fae1c33a43322b723b9dbd926cb07244ae9bea888add8f471511e0',
        },
        expected: 'Created 4 NFT mint inputs for 4HC',
    },
    {
        description: 'SLP1 NFT Mint',
        parsedTx: {
            recipients: [],
            satoshisSent: 32768616,
            stackArray: [
                '534c5000',
                '41',
                '47454e45534953',
                '574643',
                '57752046616e672043686f69',
                '636173687461622e636f6d',
                'ec7ed5da3ed751a80a3ab857c50dce405f8e8f7a083fafea158a3a2973083855',
                '00',
                '',
                '0000000000000001',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'NFT',
                    renderedTxType: 'GENESIS',
                    tokenId:
                        'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
                    tokenSatoshis: '1',
                },
                {
                    renderedTokenType: 'Collection',
                    renderedTxType: 'NONE',
                    tokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                    tokenSatoshis: '0',
                },
            ],
        },
        tx: {
            txid: 'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'faaba128601942a858abcce56d0da002c1f1d95e8c49ba4105c3d08aa76959d8',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100939d517c889174bdcaf9755390165ce1e2ba7f47d1490dbf48bbf2f4146c84360220172aeb2fe8eca8a0c59e68ca6b2ab1a8fd0bdded8410212c5d34d936cadcf734412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: false,
                        entryIdx: 1,
                        atoms: 1n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: 'faaba128601942a858abcce56d0da002c1f1d95e8c49ba4105c3d08aa76959d8',
                        outIdx: 5,
                    },
                    inputScript:
                        '483045022100da6101ab8d02141d6745b3985d4c1ba5481cb2c470acff8d40e66fa654e3f14402200906d6a511dda0c5bc243f82217a03fe40c3cfc0a407b2d1e6f971de1ae70316412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 32769023n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001410747454e45534953035746430c57752046616e672043686f690b636173687461622e636f6d20ec7ed5da3ed751a80a3ab857c50dce405f8e8f7a083fafea158a3a297308385501004c00080000000000000001',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 32768070n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1713828197,
            size: 474,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    txType: 'GENESIS',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    groupTokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
                {
                    tokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    txType: 'NONE',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
        },
        walletHashes: ['76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'WFC',
            tokenName: 'Wu Fang Choi',
            url: 'cashtab.com',
            decimals: 0,
            hash: 'ec7ed5da3ed751a80a3ab857c50dce405f8e8f7a083fafea158a3a2973083855',
        },
        expected: 'NFT | 👨‍🎨 Minted 1 WFC',
    },
    {
        description: 'SLP1 Parent Genesis',
        parsedTx: {
            recipients: [],
            satoshisSent: 32765308,
            stackArray: [
                '534c5000',
                '81',
                '47454e45534953',
                '48534d',
                '54686520486569736d616e',
                '68747470733a2f2f656e2e77696b6970656469612e6f72672f77696b692f486569736d616e5f54726f706879',
                '73229094743335d380cd7ce479fb38c9dfe77cdd97668aa0c4d9183855fcb976',
                '00',
                '',
                '0000000000000059',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'Collection',
                    renderedTxType: 'GENESIS',
                    tokenId:
                        'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                    tokenSatoshis: '89',
                },
            ],
        },
        tx: {
            txid: 'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100eb2e68c7d02eda2dd64c22a079d832c5c85f34f1ced264cd3b37658d4cd0b89e02203e204cd625a05c8ba59291567bc14d0bfa193a9a37cbc00aec804a224dc910d1412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 32766028n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001810747454e455349530348534d0b54686520486569736d616e2c68747470733a2f2f656e2e77696b6970656469612e6f72672f77696b692f486569736d616e5f54726f7068792073229094743335d380cd7ce479fb38c9dfe77cdd97668aa0c4d9183855fcb97601004c00080000000000000059',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 89n,
                    },
                    spentBy: {
                        txid: '1f2f9a37767586320a8af6afadda56bdf5446034910e27d537f26777ad95e0d5',
                        outIdx: 0,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '1f2f9a37767586320a8af6afadda56bdf5446034910e27d537f26777ad95e0d5',
                        outIdx: 1,
                    },
                    sats: 32764762n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1714048251,
            size: 358,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    txType: 'GENESIS',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 841852,
                hash: '00000000000000000cea344b4130a2de214200266ad0d67253eea01eeb34a48d',
                timestamp: 1714048284,
            },
        },
        walletHashes: ['76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'HSM',
            tokenName: 'The Heisman',
            url: 'https://en.wikipedia.org/wiki/Heisman_Trophy',
            decimals: 0,
            hash: '73229094743335d380cd7ce479fb38c9dfe77cdd97668aa0c4d9183855fcb976',
        },
        expected: '⚗️ Genesis | Created 89 HSM',
    },
    {
        description: 'On spec airdrop tx no message',
        parsedTx: {
            appActions: [
                {
                    action: {
                        msg: 'ATTENTION GRUMPY PEOPLE! 😾 You can now deposit $GRP to the eToken bot at t.me/eCashPlay to top up your Casino Credits! 1m $GRP = 1 Credit. Play Casino games and win XEC! ',
                        tokenId:
                            'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                    },
                    isValid: true,
                    app: '🪂Airdrop',
                    lokadId: '64726f70',
                },
            ],
            parsedTokenEntries: [],
            recipients: [
                'ecash:qp2kre7s2ja5mqwcvt7uvazjtskuxdavd5e5vrcxel',
                'ecash:qqtms0966jq55hryqrjp3mrf72vk8g5qtqpwysa6na',
                'ecash:qqhp20z0cc7u40cw39ymyrw6ktpa7acya55l0hgyrd',
                'ecash:qzvkd5cjsz6n78ptshuhtyvwkvprk2qlsc4yrkjum8',
                'ecash:qzla829ez2ne3zqfpyx72ej36369z55t5y75969dkn',
                'ecash:qpllgmsgq7cd8fte0ht9h6hxelxz6q09dcpuhyzzr9',
                'ecash:qpv9ajuqwf5ew77zrgdze4whcnl3z58ffyulr5hxmz',
                'ecash:qqxmqltt0904le050ef64vj64src6g5lsy9t0vws7c',
                'ecash:qqlj8cn954c83tywva0h3024922eg098aq90dtfspf',
                'ecash:qz3nkdrq6saeufapv5v9k2rrk8my6svdsg9wj4s4hl',
                'ecash:qrsqdhs9prwt7f9wq32u5w6kvhks23248sz7x0vz03',
                'ecash:qp03a3ka95pvr73jkxzgrzl9vydwvaxlqv4nuyqll2',
                'ecash:qpz9crr5qsvn2lws8jf6x5wxnmklgva7gcx4qsn5sw',
                'ecash:qr40el0vmxxdaxf780sp4xk3zk8a86mh8ypwtuycl9',
                'ecash:qqpr5uy8a6dl40rh2j8utu9rtxhfht8hhstayxwwfm',
                'ecash:qrk76dvgz6frgsq0w4t2gza0sz8paj8t75yz9dg9aa',
                'ecash:qqdrx6zzp8vh369uzs7xlndh74hrys7uachl0rwq7d',
                'ecash:qpyxe0ctlw3m0592uy97clcdggnwdcg0jctx6mfrz4',
                'ecash:qzqvwt004vkfnncexswvpc5e93je6ssesuzzjzad2z',
                'ecash:qzs4mw9zf7dnwspc8yn6r4u8hfmmxjmr4qa2pvqwvr',
                'ecash:qq36zdqdh0ndahcu6vwd7y0ctv6y9n7c9qwg9xyccn',
                'ecash:qq0yvnyd9quhdhwp87n82eeklre6qp5l0qcy78a7x6',
                'ecash:qredshz087mcc8vhyl02wd5scu5p2atw9vxhhp6t7d',
                'ecash:qrv8ywknhmxygdtzvl5dqvfkjtzf8l3tmukugtcl6d',
                'ecash:qqtpet5n3mqjr0vewqcywe5xtxglaq9xxqukk4u9q0',
                'ecash:qzgwc35u54xwjctzst02nq9rnu8yhxn2hyu2mn9e97',
                'ecash:qzecdv04nd0s8dz5w80jzn2877446jqqxq8d2rppc4',
                'ecash:qrfw4xap5zgu9t0sz9k6f5krmhpu7ufy4ynpmajugh',
                'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed',
                'ecash:qpgn0x4kzy58vkxfu8q0nrcf9xka6k30r534m2j2ca',
                'ecash:qqe0cv6phqleq23kpjaljxsga2vu9ymn85q3uuvpdu',
                'ecash:qpvljwpehgj2h45edd6689yxdywagpnqhcd5fngx3n',
                'ecash:qpe77979h864r6hr7w604hmply72uhn2agr5z20769',
                'ecash:qp5sqwvcctpj4jqe2xugg94f59wl8gve9yvt7h4vj0',
                'ecash:qpwaqsgl5cq6hqhu66yffj2ex3se5jvjqcmn6tp9gn',
                'ecash:qpf5c3q8am48ujuv8mta4ewtfgjnn0hdnyx7nqk7y8',
                'ecash:qprlsm6ywgwg6zavycmqyutlcy9smfymnupv08w52e',
                'ecash:qzz3f8x423t5qxk5v3w9fwrv4gxwp48stu7zk0lhxv',
                'ecash:qrc27ws5z8k5nzdlt3zxg8p6sm288tly2y3m6nwxww',
                'ecash:qztnm9f7zhtz8qajf6lr6u7sreac80vcju4tk6j75z',
                'ecash:qrdd7dxda8rhflwkxsxd9yt2nww96470gv48s4f9j0',
                'ecash:qpx797ee7zw3gjf0f4qwp7m8pfp275zudvk3ym56ad',
                'ecash:qr7h7485jm9dkzmd8npqdmsf3w4jn02mhu7n4g6whr',
                'ecash:qz646fl9p9gq47zjgd3zxs72nc74fgzr3gw9u8p7tc',
                'ecash:qp284wa258z7jtkdu4gur07mngh9g49cxqxs2pmdgc',
                'ecash:qq8kn2f3g6vp26hw30dedgm0rcy0rwsk35ln6cazck',
                'ecash:qp59q64mfnnfcrjedjqta0j9dua707gyl5q5p2a5py',
                'ecash:qpr6kemj5374tdmynwplzp0atnwra23z4y7mt4d46q',
                'ecash:qp36z7k8xt7k4l5xnxeypg5mfqeyvvyduu04m37fwd',
                'ecash:qzm5es2p37kj9lswkzl02uyzmxpk52f5psl90kzl6t',
                'ecash:qr3n7laxk8qr669zsavvrme6t7nnyt90hvy5esczyf',
                'ecash:qz3sz5adwwa90dhn0sssgd0yq7ah5d52t56s78jsfa',
                'ecash:qq2qfhrm2j4hw6yrwu579mlq2gg95nzqty3fpaxcpk',
                'ecash:qztvmtsvsgzzdt5rzgtdv2fc8hd8aedd4v8rxttrt0',
                'ecash:qqfvfjp2435fdktwmcuwhytttqv6gmyq8gq4a6tsj2',
                'ecash:qpaa7n5pjg2uel5n0f3n4c52ut5a82kuqcunkfhuhj',
                'ecash:qphzk6xg0wrw67dcdgyuvtz8vtt7gvduegnh0l7gcn',
                'ecash:qrn6turzu59rt43elsthxuug8ygeuc28t5ux5hqnl0',
                'ecash:qz35jcyk8kn7qtslqdtnykv9gada495aauxyeljy8s',
                'ecash:qzwcdzwupqfa5n6jqgj7awutsryr2tky553a8ddw9p',
                'ecash:qz75ekume8d7y83tn0wn89d7x5xc4wlpd5wkjutg7a',
                'ecash:qqkh24v4294s7cju28fz80yy5kklcaajqcajx2tv7k',
                'ecash:qrwsrk79tv87nceuadcqknzy2gqshk66zchyqqakmd',
                'ecash:qqyrns594r2m22f5c2x553dpsdwaghc22vkfgfhqn5',
                'ecash:qq7a367d7rjdv4cj5u3lyg6kw5ckdpm3vv8hkvlk26',
                'ecash:qzt557ajdtp0v2lkpfn47hcqyjngnspa055p5p0k3e',
                'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv',
                'ecash:qrwwkvr2wdvzu5kyxqjl0mk4sfaxm85juq4wa28f2e',
                'ecash:qrunq208tyej03dcvn4x39hvlkj0l7m2hqz0s0zjys',
                'ecash:qqrzpf7l9crr00yd8haxv0yhns26vuwluszxw5x0wv',
                'ecash:qpuy0lnswzlvs4nm86qs74pl97qvc0srhc665724p7',
                'ecash:qzphvp80l4rsl2468czyuznufe4g5lhgccw7fd7qw6',
                'ecash:qqk77gg5xw8sh6dzd9tr0rhuuc8p0dvqkvvp76ut5u',
                'ecash:qzptzhmgr220a8m2c2waacs560wc3a2mlsxt0wkmsc',
                'ecash:qpu0g0hxk8jhwv5uplyuk3lhgdv4f6hgrusukd6cwl',
                'ecash:qrq605fdmhr2xped7zw0tc9qpm8pnrxgcyrwkrjedn',
                'ecash:qz7vajm78ewnln97uvs3f99dxg20j8x8fu2a6jt5fk',
                'ecash:qrauj3smamqd0qc99ssvn98lk38yvpqa2y8stcekhf',
                'ecash:qz55hqtk62xttdwrq8cshdzmmv7kurp80580x8h5zl',
                'ecash:qzvnu6lw7a85a5xrleg6lz27gakwxlpk9v55jr2p46',
                'ecash:qqhv22qcvn7f38dt2sas2333e9crsztgncmtgdrcm2',
                'ecash:qpvph4dusdwv0z9ajzj0duxfcg0tzu6h9cyaag2pwn',
                'ecash:qq5v4wmfhclzqur4wnt6phwxt2qpk6h9nyesy04fn0',
                'ecash:qzut8s3dsfuycflqyf8a328l2jdx06245vra9q3458',
                'ecash:qzu270ek398w0ejk83njw98eadrueqafuy098ueasq',
                'ecash:qrayn7v0kf0ghpxwyyxsduzj4mvgctz0nqysm47axp',
                'ecash:qpsng33a73pkh7xxv2myj9mppa3l5hvfaunm762526',
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                'ecash:qzelsrygyg838qspwq4y6rqr8vjgqk0umsa2rsz35w',
                'ecash:qzkhavkghz869cl4zk9nnzjfhunhgqvcfce9c7mvdc',
                'ecash:qp45whpmdrlcgy09cse8rmwyunexmlyq9gaduqlm6p',
                'ecash:qrhgew49vsk3chg679grahdx54gyf6qsdcurky8xms',
                'ecash:qplr7p624c7vnxn0fzujsqywh9zcv9dk4ytfcrvql0',
                'ecash:qqypd75zeegzrpc6ldhmmj28qu20ha78a57269a645',
                'ecash:qqfwq959a6szyfdw85749zccftsdk533gv3lc4mfrp',
            ],
            satoshisSent: 199975,
            stackArray: [
                '64726f70',
                'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                '415454454e54494f4e204752554d50592050454f504c452120f09f98be20596f752063616e206e6f77206465706f736974202447525020746f207468652065546f6b656e20626f7420617420742e6d652f6543617368506c617920746f20746f7020757020796f757220436173696e6f20437265646974732120316d2024475250203d2031204372656469742e20506c617920436173696e6f2067616d657320616e642077696e205845432120',
            ],
            xecTxType: 'Sent',
        },
        tx: {
            txid: '298c3d1a5bd00bd86d92d48ec5695c25a0a86093964d9f53eb19b46dc472b9f5',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '1238b76f12c0a4e2c54f5f80951464396f40685256f0ffc3e30a450995e5da43',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100a6886a347a977b31fb3cf4a0b0ef85e58bd60d7af9db27d4d260f71c9b5f22c30220436ceaca789bc8ab631633434eb0b64b93ae6ebeac94d3ddbd12d3916a57fc8441210343b0a63fb80795016f064481f0380836adf7cde6ad32a662ddf551876b303a93',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                    sats: 16194930n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a0464726f7020fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa4cad415454454e54494f4e204752554d50592050454f504c452120f09f98be20596f752063616e206e6f77206465706f736974202447525020746f207468652065546f6b656e20626f7420617420742e6d652f6543617368506c617920746f20746f7020757020796f757220436173696e6f20437265646974732120316d2024475250203d2031204372656469742e20506c617920436173696e6f2067616d657320616e642077696e205845432120',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a9145561e7d054bb4d81d862fdc674525c2dc337ac6d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91417b83cbad4814a5c6400e418ec69f29963a2805888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142e153c4fc63dcabf0e8949b20ddab2c3df7704ed88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9149966d31280b53f1c2b85f975918eb3023b281f8688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914bfd3a8b912a7988809090de56651d47451528ba188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9147ff46e0807b0d3a5797dd65beae6cfcc2d01e56e88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914585ecb807269977bc21a1a2cd5d7c4ff1150e94988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140db07d6b795f5fe5f47e53aab25aac078d229f8188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9143f23e265a57078ac8e675f78bd552a95943ca7e888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a33b3460d43b9e27a165185b2863b1f64d418d8288ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914e006de0508dcbf24ae0455ca3b5665ed0545553c88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9145f1ec6dd2d02c1fa32b184818be5611ae674df0388ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914445c0c740419357dd03c93a351c69eedf433be4688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914eafcfdecd98cde993e3be01a9ad1158fd3eb773988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914023a7087ee9bfabc77548fc5f0a359ae9bacf7bc88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914eded3588169234400f7556a40baf808e1ec8ebf588ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9141a33684209d978e8bc143c6fcdb7f56e3243dcee88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914486cbf0bfba3b7d0aae10bec7f0d4226e6e10f9688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91480c72defab2c99cf19341cc0e2992c659d42198788ac',
                    spentBy: {
                        txid: '46eed31f3d61c5a0a7023c4626c061afc158de9d3855ab304abefd7bb4f7de0d',
                        outIdx: 109,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a15db8a24f9b3740383927a1d787ba77b34b63a888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91423a1340dbbe6dedf1cd31cdf11f85b3442cfd82888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9141e464c8d283976ddc13fa6756736f8f3a0069f7888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914f2d85c4f3fb78c1d9727dea73690c72815756e2b88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914d8723ad3becc44356267e8d0313692c493fe2bdf88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914161cae938ec121bd9970304766865991fe80a63088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91490ec469ca54ce9616282dea980a39f0e4b9a6ab988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b386b1f59b5f03b45471df214d47f7ab5d48003088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914d2ea9ba1a091c2adf0116da4d2c3ddc3cf7124a988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91451379ab611287658c9e1c0f98f0929addd5a2f1d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91432fc3341b83f902a360cbbf91a08ea99c293733d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91459f93839ba24abd6996b75a39486691dd40660be88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91473ef17c5b9f551eae3f3b4fadf61f93cae5e6aea88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91469003998c2c32ac81951b88416a9a15df3a1992988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9145dd0411fa601ab82fcd68894c95934619a49920688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914534c4407eeea7e4b8c3ed7dae5cb4a2539beed9988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91447f86f44721c8d0bac263602717fc10b0da49b9f88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91485149cd55457401ad4645c54b86caa0ce0d4f05f88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914f0af3a1411ed4989bf5c44641c3a86d473afe45188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914973d953e15d62383b24ebe3d73d01e7b83bd989788ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914dadf34cde9c774fdd6340cd2916a9b9c5d57cf4388ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9144de2fb39f09d14492f4d40e0fb670a42af505c6b88ac',
                    spentBy: {
                        txid: '11a58a92afc39a6d7bd413a11864d0d34f21ab72b63028293d1004ff76e74950',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914fd7f54f496cadb0b6d3cc206ee098bab29bd5bbf88ac',
                    spentBy: {
                        txid: '51518eb20ca45eaa07925e6d502da8b5be5ad411272863be9a2280e46d6505f7',
                        outIdx: 11,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b55d27e509500af85243622343ca9e3d54a0438a88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914547abbaaa1c5e92ecde551c1bfdb9a2e5454b83088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140f69a9314698156aee8bdb96a36f1e08f1ba168d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91468506abb4ce69c0e596c80bebe456f3be7f904fd88ac',
                    spentBy: {
                        txid: '39ef9f76d052d4b3fa5f4aa19b5597b1b55ab71e361c665eef371a501a1282be',
                        outIdx: 9,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91447ab6772a47d55b7649b83f105fd5cdc3eaa22a988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b74cc1418fad22fe0eb0bef57082d9836a29340c88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914e33f7fa6b1c03d68a28758c1ef3a5fa7322cafbb88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a30153ad73ba57b6f37c210435e407bb7a368a5d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9141404dc7b54ab7768837729e2efe052105a4c405988ac',
                    spentBy: {
                        txid: '6ab45eb0770ca387bcd76e3ffc0439958dc2bb7b87437234c722a3c615ca2071',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91496cdae0c820426ae831216d629383dda7ee5adab88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91412c4c82aac6896d96ede38eb916b5819a46c803a88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9147bdf4e819215ccfe937a633ae28ae2e9d3aadc0688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9146e2b68c87b86ed79b86a09c62c4762d7e431bcca88ac',
                    spentBy: {
                        txid: 'c95c7f6f4baa7d91fd3aa24f9b73b4e04ef840ac970ae82e2d386f81eeec2cf0',
                        outIdx: 22,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914e7a5f062e50a35d639fc1773738839119e61475d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a34960963da7e02e1f0357325985475bda969def88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9149d8689dc0813da4f520225eebb8b80c8352ec4a588ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914bd4cdb9bc9dbe21e2b9bdd3395be350d8abbe16d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142d755595516b0f625c51d223bc84a5adfc77b20688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914dd01dbc55b0fe9e33ceb700b4c4452010bdb5a1688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140839c285a8d5b52934c28d4a45a1835dd45f0a5388ac',
                    spentBy: {
                        txid: 'cd68979654b1ecee37a33c321b6cb7f2966be6af02232855f46c2aef231463cb',
                        outIdx: 1,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9143dd8ebcdf0e4d65712a723f2235675316687716388ac',
                    spentBy: {
                        txid: 'f8123bf1175047b9d5ebd5d7cacbb378aaa8f58a55ed400893f192f28606a0d3',
                        outIdx: 3,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914974a7bb26ac2f62bf60a675f5f0024a689c03d7d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                    spentBy: {
                        txid: '27f2d0454f78b90be92eea7d557486ebc07d7ea1004fa7dbc0e7f89e835a4c6e',
                        outIdx: 3,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914dceb306a73582e52c43025f7eed5827a6d9e92e088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914f93029e7593327c5b864ea6896ecfda4fffb6ab888ac',
                    spentBy: {
                        txid: 'c62c16c68df7d69d5d1524ac250e30473dacdbf13c131fb1978911674f045665',
                        outIdx: 17,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140620a7df2e0637bc8d3dfa663c979c15a671dfe488ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9147847fe7070bec8567b3e810f543f2f80cc3e03be88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914837604effd470faaba3e044e0a7c4e6a8a7ee8c688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142def2114338f0be9a26956378efce60e17b580b388ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91482b15f681a94fe9f6ac29ddee214d3dd88f55bfc88ac',
                    spentBy: {
                        txid: '920853c238299614bc03270839f1b815c9763385485e04be18a861039c07b606',
                        outIdx: 14,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91478f43ee6b1e577329c0fc9cb47f7435954eae81f88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914c1a7d12dddc6a3072df09cf5e0a00ece198cc8c188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914bccecb7e3e5d3fccbee3211494ad3214f91cc74f88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914fbc9461beec0d783052c20c994ffb44e46041d5188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a94b8176d28cb5b5c301f10bb45bdb3d6e0c277d88ac',
                    spentBy: {
                        txid: 'b2c0183a724aa141568e9c116b684eb94e8be326c92cf588d83296916974017f',
                        outIdx: 1,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914993e6beef74f4ed0c3fe51af895e476ce37c362b88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142ec5281864fc989dab543b054631c9703809689e88ac',
                    spentBy: {
                        txid: '962f5149fbca6c739886cb839901b0de5926119430ce268b7aa1be0c073ad84c',
                        outIdx: 6,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914581bd5bc835cc788bd90a4f6f0c9c21eb173572e88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91428cabb69be3e20707574d7a0ddc65a801b6ae59988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b8b3c22d82784c27e0224fd8a8ff549a67e955a388ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b8af3f36894ee7e6563c672714f9eb47cc83a9e188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914fa49f98fb25e8b84ce210d06f052aed88c2c4f9888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9146134463df4436bf8c662b64917610f63fa5d89ef88ac',
                    spentBy: {
                        txid: 'd8a9729473589d3c30d26e672c2c49e1a58fc380765ddbcde8628ab93293af11',
                        outIdx: 3,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '3c844ed9f76207027a47dd2170a590a1f8d8a8ff9b797da4f050ad6394adf52a',
                        outIdx: 1,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b3f80c88220f138201702a4d0c033b248059fcdc88ac',
                    spentBy: {
                        txid: '7d5cf7814e3225587e522e03da0589b806de0498a779e8b0d1cb273c9f257b87',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914ad7eb2c8b88fa2e3f5158b398a49bf277401984e88ac',
                    spentBy: {
                        txid: '50974e99e87dec3b575497b9592a89d9ae0f2dc129f26d567582e4d0aaf27741',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9146b475c3b68ff8411e5c43271edc4e4f26dfc802a88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914ee8cbaa5642d1c5d1af1503edda6a55044e8106e88ac',
                    spentBy: {
                        txid: 'ca0229e4287f534526e811545e43c01bc011d2451acebd18aacbb74fe8d055ea',
                        outIdx: 2,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9147e3f074aae3cc99a6f48b928008eb9458615b6a988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140816fa82ce5021871afb6fbdc9470714fbf7c7ed88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91412e01685eea02225ae3d3d528b184ae0db52314388ac',
                    spentBy: {
                        txid: 'fc4013c0a37cde3de2238f61c5212a7d115382aae5e0cb28b80c1d935e9233f5',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                    spentBy: {
                        txid: '96f072b8db666b8eb59c0f43373b65c50fd5ac5042ea1e7d822161b45c2219a1',
                        outIdx: 0,
                    },
                    sats: 15987628n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1711102052,
            size: 3645,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 836935,
                hash: '000000000000000008e74d35ca49974c15ca67e1209fa7e23bea15450dd64336',
                timestamp: 1711102691,
            },
        },
        walletHashes: ['2a96944d06700882bbd984761d9c9e4215f2d78e'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected:
            '🪂Airdrop: Sent 2k XEC to holders of fb423...f87aa | ATTENTION GRUMPY PEOPLE! 😾 You can now deposit $GRP to the eToken bot at t.me/eCashPlay to top up your Casino Credits! 1m $GRP = 1 Credit. Play Casino games and win XEC! ',
    },
    {
        description: 'Off spec airdrop tx',
        parsedTx: {
            appActions: [
                {
                    app: '🪂Airdrop',
                    isValid: false,
                    lokadId: '64726f70',
                },
            ],
            parsedTokenEntries: [],
            recipients: [
                'ecash:qp2kre7s2ja5mqwcvt7uvazjtskuxdavd5e5vrcxel',
                'ecash:qqtms0966jq55hryqrjp3mrf72vk8g5qtqpwysa6na',
                'ecash:qqhp20z0cc7u40cw39ymyrw6ktpa7acya55l0hgyrd',
                'ecash:qzvkd5cjsz6n78ptshuhtyvwkvprk2qlsc4yrkjum8',
                'ecash:qzla829ez2ne3zqfpyx72ej36369z55t5y75969dkn',
                'ecash:qpllgmsgq7cd8fte0ht9h6hxelxz6q09dcpuhyzzr9',
                'ecash:qpv9ajuqwf5ew77zrgdze4whcnl3z58ffyulr5hxmz',
                'ecash:qqxmqltt0904le050ef64vj64src6g5lsy9t0vws7c',
                'ecash:qqlj8cn954c83tywva0h3024922eg098aq90dtfspf',
                'ecash:qz3nkdrq6saeufapv5v9k2rrk8my6svdsg9wj4s4hl',
                'ecash:qrsqdhs9prwt7f9wq32u5w6kvhks23248sz7x0vz03',
                'ecash:qp03a3ka95pvr73jkxzgrzl9vydwvaxlqv4nuyqll2',
                'ecash:qpz9crr5qsvn2lws8jf6x5wxnmklgva7gcx4qsn5sw',
                'ecash:qr40el0vmxxdaxf780sp4xk3zk8a86mh8ypwtuycl9',
                'ecash:qqpr5uy8a6dl40rh2j8utu9rtxhfht8hhstayxwwfm',
                'ecash:qrk76dvgz6frgsq0w4t2gza0sz8paj8t75yz9dg9aa',
                'ecash:qqdrx6zzp8vh369uzs7xlndh74hrys7uachl0rwq7d',
                'ecash:qpyxe0ctlw3m0592uy97clcdggnwdcg0jctx6mfrz4',
                'ecash:qzqvwt004vkfnncexswvpc5e93je6ssesuzzjzad2z',
                'ecash:qzs4mw9zf7dnwspc8yn6r4u8hfmmxjmr4qa2pvqwvr',
                'ecash:qq36zdqdh0ndahcu6vwd7y0ctv6y9n7c9qwg9xyccn',
                'ecash:qq0yvnyd9quhdhwp87n82eeklre6qp5l0qcy78a7x6',
                'ecash:qredshz087mcc8vhyl02wd5scu5p2atw9vxhhp6t7d',
                'ecash:qrv8ywknhmxygdtzvl5dqvfkjtzf8l3tmukugtcl6d',
                'ecash:qqtpet5n3mqjr0vewqcywe5xtxglaq9xxqukk4u9q0',
                'ecash:qzgwc35u54xwjctzst02nq9rnu8yhxn2hyu2mn9e97',
                'ecash:qzecdv04nd0s8dz5w80jzn2877446jqqxq8d2rppc4',
                'ecash:qrfw4xap5zgu9t0sz9k6f5krmhpu7ufy4ynpmajugh',
                'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed',
                'ecash:qpgn0x4kzy58vkxfu8q0nrcf9xka6k30r534m2j2ca',
                'ecash:qqe0cv6phqleq23kpjaljxsga2vu9ymn85q3uuvpdu',
                'ecash:qpvljwpehgj2h45edd6689yxdywagpnqhcd5fngx3n',
                'ecash:qpe77979h864r6hr7w604hmply72uhn2agr5z20769',
                'ecash:qp5sqwvcctpj4jqe2xugg94f59wl8gve9yvt7h4vj0',
                'ecash:qpwaqsgl5cq6hqhu66yffj2ex3se5jvjqcmn6tp9gn',
                'ecash:qpf5c3q8am48ujuv8mta4ewtfgjnn0hdnyx7nqk7y8',
                'ecash:qprlsm6ywgwg6zavycmqyutlcy9smfymnupv08w52e',
                'ecash:qzz3f8x423t5qxk5v3w9fwrv4gxwp48stu7zk0lhxv',
                'ecash:qrc27ws5z8k5nzdlt3zxg8p6sm288tly2y3m6nwxww',
                'ecash:qztnm9f7zhtz8qajf6lr6u7sreac80vcju4tk6j75z',
                'ecash:qrdd7dxda8rhflwkxsxd9yt2nww96470gv48s4f9j0',
                'ecash:qpx797ee7zw3gjf0f4qwp7m8pfp275zudvk3ym56ad',
                'ecash:qr7h7485jm9dkzmd8npqdmsf3w4jn02mhu7n4g6whr',
                'ecash:qz646fl9p9gq47zjgd3zxs72nc74fgzr3gw9u8p7tc',
                'ecash:qp284wa258z7jtkdu4gur07mngh9g49cxqxs2pmdgc',
                'ecash:qq8kn2f3g6vp26hw30dedgm0rcy0rwsk35ln6cazck',
                'ecash:qp59q64mfnnfcrjedjqta0j9dua707gyl5q5p2a5py',
                'ecash:qpr6kemj5374tdmynwplzp0atnwra23z4y7mt4d46q',
                'ecash:qp36z7k8xt7k4l5xnxeypg5mfqeyvvyduu04m37fwd',
                'ecash:qzm5es2p37kj9lswkzl02uyzmxpk52f5psl90kzl6t',
                'ecash:qr3n7laxk8qr669zsavvrme6t7nnyt90hvy5esczyf',
                'ecash:qz3sz5adwwa90dhn0sssgd0yq7ah5d52t56s78jsfa',
                'ecash:qq2qfhrm2j4hw6yrwu579mlq2gg95nzqty3fpaxcpk',
                'ecash:qztvmtsvsgzzdt5rzgtdv2fc8hd8aedd4v8rxttrt0',
                'ecash:qqfvfjp2435fdktwmcuwhytttqv6gmyq8gq4a6tsj2',
                'ecash:qpaa7n5pjg2uel5n0f3n4c52ut5a82kuqcunkfhuhj',
                'ecash:qphzk6xg0wrw67dcdgyuvtz8vtt7gvduegnh0l7gcn',
                'ecash:qrn6turzu59rt43elsthxuug8ygeuc28t5ux5hqnl0',
                'ecash:qz35jcyk8kn7qtslqdtnykv9gada495aauxyeljy8s',
                'ecash:qzwcdzwupqfa5n6jqgj7awutsryr2tky553a8ddw9p',
                'ecash:qz75ekume8d7y83tn0wn89d7x5xc4wlpd5wkjutg7a',
                'ecash:qqkh24v4294s7cju28fz80yy5kklcaajqcajx2tv7k',
                'ecash:qrwsrk79tv87nceuadcqknzy2gqshk66zchyqqakmd',
                'ecash:qqyrns594r2m22f5c2x553dpsdwaghc22vkfgfhqn5',
                'ecash:qq7a367d7rjdv4cj5u3lyg6kw5ckdpm3vv8hkvlk26',
                'ecash:qzt557ajdtp0v2lkpfn47hcqyjngnspa055p5p0k3e',
                'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv',
                'ecash:qrwwkvr2wdvzu5kyxqjl0mk4sfaxm85juq4wa28f2e',
                'ecash:qrunq208tyej03dcvn4x39hvlkj0l7m2hqz0s0zjys',
                'ecash:qqrzpf7l9crr00yd8haxv0yhns26vuwluszxw5x0wv',
                'ecash:qpuy0lnswzlvs4nm86qs74pl97qvc0srhc665724p7',
                'ecash:qzphvp80l4rsl2468czyuznufe4g5lhgccw7fd7qw6',
                'ecash:qqk77gg5xw8sh6dzd9tr0rhuuc8p0dvqkvvp76ut5u',
                'ecash:qzptzhmgr220a8m2c2waacs560wc3a2mlsxt0wkmsc',
                'ecash:qpu0g0hxk8jhwv5uplyuk3lhgdv4f6hgrusukd6cwl',
                'ecash:qrq605fdmhr2xped7zw0tc9qpm8pnrxgcyrwkrjedn',
                'ecash:qz7vajm78ewnln97uvs3f99dxg20j8x8fu2a6jt5fk',
                'ecash:qrauj3smamqd0qc99ssvn98lk38yvpqa2y8stcekhf',
                'ecash:qz55hqtk62xttdwrq8cshdzmmv7kurp80580x8h5zl',
                'ecash:qzvnu6lw7a85a5xrleg6lz27gakwxlpk9v55jr2p46',
                'ecash:qqhv22qcvn7f38dt2sas2333e9crsztgncmtgdrcm2',
                'ecash:qpvph4dusdwv0z9ajzj0duxfcg0tzu6h9cyaag2pwn',
                'ecash:qq5v4wmfhclzqur4wnt6phwxt2qpk6h9nyesy04fn0',
                'ecash:qzut8s3dsfuycflqyf8a328l2jdx06245vra9q3458',
                'ecash:qzu270ek398w0ejk83njw98eadrueqafuy098ueasq',
                'ecash:qrayn7v0kf0ghpxwyyxsduzj4mvgctz0nqysm47axp',
                'ecash:qpsng33a73pkh7xxv2myj9mppa3l5hvfaunm762526',
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                'ecash:qzelsrygyg838qspwq4y6rqr8vjgqk0umsa2rsz35w',
                'ecash:qzkhavkghz869cl4zk9nnzjfhunhgqvcfce9c7mvdc',
                'ecash:qp45whpmdrlcgy09cse8rmwyunexmlyq9gaduqlm6p',
                'ecash:qrhgew49vsk3chg679grahdx54gyf6qsdcurky8xms',
                'ecash:qplr7p624c7vnxn0fzujsqywh9zcv9dk4ytfcrvql0',
                'ecash:qqypd75zeegzrpc6ldhmmj28qu20ha78a57269a645',
                'ecash:qqfwq959a6szyfdw85749zccftsdk533gv3lc4mfrp',
            ],
            satoshisSent: 199975,
            stackArray: [
                '64726f70',
                'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87',
            ],
            xecTxType: 'Sent',
        },
        tx: {
            txid: '298c3d1a5bd00bd86d92d48ec5695c25a0a86093964d9f53eb19b46dc472b9f5',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '1238b76f12c0a4e2c54f5f80951464396f40685256f0ffc3e30a450995e5da43',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100a6886a347a977b31fb3cf4a0b0ef85e58bd60d7af9db27d4d260f71c9b5f22c30220436ceaca789bc8ab631633434eb0b64b93ae6ebeac94d3ddbd12d3916a57fc8441210343b0a63fb80795016f064481f0380836adf7cde6ad32a662ddf551876b303a93',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                    sats: 16194930n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a0464726f701ffb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a9145561e7d054bb4d81d862fdc674525c2dc337ac6d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91417b83cbad4814a5c6400e418ec69f29963a2805888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142e153c4fc63dcabf0e8949b20ddab2c3df7704ed88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9149966d31280b53f1c2b85f975918eb3023b281f8688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914bfd3a8b912a7988809090de56651d47451528ba188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9147ff46e0807b0d3a5797dd65beae6cfcc2d01e56e88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914585ecb807269977bc21a1a2cd5d7c4ff1150e94988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140db07d6b795f5fe5f47e53aab25aac078d229f8188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9143f23e265a57078ac8e675f78bd552a95943ca7e888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a33b3460d43b9e27a165185b2863b1f64d418d8288ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914e006de0508dcbf24ae0455ca3b5665ed0545553c88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9145f1ec6dd2d02c1fa32b184818be5611ae674df0388ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914445c0c740419357dd03c93a351c69eedf433be4688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914eafcfdecd98cde993e3be01a9ad1158fd3eb773988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914023a7087ee9bfabc77548fc5f0a359ae9bacf7bc88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914eded3588169234400f7556a40baf808e1ec8ebf588ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9141a33684209d978e8bc143c6fcdb7f56e3243dcee88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914486cbf0bfba3b7d0aae10bec7f0d4226e6e10f9688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91480c72defab2c99cf19341cc0e2992c659d42198788ac',
                    spentBy: {
                        txid: '46eed31f3d61c5a0a7023c4626c061afc158de9d3855ab304abefd7bb4f7de0d',
                        outIdx: 109,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a15db8a24f9b3740383927a1d787ba77b34b63a888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91423a1340dbbe6dedf1cd31cdf11f85b3442cfd82888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9141e464c8d283976ddc13fa6756736f8f3a0069f7888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914f2d85c4f3fb78c1d9727dea73690c72815756e2b88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914d8723ad3becc44356267e8d0313692c493fe2bdf88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914161cae938ec121bd9970304766865991fe80a63088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91490ec469ca54ce9616282dea980a39f0e4b9a6ab988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b386b1f59b5f03b45471df214d47f7ab5d48003088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914d2ea9ba1a091c2adf0116da4d2c3ddc3cf7124a988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91451379ab611287658c9e1c0f98f0929addd5a2f1d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91432fc3341b83f902a360cbbf91a08ea99c293733d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91459f93839ba24abd6996b75a39486691dd40660be88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91473ef17c5b9f551eae3f3b4fadf61f93cae5e6aea88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91469003998c2c32ac81951b88416a9a15df3a1992988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9145dd0411fa601ab82fcd68894c95934619a49920688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914534c4407eeea7e4b8c3ed7dae5cb4a2539beed9988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91447f86f44721c8d0bac263602717fc10b0da49b9f88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91485149cd55457401ad4645c54b86caa0ce0d4f05f88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914f0af3a1411ed4989bf5c44641c3a86d473afe45188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914973d953e15d62383b24ebe3d73d01e7b83bd989788ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914dadf34cde9c774fdd6340cd2916a9b9c5d57cf4388ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9144de2fb39f09d14492f4d40e0fb670a42af505c6b88ac',
                    spentBy: {
                        txid: '11a58a92afc39a6d7bd413a11864d0d34f21ab72b63028293d1004ff76e74950',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914fd7f54f496cadb0b6d3cc206ee098bab29bd5bbf88ac',
                    spentBy: {
                        txid: '51518eb20ca45eaa07925e6d502da8b5be5ad411272863be9a2280e46d6505f7',
                        outIdx: 11,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b55d27e509500af85243622343ca9e3d54a0438a88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914547abbaaa1c5e92ecde551c1bfdb9a2e5454b83088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140f69a9314698156aee8bdb96a36f1e08f1ba168d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91468506abb4ce69c0e596c80bebe456f3be7f904fd88ac',
                    spentBy: {
                        txid: '39ef9f76d052d4b3fa5f4aa19b5597b1b55ab71e361c665eef371a501a1282be',
                        outIdx: 9,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91447ab6772a47d55b7649b83f105fd5cdc3eaa22a988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b74cc1418fad22fe0eb0bef57082d9836a29340c88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914e33f7fa6b1c03d68a28758c1ef3a5fa7322cafbb88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a30153ad73ba57b6f37c210435e407bb7a368a5d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9141404dc7b54ab7768837729e2efe052105a4c405988ac',
                    spentBy: {
                        txid: '6ab45eb0770ca387bcd76e3ffc0439958dc2bb7b87437234c722a3c615ca2071',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91496cdae0c820426ae831216d629383dda7ee5adab88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91412c4c82aac6896d96ede38eb916b5819a46c803a88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9147bdf4e819215ccfe937a633ae28ae2e9d3aadc0688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9146e2b68c87b86ed79b86a09c62c4762d7e431bcca88ac',
                    spentBy: {
                        txid: 'c95c7f6f4baa7d91fd3aa24f9b73b4e04ef840ac970ae82e2d386f81eeec2cf0',
                        outIdx: 22,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914e7a5f062e50a35d639fc1773738839119e61475d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a34960963da7e02e1f0357325985475bda969def88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9149d8689dc0813da4f520225eebb8b80c8352ec4a588ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914bd4cdb9bc9dbe21e2b9bdd3395be350d8abbe16d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142d755595516b0f625c51d223bc84a5adfc77b20688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914dd01dbc55b0fe9e33ceb700b4c4452010bdb5a1688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140839c285a8d5b52934c28d4a45a1835dd45f0a5388ac',
                    spentBy: {
                        txid: 'cd68979654b1ecee37a33c321b6cb7f2966be6af02232855f46c2aef231463cb',
                        outIdx: 1,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9143dd8ebcdf0e4d65712a723f2235675316687716388ac',
                    spentBy: {
                        txid: 'f8123bf1175047b9d5ebd5d7cacbb378aaa8f58a55ed400893f192f28606a0d3',
                        outIdx: 3,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914974a7bb26ac2f62bf60a675f5f0024a689c03d7d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                    spentBy: {
                        txid: '27f2d0454f78b90be92eea7d557486ebc07d7ea1004fa7dbc0e7f89e835a4c6e',
                        outIdx: 3,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914dceb306a73582e52c43025f7eed5827a6d9e92e088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914f93029e7593327c5b864ea6896ecfda4fffb6ab888ac',
                    spentBy: {
                        txid: 'c62c16c68df7d69d5d1524ac250e30473dacdbf13c131fb1978911674f045665',
                        outIdx: 17,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140620a7df2e0637bc8d3dfa663c979c15a671dfe488ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9147847fe7070bec8567b3e810f543f2f80cc3e03be88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914837604effd470faaba3e044e0a7c4e6a8a7ee8c688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142def2114338f0be9a26956378efce60e17b580b388ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91482b15f681a94fe9f6ac29ddee214d3dd88f55bfc88ac',
                    spentBy: {
                        txid: '920853c238299614bc03270839f1b815c9763385485e04be18a861039c07b606',
                        outIdx: 14,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91478f43ee6b1e577329c0fc9cb47f7435954eae81f88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914c1a7d12dddc6a3072df09cf5e0a00ece198cc8c188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914bccecb7e3e5d3fccbee3211494ad3214f91cc74f88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914fbc9461beec0d783052c20c994ffb44e46041d5188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a94b8176d28cb5b5c301f10bb45bdb3d6e0c277d88ac',
                    spentBy: {
                        txid: 'b2c0183a724aa141568e9c116b684eb94e8be326c92cf588d83296916974017f',
                        outIdx: 1,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914993e6beef74f4ed0c3fe51af895e476ce37c362b88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142ec5281864fc989dab543b054631c9703809689e88ac',
                    spentBy: {
                        txid: '962f5149fbca6c739886cb839901b0de5926119430ce268b7aa1be0c073ad84c',
                        outIdx: 6,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914581bd5bc835cc788bd90a4f6f0c9c21eb173572e88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91428cabb69be3e20707574d7a0ddc65a801b6ae59988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b8b3c22d82784c27e0224fd8a8ff549a67e955a388ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b8af3f36894ee7e6563c672714f9eb47cc83a9e188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914fa49f98fb25e8b84ce210d06f052aed88c2c4f9888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9146134463df4436bf8c662b64917610f63fa5d89ef88ac',
                    spentBy: {
                        txid: 'd8a9729473589d3c30d26e672c2c49e1a58fc380765ddbcde8628ab93293af11',
                        outIdx: 3,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '3c844ed9f76207027a47dd2170a590a1f8d8a8ff9b797da4f050ad6394adf52a',
                        outIdx: 1,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b3f80c88220f138201702a4d0c033b248059fcdc88ac',
                    spentBy: {
                        txid: '7d5cf7814e3225587e522e03da0589b806de0498a779e8b0d1cb273c9f257b87',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914ad7eb2c8b88fa2e3f5158b398a49bf277401984e88ac',
                    spentBy: {
                        txid: '50974e99e87dec3b575497b9592a89d9ae0f2dc129f26d567582e4d0aaf27741',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9146b475c3b68ff8411e5c43271edc4e4f26dfc802a88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914ee8cbaa5642d1c5d1af1503edda6a55044e8106e88ac',
                    spentBy: {
                        txid: 'ca0229e4287f534526e811545e43c01bc011d2451acebd18aacbb74fe8d055ea',
                        outIdx: 2,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9147e3f074aae3cc99a6f48b928008eb9458615b6a988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140816fa82ce5021871afb6fbdc9470714fbf7c7ed88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91412e01685eea02225ae3d3d528b184ae0db52314388ac',
                    spentBy: {
                        txid: 'fc4013c0a37cde3de2238f61c5212a7d115382aae5e0cb28b80c1d935e9233f5',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                    spentBy: {
                        txid: '96f072b8db666b8eb59c0f43373b65c50fd5ac5042ea1e7d822161b45c2219a1',
                        outIdx: 0,
                    },
                    sats: 15987628n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1711102052,
            size: 3645,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 836935,
                hash: '000000000000000008e74d35ca49974c15ca67e1209fa7e23bea15450dd64336',
                timestamp: 1711102691,
            },
        },
        walletHashes: ['2a96944d06700882bbd984761d9c9e4215f2d78e'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'Sent 2k XEC | Invalid 🪂Airdrop',
    },
    {
        description: 'PayButton tx with data and payment id',
        parsedTx: {
            satoshisSent: 3401592,
            stackArray: [
                '50415900',
                '00',
                'f09f9882f09f918d',
                '69860643e4dc4c88',
            ],
            xecTxType: 'Sent',
            recipients: [
                'ecash:qrjh8hvf5c0cmt44d06mt76a0nvxuvdt9cmj39zxwm',
                'ecash:qp5h4eetqcj407nfl82dpyvz22w6x69tdyxpprn8zg',
            ],
            appActions: [
                {
                    action: {
                        data: '😂👍',
                        nonce: '69860643e4dc4c88',
                    },
                    isValid: true,
                    lokadId: '50415900',
                    app: 'PayButton',
                },
            ],
            parsedTokenEntries: [],
        },
        tx: {
            txid: '952dd66d7145330d8d3b2f09abbee33344e8aa65b7483cfaa9d278ec55379e29',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '37a740f89ab6c212f211150f35fb1e12cd80f287b825126eed262999ea4264b8',
                        outIdx: 0,
                    },
                    inputScript:
                        '41fc1401150778a0d47d5279ccdaa13298cfa43e25d8d37d37570291207a92098beefa8fb25b8fb9cb2c4d7b5f98b7ff377c54932e0e67f4db2fc127ed86e01b1a4121024b60abfca9302b9bf5731faca03fd4f0b06391621a4cd1d57fffd6f1179bb9ba',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a914e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc88ac',
                    sats: 3403110n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04504159000008f09f9882f09f918d0869860643e4dc4c88',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914e573dd89a61f8daeb56bf5b5fb5d7cd86e31ab2e88ac',
                    spentBy: {
                        txid: '8b2a86aabae90c0f9e8a111e220c85b52fc54b15c6d46cbbbca89020318714a4',
                        outIdx: 0,
                    },
                    sats: 3392102n,
                },
                {
                    outputScript:
                        '76a914697ae72b062557fa69f9d4d09182529da368ab6988ac',
                    spentBy: {
                        txid: '1b3165e7edef19369880f032d8f4d19cc41e9ebf2bfb657518ae99075aa2b471',
                        outIdx: 0,
                    },
                    sats: 9490n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 253,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 828920,
                hash: '00000000000000000d6a683b11a6bdaab4b79b15f100daa9361d02207667de1d',
                timestamp: 1706323234,
            },
        },
        walletHashes: ['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'PayButton: Sent 34.02k XEC | 😂👍',
    },
    {
        description: 'PayButton tx with unsupported version number',
        parsedTx: {
            satoshisSent: 3401592,
            stackArray: [
                '50415900',
                '01',
                'f09f9882f09f918d',
                '69860643e4dc4c88',
            ],
            xecTxType: 'Sent',
            recipients: [
                'ecash:qrjh8hvf5c0cmt44d06mt76a0nvxuvdt9cmj39zxwm',
                'ecash:qp5h4eetqcj407nfl82dpyvz22w6x69tdyxpprn8zg',
            ],
            appActions: [
                {
                    app: 'PayButton',
                    isValid: false,
                    lokadId: '50415900',
                },
            ],
            parsedTokenEntries: [],
        },
        tx: {
            txid: '952dd66d7145330d8d3b2f09abbee33344e8aa65b7483cfaa9d278ec55379e29',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '37a740f89ab6c212f211150f35fb1e12cd80f287b825126eed262999ea4264b8',
                        outIdx: 0,
                    },
                    inputScript:
                        '41fc1401150778a0d47d5279ccdaa13298cfa43e25d8d37d37570291207a92098beefa8fb25b8fb9cb2c4d7b5f98b7ff377c54932e0e67f4db2fc127ed86e01b1a4121024b60abfca9302b9bf5731faca03fd4f0b06391621a4cd1d57fffd6f1179bb9ba',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a914e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc88ac',
                    sats: 3403110n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a0450415900010108f09f9882f09f918d0869860643e4dc4c88',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914e573dd89a61f8daeb56bf5b5fb5d7cd86e31ab2e88ac',
                    spentBy: {
                        txid: '8b2a86aabae90c0f9e8a111e220c85b52fc54b15c6d46cbbbca89020318714a4',
                        outIdx: 0,
                    },
                    sats: 3392102n,
                },
                {
                    outputScript:
                        '76a914697ae72b062557fa69f9d4d09182529da368ab6988ac',
                    spentBy: {
                        txid: '1b3165e7edef19369880f032d8f4d19cc41e9ebf2bfb657518ae99075aa2b471',
                        outIdx: 0,
                    },
                    sats: 9490n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 253,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 828920,
                hash: '00000000000000000d6a683b11a6bdaab4b79b15f100daa9361d02207667de1d',
                timestamp: 1706323234,
            },
        },
        walletHashes: ['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'Sent 34.02k XEC | Invalid PayButton',
    },
    {
        description: 'External msg received from Electrum',
        parsedTx: {
            satoshisSent: 600,
            stackArray: ['74657374696e672061206d736720666f72206572726f72'],
            xecTxType: 'Received',
            appActions: [
                {
                    action: {
                        decoded: 'testing a msg for error',
                        stack: '74657374696e672061206d736720666f72206572726f72',
                    },
                    lokadId: '',
                    app: 'none',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qpe3l0v88vmq86x6l43fywu4f5u9w8sslsga0tcn4t'],
            replyAddress: 'ecash:qrhlng96s3awja5h48uhcpvg02azksgxpce6nvshln',
        },
        tx: {
            txid: 'd0c4c5b86016b7a021470180cb4afd1f8456fcf683a19d8b061b2225abd71be4',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '7e439e4a1dde6f4380ed1afddbd5f484db80b00f26c85b3f10f6ccb245da5800',
                        outIdx: 4,
                    },
                    inputScript:
                        '416d2f67c38b81b6fdd13f4cb2c2d0a9194800e98b80a1054ca83b1ea3d739e70f9c4e2c8a61050b40161a0d741db9a6e71d155cf61623b9279739b50446d3ec6a4121026769c23182aaa572c16c82121caff660a7c13befd0d20c263e577ca01c4f029e',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a914eff9a0ba847ae97697a9f97c05887aba2b41060e88ac',
                    sats: 81319n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a1774657374696e672061206d736720666f72206572726f72',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914731fbd873b3603e8dafd62923b954d38571e10fc88ac',
                    spentBy: {
                        txid: 'b817870c8ae5ec94d639089e37763daee271f412ab478705a29b036ba0b00f3d',
                        outIdx: 55,
                    },
                    sats: 80213n,
                },
                {
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    spentBy: {
                        txid: 'dc06ab36c9a7e365f319c0e918324af9778cb29b82c07ff87e2ec80eb6e4e6fe',
                        outIdx: 9,
                    },
                    sats: 600n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1709353270,
            size: 253,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 833968,
                hash: '000000000000000020f276cf59fc4e53672500ca5b5896502d0a50500174c27c',
                timestamp: 1709354653,
            },
        },
        walletHashes: ['4e532257c01b310b3b5c1fd947c79a72addf8523'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected:
            'Received 6.00 XEC | Unparsed OP_RETURN: testing a msg for error',
    },
    {
        description: 'Unknown app tx',
        parsedTx: {
            satoshisSent: 3308,
            stackArray: [
                '3336616533642d4d45524f4e2d57494e227d2c7b226e616d65223a2277616c61222c226d657373616765223a223635396661313133373065333136663265613336616533642d57414c412d57494e227d5d2c227465726d73223a5b7b226e616d65223a22726566657265655075624b6579222c2274797065223a226279746573222c2276616c7565223a22303231383839303432373865626633333035393039336635393661323639376366333636386233626563396133613063363430386134353531343761623364623933227d5d7d7d7d7d',
            ],
            xecTxType: 'Sent',
            recipients: [],
            appActions: [
                {
                    action: {
                        decoded:
                            '36ae3d-MERON-WIN"},{"name":"wala","message":"659fa11370e316f2ea36ae3d-WALA-WIN"}],"terms":[{"name":"refereePubKey","type":"bytes","value":"02188904278ebf33059093f596a2697cf3668b3bec9a3a0c6408a455147ab3db93"}]}}}}',
                        stack: '3336616533642d4d45524f4e2d57494e227d2c7b226e616d65223a2277616c61222c226d657373616765223a223635396661313133373065333136663265613336616533642d57414c412d57494e227d5d2c227465726d73223a5b7b226e616d65223a22726566657265655075624b6579222c2274797065223a226279746573222c2276616c7565223a22303231383839303432373865626633333035393039336635393661323639376366333636386233626563396133613063363430386134353531343761623364623933227d5d7d7d7d7d',
                    },
                    app: 'none',
                    lokadId: '',
                },
            ],
            parsedTokenEntries: [],
        },
        tx: {
            txid: '4cd528a95263714b8f748d58df30c44956158825924e3385b5c5c511129d1b3a',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '9ca28926f8ec125dce0b7084468bd595b27bd73991b48461ac994cacff47a21d',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100b50fac4b810ac6b10ce35f25fcc1a6b1f87b1209e8ee5973732d983395199de102204f860238b12ba3e7adfc432e331405f751fef1aa494c2d0122b7aaa522158933412102188904278ebf33059093f596a2697cf3668b3bec9a3a0c6408a455147ab3db93',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914d18b7b500f17c5db64303fec630f9dbb85aa959688ac',
                    sats: 3725n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a4cd43336616533642d4d45524f4e2d57494e227d2c7b226e616d65223a2277616c61222c226d657373616765223a223635396661313133373065333136663265613336616533642d57414c412d57494e227d5d2c227465726d73223a5b7b226e616d65223a22726566657265655075624b6579222c2274797065223a226279746573222c2276616c7565223a22303231383839303432373865626633333035393039336635393661323639376366333636386233626563396133613063363430386134353531343761623364623933227d5d7d7d7d7d',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914d18b7b500f17c5db64303fec630f9dbb85aa959688ac',
                    spentBy: {
                        txid: 'e5b4912fa19d93db9b6b9586ad9ab3a7f9bc3514325c71e36816e4b047a9f6b8',
                        outIdx: 0,
                    },
                    sats: 3308n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 416,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 826662,
                hash: '00000000000000001d45441094ec7a93f42f3beb564684aba68250b016feefb4',
                timestamp: 1704961725,
            },
        },
        walletHashes: ['d18b7b500f17c5db64303fec630f9dbb85aa9596'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected:
            'Sent 33.08 XEC | Unparsed OP_RETURN: 36ae3d-MERON-WIN"},{"name":"wala","message":"659fa11370e316f2ea36ae3d-WALA-WIN"}],"terms":[{"name":"refereePubKey","type":"bytes","value":"02188904278ebf33059093f596a2697cf3668b3bec9a3a0c6408a455147ab3db93"}]}}}}',
    },
    {
        description: 'eCash Chat authentication',
        parsedTx: {
            appActions: [
                {
                    isValid: true,
                    lokadId: '61757468',
                    app: 'Auth',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qzeq9xxpkht2s2np7myv6uy04papecdf0g0zly33v5'],
            satoshisSent: 550,
            stackArray: [
                '61757468',
                '0644ad85a538657c033e36ce5a3c8cf26076591f',
            ],
            xecTxType: 'Sent',
        },
        tx: {
            txid: '61838af28ae42e3b6a5fd037e112fe0df936dabf2a6417091abce6a3d830b078',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'f9323576b17aebd302272652ee9990b2a1347da7e3270d19b8d32ae60a0dec2f',
                        outIdx: 0,
                    },
                    inputScript:
                        '413fb023c886471d0f7eefcd3e5bf2cdbc0f537edd20b9f515d32da7c80b519b7cdc2da3e6696220addd232ebd8c10d53c092965d6bcce262b1a8745a61a18f3a54121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    sats: 3377n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a0461757468140644ad85a538657c033e36ce5a3c8cf26076591f',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914b20298c1b5d6a82a61f6c8cd708fa87a1ce1a97a88ac',
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    sats: 2314n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1723372560,
            size: 255,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 857308,
                hash: '000000000000000020801fb91e3685a03a8d8f967cd048f58059bda0800a8402',
                timestamp: 1723373699,
            },
            parsed: {
                xecTxType: 'Sent',
                satoshisSent: 550,
                stackArray: [
                    '61757468',
                    '0644ad85a538657c033e36ce5a3c8cf26076591f',
                ],
                recipients: [
                    'ecash:qzeq9xxpkht2s2np7myv6uy04papecdf0g0zly33v5',
                ],
            },
        },
        walletHashes: ['14582d09f61c6580b8a2b6c8af8d6a13c9128b6f'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'Auth | Sent 5.50 XEC',
    },
    {
        description: 'External msg received from eCash Chat',
        parsedTx: {
            satoshisSent: 1000,
            xecTxType: 'Received',
            stackArray: [
                '63686174',
                '68656c6c6f2066726f6d206543617368204368617420f09f918d',
            ],
            appActions: [
                {
                    action: {
                        msg: 'hello from eCash Chat 👍',
                    },
                    isValid: true,
                    lokadId: '63686174',
                    app: 'eCashChat',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qqznd7vug3avk24jdwgakaqewkmwp0vczu5u9man9y'],
            replyAddress: 'ecash:qqznd7vug3avk24jdwgakaqewkmwp0vczu5u9man9y',
        },
        tx: {
            txid: 'a3b3e23eb564920c10b1b6278a1e00dcec0c8b1593fc0d7f2e514cf20416255c',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '5eff401088014f551d5fce6340d9fa09ff3082b58cf5a3d8e20c5c14a0b4200e',
                        outIdx: 0,
                    },
                    inputScript:
                        '483045022100b7af7b05bb2fd4c743724175ddb4ed00030954f35adabe5e4dd77c1cb3125a7e02204186b77fcb0ce296a2ece2a0aa942933401bc269ea19f85434cdffe21bfea85d412103def4b1f77431c9825632ac5da7433b6eaa5281a90aabd9b597af4f16f6cccf51',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9140536f99c447acb2ab26b91db741975b6e0bd981788ac',
                    sats: 3000n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04636861741a68656c6c6f2066726f6d206543617368204368617420f09f918d',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac',
                    sats: 1000n,
                },
                {
                    outputScript:
                        '76a9140536f99c447acb2ab26b91db741975b6e0bd981788ac',
                    sats: 1461n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1711788850,
            size: 268,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: ['0b7d35fda03544a08e65464d54cfae4257eb6db7'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'eCashChat | Received 10.00 XEC | hello from eCash Chat 👍',
    },
    {
        description: 'Off spec eCashChat',
        parsedTx: {
            appActions: [
                {
                    app: 'eCashChat',
                    isValid: false,
                    lokadId: '63686174',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qqznd7vug3avk24jdwgakaqewkmwp0vczu5u9man9y'],
            replyAddress: 'ecash:qqznd7vug3avk24jdwgakaqewkmwp0vczu5u9man9y',
            satoshisSent: 1000,
            stackArray: ['63686174'],
            xecTxType: 'Received',
        },
        tx: {
            txid: 'a3b3e23eb564920c10b1b6278a1e00dcec0c8b1593fc0d7f2e514cf20416255c',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '5eff401088014f551d5fce6340d9fa09ff3082b58cf5a3d8e20c5c14a0b4200e',
                        outIdx: 0,
                    },
                    inputScript:
                        '483045022100b7af7b05bb2fd4c743724175ddb4ed00030954f35adabe5e4dd77c1cb3125a7e02204186b77fcb0ce296a2ece2a0aa942933401bc269ea19f85434cdffe21bfea85d412103def4b1f77431c9825632ac5da7433b6eaa5281a90aabd9b597af4f16f6cccf51',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9140536f99c447acb2ab26b91db741975b6e0bd981788ac',
                    sats: 3000n,
                },
            ],
            outputs: [
                {
                    outputScript: '6a0463686174',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac',
                    sats: 1000n,
                },
                {
                    outputScript:
                        '76a9140536f99c447acb2ab26b91db741975b6e0bd981788ac',
                    sats: 1461n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1711788850,
            size: 268,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: ['0b7d35fda03544a08e65464d54cfae4257eb6db7'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'Received 10.00 XEC | Invalid eCashChat',
    },
    {
        description: 'slp v1 mint tx',
        parsedTx: {
            satoshisSent: 3372,
            stackArray: [
                '534c5000',
                '01',
                '4d494e54',
                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                '02',
                '0000000000000064',
            ],
            xecTxType: 'Sent',
            recipients: [],
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'MINT',
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenSatoshis: '100',
                },
            ],
        },
        tx: {
            txid: '4b5b2a0f8bcacf6bccc7ef49e7f82a894c9c599589450eaeaf423e0f5926c38e',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        outIdx: 2,
                    },
                    inputScript:
                        '473044022038242777df76cf81fea627fad7c8a4f67ddb2dd68defcdb8d45dbc7e0f90c62102206f5c9a5b79f10cb6ac93d46a084666b810d12871c02182f9097b1ac72643dab6412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: true,
                        entryIdx: 0,
                        atoms: 0n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: '89b922392753498ea1c6f8f29c9c9c2d7768fcaa36c34b931dbdcedf094cd283',
                        outIdx: 0,
                    },
                    inputScript:
                        '47304402206d2c4bada7e705e12f7e8e21b2bfb7a6cf0b02dcb7ffc6b21f1a866dc0e7c7a10220667c1d970506cdae180a78888cf10cf9ada6800b4db22f06a8f4ae5c40aeea16412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 3300n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c50000101044d494e5420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb10102080000000000000064',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 100n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: true,
                        entryIdx: 0,
                        atoms: 0n,
                    },
                    spentBy: {
                        txid: 'dd9018d0037fee4094c2445b23ed9eef65d456db3f2b9c053ad39ee6505fca44',
                        outIdx: 0,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 2280n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1711861819,
            size: 472,
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
                    txType: 'MINT',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 838323,
                hash: '000000000000000011466b30b743ea02424347838273e890d6a9f1afbc16f66e',
                timestamp: 1711868662,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: '🔨 Minted aed86...53cb1',
    },
    {
        description: 'SLP ad setup tx, NFT',
        parsedTx: {
            satoshisSent: 860,
            stackArray: [
                '534c5000',
                '41',
                '53454e44',
                'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                '0000000000000001',
            ],
            xecTxType: 'Sent',
            recipients: ['ecash:pp3mwvf32la36p2frymyeqma3tuj07jknyhljj09qd'],
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'NFT',
                    renderedTxType: 'Agora Offer',
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                    tokenSatoshis: '1',
                },
            ],
        },
        tx: {
            txid: '972fd1322542740835a3f7e6d0917e5ac1ab6f20c5bfb40edbfb4ca73a144194',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c886d9d73b0c2592fb2df95cf0bb832c8077ff8adec132ee3cff5ba576f4ed1e',
                        outIdx: 1,
                    },
                    inputScript:
                        '419d3ac0b32abebc181c55e5a45c25d5050f73ba1269348829f4d5677131e3c627f73a552bf003de5d86423ce3f47fd4fd116eba837be72a3cef6f002158b0482a412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: '03672250bda1410ffa9b1c2cf3dc8c456bcb7a54e8dff0a7686bcce6ba82cf1b',
                        outIdx: 2,
                    },
                    inputScript:
                        '41f444904158cb70106321dc09161d7bf3dde584e541c73d21f46a19c176c10e1c3ea79252e52878a0f11f5c6b896d8adc5c75d1c6039e750c31ab07114d2f3bca412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1748n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3080000000000000001',
                    sats: 0n,
                },
                {
                    outputScript:
                        'a91463b7313157fb1d054919364c837d8af927fa569987',
                    token: {
                        tokenId:
                            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    spentBy: {
                        txid: 'c7fe7ac1f29c34e0795786b609622f6439cfde52246f31cba89aa0b28c8542ee',
                        outIdx: 0,
                    },
                    sats: 860n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1012n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1729632267,
            size: 422,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    groupTokenId:
                        'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 867731,
                hash: '000000000000000023e84eda63a1c6cce9c8e1d8b6484ee3dba0bf13b38d9116',
                timestamp: 1729632495,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'NK',
            tokenName: 'Nile Kinnick',
            url: 'cashtab.com',
            decimals: 0,
            hash: 'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
        },
        expected: undefined,
    },
    {
        description: 'Agora one-shot buy',
        parsedTx: {
            recipients: ['ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035'],
            satoshisSent: 72066878,
            stackArray: [
                '534c5000',
                '41',
                '53454e44',
                'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                '0000000000000000',
                '0000000000000001',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'NFT',
                    renderedTxType: 'Agora Buy',
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                    tokenSatoshis: '1',
                },
            ],
        },
        tx: {
            txid: '8880046b7b34da75f405abf8e76237082ed83f6a6293b378f83629320bf57097',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c7fe7ac1f29c34e0795786b609622f6439cfde52246f31cba89aa0b28c8542ee',
                        outIdx: 1,
                    },
                    inputScript:
                        '2102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd879540c4da30dce1304b58ad7e2b8f87729d2b7c5f7c2390e8bbc33bebcc7c80503c992801df01dad963adb737892e0d3499875b99477f65786c45e9146610a219fe104c5aee42858cb2a09aa8cb316f2452decf39642f6209b6865779e0349cf2c17afec70100000001ac2202000000000000ffffffffc996989ea840ccd9e2f0324dc0accbe26a32c3c8bd5d710ce18f68acaafdb3d300000000c10000004422020000000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac7a3d160c000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac514cb0634c6b0000000000000000406a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df30800000000000000000800000000000000013ea74b04000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac7c7eaa7801327f7701207f7588520144807c7ea86f7bbb7501c17e7c672103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba668abac',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    outputScript:
                        'a914dec4855b83573e56312d9f3852697a48c09ee6b087',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: 'd8a564b6aa82861ea16864ef83d0ec81ecf8cb13c0a59c2737a444c7b880368d',
                        outIdx: 3,
                    },
                    inputScript:
                        '414964793d1de39477192d9ee1491c49973303b18b594b249cfb0b9b752826f0ccc9da5ebf1dde9de63f5e5825b3e7257f48e1310920e30e28e83beada1f21be58412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 19360n,
                },
                {
                    prevOut: {
                        txid: '4fdcf99a029298ca1e3a692c4485711d22e7eb6aeb76d58354666e0a87260a4a',
                        outIdx: 1,
                    },
                    inputScript:
                        '41c60f1f0f70dd45780f5b5a48e7e8e823ab04ae5f2b652c68d36856d7999e65423c88f4315bde6eeebe1c263e27b5275453a52c33962eddd704ec63330482cbde412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 11007n,
                },
                {
                    prevOut: {
                        txid: '9191385318562f9b9491cb51dd336054ff48086effdb603ce4d070ec27b0a310',
                        outIdx: 1,
                    },
                    inputScript:
                        '418a65da44dc054c90c718cafe5a8eb1a58a40f1c2864a356152eadb6ad439f66f7e457f09821fb53b07bd50d68baa64abed6134f98d18c2da4050496c54341a4c412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 5235n,
                },
                {
                    prevOut: {
                        txid: 'e85c851664f633ac3888908be544d379b6a300ecd7e3ba3b7d8895ff4bcd2907',
                        outIdx: 1,
                    },
                    inputScript:
                        '41db37e18dda29041f7f931bb895777ec8bea1f6341dc48a144a2deac2545519892c19c050bfe8eb32143a5860ef4343079cb0b6705f2b72e8555f3b96badd3e82412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 4201n,
                },
                {
                    prevOut: {
                        txid: '2bec8ef2b93a4cc859d2b5eef36516d5e559ed6c8ba14437ebd910d7110e8e7b',
                        outIdx: 2,
                    },
                    inputScript:
                        '41f5ad3937e27b09550dfac33838bb0acfe61bf69378c3fbd6fb145ce48cf0cd9fc7e2b4abfcb17616dedecd33e84a860c5f2ceea50ea0e59a59e7fa4e87b478ce412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 19901n,
                },
                {
                    prevOut: {
                        txid: '528fc61b8fe7131dcba81c99a4604c409aafe6faaf4286e21da07cae92bdf586',
                        outIdx: 2,
                    },
                    inputScript:
                        '41346e924f1a559129de3bb6f8bfb9358aae0401ab6dcc49c9e974bed7b94b246f001ec19ed7c682d945426882abce9f5bebdd984845b2c127c0f2549fcee5aec9412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 12964n,
                },
                {
                    prevOut: {
                        txid: '5963aebb41910aee8014cbbf2e2fb487dcbecb8b4a66b26e07f5b6542355bbf7',
                        outIdx: 1,
                    },
                    inputScript:
                        '41f5295566cdf6a64102474a4cf1a90c0be1f734a01a7c553d28d79543de93991633b67473c7cd859f14f4682942ea08b8f399abc3d9aba4d3017931ae61f677d4412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 274781657n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3080000000000000000080000000000000001',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 72066878n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 202784122n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1729713477,
            size: 1654,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    groupTokenId:
                        'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'NK',
            tokenName: 'Nile Kinnick',
            url: 'cashtab.com',
            decimals: 0,
            hash: 'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
        },
        expected: undefined,
    },
    {
        description: 'Agora one-shot sale',
        parsedTx: {
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'NFT',
                    renderedTxType: 'Agora Sale',
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                    tokenSatoshis: '1',
                },
            ],
            recipients: ['ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj'],
            replyAddress: 'ecash:pr0vfp2msdtnu4339k0ns5nf0fyvp8hxkqxcuyfhrp',
            satoshisSent: 72066878,
            stackArray: [
                '534c5000',
                '41',
                '53454e44',
                'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                '0000000000000000',
                '0000000000000001',
            ],
            xecTxType: 'Received',
        },
        tx: {
            txid: '8880046b7b34da75f405abf8e76237082ed83f6a6293b378f83629320bf57097',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c7fe7ac1f29c34e0795786b609622f6439cfde52246f31cba89aa0b28c8542ee',
                        outIdx: 1,
                    },
                    inputScript:
                        '2102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd879540c4da30dce1304b58ad7e2b8f87729d2b7c5f7c2390e8bbc33bebcc7c80503c992801df01dad963adb737892e0d3499875b99477f65786c45e9146610a219fe104c5aee42858cb2a09aa8cb316f2452decf39642f6209b6865779e0349cf2c17afec70100000001ac2202000000000000ffffffffc996989ea840ccd9e2f0324dc0accbe26a32c3c8bd5d710ce18f68acaafdb3d300000000c10000004422020000000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac7a3d160c000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac514cb0634c6b0000000000000000406a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df30800000000000000000800000000000000013ea74b04000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac7c7eaa7801327f7701207f7588520144807c7ea86f7bbb7501c17e7c672103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba668abac',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    outputScript:
                        'a914dec4855b83573e56312d9f3852697a48c09ee6b087',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: 'd8a564b6aa82861ea16864ef83d0ec81ecf8cb13c0a59c2737a444c7b880368d',
                        outIdx: 3,
                    },
                    inputScript:
                        '414964793d1de39477192d9ee1491c49973303b18b594b249cfb0b9b752826f0ccc9da5ebf1dde9de63f5e5825b3e7257f48e1310920e30e28e83beada1f21be58412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 19360n,
                },
                {
                    prevOut: {
                        txid: '4fdcf99a029298ca1e3a692c4485711d22e7eb6aeb76d58354666e0a87260a4a',
                        outIdx: 1,
                    },
                    inputScript:
                        '41c60f1f0f70dd45780f5b5a48e7e8e823ab04ae5f2b652c68d36856d7999e65423c88f4315bde6eeebe1c263e27b5275453a52c33962eddd704ec63330482cbde412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 11007n,
                },
                {
                    prevOut: {
                        txid: '9191385318562f9b9491cb51dd336054ff48086effdb603ce4d070ec27b0a310',
                        outIdx: 1,
                    },
                    inputScript:
                        '418a65da44dc054c90c718cafe5a8eb1a58a40f1c2864a356152eadb6ad439f66f7e457f09821fb53b07bd50d68baa64abed6134f98d18c2da4050496c54341a4c412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 5235n,
                },
                {
                    prevOut: {
                        txid: 'e85c851664f633ac3888908be544d379b6a300ecd7e3ba3b7d8895ff4bcd2907',
                        outIdx: 1,
                    },
                    inputScript:
                        '41db37e18dda29041f7f931bb895777ec8bea1f6341dc48a144a2deac2545519892c19c050bfe8eb32143a5860ef4343079cb0b6705f2b72e8555f3b96badd3e82412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 4201n,
                },
                {
                    prevOut: {
                        txid: '2bec8ef2b93a4cc859d2b5eef36516d5e559ed6c8ba14437ebd910d7110e8e7b',
                        outIdx: 2,
                    },
                    inputScript:
                        '41f5ad3937e27b09550dfac33838bb0acfe61bf69378c3fbd6fb145ce48cf0cd9fc7e2b4abfcb17616dedecd33e84a860c5f2ceea50ea0e59a59e7fa4e87b478ce412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 19901n,
                },
                {
                    prevOut: {
                        txid: '528fc61b8fe7131dcba81c99a4604c409aafe6faaf4286e21da07cae92bdf586',
                        outIdx: 2,
                    },
                    inputScript:
                        '41346e924f1a559129de3bb6f8bfb9358aae0401ab6dcc49c9e974bed7b94b246f001ec19ed7c682d945426882abce9f5bebdd984845b2c127c0f2549fcee5aec9412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 12964n,
                },
                {
                    prevOut: {
                        txid: '5963aebb41910aee8014cbbf2e2fb487dcbecb8b4a66b26e07f5b6542355bbf7',
                        outIdx: 1,
                    },
                    inputScript:
                        '41f5295566cdf6a64102474a4cf1a90c0be1f734a01a7c553d28d79543de93991633b67473c7cd859f14f4682942ea08b8f399abc3d9aba4d3017931ae61f677d4412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 274781657n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3080000000000000000080000000000000001',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 72066878n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 202784122n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1729713477,
            size: 1654,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    groupTokenId:
                        'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'NK',
            tokenName: 'Nile Kinnick',
            url: 'cashtab.com',
            decimals: 0,
            hash: 'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
        },
        expected: 'Sold 1 NK for 720.67k XEC',
    },
    {
        description: 'Agora partial listing cancellation',
        parsedTx: {
            recipients: [],
            satoshisSent: 974269,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                '000000c73e000000',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'Agora Cancel',
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenSatoshis: '855738679296',
                },
            ],
        },
        tx: {
            txid: 'e9d594e054bf9a7cead11cdc31953f0e45782c97c6298513f41b70eb408aa1a8',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '58ec58688cef1d0abe2ee30c15f84af51833e61e998841fac3ecbcadafc31233',
                        outIdx: 2,
                    },
                    inputScript:
                        '41fd18138ab17386e9599e54d9d5f1994d1c4add3af860b1ece44b71d04bc7e7cd799e1234e2959236cd38558713d7fdb797a894c527906b0235a38519ad63fbea4121024f624d04900c2e3b7ea6014cb257f525b6d229db274bceeadbb1f06c07776e82',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9147847fe7070bec8567b3e810f543f2f80cc3e03be88ac',
                    sats: 975251n,
                },
                {
                    prevOut: {
                        txid: '0c580a7dbfb7f160f0e4623faa24eb0475b2220704c8c46f279a479a477433f8',
                        outIdx: 1,
                    },
                    inputScript:
                        '0441475230075041525449414c4113bb98283dc7a2f69957940bb3a45f4ec6050b61bcc1b1134d786727e379c8793107bf0d0b0e051665ab3eed2cca34901646cf564a1ab52cb32668da229eef0b41004d5f014c766a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8080000000000000000030276a4000000000000e815000000000000a24a2600000000004b4a343a024f624d04900c2e3b7ea6014cb257f525b6d229db274bceeadbb1f06c07776e8208948eff7f00000000ab7b63817b6ea2697603a24a26a269760376a4009700887d94527901377f75789263587e780376a400965580bc030000007e7e68587e52790376a400965580bc030000007e7e825980bc7c7e0200007e7b02e7159302e8159656807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702dd007f5c7f7701207f547f75044b4a343a886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 855738679296n,
                    },
                    outputScript:
                        'a914cb61d733f8e99b1b40d40a53a59aca8a08368a6f87',
                    sats: 546n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f808000000c73e000000',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a9147847fe7070bec8567b3e810f543f2f80cc3e03be88ac',
                    token: {
                        tokenId:
                            '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 855738679296n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a9147847fe7070bec8567b3e810f543f2f80cc3e03be88ac',
                    sats: 973723n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1729789538,
            size: 760,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 867971,
                hash: '000000000000000013f3d459ae121dc1494e7e9fe57c2e60cf393184d7ab6dc9',
                timestamp: 1729793460,
            },
        },
        walletHashes: ['7847fe7070bec8567b3e810f543f2f80cc3e03be'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'VSP',
            tokenName: 'Vespene Gas',
            url: 'https://simple.wikipedia.org/wiki/StarCraft#Gameplay',
            decimals: 9,
            hash: '',
        },
        expected: undefined,
    },
    {
        description: 'Another agora partial buy tx',
        parsedTx: {
            recipients: [
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                'ecash:ppgavzvejaqqshcke7lw97ter44wdtr835rs9eedxc',
            ],
            satoshisSent: 2813218,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                '0000000000000000',
                '0000000000000659',
                '0000000000000177',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'Agora Buy',
                    tokenId:
                        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                    tokenSatoshis: '375',
                },
            ],
        },
        tx: {
            txid: '3ada11ca38e5da8bfda9b045ab7412cecff5b788aad8e49673183010e725099e',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '20469a4316506e0fea99ad0673d6663f2f546c0aad84b741e08c4d0f9248b18c',
                        outIdx: 1,
                    },
                    inputScript:
                        '0441475230075041525449414c21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1404799ed59b763768b8e7385a35c0a357e624e1725154d4c3240f38edc021527b267881f2078be11f89221f6c8036c156274742dae00ce8a88bb6ee527bc18dc744422020000000000001976a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac4d420100000000001976a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac4d32018cb148920f4d8ce041b784ad0a6c542f3f66d67306ad99ea0f6e5016439a462001000000d97b63817b6ea26976046de4ff17a26976033b62109700887d94527901377f75789263587e78033b6210965880bc007e7e68587e5279033b6210965880bc007e7e825980bc7c7e01007e7b03288f009303298f009657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d9007f5c7f7701207f547f7504f3282c4e886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c880441475230872202000000000000ffffffffca3033eea929796cc020b87c909e38d37943502aa69486f2d97d56daa454e28df3282c4ec1000000046de4ff17514d5b014c766a04534c500001010453454e442001d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f89608000000000000000000013b62100000000000298f0000000000006de4ff1700000000f3282c4e03771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba608f06cff7f00000000ab7b63817b6ea26976046de4ff17a26976033b62109700887d94527901377f75789263587e78033b6210965880bc007e7e68587e5279033b6210965880bc007e7e825980bc7c7e01007e7b03288f009303298f009657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d9007f5c7f7701207f547f7504f3282c4e886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 2000n,
                    },
                    plugins: {
                        agora: {
                            groups: [
                                '5003771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                                '5401d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                                '4601d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                            ],
                            data: [
                                '5041525449414c',
                                '00',
                                '01',
                                '3b62100000000000',
                                '298f000000000000',
                                '6de4ff1700000000',
                                'f3282c4e',
                            ],
                        },
                    },
                    outputScript:
                        'a914563178ea073228709397a2c98baf10677e683e6687',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: 'bfce47f2403031f5465982b821e8e14c78deff2dd5986ca0c21cebb5ed946b4d',
                        outIdx: 2,
                    },
                    inputScript:
                        '41866f21d34e5b061cf7cb9ce4a6ce4df037628b72765db893675eae909ddad9d7ea7593d1a510fee1d80887699410b4330e9214efd5668dd51644d7ffce498ac94121039f0061726e4fed07061f705d34707b7f9c2f175bfa2ca7fe7df0a81e9efe1e8b',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac',
                    sats: 2898252n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e442001d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896080000000000000000080000000000000659080000000000000177',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '5d934ade992707fe126bcd393ad4358b2c10118b635df4b97e3e3f30ca7cc781',
                        outIdx: 1,
                    },
                    sats: 2812672n,
                },
                {
                    outputScript:
                        'a91451d609999740085f16cfbee2f9791d6ae6ac678d87',
                    plugins: {
                        agora: {
                            groups: [
                                '5003771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                                '5401d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                                '4601d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                            ],
                            data: [
                                '5041525449414c',
                                '00',
                                '01',
                                '3b62100000000000',
                                '298f000000000000',
                                '6de4ff1700000000',
                                'f3282c4e',
                            ],
                        },
                    },
                    token: {
                        tokenId:
                            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1625n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac',
                    token: {
                        tokenId:
                            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 375n,
                    },
                    spentBy: {
                        txid: 'f0e450b41d1c15b32478efb668bc562fa341a40fa799db7747228350295f84d4',
                        outIdx: 0,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac',
                    spentBy: {
                        txid: '3a7a8971392e74fd542498c055509ace4f4853b981d87d73ba045f77100dad1e',
                        outIdx: 1,
                    },
                    sats: 82509n,
                },
            ],
            lockTime: 1311516915,
            timeFirstSeen: 1730860384,
            size: 1256,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 869782,
                hash: '0000000000000000178954cd24752cd8fb8aa980c36012a16cec251d8c2f68d6',
                timestamp: 1730861016,
            },
        },
        walletHashes: ['2aba37d6365d3e570cadf3ed65e58ae4ad751a30'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'BULL',
            tokenName: 'Bull',
            url: 'https://cashtab.com/',
            decimals: 0,
            hash: '',
        },
        expected: undefined,
    },
    {
        description: 'Another agora partial sell tx',
        parsedTx: {
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'Agora Sale',
                    tokenId:
                        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                    tokenSatoshis: '375',
                },
            ],
            recipients: [
                'ecash:ppgavzvejaqqshcke7lw97ter44wdtr835rs9eedxc',
                'ecash:qq4t5d7kxewnu4cv4he76e093tj26ag6xql82hcgru',
            ],
            replyAddress: 'ecash:pptrz782quezsuynj73vnza0zpnhu6p7vcj7g5qlfr',
            satoshisSent: 2812672,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                '0000000000000000',
                '0000000000000659',
                '0000000000000177',
            ],
            xecTxType: 'Received',
        },
        tx: {
            txid: '3ada11ca38e5da8bfda9b045ab7412cecff5b788aad8e49673183010e725099e',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '20469a4316506e0fea99ad0673d6663f2f546c0aad84b741e08c4d0f9248b18c',
                        outIdx: 1,
                    },
                    inputScript:
                        '0441475230075041525449414c21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1404799ed59b763768b8e7385a35c0a357e624e1725154d4c3240f38edc021527b267881f2078be11f89221f6c8036c156274742dae00ce8a88bb6ee527bc18dc744422020000000000001976a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac4d420100000000001976a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac4d32018cb148920f4d8ce041b784ad0a6c542f3f66d67306ad99ea0f6e5016439a462001000000d97b63817b6ea26976046de4ff17a26976033b62109700887d94527901377f75789263587e78033b6210965880bc007e7e68587e5279033b6210965880bc007e7e825980bc7c7e01007e7b03288f009303298f009657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d9007f5c7f7701207f547f7504f3282c4e886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c880441475230872202000000000000ffffffffca3033eea929796cc020b87c909e38d37943502aa69486f2d97d56daa454e28df3282c4ec1000000046de4ff17514d5b014c766a04534c500001010453454e442001d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f89608000000000000000000013b62100000000000298f0000000000006de4ff1700000000f3282c4e03771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba608f06cff7f00000000ab7b63817b6ea26976046de4ff17a26976033b62109700887d94527901377f75789263587e78033b6210965880bc007e7e68587e5279033b6210965880bc007e7e825980bc7c7e01007e7b03288f009303298f009657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d9007f5c7f7701207f547f7504f3282c4e886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 2000n,
                    },
                    plugins: {
                        agora: {
                            groups: [
                                '5003771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                                '5401d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                                '4601d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                            ],
                            data: [
                                '5041525449414c',
                                '00',
                                '01',
                                '3b62100000000000',
                                '298f000000000000',
                                '6de4ff1700000000',
                                'f3282c4e',
                            ],
                        },
                    },
                    outputScript:
                        'a914563178ea073228709397a2c98baf10677e683e6687',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: 'bfce47f2403031f5465982b821e8e14c78deff2dd5986ca0c21cebb5ed946b4d',
                        outIdx: 2,
                    },
                    inputScript:
                        '41866f21d34e5b061cf7cb9ce4a6ce4df037628b72765db893675eae909ddad9d7ea7593d1a510fee1d80887699410b4330e9214efd5668dd51644d7ffce498ac94121039f0061726e4fed07061f705d34707b7f9c2f175bfa2ca7fe7df0a81e9efe1e8b',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac',
                    sats: 2898252n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e442001d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896080000000000000000080000000000000659080000000000000177',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '5d934ade992707fe126bcd393ad4358b2c10118b635df4b97e3e3f30ca7cc781',
                        outIdx: 1,
                    },
                    sats: 2812672n,
                },
                {
                    outputScript:
                        'a91451d609999740085f16cfbee2f9791d6ae6ac678d87',
                    plugins: {
                        agora: {
                            groups: [
                                '5003771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                                '5401d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                                '4601d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                            ],
                            data: [
                                '5041525449414c',
                                '00',
                                '01',
                                '3b62100000000000',
                                '298f000000000000',
                                '6de4ff1700000000',
                                'f3282c4e',
                            ],
                        },
                    },
                    token: {
                        tokenId:
                            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1625n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac',
                    token: {
                        tokenId:
                            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 375n,
                    },
                    spentBy: {
                        txid: 'f0e450b41d1c15b32478efb668bc562fa341a40fa799db7747228350295f84d4',
                        outIdx: 0,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac',
                    spentBy: {
                        txid: '3a7a8971392e74fd542498c055509ace4f4853b981d87d73ba045f77100dad1e',
                        outIdx: 1,
                    },
                    sats: 82509n,
                },
            ],
            lockTime: 1311516915,
            timeFirstSeen: 1730860384,
            size: 1256,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 869782,
                hash: '0000000000000000178954cd24752cd8fb8aa980c36012a16cec251d8c2f68d6',
                timestamp: 1730861016,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'BULL',
            tokenName: 'Bull',
            url: 'https://cashtab.com/',
            decimals: 0,
            hash: '',
        },
        expected: 'Sold 375 BULL for 28.13k XEC',
    },
    {
        description: 'Another agora partial cancel',
        parsedTx: {
            recipients: ['ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035'],
            satoshisSent: 0,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
                '00000000000001ef',
            ],
            xecTxType: 'Received',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'Agora Cancel',
                    tokenId:
                        'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
                    tokenSatoshis: '495',
                },
            ],
            replyAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        },
        tx: {
            txid: '1e68af94c0117223511e3d7f7b6f0f6c2ffa07972844ff6d04f7f37d36ad5b50',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'ea28b2d3db0d4972eb56f2f20473fe821a6d46f328ecc5e97c4c3e353ff22a52',
                        outIdx: 3,
                    },
                    inputScript:
                        '415ece5326f001de92ce37d34b6ada073c3f60b52231b8291e1d4900c4813b93379dfc3e11ed417c58fce9fc1ead27b5754d4d2c8ff3d6949e694a9529afea0f4c412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 661543961n,
                },
                {
                    prevOut: {
                        txid: '44aa224b6eb5058717d1403d7376ef48e0eae2e4065303f0f9452782aad9f541',
                        outIdx: 2,
                    },
                    inputScript:
                        '0441475230075041525449414c4195484212249b53096fa43b1dc39559f9671cd305b4715c063c486b2fc30eec194685f027c560742da8746b61aacfb05dd039d8e519fa7ca065d7fe3188fa63df41004d5a014c766a04534c500001010453454e4420b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc0800000000000000000001f588410000000000f980000000000000f588410000000000bbbcb84f03771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba608bbd1b77e00000000ab7b63817b6ea2697603f58841a2697603f588419700887d94527901377f75789263587e7803f58841965880bc007e7e68587e527903f58841965880bc007e7e825980bc7c7e01007e7b03f880009303f980009657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d8007f5c7f7701207f547f7504bbbcb84f886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 495n,
                    },
                    outputScript:
                        'a914b069fa99f084a259a6a31cc8cf33edb8a853fbb587',
                    sats: 546n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e4420b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc0800000000000001ef',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 495n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 661543206n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1729825975,
            size: 755,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
        },
        walletHashes: [undefined],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'CTD',
            tokenName: 'Cashtab Dark',
            url: 'https://cashtab.com/',
            decimals: 0,
            hash: '',
        },
        expected: undefined,
    },
    {
        description: 'Agora one-shot listing cancellation',
        parsedTx: {
            recipients: ['ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj'],
            satoshisSent: 0,
            stackArray: [
                '534c5000',
                '41',
                '53454e44',
                'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                '0000000000000001',
            ],
            xecTxType: 'Received',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'NFT',
                    renderedTxType: 'Agora Cancel',
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                    tokenSatoshis: '1',
                },
            ],
            replyAddress: 'ecash:ppg6t4sglucuzkza02ar52hu62hq9zv2h5jjktp2kp',
        },
        tx: {
            txid: 'a57b6b00b328f0c6a916f6469dcc4e05ab202e7eca82f4cda5dbd736064910d9',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '9dad6def1241cea3ef1942e53ed0a34163da41fc726feb304fbd4d27482ce063',
                        outIdx: 1,
                    },
                    inputScript:
                        '419b8ec92ca5701691d9f5e75d525532cbec6ed9d9ed81f8f982b5af76090289d001ce2022ec82ba096c99beb00b0d9b0a92f2ef8da269a7967e6856170796beac41004cb0634c6b0000000000000000406a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df308000000000000000008000000000000000164594e05000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac7c7eaa7801327f7701207f7588520144807c7ea86f7bbb7501c17e7c672102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd879568abac',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    outputScript:
                        'a91451a5d608ff31c1585d7aba3a2afcd2ae02898abd87',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: '9cf904c798295bfee43670162dc816e25d129ae9a0b13a41f11560cf7dbbb5b8',
                        outIdx: 3,
                    },
                    inputScript:
                        '41ccbca2638a68145ecc38c8a96c058dff2619b8d495360e0b5866de555f1c6b621ef147df1a9e0f5bee006d1db94e1e2670915265d38f3ba801114037ed0d441d412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 1153n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3080000000000000001',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1729720346,
            size: 535,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    groupTokenId:
                        'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'NK',
            tokenName: 'Nile Kinnick',
            url: 'cashtab.com',
            decimals: 0,
            hash: 'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
        },
        expected: undefined,
    },
    {
        description: 'Buy 14 bux is rendered as buy 14',
        parsedTx: {
            recipients: [
                'ecash:qr0w2r6hvd3rwlwj7qc520qtkzgqnt90sypk26yd2u',
                'ecash:ppgza5su5a9auq7hldnjakwfjm4tjtnjl54xmlf83s',
            ],
            satoshisSent: 43145125,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                '0000000000000000',
                '0000000000057ba5',
                '000000000002257b',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'Agora Buy',
                    tokenId:
                        '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                    tokenSatoshis: '140667',
                },
            ],
        },
        tx: {
            txid: '6c6b32e7d68f5743dceec779c61ebe45dc1e8ca7562821ae974c71ef8d2450a7',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'f696ae69fb2d7f7253f1fc98aba1a6312c92e98dd691d9825f633aaf7b0f2417',
                        outIdx: 1,
                    },
                    inputScript:
                        '0441475230075041525449414c21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1400c2c91f9168505022957e651ce0d876ec90a483dec8eb83f9a2897cd0b1640962dcab03e0df52f086db75351d10c01386ff2dcf4e774ee09b5dcf6b96ced6b254422020000000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688acc5728209000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac4d280117240f7baf3a635f82d991d68de9922c31a6a1ab98fcf153727f2dfb69ae96f601000000cf7b63817b6ea269760460368f02a2697602c6109700887d94527901377f75789263587e7802c610965880bc007e7e68587e527902c610965880bc007e7e825980bc7c7e007e7b5d935e9658807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702cf007f5c7f7701207f547f750443840647886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c880441475230872202000000000000ffffffffb0f7a847759b44cb4dd22554924cf5dae4d946b5aa04372b20eb218d43210b4243840647c10000000422ad0024514d51014c766a04534c500001010453454e44207e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e50800000000000000000000c6100000000000000e0000000000000060368f020000000043840647037f1729ee682b22da2b5dd8a11779ec7b80739c4b5d4b48f83c35d83fbb40a21208c09ef87f00000000ab7b63817b6ea269760460368f02a2697602c6109700887d94527901377f75789263587e7802c610965880bc007e7e68587e527902c610965880bc007e7e825980bc7c7e007e7b5d935e9658807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702cf007f5c7f7701207f547f750443840647886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 500000n,
                    },
                    outputScript:
                        'a9149c2c40a0a571b35e2e6cca5c224d0c948096a36b87',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: '20d870129eab4418cf8917731ba9f240d5ac6a938d0570af2912f3ed77162d34',
                        outIdx: 2,
                    },
                    inputScript:
                        '41fb428d1c14340d4ef10c55202db803232018f0ae41777503c4a9cb78b4659fad4540f27314c74b9247a1c88937c5594ef908f5e916dddd5b054f290c5a8807a4412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 32055n,
                },
                {
                    prevOut: {
                        txid: '2cd92dbce9696b704ae7235e31d0840d728ad11217631dee849d49624f91ffd4',
                        outIdx: 0,
                    },
                    inputScript:
                        '4102e2c50dc6e3c3d8151c950075bc997dbe4762b1c59bcbe3cdd124566d1925bcecb466d21d32133b68fb8579b79e538f4b8dd61832374f2f713f328c3fc850ab412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 3300n,
                },
                {
                    prevOut: {
                        txid: '874d3ddb44d022952d3686d39d219c7fdf21327eaa852d2d249102bec026ec4a',
                        outIdx: 3,
                    },
                    inputScript:
                        '412f68bc4b72f9df1435d4046719b793556295fbe02d80c8752acf587afac49d09f160ba04f2dfd5c1fa9ae5e294e31d5b8efc331074cefa08bfe7e2106e46b34a412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 202656827n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e44207e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5080000000000000000080000000000057ba508000000000002257b',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914dee50f576362377dd2f031453c0bb09009acaf8188ac',
                    sats: 43144579n,
                },
                {
                    outputScript:
                        'a914502ed21ca74bde03d7fb672ed9c996eab92e72fd87',
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 359333n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 140667n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    spentBy: {
                        txid: '40c5a257a9797bf9cb44f0f1fe7ee08d732a151c70f1a038487bac4a431b7787',
                        outIdx: 1,
                    },
                    sats: 159544005n,
                },
            ],
            lockTime: 1191609411,
            timeFirstSeen: 1729812060,
            size: 1518,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 867988,
                hash: '000000000000000029b0040b966ade65e7217457758ef4c1a9f524bacc30baf5',
                timestamp: 1729813559,
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'BUX',
            tokenName: 'Badger Universal Token',
            url: 'https://bux.digital',
            decimals: 4,
            hash: '',
        },
        expected: undefined,
    },
    {
        description: 'Sell 14 bux is rendered as sell 14',
        parsedTx: {
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'Agora Sale',
                    tokenId:
                        '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                    tokenSatoshis: '140667',
                },
            ],
            recipients: [
                'ecash:ppgza5su5a9auq7hldnjakwfjm4tjtnjl54xmlf83s',
                'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            ],
            replyAddress: 'ecash:pzwzcs9q54cmxh3wdn99cgjdpj2gp94rdvy2wuu50y',
            satoshisSent: 43144579,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                '0000000000000000',
                '0000000000057ba5',
                '000000000002257b',
            ],
            xecTxType: 'Received',
        },
        tx: {
            txid: '6c6b32e7d68f5743dceec779c61ebe45dc1e8ca7562821ae974c71ef8d2450a7',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'f696ae69fb2d7f7253f1fc98aba1a6312c92e98dd691d9825f633aaf7b0f2417',
                        outIdx: 1,
                    },
                    inputScript:
                        '0441475230075041525449414c21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1400c2c91f9168505022957e651ce0d876ec90a483dec8eb83f9a2897cd0b1640962dcab03e0df52f086db75351d10c01386ff2dcf4e774ee09b5dcf6b96ced6b254422020000000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688acc5728209000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac4d280117240f7baf3a635f82d991d68de9922c31a6a1ab98fcf153727f2dfb69ae96f601000000cf7b63817b6ea269760460368f02a2697602c6109700887d94527901377f75789263587e7802c610965880bc007e7e68587e527902c610965880bc007e7e825980bc7c7e007e7b5d935e9658807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702cf007f5c7f7701207f547f750443840647886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c880441475230872202000000000000ffffffffb0f7a847759b44cb4dd22554924cf5dae4d946b5aa04372b20eb218d43210b4243840647c10000000422ad0024514d51014c766a04534c500001010453454e44207e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e50800000000000000000000c6100000000000000e0000000000000060368f020000000043840647037f1729ee682b22da2b5dd8a11779ec7b80739c4b5d4b48f83c35d83fbb40a21208c09ef87f00000000ab7b63817b6ea269760460368f02a2697602c6109700887d94527901377f75789263587e7802c610965880bc007e7e68587e527902c610965880bc007e7e825980bc7c7e007e7b5d935e9658807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702cf007f5c7f7701207f547f750443840647886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 500000n,
                    },
                    outputScript:
                        'a9149c2c40a0a571b35e2e6cca5c224d0c948096a36b87',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: '20d870129eab4418cf8917731ba9f240d5ac6a938d0570af2912f3ed77162d34',
                        outIdx: 2,
                    },
                    inputScript:
                        '41fb428d1c14340d4ef10c55202db803232018f0ae41777503c4a9cb78b4659fad4540f27314c74b9247a1c88937c5594ef908f5e916dddd5b054f290c5a8807a4412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 32055n,
                },
                {
                    prevOut: {
                        txid: '2cd92dbce9696b704ae7235e31d0840d728ad11217631dee849d49624f91ffd4',
                        outIdx: 0,
                    },
                    inputScript:
                        '4102e2c50dc6e3c3d8151c950075bc997dbe4762b1c59bcbe3cdd124566d1925bcecb466d21d32133b68fb8579b79e538f4b8dd61832374f2f713f328c3fc850ab412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 3300n,
                },
                {
                    prevOut: {
                        txid: '874d3ddb44d022952d3686d39d219c7fdf21327eaa852d2d249102bec026ec4a',
                        outIdx: 3,
                    },
                    inputScript:
                        '412f68bc4b72f9df1435d4046719b793556295fbe02d80c8752acf587afac49d09f160ba04f2dfd5c1fa9ae5e294e31d5b8efc331074cefa08bfe7e2106e46b34a412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 202656827n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e44207e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5080000000000000000080000000000057ba508000000000002257b',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914dee50f576362377dd2f031453c0bb09009acaf8188ac',
                    sats: 43144579n,
                },
                {
                    outputScript:
                        'a914502ed21ca74bde03d7fb672ed9c996eab92e72fd87',
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 359333n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 140667n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    spentBy: {
                        txid: '40c5a257a9797bf9cb44f0f1fe7ee08d732a151c70f1a038487bac4a431b7787',
                        outIdx: 1,
                    },
                    sats: 159544005n,
                },
            ],
            lockTime: 1191609411,
            timeFirstSeen: 1729812060,
            size: 1518,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 867988,
                hash: '000000000000000029b0040b966ade65e7217457758ef4c1a9f524bacc30baf5',
                timestamp: 1729813559,
            },
        },
        walletHashes: ['dee50f576362377dd2f031453c0bb09009acaf81'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'BUX',
            tokenName: 'Badger Universal Token',
            url: 'https://bux.digital',
            decimals: 4,
            hash: '',
        },
        expected: 'Sold 14.0667 BUX for 431.45k XEC',
    },
    {
        description: 'SLP1 NFT Parent mint tx',
        parsedTx: {
            recipients: [],
            satoshisSent: 71580793,
            stackArray: [
                '534c5000',
                '81',
                '4d494e54',
                '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                '02',
                '0000000000000001',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'Collection',
                    renderedTxType: 'MINT',
                    tokenId:
                        '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                    tokenSatoshis: '1',
                },
            ],
        },
        tx: {
            txid: 'af8d9508e488e7c9462cb9bb9d9b68f246cec6394676d1f660331bfe1f4e1fd2',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                        outIdx: 2,
                    },
                    inputScript:
                        '413bcbae418f71ecbc9b5a2ecbe9d7d7bd61a7473399ccfe4176e62fe51fe4cdba2dc8cb42088207ee4daf8c4a618e7e4a9773f969e681c8e2b552b13fc8ddc8e8412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: true,
                        entryIdx: 0,
                        atoms: 0n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: '607b7bb1a4d95efbeee42d98fc7b3b2fd3ed3dcfc6aea192f56839b405982889',
                        outIdx: 2,
                    },
                    inputScript:
                        '41f5fe8b075e9f9ab3b3c69b8e5621c9de49c4daffb698097149bdb57f4d472e0d1a9692df4d07ec64d4102c10a76bdc6bc6ef9df630061b34a1d19f50f1e97ef4412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 71580707n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c50000181044d494e54205a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f86200102080000000000000001',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: true,
                        entryIdx: 0,
                        atoms: 0n,
                    },
                    spentBy: {
                        txid: '5d934ade992707fe126bcd393ad4358b2c10118b635df4b97e3e3f30ca7cc781',
                        outIdx: 0,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 71579701n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1730953527,
            size: 460,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    txType: 'MINT',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 869927,
                hash: '00000000000000001d5912840b0d830c3d491f273b15ac9f5bcd0234456dfb5a',
                timestamp: 1730954146,
            },
        },
        walletHashes: ['76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'MASCOTS',
            tokenName: 'Mascots',
            url: 'cashtab.com',
            decimals: 0,
            hash: '2d0f7be21838551f43872cddda2213659f6603d0aec566dd8f917e49e172f27d',
        },
        expected: '🔨 Minted 1 MASCOTS',
    },
    {
        description: 'ALP burn tx',
        parsedTx: {
            recipients: [],
            satoshisSent: 2812748,
            stackArray: [
                '50',
                '534c503200044255524e3f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e11010000000000',
                '534c5032000453454e443f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e11019e8601000000',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'BURN',
                    tokenId:
                        '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                    tokenSatoshis: '1',
                },
            ],
        },
        tx: {
            txid: '29b79f0f4302c43f6e6dd565e7e5829cf7f8a8fe1e95a58e3e87620a24c5bef9',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '061459eea0e569392f0622c20e5917b5ca94ae38a77405cd3a5f01b41bba688b',
                        outIdx: 2,
                    },
                    inputScript:
                        '41eed3688821e81f77edcf70e877d6b270acbd1714b82ea9b58fe0239e3dfccd73da5a1dd5d2906a40624d172e1a4273eda5e2feb902d74b73e264f9ef469c0a99412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 99999n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: 'efb84d4aa3aec5636ae5fcbbc560d4c1bafbe1e9ed00661380bce4a9db2360e0',
                        outIdx: 1,
                    },
                    inputScript:
                        '41bfbaae1e96b3a3d7fbbe24c2cd9ac07e48b7340e24635a8005be1b94563bc0e020d073d8a88e9af4a5a067ff9dcd6601f35611399d70f2958ff7ce22770792a7412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 2812672n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a5030534c503200044255524e3f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e1101000000000031534c5032000453454e443f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e11019e8601000000',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 99998n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 2812202n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1732374561,
            size: 470,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 1n,
                    intentionalBurnAtoms: 1n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 872299,
                hash: '000000000000000022478fad1745dbd1c8f57ad77b6627ba459720c2653cd086',
                timestamp: 1732375055,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'TB',
            tokenName: 'Tiberium',
            url: 'cashtab.com',
            decimals: 0,
            authPubkey:
                '03771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
        },
        expected: '🔥 Burned 1 TB',
    },
    {
        description: 'ALP agora listing',
        parsedTx: {
            recipients: ['ecash:pqg9jcmymvendmrj8nn74g5kula8m0s8qce724yjtn'],
            satoshisSent: 546,
            stackArray: [
                '50',
                '41475230075041525449414c0001a4540000000000009006000000000000a4540000000000006f67825703771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                '534c5032000453454e443f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e1101228301000000',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'Agora Offer',
                    tokenId:
                        '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                    tokenSatoshis: '99106',
                },
            ],
        },
        tx: {
            txid: 'cf7f6c07bd838dbc7f7b05f5f879d498789d087e6c76dde91fdedeb802230587',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '59a60227b112221130f11fd890100ba623944f8243cc8322e7f4c8fd17ab6ee2',
                        outIdx: 2,
                    },
                    inputScript:
                        '41063618b40515cc62f4c2802f4f76ae729cfe31351f419634560bff37fbb8fa3dce1efb084e12a5e983beb893e945854470f409c1ec1c8c48b2baf7f5d80cb5e1412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 98082n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: 'cbded16a00885493d76e6534d932a58083f1918be220b8604897181c6b611609',
                        outIdx: 1,
                    },
                    inputScript:
                        '41c143430106e44093436317fb23c3eb96e453ea500e47ea4d1952fdb917c4423abc52a51f0163e193704c6879fd0ff005423ae60ff4f75c7ff234cb6d45ef0391412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1024n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a504b41475230075041525449414c0001a4540000000000009006000000000000a4540000000000006f67825703771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba631534c5032000453454e443f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e1101228301000000',
                    sats: 0n,
                },
                {
                    outputScript:
                        'a91410596364db3336ec723ce7eaa296e7fa7dbe070687',
                    plugins: {
                        agora: {
                            groups: [
                                '5003771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                                '54116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                                '46116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                            ],
                            data: [
                                '5041525449414c',
                                '00',
                                '01',
                                'a454000000000000',
                                '9006000000000000',
                                'a454000000000000',
                                '6f678257',
                            ],
                        },
                    },
                    token: {
                        tokenId:
                            '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 99106n,
                    },
                    spentBy: {
                        txid: 'a6d65d619bbb03c4490498f7fe1d5413e92df064915a3533a09e8a4ba1762255',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1732642801,
            size: 461,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 872745,
                hash: '000000000000000017dce1ee0a66873715acd1987aa18d018cc94e2943c2608b',
                timestamp: 1732642958,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'TB',
            tokenName: 'Tiberium',
            url: 'cashtab.com',
            decimals: 0,
            data: [],
            authPubkey:
                '03771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
        },
        expected: undefined,
    },
    {
        description: 'Paywall payment tx',
        parsedTx: {
            appActions: [
                {
                    action: {
                        sharedArticleTxid:
                            '4d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
                    },
                    isValid: true,
                    app: 'Paywall',
                    lokadId: '70617977',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qqrwv2qalnlam8dcxp8grh868qs2kdy6usct6qpwew'],
            replyAddress: 'ecash:qqrwv2qalnlam8dcxp8grh868qs2kdy6usct6qpwew',
            satoshisSent: 0,
            stackArray: [
                '70617977',
                '4d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
            ],
            xecTxType: 'Received',
        },
        tx: {
            txid: 'e9692335fdb3b75f2e319cbda1396f7f32c02c3d172e58148abeb2952c7e2460',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '4d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100a58e1087f128d676d4b5839c795df15b88b87b47b0c8f382d39811ee5df21cf6022022727ede00178347e0ab0dd3df91959378c25a29f902a4f8b4f1c79ddd7cf15241210216794b896521c52b0b156d886652859d1e4e03a9cd8f3894f4b1e1853092a3c7',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                    sats: 550n,
                },
                {
                    prevOut: {
                        txid: '4d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100856c2d015d7384a094d0c17dde0ec29ee37ddf64c914a6c1d12c9bd92724bc52022027d9f6525c49786e5454615e605d1af0aa4fa0860eea39e927316042ba3557f141210216794b896521c52b0b156d886652859d1e4e03a9cd8f3894f4b1e1853092a3c7',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                    sats: 27419n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a0470617977204d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                    spentBy: {
                        txid: '84d75fe93ab918e74e58c1a12a982d0cc8d1db1bb102f02068772723891711b3',
                        outIdx: 0,
                    },
                    sats: 15000n,
                },
                {
                    outputScript:
                        '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                    sats: 12056n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1716474827,
            size: 454,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 845901,
                hash: '00000000000000001da9291a7aa6fa8f9fa5f99413faa951e3f5777a082f911e',
                timestamp: 1716475087,
            },
            parsed: {
                xecTxType: 'Sent',
                satoshisSent: 27056,
                stackArray: [
                    '70617977',
                    '34643761363265626237663036666437613836663836313238303835336536666365336331313763373335393866653238343139303236306162643564646334',
                ],
                recipients: [],
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'Paywall | Received 0.00 XEC | 4d7a6...5ddc4',
    },
    {
        description: 'Off spec paywall payment tx',
        parsedTx: {
            appActions: [
                {
                    app: 'Paywall',
                    isValid: false,
                    lokadId: '70617977',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qqrwv2qalnlam8dcxp8grh868qs2kdy6usct6qpwew'],
            replyAddress: 'ecash:qqrwv2qalnlam8dcxp8grh868qs2kdy6usct6qpwew',
            satoshisSent: 0,
            stackArray: ['70617977'],
            xecTxType: 'Received',
        },
        tx: {
            txid: 'e9692335fdb3b75f2e319cbda1396f7f32c02c3d172e58148abeb2952c7e2460',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '4d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100a58e1087f128d676d4b5839c795df15b88b87b47b0c8f382d39811ee5df21cf6022022727ede00178347e0ab0dd3df91959378c25a29f902a4f8b4f1c79ddd7cf15241210216794b896521c52b0b156d886652859d1e4e03a9cd8f3894f4b1e1853092a3c7',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                    sats: 550n,
                },
                {
                    prevOut: {
                        txid: '4d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100856c2d015d7384a094d0c17dde0ec29ee37ddf64c914a6c1d12c9bd92724bc52022027d9f6525c49786e5454615e605d1af0aa4fa0860eea39e927316042ba3557f141210216794b896521c52b0b156d886652859d1e4e03a9cd8f3894f4b1e1853092a3c7',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                    sats: 27419n,
                },
            ],
            outputs: [
                {
                    outputScript: '6a0470617977',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                    spentBy: {
                        txid: '84d75fe93ab918e74e58c1a12a982d0cc8d1db1bb102f02068772723891711b3',
                        outIdx: 0,
                    },
                    sats: 15000n,
                },
                {
                    outputScript:
                        '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                    sats: 12056n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1716474827,
            size: 454,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 845901,
                hash: '00000000000000001da9291a7aa6fa8f9fa5f99413faa951e3f5777a082f911e',
                timestamp: 1716475087,
            },
            parsed: {
                xecTxType: 'Sent',
                satoshisSent: 27056,
                stackArray: [
                    '70617977',
                    '34643761363265626237663036666437613836663836313238303835336536666365336331313763373335393866653238343139303236306162643564646334',
                ],
                recipients: [],
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'Received 0.00 XEC | Invalid Paywall',
    },
    {
        description: 'eCashChat Article Reply',
        parsedTx: {
            appActions: [
                {
                    action: {
                        msg: "is your wife the girlfriend from part 1? If so then she's your soulmate, better hang onto her like your XEC bags",
                        replyArticleTxid:
                            'fc1bec473c0c8de408b8587ead6d31ad1d8854835c19947488fa7b30b7992267',
                    },
                    app: 'eCashChat Article Reply',
                    isValid: true,
                    lokadId: '626c6f67',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qq29stgf7cwxtq9c52mv3tuddgfujy5tduaellf3wm'],
            replyAddress: 'ecash:qq29stgf7cwxtq9c52mv3tuddgfujy5tduaellf3wm',
            satoshisSent: 0,
            stackArray: [
                '626c6f67',
                '726c6f67',
                'fc1bec473c0c8de408b8587ead6d31ad1d8854835c19947488fa7b30b7992267',
                '697320796f7572207769666520746865206769726c667269656e642066726f6d207061727420313f20496620736f207468656e20736865277320796f757220736f756c6d6174652c206265747465722068616e67206f6e746f20686572206c696b6520796f7572205845432062616773',
            ],
            xecTxType: 'Received',
        },
        tx: {
            txid: '91288c4675dae4815ef263d840e427b60e7195ab8354aeb156d00f2f5c015cd4',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '59daaab81418dff6acc6379d246d98348fdd2e7e10548877ffde73d5cf8d41ea',
                        outIdx: 1,
                    },
                    inputScript:
                        '4145602aed278898b9892332953d7eb9212b8f4f842a3e761139baa5ec95d353d94ab3abcb7d62b79e190c6aca93e304555a87398fabda5b9141faec1596b9bcc84121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    sats: 600n,
                },
                {
                    prevOut: {
                        txid: '752ef889a8aff586d926344eb45dee03f56f57a0b08416f8a284903201f60fe6',
                        outIdx: 1,
                    },
                    inputScript:
                        '41ec6df6abd70cdb718c19623173901a9471e9f52a5a4cd99d8093c4d5371bc2b0ce107866f1825a04646e6f7b51c883236eaefea50366e7c7074c140695f580014121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    sats: 600n,
                },
                {
                    prevOut: {
                        txid: '72f506669350eedc4b7643b6d3ca2c933137d303315a15c46042c31302c440f6',
                        outIdx: 2,
                    },
                    inputScript:
                        '4131c3b37d72362a79618771e7ad737e462c0804367809fb79d2bac39b116663297a559327e747be37e70979ba2f2e6ea184bf616e1b11df72a27f8eaafabbc9c24121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    sats: 508087n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04626c6f6704726c6f6720fc1bec473c0c8de408b8587ead6d31ad1d8854835c19947488fa7b30b79922674c70697320796f7572207769666520746865206769726c667269656e642066726f6d207061727420313f20496620736f207468656e20736865277320796f757220736f756c6d6174652c206265747465722068616e67206f6e746f20686572206c696b6520796f7572205845432062616773',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    spentBy: {
                        txid: '29810f319e19c552a6646d96eb1de5f7587c9adc6bed80ea756fe5b8db1f3f34',
                        outIdx: 0,
                    },
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    spentBy: {
                        txid: '29810f319e19c552a6646d96eb1de5f7587c9adc6bed80ea756fe5b8db1f3f34',
                        outIdx: 1,
                    },
                    sats: 507394n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1721558302,
            size: 668,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 854251,
                hash: '000000000000000000188bb36a8189d5612210ba2c6d1b8afa0f9d27e70ffe6f',
                timestamp: 1721558514,
            },
            parsed: {
                xecTxType: 'Sent',
                satoshisSent: 507944,
                stackArray: [
                    '626c6f67',
                    '726c6f67',
                    'fc1bec473c0c8de408b8587ead6d31ad1d8854835c19947488fa7b30b7992267',
                    '697320796f7572207769666520746865206769726c667269656e642066726f6d207061727420313f20496620736f207468656e20736865277320796f757220736f756c6d6174652c206265747465722068616e67206f6e746f20686572206c696b6520796f7572205845432062616773',
                ],
                recipients: [],
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'eCashChat Article Reply | Received 0.00 XEC',
    },
    {
        description: 'Off spec eCashChat Aricle Reply',
        parsedTx: {
            appActions: [
                {
                    app: 'eCashChat Article Reply',
                    isValid: false,
                    lokadId: '626c6f67',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qq29stgf7cwxtq9c52mv3tuddgfujy5tduaellf3wm'],
            replyAddress: 'ecash:qq29stgf7cwxtq9c52mv3tuddgfujy5tduaellf3wm',
            satoshisSent: 0,
            stackArray: ['626c6f67', '726c6f67'],
            xecTxType: 'Received',
        },
        tx: {
            txid: '91288c4675dae4815ef263d840e427b60e7195ab8354aeb156d00f2f5c015cd4',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '59daaab81418dff6acc6379d246d98348fdd2e7e10548877ffde73d5cf8d41ea',
                        outIdx: 1,
                    },
                    inputScript:
                        '4145602aed278898b9892332953d7eb9212b8f4f842a3e761139baa5ec95d353d94ab3abcb7d62b79e190c6aca93e304555a87398fabda5b9141faec1596b9bcc84121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    sats: 600n,
                },
                {
                    prevOut: {
                        txid: '752ef889a8aff586d926344eb45dee03f56f57a0b08416f8a284903201f60fe6',
                        outIdx: 1,
                    },
                    inputScript:
                        '41ec6df6abd70cdb718c19623173901a9471e9f52a5a4cd99d8093c4d5371bc2b0ce107866f1825a04646e6f7b51c883236eaefea50366e7c7074c140695f580014121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    sats: 600n,
                },
                {
                    prevOut: {
                        txid: '72f506669350eedc4b7643b6d3ca2c933137d303315a15c46042c31302c440f6',
                        outIdx: 2,
                    },
                    inputScript:
                        '4131c3b37d72362a79618771e7ad737e462c0804367809fb79d2bac39b116663297a559327e747be37e70979ba2f2e6ea184bf616e1b11df72a27f8eaafabbc9c24121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    sats: 508087n,
                },
            ],
            outputs: [
                {
                    outputScript: '6a04626c6f6704726c6f67',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    spentBy: {
                        txid: '29810f319e19c552a6646d96eb1de5f7587c9adc6bed80ea756fe5b8db1f3f34',
                        outIdx: 0,
                    },
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    spentBy: {
                        txid: '29810f319e19c552a6646d96eb1de5f7587c9adc6bed80ea756fe5b8db1f3f34',
                        outIdx: 1,
                    },
                    sats: 507394n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1721558302,
            size: 668,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 854251,
                hash: '000000000000000000188bb36a8189d5612210ba2c6d1b8afa0f9d27e70ffe6f',
                timestamp: 1721558514,
            },
            parsed: {
                xecTxType: 'Sent',
                satoshisSent: 507944,
                stackArray: [
                    '626c6f67',
                    '726c6f67',
                    'fc1bec473c0c8de408b8587ead6d31ad1d8854835c19947488fa7b30b7992267',
                    '697320796f7572207769666520746865206769726c667269656e642066726f6d207061727420313f20496620736f207468656e20736865277320796f757220736f756c6d6174652c206265747465722068616e67206f6e746f20686572206c696b6520796f7572205845432062616773',
                ],
                recipients: [],
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'Received 0.00 XEC | Invalid eCashChat Article Reply',
    },
    {
        description: 'eCashChat Article',
        parsedTx: {
            appActions: [
                {
                    app: 'eCashChat Article',
                    isValid: true,
                    lokadId: '626c6f67',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qquk4h0lvszy6v6rrcqsddqudypu05xj3yx7d0s32f'],
            replyAddress: 'ecash:qquk4h0lvszy6v6rrcqsddqudypu05xj3yx7d0s32f',
            satoshisSent: 0,
            stackArray: [
                '626c6f67',
                '63666338633134326661323336303566366336343765333437636262613261356633363064383937',
            ],
            xecTxType: 'Received',
        },
        tx: {
            txid: 'ab32d18a8f52d57c31c0197a45a4f10ed9299df25d996ccd2b1792506d569836',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'cafc6799c3fd6712d2f94b4360c90c73edcb49c0d1030989b3b07223c4fc4aac',
                        outIdx: 2,
                    },
                    inputScript:
                        '41f6b48f09d3d69002cb49049269d2e16c752b59357bf08c9a4a8513a69d6c87636db7acf09a6714663276d543584045b0796e76bfa3d67bd21a2fa680a89a375d412102f9e8383fe6fc81852f60909f5feb8a314949c3d2c9013c5e67563e3ba03e60ad',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914396addff64044d33431e0106b41c6903c7d0d28988ac',
                    sats: 133153n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04626c6f672863666338633134326661323336303566366336343765333437636262613261356633363064383937',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914396addff64044d33431e0106b41c6903c7d0d28988ac',
                    spentBy: {
                        txid: '9da106f4f05ba358b91486c5a233db096a57f40fa8134fddcc3ad2121857e47a',
                        outIdx: 0,
                    },
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a914396addff64044d33431e0106b41c6903c7d0d28988ac',
                    spentBy: {
                        txid: '9da106f4f05ba358b91486c5a233db096a57f40fa8134fddcc3ad2121857e47a',
                        outIdx: 1,
                    },
                    sats: 132050n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1721543189,
            size: 275,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 854224,
                hash: '000000000000000017faf86eb0dc5a051ccc069b90c55653749311eca64c29e4',
                timestamp: 1721543497,
            },
            parsed: {
                xecTxType: 'Sent',
                satoshisSent: 132600,
                stackArray: [
                    '626c6f67',
                    '63666338633134326661323336303566366336343765333437636262613261356633363064383937',
                ],
                recipients: [],
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'eCashChat Article | Received 0.00 XEC',
    },
    {
        description: 'off-spec eCashChat Article',
        parsedTx: {
            appActions: [
                {
                    app: 'eCashChat Article',
                    isValid: false,
                    lokadId: '626c6f67',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qquk4h0lvszy6v6rrcqsddqudypu05xj3yx7d0s32f'],
            replyAddress: 'ecash:qquk4h0lvszy6v6rrcqsddqudypu05xj3yx7d0s32f',
            satoshisSent: 0,
            stackArray: ['626c6f67'],
            xecTxType: 'Received',
        },
        tx: {
            txid: 'ab32d18a8f52d57c31c0197a45a4f10ed9299df25d996ccd2b1792506d569836',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'cafc6799c3fd6712d2f94b4360c90c73edcb49c0d1030989b3b07223c4fc4aac',
                        outIdx: 2,
                    },
                    inputScript:
                        '41f6b48f09d3d69002cb49049269d2e16c752b59357bf08c9a4a8513a69d6c87636db7acf09a6714663276d543584045b0796e76bfa3d67bd21a2fa680a89a375d412102f9e8383fe6fc81852f60909f5feb8a314949c3d2c9013c5e67563e3ba03e60ad',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914396addff64044d33431e0106b41c6903c7d0d28988ac',
                    sats: 133153n,
                },
            ],
            outputs: [
                {
                    outputScript: '6a04626c6f67',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914396addff64044d33431e0106b41c6903c7d0d28988ac',
                    spentBy: {
                        txid: '9da106f4f05ba358b91486c5a233db096a57f40fa8134fddcc3ad2121857e47a',
                        outIdx: 0,
                    },
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a914396addff64044d33431e0106b41c6903c7d0d28988ac',
                    spentBy: {
                        txid: '9da106f4f05ba358b91486c5a233db096a57f40fa8134fddcc3ad2121857e47a',
                        outIdx: 1,
                    },
                    sats: 132050n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1721543189,
            size: 275,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 854224,
                hash: '000000000000000017faf86eb0dc5a051ccc069b90c55653749311eca64c29e4',
                timestamp: 1721543497,
            },
            parsed: {
                xecTxType: 'Sent',
                satoshisSent: 132600,
                stackArray: [
                    '626c6f67',
                    '63666338633134326661323336303566366336343765333437636262613261356633363064383937',
                ],
                recipients: [],
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'Received 0.00 XEC | Invalid eCashChat Article',
    },
    {
        description: 'Cashtab msg',
        parsedTx: {
            appActions: [
                {
                    action: {
                        msg: "Merci pour le prix et bonne continuation dans vos projets de développeur... J'ai été censuré sûr télégramme jusqu'au 15 Avril 2024. Réparer le bug observé sur la page eToken Faucet?",
                    },
                    app: 'Cashtab Msg',
                    isValid: true,
                    lokadId: '00746162',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qrnrp9qckmnqhqgej28vgkut4p773ee47u08xlygnr'],
            replyAddress: 'ecash:qrnrp9qckmnqhqgej28vgkut4p773ee47u08xlygnr',
            satoshisSent: 550,
            stackArray: [
                '00746162',
                '4d6572636920706f7572206c65207072697820657420626f6e6e6520636f6e74696e756174696f6e2064616e7320766f732070726f6a6574732064652064c3a976656c6f70706575722e2e2e204a27616920c3a974c3a92063656e737572c3a92073c3bb722074c3a96cc3a96772616d6d65206a7573717527617520313520417672696c20323032342e2052c3a97061726572206c6520627567206f6273657276c3a920737572206c6120706167652065546f6b656e204661756365743f',
            ],
            xecTxType: 'Received',
        },
        tx: {
            txid: '1ce6c307b4083fcfc065287a00f0a582cf88bf33de34845db4c49387d4532b8a',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '01d4b064a4e17f77e5712cb13b488e65d39b33b54475b78debee1fe1d9d9acb1',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100eccfc2e23d49fb7e72a35123c807f4feef2f379313673295f36611d725e877b002207b1df4c142c590a54d371fe2f04c05769ecf778e0d28fc50a671e5c5d8b277854121028c1fc90b3fa6e5be985032b061b5ca6db41a6878a9c8b442747b820ca74010db',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914e6309418b6e60b8119928ec45b8ba87de8e735f788ac',
                    sats: 3001592n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04007461624cbe4d6572636920706f7572206c65207072697820657420626f6e6e6520636f6e74696e756174696f6e2064616e7320766f732070726f6a6574732064652064c3a976656c6f70706575722e2e2e204a27616920c3a974c3a92063656e737572c3a92073c3bb722074c3a96cc3a96772616d6d65206a7573717527617520313520417672696c20323032342e2052c3a97061726572206c6520627567206f6273657276c3a920737572206c6120706167652065546f6b656e204661756365743f',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a9143c28745097b1e32b343c50a8d4a7697fe7ad8aff88ac',
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a914e6309418b6e60b8119928ec45b8ba87de8e735f788ac',
                    sats: 3000609n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1712616513,
            size: 433,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 839618,
                hash: '00000000000000000e63e39951cc745db046aa7f57f811b68846ade8ad100293',
                timestamp: 1712616969,
            },
        },
        walletHashes: ['3c28745097b1e32b343c50a8d4a7697fe7ad8aff'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected:
            "Cashtab Msg | Received 5.50 XEC | Merci pour le prix et bonne continuation dans vos projets de développeur... J'ai été censuré sûr télégramme jusqu'au 15 Avril 2024. Réparer le bug observé sur la page eToken Faucet?",
    },
    {
        description: 'Off spec Cashtab msg',
        parsedTx: {
            appActions: [
                {
                    app: 'Cashtab Msg',
                    isValid: false,
                    lokadId: '00746162',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qrnrp9qckmnqhqgej28vgkut4p773ee47u08xlygnr'],
            replyAddress: 'ecash:qrnrp9qckmnqhqgej28vgkut4p773ee47u08xlygnr',
            satoshisSent: 550,
            stackArray: ['00746162'],
            xecTxType: 'Received',
        },
        tx: {
            txid: '1ce6c307b4083fcfc065287a00f0a582cf88bf33de34845db4c49387d4532b8a',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '01d4b064a4e17f77e5712cb13b488e65d39b33b54475b78debee1fe1d9d9acb1',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100eccfc2e23d49fb7e72a35123c807f4feef2f379313673295f36611d725e877b002207b1df4c142c590a54d371fe2f04c05769ecf778e0d28fc50a671e5c5d8b277854121028c1fc90b3fa6e5be985032b061b5ca6db41a6878a9c8b442747b820ca74010db',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914e6309418b6e60b8119928ec45b8ba87de8e735f788ac',
                    sats: 3001592n,
                },
            ],
            outputs: [
                {
                    outputScript: '6a0400746162',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a9143c28745097b1e32b343c50a8d4a7697fe7ad8aff88ac',
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a914e6309418b6e60b8119928ec45b8ba87de8e735f788ac',
                    sats: 3000609n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1712616513,
            size: 433,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 839618,
                hash: '00000000000000000e63e39951cc745db046aa7f57f811b68846ade8ad100293',
                timestamp: 1712616969,
            },
        },
        walletHashes: ['3c28745097b1e32b343c50a8d4a7697fe7ad8aff'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'Received 5.50 XEC | Invalid Cashtab Msg',
    },
    {
        description: 'xecx tx',
        parsedTx: {
            appActions: [
                {
                    action: {
                        eligibleTokenSatoshis: 1781404606734,
                        excludedHoldersCount: 0,
                        ineligibleTokenSatoshis: 0,
                        minBalanceTokenSatoshisToReceivePaymentThisRound: 3458056,
                    },
                    app: 'XECX',
                    isValid: true,
                    lokadId: '58454358',
                },
            ],
            parsedTokenEntries: [],
            recipients: [
                'ecash:qzd5s72xhgjvr4sjfzafjt3a2vcstn4pfvs4c84egx',
                'ecash:qzlsjhv6l0d9y3w47838u7ekpmpzx47k7qne9uv3t5',
                'ecash:qrdrvgwc6jsugc4e7hxje893ppgwm0f7gua8n7t3z9',
                'ecash:qq4fd9zdqecq3q4mmxz8v8vunepptukh3czav3gjyt',
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                'ecash:qp54xhk40f3fewpkp80pa9v28jr6940fmv38nxlahf',
                'ecash:qq5w7ue6qsnl2ny4e300afedjhuemw8y35j2e9mf0h',
                'ecash:qz0csfyjgl46x5xnkh4xzxrl595nu92jfch930m9sw',
                'ecash:qpgkjxnhpw8j4w24jral38fz52gv27jtmytxuxnkg3',
            ],
            replyAddress: 'ecash:qqfzls0nhjf7ukgpsmtlly2s2dueq54c5ulydy0h79',
            satoshisSent: 31250371,
            stackArray: [
                '50',
                '584543580008c43400000000000e21fdc39e01000000000000000000000000',
            ],
            xecTxType: 'Received',
        },
        tx: {
            txid: 'ca7057d9d878e17d105a732d723c84e10156c61627c9e4330e15a0dfe5ab37a5',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c8922424162ce2b2b19a902ecc7d2de3e20b5f138dd9ddcca0c9b3d41f9f2a25',
                        outIdx: 2,
                    },
                    inputScript:
                        '41287a47a0238eb4e55b92061f3205e5c067f00e6a88df11e60ceb55aa6efa5da97d9418e2e52a0c1b69eba5983a8ad837b0cbe05aefe51d5237bdf3a11e72a2e0412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250500n,
                },
                {
                    prevOut: {
                        txid: '38c1bcddb2037490d541286074820e8acd6563c743b659d09d123117c99d6ef4',
                        outIdx: 2,
                    },
                    inputScript:
                        '415b4594a93e4ea80231f25da079f27f6928264a5c37f281a2b59f7850c0d3a0a7ba9c856791dadc6b0e73aa22430581821b69caace9661c54dd45d7687fad1ef3412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250355n,
                },
                {
                    prevOut: {
                        txid: 'd8626173ca854bd56571632d8cb76667c7acad2594fec9d0015fe0866aca5c30',
                        outIdx: 2,
                    },
                    inputScript:
                        '41e4c223342bb6987464f4702aafff4dfd1421edddfbb9ab57a7a98339d93191dad2549db9f715260279786eebf48431fd120d18e1c8baa977de11efb7fe1f7b01412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250022n,
                },
                {
                    prevOut: {
                        txid: 'd3c3b54460b1a45b75a3e506101ebfac20ed21722650dfe47473994b50dcce19',
                        outIdx: 2,
                    },
                    inputScript:
                        '41faf5ed17630b62563d8d4e1f342a51c1715deba8cd69bb755056b345e3448ae70fac12b8740c53d17e8e8e9211c6d406026a5512e658da30260ebc207fe7f976412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250542n,
                },
                {
                    prevOut: {
                        txid: '747684142194ccf7ba1cd384e50324425051fee5ce516362fec85d1ab1af1f0d',
                        outIdx: 2,
                    },
                    inputScript:
                        '412546d55291fd069a4c12249cb06c011e16b890844824f279159122cbf8657868e7aaf6dc2239c17874cd50bb50fdc306c4224e5e2651ebaa0a831ee3a86a1285412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31251452n,
                },
                {
                    prevOut: {
                        txid: '4c6b1092c4b1525dda296a0d18bc378489058ac775ddfcdeeb3eb107e1f57c2b',
                        outIdx: 2,
                    },
                    inputScript:
                        '41d8b94143ad17fae0cd9eb5b57c197fd62d750a8d83627bf9d021c800608bca6771844298cccfc4d94da7b592c44ff8a653f2ff238fc1ea17828eac56d05ce309412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31251576n,
                },
                {
                    prevOut: {
                        txid: '80575750ecf408a2960e78d1fc23d8e55ecd6af66296484800ed8ae7b28e6147',
                        outIdx: 2,
                    },
                    inputScript:
                        '4148447f966b2000c31d5cfc31c6382cb116b891f643f03b8d9fd7eb25d8a827d01d0ca8129d3b7412255901214ec6fb6fbeca178aedc293797e8d03eabd4d6829412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31258084n,
                },
                {
                    prevOut: {
                        txid: 'e5e53ddc5225bb22c5a8c5c0c45b1f0ff3063c3b607bdef680b824eca433c99d',
                        outIdx: 2,
                    },
                    inputScript:
                        '417f7cc74f9421db8a11196faadc29bdca794efd2bc016f9fb46ba5340877c74c46c4d46efa9cb7115256d16fc1e6af1a5265d0b064fb70ec7a74128bb68b7b630412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250892n,
                },
                {
                    prevOut: {
                        txid: '6eb3fbee6778614a0993e61897b42c12bbbe36712b4cc8326ac31544c4441b31',
                        outIdx: 2,
                    },
                    inputScript:
                        '41f07a227801c780217f0bc3f68e9927c0f278182ffc754ca6b167b0413a1cf98cf4d1838a40668482e1dfb7761ccf0ddc7e5a05ac2f55002a075f79e7dc147914412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31256658n,
                },
                {
                    prevOut: {
                        txid: '2ce51ebf25366f99ee73c62d49e212894c697560a6ea483576a3d2629e551459',
                        outIdx: 2,
                    },
                    inputScript:
                        '413ab633abeacde057b424a607fbbc477f29d8bea944d23d944889e808d8388cb43386c0b62edc8b278e6daa45f0446e90f8f9c750a975a934d911ec0a752b4fbe412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31252018n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a501f584543580008c43400000000000e21fdc39e01000000000000000000000000',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914bf9db3e9b4e447d04cc7dbad89cf50d0fa74388c88ac',
                    sats: 31250371n,
                },
                {
                    outputScript:
                        '76a9149b487946ba24c1d61248ba992e3d533105cea14b88ac',
                    sats: 279681010n,
                },
                {
                    outputScript:
                        '76a914bf095d9afbda5245d5f1e27e7b360ec22357d6f088ac',
                    sats: 1578922n,
                },
                {
                    outputScript:
                        '76a914da3621d8d4a1c462b9f5cd2c9cb10850edbd3e4788ac',
                    spentBy: {
                        txid: '084d313be0c552839dbac91b47ceb792fec42ec5c121946366e0f352df16644f',
                        outIdx: 1,
                    },
                    sats: 2038n,
                },
                {
                    outputScript:
                        '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                    sats: 1585n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1516n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 1516n,
                },
                {
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                    sats: 1280n,
                },
                {
                    outputScript:
                        '76a91428ef733a0427f54c95cc5efea72d95f99db8e48d88ac',
                    sats: 791n,
                },
                {
                    outputScript:
                        '76a9149f88249247eba350d3b5ea61187fa1693e15524e88ac',
                    sats: 632n,
                },
                {
                    outputScript:
                        '76a91451691a770b8f2ab95590fbf89d22a290c57a4bd988ac',
                    sats: 601n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1735257601,
            size: 1837,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            isFinal: false,
            block: {
                height: 877018,
                hash: '000000000000000032d206581206d957112345b362f84578f2e67c5f4730a1bb',
                timestamp: 1735257732,
            },
        },
        walletHashes: ['bf9db3e9b4e447d04cc7dbad89cf50d0fa74388c'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'XECX | Received 312.5k XEC',
    },
    {
        description: 'invalid xecx tx',
        parsedTx: {
            appActions: [
                {
                    action: {
                        decoded:
                            '\u0001\b�4\u0000\u0000\u0000\u0000\u0000\u000e!�Þ\u0001\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
                        stack: '0108c43400000000000e21fdc39e01000000000000000000000000',
                    },
                    app: 'XECX',
                    isValid: false,
                    lokadId: '58454358',
                },
            ],
            parsedTokenEntries: [],
            recipients: [
                'ecash:qzd5s72xhgjvr4sjfzafjt3a2vcstn4pfvs4c84egx',
                'ecash:qzlsjhv6l0d9y3w47838u7ekpmpzx47k7qne9uv3t5',
                'ecash:qrdrvgwc6jsugc4e7hxje893ppgwm0f7gua8n7t3z9',
                'ecash:qq4fd9zdqecq3q4mmxz8v8vunepptukh3czav3gjyt',
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                'ecash:qp54xhk40f3fewpkp80pa9v28jr6940fmv38nxlahf',
                'ecash:qq5w7ue6qsnl2ny4e300afedjhuemw8y35j2e9mf0h',
                'ecash:qz0csfyjgl46x5xnkh4xzxrl595nu92jfch930m9sw',
                'ecash:qpgkjxnhpw8j4w24jral38fz52gv27jtmytxuxnkg3',
            ],
            replyAddress: 'ecash:qqfzls0nhjf7ukgpsmtlly2s2dueq54c5ulydy0h79',
            satoshisSent: 31250371,
            stackArray: [
                '50',
                '584543580108c43400000000000e21fdc39e01000000000000000000000000',
            ],
            xecTxType: 'Received',
        },
        tx: {
            txid: 'ca7057d9d878e17d105a732d723c84e10156c61627c9e4330e15a0dfe5ab37a5',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c8922424162ce2b2b19a902ecc7d2de3e20b5f138dd9ddcca0c9b3d41f9f2a25',
                        outIdx: 2,
                    },
                    inputScript:
                        '41287a47a0238eb4e55b92061f3205e5c067f00e6a88df11e60ceb55aa6efa5da97d9418e2e52a0c1b69eba5983a8ad837b0cbe05aefe51d5237bdf3a11e72a2e0412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250500n,
                },
                {
                    prevOut: {
                        txid: '38c1bcddb2037490d541286074820e8acd6563c743b659d09d123117c99d6ef4',
                        outIdx: 2,
                    },
                    inputScript:
                        '415b4594a93e4ea80231f25da079f27f6928264a5c37f281a2b59f7850c0d3a0a7ba9c856791dadc6b0e73aa22430581821b69caace9661c54dd45d7687fad1ef3412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250355n,
                },
                {
                    prevOut: {
                        txid: 'd8626173ca854bd56571632d8cb76667c7acad2594fec9d0015fe0866aca5c30',
                        outIdx: 2,
                    },
                    inputScript:
                        '41e4c223342bb6987464f4702aafff4dfd1421edddfbb9ab57a7a98339d93191dad2549db9f715260279786eebf48431fd120d18e1c8baa977de11efb7fe1f7b01412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250022n,
                },
                {
                    prevOut: {
                        txid: 'd3c3b54460b1a45b75a3e506101ebfac20ed21722650dfe47473994b50dcce19',
                        outIdx: 2,
                    },
                    inputScript:
                        '41faf5ed17630b62563d8d4e1f342a51c1715deba8cd69bb755056b345e3448ae70fac12b8740c53d17e8e8e9211c6d406026a5512e658da30260ebc207fe7f976412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250542n,
                },
                {
                    prevOut: {
                        txid: '747684142194ccf7ba1cd384e50324425051fee5ce516362fec85d1ab1af1f0d',
                        outIdx: 2,
                    },
                    inputScript:
                        '412546d55291fd069a4c12249cb06c011e16b890844824f279159122cbf8657868e7aaf6dc2239c17874cd50bb50fdc306c4224e5e2651ebaa0a831ee3a86a1285412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31251452n,
                },
                {
                    prevOut: {
                        txid: '4c6b1092c4b1525dda296a0d18bc378489058ac775ddfcdeeb3eb107e1f57c2b',
                        outIdx: 2,
                    },
                    inputScript:
                        '41d8b94143ad17fae0cd9eb5b57c197fd62d750a8d83627bf9d021c800608bca6771844298cccfc4d94da7b592c44ff8a653f2ff238fc1ea17828eac56d05ce309412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31251576n,
                },
                {
                    prevOut: {
                        txid: '80575750ecf408a2960e78d1fc23d8e55ecd6af66296484800ed8ae7b28e6147',
                        outIdx: 2,
                    },
                    inputScript:
                        '4148447f966b2000c31d5cfc31c6382cb116b891f643f03b8d9fd7eb25d8a827d01d0ca8129d3b7412255901214ec6fb6fbeca178aedc293797e8d03eabd4d6829412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31258084n,
                },
                {
                    prevOut: {
                        txid: 'e5e53ddc5225bb22c5a8c5c0c45b1f0ff3063c3b607bdef680b824eca433c99d',
                        outIdx: 2,
                    },
                    inputScript:
                        '417f7cc74f9421db8a11196faadc29bdca794efd2bc016f9fb46ba5340877c74c46c4d46efa9cb7115256d16fc1e6af1a5265d0b064fb70ec7a74128bb68b7b630412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250892n,
                },
                {
                    prevOut: {
                        txid: '6eb3fbee6778614a0993e61897b42c12bbbe36712b4cc8326ac31544c4441b31',
                        outIdx: 2,
                    },
                    inputScript:
                        '41f07a227801c780217f0bc3f68e9927c0f278182ffc754ca6b167b0413a1cf98cf4d1838a40668482e1dfb7761ccf0ddc7e5a05ac2f55002a075f79e7dc147914412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31256658n,
                },
                {
                    prevOut: {
                        txid: '2ce51ebf25366f99ee73c62d49e212894c697560a6ea483576a3d2629e551459',
                        outIdx: 2,
                    },
                    inputScript:
                        '413ab633abeacde057b424a607fbbc477f29d8bea944d23d944889e808d8388cb43386c0b62edc8b278e6daa45f0446e90f8f9c750a975a934d911ec0a752b4fbe412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31252018n,
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a501f584543580108c43400000000000e21fdc39e01000000000000000000000000',
                },
                {
                    outputScript:
                        '76a914bf9db3e9b4e447d04cc7dbad89cf50d0fa74388c88ac',
                    sats: 31250371n,
                },
                {
                    outputScript:
                        '76a9149b487946ba24c1d61248ba992e3d533105cea14b88ac',
                    sats: 279681010n,
                },
                {
                    outputScript:
                        '76a914bf095d9afbda5245d5f1e27e7b360ec22357d6f088ac',
                    sats: 1578922n,
                },
                {
                    outputScript:
                        '76a914da3621d8d4a1c462b9f5cd2c9cb10850edbd3e4788ac',
                    spentBy: {
                        txid: '084d313be0c552839dbac91b47ceb792fec42ec5c121946366e0f352df16644f',
                        outIdx: 1,
                    },
                    sats: 2038n,
                },
                {
                    outputScript:
                        '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                    sats: 1585n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1516n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 1516n,
                },
                {
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                    sats: 1280n,
                },
                {
                    outputScript:
                        '76a91428ef733a0427f54c95cc5efea72d95f99db8e48d88ac',
                    sats: 791n,
                },
                {
                    outputScript:
                        '76a9149f88249247eba350d3b5ea61187fa1693e15524e88ac',
                    sats: 632n,
                },
                {
                    outputScript:
                        '76a91451691a770b8f2ab95590fbf89d22a290c57a4bd988ac',
                    sats: 601n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1735257601,
            size: 1837,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            isFinal: false,
            block: {
                height: 877018,
                hash: '000000000000000032d206581206d957112345b362f84578f2e67c5f4730a1bb',
                timestamp: 1735257732,
            },
        },
        walletHashes: ['bf9db3e9b4e447d04cc7dbad89cf50d0fa74388c'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'Received 312.5k XEC | Invalid XECX',
    },
    {
        description: 'Firma yield tx (send)',
        parsedTx: {
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'SEND',
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenSatoshis: '200481',
                },
            ],
            recipients: [
                'ecash:qr8hdk8rxjc5nj6f450eth3nnslxa8k4gysrtyfxc5',
                'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
                'ecash:qrhysunk5kdt8n3e0jngjnavv6v2hgdkjcmsudvl92',
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                'ecash:qrkpxksh7drt87w6ahmc3nlmcdzpluzz2vpjvwuuxy',
                'ecash:qz0csfyjgl46x5xnkh4xzxrl595nu92jfch930m9sw',
                'ecash:qzngh6zrtq7ccpflvncahjqqarnca38uwumh845f6p',
                'ecash:qr0w2r6hvd3rwlwj7qc520qtkzgqnt90sypk26yd2u',
                'ecash:qzlsjhv6l0d9y3w47838u7ekpmpzx47k7qne9uv3t5',
                'ecash:qq4fd9zdqecq3q4mmxz8v8vunepptukh3czav3gjyt',
                'ecash:qq5w7ue6qsnl2ny4e300afedjhuemw8y35j2e9mf0h',
                'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            ],
            satoshisSent: 6552,
            stackArray: [
                '50',
                '534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f9487030d6d0c03000000c30000000000b900000000006900000000005200000000002b00000000001900000000000f00000000000f00000000000d0000000000070000000000070000000000140000000000',
            ],
            xecTxType: 'Sent',
        },
        tx: {
            txid: '3c56595af9eb142e18390ae07ccd6f6174e9b15e835208990da3a0ab2c66bed5',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'd199723b2ea022ea299d8785fcdedc4b8ee475e10a7f3402f3fad30ef380d5e2',
                        outIdx: 9,
                    },
                    inputScript:
                        '4125417d7c6b7ccc81eff94159e99cb533734433f38c3ee3b9a63e8cfbded5bd8114aad3331ada877d8aeea243f685485cc67690d49237075c55e1fc9082b034f1412103154e2dd365efda4d37f633a857eda739455e076de7c09ec59bc4f929f63b6d49',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 14n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                },
                {
                    prevOut: {
                        txid: 'b465eb1a20783a88554dcc95534c3fc2e5922cd7a8f1a83e6e442860b8764f0e',
                        outIdx: 1,
                    },
                    inputScript:
                        '41bc863737ec0613f49d39b3370a9c5974faa1eac5fa69a3b1a8d777bb4fcc7f2d138603ce959e3adfe504f0ce7231bf6ffb904e8d7cd28e04c4f69ebc9cfc77fa412103154e2dd365efda4d37f633a857eda739455e076de7c09ec59bc4f929f63b6d49',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 200487n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                },
                {
                    prevOut: {
                        txid: 'b465eb1a20783a88554dcc95534c3fc2e5922cd7a8f1a83e6e442860b8764f0e',
                        outIdx: 3,
                    },
                    inputScript:
                        '41aa40b355198a16381cc924539adf2843c57310d126ff82ce7b6829ed51b424a65cede15a08d66cad297e83d5ff1eb1f3d56abde79a16819d118b9953fc87c220412103154e2dd365efda4d37f633a857eda739455e076de7c09ec59bc4f929f63b6d49',
                    sats: 31249702n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a504c79534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f9487030d6d0c03000000c30000000000b900000000006900000000005200000000002b00000000001900000000000f00000000000f00000000000d0000000000070000000000070000000000140000000000',
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
                        atoms: 199789n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914a5417349420ec53b27522fed1a63b1672c0f28ff88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 195n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914ee487276a59ab3ce397ca6894fac6698aba1b69688ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 185n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 105n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '17fac4d29bb5e2ed5615f35ace4568adbb39555d871abde3cd9f2afd17980a8d',
                        outIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914ec135a17f346b3f9daedf788cffbc3441ff0425388ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 82n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a9149f88249247eba350d3b5ea61187fa1693e15524e88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 43n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914a68be843583d8c053f64f1dbc800e8e78ec4fc7788ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 25n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914dee50f576362377dd2f031453c0bb09009acaf8188ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 15n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914bf095d9afbda5245d5f1e27e7b360ec22357d6f088ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 15n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 13n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91428ef733a0427f54c95cc5efea72d95f99db8e48d88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 7n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 7n,
                        isMintBaton: false,
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
                        atoms: 20n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 31242653n,
                    outputScript:
                        '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                    spentBy: {
                        txid: 'fa9b61637a7366d349cbfb3eab8df48a49f7df8f841572fac7ecb940704ba2e4',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1740524404,
            size: 1043,
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
            block: {
                height: 885661,
                hash: '000000000000000016bfc7ceeaa54b9c4a3000cb0c7527c1f5620cf1d83b1437',
                timestamp: 1740524423,
            },
        },
        walletHashes: ['38d2e1501a485814e2849552093bb0588ed9acbb'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'FIRMA',
            tokenName: 'Firma',
            url: 'firma.cash',
            decimals: 4,
            data: '',
            authPubkey:
                '03fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105',
        },
        expected: 'Sent 20.0481 FIRMA',
    },
    {
        description: 'Firma yield tx (receive)',
        parsedTx: {
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'SEND',
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenSatoshis: '195',
                },
            ],
            recipients: [
                'ecash:qr8hdk8rxjc5nj6f450eth3nnslxa8k4gysrtyfxc5',
                'ecash:qrhysunk5kdt8n3e0jngjnavv6v2hgdkjcmsudvl92',
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                'ecash:qrkpxksh7drt87w6ahmc3nlmcdzpluzz2vpjvwuuxy',
                'ecash:qz0csfyjgl46x5xnkh4xzxrl595nu92jfch930m9sw',
                'ecash:qzngh6zrtq7ccpflvncahjqqarnca38uwumh845f6p',
                'ecash:qr0w2r6hvd3rwlwj7qc520qtkzgqnt90sypk26yd2u',
                'ecash:qzlsjhv6l0d9y3w47838u7ekpmpzx47k7qne9uv3t5',
                'ecash:qq4fd9zdqecq3q4mmxz8v8vunepptukh3czav3gjyt',
                'ecash:qq5w7ue6qsnl2ny4e300afedjhuemw8y35j2e9mf0h',
                'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                'ecash:qqud9c2srfy9s98zsj24yzfmkpvgakdvhv6xx7umh5',
            ],
            replyAddress: 'ecash:qqud9c2srfy9s98zsj24yzfmkpvgakdvhv6xx7umh5',
            satoshisSent: 546,
            stackArray: [
                '50',
                '534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f9487030d6d0c03000000c30000000000b900000000006900000000005200000000002b00000000001900000000000f00000000000f00000000000d0000000000070000000000070000000000140000000000',
            ],
            xecTxType: 'Received',
        },
        tx: {
            txid: '3c56595af9eb142e18390ae07ccd6f6174e9b15e835208990da3a0ab2c66bed5',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'd199723b2ea022ea299d8785fcdedc4b8ee475e10a7f3402f3fad30ef380d5e2',
                        outIdx: 9,
                    },
                    inputScript:
                        '4125417d7c6b7ccc81eff94159e99cb533734433f38c3ee3b9a63e8cfbded5bd8114aad3331ada877d8aeea243f685485cc67690d49237075c55e1fc9082b034f1412103154e2dd365efda4d37f633a857eda739455e076de7c09ec59bc4f929f63b6d49',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 14n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                },
                {
                    prevOut: {
                        txid: 'b465eb1a20783a88554dcc95534c3fc2e5922cd7a8f1a83e6e442860b8764f0e',
                        outIdx: 1,
                    },
                    inputScript:
                        '41bc863737ec0613f49d39b3370a9c5974faa1eac5fa69a3b1a8d777bb4fcc7f2d138603ce959e3adfe504f0ce7231bf6ffb904e8d7cd28e04c4f69ebc9cfc77fa412103154e2dd365efda4d37f633a857eda739455e076de7c09ec59bc4f929f63b6d49',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 200487n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                },
                {
                    prevOut: {
                        txid: 'b465eb1a20783a88554dcc95534c3fc2e5922cd7a8f1a83e6e442860b8764f0e',
                        outIdx: 3,
                    },
                    inputScript:
                        '41aa40b355198a16381cc924539adf2843c57310d126ff82ce7b6829ed51b424a65cede15a08d66cad297e83d5ff1eb1f3d56abde79a16819d118b9953fc87c220412103154e2dd365efda4d37f633a857eda739455e076de7c09ec59bc4f929f63b6d49',
                    sats: 31249702n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a504c79534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f9487030d6d0c03000000c30000000000b900000000006900000000005200000000002b00000000001900000000000f00000000000f00000000000d0000000000070000000000070000000000140000000000',
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
                        atoms: 199789n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914a5417349420ec53b27522fed1a63b1672c0f28ff88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 195n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914ee487276a59ab3ce397ca6894fac6698aba1b69688ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 185n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 105n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '17fac4d29bb5e2ed5615f35ace4568adbb39555d871abde3cd9f2afd17980a8d',
                        outIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914ec135a17f346b3f9daedf788cffbc3441ff0425388ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 82n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a9149f88249247eba350d3b5ea61187fa1693e15524e88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 43n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914a68be843583d8c053f64f1dbc800e8e78ec4fc7788ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 25n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914dee50f576362377dd2f031453c0bb09009acaf8188ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 15n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914bf095d9afbda5245d5f1e27e7b360ec22357d6f088ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 15n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 13n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91428ef733a0427f54c95cc5efea72d95f99db8e48d88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 7n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 7n,
                        isMintBaton: false,
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
                        atoms: 20n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 31242653n,
                    outputScript:
                        '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                    spentBy: {
                        txid: 'fa9b61637a7366d349cbfb3eab8df48a49f7df8f841572fac7ecb940704ba2e4',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1740524404,
            size: 1043,
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
            block: {
                height: 885661,
                hash: '000000000000000016bfc7ceeaa54b9c4a3000cb0c7527c1f5620cf1d83b1437',
                timestamp: 1740524423,
            },
        },
        walletHashes: ['a5417349420ec53b27522fed1a63b1672c0f28ff'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'FIRMA',
            tokenName: 'Firma',
            url: 'firma.cash',
            decimals: 4,
            data: '',
            authPubkey:
                '03fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105',
        },
        expected: 'Received 0.0195 FIRMA',
    },
    {
        description: 'Firma redeem tx (send)',
        parsedTx: {
            appActions: [
                {
                    action: {
                        solAddr: '6JKwz43wDTgk5n8eNCJrtsnNtkDdKd1XUZAvB9WkiEQ4',
                    },
                    app: 'Solana Address',
                    isValid: true,
                    lokadId: '534f4c30',
                },
            ],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'SEND',
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenSatoshis: '10000',
                },
            ],
            recipients: ['ecash:qr8hdk8rxjc5nj6f450eth3nnslxa8k4gysrtyfxc5'],
            satoshisSent: 546,
            stackArray: [
                '50',
                '534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f94870302102700000000f09b00000000',
                '534f4c304ebabba2b443691c1a9180426004d5fd3419e9f9c64e5839b853cecdaacbf745',
            ],
            xecTxType: 'Sent',
        },
        tx: {
            txid: 'c2ca0b8669abda46688bf34ab6da313a03a2bfb56af99c4aad8c244fc25b6aaa',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '2dbb137fdb0bbff00b368892f7ef27c262ef2077cfcdfa74fc37f79b7225af14',
                        outIdx: 3,
                    },
                    inputScript:
                        '41e4b59e83b9117fe0700cf7637be60cbded713a8f0eaa09538d76f7ce46429ac29baddd682d106716e616fc6965562a471ce980423c379efd2f10177db701f7c1412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 49920n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
                {
                    prevOut: {
                        txid: 'c025a30635a0dcf09a286f1a8ba7994fe7f40d7272ff5eb1c6bb7d64b98f8f64',
                        outIdx: 0,
                    },
                    inputScript:
                        '412d017b40fe2eca6cfa6a78e9d9dfb9061250af3b7c41ca8dea00b312319d2b849d16a8bb01a400363c780d0fe60954313d61846c7c01fda331b1c2e594375e88412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sats: 12852047n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a5037534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f94870302102700000000f09b0000000024534f4c304ebabba2b443691c1a9180426004d5fd3419e9f9c64e5839b853cecdaacbf745',
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
                        atoms: 10000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 39920n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 12851003n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1747169763,
            size: 498,
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
            block: {
                height: 896729,
                hash: '000000000000000013206bc393f6de124f937013b16456963f7156ba21e7bbf5',
                timestamp: 1747169847,
            },
        },
        walletHashes: ['76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: {
            tokenTicker: 'FIRMA',
            tokenName: 'Firma',
            url: 'firma.cash',
            decimals: 4,
            data: '',
            authPubkey:
                '03fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105',
        },
        expected: 'Sent 1.0000 FIRMA',
    },
    {
        description:
            'Standalone XEC DICE bet received at BlitzChips game address',
        parsedTx: {
            satoshisSent: 33000,
            stackArray: ['44494345', '00', '814a5d05', '00e1f505'],
            xecTxType: 'Received',
            recipients: [],
            replyAddress: 'ecash:qqt3nngfky8sywc24n8ee97cut7tyrawju5qj7wpdr',
            appActions: [
                {
                    lokadId: '44494345',
                    app: 'DICE Bet',
                    isValid: true,
                    action: {
                        minValue: 90000001,
                        maxValue: 100000000,
                    },
                },
            ],
            parsedTokenEntries: [],
        },
        tx: {
            txid: '8d55f439eab81e9fc7fa9712f1742c975ccfcb984135e8c944330a958792d19d',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'f960e40345a2a0a53d42e95c858c704663c6003039510e16849bc33f28b7c4f9',
                        outIdx: 2,
                    },
                    inputScript:
                        '419d8fb3a857ae651d2ed51ad3eed664fdfe2f4acc888a678f9f449f303a111178141e7b0aefa0185b7a32135f76630d9f87bab817b8c099ba946bd40e784605a4412103a4372bf29335f5226996995d60e6b41c5d17cd4bf654b566e95b59bab27112be',
                    sats: 242489657n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9141719cd09b10f023b0aaccf9c97d8e2fcb20fae9788ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript: '6a0444494345010004814a5d050400e1f505',
                },
                {
                    sats: 33000n,
                    outputScript:
                        '76a9142d817e4eda9d327dbefeca6a5e56cb142d53606e88ac',
                },
                {
                    sats: 242456411n,
                    outputScript:
                        '76a9141719cd09b10f023b0aaccf9c97d8e2fcb20fae9788ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1784288352,
            size: 246,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            isFinal: true,
        },
        walletHashes: ['2d817e4eda9d327dbefeca6a5e56cb142d53606e'],
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'DICE Bet | Received 330.00 XEC | 90000001-100000000',
    },
    {
        description: 'ROLL payout notification',
        parsedTx: {
            satoshisSent: 66000,
            stackArray: [],
            xecTxType: 'Received',
            recipients: [],
            replyAddress: 'ecash:qqkczljwm2wnyld7lm9x5hjkev2z65mqdcz6544y9c',
            appActions: [
                {
                    lokadId: '524f4c4c',
                    app: 'ROLL Payout',
                    isValid: true,
                    action: {
                        betTxid:
                            '8d55f439eab81e9fc7fa9712f1742c975ccfcb984135e8c944330a958792d19d',
                        roll: 95000000,
                        seedHash:
                            '0000000000000000000000000000000000000000000000000000000000000000',
                        result: 'W',
                    },
                },
            ],
            parsedTokenEntries: [],
        },
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'ROLL Payout | Received 660.00 XEC | W (95000000)',
    },
] as NotificationFixture[];

export const parseFixtures = [
    {
        description: 'NFToa Authentication TX (Proof of Access)',
        tx: {
            txid: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'feedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedface',
                        outIdx: 0,
                    },
                    inputScript:
                        '41fc1401150778a0d47d5279ccdaa13298cfa43e25d8d37d37570291207a92098beefa8fb25b8fb9cb2c4d7b5f98b7ff377c54932e0e67f4db2fc127ed86e01b1a4121024b60abfca9302b9bf5731faca03fd4f0b06391621a4cd1d57fffd6f1179bb9ba',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a9144c8f13b8a1b3b9297d553b6b7cd02158b99147e588ac',
                    sats: 10000n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a044e465400134c6f67696e20746f2047617564696f2041707008eb0c601b84975437',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914c73d119dede21aca5b3f1d959634bb6fee87899688ac',
                    sats: 550n,
                },
            ],
            lockTime: 0,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: ['c73d119dede21aca5b3f1d959634bb6fee878996'],
        parsed: {
            satoshisSent: 550,
            replyAddress: 'ecash:qpxg7yac5xemj2ta25akklxsy9vtny28u5m73jvduu',
            stackArray: [
                '4e465400',
                '4c6f67696e20746f2047617564696f20417070',
                'eb0c601b84975437',
            ],
            xecTxType: 'Received',
            appActions: [
                {
                    app: 'NFToa',
                    lokadId: '4e465400',
                    isValid: true,
                    action: {
                        data: 'Login to Gaudio App',
                        nonce: 'eb0c601b84975437',
                    },
                },
            ],
            parsedTokenEntries: [],
            recipients: [],
        },
    },
    {
        description: 'NFToa Regular Message TX (Proof of Access)',
        tx: {
            txid: 'dcba4321dcba4321dcba4321dcba4321dcba4321dcba4321dcba4321dcba4321',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'feedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedface',
                        outIdx: 0,
                    },
                    inputScript:
                        '41fc1401150778a0d47d5279ccdaa13298cfa43e25d8d37d37570291207a92098beefa8fb25b8fb9cb2c4d7b5f98b7ff377c54932e0e67f4db2fc127ed86e01b1a4121024b60abfca9302b9bf5731faca03fd4f0b06391621a4cd1d57fffd6f1179bb9ba',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a9144c8f13b8a1b3b9297d553b6b7cd02158b99147e588ac',
                    sats: 10000n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a044e4654001648656c6c6f20576f726c642066726f6d204e46546f61',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914c73d119dede21aca5b3f1d959634bb6fee87899688ac',
                    sats: 550n,
                },
            ],
            lockTime: 0,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: ['c73d119dede21aca5b3f1d959634bb6fee878996'],
        parsed: {
            satoshisSent: 550,
            replyAddress: 'ecash:qpxg7yac5xemj2ta25akklxsy9vtny28u5m73jvduu',
            stackArray: [
                '4e465400',
                '48656c6c6f20576f726c642066726f6d204e46546f61',
            ],
            xecTxType: 'Received',
            appActions: [
                {
                    app: 'NFToa',
                    lokadId: '4e465400',
                    isValid: true,
                    action: {
                        data: 'Hello World from NFToa',
                        nonce: '',
                    },
                },
            ],
            parsedTokenEntries: [],
            recipients: [],
        },
    },
    {
        description: 'Off-spec NFToa TX',
        tx: {
            txid: '0badc0de0badc0de0badc0de0badc0de0badc0de0badc0de0badc0de0badc0de',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'feedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedface',
                        outIdx: 0,
                    },
                    inputScript:
                        '41fc1401150778a0d47d5279ccdaa13298cfa43e25d8d37d37570291207a92098beefa8fb25b8fb9cb2c4d7b5f98b7ff377c54932e0e67f4db2fc127ed86e01b1a4121024b60abfca9302b9bf5731faca03fd4f0b06391621a4cd1d57fffd6f1179bb9ba',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a9144c8f13b8a1b3b9297d553b6b7cd02158b99147e588ac',
                    sats: 10000n,
                },
            ],
            outputs: [
                {
                    outputScript: '6a044e465400',
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a914c73d119dede21aca5b3f1d959634bb6fee87899688ac',
                    sats: 0n,
                },
            ],
            lockTime: 0,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: ['c73d119dede21aca5b3f1d959634bb6fee878996'],
        parsed: {
            satoshisSent: 550,
            replyAddress: 'ecash:qpxg7yac5xemj2ta25akklxsy9vtny28u5m73jvduu',
            stackArray: ['4e465400'],
            xecTxType: 'Received',
            appActions: [
                {
                    app: 'NFToa',
                    lokadId: '4e465400',
                    isValid: false,
                },
            ],
            recipients: [],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Staking rewards coinbase tx',
        tx: {
            txid: 'c8b0783e36ab472f26108007ffa522ee82b79db3777c84b0448f5b9ef35be895',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: '0000000000000000000000000000000000000000000000000000000000000000',
                        outIdx: 4294967295,
                    },
                    inputScript:
                        '03f07d0c0439e5546508edc754ac9b2939000c736f6c6f706f6f6c2e6f7267',
                    sequenceNo: 0,
                    sats: 0n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '76a914f4728f398bb962656803346fb4ac45d776041a2e88ac',
                    spentBy: {
                        txid: '6a26b853ba356cdc4a927c43afe33f03d30ef2367bd1f2c190a8c2e15f77fb6d',
                        outIdx: 1,
                    },
                    sats: 362505204n,
                },
                {
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                    spentBy: {
                        txid: 'c5621e2312eaabcfa53af46b62384f1751c509b9ff50d1bf218f92723be01bc7',
                        outIdx: 2,
                    },
                    sats: 200002871n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    spentBy: {
                        txid: '98e47dda8c20facafff11fec7c6453f9d8afdd24281eb6129b76bfef90dd6bab',
                        outIdx: 0,
                    },
                    sats: 62500897n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 182,
            isCoinbase: true,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 818672,
                hash: '000000000000000009520291eb09aacd13b7bb802f329b584dafbc036a15b4cb',
                timestamp: 1700062633,
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        parsed: {
            satoshisSent: 62500897,
            stackArray: [],
            xecTxType: 'Staking Reward',
            recipients: [
                'ecash:qr689ree3wukyetgqv6xld9vghthvpq69cg04xjp57',
                'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
            ],
            appActions: [],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Incoming XEC tx',
        tx: {
            txid: 'ac83faac54059c89c41dea4c3d6704e4f74fb82e4ad2fb948e640f1d19b760de',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '783428349b7b040b473ca9720ddbb2eda6fe28db16883ae47f3113b7a0977915',
                        outIdx: 1,
                    },
                    inputScript:
                        '48304502210094c497d6a0ce9ca6d79819467a1bb3953084b2e003ac7edac3b4f0634800baab02205729e229bd96d3a35cece712e3e9ec2d3f610a43d7712928f806983f209fbd72412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    sats: 517521n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    spentBy: {
                        txid: '23b4ac14065f0b8bb594e35a366cb707b52c4630398439d79c4cd179d005a298',
                        outIdx: 2,
                    },
                    sats: 4200n,
                },
                {
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    spentBy: {
                        txid: '0f4e0e3ad405a5b40a3f0cef78d55093729aa6504e420dc5ceaf1445beecbded',
                        outIdx: 0,
                    },
                    sats: 512866n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 226,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 739911,
                hash: '00000000000000000a6da230a41e268bb42ad7f4e9f939b6875c4fb2293bcd6f',
                timestamp: 1652812528,
            },
            isFinal: true,
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        parsed: {
            satoshisSent: 4200,
            stackArray: [],
            xecTxType: 'Received',
            recipients: ['ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6'],
            replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
            appActions: [],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Outgoing XEC tx',
        tx: {
            txid: 'b82a67f929d256c9beb04a850ad735f3b322156cc9df2e37cadc130cc4fab660',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'bb161d20f884ce45374fa3f9f1452290a2e52e93c8b552f559fad8ccd1ca33cc',
                        outIdx: 5,
                    },
                    inputScript:
                        '473044022054a6b2065a0b0bbe70048e782aa9be048cc8bee0a241d08d0b98fcd74505a90202201ed5224f34c9ff73dc0c581390247686af521476a977a58e55ed33c4afd177c2412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 4400000n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    spentBy: {
                        txid: '692a900ae6607d2b798df2cc1e8856aa812b158880c99295041d8a8b70c88d01',
                        outIdx: 1,
                    },
                    sats: 22200n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    spentBy: {
                        txid: '69b060294e7b49fdf45f0a6eb500a03a881a2f54c86238b54718880470629cee',
                        outIdx: 0,
                    },
                    sats: 4377345n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 225,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 739925,
                hash: '00000000000000001456e79aafc77f5cfecd77cda1252698d8f03e04b0a299d1',
                timestamp: 1652824018,
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        parsed: {
            satoshisSent: 22200,
            stackArray: [],
            xecTxType: 'Sent',
            recipients: ['ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6'],
            appActions: [],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Alias registration',
        tx: {
            txid: 'f64608b13daf977008cfb96eb97082014c11cad5575956591a7ac9832d4fca9c',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '9e06c1e03220a04abe2207ffcc3ce6600c11ad45890dd298ff24c92baba6b457',
                        outIdx: 2,
                    },
                    inputScript:
                        '48304502210087cd61371447a4e8426b86ea9c8643a94a378701c436e7d88b46eb64886a2c9d02201943c4b17eed65e37153659edff07aede69c1695254fe811180d616809daacf74121028bd858b877988795ed097c6e6230363450a3ceda58b15b0a76f0113d933c10a6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914dc1147663948f0dcfb00cc407eda41b121713ad388ac',
                    sats: 20105n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a042e7865630004627567321500dc1147663948f0dcfb00cc407eda41b121713ad3',
                    sats: 0n,
                },
                {
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                    spentBy: {
                        txid: 'fabf82bda2c0d460bade2bcd0d9845ecb12508f31074ddcc4db4928fda44f3ec',
                        outIdx: 154,
                    },
                    sats: 555n,
                },
                {
                    outputScript:
                        '76a914dc1147663948f0dcfb00cc407eda41b121713ad388ac',
                    spentBy: {
                        txid: '8684205e5bc1ae154886f1701d2a492b67ad0ffc5e372087fcc981d69a67d407',
                        outIdx: 0,
                    },
                    sats: 19095n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 267,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 812499,
                hash: '00000000000000000d135cbee30d24ae913e68b4de2ffd776ab30e35c92cd338',
                timestamp: 1696335276,
            },
        },
        walletHashes: ['dc1147663948f0dcfb00cc407eda41b121713ad3'],
        parsed: {
            satoshisSent: 555,
            stackArray: [
                '2e786563',
                '00',
                '62756732',
                '00dc1147663948f0dcfb00cc407eda41b121713ad3',
            ],
            xecTxType: 'Sent',
            recipients: ['ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07'],
            appActions: [
                {
                    app: 'alias',
                    lokadId: '2e786563',
                    isValid: true,
                    action: {
                        address:
                            'ecash:qqxuz9rkvw2g7rw0kqxvgpld5sd3y9cn45tv669kqz',
                        alias: 'bug2',
                    },
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Invalid alias registration',
        tx: {
            txid: 'f64608b13daf977008cfb96eb97082014c11cad5575956591a7ac9832d4fca9c',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '9e06c1e03220a04abe2207ffcc3ce6600c11ad45890dd298ff24c92baba6b457',
                        outIdx: 2,
                    },
                    inputScript:
                        '48304502210087cd61371447a4e8426b86ea9c8643a94a378701c436e7d88b46eb64886a2c9d02201943c4b17eed65e37153659edff07aede69c1695254fe811180d616809daacf74121028bd858b877988795ed097c6e6230363450a3ceda58b15b0a76f0113d933c10a6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914dc1147663948f0dcfb00cc407eda41b121713ad388ac',
                    sats: 20105n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a042e786563010104627567321500dc1147663948f0dcfb00cc407eda41b121713ad3',
                    sats: 0n,
                },
                {
                    outputScript:
                        'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
                    spentBy: {
                        txid: 'fabf82bda2c0d460bade2bcd0d9845ecb12508f31074ddcc4db4928fda44f3ec',
                        outIdx: 154,
                    },
                    sats: 555n,
                },
                {
                    outputScript:
                        '76a914dc1147663948f0dcfb00cc407eda41b121713ad388ac',
                    spentBy: {
                        txid: '8684205e5bc1ae154886f1701d2a492b67ad0ffc5e372087fcc981d69a67d407',
                        outIdx: 0,
                    },
                    sats: 19095n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 267,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 812499,
                hash: '00000000000000000d135cbee30d24ae913e68b4de2ffd776ab30e35c92cd338',
                timestamp: 1696335276,
            },
        },
        walletHashes: ['dc1147663948f0dcfb00cc407eda41b121713ad3'],
        parsed: {
            appActions: [
                {
                    app: 'alias',
                    isValid: false,
                    lokadId: '2e786563',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07'],
            satoshisSent: 555,
            stackArray: [
                '2e786563',
                '01',
                '62756732',
                '00dc1147663948f0dcfb00cc407eda41b121713ad3',
            ],
            xecTxType: 'Sent',
        },
    },
    {
        description: 'Incoming eToken',
        tx: {
            txid: '46cf8bf009dbc6da45045c23af878cd2fd6dd3d3f62bf524d675e75959d5fdbd',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '51c18b220c2ff1d3ead60c3031316f15ed1c7fa43fbfe563c8227e107f218751',
                        outIdx: 1,
                    },
                    inputScript:
                        '473044022004db23a179194d5e2d8446159859a3e55521239c807f14d4666c772d1493a7d402206d6ea22a4fb8ef20cd6159d200a7292a3ff0181c8d596e7a3e1b9027e6912103412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    sats: 3891539n,
                },
                {
                    prevOut: {
                        txid: '66f0663e79f6a7fa3bf0834a16b48cb86fa42076c0df25ae89b402d5ee97c311',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100c45951e15402b907c419f8a80bd76d374521faf885327ba3e55021345c2eb41902204cdb84e0190a5f671dd049b6b656f6b9e8b57254ec0123308345d5a634802acd412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 240n,
                    },
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    sats: 546n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c308000000000000000c0800000000000000e4',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 12n,
                    },
                    spentBy: {
                        txid: '96ddf598c00edd493a020fea6ac382b708753cc8b7690f673685af64916089dd',
                        outIdx: 7,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    token: {
                        tokenId:
                            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 228n,
                    },
                    spentBy: {
                        txid: 'cd4b0008e90b2a872dc92e19cdd87f52466b801f037641193196e75ff10f6990',
                        outIdx: 2,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    spentBy: {
                        txid: '648b9f3a7e9c52f7654b6bba0e00c73bcf58aeed2a9381c4ab45ee32d214284b',
                        outIdx: 0,
                    },
                    sats: 3889721n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 480,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 739924,
                hash: '000000000000000010d2929cd5721cd975ea4425a39c5cb12cfcf5e20f52628a',
                timestamp: 1652822224,
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        parsed: {
            satoshisSent: 546,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                '000000000000000c',
                '00000000000000e4',
            ],
            xecTxType: 'Received',
            recipients: ['ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6'],
            replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'SEND',
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenSatoshis: '12',
                },
            ],
        },
    },
    {
        description: 'Outgoing eToken',
        tx: {
            txid: '3d60d2d130eee3e45e6a2d0e88e2ecae82d70c1ed1afc8f62ca9c8564d38108d',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'bf7a7d1a063751d8f9c67e88523b3e6ffe8bb133e54ebf3cf500b859adfe16e0',
                        outIdx: 1,
                    },
                    inputScript:
                        '473044022047077b516d8554aba4deb36c66b789b5136bf16657bf1675ae866fd8a62834f5022035a7bd45422e0d0c343ac832a5efb0c05269ebe591ea400a33c23849cfa7c3a0412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 450747149n,
                },
                {
                    prevOut: {
                        txid: '66f0663e79f6a7fa3bf0834a16b48cb86fa42076c0df25ae89b402d5ee97c311',
                        outIdx: 1,
                    },
                    inputScript:
                        '47304402203ba0eff663f253805a4ae75fecf5886d7dbaf6369c9e6f0bbf5c114184223fa202207992c5f1a8cb69b552b1af54a75bbab341bfcf90591e535282bd9409981d8464412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 69n,
                    },
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 546n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e44204bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3080000000000000011080000000000000034',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    token: {
                        tokenId:
                            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 17n,
                    },
                    spentBy: {
                        txid: 'fa2e8951ee2ba44bab33e38c5b903bf77657363cffe268e8ae9f4728e14b04d8',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 52n,
                    },
                    spentBy: {
                        txid: 'fb12358a18b6d6e563b7790f8e08ca9c9260df747c5e9113901fed04094be03d',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    spentBy: {
                        txid: '23b4ac14065f0b8bb594e35a366cb707b52c4630398439d79c4cd179d005a298',
                        outIdx: 3,
                    },
                    sats: 450745331n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 479,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 739925,
                hash: '00000000000000001456e79aafc77f5cfecd77cda1252698d8f03e04b0a299d1',
                timestamp: 1652824018,
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        parsed: {
            satoshisSent: 546,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                '0000000000000011',
                '0000000000000034',
            ],
            xecTxType: 'Sent',
            recipients: ['ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6'],
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'SEND',
                    tokenId:
                        '4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
                    tokenSatoshis: '17',
                },
            ],
        },
    },
    {
        description: 'Genesis tx',
        tx: {
            txid: 'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'b142b79dbda8ae4aa580220bec76ae5ee78ff2c206a39ce20138c4f371c22aca',
                        outIdx: 0,
                    },
                    inputScript:
                        '483045022100ab2a1e04a156e9cc5204e11e77ba399347f3b7ea3e05d45897c7fb7c6854a7ff022065c7e096e0526a0af223ce32e5e162aa577c42f7da231c13e28ebc3532396f20412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1300n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010747454e45534953035544540a557064617465546573741468747470733a2f2f636173687461622e636f6d2f4c0001074c000800000001cf977871',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 7777777777n,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 268,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'GENESIS',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 759037,
                hash: '00000000000000000bc95bfdd45e71585f27139e71b56dd5bc86ef05d35b502f',
                timestamp: 1664226709,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        parsed: {
            satoshisSent: 546,
            stackArray: [
                '534c5000',
                '01',
                '47454e45534953',
                '554454',
                '55706461746554657374',
                '68747470733a2f2f636173687461622e636f6d2f',
                '',
                '07',
                '',
                '00000001cf977871',
            ],
            xecTxType: 'Sent',
            recipients: [],
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'GENESIS',
                    tokenId:
                        'cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
                    tokenSatoshis: '7777777777',
                },
            ],
        },
    },
    {
        description: 'Incoming eToken tx with 9 decimals',
        tx: {
            txid: 'b808f6a831dcdfda2bd4c5f857f94e1a746a4effeda6a5ad742be6137884a4fb',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c638754cb7707edd4faad89bdfee899aa7acbbc61f66e21f8faf60bdbb34fd65',
                        outIdx: 3,
                    },
                    inputScript:
                        '4830450221009d649476ad963306a5210d9df2dfd7e2bb604be43d6cdfe359638d96239973eb02200ac6e71575f0f111dad2fbbeb2712490cc709ffe03eda7de33acc8614b2c0979412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    sats: 3503n,
                },
                {
                    prevOut: {
                        txid: '82d8dc652779f8d6c8453d2ba5aefec91f5247489246e5672cf3c5986fa3d235',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100b7bec6d09e71bc4c124886e5953f6e7a7845c920f66feac2e9e5d16fc58a649a0220689d617c11ef0bd63dbb7ea0fa5c0d3419d6500535bda8f7a7fc3e27f27c3de6412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 9876543156n,
                    },
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    sats: 546n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e4420acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f550800000000075bcd1508000000024554499f',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 123456789n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    token: {
                        tokenId:
                            'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 9753086367n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    spentBy: {
                        txid: '04b16fa516fbdd64d51b8aa1a752855beb4250d99199322d89d9c4c6172a1b9f',
                        outIdx: 4,
                    },
                    sats: 1685n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 481,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 760076,
                hash: '00000000000000000bf1ee10a21cc4b784ea48840fa00237e41f69a027c6a86c',
                timestamp: 1664840266,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        parsed: {
            satoshisSent: 546,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
                '00000000075bcd15',
                '000000024554499f',
            ],
            xecTxType: 'Received',
            recipients: ['ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6'],
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'SEND',
                    tokenId:
                        'acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
                    tokenSatoshis: '123456789',
                },
            ],
            replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
        },
    },
    {
        description: 'Legacy airdrop tx',
        tx: {
            txid: '6e3baf279770c3ed84981c414f433e654cdc1b12df3024051f0f7c215a13dca9',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '806abb677534eaa3b61ca050b65d4159d64e442699dd5460be87786f973bc079',
                        outIdx: 0,
                    },
                    inputScript:
                        '47304402207acf2b13eb099b42edf2d985afc4da3123a76e3120a66cd2e915fdd93b9ce243022055529f4f4db28c2d3b3ce98fd55dd539c92f0790d36cf8a63a4fbb89eb602b2a412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                    sats: 1595n,
                },
                {
                    prevOut: {
                        txid: 'c257bdccd3804de5ce1359d986488902d73e11156e544ca9eaf15d9d3878a83c',
                        outIdx: 111,
                    },
                    inputScript:
                        '47304402205f670a5afb2b6cb10ae86818f50c0dd9a9bc639e979a3325ab8834c5631ac81b022078ce9092a5ded4afe261f1b311e5619f1f8673ace9de5dae3441f33834ecb33a412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                    sats: 22600n,
                },
                {
                    prevOut: {
                        txid: '8db1137ec2cdaa0c5a93c575352eaf024ce304f189c91094cc6b711be876dff4',
                        outIdx: 3,
                    },
                    inputScript:
                        '483045022100cca98ffbd5034f1f07c459a2f7b694d0bfc8cd9c0f33fe0b45d5914a10b034610220592d50dd5f1fea5c1d689909e61d1d1bfad21ea6a42a01ba7d4e9428baedca06412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                    sats: 170214n,
                },
                {
                    prevOut: {
                        txid: '5c7e9879f94258e7128f684c0be7786d9d2355c1f3b3ded5382e3a2745d9ec53',
                        outIdx: 111,
                    },
                    inputScript:
                        '483045022100fefd74866d212ff97b54fb4d6e588754b13d073b06200f255d891195fc57cb0502201948da90078778ab195c8adec213cc09972a1c89f8a35d10294894bcbf313941412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                    sats: 22583n,
                },
                {
                    prevOut: {
                        txid: '6b86db3a0adb9963c3fbf911ad3935b611ea6224834f1664e0bdfc026fd57fc9',
                        outIdx: 3,
                    },
                    inputScript:
                        '483045022100e4dde7a7d227f0631d042a1953e55400b00386050eff672832e557a4438f0f0b022060fd64cb142723578a4fd25c703d7afa0db045d981c75f770cb66b3b87ccc72a412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                    sats: 16250n,
                },
                {
                    prevOut: {
                        txid: '81f52f89efc61072dcab4735f1a99b6648c8cc10314452185e728b383b170e30',
                        outIdx: 23,
                    },
                    inputScript:
                        '483045022100f057b22cbc643d6aa839d64c96eede889782e4738104dde84c5980089c75c9e702200449b7ad1e88141def532e3cd2943dfa29a9ede8a6d0b3283531dee085b867b1412102f2d4a75908a466eec993f27fb985836490d9af52f110b15b60fe6cb17dbedf6d',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                    sats: 23567578n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a0464726f7020bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c04007461624565766320746f6b656e207365727669636520686f6c64657273206169722064726f70f09fa587f09f8c90f09fa587e29da4f09f918cf09f9bacf09f9bacf09f8d97f09fa4b4',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a9140352e2c246fa38fe57f6504dcff628a2ab85c9a888ac',
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a9147d2acc561f417bf3265d465fbd76b7976cd35add88ac',
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a91478a291a19347161a532f31cae95d492cc57965e888ac',
                    spentBy: {
                        txid: 'dc5bbe05a2a0e22d4c7bd241498213208610cf56868d72268913491c3c099507',
                        outIdx: 47,
                    },
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a91478cc64d09c2c558e2c7f1baf463f4e2a6246559888ac',
                    sats: 584n,
                },
                {
                    outputScript:
                        '76a91471536340a5ad319f24ae433d7caa4475dd69faec88ac',
                    sats: 10027n,
                },
                {
                    outputScript:
                        '76a914649be1781f962c54f47273d58e31439fb452b92988ac',
                    sats: 10427n,
                },
                {
                    outputScript:
                        '76a914be3ce499e31ebe80c7aabf673acd854c8969ddc488ac',
                    sats: 560n,
                },
                {
                    outputScript:
                        '76a914e88f39383c4d264410f30d2b28cdae775c67ea8e88ac',
                    spentBy: {
                        txid: '739fda27cd573dcfe22086463263c96232990473fc017ce83da7c996058e63fb',
                        outIdx: 0,
                    },
                    sats: 551n,
                },
                {
                    outputScript:
                        '76a9145fbce9959ce7b712393138aef20b013d5a2802e688ac',
                    sats: 557n,
                },
                {
                    outputScript:
                        '76a91450f35e3861d60945efcd2b05f562eff14d28db1088ac',
                    spentBy: {
                        txid: '558a3526d3bbc29ba8a2eb5466a7b4d6d5d544e7e83c1c15346fa03bdec1c6c1',
                        outIdx: 0,
                    },
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a914866ed8973e444d1f6533eb1858ca284ad589bc1988ac',
                    sats: 10027n,
                },
                {
                    outputScript:
                        '76a9140848ee10a336bba27c7ee90dc4a1c2407178a5b788ac',
                    sats: 555n,
                },
                {
                    outputScript:
                        '76a9149750cdddb976b8466668a73b58c0a1afbd6f4db888ac',
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a9148ee151bf0f1637cdd2e1b41ed2cd32b0df0a932588ac',
                    sats: 560n,
                },
                {
                    outputScript:
                        '76a914be792ef52fb6bc5adcabeb8eb604fbbb3dc4693488ac',
                    sats: 590n,
                },
                {
                    outputScript:
                        '76a9142ad96e467f9354f86e0c11acfde351194a183dc888ac',
                    spentBy: {
                        txid: 'a900d93eea490d121bb9cb11457ee0f86edb53d5b7a26984567b8cf1b282adbc',
                        outIdx: 10,
                    },
                    sats: 551n,
                },
                {
                    outputScript:
                        '76a914afd2470f264252f1359d7b8093fff4fdd120c5f988ac',
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a9148a8e920239fb5cc647855c1d634b0bbe4c4b670188ac',
                    spentBy: {
                        txid: '9bd869aff043b96ea03274abf6183bcb521c1949177ed948792636c68050283c',
                        outIdx: 71,
                    },
                    sats: 584n,
                },
                {
                    outputScript:
                        '76a91412f84f54fad4695321f61c313d2e32a0a8f8086488ac',
                    sats: 569n,
                },
                {
                    outputScript:
                        '76a914842b152a0bbd4647afaeceec8a6afaa90668e7c788ac',
                    sats: 584n,
                },
                {
                    outputScript:
                        '76a914fe971eb2960defce93503c5641d54eaad2ab6a0588ac',
                    sats: 584n,
                },
                {
                    outputScript:
                        '76a914685e825961b67456f440caaaaab0f94cb3354b7288ac',
                    sats: 584n,
                },
                {
                    outputScript:
                        '76a91476b4447a3617e918d03261353e179a583f85d2c688ac',
                    sats: 584n,
                },
                {
                    outputScript:
                        'a91418bb4f7d8881c1d1457c33a6af8e5937f7f776a887',
                    sats: 584n,
                },
                {
                    outputScript:
                        '76a914b366ef7c1ffd4ef452d72556634720cc8741e1dc88ac',
                    spentBy: {
                        txid: 'bf41ebe360b6990ca60ab9b5fa24d9acde29b07b924d885ccd8d71e9aa1e5dc9',
                        outIdx: 0,
                    },
                    sats: 584n,
                },
                {
                    outputScript:
                        '76a914f5e82dc01170d99a16bf9610da873df47f82aa7a88ac',
                    sats: 553n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '04dfbdc61976ed57e65f2d02e2d55994ae6e963c9baea4f2c4b13c278b6fe981',
                        outIdx: 2,
                    },
                    sats: 569n,
                },
                {
                    outputScript:
                        '76a9142ed681dc5421dd4a052f49bda55a9c345fb025e088ac',
                    sats: 553n,
                },
                {
                    outputScript:
                        '76a914b87d445b2dbba65c5a5bb79959b44c24593518f888ac',
                    sats: 584n,
                },
                {
                    outputScript:
                        'a9147d91dc783fb1c5b7f24befd92eedc8dabfa8ab7e87',
                    sats: 553n,
                },
                {
                    outputScript:
                        'a914f722fc8e23c5c23663aa3273f445b784b223aab587',
                    sats: 584n,
                },
                {
                    outputScript:
                        '76a914940840311cbe6013e59aff729ffc1d902fd74d1988ac',
                    sats: 584n,
                },
                {
                    outputScript:
                        '76a914d394d084607bce97fa4e661b6f2c7d2f237c89ee88ac',
                    sats: 584n,
                },
                {
                    outputScript:
                        '76a91470e1b34c51cd5319c5ca54da978a6422605e6b3e88ac',
                    sats: 558n,
                },
                {
                    outputScript:
                        '76a91440eeb036d9d6bc71cd65b91eb5bbfa5d808805ca88ac',
                    spentBy: {
                        txid: '52fe7794f3aba1b6a7e50e8f65aa46c84b13d4c389e1beaba97fc49d096fe678',
                        outIdx: 4,
                    },
                    sats: 556n,
                },
                {
                    outputScript:
                        '76a9144d55f769ce14fd44e2b63500d95016838a5d130d88ac',
                    sats: 584n,
                },
                {
                    outputScript:
                        '76a914a17ee8562ede98dfe9cd00f7f84d74c4c9c58ee788ac',
                    spentBy: {
                        txid: '12de87fc94b76324b2ef4f8f8cbf22318146097b330904097131b56d386eee22',
                        outIdx: 11,
                    },
                    sats: 584n,
                },
                {
                    outputScript:
                        '76a914a13fc3642d1e7293eb4b9f17ec1b6f6d7ea4aaeb88ac',
                    spentBy: {
                        txid: '68ff340f746736b20d0015d3a63140bbd53dc982ce592e2bd503a7c3c32f88b9',
                        outIdx: 10,
                    },
                    sats: 584n,
                },
                {
                    outputScript:
                        '76a91462e907b15cbf27d5425399ebf6f0fb50ebb88f1888ac',
                    sats: 576n,
                },
                {
                    outputScript:
                        '76a91486a911e65753b379774448230e7e8f7aeab8fa5e88ac',
                    sats: 10427n,
                },
                {
                    outputScript:
                        '76a914e9364c577078f16ee2b27f2c570a4e450dd52e7a88ac',
                    sats: 552n,
                },
                {
                    outputScript:
                        '76a914ed917afa96833c1fea678e23374c557ed83ff6ff88ac',
                    sats: 1428n,
                },
                {
                    outputScript:
                        '76a91482cf48aefcd80072ef21e4a61dee8c2d70d0bcb388ac',
                    sats: 1427n,
                },
                {
                    outputScript:
                        '76a91444e8388bdd64c1f67905279066f044638d0e166988ac',
                    sats: 9135n,
                },
                {
                    outputScript:
                        '76a914d62e68453b75938616b75309c3381d14d61cb9a488ac',
                    sats: 1427n,
                },
                {
                    outputScript:
                        '76a91425b1d2b4610b6deed8e3d2ac76f4f112883126e488ac',
                    sats: 1427n,
                },
                {
                    outputScript:
                        '76a91456423795dc2fa85fa3931cdf9e58f4f8661c2b2488ac',
                    sats: 921n,
                },
                {
                    outputScript:
                        '76a914e03d94e59bb300b965ac234a274b1cf41c3cadd788ac',
                    sats: 1843n,
                },
                {
                    outputScript:
                        '76a9141e0d6a8ef2c8a0f6ceace8656059ea9dbeb11bda88ac',
                    sats: 1584n,
                },
                {
                    outputScript:
                        '76a914f6cd6ef1bd7add314fd9b115c3ad0dce7844930c88ac',
                    sats: 1843n,
                },
                {
                    outputScript:
                        '76a91488fb294f87b0f05bf6eddc1d6bfde2ba3a87bcdd88ac',
                    sats: 560n,
                },
                {
                    outputScript:
                        '76a914a154f00227476ec9741a416e96b69677fddf4b1d88ac',
                    sats: 560n,
                },
                {
                    outputScript:
                        '76a914362a3773f5685c89e4b800e4c4f9925db2ec1b5c88ac',
                    sats: 1427n,
                },
                {
                    outputScript:
                        '76a9146770958588049a3f39828e1ddc57f3dd77227a1188ac',
                    sats: 584n,
                },
                {
                    outputScript:
                        '76a914b0313745d5f7c850c9682c2711b6a14f2db9276b88ac',
                    sats: 1708n,
                },
                {
                    outputScript:
                        '76a914fe729aa40779f822a8c4988f49a115c8aabc0cc788ac',
                    sats: 679n,
                },
                {
                    outputScript:
                        '76a914ecef001f3c137c880f828d843f754a082eb5396b88ac',
                    spentBy: {
                        txid: 'e3ac978ea422497972c1583687806c17c686c2be1986605b36839277d7b36cb8',
                        outIdx: 1,
                    },
                    sats: 1511n,
                },
                {
                    outputScript:
                        '76a91463e79addfc3ad33d04ce064ade02d3c8caca8afd88ac',
                    spentBy: {
                        txid: '2ba8a04167ea13f80aba2b232cdf899fd218c978b54264e5a829f96a3ce1e912',
                        outIdx: 0,
                    },
                    sats: 560n,
                },
                {
                    outputScript:
                        '76a91489a6da1ed86c8967f03691ad9af8d93c6259137388ac',
                    sats: 552n,
                },
                {
                    outputScript:
                        '76a9149fa178360cab170f9423223a5b166171f54d5bc188ac',
                    sats: 919n,
                },
                {
                    outputScript:
                        '76a914bc37eb24817a8442b23ae9a06cc405c8fdf1e7c488ac',
                    sats: 15000n,
                },
                {
                    outputScript:
                        '76a914e78d304632489ba240b29986fe6afd32c77aa16388ac',
                    sats: 560n,
                },
                {
                    outputScript:
                        '76a914993e6beef74f4ed0c3fe51af895e476ce37c362b88ac',
                    spentBy: {
                        txid: '57fcd13171861f19e68068aa6deb759126bef68a6dc0c4969870e54546931999',
                        outIdx: 1,
                    },
                    sats: 570n,
                },
                {
                    outputScript:
                        '76a914b8820ca6b9ceb0f546e142ddd857a4974483719a88ac',
                    spentBy: {
                        txid: '0acb7723b751727996b03323841c37dd03ceb2aba83e75b39af98d0cc6eb9086',
                        outIdx: 1,
                    },
                    sats: 921329n,
                },
                {
                    outputScript:
                        '76a914ca989ff4d3df17fe4dc6eb330b469bd6d5d4814e88ac',
                    sats: 5100n,
                },
                {
                    outputScript:
                        '76a914ad29cdce2237f71e95fee551f04425f70b7e4c9d88ac',
                    spentBy: {
                        txid: '636e0a8685063d5fdb3b9fe9c9795c5ceb25fdbb237aedab4bf346dd8520a2b9',
                        outIdx: 0,
                    },
                    sats: 5200n,
                },
                {
                    outputScript:
                        '76a9140f57872e06e15593c8a288fcb761b13ca571d78888ac',
                    spentBy: {
                        txid: 'dd02287fdadaf1b7377ec0121c00bc44563683c26eed49d31ade52a1abb63bc0',
                        outIdx: 0,
                    },
                    sats: 584n,
                },
                {
                    outputScript:
                        '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                    spentBy: {
                        txid: '978538d26607b5b6371038006c9ad8e2862d935a8375f3a8a68108e8270f7335',
                        outIdx: 2,
                    },
                    sats: 10266n,
                },
                {
                    outputScript:
                        '76a9141e37634e6693e228801c194c45701d49a1d12e2c88ac',
                    sats: 580n,
                },
                {
                    outputScript:
                        '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                    spentBy: {
                        txid: '7242d84b3db853262c53f4b068c57e5a52b67a8b6fea313e0a6f7f58df16e413',
                        outIdx: 0,
                    },
                    sats: 22743016n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 3393,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 759800,
                hash: '00000000000000000f1afd00cb83bd94abb0bec8712e9ed90a2cac1e7a27e84a',
                timestamp: 1664667368,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        parsed: {
            satoshisSent: 569,
            stackArray: [
                '64726f70',
                'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
                '00746162',
                '65766320746f6b656e207365727669636520686f6c64657273206169722064726f70f09fa587f09f8c90f09fa587e29da4f09f918cf09f9bacf09f9bacf09f8d97f09fa4b4',
            ],
            xecTxType: 'Received',
            recipients: [
                'ecash:qqp49ckzgmar3ljh7egymnlk9z32hpwf4qf8m8l9gc',
                'ecash:qp7j4nzkraqhhuext4r9l0tkk7tke566m5phzhkktx',
                'ecash:qpu29ydpjdr3vxjn9ucu462afykv27t9aq4t0vgc3v',
                'ecash:qpuvcexsnsk9tr3v0ud6733lfc4xy3j4nqq3chf5l9',
                'ecash:qpc4xc6q5kknr8ey4epn6l92g36a6606as2zhlv5c3',
                'ecash:qpjfhctcr7tzc485wfeatr33gw0mg54e9y4kuan3jl',
                'ecash:qzlreeyeuv0taqx842lkwwkds4xgj6wacssxeqqpz4',
                'ecash:qr5g7wfc83xjv3qs7vxjk2xd4em4cel23cmmek9thu',
                'ecash:qp0me6v4nnnmwy3exyu2austqy7452qzuc2j22e0nt',
                'ecash:qpg0xh3cv8tqj300e54statzalc562xmzqwuzjntyl',
                'ecash:qzrxakyh8ezy68m9x043skx29p9dtzdury4xkq4azv',
                'ecash:qqyy3mss5vmthgnu0m5sm39pcfq8z799kun7jjcf72',
                'ecash:qzt4pnwah9mts3nxdznnkkxq5xhm6m6dhq77227t0f',
                'ecash:qz8wz5dlputr0nwjux6pa5kdx2cd7z5ny5x4tw2zpk',
                'ecash:qzl8jth497mtckku404cadsylwanm3rfxslzu6ufgg',
                'ecash:qq4djmjx07f4f7rwpsg6el0r2yv55xpaequ4h6axa6',
                'ecash:qzhay3c0yep99uf4n4acpyll7n7azgx9lykz945tm5',
                'ecash:qz9gaysz88a4e3j8s4wp6c6tpwlycjm8qy0t5wv0r6',
                'ecash:qqf0sn65lt2xj5ep7cwrz0fwx2s237qgvsntr84uqt',
                'ecash:qzzzk9f2pw75v3a04m8wezn2l25sv688cuy23pmxch',
                'ecash:qrlfw84jjcx7ln5n2q79vsw4f64d92m2q5z7v4d2da',
                'ecash:qp59aqjevxm8g4h5gr92424sl9xtxd2twgl620v7ph',
                'ecash:qpmtg3r6xct7jxxsxfsn20shnfvrlpwjccn0x53qp0',
                'ecash:pqvtknma3zqur5290se6dtuwtyml0amk4q7apqmnwx',
                'ecash:qzekdmmurl75aazj6uj4vc68yrxgws0pmsgztm4atw',
                'ecash:qr67stwqz9cdnxskh7tppk588h68lq420gvwpush28',
                'ecash:qqhddqwu2ssa6js99aymmf26ns69lvp9uqhgstr4vr',
                'ecash:qzu863zm9ka6vhz6twmejkd5fsj9jdgclqcwvvhlkq',
                'ecash:pp7erhrc87cutdljf0hajthderdtl29t0cckdef6dm',
                'ecash:prmj9lywy0zuydnr4ge88az9k7ztyga2k5zqm3zchg',
                'ecash:qz2qssp3rjlxqyl9ntlh98lurkgzl46dry8x8j7ftm',
                'ecash:qrfef5yyvpaua9l6fenpkmev05hjxlyfac99kea3re',
                'ecash:qpcwrv6v28x4xxw9ef2d49u2vs3xqhnt8c7qtax842',
                'ecash:qpqwavpkm8ttcuwdvku3addmlfwcpzq9egtnc3rwvz',
                'ecash:qpx4tamfec20638zkc6spk2sz6pc5hgnp5yhp72z28',
                'ecash:qzsha6zk9m0f3hlfe5q007zdwnzvn3vwuuzel2lfzv',
                'ecash:qzsnlsmy95089yltfw030mqmdakhaf92avqgmfwnsn',
                'ecash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rquas9fmzn',
                'ecash:qzr2jy0x2afmx7thg3yzxrn73aaw4w86tcv87dlc9m',
                'ecash:qr5nvnzhwpu0zmhzkfljc4c2fezsm4fw0gxf008tgt',
                'ecash:qrkez7h6j6pnc8l2v78zxd6v24lds0lkluen22kx9g',
                'ecash:qzpv7j9wlnvqquh0y8j2v80w3skhp59ukvfejazgkn',
                'ecash:qpzwswytm4jvraneq5neqehsg33c6rskdy0hunmn7m',
                'ecash:qrtzu6z98d6e8pskkafsnsecr52dv89e5sqggy7w5p',
                'ecash:qqjmr545vy9kmmkcu0f2cah57yfgsvfxus3qv9h336',
                'ecash:qptyydu4msh6sharjvwdl8jc7nuxv8ptysp2d46z2p',
                'ecash:qrsrm989nwespwt94s355f6trn6pc09d6uvu4zsdp8',
                'ecash:qq0q665w7ty2pakw4n5x2czea2wmavgmmgz0n7r63a',
                'ecash:qrmv6mh3h4ad6v20mxc3tsadph88s3ynpshjfcac55',
                'ecash:qzy0k220s7c0qklkahwp66lau2ar4paum549mlx7vn',
                'ecash:qzs4fuqzyarkajt5rfqka94kjemlmh6tr5sqsrh0tz',
                'ecash:qqmz5dmn7459ez0yhqqwf38ejfwm9mqmtswnrhjrcl',
                'ecash:qpnhp9v93qzf50ees28pmhzh70whwgn6zyzefhg5vl',
                'ecash:qzcrzd696hmus5xfdqkzwydk598jmwf8dvcneehcza',
                'ecash:qrl89x4yqaulsg4gcjvg7jdpzhy240qvcuwluwhshd',
                'ecash:qrkw7qql8sfhezq0s2xcg0m4fgyzadfedv6jdz8zgs',
                'ecash:qp370xkalsadx0gyecry4hsz60yv4j52l5dcy6vscq',
                'ecash:qzy6dks7mpkgjelsx6g6mxhcmy7xykgnwvm2ka7y4n',
                'ecash:qz06z7pkpj43wru5yv3r5kckv9cl2n2mcyvh00d7l3',
                'ecash:qz7r06eys9aggs4j8t56qmxyqhy0mu08cspyq02pq4',
                'ecash:qrnc6vzxxfyfhgjqk2vcdln2l5evw74pvv9ruy8fga',
                'ecash:qzvnu6lw7a85a5xrleg6lz27gakwxlpk9v55jr2p46',
                'ecash:qzugyr9xh88tpa2xu9pdmkzh5jt5fqm3ngjykg3vgy',
                'ecash:qr9f38l560030ljdcm4nxz6xn0tdt4ypfcxrgleaav',
                'ecash:qzkjnnwwygmlw854lmj4ruzyyhmskljvn52clpf7gl',
                'ecash:qq840pewqms4ty7g52y0edmpky722uwh3qvx936rje',
                'ecash:qq4fd9zdqecq3q4mmxz8v8vunepptukh3czav3gjyt',
                'ecash:qq0rwc6wv6f7y2yqrsv5c3tsr4y6r5fw9squdmajds',
                'ecash:qp36z7k8xt7k4l5xnxeypg5mfqeyvvyduu04m37fwd',
            ],
            appActions: [
                {
                    action: {
                        msg: 'evc token service holders air drop🥇🌐🥇❤👌🛬🛬🍗🤴',
                        tokenId:
                            'bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
                    },
                    isValid: true,
                    app: '🪂Airdrop',
                    lokadId: '64726f70',
                },
            ],
            parsedTokenEntries: [],
            replyAddress: 'ecash:qp36z7k8xt7k4l5xnxeypg5mfqeyvvyduu04m37fwd',
        },
    },
    {
        description: 'On spec airdrop tx no message',
        tx: {
            txid: '298c3d1a5bd00bd86d92d48ec5695c25a0a86093964d9f53eb19b46dc472b9f5',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '1238b76f12c0a4e2c54f5f80951464396f40685256f0ffc3e30a450995e5da43',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100a6886a347a977b31fb3cf4a0b0ef85e58bd60d7af9db27d4d260f71c9b5f22c30220436ceaca789bc8ab631633434eb0b64b93ae6ebeac94d3ddbd12d3916a57fc8441210343b0a63fb80795016f064481f0380836adf7cde6ad32a662ddf551876b303a93',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                    sats: 16194930n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a0464726f7020fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa4cad415454454e54494f4e204752554d50592050454f504c452120f09f98be20596f752063616e206e6f77206465706f736974202447525020746f207468652065546f6b656e20626f7420617420742e6d652f6543617368506c617920746f20746f7020757020796f757220436173696e6f20437265646974732120316d2024475250203d2031204372656469742e20506c617920436173696e6f2067616d657320616e642077696e205845432120',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a9145561e7d054bb4d81d862fdc674525c2dc337ac6d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91417b83cbad4814a5c6400e418ec69f29963a2805888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142e153c4fc63dcabf0e8949b20ddab2c3df7704ed88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9149966d31280b53f1c2b85f975918eb3023b281f8688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914bfd3a8b912a7988809090de56651d47451528ba188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9147ff46e0807b0d3a5797dd65beae6cfcc2d01e56e88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914585ecb807269977bc21a1a2cd5d7c4ff1150e94988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140db07d6b795f5fe5f47e53aab25aac078d229f8188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9143f23e265a57078ac8e675f78bd552a95943ca7e888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a33b3460d43b9e27a165185b2863b1f64d418d8288ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914e006de0508dcbf24ae0455ca3b5665ed0545553c88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9145f1ec6dd2d02c1fa32b184818be5611ae674df0388ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914445c0c740419357dd03c93a351c69eedf433be4688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914eafcfdecd98cde993e3be01a9ad1158fd3eb773988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914023a7087ee9bfabc77548fc5f0a359ae9bacf7bc88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914eded3588169234400f7556a40baf808e1ec8ebf588ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9141a33684209d978e8bc143c6fcdb7f56e3243dcee88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914486cbf0bfba3b7d0aae10bec7f0d4226e6e10f9688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91480c72defab2c99cf19341cc0e2992c659d42198788ac',
                    spentBy: {
                        txid: '46eed31f3d61c5a0a7023c4626c061afc158de9d3855ab304abefd7bb4f7de0d',
                        outIdx: 109,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a15db8a24f9b3740383927a1d787ba77b34b63a888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91423a1340dbbe6dedf1cd31cdf11f85b3442cfd82888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9141e464c8d283976ddc13fa6756736f8f3a0069f7888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914f2d85c4f3fb78c1d9727dea73690c72815756e2b88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914d8723ad3becc44356267e8d0313692c493fe2bdf88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914161cae938ec121bd9970304766865991fe80a63088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91490ec469ca54ce9616282dea980a39f0e4b9a6ab988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b386b1f59b5f03b45471df214d47f7ab5d48003088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914d2ea9ba1a091c2adf0116da4d2c3ddc3cf7124a988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91451379ab611287658c9e1c0f98f0929addd5a2f1d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91432fc3341b83f902a360cbbf91a08ea99c293733d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91459f93839ba24abd6996b75a39486691dd40660be88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91473ef17c5b9f551eae3f3b4fadf61f93cae5e6aea88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91469003998c2c32ac81951b88416a9a15df3a1992988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9145dd0411fa601ab82fcd68894c95934619a49920688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914534c4407eeea7e4b8c3ed7dae5cb4a2539beed9988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91447f86f44721c8d0bac263602717fc10b0da49b9f88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91485149cd55457401ad4645c54b86caa0ce0d4f05f88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914f0af3a1411ed4989bf5c44641c3a86d473afe45188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914973d953e15d62383b24ebe3d73d01e7b83bd989788ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914dadf34cde9c774fdd6340cd2916a9b9c5d57cf4388ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9144de2fb39f09d14492f4d40e0fb670a42af505c6b88ac',
                    spentBy: {
                        txid: '11a58a92afc39a6d7bd413a11864d0d34f21ab72b63028293d1004ff76e74950',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914fd7f54f496cadb0b6d3cc206ee098bab29bd5bbf88ac',
                    spentBy: {
                        txid: '51518eb20ca45eaa07925e6d502da8b5be5ad411272863be9a2280e46d6505f7',
                        outIdx: 11,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b55d27e509500af85243622343ca9e3d54a0438a88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914547abbaaa1c5e92ecde551c1bfdb9a2e5454b83088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140f69a9314698156aee8bdb96a36f1e08f1ba168d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91468506abb4ce69c0e596c80bebe456f3be7f904fd88ac',
                    spentBy: {
                        txid: '39ef9f76d052d4b3fa5f4aa19b5597b1b55ab71e361c665eef371a501a1282be',
                        outIdx: 9,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91447ab6772a47d55b7649b83f105fd5cdc3eaa22a988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b74cc1418fad22fe0eb0bef57082d9836a29340c88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914e33f7fa6b1c03d68a28758c1ef3a5fa7322cafbb88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a30153ad73ba57b6f37c210435e407bb7a368a5d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9141404dc7b54ab7768837729e2efe052105a4c405988ac',
                    spentBy: {
                        txid: '6ab45eb0770ca387bcd76e3ffc0439958dc2bb7b87437234c722a3c615ca2071',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91496cdae0c820426ae831216d629383dda7ee5adab88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91412c4c82aac6896d96ede38eb916b5819a46c803a88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9147bdf4e819215ccfe937a633ae28ae2e9d3aadc0688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9146e2b68c87b86ed79b86a09c62c4762d7e431bcca88ac',
                    spentBy: {
                        txid: 'c95c7f6f4baa7d91fd3aa24f9b73b4e04ef840ac970ae82e2d386f81eeec2cf0',
                        outIdx: 22,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914e7a5f062e50a35d639fc1773738839119e61475d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a34960963da7e02e1f0357325985475bda969def88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9149d8689dc0813da4f520225eebb8b80c8352ec4a588ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914bd4cdb9bc9dbe21e2b9bdd3395be350d8abbe16d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142d755595516b0f625c51d223bc84a5adfc77b20688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914dd01dbc55b0fe9e33ceb700b4c4452010bdb5a1688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140839c285a8d5b52934c28d4a45a1835dd45f0a5388ac',
                    spentBy: {
                        txid: 'cd68979654b1ecee37a33c321b6cb7f2966be6af02232855f46c2aef231463cb',
                        outIdx: 1,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9143dd8ebcdf0e4d65712a723f2235675316687716388ac',
                    spentBy: {
                        txid: 'f8123bf1175047b9d5ebd5d7cacbb378aaa8f58a55ed400893f192f28606a0d3',
                        outIdx: 3,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914974a7bb26ac2f62bf60a675f5f0024a689c03d7d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                    spentBy: {
                        txid: '27f2d0454f78b90be92eea7d557486ebc07d7ea1004fa7dbc0e7f89e835a4c6e',
                        outIdx: 3,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914dceb306a73582e52c43025f7eed5827a6d9e92e088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914f93029e7593327c5b864ea6896ecfda4fffb6ab888ac',
                    spentBy: {
                        txid: 'c62c16c68df7d69d5d1524ac250e30473dacdbf13c131fb1978911674f045665',
                        outIdx: 17,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140620a7df2e0637bc8d3dfa663c979c15a671dfe488ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9147847fe7070bec8567b3e810f543f2f80cc3e03be88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914837604effd470faaba3e044e0a7c4e6a8a7ee8c688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142def2114338f0be9a26956378efce60e17b580b388ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91482b15f681a94fe9f6ac29ddee214d3dd88f55bfc88ac',
                    spentBy: {
                        txid: '920853c238299614bc03270839f1b815c9763385485e04be18a861039c07b606',
                        outIdx: 14,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91478f43ee6b1e577329c0fc9cb47f7435954eae81f88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914c1a7d12dddc6a3072df09cf5e0a00ece198cc8c188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914bccecb7e3e5d3fccbee3211494ad3214f91cc74f88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914fbc9461beec0d783052c20c994ffb44e46041d5188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a94b8176d28cb5b5c301f10bb45bdb3d6e0c277d88ac',
                    spentBy: {
                        txid: 'b2c0183a724aa141568e9c116b684eb94e8be326c92cf588d83296916974017f',
                        outIdx: 1,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914993e6beef74f4ed0c3fe51af895e476ce37c362b88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142ec5281864fc989dab543b054631c9703809689e88ac',
                    spentBy: {
                        txid: '962f5149fbca6c739886cb839901b0de5926119430ce268b7aa1be0c073ad84c',
                        outIdx: 6,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914581bd5bc835cc788bd90a4f6f0c9c21eb173572e88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91428cabb69be3e20707574d7a0ddc65a801b6ae59988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b8b3c22d82784c27e0224fd8a8ff549a67e955a388ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b8af3f36894ee7e6563c672714f9eb47cc83a9e188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914fa49f98fb25e8b84ce210d06f052aed88c2c4f9888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9146134463df4436bf8c662b64917610f63fa5d89ef88ac',
                    spentBy: {
                        txid: 'd8a9729473589d3c30d26e672c2c49e1a58fc380765ddbcde8628ab93293af11',
                        outIdx: 3,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '3c844ed9f76207027a47dd2170a590a1f8d8a8ff9b797da4f050ad6394adf52a',
                        outIdx: 1,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b3f80c88220f138201702a4d0c033b248059fcdc88ac',
                    spentBy: {
                        txid: '7d5cf7814e3225587e522e03da0589b806de0498a779e8b0d1cb273c9f257b87',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914ad7eb2c8b88fa2e3f5158b398a49bf277401984e88ac',
                    spentBy: {
                        txid: '50974e99e87dec3b575497b9592a89d9ae0f2dc129f26d567582e4d0aaf27741',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9146b475c3b68ff8411e5c43271edc4e4f26dfc802a88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914ee8cbaa5642d1c5d1af1503edda6a55044e8106e88ac',
                    spentBy: {
                        txid: 'ca0229e4287f534526e811545e43c01bc011d2451acebd18aacbb74fe8d055ea',
                        outIdx: 2,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9147e3f074aae3cc99a6f48b928008eb9458615b6a988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140816fa82ce5021871afb6fbdc9470714fbf7c7ed88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91412e01685eea02225ae3d3d528b184ae0db52314388ac',
                    spentBy: {
                        txid: 'fc4013c0a37cde3de2238f61c5212a7d115382aae5e0cb28b80c1d935e9233f5',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                    spentBy: {
                        txid: '96f072b8db666b8eb59c0f43373b65c50fd5ac5042ea1e7d822161b45c2219a1',
                        outIdx: 0,
                    },
                    sats: 15987628n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1711102052,
            size: 3645,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 836935,
                hash: '000000000000000008e74d35ca49974c15ca67e1209fa7e23bea15450dd64336',
                timestamp: 1711102691,
            },
        },
        walletHashes: ['2a96944d06700882bbd984761d9c9e4215f2d78e'],
        parsed: {
            appActions: [
                {
                    action: {
                        msg: 'ATTENTION GRUMPY PEOPLE! 😾 You can now deposit $GRP to the eToken bot at t.me/eCashPlay to top up your Casino Credits! 1m $GRP = 1 Credit. Play Casino games and win XEC! ',
                        tokenId:
                            'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                    },
                    isValid: true,
                    app: '🪂Airdrop',
                    lokadId: '64726f70',
                },
            ],
            parsedTokenEntries: [],
            recipients: [
                'ecash:qp2kre7s2ja5mqwcvt7uvazjtskuxdavd5e5vrcxel',
                'ecash:qqtms0966jq55hryqrjp3mrf72vk8g5qtqpwysa6na',
                'ecash:qqhp20z0cc7u40cw39ymyrw6ktpa7acya55l0hgyrd',
                'ecash:qzvkd5cjsz6n78ptshuhtyvwkvprk2qlsc4yrkjum8',
                'ecash:qzla829ez2ne3zqfpyx72ej36369z55t5y75969dkn',
                'ecash:qpllgmsgq7cd8fte0ht9h6hxelxz6q09dcpuhyzzr9',
                'ecash:qpv9ajuqwf5ew77zrgdze4whcnl3z58ffyulr5hxmz',
                'ecash:qqxmqltt0904le050ef64vj64src6g5lsy9t0vws7c',
                'ecash:qqlj8cn954c83tywva0h3024922eg098aq90dtfspf',
                'ecash:qz3nkdrq6saeufapv5v9k2rrk8my6svdsg9wj4s4hl',
                'ecash:qrsqdhs9prwt7f9wq32u5w6kvhks23248sz7x0vz03',
                'ecash:qp03a3ka95pvr73jkxzgrzl9vydwvaxlqv4nuyqll2',
                'ecash:qpz9crr5qsvn2lws8jf6x5wxnmklgva7gcx4qsn5sw',
                'ecash:qr40el0vmxxdaxf780sp4xk3zk8a86mh8ypwtuycl9',
                'ecash:qqpr5uy8a6dl40rh2j8utu9rtxhfht8hhstayxwwfm',
                'ecash:qrk76dvgz6frgsq0w4t2gza0sz8paj8t75yz9dg9aa',
                'ecash:qqdrx6zzp8vh369uzs7xlndh74hrys7uachl0rwq7d',
                'ecash:qpyxe0ctlw3m0592uy97clcdggnwdcg0jctx6mfrz4',
                'ecash:qzqvwt004vkfnncexswvpc5e93je6ssesuzzjzad2z',
                'ecash:qzs4mw9zf7dnwspc8yn6r4u8hfmmxjmr4qa2pvqwvr',
                'ecash:qq36zdqdh0ndahcu6vwd7y0ctv6y9n7c9qwg9xyccn',
                'ecash:qq0yvnyd9quhdhwp87n82eeklre6qp5l0qcy78a7x6',
                'ecash:qredshz087mcc8vhyl02wd5scu5p2atw9vxhhp6t7d',
                'ecash:qrv8ywknhmxygdtzvl5dqvfkjtzf8l3tmukugtcl6d',
                'ecash:qqtpet5n3mqjr0vewqcywe5xtxglaq9xxqukk4u9q0',
                'ecash:qzgwc35u54xwjctzst02nq9rnu8yhxn2hyu2mn9e97',
                'ecash:qzecdv04nd0s8dz5w80jzn2877446jqqxq8d2rppc4',
                'ecash:qrfw4xap5zgu9t0sz9k6f5krmhpu7ufy4ynpmajugh',
                'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed',
                'ecash:qpgn0x4kzy58vkxfu8q0nrcf9xka6k30r534m2j2ca',
                'ecash:qqe0cv6phqleq23kpjaljxsga2vu9ymn85q3uuvpdu',
                'ecash:qpvljwpehgj2h45edd6689yxdywagpnqhcd5fngx3n',
                'ecash:qpe77979h864r6hr7w604hmply72uhn2agr5z20769',
                'ecash:qp5sqwvcctpj4jqe2xugg94f59wl8gve9yvt7h4vj0',
                'ecash:qpwaqsgl5cq6hqhu66yffj2ex3se5jvjqcmn6tp9gn',
                'ecash:qpf5c3q8am48ujuv8mta4ewtfgjnn0hdnyx7nqk7y8',
                'ecash:qprlsm6ywgwg6zavycmqyutlcy9smfymnupv08w52e',
                'ecash:qzz3f8x423t5qxk5v3w9fwrv4gxwp48stu7zk0lhxv',
                'ecash:qrc27ws5z8k5nzdlt3zxg8p6sm288tly2y3m6nwxww',
                'ecash:qztnm9f7zhtz8qajf6lr6u7sreac80vcju4tk6j75z',
                'ecash:qrdd7dxda8rhflwkxsxd9yt2nww96470gv48s4f9j0',
                'ecash:qpx797ee7zw3gjf0f4qwp7m8pfp275zudvk3ym56ad',
                'ecash:qr7h7485jm9dkzmd8npqdmsf3w4jn02mhu7n4g6whr',
                'ecash:qz646fl9p9gq47zjgd3zxs72nc74fgzr3gw9u8p7tc',
                'ecash:qp284wa258z7jtkdu4gur07mngh9g49cxqxs2pmdgc',
                'ecash:qq8kn2f3g6vp26hw30dedgm0rcy0rwsk35ln6cazck',
                'ecash:qp59q64mfnnfcrjedjqta0j9dua707gyl5q5p2a5py',
                'ecash:qpr6kemj5374tdmynwplzp0atnwra23z4y7mt4d46q',
                'ecash:qp36z7k8xt7k4l5xnxeypg5mfqeyvvyduu04m37fwd',
                'ecash:qzm5es2p37kj9lswkzl02uyzmxpk52f5psl90kzl6t',
                'ecash:qr3n7laxk8qr669zsavvrme6t7nnyt90hvy5esczyf',
                'ecash:qz3sz5adwwa90dhn0sssgd0yq7ah5d52t56s78jsfa',
                'ecash:qq2qfhrm2j4hw6yrwu579mlq2gg95nzqty3fpaxcpk',
                'ecash:qztvmtsvsgzzdt5rzgtdv2fc8hd8aedd4v8rxttrt0',
                'ecash:qqfvfjp2435fdktwmcuwhytttqv6gmyq8gq4a6tsj2',
                'ecash:qpaa7n5pjg2uel5n0f3n4c52ut5a82kuqcunkfhuhj',
                'ecash:qphzk6xg0wrw67dcdgyuvtz8vtt7gvduegnh0l7gcn',
                'ecash:qrn6turzu59rt43elsthxuug8ygeuc28t5ux5hqnl0',
                'ecash:qz35jcyk8kn7qtslqdtnykv9gada495aauxyeljy8s',
                'ecash:qzwcdzwupqfa5n6jqgj7awutsryr2tky553a8ddw9p',
                'ecash:qz75ekume8d7y83tn0wn89d7x5xc4wlpd5wkjutg7a',
                'ecash:qqkh24v4294s7cju28fz80yy5kklcaajqcajx2tv7k',
                'ecash:qrwsrk79tv87nceuadcqknzy2gqshk66zchyqqakmd',
                'ecash:qqyrns594r2m22f5c2x553dpsdwaghc22vkfgfhqn5',
                'ecash:qq7a367d7rjdv4cj5u3lyg6kw5ckdpm3vv8hkvlk26',
                'ecash:qzt557ajdtp0v2lkpfn47hcqyjngnspa055p5p0k3e',
                'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv',
                'ecash:qrwwkvr2wdvzu5kyxqjl0mk4sfaxm85juq4wa28f2e',
                'ecash:qrunq208tyej03dcvn4x39hvlkj0l7m2hqz0s0zjys',
                'ecash:qqrzpf7l9crr00yd8haxv0yhns26vuwluszxw5x0wv',
                'ecash:qpuy0lnswzlvs4nm86qs74pl97qvc0srhc665724p7',
                'ecash:qzphvp80l4rsl2468czyuznufe4g5lhgccw7fd7qw6',
                'ecash:qqk77gg5xw8sh6dzd9tr0rhuuc8p0dvqkvvp76ut5u',
                'ecash:qzptzhmgr220a8m2c2waacs560wc3a2mlsxt0wkmsc',
                'ecash:qpu0g0hxk8jhwv5uplyuk3lhgdv4f6hgrusukd6cwl',
                'ecash:qrq605fdmhr2xped7zw0tc9qpm8pnrxgcyrwkrjedn',
                'ecash:qz7vajm78ewnln97uvs3f99dxg20j8x8fu2a6jt5fk',
                'ecash:qrauj3smamqd0qc99ssvn98lk38yvpqa2y8stcekhf',
                'ecash:qz55hqtk62xttdwrq8cshdzmmv7kurp80580x8h5zl',
                'ecash:qzvnu6lw7a85a5xrleg6lz27gakwxlpk9v55jr2p46',
                'ecash:qqhv22qcvn7f38dt2sas2333e9crsztgncmtgdrcm2',
                'ecash:qpvph4dusdwv0z9ajzj0duxfcg0tzu6h9cyaag2pwn',
                'ecash:qq5v4wmfhclzqur4wnt6phwxt2qpk6h9nyesy04fn0',
                'ecash:qzut8s3dsfuycflqyf8a328l2jdx06245vra9q3458',
                'ecash:qzu270ek398w0ejk83njw98eadrueqafuy098ueasq',
                'ecash:qrayn7v0kf0ghpxwyyxsduzj4mvgctz0nqysm47axp',
                'ecash:qpsng33a73pkh7xxv2myj9mppa3l5hvfaunm762526',
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                'ecash:qzelsrygyg838qspwq4y6rqr8vjgqk0umsa2rsz35w',
                'ecash:qzkhavkghz869cl4zk9nnzjfhunhgqvcfce9c7mvdc',
                'ecash:qp45whpmdrlcgy09cse8rmwyunexmlyq9gaduqlm6p',
                'ecash:qrhgew49vsk3chg679grahdx54gyf6qsdcurky8xms',
                'ecash:qplr7p624c7vnxn0fzujsqywh9zcv9dk4ytfcrvql0',
                'ecash:qqypd75zeegzrpc6ldhmmj28qu20ha78a57269a645',
                'ecash:qqfwq959a6szyfdw85749zccftsdk533gv3lc4mfrp',
            ],
            satoshisSent: 199975,
            stackArray: [
                '64726f70',
                'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
                '415454454e54494f4e204752554d50592050454f504c452120f09f98be20596f752063616e206e6f77206465706f736974202447525020746f207468652065546f6b656e20626f7420617420742e6d652f6543617368506c617920746f20746f7020757020796f757220436173696e6f20437265646974732120316d2024475250203d2031204372656469742e20506c617920436173696e6f2067616d657320616e642077696e205845432120',
            ],
            xecTxType: 'Sent',
        },
    },
    {
        description: 'Off spec airdrop tx',
        tx: {
            txid: '298c3d1a5bd00bd86d92d48ec5695c25a0a86093964d9f53eb19b46dc472b9f5',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '1238b76f12c0a4e2c54f5f80951464396f40685256f0ffc3e30a450995e5da43',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100a6886a347a977b31fb3cf4a0b0ef85e58bd60d7af9db27d4d260f71c9b5f22c30220436ceaca789bc8ab631633434eb0b64b93ae6ebeac94d3ddbd12d3916a57fc8441210343b0a63fb80795016f064481f0380836adf7cde6ad32a662ddf551876b303a93',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                    sats: 16194930n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a0464726f701ffb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a9145561e7d054bb4d81d862fdc674525c2dc337ac6d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91417b83cbad4814a5c6400e418ec69f29963a2805888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142e153c4fc63dcabf0e8949b20ddab2c3df7704ed88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9149966d31280b53f1c2b85f975918eb3023b281f8688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914bfd3a8b912a7988809090de56651d47451528ba188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9147ff46e0807b0d3a5797dd65beae6cfcc2d01e56e88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914585ecb807269977bc21a1a2cd5d7c4ff1150e94988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140db07d6b795f5fe5f47e53aab25aac078d229f8188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9143f23e265a57078ac8e675f78bd552a95943ca7e888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a33b3460d43b9e27a165185b2863b1f64d418d8288ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914e006de0508dcbf24ae0455ca3b5665ed0545553c88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9145f1ec6dd2d02c1fa32b184818be5611ae674df0388ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914445c0c740419357dd03c93a351c69eedf433be4688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914eafcfdecd98cde993e3be01a9ad1158fd3eb773988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914023a7087ee9bfabc77548fc5f0a359ae9bacf7bc88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914eded3588169234400f7556a40baf808e1ec8ebf588ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9141a33684209d978e8bc143c6fcdb7f56e3243dcee88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914486cbf0bfba3b7d0aae10bec7f0d4226e6e10f9688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91480c72defab2c99cf19341cc0e2992c659d42198788ac',
                    spentBy: {
                        txid: '46eed31f3d61c5a0a7023c4626c061afc158de9d3855ab304abefd7bb4f7de0d',
                        outIdx: 109,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a15db8a24f9b3740383927a1d787ba77b34b63a888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91423a1340dbbe6dedf1cd31cdf11f85b3442cfd82888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9141e464c8d283976ddc13fa6756736f8f3a0069f7888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914f2d85c4f3fb78c1d9727dea73690c72815756e2b88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914d8723ad3becc44356267e8d0313692c493fe2bdf88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914161cae938ec121bd9970304766865991fe80a63088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91490ec469ca54ce9616282dea980a39f0e4b9a6ab988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b386b1f59b5f03b45471df214d47f7ab5d48003088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914d2ea9ba1a091c2adf0116da4d2c3ddc3cf7124a988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9149846b6b38ff713334ac19fe3cf851a1f98c07b0088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91451379ab611287658c9e1c0f98f0929addd5a2f1d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91432fc3341b83f902a360cbbf91a08ea99c293733d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91459f93839ba24abd6996b75a39486691dd40660be88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91473ef17c5b9f551eae3f3b4fadf61f93cae5e6aea88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91469003998c2c32ac81951b88416a9a15df3a1992988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9145dd0411fa601ab82fcd68894c95934619a49920688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914534c4407eeea7e4b8c3ed7dae5cb4a2539beed9988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91447f86f44721c8d0bac263602717fc10b0da49b9f88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91485149cd55457401ad4645c54b86caa0ce0d4f05f88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914f0af3a1411ed4989bf5c44641c3a86d473afe45188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914973d953e15d62383b24ebe3d73d01e7b83bd989788ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914dadf34cde9c774fdd6340cd2916a9b9c5d57cf4388ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9144de2fb39f09d14492f4d40e0fb670a42af505c6b88ac',
                    spentBy: {
                        txid: '11a58a92afc39a6d7bd413a11864d0d34f21ab72b63028293d1004ff76e74950',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914fd7f54f496cadb0b6d3cc206ee098bab29bd5bbf88ac',
                    spentBy: {
                        txid: '51518eb20ca45eaa07925e6d502da8b5be5ad411272863be9a2280e46d6505f7',
                        outIdx: 11,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b55d27e509500af85243622343ca9e3d54a0438a88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914547abbaaa1c5e92ecde551c1bfdb9a2e5454b83088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140f69a9314698156aee8bdb96a36f1e08f1ba168d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91468506abb4ce69c0e596c80bebe456f3be7f904fd88ac',
                    spentBy: {
                        txid: '39ef9f76d052d4b3fa5f4aa19b5597b1b55ab71e361c665eef371a501a1282be',
                        outIdx: 9,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91447ab6772a47d55b7649b83f105fd5cdc3eaa22a988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91463a17ac732fd6afe8699b240a29b483246308de788ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b74cc1418fad22fe0eb0bef57082d9836a29340c88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914e33f7fa6b1c03d68a28758c1ef3a5fa7322cafbb88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a30153ad73ba57b6f37c210435e407bb7a368a5d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9141404dc7b54ab7768837729e2efe052105a4c405988ac',
                    spentBy: {
                        txid: '6ab45eb0770ca387bcd76e3ffc0439958dc2bb7b87437234c722a3c615ca2071',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91496cdae0c820426ae831216d629383dda7ee5adab88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91412c4c82aac6896d96ede38eb916b5819a46c803a88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9147bdf4e819215ccfe937a633ae28ae2e9d3aadc0688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9146e2b68c87b86ed79b86a09c62c4762d7e431bcca88ac',
                    spentBy: {
                        txid: 'c95c7f6f4baa7d91fd3aa24f9b73b4e04ef840ac970ae82e2d386f81eeec2cf0',
                        outIdx: 22,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914e7a5f062e50a35d639fc1773738839119e61475d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a34960963da7e02e1f0357325985475bda969def88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9149d8689dc0813da4f520225eebb8b80c8352ec4a588ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914bd4cdb9bc9dbe21e2b9bdd3395be350d8abbe16d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142d755595516b0f625c51d223bc84a5adfc77b20688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914dd01dbc55b0fe9e33ceb700b4c4452010bdb5a1688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140839c285a8d5b52934c28d4a45a1835dd45f0a5388ac',
                    spentBy: {
                        txid: 'cd68979654b1ecee37a33c321b6cb7f2966be6af02232855f46c2aef231463cb',
                        outIdx: 1,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9143dd8ebcdf0e4d65712a723f2235675316687716388ac',
                    spentBy: {
                        txid: 'f8123bf1175047b9d5ebd5d7cacbb378aaa8f58a55ed400893f192f28606a0d3',
                        outIdx: 3,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914974a7bb26ac2f62bf60a675f5f0024a689c03d7d88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
                    spentBy: {
                        txid: '27f2d0454f78b90be92eea7d557486ebc07d7ea1004fa7dbc0e7f89e835a4c6e',
                        outIdx: 3,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914dceb306a73582e52c43025f7eed5827a6d9e92e088ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914f93029e7593327c5b864ea6896ecfda4fffb6ab888ac',
                    spentBy: {
                        txid: 'c62c16c68df7d69d5d1524ac250e30473dacdbf13c131fb1978911674f045665',
                        outIdx: 17,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140620a7df2e0637bc8d3dfa663c979c15a671dfe488ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9147847fe7070bec8567b3e810f543f2f80cc3e03be88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914837604effd470faaba3e044e0a7c4e6a8a7ee8c688ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142def2114338f0be9a26956378efce60e17b580b388ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91482b15f681a94fe9f6ac29ddee214d3dd88f55bfc88ac',
                    spentBy: {
                        txid: '920853c238299614bc03270839f1b815c9763385485e04be18a861039c07b606',
                        outIdx: 14,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91478f43ee6b1e577329c0fc9cb47f7435954eae81f88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914c1a7d12dddc6a3072df09cf5e0a00ece198cc8c188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914bccecb7e3e5d3fccbee3211494ad3214f91cc74f88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914fbc9461beec0d783052c20c994ffb44e46041d5188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914a94b8176d28cb5b5c301f10bb45bdb3d6e0c277d88ac',
                    spentBy: {
                        txid: 'b2c0183a724aa141568e9c116b684eb94e8be326c92cf588d83296916974017f',
                        outIdx: 1,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914993e6beef74f4ed0c3fe51af895e476ce37c362b88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142ec5281864fc989dab543b054631c9703809689e88ac',
                    spentBy: {
                        txid: '962f5149fbca6c739886cb839901b0de5926119430ce268b7aa1be0c073ad84c',
                        outIdx: 6,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914581bd5bc835cc788bd90a4f6f0c9c21eb173572e88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91428cabb69be3e20707574d7a0ddc65a801b6ae59988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b8b3c22d82784c27e0224fd8a8ff549a67e955a388ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b8af3f36894ee7e6563c672714f9eb47cc83a9e188ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914fa49f98fb25e8b84ce210d06f052aed88c2c4f9888ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9146134463df4436bf8c662b64917610f63fa5d89ef88ac',
                    spentBy: {
                        txid: 'd8a9729473589d3c30d26e672c2c49e1a58fc380765ddbcde8628ab93293af11',
                        outIdx: 3,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '3c844ed9f76207027a47dd2170a590a1f8d8a8ff9b797da4f050ad6394adf52a',
                        outIdx: 1,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914b3f80c88220f138201702a4d0c033b248059fcdc88ac',
                    spentBy: {
                        txid: '7d5cf7814e3225587e522e03da0589b806de0498a779e8b0d1cb273c9f257b87',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914ad7eb2c8b88fa2e3f5158b398a49bf277401984e88ac',
                    spentBy: {
                        txid: '50974e99e87dec3b575497b9592a89d9ae0f2dc129f26d567582e4d0aaf27741',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9146b475c3b68ff8411e5c43271edc4e4f26dfc802a88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a914ee8cbaa5642d1c5d1af1503edda6a55044e8106e88ac',
                    spentBy: {
                        txid: 'ca0229e4287f534526e811545e43c01bc011d2451acebd18aacbb74fe8d055ea',
                        outIdx: 2,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9147e3f074aae3cc99a6f48b928008eb9458615b6a988ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9140816fa82ce5021871afb6fbdc9470714fbf7c7ed88ac',
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a91412e01685eea02225ae3d3d528b184ae0db52314388ac',
                    spentBy: {
                        txid: 'fc4013c0a37cde3de2238f61c5212a7d115382aae5e0cb28b80c1d935e9233f5',
                        outIdx: 0,
                    },
                    sats: 2105n,
                },
                {
                    outputScript:
                        '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                    spentBy: {
                        txid: '96f072b8db666b8eb59c0f43373b65c50fd5ac5042ea1e7d822161b45c2219a1',
                        outIdx: 0,
                    },
                    sats: 15987628n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1711102052,
            size: 3645,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 836935,
                hash: '000000000000000008e74d35ca49974c15ca67e1209fa7e23bea15450dd64336',
                timestamp: 1711102691,
            },
        },
        walletHashes: ['2a96944d06700882bbd984761d9c9e4215f2d78e'],
        parsed: {
            appActions: [
                {
                    app: '🪂Airdrop',
                    isValid: false,
                    lokadId: '64726f70',
                },
            ],
            parsedTokenEntries: [],
            recipients: [
                'ecash:qp2kre7s2ja5mqwcvt7uvazjtskuxdavd5e5vrcxel',
                'ecash:qqtms0966jq55hryqrjp3mrf72vk8g5qtqpwysa6na',
                'ecash:qqhp20z0cc7u40cw39ymyrw6ktpa7acya55l0hgyrd',
                'ecash:qzvkd5cjsz6n78ptshuhtyvwkvprk2qlsc4yrkjum8',
                'ecash:qzla829ez2ne3zqfpyx72ej36369z55t5y75969dkn',
                'ecash:qpllgmsgq7cd8fte0ht9h6hxelxz6q09dcpuhyzzr9',
                'ecash:qpv9ajuqwf5ew77zrgdze4whcnl3z58ffyulr5hxmz',
                'ecash:qqxmqltt0904le050ef64vj64src6g5lsy9t0vws7c',
                'ecash:qqlj8cn954c83tywva0h3024922eg098aq90dtfspf',
                'ecash:qz3nkdrq6saeufapv5v9k2rrk8my6svdsg9wj4s4hl',
                'ecash:qrsqdhs9prwt7f9wq32u5w6kvhks23248sz7x0vz03',
                'ecash:qp03a3ka95pvr73jkxzgrzl9vydwvaxlqv4nuyqll2',
                'ecash:qpz9crr5qsvn2lws8jf6x5wxnmklgva7gcx4qsn5sw',
                'ecash:qr40el0vmxxdaxf780sp4xk3zk8a86mh8ypwtuycl9',
                'ecash:qqpr5uy8a6dl40rh2j8utu9rtxhfht8hhstayxwwfm',
                'ecash:qrk76dvgz6frgsq0w4t2gza0sz8paj8t75yz9dg9aa',
                'ecash:qqdrx6zzp8vh369uzs7xlndh74hrys7uachl0rwq7d',
                'ecash:qpyxe0ctlw3m0592uy97clcdggnwdcg0jctx6mfrz4',
                'ecash:qzqvwt004vkfnncexswvpc5e93je6ssesuzzjzad2z',
                'ecash:qzs4mw9zf7dnwspc8yn6r4u8hfmmxjmr4qa2pvqwvr',
                'ecash:qq36zdqdh0ndahcu6vwd7y0ctv6y9n7c9qwg9xyccn',
                'ecash:qq0yvnyd9quhdhwp87n82eeklre6qp5l0qcy78a7x6',
                'ecash:qredshz087mcc8vhyl02wd5scu5p2atw9vxhhp6t7d',
                'ecash:qrv8ywknhmxygdtzvl5dqvfkjtzf8l3tmukugtcl6d',
                'ecash:qqtpet5n3mqjr0vewqcywe5xtxglaq9xxqukk4u9q0',
                'ecash:qzgwc35u54xwjctzst02nq9rnu8yhxn2hyu2mn9e97',
                'ecash:qzecdv04nd0s8dz5w80jzn2877446jqqxq8d2rppc4',
                'ecash:qrfw4xap5zgu9t0sz9k6f5krmhpu7ufy4ynpmajugh',
                'ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed',
                'ecash:qpgn0x4kzy58vkxfu8q0nrcf9xka6k30r534m2j2ca',
                'ecash:qqe0cv6phqleq23kpjaljxsga2vu9ymn85q3uuvpdu',
                'ecash:qpvljwpehgj2h45edd6689yxdywagpnqhcd5fngx3n',
                'ecash:qpe77979h864r6hr7w604hmply72uhn2agr5z20769',
                'ecash:qp5sqwvcctpj4jqe2xugg94f59wl8gve9yvt7h4vj0',
                'ecash:qpwaqsgl5cq6hqhu66yffj2ex3se5jvjqcmn6tp9gn',
                'ecash:qpf5c3q8am48ujuv8mta4ewtfgjnn0hdnyx7nqk7y8',
                'ecash:qprlsm6ywgwg6zavycmqyutlcy9smfymnupv08w52e',
                'ecash:qzz3f8x423t5qxk5v3w9fwrv4gxwp48stu7zk0lhxv',
                'ecash:qrc27ws5z8k5nzdlt3zxg8p6sm288tly2y3m6nwxww',
                'ecash:qztnm9f7zhtz8qajf6lr6u7sreac80vcju4tk6j75z',
                'ecash:qrdd7dxda8rhflwkxsxd9yt2nww96470gv48s4f9j0',
                'ecash:qpx797ee7zw3gjf0f4qwp7m8pfp275zudvk3ym56ad',
                'ecash:qr7h7485jm9dkzmd8npqdmsf3w4jn02mhu7n4g6whr',
                'ecash:qz646fl9p9gq47zjgd3zxs72nc74fgzr3gw9u8p7tc',
                'ecash:qp284wa258z7jtkdu4gur07mngh9g49cxqxs2pmdgc',
                'ecash:qq8kn2f3g6vp26hw30dedgm0rcy0rwsk35ln6cazck',
                'ecash:qp59q64mfnnfcrjedjqta0j9dua707gyl5q5p2a5py',
                'ecash:qpr6kemj5374tdmynwplzp0atnwra23z4y7mt4d46q',
                'ecash:qp36z7k8xt7k4l5xnxeypg5mfqeyvvyduu04m37fwd',
                'ecash:qzm5es2p37kj9lswkzl02uyzmxpk52f5psl90kzl6t',
                'ecash:qr3n7laxk8qr669zsavvrme6t7nnyt90hvy5esczyf',
                'ecash:qz3sz5adwwa90dhn0sssgd0yq7ah5d52t56s78jsfa',
                'ecash:qq2qfhrm2j4hw6yrwu579mlq2gg95nzqty3fpaxcpk',
                'ecash:qztvmtsvsgzzdt5rzgtdv2fc8hd8aedd4v8rxttrt0',
                'ecash:qqfvfjp2435fdktwmcuwhytttqv6gmyq8gq4a6tsj2',
                'ecash:qpaa7n5pjg2uel5n0f3n4c52ut5a82kuqcunkfhuhj',
                'ecash:qphzk6xg0wrw67dcdgyuvtz8vtt7gvduegnh0l7gcn',
                'ecash:qrn6turzu59rt43elsthxuug8ygeuc28t5ux5hqnl0',
                'ecash:qz35jcyk8kn7qtslqdtnykv9gada495aauxyeljy8s',
                'ecash:qzwcdzwupqfa5n6jqgj7awutsryr2tky553a8ddw9p',
                'ecash:qz75ekume8d7y83tn0wn89d7x5xc4wlpd5wkjutg7a',
                'ecash:qqkh24v4294s7cju28fz80yy5kklcaajqcajx2tv7k',
                'ecash:qrwsrk79tv87nceuadcqknzy2gqshk66zchyqqakmd',
                'ecash:qqyrns594r2m22f5c2x553dpsdwaghc22vkfgfhqn5',
                'ecash:qq7a367d7rjdv4cj5u3lyg6kw5ckdpm3vv8hkvlk26',
                'ecash:qzt557ajdtp0v2lkpfn47hcqyjngnspa055p5p0k3e',
                'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv',
                'ecash:qrwwkvr2wdvzu5kyxqjl0mk4sfaxm85juq4wa28f2e',
                'ecash:qrunq208tyej03dcvn4x39hvlkj0l7m2hqz0s0zjys',
                'ecash:qqrzpf7l9crr00yd8haxv0yhns26vuwluszxw5x0wv',
                'ecash:qpuy0lnswzlvs4nm86qs74pl97qvc0srhc665724p7',
                'ecash:qzphvp80l4rsl2468czyuznufe4g5lhgccw7fd7qw6',
                'ecash:qqk77gg5xw8sh6dzd9tr0rhuuc8p0dvqkvvp76ut5u',
                'ecash:qzptzhmgr220a8m2c2waacs560wc3a2mlsxt0wkmsc',
                'ecash:qpu0g0hxk8jhwv5uplyuk3lhgdv4f6hgrusukd6cwl',
                'ecash:qrq605fdmhr2xped7zw0tc9qpm8pnrxgcyrwkrjedn',
                'ecash:qz7vajm78ewnln97uvs3f99dxg20j8x8fu2a6jt5fk',
                'ecash:qrauj3smamqd0qc99ssvn98lk38yvpqa2y8stcekhf',
                'ecash:qz55hqtk62xttdwrq8cshdzmmv7kurp80580x8h5zl',
                'ecash:qzvnu6lw7a85a5xrleg6lz27gakwxlpk9v55jr2p46',
                'ecash:qqhv22qcvn7f38dt2sas2333e9crsztgncmtgdrcm2',
                'ecash:qpvph4dusdwv0z9ajzj0duxfcg0tzu6h9cyaag2pwn',
                'ecash:qq5v4wmfhclzqur4wnt6phwxt2qpk6h9nyesy04fn0',
                'ecash:qzut8s3dsfuycflqyf8a328l2jdx06245vra9q3458',
                'ecash:qzu270ek398w0ejk83njw98eadrueqafuy098ueasq',
                'ecash:qrayn7v0kf0ghpxwyyxsduzj4mvgctz0nqysm47axp',
                'ecash:qpsng33a73pkh7xxv2myj9mppa3l5hvfaunm762526',
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                'ecash:qzelsrygyg838qspwq4y6rqr8vjgqk0umsa2rsz35w',
                'ecash:qzkhavkghz869cl4zk9nnzjfhunhgqvcfce9c7mvdc',
                'ecash:qp45whpmdrlcgy09cse8rmwyunexmlyq9gaduqlm6p',
                'ecash:qrhgew49vsk3chg679grahdx54gyf6qsdcurky8xms',
                'ecash:qplr7p624c7vnxn0fzujsqywh9zcv9dk4ytfcrvql0',
                'ecash:qqypd75zeegzrpc6ldhmmj28qu20ha78a57269a645',
                'ecash:qqfwq959a6szyfdw85749zccftsdk533gv3lc4mfrp',
            ],
            satoshisSent: 199975,
            stackArray: [
                '64726f70',
                'fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87',
            ],
            xecTxType: 'Sent',
        },
    },
    {
        description: 'Outgoing encrypted msg (deprecated)',
        tx: {
            txid: '7ac10096c8a7b32fe338dc938bcf2e1341b99f841687e690d88241107ce4b84b',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '45411aa786288b679d1c1874f7b126d5ea0c83380304950d364b5b8279a460de',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100d4a93c615a7af48f422c273a530ac7f2b78d31a2d4515f11b2f416fce4f4f380022075c22c73190a7de805f219ca8d294777440b558551fea6b59c6c84ec529b16f94121038c4c26730d97cdeb18e69dff6c47cebb23e6f305c950923cd6110f35ab9006d0',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914ee6dc9d40f95d8e106a63385c6fa882991b9e84e88ac',
                    sats: 48445n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04657461624ca1040f3cc3bc507126c239cde840befd974bdac054f9b9f2bfd4ff32b5f59ca554c4f3fb2d11d30eae3e5d3f61625ff7812ba14f8c901c30ee7e03dea57681a8f7ab8c64d42ce505921b4d67507452537cbe7525281714857c75d7a441b65030b7ea646b59ed0c34adc9f739661620cf7678963db3cac78afd7f49ad0d63aad404b07730255ded82ea3a939c63ee040ae9fac9336bb8d84d7b3380665ffa514a45f4',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    spentBy: {
                        txid: 'aca8ec27a6fc4dc45b1c2e2a6175e84d81ffdd54c7f97711654a100ade4e80bc',
                        outIdx: 0,
                    },
                    sats: 1200n,
                },
                {
                    outputScript:
                        '76a914ee6dc9d40f95d8e106a63385c6fa882991b9e84e88ac',
                    spentBy: {
                        txid: '610f8a6f8e7266af18feda7a5672d379314eb05cb7ce6690a1f1d5bff1051dad',
                        outIdx: 1,
                    },
                    sats: 46790n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 404,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 760192,
                hash: '0000000000000000085f5e0372ca7d42c37e5f93db753440331b3cfc1be23052',
                timestamp: 1664910499,
            },
        },
        walletHashes: ['ee6dc9d40f95d8e106a63385c6fa882991b9e84e'],
        parsed: {
            satoshisSent: 1200,
            stackArray: [
                '65746162',
                '040f3cc3bc507126c239cde840befd974bdac054f9b9f2bfd4ff32b5f59ca554c4f3fb2d11d30eae3e5d3f61625ff7812ba14f8c901c30ee7e03dea57681a8f7ab8c64d42ce505921b4d67507452537cbe7525281714857c75d7a441b65030b7ea646b59ed0c34adc9f739661620cf7678963db3cac78afd7f49ad0d63aad404b07730255ded82ea3a939c63ee040ae9fac9336bb8d84d7b3380665ffa514a45f4',
            ],
            xecTxType: 'Sent',
            recipients: ['ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6'],
            appActions: [
                {
                    app: 'Cashtab Encrypted (deprecated)',
                    lokadId: '65746162',
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Incoming encrypted msg (deprecated)',
        tx: {
            txid: '66974f4a22ca1a4aa36c932b4effafcb9dd8a32b8766dfc7644ba5922252c4c6',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'fec829a1ff34a9f84058cdd8bf795c114a8fcb3bcc6c3ca9ea8b9ae68420dd9a',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100e9fce8984a9f0cb76642c6df63a83150aa31d1071b62debe89ecadd4d45e727e02205a87fcaad0dd188860db8053caf7d6a21ed7807dbcd1560c251f9a91a4f36815412103318d0e1109f32debc66952d0e3ec21b1cf96575ea4c2a97a6535628f7f8b10e6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    sats: 36207n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04657461624c9104eaa5cbe6e13db7d91f35dca5d270c944a9a3e8c7738c56d12069312f589c7f193e67ea3d2f6d1f300f404c33c19e48dc3ac35145c8152624b7a8e22278e9133862425da2cc44f7297c8618ffa78dd09054a4a5490afd2b62139f19fa7b8516cbae692488fa50e79101d55e7582b3a662c3a5cc737044ef392f8c1fde63b8385886aed37d1b68e887284262f298fe74c0',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914ee6dc9d40f95d8e106a63385c6fa882991b9e84e88ac',
                    spentBy: {
                        txid: '610f8a6f8e7266af18feda7a5672d379314eb05cb7ce6690a1f1d5bff1051dad',
                        outIdx: 0,
                    },
                    sats: 1100n,
                },
                {
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    spentBy: {
                        txid: '3efa1835682ecc60d2476f1c608eb6f5ae9040610193111a2c312453cd7db4ef',
                        outIdx: 0,
                    },
                    sats: 34652n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 388,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 760192,
                hash: '0000000000000000085f5e0372ca7d42c37e5f93db753440331b3cfc1be23052',
                timestamp: 1664910499,
            },
        },
        walletHashes: ['ee6dc9d40f95d8e106a63385c6fa882991b9e84e'],
        parsed: {
            satoshisSent: 1100,
            stackArray: [
                '65746162',
                '04eaa5cbe6e13db7d91f35dca5d270c944a9a3e8c7738c56d12069312f589c7f193e67ea3d2f6d1f300f404c33c19e48dc3ac35145c8152624b7a8e22278e9133862425da2cc44f7297c8618ffa78dd09054a4a5490afd2b62139f19fa7b8516cbae692488fa50e79101d55e7582b3a662c3a5cc737044ef392f8c1fde63b8385886aed37d1b68e887284262f298fe74c0',
            ],
            xecTxType: 'Received',
            recipients: ['ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6'],
            replyAddress: 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
            appActions: [
                {
                    app: 'Cashtab Encrypted (deprecated)',
                    lokadId: '65746162',
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Token burn tx',
        tx: {
            txid: '312553668f596bfd61287aec1b7f0f035afb5ddadf40b6f9d1ffcec5b7d4b684',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '842dd09e723d664d7647bc49f911c88b60f0450e646fedb461f319dadb867934',
                        outIdx: 0,
                    },
                    inputScript:
                        '473044022025c68cf0ab9c1a4d6b35b2b58f7e397722f469412841eb09d38d1973dc5ef7120220712e1f3c8740fff2af75c1062a773eef167550ee008deaef9089537cd17c35f0412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 2300n,
                },
                {
                    prevOut: {
                        txid: '1efe359a0bfa83c409433c487b025fb446a3a9bfa51a718c8dd9a56401656e33',
                        outIdx: 2,
                    },
                    inputScript:
                        '47304402206a2f53497eb734ea94ca158951aa005f6569c184675a497d33d061b78c66c25b02201f826fa71be5943ce63740d92a278123974e44846c3766c5cb58ef5ad307ba36412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 2n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: '49f825370128056333af945eb4f4d9712171c9e88954deb189ca6f479564f2ee',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100efa3c767b749abb2dc958932348e2b19b845964e581c9f6de706cd43dac3f087022059afad6ff3c1e49cc0320499381e78eab922f18b00e0409228ad417e0220bf5d412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 999875n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e44204db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c8750800000000000f41b9',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 999865n,
                    },
                    spentBy: {
                        txid: '657646f7a4e7237fca4ed8231c27d95afc8086f678244d5560be2230d920ff70',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 550,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: 'Unexpected burn: Burns 12 base tokens',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 12n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NOT_NORMAL',
            block: {
                height: 760213,
                hash: '000000000000000010150c61dcde7dffb6af223a7f3f45be599d43ae972cbf67',
                timestamp: 1664921460,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        parsed: {
            satoshisSent: 546,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                '00000000000f41b9',
            ],
            xecTxType: 'Sent',
            recipients: [],
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'BURN',
                    tokenId:
                        '4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
                    tokenSatoshis: '12',
                },
            ],
        },
    },
    {
        description: 'Token burn tx with decimals',
        tx: {
            txid: 'dacd4bacb46caa3af4a57ac0449b2cb82c8a32c64645cd6a64041287d1ced556',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'eb79e90e3b5a0b6766cbfab3efd9c52f831bef62f9f27c2aa925ee81e43b843f',
                        outIdx: 0,
                    },
                    inputScript:
                        '47304402207122751937862fad68c3e293982cf7afb91967d20da63a0c23bf0565b625b775022054f39f41a43438a0df7fbe6a78521f572613bc08d6a43b6d248bcb6a434e2b52412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 2200n,
                },
                {
                    prevOut: {
                        txid: '905cc5662cad77df56c3770863634ce498dde9d4772dc494d33b7ce3f36fa66c',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100dce5b3b516bfebd40bd8d4b4ff9c43c685d3c9dde1def0cc0667389ac522cf2502202651f95638e48c210a04082e6053457a539aef0f65a2e9c2f61e3faf96c1dfd8412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 5235120760000000n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e44207443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d0800129950892eb779',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 5235120758765433n,
                    },
                    spentBy: {
                        txid: '9c0c01c1e8cc3c6d816a3b41d09d65fda69de082b74b6ede7832ed05527ec744',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 403,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: 'Unexpected burn: Burns 1234567 base tokens',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 1234567n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NOT_NORMAL',
            block: {
                height: 760216,
                hash: '00000000000000000446cfe07eb99bca0ba33a23465e1b0248be96efed74c89d',
                timestamp: 1664923585,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        parsed: {
            satoshisSent: 546,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                '00129950892eb779',
            ],
            xecTxType: 'Sent',
            recipients: [],
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'BURN',
                    tokenId:
                        '7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
                    tokenSatoshis: '1234567',
                },
            ],
        },
    },
    {
        description: 'SWaP tx',
        tx: {
            txid: 'baed6358b9ea2e354e384d2e31a576ffa25fcceaf796e711e8306f9c8086b00f',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: '8b55a382501b538296cd13269b341f7a964366a705a45f89f56e0d783240f3a4',
                        outIdx: 2,
                    },
                    inputScript:
                        '41256f3c091df7dea2bb9d74241b47116364d7b0035dfe1c5d1d398d8e92e99f4d5f3dd747f8e81ca99ddaf5630399ef18e26b6a3bf9b763cdd25225e68f7bbd2d41210304222c88e9936a195762fc4ee41a082e906a0e8434df43a03bfcdf1f9d2c1b8d',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91493472d56ba91581ed473225a765dd14a2db5d9d888ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: '8b55a382501b538296cd13269b341f7a964366a705a45f89f56e0d783240f3a4',
                        outIdx: 3,
                    },
                    inputScript:
                        '418ab02f08273afd67c4db840f09429d7c76c0a71b28dbaef5c63f277944a168819d72bedd14e78b327a237f6070b0519ef8456efbfe206bae0c60d3b5f328faea412103df543832906a1f5fc8f201bb99454f350b1906375d522f735bd357cbda11ab5b',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9149ea00e6c2ef24026719421e4790e1a694c94381b88ac',
                    sats: 2565n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a045357500001010101209e0a9d4720782cf661beaea6c5513f1972e0f3b1541ba4c83f4c87ef65f843dc0453454c4c0631323831323301002039c6db26912f34352d50fdfd8d75d1c16cb8a669f3ae05000a6c8c74d14839a50101063132383132330437383035',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91493472d56ba91581ed473225a765dd14a2db5d9d888ac',
                    spentBy: {
                        txid: '47f7a2189eb65e9a2288f81640351cc80ada49288b09973bcaa7aef1e423faa8',
                        outIdx: 1,
                    },
                    sats: 2656n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1712535539,
            size: 439,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 839523,
                hash: '00000000000000000c61b358a9681170b9387790370bf3ca18a402bc50264fc0',
                timestamp: 1712536759,
            },
        },
        walletHashes: ['a7d744e1246a20f26238e0510fb82d8df84cc82d'],
        parsed: {
            satoshisSent: 0,
            stackArray: [
                '53575000',
                '01',
                '01',
                '9e0a9d4720782cf661beaea6c5513f1972e0f3b1541ba4c83f4c87ef65f843dc',
                '53454c4c',
                '313238313233',
                '00',
                '39c6db26912f34352d50fdfd8d75d1c16cb8a669f3ae05000a6c8c74d14839a5',
                '01',
                '313238313233',
                '37383035',
            ],
            xecTxType: 'Received',
            appActions: [
                {
                    app: 'SWaP',
                    lokadId: '53575000',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qzf5wt2kh2g4s8k5wv395aja699zmdwemq05vg6h92'],
            replyAddress: 'ecash:qzf5wt2kh2g4s8k5wv395aja699zmdwemq05vg6h92',
        },
    },
    {
        description: 'PayButton tx with no data and payment id',
        tx: {
            txid: 'f2ca747f0780c6cda32a43418b4dd55112b709577f64436d80ab1a38e4f2787a',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '00bfb4625325fe6e6a3ce34eb3ed7214167644e2eca892db207a44ea3262effc',
                        outIdx: 2,
                    },
                    inputScript:
                        '411b57cfa0bcc8e1f1c02f0dfed248688bf1e337e75d9c2775324e55b5d6d2085260303c3f77437d7bc0f1533ea816e7c8e4b77175ff3c9e61ce2e21b5e1dc95014121027a70b0f8b59cbb83a64cacbf4fca79e5c9a4f655f325d0936ed4eebced3cb8aa',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91403c63d3a52cde136da8858e9d0ffaa810cb6639288ac',
                    sats: 7146n,
                },
            ],
            outputs: [
                {
                    outputScript: '6a0450415900000008d980190d13019567',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914f66d2760b20dc7a47d9cf1a2b2f49749bf7093f688ac',
                    sats: 1800n,
                },
                {
                    outputScript:
                        '76a91401bfce4ff373b108bd65b4da08de621ade85adb588ac',
                    spentBy: {
                        txid: '566a7c12364e3f362fbc738bf209527d3074ce0a2d19b797d3ca34a3482e3386',
                        outIdx: 0,
                    },
                    sats: 3876n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 245,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 828922,
                hash: '0000000000000000018b4f795d767bce0438dedf67d2904e35da7d746065af1a',
                timestamp: 1706323334,
            },
        },
        walletHashes: ['f66d2760b20dc7a47d9cf1a2b2f49749bf7093f6'],
        parsed: {
            satoshisSent: 1800,
            stackArray: ['50415900', '00', '00', 'd980190d13019567'],
            xecTxType: 'Received',
            appActions: [
                {
                    action: {
                        data: '',
                        nonce: 'd980190d13019567',
                    },
                    isValid: true,
                    app: 'PayButton',
                    lokadId: '50415900',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qqqmlnj07demzz9avk6d5zx7vgddapddk5k05jys53'],
            replyAddress: 'ecash:qqpuv0f62tx7zdk63pvwn58l42qsednrjgnt0czndd',
        },
    },
    {
        description: 'PayButton tx with data and payment id',
        tx: {
            txid: '952dd66d7145330d8d3b2f09abbee33344e8aa65b7483cfaa9d278ec55379e29',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '37a740f89ab6c212f211150f35fb1e12cd80f287b825126eed262999ea4264b8',
                        outIdx: 0,
                    },
                    inputScript:
                        '41fc1401150778a0d47d5279ccdaa13298cfa43e25d8d37d37570291207a92098beefa8fb25b8fb9cb2c4d7b5f98b7ff377c54932e0e67f4db2fc127ed86e01b1a4121024b60abfca9302b9bf5731faca03fd4f0b06391621a4cd1d57fffd6f1179bb9ba',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a914e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc88ac',
                    sats: 3403110n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04504159000008f09f9882f09f918d0869860643e4dc4c88',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914e573dd89a61f8daeb56bf5b5fb5d7cd86e31ab2e88ac',
                    spentBy: {
                        txid: '8b2a86aabae90c0f9e8a111e220c85b52fc54b15c6d46cbbbca89020318714a4',
                        outIdx: 0,
                    },
                    sats: 3392102n,
                },
                {
                    outputScript:
                        '76a914697ae72b062557fa69f9d4d09182529da368ab6988ac',
                    spentBy: {
                        txid: '1b3165e7edef19369880f032d8f4d19cc41e9ebf2bfb657518ae99075aa2b471',
                        outIdx: 0,
                    },
                    sats: 9490n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 253,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 828920,
                hash: '00000000000000000d6a683b11a6bdaab4b79b15f100daa9361d02207667de1d',
                timestamp: 1706323234,
            },
        },
        walletHashes: ['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc'],
        parsed: {
            satoshisSent: 3401592,
            stackArray: [
                '50415900',
                '00',
                'f09f9882f09f918d',
                '69860643e4dc4c88',
            ],
            xecTxType: 'Sent',
            recipients: [
                'ecash:qrjh8hvf5c0cmt44d06mt76a0nvxuvdt9cmj39zxwm',
                'ecash:qp5h4eetqcj407nfl82dpyvz22w6x69tdyxpprn8zg',
            ],
            appActions: [
                {
                    action: {
                        data: '😂👍',
                        nonce: '69860643e4dc4c88',
                    },
                    isValid: true,
                    lokadId: '50415900',
                    app: 'PayButton',
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'PayButton tx with no data and no payment id',
        tx: {
            txid: '952dd66d7145330d8d3b2f09abbee33344e8aa65b7483cfaa9d278ec55379e29',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '37a740f89ab6c212f211150f35fb1e12cd80f287b825126eed262999ea4264b8',
                        outIdx: 0,
                    },
                    inputScript:
                        '41fc1401150778a0d47d5279ccdaa13298cfa43e25d8d37d37570291207a92098beefa8fb25b8fb9cb2c4d7b5f98b7ff377c54932e0e67f4db2fc127ed86e01b1a4121024b60abfca9302b9bf5731faca03fd4f0b06391621a4cd1d57fffd6f1179bb9ba',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a914e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc88ac',
                    sats: 3403110n,
                },
            ],
            outputs: [
                {
                    outputScript: '6a0450415900000000',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914e573dd89a61f8daeb56bf5b5fb5d7cd86e31ab2e88ac',
                    spentBy: {
                        txid: '8b2a86aabae90c0f9e8a111e220c85b52fc54b15c6d46cbbbca89020318714a4',
                        outIdx: 0,
                    },
                    sats: 3392102n,
                },
                {
                    outputScript:
                        '76a914697ae72b062557fa69f9d4d09182529da368ab6988ac',
                    spentBy: {
                        txid: '1b3165e7edef19369880f032d8f4d19cc41e9ebf2bfb657518ae99075aa2b471',
                        outIdx: 0,
                    },
                    sats: 9490n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 253,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 828920,
                hash: '00000000000000000d6a683b11a6bdaab4b79b15f100daa9361d02207667de1d',
                timestamp: 1706323234,
            },
        },
        walletHashes: ['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc'],
        parsed: {
            satoshisSent: 3401592,
            stackArray: ['50415900', '00', '00', '00'],
            xecTxType: 'Sent',
            recipients: [
                'ecash:qrjh8hvf5c0cmt44d06mt76a0nvxuvdt9cmj39zxwm',
                'ecash:qp5h4eetqcj407nfl82dpyvz22w6x69tdyxpprn8zg',
            ],
            appActions: [
                {
                    action: {
                        data: '',
                        nonce: '',
                    },
                    isValid: true,
                    lokadId: '50415900',
                    app: 'PayButton',
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'PayButton tx with data and no payment id',
        tx: {
            txid: '952dd66d7145330d8d3b2f09abbee33344e8aa65b7483cfaa9d278ec55379e29',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '37a740f89ab6c212f211150f35fb1e12cd80f287b825126eed262999ea4264b8',
                        outIdx: 0,
                    },
                    inputScript:
                        '41fc1401150778a0d47d5279ccdaa13298cfa43e25d8d37d37570291207a92098beefa8fb25b8fb9cb2c4d7b5f98b7ff377c54932e0e67f4db2fc127ed86e01b1a4121024b60abfca9302b9bf5731faca03fd4f0b06391621a4cd1d57fffd6f1179bb9ba',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a914e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc88ac',
                    sats: 3403110n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a0450415900000e6f6e6c792064617461206865726500',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914e573dd89a61f8daeb56bf5b5fb5d7cd86e31ab2e88ac',
                    spentBy: {
                        txid: '8b2a86aabae90c0f9e8a111e220c85b52fc54b15c6d46cbbbca89020318714a4',
                        outIdx: 0,
                    },
                    sats: 3392102n,
                },
                {
                    outputScript:
                        '76a914697ae72b062557fa69f9d4d09182529da368ab6988ac',
                    spentBy: {
                        txid: '1b3165e7edef19369880f032d8f4d19cc41e9ebf2bfb657518ae99075aa2b471',
                        outIdx: 0,
                    },
                    sats: 9490n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 253,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 828920,
                hash: '00000000000000000d6a683b11a6bdaab4b79b15f100daa9361d02207667de1d',
                timestamp: 1706323234,
            },
        },
        walletHashes: ['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc'],
        parsed: {
            satoshisSent: 3401592,
            stackArray: [
                '50415900',
                '00',
                '6f6e6c7920646174612068657265',
                '00',
            ],
            xecTxType: 'Sent',
            recipients: [
                'ecash:qrjh8hvf5c0cmt44d06mt76a0nvxuvdt9cmj39zxwm',
                'ecash:qp5h4eetqcj407nfl82dpyvz22w6x69tdyxpprn8zg',
            ],
            appActions: [
                {
                    action: {
                        data: 'only data here',
                        nonce: '',
                    },
                    app: 'PayButton',
                    isValid: true,
                    lokadId: '50415900',
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Paybutton tx that does not have spec number of pushes',
        tx: {
            txid: '952dd66d7145330d8d3b2f09abbee33344e8aa65b7483cfaa9d278ec55379e29',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '37a740f89ab6c212f211150f35fb1e12cd80f287b825126eed262999ea4264b8',
                        outIdx: 0,
                    },
                    inputScript:
                        '41fc1401150778a0d47d5279ccdaa13298cfa43e25d8d37d37570291207a92098beefa8fb25b8fb9cb2c4d7b5f98b7ff377c54932e0e67f4db2fc127ed86e01b1a4121024b60abfca9302b9bf5731faca03fd4f0b06391621a4cd1d57fffd6f1179bb9ba',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a914e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc88ac',
                    sats: 3403110n,
                },
            ],
            outputs: [
                {
                    outputScript: '6a04504159000008f09f9882f09f918d',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914e573dd89a61f8daeb56bf5b5fb5d7cd86e31ab2e88ac',
                    spentBy: {
                        txid: '8b2a86aabae90c0f9e8a111e220c85b52fc54b15c6d46cbbbca89020318714a4',
                        outIdx: 0,
                    },
                    sats: 3392102n,
                },
                {
                    outputScript:
                        '76a914697ae72b062557fa69f9d4d09182529da368ab6988ac',
                    spentBy: {
                        txid: '1b3165e7edef19369880f032d8f4d19cc41e9ebf2bfb657518ae99075aa2b471',
                        outIdx: 0,
                    },
                    sats: 9490n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 253,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 828920,
                hash: '00000000000000000d6a683b11a6bdaab4b79b15f100daa9361d02207667de1d',
                timestamp: 1706323234,
            },
        },
        walletHashes: ['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc'],
        parsed: {
            satoshisSent: 3401592,
            stackArray: ['50415900', '00', 'f09f9882f09f918d'],
            xecTxType: 'Sent',
            recipients: [
                'ecash:qrjh8hvf5c0cmt44d06mt76a0nvxuvdt9cmj39zxwm',
                'ecash:qp5h4eetqcj407nfl82dpyvz22w6x69tdyxpprn8zg',
            ],
            appActions: [
                {
                    app: 'PayButton',
                    isValid: false,
                    lokadId: '50415900',
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'PayButton tx with unsupported version number',
        tx: {
            txid: '952dd66d7145330d8d3b2f09abbee33344e8aa65b7483cfaa9d278ec55379e29',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '37a740f89ab6c212f211150f35fb1e12cd80f287b825126eed262999ea4264b8',
                        outIdx: 0,
                    },
                    inputScript:
                        '41fc1401150778a0d47d5279ccdaa13298cfa43e25d8d37d37570291207a92098beefa8fb25b8fb9cb2c4d7b5f98b7ff377c54932e0e67f4db2fc127ed86e01b1a4121024b60abfca9302b9bf5731faca03fd4f0b06391621a4cd1d57fffd6f1179bb9ba',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a914e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc88ac',
                    sats: 3403110n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a0450415900010108f09f9882f09f918d0869860643e4dc4c88',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914e573dd89a61f8daeb56bf5b5fb5d7cd86e31ab2e88ac',
                    spentBy: {
                        txid: '8b2a86aabae90c0f9e8a111e220c85b52fc54b15c6d46cbbbca89020318714a4',
                        outIdx: 0,
                    },
                    sats: 3392102n,
                },
                {
                    outputScript:
                        '76a914697ae72b062557fa69f9d4d09182529da368ab6988ac',
                    spentBy: {
                        txid: '1b3165e7edef19369880f032d8f4d19cc41e9ebf2bfb657518ae99075aa2b471',
                        outIdx: 0,
                    },
                    sats: 9490n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 253,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 828920,
                hash: '00000000000000000d6a683b11a6bdaab4b79b15f100daa9361d02207667de1d',
                timestamp: 1706323234,
            },
        },
        walletHashes: ['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc'],
        parsed: {
            satoshisSent: 3401592,
            stackArray: [
                '50415900',
                '01',
                'f09f9882f09f918d',
                '69860643e4dc4c88',
            ],
            xecTxType: 'Sent',
            recipients: [
                'ecash:qrjh8hvf5c0cmt44d06mt76a0nvxuvdt9cmj39zxwm',
                'ecash:qp5h4eetqcj407nfl82dpyvz22w6x69tdyxpprn8zg',
            ],
            appActions: [
                {
                    app: 'PayButton',
                    isValid: false,
                    lokadId: '50415900',
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'External msg received from Electrum',
        tx: {
            txid: 'd0c4c5b86016b7a021470180cb4afd1f8456fcf683a19d8b061b2225abd71be4',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '7e439e4a1dde6f4380ed1afddbd5f484db80b00f26c85b3f10f6ccb245da5800',
                        outIdx: 4,
                    },
                    inputScript:
                        '416d2f67c38b81b6fdd13f4cb2c2d0a9194800e98b80a1054ca83b1ea3d739e70f9c4e2c8a61050b40161a0d741db9a6e71d155cf61623b9279739b50446d3ec6a4121026769c23182aaa572c16c82121caff660a7c13befd0d20c263e577ca01c4f029e',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a914eff9a0ba847ae97697a9f97c05887aba2b41060e88ac',
                    sats: 81319n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a1774657374696e672061206d736720666f72206572726f72',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914731fbd873b3603e8dafd62923b954d38571e10fc88ac',
                    spentBy: {
                        txid: 'b817870c8ae5ec94d639089e37763daee271f412ab478705a29b036ba0b00f3d',
                        outIdx: 55,
                    },
                    sats: 80213n,
                },
                {
                    outputScript:
                        '76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac',
                    spentBy: {
                        txid: 'dc06ab36c9a7e365f319c0e918324af9778cb29b82c07ff87e2ec80eb6e4e6fe',
                        outIdx: 9,
                    },
                    sats: 600n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1709353270,
            size: 253,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 833968,
                hash: '000000000000000020f276cf59fc4e53672500ca5b5896502d0a50500174c27c',
                timestamp: 1709354653,
            },
        },
        walletHashes: ['4e532257c01b310b3b5c1fd947c79a72addf8523'],
        parsed: {
            satoshisSent: 600,
            stackArray: ['74657374696e672061206d736720666f72206572726f72'],
            xecTxType: 'Received',
            appActions: [
                {
                    action: {
                        decoded: 'testing a msg for error',
                        stack: '74657374696e672061206d736720666f72206572726f72',
                    },
                    lokadId: '',
                    app: 'none',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qpe3l0v88vmq86x6l43fywu4f5u9w8sslsga0tcn4t'],
            replyAddress: 'ecash:qrhlng96s3awja5h48uhcpvg02azksgxpce6nvshln',
        },
    },
    {
        description: 'Unknown app tx',
        tx: {
            txid: '4cd528a95263714b8f748d58df30c44956158825924e3385b5c5c511129d1b3a',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '9ca28926f8ec125dce0b7084468bd595b27bd73991b48461ac994cacff47a21d',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100b50fac4b810ac6b10ce35f25fcc1a6b1f87b1209e8ee5973732d983395199de102204f860238b12ba3e7adfc432e331405f751fef1aa494c2d0122b7aaa522158933412102188904278ebf33059093f596a2697cf3668b3bec9a3a0c6408a455147ab3db93',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914d18b7b500f17c5db64303fec630f9dbb85aa959688ac',
                    sats: 3725n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a4cd43336616533642d4d45524f4e2d57494e227d2c7b226e616d65223a2277616c61222c226d657373616765223a223635396661313133373065333136663265613336616533642d57414c412d57494e227d5d2c227465726d73223a5b7b226e616d65223a22726566657265655075624b6579222c2274797065223a226279746573222c2276616c7565223a22303231383839303432373865626633333035393039336635393661323639376366333636386233626563396133613063363430386134353531343761623364623933227d5d7d7d7d7d',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914d18b7b500f17c5db64303fec630f9dbb85aa959688ac',
                    spentBy: {
                        txid: 'e5b4912fa19d93db9b6b9586ad9ab3a7f9bc3514325c71e36816e4b047a9f6b8',
                        outIdx: 0,
                    },
                    sats: 3308n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 0,
            size: 416,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 826662,
                hash: '00000000000000001d45441094ec7a93f42f3beb564684aba68250b016feefb4',
                timestamp: 1704961725,
            },
        },
        walletHashes: ['d18b7b500f17c5db64303fec630f9dbb85aa9596'],
        parsed: {
            satoshisSent: 3308,
            stackArray: [
                '3336616533642d4d45524f4e2d57494e227d2c7b226e616d65223a2277616c61222c226d657373616765223a223635396661313133373065333136663265613336616533642d57414c412d57494e227d5d2c227465726d73223a5b7b226e616d65223a22726566657265655075624b6579222c2274797065223a226279746573222c2276616c7565223a22303231383839303432373865626633333035393039336635393661323639376366333636386233626563396133613063363430386134353531343761623364623933227d5d7d7d7d7d',
            ],
            xecTxType: 'Sent',
            recipients: [],
            appActions: [
                {
                    action: {
                        decoded:
                            '36ae3d-MERON-WIN"},{"name":"wala","message":"659fa11370e316f2ea36ae3d-WALA-WIN"}],"terms":[{"name":"refereePubKey","type":"bytes","value":"02188904278ebf33059093f596a2697cf3668b3bec9a3a0c6408a455147ab3db93"}]}}}}',
                        stack: '3336616533642d4d45524f4e2d57494e227d2c7b226e616d65223a2277616c61222c226d657373616765223a223635396661313133373065333136663265613336616533642d57414c412d57494e227d5d2c227465726d73223a5b7b226e616d65223a22726566657265655075624b6579222c2274797065223a226279746573222c2276616c7565223a22303231383839303432373865626633333035393039336635393661323639376366333636386233626563396133613063363430386134353531343761623364623933227d5d7d7d7d7d',
                    },
                    app: 'none',
                    lokadId: '',
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'We can parse a received ALP tx',
        tx: {
            txid: '791c460c6d5b513283b98b92b83f0e6fa662fc279f39fd00bd27047370ba4647',
            version: 1,
            inputs: [
                {
                    prevOut: {
                        txid: '927bf59fee669509ffee3f3cad5d283694adaf8e44e37e2ae62df53e51116052',
                        outIdx: 1,
                    },
                    inputScript:
                        '41482340e636feab0d15efb309e72eac0f559d0b85eb1799e0a1419430e95448a6a5c1e3961c92861e653dde4428e6e3a79c90d10911b045e7469f7beeae62fc56c1210378d370d2cd269a77ac2f37c28d98b392e5b9892f3b3406bfec8794c82244b039',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 49756n,
                    },
                    outputScript:
                        '76a914575116c8adf5817c99fc5bdac8db18d10c25703d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: 'd848d41122437eb049f75142674bb5ec810815955ed2a85a9cfc6142c72e7d00',
                        outIdx: 2,
                    },
                    inputScript:
                        '4152ed9a66a0c40759e400a1484df1a1d2b152c9d6917abf3beaf974f21a935d60853490ae5a07c237531016ceae6c1f01cce9cf2a1417b2b2bcbbc4737ea2fe35412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                    sats: 1000n,
                },
                {
                    prevOut: {
                        txid: 'd848d41122437eb049f75142674bb5ec810815955ed2a85a9cfc6142c72e7d00',
                        outIdx: 3,
                    },
                    inputScript:
                        '412a65517b4df68bb03ba2b7cd85e70af662503bbc8be209e7fbf18bb0950ff7e0d589f0b3e8119b5e67314fbedd856968890556593d97db58c78e86d2417f27d7412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                    sats: 1000n,
                },
                {
                    prevOut: {
                        txid: 'd848d41122437eb049f75142674bb5ec810815955ed2a85a9cfc6142c72e7d00',
                        outIdx: 4,
                    },
                    inputScript:
                        '412c9a66d04d341b1f0c3a15689265729a18f5605269909ad9f7b842ea03d96f8540e1b5b272ddc9db5f2d392a8e0569428a7ba4b5d99bbc707168898399f00da7412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                    sats: 1000n,
                },
                {
                    prevOut: {
                        txid: 'd848d41122437eb049f75142674bb5ec810815955ed2a85a9cfc6142c72e7d00',
                        outIdx: 5,
                    },
                    inputScript:
                        '41f2ffdbd5f3694669d448899d3f6d939a8165d70cba6be2eaa8416847d56d4630a7b3ac8a35641705e4eb583b391a46c204920641dd85e2b7e04dd18553422651412102f49a7fd4e0c6cea6401aed57b76b2fb358e1ebbb65fc5782e3c2165c9e850b31',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9148b9b3ba9199d98e131b762081c0c31754fb904c288ac',
                    sats: 1000n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a503d534c5032000453454e4445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd038a02000000003e3000000000948f00000000',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914dee50f576362377dd2f031453c0bb09009acaf8188ac',
                    token: {
                        tokenId:
                            'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 650n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        'a914b0bfb87508e5203803490c2f3891d040f772ba0f87',
                    token: {
                        tokenId:
                            'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 12350n,
                    },
                    sats: 1960n,
                },
                {
                    outputScript:
                        '76a914575116c8adf5817c99fc5bdac8db18d10c25703d88ac',
                    token: {
                        tokenId:
                            'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 36756n,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1710439161,
            size: 888,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 835924,
                hash: '00000000000000000cb5f7d96ddff0d04096c405a0361196bcbe60622ea0e44f',
                timestamp: 1710440413,
            },
        },
        walletHashes: ['76a914dee50f576362377dd2f031453c0bb09009acaf8188ac'],
        parsed: {
            satoshisSent: 546,
            stackArray: [
                '50',
                '534c5032000453454e4445e1f25de444e399b6d46fa66e3424c04549a85a14b12bc9a4ddc9cdcdcdcdcd038a02000000003e3000000000948f00000000',
            ],
            xecTxType: 'Received',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'SEND',
                    tokenId:
                        'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
                    tokenSatoshis: '650',
                },
            ],
            recipients: [
                'ecash:pzctlwr4prjjqwqrfyxz7wy36pq0wu46pud7n9ffz3',
                'ecash:qpt4z9kg4h6czlyel3da4jxmrrgscfts859gzp2zuu',
            ],
            replyAddress: 'ecash:qpt4z9kg4h6czlyel3da4jxmrrgscfts859gzp2zuu',
        },
    },
    {
        description: 'SLP1 NFT Parent Fan-out tx',
        tx: {
            txid: 'faaba128601942a858abcce56d0da002c1f1d95e8c49ba4105c3d08aa76959d8',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100a5e4824f76bad8f224412fca2442c11598d6dd29848b67ae0e8c6f74a5a80b2c022049ee636ac6b951eba8273f300bcab8ffc31525f4d96ca738cfbb62e73769bf3a412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 4n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: '73c8333ffbf94d14a52c0284a67a7e0cb71dac08d6ae9da989f7c3b97339df7f',
                        outIdx: 3,
                    },
                    inputScript:
                        '483045022100dfe70b028211bf747a9d634f03f6f024264f75ef37f9dd4b40c8d8dfddfeff9702205ccb832e674c5c865353707fc46c5b4206dd807797d6b64f146441fa2d85bf94412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 32771801n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001810453454e442012a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3080000000000000001080000000000000001080000000000000001080000000000000001',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    spentBy: {
                        txid: 'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
                        outIdx: 0,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: 'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
                        outIdx: 1,
                    },
                    sats: 32769023n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1713825841,
            size: 567,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 841414,
                hash: '00000000000000000e074b0e1067d96e33a0b4df2a352dab1abbb6f28645563a',
                timestamp: 1713826095,
            },
        },
        walletHashes: ['76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac'],
        parsed: {
            recipients: [],
            satoshisSent: 32771207,
            stackArray: [
                '534c5000',
                '81',
                '53454e44',
                '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                '0000000000000001',
                '0000000000000001',
                '0000000000000001',
                '0000000000000001',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    nftFanInputsCreated: 4,
                    renderedTokenType: 'Collection',
                    renderedTxType: 'Fan Out',
                    tokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                    tokenSatoshis: '0',
                },
            ],
        },
    },
    {
        description: 'SLP1 NFT Mint',
        tx: {
            txid: 'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'faaba128601942a858abcce56d0da002c1f1d95e8c49ba4105c3d08aa76959d8',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100939d517c889174bdcaf9755390165ce1e2ba7f47d1490dbf48bbf2f4146c84360220172aeb2fe8eca8a0c59e68ca6b2ab1a8fd0bdded8410212c5d34d936cadcf734412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: false,
                        entryIdx: 1,
                        atoms: 1n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: 'faaba128601942a858abcce56d0da002c1f1d95e8c49ba4105c3d08aa76959d8',
                        outIdx: 5,
                    },
                    inputScript:
                        '483045022100da6101ab8d02141d6745b3985d4c1ba5481cb2c470acff8d40e66fa654e3f14402200906d6a511dda0c5bc243f82217a03fe40c3cfc0a407b2d1e6f971de1ae70316412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 32769023n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001410747454e45534953035746430c57752046616e672043686f690b636173687461622e636f6d20ec7ed5da3ed751a80a3ab857c50dce405f8e8f7a083fafea158a3a297308385501004c00080000000000000001',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 32768070n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1713828197,
            size: 474,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    txType: 'GENESIS',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    groupTokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
                {
                    tokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    txType: 'NONE',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
        },
        walletHashes: ['76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac'],
        parsed: {
            recipients: [],
            satoshisSent: 32768616,
            stackArray: [
                '534c5000',
                '41',
                '47454e45534953',
                '574643',
                '57752046616e672043686f69',
                '636173687461622e636f6d',
                'ec7ed5da3ed751a80a3ab857c50dce405f8e8f7a083fafea158a3a2973083855',
                '00',
                '',
                '0000000000000001',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'NFT',
                    renderedTxType: 'GENESIS',
                    tokenId:
                        'fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
                    tokenSatoshis: '1',
                },
                {
                    renderedTokenType: 'Collection',
                    renderedTxType: 'NONE',
                    tokenId:
                        '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
                    tokenSatoshis: '0',
                },
            ],
        },
    },
    {
        description: 'SLP1 Parent Genesis',
        tx: {
            txid: 'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100eb2e68c7d02eda2dd64c22a079d832c5c85f34f1ced264cd3b37658d4cd0b89e02203e204cd625a05c8ba59291567bc14d0bfa193a9a37cbc00aec804a224dc910d1412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 32766028n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001810747454e455349530348534d0b54686520486569736d616e2c68747470733a2f2f656e2e77696b6970656469612e6f72672f77696b692f486569736d616e5f54726f7068792073229094743335d380cd7ce479fb38c9dfe77cdd97668aa0c4d9183855fcb97601004c00080000000000000059',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 89n,
                    },
                    spentBy: {
                        txid: '1f2f9a37767586320a8af6afadda56bdf5446034910e27d537f26777ad95e0d5',
                        outIdx: 0,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '1f2f9a37767586320a8af6afadda56bdf5446034910e27d537f26777ad95e0d5',
                        outIdx: 1,
                    },
                    sats: 32764762n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1714048251,
            size: 358,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    txType: 'GENESIS',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 841852,
                hash: '00000000000000000cea344b4130a2de214200266ad0d67253eea01eeb34a48d',
                timestamp: 1714048284,
            },
        },
        walletHashes: ['76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac'],
        parsed: {
            recipients: [],
            satoshisSent: 32765308,
            stackArray: [
                '534c5000',
                '81',
                '47454e45534953',
                '48534d',
                '54686520486569736d616e',
                '68747470733a2f2f656e2e77696b6970656469612e6f72672f77696b692f486569736d616e5f54726f706879',
                '73229094743335d380cd7ce479fb38c9dfe77cdd97668aa0c4d9183855fcb976',
                '00',
                '',
                '0000000000000059',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'Collection',
                    renderedTxType: 'GENESIS',
                    tokenId:
                        'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                    tokenSatoshis: '89',
                },
            ],
        },
    },
    {
        description: 'received xec tx with no change',
        tx: {
            txid: '0edd96775cc1dbc4c36dbf5f1773f937de3bdadd572265ad78bae931fec3f431',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'cd5731b4f5ec4ff2e12fe3187e37ce3dc544f5419df8f6c36f649e1236d7dcee',
                        outIdx: 0,
                    },
                    inputScript:
                        '41246058dcfab4114536db638d064612e12e0cfff613b568535c278e544ec68ec3e02ffc94d09a0ffe0f4e6fd9ff9608b01aad46cad3765059c3fe45ea09898abe4121029bd5d9d9565b734188493dfd3b0fe985ccd55bb6bc1544cf6ed25a46076f045f',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a914bb3f3669824acaf67902cbc8477f75ae5b139a0f88ac',
                    sats: 45553900000n,
                },
                {
                    prevOut: {
                        txid: '3719ef3aa2739da328a1a2916a422931fb7b0fa897183f3fd8f3c26864285e34',
                        outIdx: 0,
                    },
                    inputScript:
                        '415d1ee0074f11a0adf5c35039167a731d008656eb0a33b5eec9144dd8614419e88866779cce3da0de8c9f839ddbb8d8ee8d24c82526a8900730ea8af8ef102c6d4121020b5c467c0276678df5f50cc932e81abf259f40477f815ed11f4d0fecab39f2d6',
                    sequenceNo: 4294967294,
                    outputScript:
                        '76a91409c388abff6922c7e97ef8ea58e9697b6637910c88ac',
                    sats: 100000000n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '76a914601efc2aa406fe9eaedd41d2b5d95d1f4db9041d88ac',
                    spentBy: {
                        txid: 'b9aab1e26381457b390ad689c7577962cef1ec48de3a83d87db68968afb7e4cf',
                        outIdx: 54,
                    },
                    sats: 45653899320n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1714138690,
            size: 326,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 842022,
                hash: '00000000000000000c331ba563d903d20ff670b18afd0d6cd4aadca854d294a6',
                timestamp: 1714139968,
            },
        },
        walletHashes: ['601efc2aa406fe9eaedd41d2b5d95d1f4db9041d'],
        parsed: {
            appActions: [],
            parsedTokenEntries: [],
            recipients: [],
            replyAddress: 'ecash:qzan7dnfsf9v4aneqt9us3mlwkh9kyu6pufd42k3cf',
            satoshisSent: 45653899320,
            stackArray: [],
            xecTxType: 'Received',
        },
    },
    {
        description: 'eCash Chat authentication',
        tx: {
            txid: '61838af28ae42e3b6a5fd037e112fe0df936dabf2a6417091abce6a3d830b078',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'f9323576b17aebd302272652ee9990b2a1347da7e3270d19b8d32ae60a0dec2f',
                        outIdx: 0,
                    },
                    inputScript:
                        '413fb023c886471d0f7eefcd3e5bf2cdbc0f537edd20b9f515d32da7c80b519b7cdc2da3e6696220addd232ebd8c10d53c092965d6bcce262b1a8745a61a18f3a54121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    sats: 3377n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a0461757468140644ad85a538657c033e36ce5a3c8cf26076591f',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914b20298c1b5d6a82a61f6c8cd708fa87a1ce1a97a88ac',
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    sats: 2314n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1723372560,
            size: 255,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 857308,
                hash: '000000000000000020801fb91e3685a03a8d8f967cd048f58059bda0800a8402',
                timestamp: 1723373699,
            },
            parsed: {
                xecTxType: 'Sent',
                satoshisSent: 550,
                stackArray: [
                    '61757468',
                    '0644ad85a538657c033e36ce5a3c8cf26076591f',
                ],
                recipients: [
                    'ecash:qzeq9xxpkht2s2np7myv6uy04papecdf0g0zly33v5',
                ],
            },
        },
        walletHashes: ['14582d09f61c6580b8a2b6c8af8d6a13c9128b6f'],
        parsed: {
            appActions: [
                {
                    isValid: true,
                    lokadId: '61757468',
                    app: 'Auth',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qzeq9xxpkht2s2np7myv6uy04papecdf0g0zly33v5'],
            satoshisSent: 550,
            stackArray: [
                '61757468',
                '0644ad85a538657c033e36ce5a3c8cf26076591f',
            ],
            xecTxType: 'Sent',
        },
    },
    {
        description: 'External msg received from eCash Chat',
        tx: {
            txid: 'a3b3e23eb564920c10b1b6278a1e00dcec0c8b1593fc0d7f2e514cf20416255c',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '5eff401088014f551d5fce6340d9fa09ff3082b58cf5a3d8e20c5c14a0b4200e',
                        outIdx: 0,
                    },
                    inputScript:
                        '483045022100b7af7b05bb2fd4c743724175ddb4ed00030954f35adabe5e4dd77c1cb3125a7e02204186b77fcb0ce296a2ece2a0aa942933401bc269ea19f85434cdffe21bfea85d412103def4b1f77431c9825632ac5da7433b6eaa5281a90aabd9b597af4f16f6cccf51',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9140536f99c447acb2ab26b91db741975b6e0bd981788ac',
                    sats: 3000n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04636861741a68656c6c6f2066726f6d206543617368204368617420f09f918d',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac',
                    sats: 1000n,
                },
                {
                    outputScript:
                        '76a9140536f99c447acb2ab26b91db741975b6e0bd981788ac',
                    sats: 1461n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1711788850,
            size: 268,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: ['0b7d35fda03544a08e65464d54cfae4257eb6db7'],
        parsed: {
            satoshisSent: 1000,
            xecTxType: 'Received',
            stackArray: [
                '63686174',
                '68656c6c6f2066726f6d206543617368204368617420f09f918d',
            ],
            appActions: [
                {
                    action: {
                        msg: 'hello from eCash Chat 👍',
                    },
                    isValid: true,
                    lokadId: '63686174',
                    app: 'eCashChat',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qqznd7vug3avk24jdwgakaqewkmwp0vczu5u9man9y'],
            replyAddress: 'ecash:qqznd7vug3avk24jdwgakaqewkmwp0vczu5u9man9y',
        },
    },
    {
        description: 'Off spec eCashChat',
        tx: {
            txid: 'a3b3e23eb564920c10b1b6278a1e00dcec0c8b1593fc0d7f2e514cf20416255c',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '5eff401088014f551d5fce6340d9fa09ff3082b58cf5a3d8e20c5c14a0b4200e',
                        outIdx: 0,
                    },
                    inputScript:
                        '483045022100b7af7b05bb2fd4c743724175ddb4ed00030954f35adabe5e4dd77c1cb3125a7e02204186b77fcb0ce296a2ece2a0aa942933401bc269ea19f85434cdffe21bfea85d412103def4b1f77431c9825632ac5da7433b6eaa5281a90aabd9b597af4f16f6cccf51',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9140536f99c447acb2ab26b91db741975b6e0bd981788ac',
                    sats: 3000n,
                },
            ],
            outputs: [
                {
                    outputScript: '6a0463686174',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a9140b7d35fda03544a08e65464d54cfae4257eb6db788ac',
                    sats: 1000n,
                },
                {
                    outputScript:
                        '76a9140536f99c447acb2ab26b91db741975b6e0bd981788ac',
                    sats: 1461n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1711788850,
            size: 268,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
        },
        walletHashes: ['0b7d35fda03544a08e65464d54cfae4257eb6db7'],
        parsed: {
            appActions: [
                {
                    app: 'eCashChat',
                    isValid: false,
                    lokadId: '63686174',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qqznd7vug3avk24jdwgakaqewkmwp0vczu5u9man9y'],
            replyAddress: 'ecash:qqznd7vug3avk24jdwgakaqewkmwp0vczu5u9man9y',
            satoshisSent: 1000,
            stackArray: ['63686174'],
            xecTxType: 'Received',
        },
    },
    {
        description: 'slp v1 mint tx',
        tx: {
            txid: '4b5b2a0f8bcacf6bccc7ef49e7f82a894c9c599589450eaeaf423e0f5926c38e',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        outIdx: 2,
                    },
                    inputScript:
                        '473044022038242777df76cf81fea627fad7c8a4f67ddb2dd68defcdb8d45dbc7e0f90c62102206f5c9a5b79f10cb6ac93d46a084666b810d12871c02182f9097b1ac72643dab6412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: true,
                        entryIdx: 0,
                        atoms: 0n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: '89b922392753498ea1c6f8f29c9c9c2d7768fcaa36c34b931dbdcedf094cd283',
                        outIdx: 0,
                    },
                    inputScript:
                        '47304402206d2c4bada7e705e12f7e8e21b2bfb7a6cf0b02dcb7ffc6b21f1a866dc0e7c7a10220667c1d970506cdae180a78888cf10cf9ada6800b4db22f06a8f4ae5c40aeea16412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 3300n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c50000101044d494e5420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb10102080000000000000064',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 100n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: true,
                        entryIdx: 0,
                        atoms: 0n,
                    },
                    spentBy: {
                        txid: 'dd9018d0037fee4094c2445b23ed9eef65d456db3f2b9c053ad39ee6505fca44',
                        outIdx: 0,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 2280n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1711861819,
            size: 472,
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
                    txType: 'MINT',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 838323,
                hash: '000000000000000011466b30b743ea02424347838273e890d6a9f1afbc16f66e',
                timestamp: 1711868662,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        parsed: {
            satoshisSent: 3372,
            stackArray: [
                '534c5000',
                '01',
                '4d494e54',
                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                '02',
                '0000000000000064',
            ],
            xecTxType: 'Sent',
            recipients: [],
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'MINT',
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenSatoshis: '100',
                },
            ],
        },
    },
    {
        description: 'SLP ad setup tx, NFT',
        tx: {
            txid: '972fd1322542740835a3f7e6d0917e5ac1ab6f20c5bfb40edbfb4ca73a144194',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c886d9d73b0c2592fb2df95cf0bb832c8077ff8adec132ee3cff5ba576f4ed1e',
                        outIdx: 1,
                    },
                    inputScript:
                        '419d3ac0b32abebc181c55e5a45c25d5050f73ba1269348829f4d5677131e3c627f73a552bf003de5d86423ce3f47fd4fd116eba837be72a3cef6f002158b0482a412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: '03672250bda1410ffa9b1c2cf3dc8c456bcb7a54e8dff0a7686bcce6ba82cf1b',
                        outIdx: 2,
                    },
                    inputScript:
                        '41f444904158cb70106321dc09161d7bf3dde584e541c73d21f46a19c176c10e1c3ea79252e52878a0f11f5c6b896d8adc5c75d1c6039e750c31ab07114d2f3bca412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1748n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3080000000000000001',
                    sats: 0n,
                },
                {
                    outputScript:
                        'a91463b7313157fb1d054919364c837d8af927fa569987',
                    token: {
                        tokenId:
                            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    spentBy: {
                        txid: 'c7fe7ac1f29c34e0795786b609622f6439cfde52246f31cba89aa0b28c8542ee',
                        outIdx: 0,
                    },
                    sats: 860n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1012n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1729632267,
            size: 422,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    groupTokenId:
                        'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 867731,
                hash: '000000000000000023e84eda63a1c6cce9c8e1d8b6484ee3dba0bf13b38d9116',
                timestamp: 1729632495,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        parsed: {
            satoshisSent: 860,
            stackArray: [
                '534c5000',
                '41',
                '53454e44',
                'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                '0000000000000001',
            ],
            xecTxType: 'Sent',
            recipients: ['ecash:pp3mwvf32la36p2frymyeqma3tuj07jknyhljj09qd'],
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'NFT',
                    renderedTxType: 'Agora Offer',
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                    tokenSatoshis: '1',
                },
            ],
        },
    },
    {
        description: 'Agora one-shot buy',
        tx: {
            txid: '8880046b7b34da75f405abf8e76237082ed83f6a6293b378f83629320bf57097',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c7fe7ac1f29c34e0795786b609622f6439cfde52246f31cba89aa0b28c8542ee',
                        outIdx: 1,
                    },
                    inputScript:
                        '2102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd879540c4da30dce1304b58ad7e2b8f87729d2b7c5f7c2390e8bbc33bebcc7c80503c992801df01dad963adb737892e0d3499875b99477f65786c45e9146610a219fe104c5aee42858cb2a09aa8cb316f2452decf39642f6209b6865779e0349cf2c17afec70100000001ac2202000000000000ffffffffc996989ea840ccd9e2f0324dc0accbe26a32c3c8bd5d710ce18f68acaafdb3d300000000c10000004422020000000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac7a3d160c000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac514cb0634c6b0000000000000000406a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df30800000000000000000800000000000000013ea74b04000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac7c7eaa7801327f7701207f7588520144807c7ea86f7bbb7501c17e7c672103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba668abac',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    outputScript:
                        'a914dec4855b83573e56312d9f3852697a48c09ee6b087',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: 'd8a564b6aa82861ea16864ef83d0ec81ecf8cb13c0a59c2737a444c7b880368d',
                        outIdx: 3,
                    },
                    inputScript:
                        '414964793d1de39477192d9ee1491c49973303b18b594b249cfb0b9b752826f0ccc9da5ebf1dde9de63f5e5825b3e7257f48e1310920e30e28e83beada1f21be58412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 19360n,
                },
                {
                    prevOut: {
                        txid: '4fdcf99a029298ca1e3a692c4485711d22e7eb6aeb76d58354666e0a87260a4a',
                        outIdx: 1,
                    },
                    inputScript:
                        '41c60f1f0f70dd45780f5b5a48e7e8e823ab04ae5f2b652c68d36856d7999e65423c88f4315bde6eeebe1c263e27b5275453a52c33962eddd704ec63330482cbde412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 11007n,
                },
                {
                    prevOut: {
                        txid: '9191385318562f9b9491cb51dd336054ff48086effdb603ce4d070ec27b0a310',
                        outIdx: 1,
                    },
                    inputScript:
                        '418a65da44dc054c90c718cafe5a8eb1a58a40f1c2864a356152eadb6ad439f66f7e457f09821fb53b07bd50d68baa64abed6134f98d18c2da4050496c54341a4c412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 5235n,
                },
                {
                    prevOut: {
                        txid: 'e85c851664f633ac3888908be544d379b6a300ecd7e3ba3b7d8895ff4bcd2907',
                        outIdx: 1,
                    },
                    inputScript:
                        '41db37e18dda29041f7f931bb895777ec8bea1f6341dc48a144a2deac2545519892c19c050bfe8eb32143a5860ef4343079cb0b6705f2b72e8555f3b96badd3e82412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 4201n,
                },
                {
                    prevOut: {
                        txid: '2bec8ef2b93a4cc859d2b5eef36516d5e559ed6c8ba14437ebd910d7110e8e7b',
                        outIdx: 2,
                    },
                    inputScript:
                        '41f5ad3937e27b09550dfac33838bb0acfe61bf69378c3fbd6fb145ce48cf0cd9fc7e2b4abfcb17616dedecd33e84a860c5f2ceea50ea0e59a59e7fa4e87b478ce412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 19901n,
                },
                {
                    prevOut: {
                        txid: '528fc61b8fe7131dcba81c99a4604c409aafe6faaf4286e21da07cae92bdf586',
                        outIdx: 2,
                    },
                    inputScript:
                        '41346e924f1a559129de3bb6f8bfb9358aae0401ab6dcc49c9e974bed7b94b246f001ec19ed7c682d945426882abce9f5bebdd984845b2c127c0f2549fcee5aec9412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 12964n,
                },
                {
                    prevOut: {
                        txid: '5963aebb41910aee8014cbbf2e2fb487dcbecb8b4a66b26e07f5b6542355bbf7',
                        outIdx: 1,
                    },
                    inputScript:
                        '41f5295566cdf6a64102474a4cf1a90c0be1f734a01a7c553d28d79543de93991633b67473c7cd859f14f4682942ea08b8f399abc3d9aba4d3017931ae61f677d4412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 274781657n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3080000000000000000080000000000000001',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 72066878n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 202784122n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1729713477,
            size: 1654,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    groupTokenId:
                        'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        parsed: {
            recipients: ['ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035'],
            satoshisSent: 72066878,
            stackArray: [
                '534c5000',
                '41',
                '53454e44',
                'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                '0000000000000000',
                '0000000000000001',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'NFT',
                    renderedTxType: 'Agora Buy',
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                    tokenSatoshis: '1',
                },
            ],
        },
    },
    {
        description: 'Agora one-shot sale',
        tx: {
            txid: '8880046b7b34da75f405abf8e76237082ed83f6a6293b378f83629320bf57097',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c7fe7ac1f29c34e0795786b609622f6439cfde52246f31cba89aa0b28c8542ee',
                        outIdx: 1,
                    },
                    inputScript:
                        '2102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd879540c4da30dce1304b58ad7e2b8f87729d2b7c5f7c2390e8bbc33bebcc7c80503c992801df01dad963adb737892e0d3499875b99477f65786c45e9146610a219fe104c5aee42858cb2a09aa8cb316f2452decf39642f6209b6865779e0349cf2c17afec70100000001ac2202000000000000ffffffffc996989ea840ccd9e2f0324dc0accbe26a32c3c8bd5d710ce18f68acaafdb3d300000000c10000004422020000000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac7a3d160c000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac514cb0634c6b0000000000000000406a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df30800000000000000000800000000000000013ea74b04000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac7c7eaa7801327f7701207f7588520144807c7ea86f7bbb7501c17e7c672103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba668abac',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    outputScript:
                        'a914dec4855b83573e56312d9f3852697a48c09ee6b087',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: 'd8a564b6aa82861ea16864ef83d0ec81ecf8cb13c0a59c2737a444c7b880368d',
                        outIdx: 3,
                    },
                    inputScript:
                        '414964793d1de39477192d9ee1491c49973303b18b594b249cfb0b9b752826f0ccc9da5ebf1dde9de63f5e5825b3e7257f48e1310920e30e28e83beada1f21be58412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 19360n,
                },
                {
                    prevOut: {
                        txid: '4fdcf99a029298ca1e3a692c4485711d22e7eb6aeb76d58354666e0a87260a4a',
                        outIdx: 1,
                    },
                    inputScript:
                        '41c60f1f0f70dd45780f5b5a48e7e8e823ab04ae5f2b652c68d36856d7999e65423c88f4315bde6eeebe1c263e27b5275453a52c33962eddd704ec63330482cbde412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 11007n,
                },
                {
                    prevOut: {
                        txid: '9191385318562f9b9491cb51dd336054ff48086effdb603ce4d070ec27b0a310',
                        outIdx: 1,
                    },
                    inputScript:
                        '418a65da44dc054c90c718cafe5a8eb1a58a40f1c2864a356152eadb6ad439f66f7e457f09821fb53b07bd50d68baa64abed6134f98d18c2da4050496c54341a4c412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 5235n,
                },
                {
                    prevOut: {
                        txid: 'e85c851664f633ac3888908be544d379b6a300ecd7e3ba3b7d8895ff4bcd2907',
                        outIdx: 1,
                    },
                    inputScript:
                        '41db37e18dda29041f7f931bb895777ec8bea1f6341dc48a144a2deac2545519892c19c050bfe8eb32143a5860ef4343079cb0b6705f2b72e8555f3b96badd3e82412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 4201n,
                },
                {
                    prevOut: {
                        txid: '2bec8ef2b93a4cc859d2b5eef36516d5e559ed6c8ba14437ebd910d7110e8e7b',
                        outIdx: 2,
                    },
                    inputScript:
                        '41f5ad3937e27b09550dfac33838bb0acfe61bf69378c3fbd6fb145ce48cf0cd9fc7e2b4abfcb17616dedecd33e84a860c5f2ceea50ea0e59a59e7fa4e87b478ce412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 19901n,
                },
                {
                    prevOut: {
                        txid: '528fc61b8fe7131dcba81c99a4604c409aafe6faaf4286e21da07cae92bdf586',
                        outIdx: 2,
                    },
                    inputScript:
                        '41346e924f1a559129de3bb6f8bfb9358aae0401ab6dcc49c9e974bed7b94b246f001ec19ed7c682d945426882abce9f5bebdd984845b2c127c0f2549fcee5aec9412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 12964n,
                },
                {
                    prevOut: {
                        txid: '5963aebb41910aee8014cbbf2e2fb487dcbecb8b4a66b26e07f5b6542355bbf7',
                        outIdx: 1,
                    },
                    inputScript:
                        '41f5295566cdf6a64102474a4cf1a90c0be1f734a01a7c553d28d79543de93991633b67473c7cd859f14f4682942ea08b8f399abc3d9aba4d3017931ae61f677d4412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 274781657n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3080000000000000000080000000000000001',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 72066878n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 202784122n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1729713477,
            size: 1654,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    groupTokenId:
                        'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        parsed: {
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'NFT',
                    renderedTxType: 'Agora Sale',
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                    tokenSatoshis: '1',
                },
            ],
            recipients: ['ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj'],
            replyAddress: 'ecash:pr0vfp2msdtnu4339k0ns5nf0fyvp8hxkqxcuyfhrp',
            satoshisSent: 72066878,
            stackArray: [
                '534c5000',
                '41',
                '53454e44',
                'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                '0000000000000000',
                '0000000000000001',
            ],
            xecTxType: 'Received',
        },
    },
    {
        description: 'Agora partial listing cancellation',
        tx: {
            txid: 'e9d594e054bf9a7cead11cdc31953f0e45782c97c6298513f41b70eb408aa1a8',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '58ec58688cef1d0abe2ee30c15f84af51833e61e998841fac3ecbcadafc31233',
                        outIdx: 2,
                    },
                    inputScript:
                        '41fd18138ab17386e9599e54d9d5f1994d1c4add3af860b1ece44b71d04bc7e7cd799e1234e2959236cd38558713d7fdb797a894c527906b0235a38519ad63fbea4121024f624d04900c2e3b7ea6014cb257f525b6d229db274bceeadbb1f06c07776e82',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9147847fe7070bec8567b3e810f543f2f80cc3e03be88ac',
                    sats: 975251n,
                },
                {
                    prevOut: {
                        txid: '0c580a7dbfb7f160f0e4623faa24eb0475b2220704c8c46f279a479a477433f8',
                        outIdx: 1,
                    },
                    inputScript:
                        '0441475230075041525449414c4113bb98283dc7a2f69957940bb3a45f4ec6050b61bcc1b1134d786727e379c8793107bf0d0b0e051665ab3eed2cca34901646cf564a1ab52cb32668da229eef0b41004d5f014c766a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8080000000000000000030276a4000000000000e815000000000000a24a2600000000004b4a343a024f624d04900c2e3b7ea6014cb257f525b6d229db274bceeadbb1f06c07776e8208948eff7f00000000ab7b63817b6ea2697603a24a26a269760376a4009700887d94527901377f75789263587e780376a400965580bc030000007e7e68587e52790376a400965580bc030000007e7e825980bc7c7e0200007e7b02e7159302e8159656807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702dd007f5c7f7701207f547f75044b4a343a886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 855738679296n,
                    },
                    outputScript:
                        'a914cb61d733f8e99b1b40d40a53a59aca8a08368a6f87',
                    sats: 546n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f808000000c73e000000',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a9147847fe7070bec8567b3e810f543f2f80cc3e03be88ac',
                    token: {
                        tokenId:
                            '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 855738679296n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a9147847fe7070bec8567b3e810f543f2f80cc3e03be88ac',
                    sats: 973723n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1729789538,
            size: 760,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 867971,
                hash: '000000000000000013f3d459ae121dc1494e7e9fe57c2e60cf393184d7ab6dc9',
                timestamp: 1729793460,
            },
        },
        walletHashes: ['7847fe7070bec8567b3e810f543f2f80cc3e03be'],
        parsed: {
            recipients: [],
            satoshisSent: 974269,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                '000000c73e000000',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'Agora Cancel',
                    tokenId:
                        '20a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8',
                    tokenSatoshis: '855738679296',
                },
            ],
        },
    },
    {
        description: 'Another agora partial buy tx',
        tx: {
            txid: '3ada11ca38e5da8bfda9b045ab7412cecff5b788aad8e49673183010e725099e',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '20469a4316506e0fea99ad0673d6663f2f546c0aad84b741e08c4d0f9248b18c',
                        outIdx: 1,
                    },
                    inputScript:
                        '0441475230075041525449414c21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1404799ed59b763768b8e7385a35c0a357e624e1725154d4c3240f38edc021527b267881f2078be11f89221f6c8036c156274742dae00ce8a88bb6ee527bc18dc744422020000000000001976a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac4d420100000000001976a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac4d32018cb148920f4d8ce041b784ad0a6c542f3f66d67306ad99ea0f6e5016439a462001000000d97b63817b6ea26976046de4ff17a26976033b62109700887d94527901377f75789263587e78033b6210965880bc007e7e68587e5279033b6210965880bc007e7e825980bc7c7e01007e7b03288f009303298f009657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d9007f5c7f7701207f547f7504f3282c4e886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c880441475230872202000000000000ffffffffca3033eea929796cc020b87c909e38d37943502aa69486f2d97d56daa454e28df3282c4ec1000000046de4ff17514d5b014c766a04534c500001010453454e442001d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f89608000000000000000000013b62100000000000298f0000000000006de4ff1700000000f3282c4e03771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba608f06cff7f00000000ab7b63817b6ea26976046de4ff17a26976033b62109700887d94527901377f75789263587e78033b6210965880bc007e7e68587e5279033b6210965880bc007e7e825980bc7c7e01007e7b03288f009303298f009657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d9007f5c7f7701207f547f7504f3282c4e886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 2000n,
                    },
                    plugins: {
                        agora: {
                            groups: [
                                '5003771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                                '5401d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                                '4601d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                            ],
                            data: [
                                '5041525449414c',
                                '00',
                                '01',
                                '3b62100000000000',
                                '298f000000000000',
                                '6de4ff1700000000',
                                'f3282c4e',
                            ],
                        },
                    },
                    outputScript:
                        'a914563178ea073228709397a2c98baf10677e683e6687',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: 'bfce47f2403031f5465982b821e8e14c78deff2dd5986ca0c21cebb5ed946b4d',
                        outIdx: 2,
                    },
                    inputScript:
                        '41866f21d34e5b061cf7cb9ce4a6ce4df037628b72765db893675eae909ddad9d7ea7593d1a510fee1d80887699410b4330e9214efd5668dd51644d7ffce498ac94121039f0061726e4fed07061f705d34707b7f9c2f175bfa2ca7fe7df0a81e9efe1e8b',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac',
                    sats: 2898252n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e442001d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896080000000000000000080000000000000659080000000000000177',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '5d934ade992707fe126bcd393ad4358b2c10118b635df4b97e3e3f30ca7cc781',
                        outIdx: 1,
                    },
                    sats: 2812672n,
                },
                {
                    outputScript:
                        'a91451d609999740085f16cfbee2f9791d6ae6ac678d87',
                    plugins: {
                        agora: {
                            groups: [
                                '5003771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                                '5401d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                                '4601d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                            ],
                            data: [
                                '5041525449414c',
                                '00',
                                '01',
                                '3b62100000000000',
                                '298f000000000000',
                                '6de4ff1700000000',
                                'f3282c4e',
                            ],
                        },
                    },
                    token: {
                        tokenId:
                            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1625n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac',
                    token: {
                        tokenId:
                            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 375n,
                    },
                    spentBy: {
                        txid: 'f0e450b41d1c15b32478efb668bc562fa341a40fa799db7747228350295f84d4',
                        outIdx: 0,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac',
                    spentBy: {
                        txid: '3a7a8971392e74fd542498c055509ace4f4853b981d87d73ba045f77100dad1e',
                        outIdx: 1,
                    },
                    sats: 82509n,
                },
            ],
            lockTime: 1311516915,
            timeFirstSeen: 1730860384,
            size: 1256,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 869782,
                hash: '0000000000000000178954cd24752cd8fb8aa980c36012a16cec251d8c2f68d6',
                timestamp: 1730861016,
            },
        },
        walletHashes: ['2aba37d6365d3e570cadf3ed65e58ae4ad751a30'],
        parsed: {
            recipients: [
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                'ecash:ppgavzvejaqqshcke7lw97ter44wdtr835rs9eedxc',
            ],
            satoshisSent: 2813218,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                '0000000000000000',
                '0000000000000659',
                '0000000000000177',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'Agora Buy',
                    tokenId:
                        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                    tokenSatoshis: '375',
                },
            ],
        },
    },
    {
        description: 'Another agora partial sell tx',
        tx: {
            txid: '3ada11ca38e5da8bfda9b045ab7412cecff5b788aad8e49673183010e725099e',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '20469a4316506e0fea99ad0673d6663f2f546c0aad84b741e08c4d0f9248b18c',
                        outIdx: 1,
                    },
                    inputScript:
                        '0441475230075041525449414c21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1404799ed59b763768b8e7385a35c0a357e624e1725154d4c3240f38edc021527b267881f2078be11f89221f6c8036c156274742dae00ce8a88bb6ee527bc18dc744422020000000000001976a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac4d420100000000001976a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac4d32018cb148920f4d8ce041b784ad0a6c542f3f66d67306ad99ea0f6e5016439a462001000000d97b63817b6ea26976046de4ff17a26976033b62109700887d94527901377f75789263587e78033b6210965880bc007e7e68587e5279033b6210965880bc007e7e825980bc7c7e01007e7b03288f009303298f009657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d9007f5c7f7701207f547f7504f3282c4e886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c880441475230872202000000000000ffffffffca3033eea929796cc020b87c909e38d37943502aa69486f2d97d56daa454e28df3282c4ec1000000046de4ff17514d5b014c766a04534c500001010453454e442001d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f89608000000000000000000013b62100000000000298f0000000000006de4ff1700000000f3282c4e03771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba608f06cff7f00000000ab7b63817b6ea26976046de4ff17a26976033b62109700887d94527901377f75789263587e78033b6210965880bc007e7e68587e5279033b6210965880bc007e7e825980bc7c7e01007e7b03288f009303298f009657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d9007f5c7f7701207f547f7504f3282c4e886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 2000n,
                    },
                    plugins: {
                        agora: {
                            groups: [
                                '5003771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                                '5401d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                                '4601d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                            ],
                            data: [
                                '5041525449414c',
                                '00',
                                '01',
                                '3b62100000000000',
                                '298f000000000000',
                                '6de4ff1700000000',
                                'f3282c4e',
                            ],
                        },
                    },
                    outputScript:
                        'a914563178ea073228709397a2c98baf10677e683e6687',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: 'bfce47f2403031f5465982b821e8e14c78deff2dd5986ca0c21cebb5ed946b4d',
                        outIdx: 2,
                    },
                    inputScript:
                        '41866f21d34e5b061cf7cb9ce4a6ce4df037628b72765db893675eae909ddad9d7ea7593d1a510fee1d80887699410b4330e9214efd5668dd51644d7ffce498ac94121039f0061726e4fed07061f705d34707b7f9c2f175bfa2ca7fe7df0a81e9efe1e8b',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac',
                    sats: 2898252n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e442001d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896080000000000000000080000000000000659080000000000000177',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    spentBy: {
                        txid: '5d934ade992707fe126bcd393ad4358b2c10118b635df4b97e3e3f30ca7cc781',
                        outIdx: 1,
                    },
                    sats: 2812672n,
                },
                {
                    outputScript:
                        'a91451d609999740085f16cfbee2f9791d6ae6ac678d87',
                    plugins: {
                        agora: {
                            groups: [
                                '5003771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                                '5401d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                                '4601d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                            ],
                            data: [
                                '5041525449414c',
                                '00',
                                '01',
                                '3b62100000000000',
                                '298f000000000000',
                                '6de4ff1700000000',
                                'f3282c4e',
                            ],
                        },
                    },
                    token: {
                        tokenId:
                            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1625n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac',
                    token: {
                        tokenId:
                            '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 375n,
                    },
                    spentBy: {
                        txid: 'f0e450b41d1c15b32478efb668bc562fa341a40fa799db7747228350295f84d4',
                        outIdx: 0,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a9142aba37d6365d3e570cadf3ed65e58ae4ad751a3088ac',
                    spentBy: {
                        txid: '3a7a8971392e74fd542498c055509ace4f4853b981d87d73ba045f77100dad1e',
                        outIdx: 1,
                    },
                    sats: 82509n,
                },
            ],
            lockTime: 1311516915,
            timeFirstSeen: 1730860384,
            size: 1256,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 869782,
                hash: '0000000000000000178954cd24752cd8fb8aa980c36012a16cec251d8c2f68d6',
                timestamp: 1730861016,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88'],
        parsed: {
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'Agora Sale',
                    tokenId:
                        '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                    tokenSatoshis: '375',
                },
            ],
            recipients: [
                'ecash:ppgavzvejaqqshcke7lw97ter44wdtr835rs9eedxc',
                'ecash:qq4t5d7kxewnu4cv4he76e093tj26ag6xql82hcgru',
            ],
            replyAddress: 'ecash:pptrz782quezsuynj73vnza0zpnhu6p7vcj7g5qlfr',
            satoshisSent: 2812672,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '01d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f896',
                '0000000000000000',
                '0000000000000659',
                '0000000000000177',
            ],
            xecTxType: 'Received',
        },
    },
    {
        description: 'Another agora partial cancel',
        tx: {
            txid: '1e68af94c0117223511e3d7f7b6f0f6c2ffa07972844ff6d04f7f37d36ad5b50',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'ea28b2d3db0d4972eb56f2f20473fe821a6d46f328ecc5e97c4c3e353ff22a52',
                        outIdx: 3,
                    },
                    inputScript:
                        '415ece5326f001de92ce37d34b6ada073c3f60b52231b8291e1d4900c4813b93379dfc3e11ed417c58fce9fc1ead27b5754d4d2c8ff3d6949e694a9529afea0f4c412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 661543961n,
                },
                {
                    prevOut: {
                        txid: '44aa224b6eb5058717d1403d7376ef48e0eae2e4065303f0f9452782aad9f541',
                        outIdx: 2,
                    },
                    inputScript:
                        '0441475230075041525449414c4195484212249b53096fa43b1dc39559f9671cd305b4715c063c486b2fc30eec194685f027c560742da8746b61aacfb05dd039d8e519fa7ca065d7fe3188fa63df41004d5a014c766a04534c500001010453454e4420b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc0800000000000000000001f588410000000000f980000000000000f588410000000000bbbcb84f03771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba608bbd1b77e00000000ab7b63817b6ea2697603f58841a2697603f588419700887d94527901377f75789263587e7803f58841965880bc007e7e68587e527903f58841965880bc007e7e825980bc7c7e01007e7b03f880009303f980009657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d8007f5c7f7701207f547f7504bbbcb84f886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 495n,
                    },
                    outputScript:
                        'a914b069fa99f084a259a6a31cc8cf33edb8a853fbb587',
                    sats: 546n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e4420b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc0800000000000001ef',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 495n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 661543206n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1729825975,
            size: 755,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
        },
        walletHashes: [undefined],
        parsed: {
            recipients: ['ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035'],
            satoshisSent: 0,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
                '00000000000001ef',
            ],
            xecTxType: 'Received',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'Agora Cancel',
                    tokenId:
                        'b8f2a9e767a0be7b80c7e414ef2534586d4da72efddb39a4e70e501ab73375cc',
                    tokenSatoshis: '495',
                },
            ],
            replyAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        },
    },
    {
        description: 'Agora one-shot listing cancellation',
        tx: {
            txid: 'a57b6b00b328f0c6a916f6469dcc4e05ab202e7eca82f4cda5dbd736064910d9',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '9dad6def1241cea3ef1942e53ed0a34163da41fc726feb304fbd4d27482ce063',
                        outIdx: 1,
                    },
                    inputScript:
                        '419b8ec92ca5701691d9f5e75d525532cbec6ed9d9ed81f8f982b5af76090289d001ce2022ec82ba096c99beb00b0d9b0a92f2ef8da269a7967e6856170796beac41004cb0634c6b0000000000000000406a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df308000000000000000008000000000000000164594e05000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac7c7eaa7801327f7701207f7588520144807c7ea86f7bbb7501c17e7c672102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd879568abac',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    outputScript:
                        'a91451a5d608ff31c1585d7aba3a2afcd2ae02898abd87',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: '9cf904c798295bfee43670162dc816e25d129ae9a0b13a41f11560cf7dbbb5b8',
                        outIdx: 3,
                    },
                    inputScript:
                        '41ccbca2638a68145ecc38c8a96c058dff2619b8d495360e0b5866de555f1c6b621ef147df1a9e0f5bee006d1db94e1e2670915265d38f3ba801114037ed0d441d412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 1153n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001410453454e4420f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3080000000000000001',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                            number: 65,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1729720346,
            size: 535,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                        number: 65,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    groupTokenId:
                        'd2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        parsed: {
            recipients: ['ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj'],
            satoshisSent: 0,
            stackArray: [
                '534c5000',
                '41',
                '53454e44',
                'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                '0000000000000001',
            ],
            xecTxType: 'Received',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'NFT',
                    renderedTxType: 'Agora Cancel',
                    tokenId:
                        'f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
                    tokenSatoshis: '1',
                },
            ],
            replyAddress: 'ecash:ppg6t4sglucuzkza02ar52hu62hq9zv2h5jjktp2kp',
        },
    },
    {
        description: 'Buy 14 bux is rendered as buy 14',
        tx: {
            txid: '6c6b32e7d68f5743dceec779c61ebe45dc1e8ca7562821ae974c71ef8d2450a7',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'f696ae69fb2d7f7253f1fc98aba1a6312c92e98dd691d9825f633aaf7b0f2417',
                        outIdx: 1,
                    },
                    inputScript:
                        '0441475230075041525449414c21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1400c2c91f9168505022957e651ce0d876ec90a483dec8eb83f9a2897cd0b1640962dcab03e0df52f086db75351d10c01386ff2dcf4e774ee09b5dcf6b96ced6b254422020000000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688acc5728209000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac4d280117240f7baf3a635f82d991d68de9922c31a6a1ab98fcf153727f2dfb69ae96f601000000cf7b63817b6ea269760460368f02a2697602c6109700887d94527901377f75789263587e7802c610965880bc007e7e68587e527902c610965880bc007e7e825980bc7c7e007e7b5d935e9658807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702cf007f5c7f7701207f547f750443840647886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c880441475230872202000000000000ffffffffb0f7a847759b44cb4dd22554924cf5dae4d946b5aa04372b20eb218d43210b4243840647c10000000422ad0024514d51014c766a04534c500001010453454e44207e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e50800000000000000000000c6100000000000000e0000000000000060368f020000000043840647037f1729ee682b22da2b5dd8a11779ec7b80739c4b5d4b48f83c35d83fbb40a21208c09ef87f00000000ab7b63817b6ea269760460368f02a2697602c6109700887d94527901377f75789263587e7802c610965880bc007e7e68587e527902c610965880bc007e7e825980bc7c7e007e7b5d935e9658807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702cf007f5c7f7701207f547f750443840647886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 500000n,
                    },
                    outputScript:
                        'a9149c2c40a0a571b35e2e6cca5c224d0c948096a36b87',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: '20d870129eab4418cf8917731ba9f240d5ac6a938d0570af2912f3ed77162d34',
                        outIdx: 2,
                    },
                    inputScript:
                        '41fb428d1c14340d4ef10c55202db803232018f0ae41777503c4a9cb78b4659fad4540f27314c74b9247a1c88937c5594ef908f5e916dddd5b054f290c5a8807a4412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 32055n,
                },
                {
                    prevOut: {
                        txid: '2cd92dbce9696b704ae7235e31d0840d728ad11217631dee849d49624f91ffd4',
                        outIdx: 0,
                    },
                    inputScript:
                        '4102e2c50dc6e3c3d8151c950075bc997dbe4762b1c59bcbe3cdd124566d1925bcecb466d21d32133b68fb8579b79e538f4b8dd61832374f2f713f328c3fc850ab412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 3300n,
                },
                {
                    prevOut: {
                        txid: '874d3ddb44d022952d3686d39d219c7fdf21327eaa852d2d249102bec026ec4a',
                        outIdx: 3,
                    },
                    inputScript:
                        '412f68bc4b72f9df1435d4046719b793556295fbe02d80c8752acf587afac49d09f160ba04f2dfd5c1fa9ae5e294e31d5b8efc331074cefa08bfe7e2106e46b34a412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 202656827n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e44207e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5080000000000000000080000000000057ba508000000000002257b',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914dee50f576362377dd2f031453c0bb09009acaf8188ac',
                    sats: 43144579n,
                },
                {
                    outputScript:
                        'a914502ed21ca74bde03d7fb672ed9c996eab92e72fd87',
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 359333n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 140667n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    spentBy: {
                        txid: '40c5a257a9797bf9cb44f0f1fe7ee08d732a151c70f1a038487bac4a431b7787',
                        outIdx: 1,
                    },
                    sats: 159544005n,
                },
            ],
            lockTime: 1191609411,
            timeFirstSeen: 1729812060,
            size: 1518,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 867988,
                hash: '000000000000000029b0040b966ade65e7217457758ef4c1a9f524bacc30baf5',
                timestamp: 1729813559,
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        parsed: {
            recipients: [
                'ecash:qr0w2r6hvd3rwlwj7qc520qtkzgqnt90sypk26yd2u',
                'ecash:ppgza5su5a9auq7hldnjakwfjm4tjtnjl54xmlf83s',
            ],
            satoshisSent: 43145125,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                '0000000000000000',
                '0000000000057ba5',
                '000000000002257b',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'Agora Buy',
                    tokenId:
                        '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                    tokenSatoshis: '140667',
                },
            ],
        },
    },
    {
        description: 'Sell 14 bux is rendered as sell 14',
        tx: {
            txid: '6c6b32e7d68f5743dceec779c61ebe45dc1e8ca7562821ae974c71ef8d2450a7',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'f696ae69fb2d7f7253f1fc98aba1a6312c92e98dd691d9825f633aaf7b0f2417',
                        outIdx: 1,
                    },
                    inputScript:
                        '0441475230075041525449414c21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1400c2c91f9168505022957e651ce0d876ec90a483dec8eb83f9a2897cd0b1640962dcab03e0df52f086db75351d10c01386ff2dcf4e774ee09b5dcf6b96ced6b254422020000000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688acc5728209000000001976a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac4d280117240f7baf3a635f82d991d68de9922c31a6a1ab98fcf153727f2dfb69ae96f601000000cf7b63817b6ea269760460368f02a2697602c6109700887d94527901377f75789263587e7802c610965880bc007e7e68587e527902c610965880bc007e7e825980bc7c7e007e7b5d935e9658807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702cf007f5c7f7701207f547f750443840647886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c880441475230872202000000000000ffffffffb0f7a847759b44cb4dd22554924cf5dae4d946b5aa04372b20eb218d43210b4243840647c10000000422ad0024514d51014c766a04534c500001010453454e44207e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e50800000000000000000000c6100000000000000e0000000000000060368f020000000043840647037f1729ee682b22da2b5dd8a11779ec7b80739c4b5d4b48f83c35d83fbb40a21208c09ef87f00000000ab7b63817b6ea269760460368f02a2697602c6109700887d94527901377f75789263587e7802c610965880bc007e7e68587e527902c610965880bc007e7e825980bc7c7e007e7b5d935e9658807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702cf007f5c7f7701207f547f750443840647886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 500000n,
                    },
                    outputScript:
                        'a9149c2c40a0a571b35e2e6cca5c224d0c948096a36b87',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: '20d870129eab4418cf8917731ba9f240d5ac6a938d0570af2912f3ed77162d34',
                        outIdx: 2,
                    },
                    inputScript:
                        '41fb428d1c14340d4ef10c55202db803232018f0ae41777503c4a9cb78b4659fad4540f27314c74b9247a1c88937c5594ef908f5e916dddd5b054f290c5a8807a4412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 32055n,
                },
                {
                    prevOut: {
                        txid: '2cd92dbce9696b704ae7235e31d0840d728ad11217631dee849d49624f91ffd4',
                        outIdx: 0,
                    },
                    inputScript:
                        '4102e2c50dc6e3c3d8151c950075bc997dbe4762b1c59bcbe3cdd124566d1925bcecb466d21d32133b68fb8579b79e538f4b8dd61832374f2f713f328c3fc850ab412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 3300n,
                },
                {
                    prevOut: {
                        txid: '874d3ddb44d022952d3686d39d219c7fdf21327eaa852d2d249102bec026ec4a',
                        outIdx: 3,
                    },
                    inputScript:
                        '412f68bc4b72f9df1435d4046719b793556295fbe02d80c8752acf587afac49d09f160ba04f2dfd5c1fa9ae5e294e31d5b8efc331074cefa08bfe7e2106e46b34a412102c237f49dd4c812f27b09d69d4c8a4da12744fda8ad63ce151fed2a3f41fd8795',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 202656827n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c500001010453454e44207e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5080000000000000000080000000000057ba508000000000002257b',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914dee50f576362377dd2f031453c0bb09009acaf8188ac',
                    sats: 43144579n,
                },
                {
                    outputScript:
                        'a914502ed21ca74bde03d7fb672ed9c996eab92e72fd87',
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 359333n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 140667n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    spentBy: {
                        txid: '40c5a257a9797bf9cb44f0f1fe7ee08d732a151c70f1a038487bac4a431b7787',
                        outIdx: 1,
                    },
                    sats: 159544005n,
                },
            ],
            lockTime: 1191609411,
            timeFirstSeen: 1729812060,
            size: 1518,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                        number: 1,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 867988,
                hash: '000000000000000029b0040b966ade65e7217457758ef4c1a9f524bacc30baf5',
                timestamp: 1729813559,
            },
        },
        walletHashes: ['dee50f576362377dd2f031453c0bb09009acaf81'],
        parsed: {
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'Agora Sale',
                    tokenId:
                        '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                    tokenSatoshis: '140667',
                },
            ],
            recipients: [
                'ecash:ppgza5su5a9auq7hldnjakwfjm4tjtnjl54xmlf83s',
                'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            ],
            replyAddress: 'ecash:pzwzcs9q54cmxh3wdn99cgjdpj2gp94rdvy2wuu50y',
            satoshisSent: 43144579,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
                '0000000000000000',
                '0000000000057ba5',
                '000000000002257b',
            ],
            xecTxType: 'Received',
        },
    },
    {
        description: 'SLP1 NFT Parent mint tx',
        tx: {
            txid: 'af8d9508e488e7c9462cb9bb9d9b68f246cec6394676d1f660331bfe1f4e1fd2',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                        outIdx: 2,
                    },
                    inputScript:
                        '413bcbae418f71ecbc9b5a2ecbe9d7d7bd61a7473399ccfe4176e62fe51fe4cdba2dc8cb42088207ee4daf8c4a618e7e4a9773f969e681c8e2b552b13fc8ddc8e8412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: true,
                        entryIdx: 0,
                        atoms: 0n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: '607b7bb1a4d95efbeee42d98fc7b3b2fd3ed3dcfc6aea192f56839b405982889',
                        outIdx: 2,
                    },
                    inputScript:
                        '41f5fe8b075e9f9ab3b3c69b8e5621c9de49c4daffb698097149bdb57f4d472e0d1a9692df4d07ec64d4102c10a76bdc6bc6ef9df630061b34a1d19f50f1e97ef4412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 71580707n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04534c50000181044d494e54205a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f86200102080000000000000001',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                            number: 129,
                        },
                        isMintBaton: true,
                        entryIdx: 0,
                        atoms: 0n,
                    },
                    spentBy: {
                        txid: '5d934ade992707fe126bcd393ad4358b2c10118b635df4b97e3e3f30ca7cc781',
                        outIdx: 0,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 71579701n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1730953527,
            size: 460,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                        number: 129,
                    },
                    txType: 'MINT',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 869927,
                hash: '00000000000000001d5912840b0d830c3d491f273b15ac9f5bcd0234456dfb5a',
                timestamp: 1730954146,
            },
        },
        walletHashes: ['76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac'],
        parsed: {
            recipients: [],
            satoshisSent: 71580793,
            stackArray: [
                '534c5000',
                '81',
                '4d494e54',
                '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                '02',
                '0000000000000001',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'Collection',
                    renderedTxType: 'MINT',
                    tokenId:
                        '5a9d91ae2730dffbd0795dd2f8bfda5a6ad905f374158c8df303ca5cc82f8620',
                    tokenSatoshis: '1',
                },
            ],
        },
    },
    {
        description: 'ALP burn tx',
        tx: {
            txid: '29b79f0f4302c43f6e6dd565e7e5829cf7f8a8fe1e95a58e3e87620a24c5bef9',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '061459eea0e569392f0622c20e5917b5ca94ae38a77405cd3a5f01b41bba688b',
                        outIdx: 2,
                    },
                    inputScript:
                        '41eed3688821e81f77edcf70e877d6b270acbd1714b82ea9b58fe0239e3dfccd73da5a1dd5d2906a40624d172e1a4273eda5e2feb902d74b73e264f9ef469c0a99412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 99999n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: 'efb84d4aa3aec5636ae5fcbbc560d4c1bafbe1e9ed00661380bce4a9db2360e0',
                        outIdx: 1,
                    },
                    inputScript:
                        '41bfbaae1e96b3a3d7fbbe24c2cd9ac07e48b7340e24635a8005be1b94563bc0e020d073d8a88e9af4a5a067ff9dcd6601f35611399d70f2958ff7ce22770792a7412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 2812672n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a5030534c503200044255524e3f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e1101000000000031534c5032000453454e443f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e11019e8601000000',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 99998n,
                    },
                    sats: 546n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 2812202n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1732374561,
            size: 470,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 1n,
                    intentionalBurnAtoms: 1n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 872299,
                hash: '000000000000000022478fad1745dbd1c8f57ad77b6627ba459720c2653cd086',
                timestamp: 1732375055,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        parsed: {
            recipients: [],
            satoshisSent: 2812748,
            stackArray: [
                '50',
                '534c503200044255524e3f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e11010000000000',
                '534c5032000453454e443f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e11019e8601000000',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'BURN',
                    tokenId:
                        '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                    tokenSatoshis: '1',
                },
            ],
        },
    },
    {
        description: 'ALP agora listing',
        tx: {
            txid: 'cf7f6c07bd838dbc7f7b05f5f879d498789d087e6c76dde91fdedeb802230587',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '59a60227b112221130f11fd890100ba623944f8243cc8322e7f4c8fd17ab6ee2',
                        outIdx: 2,
                    },
                    inputScript:
                        '41063618b40515cc62f4c2802f4f76ae729cfe31351f419634560bff37fbb8fa3dce1efb084e12a5e983beb893e945854470f409c1ec1c8c48b2baf7f5d80cb5e1412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 98082n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
                {
                    prevOut: {
                        txid: 'cbded16a00885493d76e6534d932a58083f1918be220b8604897181c6b611609',
                        outIdx: 1,
                    },
                    inputScript:
                        '41c143430106e44093436317fb23c3eb96e453ea500e47ea4d1952fdb917c4423abc52a51f0163e193704c6879fd0ff005423ae60ff4f75c7ff234cb6d45ef0391412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 1024n,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 546n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a504b41475230075041525449414c0001a4540000000000009006000000000000a4540000000000006f67825703771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba631534c5032000453454e443f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e1101228301000000',
                    sats: 0n,
                },
                {
                    outputScript:
                        'a91410596364db3336ec723ce7eaa296e7fa7dbe070687',
                    plugins: {
                        agora: {
                            groups: [
                                '5003771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                                '54116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                                '46116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                            ],
                            data: [
                                '5041525449414c',
                                '00',
                                '01',
                                'a454000000000000',
                                '9006000000000000',
                                'a454000000000000',
                                '6f678257',
                            ],
                        },
                    },
                    token: {
                        tokenId:
                            '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        isMintBaton: false,
                        entryIdx: 0,
                        atoms: 99106n,
                    },
                    spentBy: {
                        txid: 'a6d65d619bbb03c4490498f7fe1d5413e92df064915a3533a09e8a4ba1762255',
                        outIdx: 1,
                    },
                    sats: 546n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1732642801,
            size: 461,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                    tokenType: {
                        protocol: 'ALP',
                        type: 'ALP_TOKEN_TYPE_STANDARD',
                        number: 0,
                    },
                    txType: 'SEND',
                    isInvalid: false,
                    burnSummary: '',
                    failedColorings: [],
                    burnsMintBatons: false,
                    actualBurnAtoms: 0n,
                    intentionalBurnAtoms: 0n,
                },
            ],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NORMAL',
            block: {
                height: 872745,
                hash: '000000000000000017dce1ee0a66873715acd1987aa18d018cc94e2943c2608b',
                timestamp: 1732642958,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        parsed: {
            recipients: ['ecash:pqg9jcmymvendmrj8nn74g5kula8m0s8qce724yjtn'],
            satoshisSent: 546,
            stackArray: [
                '50',
                '41475230075041525449414c0001a4540000000000009006000000000000a4540000000000006f67825703771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                '534c5032000453454e443f93ce4cbff80c9cfc7647fe0c6d99b61248dce720a27f3723cd4737d35b6e1101228301000000',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'Agora Offer',
                    tokenId:
                        '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
                    tokenSatoshis: '99106',
                },
            ],
        },
    },
    {
        description: 'Paywall payment tx',
        tx: {
            txid: 'e9692335fdb3b75f2e319cbda1396f7f32c02c3d172e58148abeb2952c7e2460',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '4d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100a58e1087f128d676d4b5839c795df15b88b87b47b0c8f382d39811ee5df21cf6022022727ede00178347e0ab0dd3df91959378c25a29f902a4f8b4f1c79ddd7cf15241210216794b896521c52b0b156d886652859d1e4e03a9cd8f3894f4b1e1853092a3c7',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                    sats: 550n,
                },
                {
                    prevOut: {
                        txid: '4d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100856c2d015d7384a094d0c17dde0ec29ee37ddf64c914a6c1d12c9bd92724bc52022027d9f6525c49786e5454615e605d1af0aa4fa0860eea39e927316042ba3557f141210216794b896521c52b0b156d886652859d1e4e03a9cd8f3894f4b1e1853092a3c7',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                    sats: 27419n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a0470617977204d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                    spentBy: {
                        txid: '84d75fe93ab918e74e58c1a12a982d0cc8d1db1bb102f02068772723891711b3',
                        outIdx: 0,
                    },
                    sats: 15000n,
                },
                {
                    outputScript:
                        '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                    sats: 12056n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1716474827,
            size: 454,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 845901,
                hash: '00000000000000001da9291a7aa6fa8f9fa5f99413faa951e3f5777a082f911e',
                timestamp: 1716475087,
            },
            parsed: {
                xecTxType: 'Sent',
                satoshisSent: 27056,
                stackArray: [
                    '70617977',
                    '34643761363265626237663036666437613836663836313238303835336536666365336331313763373335393866653238343139303236306162643564646334',
                ],
                recipients: [],
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        parsed: {
            appActions: [
                {
                    action: {
                        sharedArticleTxid:
                            '4d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
                    },
                    isValid: true,
                    app: 'Paywall',
                    lokadId: '70617977',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qqrwv2qalnlam8dcxp8grh868qs2kdy6usct6qpwew'],
            replyAddress: 'ecash:qqrwv2qalnlam8dcxp8grh868qs2kdy6usct6qpwew',
            satoshisSent: 0,
            stackArray: [
                '70617977',
                '4d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
            ],
            xecTxType: 'Received',
        },
    },
    {
        description: 'Off spec paywall payment tx',
        tx: {
            txid: 'e9692335fdb3b75f2e319cbda1396f7f32c02c3d172e58148abeb2952c7e2460',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '4d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100a58e1087f128d676d4b5839c795df15b88b87b47b0c8f382d39811ee5df21cf6022022727ede00178347e0ab0dd3df91959378c25a29f902a4f8b4f1c79ddd7cf15241210216794b896521c52b0b156d886652859d1e4e03a9cd8f3894f4b1e1853092a3c7',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                    sats: 550n,
                },
                {
                    prevOut: {
                        txid: '4d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
                        outIdx: 2,
                    },
                    inputScript:
                        '483045022100856c2d015d7384a094d0c17dde0ec29ee37ddf64c914a6c1d12c9bd92724bc52022027d9f6525c49786e5454615e605d1af0aa4fa0860eea39e927316042ba3557f141210216794b896521c52b0b156d886652859d1e4e03a9cd8f3894f4b1e1853092a3c7',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                    sats: 27419n,
                },
            ],
            outputs: [
                {
                    outputScript: '6a0470617977',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                    spentBy: {
                        txid: '84d75fe93ab918e74e58c1a12a982d0cc8d1db1bb102f02068772723891711b3',
                        outIdx: 0,
                    },
                    sats: 15000n,
                },
                {
                    outputScript:
                        '76a91406e6281dfcffdd9db8304e81dcfa3820ab349ae488ac',
                    sats: 12056n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1716474827,
            size: 454,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 845901,
                hash: '00000000000000001da9291a7aa6fa8f9fa5f99413faa951e3f5777a082f911e',
                timestamp: 1716475087,
            },
            parsed: {
                xecTxType: 'Sent',
                satoshisSent: 27056,
                stackArray: [
                    '70617977',
                    '34643761363265626237663036666437613836663836313238303835336536666365336331313763373335393866653238343139303236306162643564646334',
                ],
                recipients: [],
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        parsed: {
            appActions: [
                {
                    app: 'Paywall',
                    isValid: false,
                    lokadId: '70617977',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qqrwv2qalnlam8dcxp8grh868qs2kdy6usct6qpwew'],
            replyAddress: 'ecash:qqrwv2qalnlam8dcxp8grh868qs2kdy6usct6qpwew',
            satoshisSent: 0,
            stackArray: ['70617977'],
            xecTxType: 'Received',
        },
    },
    {
        description: 'eCashChat Article Reply',
        tx: {
            txid: '91288c4675dae4815ef263d840e427b60e7195ab8354aeb156d00f2f5c015cd4',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '59daaab81418dff6acc6379d246d98348fdd2e7e10548877ffde73d5cf8d41ea',
                        outIdx: 1,
                    },
                    inputScript:
                        '4145602aed278898b9892332953d7eb9212b8f4f842a3e761139baa5ec95d353d94ab3abcb7d62b79e190c6aca93e304555a87398fabda5b9141faec1596b9bcc84121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    sats: 600n,
                },
                {
                    prevOut: {
                        txid: '752ef889a8aff586d926344eb45dee03f56f57a0b08416f8a284903201f60fe6',
                        outIdx: 1,
                    },
                    inputScript:
                        '41ec6df6abd70cdb718c19623173901a9471e9f52a5a4cd99d8093c4d5371bc2b0ce107866f1825a04646e6f7b51c883236eaefea50366e7c7074c140695f580014121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    sats: 600n,
                },
                {
                    prevOut: {
                        txid: '72f506669350eedc4b7643b6d3ca2c933137d303315a15c46042c31302c440f6',
                        outIdx: 2,
                    },
                    inputScript:
                        '4131c3b37d72362a79618771e7ad737e462c0804367809fb79d2bac39b116663297a559327e747be37e70979ba2f2e6ea184bf616e1b11df72a27f8eaafabbc9c24121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    sats: 508087n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04626c6f6704726c6f6720fc1bec473c0c8de408b8587ead6d31ad1d8854835c19947488fa7b30b79922674c70697320796f7572207769666520746865206769726c667269656e642066726f6d207061727420313f20496620736f207468656e20736865277320796f757220736f756c6d6174652c206265747465722068616e67206f6e746f20686572206c696b6520796f7572205845432062616773',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    spentBy: {
                        txid: '29810f319e19c552a6646d96eb1de5f7587c9adc6bed80ea756fe5b8db1f3f34',
                        outIdx: 0,
                    },
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    spentBy: {
                        txid: '29810f319e19c552a6646d96eb1de5f7587c9adc6bed80ea756fe5b8db1f3f34',
                        outIdx: 1,
                    },
                    sats: 507394n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1721558302,
            size: 668,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 854251,
                hash: '000000000000000000188bb36a8189d5612210ba2c6d1b8afa0f9d27e70ffe6f',
                timestamp: 1721558514,
            },
            parsed: {
                xecTxType: 'Sent',
                satoshisSent: 507944,
                stackArray: [
                    '626c6f67',
                    '726c6f67',
                    'fc1bec473c0c8de408b8587ead6d31ad1d8854835c19947488fa7b30b7992267',
                    '697320796f7572207769666520746865206769726c667269656e642066726f6d207061727420313f20496620736f207468656e20736865277320796f757220736f756c6d6174652c206265747465722068616e67206f6e746f20686572206c696b6520796f7572205845432062616773',
                ],
                recipients: [],
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        parsed: {
            appActions: [
                {
                    action: {
                        msg: "is your wife the girlfriend from part 1? If so then she's your soulmate, better hang onto her like your XEC bags",
                        replyArticleTxid:
                            'fc1bec473c0c8de408b8587ead6d31ad1d8854835c19947488fa7b30b7992267',
                    },
                    app: 'eCashChat Article Reply',
                    isValid: true,
                    lokadId: '626c6f67',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qq29stgf7cwxtq9c52mv3tuddgfujy5tduaellf3wm'],
            replyAddress: 'ecash:qq29stgf7cwxtq9c52mv3tuddgfujy5tduaellf3wm',
            satoshisSent: 0,
            stackArray: [
                '626c6f67',
                '726c6f67',
                'fc1bec473c0c8de408b8587ead6d31ad1d8854835c19947488fa7b30b7992267',
                '697320796f7572207769666520746865206769726c667269656e642066726f6d207061727420313f20496620736f207468656e20736865277320796f757220736f756c6d6174652c206265747465722068616e67206f6e746f20686572206c696b6520796f7572205845432062616773',
            ],
            xecTxType: 'Received',
        },
    },
    {
        description: 'Off spec eCashChat Aricle Reply',
        tx: {
            txid: '91288c4675dae4815ef263d840e427b60e7195ab8354aeb156d00f2f5c015cd4',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '59daaab81418dff6acc6379d246d98348fdd2e7e10548877ffde73d5cf8d41ea',
                        outIdx: 1,
                    },
                    inputScript:
                        '4145602aed278898b9892332953d7eb9212b8f4f842a3e761139baa5ec95d353d94ab3abcb7d62b79e190c6aca93e304555a87398fabda5b9141faec1596b9bcc84121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    sats: 600n,
                },
                {
                    prevOut: {
                        txid: '752ef889a8aff586d926344eb45dee03f56f57a0b08416f8a284903201f60fe6',
                        outIdx: 1,
                    },
                    inputScript:
                        '41ec6df6abd70cdb718c19623173901a9471e9f52a5a4cd99d8093c4d5371bc2b0ce107866f1825a04646e6f7b51c883236eaefea50366e7c7074c140695f580014121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    sats: 600n,
                },
                {
                    prevOut: {
                        txid: '72f506669350eedc4b7643b6d3ca2c933137d303315a15c46042c31302c440f6',
                        outIdx: 2,
                    },
                    inputScript:
                        '4131c3b37d72362a79618771e7ad737e462c0804367809fb79d2bac39b116663297a559327e747be37e70979ba2f2e6ea184bf616e1b11df72a27f8eaafabbc9c24121030a06dd7429d8fce700b702a55a012a1f9d1eaa46825bde2d31252ee9cb30e536',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    sats: 508087n,
                },
            ],
            outputs: [
                {
                    outputScript: '6a04626c6f6704726c6f67',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    spentBy: {
                        txid: '29810f319e19c552a6646d96eb1de5f7587c9adc6bed80ea756fe5b8db1f3f34',
                        outIdx: 0,
                    },
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a91414582d09f61c6580b8a2b6c8af8d6a13c9128b6f88ac',
                    spentBy: {
                        txid: '29810f319e19c552a6646d96eb1de5f7587c9adc6bed80ea756fe5b8db1f3f34',
                        outIdx: 1,
                    },
                    sats: 507394n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1721558302,
            size: 668,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 854251,
                hash: '000000000000000000188bb36a8189d5612210ba2c6d1b8afa0f9d27e70ffe6f',
                timestamp: 1721558514,
            },
            parsed: {
                xecTxType: 'Sent',
                satoshisSent: 507944,
                stackArray: [
                    '626c6f67',
                    '726c6f67',
                    'fc1bec473c0c8de408b8587ead6d31ad1d8854835c19947488fa7b30b7992267',
                    '697320796f7572207769666520746865206769726c667269656e642066726f6d207061727420313f20496620736f207468656e20736865277320796f757220736f756c6d6174652c206265747465722068616e67206f6e746f20686572206c696b6520796f7572205845432062616773',
                ],
                recipients: [],
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        parsed: {
            appActions: [
                {
                    app: 'eCashChat Article Reply',
                    isValid: false,
                    lokadId: '626c6f67',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qq29stgf7cwxtq9c52mv3tuddgfujy5tduaellf3wm'],
            replyAddress: 'ecash:qq29stgf7cwxtq9c52mv3tuddgfujy5tduaellf3wm',
            satoshisSent: 0,
            stackArray: ['626c6f67', '726c6f67'],
            xecTxType: 'Received',
        },
    },
    {
        description: 'eCashChat Article',
        tx: {
            txid: 'ab32d18a8f52d57c31c0197a45a4f10ed9299df25d996ccd2b1792506d569836',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'cafc6799c3fd6712d2f94b4360c90c73edcb49c0d1030989b3b07223c4fc4aac',
                        outIdx: 2,
                    },
                    inputScript:
                        '41f6b48f09d3d69002cb49049269d2e16c752b59357bf08c9a4a8513a69d6c87636db7acf09a6714663276d543584045b0796e76bfa3d67bd21a2fa680a89a375d412102f9e8383fe6fc81852f60909f5feb8a314949c3d2c9013c5e67563e3ba03e60ad',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914396addff64044d33431e0106b41c6903c7d0d28988ac',
                    sats: 133153n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04626c6f672863666338633134326661323336303566366336343765333437636262613261356633363064383937',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914396addff64044d33431e0106b41c6903c7d0d28988ac',
                    spentBy: {
                        txid: '9da106f4f05ba358b91486c5a233db096a57f40fa8134fddcc3ad2121857e47a',
                        outIdx: 0,
                    },
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a914396addff64044d33431e0106b41c6903c7d0d28988ac',
                    spentBy: {
                        txid: '9da106f4f05ba358b91486c5a233db096a57f40fa8134fddcc3ad2121857e47a',
                        outIdx: 1,
                    },
                    sats: 132050n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1721543189,
            size: 275,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 854224,
                hash: '000000000000000017faf86eb0dc5a051ccc069b90c55653749311eca64c29e4',
                timestamp: 1721543497,
            },
            parsed: {
                xecTxType: 'Sent',
                satoshisSent: 132600,
                stackArray: [
                    '626c6f67',
                    '63666338633134326661323336303566366336343765333437636262613261356633363064383937',
                ],
                recipients: [],
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        parsed: {
            appActions: [
                {
                    app: 'eCashChat Article',
                    isValid: true,
                    lokadId: '626c6f67',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qquk4h0lvszy6v6rrcqsddqudypu05xj3yx7d0s32f'],
            replyAddress: 'ecash:qquk4h0lvszy6v6rrcqsddqudypu05xj3yx7d0s32f',
            satoshisSent: 0,
            stackArray: [
                '626c6f67',
                '63666338633134326661323336303566366336343765333437636262613261356633363064383937',
            ],
            xecTxType: 'Received',
        },
    },
    {
        description: 'off-spec eCashChat Article',
        tx: {
            txid: 'ab32d18a8f52d57c31c0197a45a4f10ed9299df25d996ccd2b1792506d569836',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'cafc6799c3fd6712d2f94b4360c90c73edcb49c0d1030989b3b07223c4fc4aac',
                        outIdx: 2,
                    },
                    inputScript:
                        '41f6b48f09d3d69002cb49049269d2e16c752b59357bf08c9a4a8513a69d6c87636db7acf09a6714663276d543584045b0796e76bfa3d67bd21a2fa680a89a375d412102f9e8383fe6fc81852f60909f5feb8a314949c3d2c9013c5e67563e3ba03e60ad',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914396addff64044d33431e0106b41c6903c7d0d28988ac',
                    sats: 133153n,
                },
            ],
            outputs: [
                {
                    outputScript: '6a04626c6f67',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914396addff64044d33431e0106b41c6903c7d0d28988ac',
                    spentBy: {
                        txid: '9da106f4f05ba358b91486c5a233db096a57f40fa8134fddcc3ad2121857e47a',
                        outIdx: 0,
                    },
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a914396addff64044d33431e0106b41c6903c7d0d28988ac',
                    spentBy: {
                        txid: '9da106f4f05ba358b91486c5a233db096a57f40fa8134fddcc3ad2121857e47a',
                        outIdx: 1,
                    },
                    sats: 132050n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1721543189,
            size: 275,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 854224,
                hash: '000000000000000017faf86eb0dc5a051ccc069b90c55653749311eca64c29e4',
                timestamp: 1721543497,
            },
            parsed: {
                xecTxType: 'Sent',
                satoshisSent: 132600,
                stackArray: [
                    '626c6f67',
                    '63666338633134326661323336303566366336343765333437636262613261356633363064383937',
                ],
                recipients: [],
            },
        },
        walletHashes: ['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6'],
        parsed: {
            appActions: [
                {
                    app: 'eCashChat Article',
                    isValid: false,
                    lokadId: '626c6f67',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qquk4h0lvszy6v6rrcqsddqudypu05xj3yx7d0s32f'],
            replyAddress: 'ecash:qquk4h0lvszy6v6rrcqsddqudypu05xj3yx7d0s32f',
            satoshisSent: 0,
            stackArray: ['626c6f67'],
            xecTxType: 'Received',
        },
    },
    {
        description: 'Cashtab msg',
        tx: {
            txid: '1ce6c307b4083fcfc065287a00f0a582cf88bf33de34845db4c49387d4532b8a',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '01d4b064a4e17f77e5712cb13b488e65d39b33b54475b78debee1fe1d9d9acb1',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100eccfc2e23d49fb7e72a35123c807f4feef2f379313673295f36611d725e877b002207b1df4c142c590a54d371fe2f04c05769ecf778e0d28fc50a671e5c5d8b277854121028c1fc90b3fa6e5be985032b061b5ca6db41a6878a9c8b442747b820ca74010db',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914e6309418b6e60b8119928ec45b8ba87de8e735f788ac',
                    sats: 3001592n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a04007461624cbe4d6572636920706f7572206c65207072697820657420626f6e6e6520636f6e74696e756174696f6e2064616e7320766f732070726f6a6574732064652064c3a976656c6f70706575722e2e2e204a27616920c3a974c3a92063656e737572c3a92073c3bb722074c3a96cc3a96772616d6d65206a7573717527617520313520417672696c20323032342e2052c3a97061726572206c6520627567206f6273657276c3a920737572206c6120706167652065546f6b656e204661756365743f',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a9143c28745097b1e32b343c50a8d4a7697fe7ad8aff88ac',
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a914e6309418b6e60b8119928ec45b8ba87de8e735f788ac',
                    sats: 3000609n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1712616513,
            size: 433,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 839618,
                hash: '00000000000000000e63e39951cc745db046aa7f57f811b68846ade8ad100293',
                timestamp: 1712616969,
            },
        },
        walletHashes: ['3c28745097b1e32b343c50a8d4a7697fe7ad8aff'],
        parsed: {
            appActions: [
                {
                    action: {
                        msg: "Merci pour le prix et bonne continuation dans vos projets de développeur... J'ai été censuré sûr télégramme jusqu'au 15 Avril 2024. Réparer le bug observé sur la page eToken Faucet?",
                    },
                    app: 'Cashtab Msg',
                    isValid: true,
                    lokadId: '00746162',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qrnrp9qckmnqhqgej28vgkut4p773ee47u08xlygnr'],
            replyAddress: 'ecash:qrnrp9qckmnqhqgej28vgkut4p773ee47u08xlygnr',
            satoshisSent: 550,
            stackArray: [
                '00746162',
                '4d6572636920706f7572206c65207072697820657420626f6e6e6520636f6e74696e756174696f6e2064616e7320766f732070726f6a6574732064652064c3a976656c6f70706575722e2e2e204a27616920c3a974c3a92063656e737572c3a92073c3bb722074c3a96cc3a96772616d6d65206a7573717527617520313520417672696c20323032342e2052c3a97061726572206c6520627567206f6273657276c3a920737572206c6120706167652065546f6b656e204661756365743f',
            ],
            xecTxType: 'Received',
        },
    },
    {
        description: 'Off spec Cashtab msg',
        tx: {
            txid: '1ce6c307b4083fcfc065287a00f0a582cf88bf33de34845db4c49387d4532b8a',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '01d4b064a4e17f77e5712cb13b488e65d39b33b54475b78debee1fe1d9d9acb1',
                        outIdx: 1,
                    },
                    inputScript:
                        '483045022100eccfc2e23d49fb7e72a35123c807f4feef2f379313673295f36611d725e877b002207b1df4c142c590a54d371fe2f04c05769ecf778e0d28fc50a671e5c5d8b277854121028c1fc90b3fa6e5be985032b061b5ca6db41a6878a9c8b442747b820ca74010db',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914e6309418b6e60b8119928ec45b8ba87de8e735f788ac',
                    sats: 3001592n,
                },
            ],
            outputs: [
                {
                    outputScript: '6a0400746162',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a9143c28745097b1e32b343c50a8d4a7697fe7ad8aff88ac',
                    sats: 550n,
                },
                {
                    outputScript:
                        '76a914e6309418b6e60b8119928ec45b8ba87de8e735f788ac',
                    sats: 3000609n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1712616513,
            size: 433,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            block: {
                height: 839618,
                hash: '00000000000000000e63e39951cc745db046aa7f57f811b68846ade8ad100293',
                timestamp: 1712616969,
            },
        },
        walletHashes: ['3c28745097b1e32b343c50a8d4a7697fe7ad8aff'],
        parsed: {
            appActions: [
                {
                    app: 'Cashtab Msg',
                    isValid: false,
                    lokadId: '00746162',
                },
            ],
            parsedTokenEntries: [],
            recipients: ['ecash:qrnrp9qckmnqhqgej28vgkut4p773ee47u08xlygnr'],
            replyAddress: 'ecash:qrnrp9qckmnqhqgej28vgkut4p773ee47u08xlygnr',
            satoshisSent: 550,
            stackArray: ['00746162'],
            xecTxType: 'Received',
        },
    },
    {
        description: 'xecx tx',
        tx: {
            txid: 'ca7057d9d878e17d105a732d723c84e10156c61627c9e4330e15a0dfe5ab37a5',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c8922424162ce2b2b19a902ecc7d2de3e20b5f138dd9ddcca0c9b3d41f9f2a25',
                        outIdx: 2,
                    },
                    inputScript:
                        '41287a47a0238eb4e55b92061f3205e5c067f00e6a88df11e60ceb55aa6efa5da97d9418e2e52a0c1b69eba5983a8ad837b0cbe05aefe51d5237bdf3a11e72a2e0412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250500n,
                },
                {
                    prevOut: {
                        txid: '38c1bcddb2037490d541286074820e8acd6563c743b659d09d123117c99d6ef4',
                        outIdx: 2,
                    },
                    inputScript:
                        '415b4594a93e4ea80231f25da079f27f6928264a5c37f281a2b59f7850c0d3a0a7ba9c856791dadc6b0e73aa22430581821b69caace9661c54dd45d7687fad1ef3412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250355n,
                },
                {
                    prevOut: {
                        txid: 'd8626173ca854bd56571632d8cb76667c7acad2594fec9d0015fe0866aca5c30',
                        outIdx: 2,
                    },
                    inputScript:
                        '41e4c223342bb6987464f4702aafff4dfd1421edddfbb9ab57a7a98339d93191dad2549db9f715260279786eebf48431fd120d18e1c8baa977de11efb7fe1f7b01412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250022n,
                },
                {
                    prevOut: {
                        txid: 'd3c3b54460b1a45b75a3e506101ebfac20ed21722650dfe47473994b50dcce19',
                        outIdx: 2,
                    },
                    inputScript:
                        '41faf5ed17630b62563d8d4e1f342a51c1715deba8cd69bb755056b345e3448ae70fac12b8740c53d17e8e8e9211c6d406026a5512e658da30260ebc207fe7f976412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250542n,
                },
                {
                    prevOut: {
                        txid: '747684142194ccf7ba1cd384e50324425051fee5ce516362fec85d1ab1af1f0d',
                        outIdx: 2,
                    },
                    inputScript:
                        '412546d55291fd069a4c12249cb06c011e16b890844824f279159122cbf8657868e7aaf6dc2239c17874cd50bb50fdc306c4224e5e2651ebaa0a831ee3a86a1285412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31251452n,
                },
                {
                    prevOut: {
                        txid: '4c6b1092c4b1525dda296a0d18bc378489058ac775ddfcdeeb3eb107e1f57c2b',
                        outIdx: 2,
                    },
                    inputScript:
                        '41d8b94143ad17fae0cd9eb5b57c197fd62d750a8d83627bf9d021c800608bca6771844298cccfc4d94da7b592c44ff8a653f2ff238fc1ea17828eac56d05ce309412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31251576n,
                },
                {
                    prevOut: {
                        txid: '80575750ecf408a2960e78d1fc23d8e55ecd6af66296484800ed8ae7b28e6147',
                        outIdx: 2,
                    },
                    inputScript:
                        '4148447f966b2000c31d5cfc31c6382cb116b891f643f03b8d9fd7eb25d8a827d01d0ca8129d3b7412255901214ec6fb6fbeca178aedc293797e8d03eabd4d6829412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31258084n,
                },
                {
                    prevOut: {
                        txid: 'e5e53ddc5225bb22c5a8c5c0c45b1f0ff3063c3b607bdef680b824eca433c99d',
                        outIdx: 2,
                    },
                    inputScript:
                        '417f7cc74f9421db8a11196faadc29bdca794efd2bc016f9fb46ba5340877c74c46c4d46efa9cb7115256d16fc1e6af1a5265d0b064fb70ec7a74128bb68b7b630412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250892n,
                },
                {
                    prevOut: {
                        txid: '6eb3fbee6778614a0993e61897b42c12bbbe36712b4cc8326ac31544c4441b31',
                        outIdx: 2,
                    },
                    inputScript:
                        '41f07a227801c780217f0bc3f68e9927c0f278182ffc754ca6b167b0413a1cf98cf4d1838a40668482e1dfb7761ccf0ddc7e5a05ac2f55002a075f79e7dc147914412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31256658n,
                },
                {
                    prevOut: {
                        txid: '2ce51ebf25366f99ee73c62d49e212894c697560a6ea483576a3d2629e551459',
                        outIdx: 2,
                    },
                    inputScript:
                        '413ab633abeacde057b424a607fbbc477f29d8bea944d23d944889e808d8388cb43386c0b62edc8b278e6daa45f0446e90f8f9c750a975a934d911ec0a752b4fbe412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31252018n,
                },
            ],
            outputs: [
                {
                    outputScript:
                        '6a501f584543580008c43400000000000e21fdc39e01000000000000000000000000',
                    sats: 0n,
                },
                {
                    outputScript:
                        '76a914bf9db3e9b4e447d04cc7dbad89cf50d0fa74388c88ac',
                    sats: 31250371n,
                },
                {
                    outputScript:
                        '76a9149b487946ba24c1d61248ba992e3d533105cea14b88ac',
                    sats: 279681010n,
                },
                {
                    outputScript:
                        '76a914bf095d9afbda5245d5f1e27e7b360ec22357d6f088ac',
                    sats: 1578922n,
                },
                {
                    outputScript:
                        '76a914da3621d8d4a1c462b9f5cd2c9cb10850edbd3e4788ac',
                    spentBy: {
                        txid: '084d313be0c552839dbac91b47ceb792fec42ec5c121946366e0f352df16644f',
                        outIdx: 1,
                    },
                    sats: 2038n,
                },
                {
                    outputScript:
                        '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                    sats: 1585n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1516n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 1516n,
                },
                {
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                    sats: 1280n,
                },
                {
                    outputScript:
                        '76a91428ef733a0427f54c95cc5efea72d95f99db8e48d88ac',
                    sats: 791n,
                },
                {
                    outputScript:
                        '76a9149f88249247eba350d3b5ea61187fa1693e15524e88ac',
                    sats: 632n,
                },
                {
                    outputScript:
                        '76a91451691a770b8f2ab95590fbf89d22a290c57a4bd988ac',
                    sats: 601n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1735257601,
            size: 1837,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            isFinal: false,
            block: {
                height: 877018,
                hash: '000000000000000032d206581206d957112345b362f84578f2e67c5f4730a1bb',
                timestamp: 1735257732,
            },
        },
        walletHashes: ['bf9db3e9b4e447d04cc7dbad89cf50d0fa74388c'],
        parsed: {
            appActions: [
                {
                    action: {
                        eligibleTokenSatoshis: 1781404606734,
                        excludedHoldersCount: 0,
                        ineligibleTokenSatoshis: 0,
                        minBalanceTokenSatoshisToReceivePaymentThisRound: 3458056,
                    },
                    app: 'XECX',
                    isValid: true,
                    lokadId: '58454358',
                },
            ],
            parsedTokenEntries: [],
            recipients: [
                'ecash:qzd5s72xhgjvr4sjfzafjt3a2vcstn4pfvs4c84egx',
                'ecash:qzlsjhv6l0d9y3w47838u7ekpmpzx47k7qne9uv3t5',
                'ecash:qrdrvgwc6jsugc4e7hxje893ppgwm0f7gua8n7t3z9',
                'ecash:qq4fd9zdqecq3q4mmxz8v8vunepptukh3czav3gjyt',
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                'ecash:qp54xhk40f3fewpkp80pa9v28jr6940fmv38nxlahf',
                'ecash:qq5w7ue6qsnl2ny4e300afedjhuemw8y35j2e9mf0h',
                'ecash:qz0csfyjgl46x5xnkh4xzxrl595nu92jfch930m9sw',
                'ecash:qpgkjxnhpw8j4w24jral38fz52gv27jtmytxuxnkg3',
            ],
            replyAddress: 'ecash:qqfzls0nhjf7ukgpsmtlly2s2dueq54c5ulydy0h79',
            satoshisSent: 31250371,
            stackArray: [
                '50',
                '584543580008c43400000000000e21fdc39e01000000000000000000000000',
            ],
            xecTxType: 'Received',
        },
    },
    {
        description: 'invalid xecx tx',
        tx: {
            txid: 'ca7057d9d878e17d105a732d723c84e10156c61627c9e4330e15a0dfe5ab37a5',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c8922424162ce2b2b19a902ecc7d2de3e20b5f138dd9ddcca0c9b3d41f9f2a25',
                        outIdx: 2,
                    },
                    inputScript:
                        '41287a47a0238eb4e55b92061f3205e5c067f00e6a88df11e60ceb55aa6efa5da97d9418e2e52a0c1b69eba5983a8ad837b0cbe05aefe51d5237bdf3a11e72a2e0412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250500n,
                },
                {
                    prevOut: {
                        txid: '38c1bcddb2037490d541286074820e8acd6563c743b659d09d123117c99d6ef4',
                        outIdx: 2,
                    },
                    inputScript:
                        '415b4594a93e4ea80231f25da079f27f6928264a5c37f281a2b59f7850c0d3a0a7ba9c856791dadc6b0e73aa22430581821b69caace9661c54dd45d7687fad1ef3412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250355n,
                },
                {
                    prevOut: {
                        txid: 'd8626173ca854bd56571632d8cb76667c7acad2594fec9d0015fe0866aca5c30',
                        outIdx: 2,
                    },
                    inputScript:
                        '41e4c223342bb6987464f4702aafff4dfd1421edddfbb9ab57a7a98339d93191dad2549db9f715260279786eebf48431fd120d18e1c8baa977de11efb7fe1f7b01412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250022n,
                },
                {
                    prevOut: {
                        txid: 'd3c3b54460b1a45b75a3e506101ebfac20ed21722650dfe47473994b50dcce19',
                        outIdx: 2,
                    },
                    inputScript:
                        '41faf5ed17630b62563d8d4e1f342a51c1715deba8cd69bb755056b345e3448ae70fac12b8740c53d17e8e8e9211c6d406026a5512e658da30260ebc207fe7f976412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250542n,
                },
                {
                    prevOut: {
                        txid: '747684142194ccf7ba1cd384e50324425051fee5ce516362fec85d1ab1af1f0d',
                        outIdx: 2,
                    },
                    inputScript:
                        '412546d55291fd069a4c12249cb06c011e16b890844824f279159122cbf8657868e7aaf6dc2239c17874cd50bb50fdc306c4224e5e2651ebaa0a831ee3a86a1285412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31251452n,
                },
                {
                    prevOut: {
                        txid: '4c6b1092c4b1525dda296a0d18bc378489058ac775ddfcdeeb3eb107e1f57c2b',
                        outIdx: 2,
                    },
                    inputScript:
                        '41d8b94143ad17fae0cd9eb5b57c197fd62d750a8d83627bf9d021c800608bca6771844298cccfc4d94da7b592c44ff8a653f2ff238fc1ea17828eac56d05ce309412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31251576n,
                },
                {
                    prevOut: {
                        txid: '80575750ecf408a2960e78d1fc23d8e55ecd6af66296484800ed8ae7b28e6147',
                        outIdx: 2,
                    },
                    inputScript:
                        '4148447f966b2000c31d5cfc31c6382cb116b891f643f03b8d9fd7eb25d8a827d01d0ca8129d3b7412255901214ec6fb6fbeca178aedc293797e8d03eabd4d6829412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31258084n,
                },
                {
                    prevOut: {
                        txid: 'e5e53ddc5225bb22c5a8c5c0c45b1f0ff3063c3b607bdef680b824eca433c99d',
                        outIdx: 2,
                    },
                    inputScript:
                        '417f7cc74f9421db8a11196faadc29bdca794efd2bc016f9fb46ba5340877c74c46c4d46efa9cb7115256d16fc1e6af1a5265d0b064fb70ec7a74128bb68b7b630412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31250892n,
                },
                {
                    prevOut: {
                        txid: '6eb3fbee6778614a0993e61897b42c12bbbe36712b4cc8326ac31544c4441b31',
                        outIdx: 2,
                    },
                    inputScript:
                        '41f07a227801c780217f0bc3f68e9927c0f278182ffc754ca6b167b0413a1cf98cf4d1838a40668482e1dfb7761ccf0ddc7e5a05ac2f55002a075f79e7dc147914412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31256658n,
                },
                {
                    prevOut: {
                        txid: '2ce51ebf25366f99ee73c62d49e212894c697560a6ea483576a3d2629e551459',
                        outIdx: 2,
                    },
                    inputScript:
                        '413ab633abeacde057b424a607fbbc477f29d8bea944d23d944889e808d8388cb43386c0b62edc8b278e6daa45f0446e90f8f9c750a975a934d911ec0a752b4fbe412102a36a18cea3d7cfd980e0aa30dd5371fcee3c7e993e13c62942d6f36d2a203308',
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914122fc1f3bc93ee590186d7ff915053799052b8a788ac',
                    sats: 31252018n,
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a501f584543580108c43400000000000e21fdc39e01000000000000000000000000',
                },
                {
                    outputScript:
                        '76a914bf9db3e9b4e447d04cc7dbad89cf50d0fa74388c88ac',
                    sats: 31250371n,
                },
                {
                    outputScript:
                        '76a9149b487946ba24c1d61248ba992e3d533105cea14b88ac',
                    sats: 279681010n,
                },
                {
                    outputScript:
                        '76a914bf095d9afbda5245d5f1e27e7b360ec22357d6f088ac',
                    sats: 1578922n,
                },
                {
                    outputScript:
                        '76a914da3621d8d4a1c462b9f5cd2c9cb10850edbd3e4788ac',
                    spentBy: {
                        txid: '084d313be0c552839dbac91b47ceb792fec42ec5c121946366e0f352df16644f',
                        outIdx: 1,
                    },
                    sats: 2038n,
                },
                {
                    outputScript:
                        '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                    sats: 1585n,
                },
                {
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    sats: 1516n,
                },
                {
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    sats: 1516n,
                },
                {
                    outputScript:
                        '76a91469535ed57a629cb83609de1e958a3c87a2d5e9db88ac',
                    sats: 1280n,
                },
                {
                    outputScript:
                        '76a91428ef733a0427f54c95cc5efea72d95f99db8e48d88ac',
                    sats: 791n,
                },
                {
                    outputScript:
                        '76a9149f88249247eba350d3b5ea61187fa1693e15524e88ac',
                    sats: 632n,
                },
                {
                    outputScript:
                        '76a91451691a770b8f2ab95590fbf89d22a290c57a4bd988ac',
                    sats: 601n,
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1735257601,
            size: 1837,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
            isFinal: false,
            block: {
                height: 877018,
                hash: '000000000000000032d206581206d957112345b362f84578f2e67c5f4730a1bb',
                timestamp: 1735257732,
            },
        },
        walletHashes: ['bf9db3e9b4e447d04cc7dbad89cf50d0fa74388c'],
        parsed: {
            appActions: [
                {
                    action: {
                        decoded:
                            '\u0001\b�4\u0000\u0000\u0000\u0000\u0000\u000e!�Þ\u0001\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
                        stack: '0108c43400000000000e21fdc39e01000000000000000000000000',
                    },
                    app: 'XECX',
                    isValid: false,
                    lokadId: '58454358',
                },
            ],
            parsedTokenEntries: [],
            recipients: [
                'ecash:qzd5s72xhgjvr4sjfzafjt3a2vcstn4pfvs4c84egx',
                'ecash:qzlsjhv6l0d9y3w47838u7ekpmpzx47k7qne9uv3t5',
                'ecash:qrdrvgwc6jsugc4e7hxje893ppgwm0f7gua8n7t3z9',
                'ecash:qq4fd9zdqecq3q4mmxz8v8vunepptukh3czav3gjyt',
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                'ecash:qp54xhk40f3fewpkp80pa9v28jr6940fmv38nxlahf',
                'ecash:qq5w7ue6qsnl2ny4e300afedjhuemw8y35j2e9mf0h',
                'ecash:qz0csfyjgl46x5xnkh4xzxrl595nu92jfch930m9sw',
                'ecash:qpgkjxnhpw8j4w24jral38fz52gv27jtmytxuxnkg3',
            ],
            replyAddress: 'ecash:qqfzls0nhjf7ukgpsmtlly2s2dueq54c5ulydy0h79',
            satoshisSent: 31250371,
            stackArray: [
                '50',
                '584543580108c43400000000000e21fdc39e01000000000000000000000000',
            ],
            xecTxType: 'Received',
        },
    },
    {
        description: 'Firma yield tx (send)',
        tx: {
            txid: '3c56595af9eb142e18390ae07ccd6f6174e9b15e835208990da3a0ab2c66bed5',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'd199723b2ea022ea299d8785fcdedc4b8ee475e10a7f3402f3fad30ef380d5e2',
                        outIdx: 9,
                    },
                    inputScript:
                        '4125417d7c6b7ccc81eff94159e99cb533734433f38c3ee3b9a63e8cfbded5bd8114aad3331ada877d8aeea243f685485cc67690d49237075c55e1fc9082b034f1412103154e2dd365efda4d37f633a857eda739455e076de7c09ec59bc4f929f63b6d49',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 14n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                },
                {
                    prevOut: {
                        txid: 'b465eb1a20783a88554dcc95534c3fc2e5922cd7a8f1a83e6e442860b8764f0e',
                        outIdx: 1,
                    },
                    inputScript:
                        '41bc863737ec0613f49d39b3370a9c5974faa1eac5fa69a3b1a8d777bb4fcc7f2d138603ce959e3adfe504f0ce7231bf6ffb904e8d7cd28e04c4f69ebc9cfc77fa412103154e2dd365efda4d37f633a857eda739455e076de7c09ec59bc4f929f63b6d49',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 200487n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                },
                {
                    prevOut: {
                        txid: 'b465eb1a20783a88554dcc95534c3fc2e5922cd7a8f1a83e6e442860b8764f0e',
                        outIdx: 3,
                    },
                    inputScript:
                        '41aa40b355198a16381cc924539adf2843c57310d126ff82ce7b6829ed51b424a65cede15a08d66cad297e83d5ff1eb1f3d56abde79a16819d118b9953fc87c220412103154e2dd365efda4d37f633a857eda739455e076de7c09ec59bc4f929f63b6d49',
                    sats: 31249702n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a504c79534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f9487030d6d0c03000000c30000000000b900000000006900000000005200000000002b00000000001900000000000f00000000000f00000000000d0000000000070000000000070000000000140000000000',
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
                        atoms: 199789n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914a5417349420ec53b27522fed1a63b1672c0f28ff88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 195n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914ee487276a59ab3ce397ca6894fac6698aba1b69688ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 185n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 105n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '17fac4d29bb5e2ed5615f35ace4568adbb39555d871abde3cd9f2afd17980a8d',
                        outIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914ec135a17f346b3f9daedf788cffbc3441ff0425388ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 82n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a9149f88249247eba350d3b5ea61187fa1693e15524e88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 43n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914a68be843583d8c053f64f1dbc800e8e78ec4fc7788ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 25n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914dee50f576362377dd2f031453c0bb09009acaf8188ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 15n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914bf095d9afbda5245d5f1e27e7b360ec22357d6f088ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 15n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 13n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91428ef733a0427f54c95cc5efea72d95f99db8e48d88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 7n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 7n,
                        isMintBaton: false,
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
                        atoms: 20n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 31242653n,
                    outputScript:
                        '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                    spentBy: {
                        txid: 'fa9b61637a7366d349cbfb3eab8df48a49f7df8f841572fac7ecb940704ba2e4',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1740524404,
            size: 1043,
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
            block: {
                height: 885661,
                hash: '000000000000000016bfc7ceeaa54b9c4a3000cb0c7527c1f5620cf1d83b1437',
                timestamp: 1740524423,
            },
        },
        walletHashes: ['38d2e1501a485814e2849552093bb0588ed9acbb'],
        parsed: {
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'SEND',
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenSatoshis: '200481',
                },
            ],
            recipients: [
                'ecash:qr8hdk8rxjc5nj6f450eth3nnslxa8k4gysrtyfxc5',
                'ecash:qzj5zu6fgg8v2we82gh76xnrk9njcreglum9ffspnr',
                'ecash:qrhysunk5kdt8n3e0jngjnavv6v2hgdkjcmsudvl92',
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                'ecash:qrkpxksh7drt87w6ahmc3nlmcdzpluzz2vpjvwuuxy',
                'ecash:qz0csfyjgl46x5xnkh4xzxrl595nu92jfch930m9sw',
                'ecash:qzngh6zrtq7ccpflvncahjqqarnca38uwumh845f6p',
                'ecash:qr0w2r6hvd3rwlwj7qc520qtkzgqnt90sypk26yd2u',
                'ecash:qzlsjhv6l0d9y3w47838u7ekpmpzx47k7qne9uv3t5',
                'ecash:qq4fd9zdqecq3q4mmxz8v8vunepptukh3czav3gjyt',
                'ecash:qq5w7ue6qsnl2ny4e300afedjhuemw8y35j2e9mf0h',
                'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
            ],
            satoshisSent: 6552,
            stackArray: [
                '50',
                '534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f9487030d6d0c03000000c30000000000b900000000006900000000005200000000002b00000000001900000000000f00000000000f00000000000d0000000000070000000000070000000000140000000000',
            ],
            xecTxType: 'Sent',
        },
    },
    {
        description: 'Firma yield tx (receive)',
        tx: {
            txid: '3c56595af9eb142e18390ae07ccd6f6174e9b15e835208990da3a0ab2c66bed5',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'd199723b2ea022ea299d8785fcdedc4b8ee475e10a7f3402f3fad30ef380d5e2',
                        outIdx: 9,
                    },
                    inputScript:
                        '4125417d7c6b7ccc81eff94159e99cb533734433f38c3ee3b9a63e8cfbded5bd8114aad3331ada877d8aeea243f685485cc67690d49237075c55e1fc9082b034f1412103154e2dd365efda4d37f633a857eda739455e076de7c09ec59bc4f929f63b6d49',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 14n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                },
                {
                    prevOut: {
                        txid: 'b465eb1a20783a88554dcc95534c3fc2e5922cd7a8f1a83e6e442860b8764f0e',
                        outIdx: 1,
                    },
                    inputScript:
                        '41bc863737ec0613f49d39b3370a9c5974faa1eac5fa69a3b1a8d777bb4fcc7f2d138603ce959e3adfe504f0ce7231bf6ffb904e8d7cd28e04c4f69ebc9cfc77fa412103154e2dd365efda4d37f633a857eda739455e076de7c09ec59bc4f929f63b6d49',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 200487n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                },
                {
                    prevOut: {
                        txid: 'b465eb1a20783a88554dcc95534c3fc2e5922cd7a8f1a83e6e442860b8764f0e',
                        outIdx: 3,
                    },
                    inputScript:
                        '41aa40b355198a16381cc924539adf2843c57310d126ff82ce7b6829ed51b424a65cede15a08d66cad297e83d5ff1eb1f3d56abde79a16819d118b9953fc87c220412103154e2dd365efda4d37f633a857eda739455e076de7c09ec59bc4f929f63b6d49',
                    sats: 31249702n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a504c79534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f9487030d6d0c03000000c30000000000b900000000006900000000005200000000002b00000000001900000000000f00000000000f00000000000d0000000000070000000000070000000000140000000000',
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
                        atoms: 199789n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914a5417349420ec53b27522fed1a63b1672c0f28ff88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 195n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914ee487276a59ab3ce397ca6894fac6698aba1b69688ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 185n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 105n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '17fac4d29bb5e2ed5615f35ace4568adbb39555d871abde3cd9f2afd17980a8d',
                        outIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914ec135a17f346b3f9daedf788cffbc3441ff0425388ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 82n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a9149f88249247eba350d3b5ea61187fa1693e15524e88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 43n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914a68be843583d8c053f64f1dbc800e8e78ec4fc7788ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 25n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914dee50f576362377dd2f031453c0bb09009acaf8188ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 15n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914bf095d9afbda5245d5f1e27e7b360ec22357d6f088ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 15n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a9142a96944d06700882bbd984761d9c9e4215f2d78e88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 13n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91428ef733a0427f54c95cc5efea72d95f99db8e48d88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 7n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 7n,
                        isMintBaton: false,
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
                        atoms: 20n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 31242653n,
                    outputScript:
                        '76a91438d2e1501a485814e2849552093bb0588ed9acbb88ac',
                    spentBy: {
                        txid: 'fa9b61637a7366d349cbfb3eab8df48a49f7df8f841572fac7ecb940704ba2e4',
                        outIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1740524404,
            size: 1043,
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
            block: {
                height: 885661,
                hash: '000000000000000016bfc7ceeaa54b9c4a3000cb0c7527c1f5620cf1d83b1437',
                timestamp: 1740524423,
            },
        },
        walletHashes: ['a5417349420ec53b27522fed1a63b1672c0f28ff'],
        parsed: {
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'SEND',
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenSatoshis: '195',
                },
            ],
            recipients: [
                'ecash:qr8hdk8rxjc5nj6f450eth3nnslxa8k4gysrtyfxc5',
                'ecash:qrhysunk5kdt8n3e0jngjnavv6v2hgdkjcmsudvl92',
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                'ecash:qrkpxksh7drt87w6ahmc3nlmcdzpluzz2vpjvwuuxy',
                'ecash:qz0csfyjgl46x5xnkh4xzxrl595nu92jfch930m9sw',
                'ecash:qzngh6zrtq7ccpflvncahjqqarnca38uwumh845f6p',
                'ecash:qr0w2r6hvd3rwlwj7qc520qtkzgqnt90sypk26yd2u',
                'ecash:qzlsjhv6l0d9y3w47838u7ekpmpzx47k7qne9uv3t5',
                'ecash:qq4fd9zdqecq3q4mmxz8v8vunepptukh3czav3gjyt',
                'ecash:qq5w7ue6qsnl2ny4e300afedjhuemw8y35j2e9mf0h',
                'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                'ecash:qqud9c2srfy9s98zsj24yzfmkpvgakdvhv6xx7umh5',
            ],
            replyAddress: 'ecash:qqud9c2srfy9s98zsj24yzfmkpvgakdvhv6xx7umh5',
            satoshisSent: 546,
            stackArray: [
                '50',
                '534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f9487030d6d0c03000000c30000000000b900000000006900000000005200000000002b00000000001900000000000f00000000000f00000000000d0000000000070000000000070000000000140000000000',
            ],
            xecTxType: 'Received',
        },
    },
    {
        description: 'Firma redeem tx (send)',
        tx: {
            txid: 'c2ca0b8669abda46688bf34ab6da313a03a2bfb56af99c4aad8c244fc25b6aaa',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '2dbb137fdb0bbff00b368892f7ef27c262ef2077cfcdfa74fc37f79b7225af14',
                        outIdx: 3,
                    },
                    inputScript:
                        '41e4b59e83b9117fe0700cf7637be60cbded713a8f0eaa09538d76f7ce46429ac29baddd682d106716e616fc6965562a471ce980423c379efd2f10177db701f7c1412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 49920n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
                {
                    prevOut: {
                        txid: 'c025a30635a0dcf09a286f1a8ba7994fe7f40d7272ff5eb1c6bb7d64b98f8f64',
                        outIdx: 0,
                    },
                    inputScript:
                        '412d017b40fe2eca6cfa6a78e9d9dfb9061250af3b7c41ca8dea00b312319d2b849d16a8bb01a400363c780d0fe60954313d61846c7c01fda331b1c2e594375e88412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sats: 12852047n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a5037534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f94870302102700000000f09b0000000024534f4c304ebabba2b443691c1a9180426004d5fd3419e9f9c64e5839b853cecdaacbf745',
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
                        atoms: 10000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 39920n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 12851003n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1747169763,
            size: 498,
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
            block: {
                height: 896729,
                hash: '000000000000000013206bc393f6de124f937013b16456963f7156ba21e7bbf5',
                timestamp: 1747169847,
            },
        },
        walletHashes: ['76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac'],
        parsed: {
            appActions: [
                {
                    action: {
                        solAddr: '6JKwz43wDTgk5n8eNCJrtsnNtkDdKd1XUZAvB9WkiEQ4',
                    },
                    app: 'Solana Address',
                    isValid: true,
                    lokadId: '534f4c30',
                },
            ],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'SEND',
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenSatoshis: '10000',
                },
            ],
            recipients: ['ecash:qr8hdk8rxjc5nj6f450eth3nnslxa8k4gysrtyfxc5'],
            satoshisSent: 546,
            stackArray: [
                '50',
                '534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f94870302102700000000f09b00000000',
                '534f4c304ebabba2b443691c1a9180426004d5fd3419e9f9c64e5839b853cecdaacbf745',
            ],
            xecTxType: 'Sent',
        },
    },
    {
        description: 'ALP send with cashtab msg',
        tx: {
            txid: '8c484fd8580bc030f05adb778464de576a08ca5bce7e461c70c0cb995ff2495e',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'e94e27fb988ea48d10f796ad273bfa51441586f66e2bf3f674d80c8a8e32e031',
                        outIdx: 1,
                    },
                    inputScript:
                        '4182b03fb30b96ce85aec409d15c031d3892680497a5a56a0691c0b50c7183cded761e054895c74c735f3ecac7f633e42faf3a65e44a87fe94b68a387f17281000412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 5000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
                {
                    prevOut: {
                        txid: '8aff0d409782607a9e1b608b418c2ba00c58a690ec53018b5c37a9313b577ffa',
                        outIdx: 1,
                    },
                    inputScript:
                        '417b615dcf6287ffa9450305ff26683a57e1df2b5ab4372c17986a9c89fe6e4bee87284152e81c715388474ff93fba3ccabe24aedec7eaf485ed447ce3e67cbcce412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 10000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
                {
                    prevOut: {
                        txid: '6b99fbccc91cc19c2a37e34bff69ac4d9725dc22e52d89554f88af94de00e712',
                        outIdx: 197,
                    },
                    inputScript:
                        '41ce421d9ca5baafa8dd6f48c2ec4bc2a9b3953589c20fbc81fd4d06b170291a1128b504c338bde45a2362384371129c58982b11506fe9b7697e619712ef8f5204412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sats: 123311n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a5037534c5032000453454e4469fdb3d4559c236fcad29505fd53ffb3e1193cf96f7cb0e60aeb59af702295d1021027000000008813000000001e0074616263617368746162206d736720696e20616e20414c502073656e64',
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914110e3b40d115011988a5935c613a58a093b417ab88ac',
                    token: {
                        tokenId:
                            'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 10000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 5000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 122678n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1769896178,
            size: 633,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
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
            block: {
                height: 934372,
                hash: '00000000000000002064856461a73736498a7947b3ce61340585c6f5e40aee5b',
                timestamp: 1769896202,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        parsed: {
            appActions: [
                {
                    action: {
                        msg: 'cashtab msg in an ALP send',
                    },
                    app: 'Cashtab Msg',
                    isValid: true,
                    lokadId: '00746162',
                },
            ],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'SEND',
                    tokenId:
                        'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
                    tokenSatoshis: '10000',
                },
            ],
            recipients: ['ecash:qqgsuw6q6y2szxvg5kf4ccf6tzsf8dqh4vlcd636sl'],
            satoshisSent: 546,
            stackArray: [
                '50',
                '534c5032000453454e4469fdb3d4559c236fcad29505fd53ffb3e1193cf96f7cb0e60aeb59af702295d102102700000000881300000000',
                '0074616263617368746162206d736720696e20616e20414c502073656e64',
            ],
            xecTxType: 'Sent',
        },
    },
    {
        description: 'ALP receive with cashtab msg',
        tx: {
            txid: '8c484fd8580bc030f05adb778464de576a08ca5bce7e461c70c0cb995ff2495e',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'e94e27fb988ea48d10f796ad273bfa51441586f66e2bf3f674d80c8a8e32e031',
                        outIdx: 1,
                    },
                    inputScript:
                        '4182b03fb30b96ce85aec409d15c031d3892680497a5a56a0691c0b50c7183cded761e054895c74c735f3ecac7f633e42faf3a65e44a87fe94b68a387f17281000412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 5000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
                {
                    prevOut: {
                        txid: '8aff0d409782607a9e1b608b418c2ba00c58a690ec53018b5c37a9313b577ffa',
                        outIdx: 1,
                    },
                    inputScript:
                        '417b615dcf6287ffa9450305ff26683a57e1df2b5ab4372c17986a9c89fe6e4bee87284152e81c715388474ff93fba3ccabe24aedec7eaf485ed447ce3e67cbcce412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 10000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
                {
                    prevOut: {
                        txid: '6b99fbccc91cc19c2a37e34bff69ac4d9725dc22e52d89554f88af94de00e712',
                        outIdx: 197,
                    },
                    inputScript:
                        '41ce421d9ca5baafa8dd6f48c2ec4bc2a9b3953589c20fbc81fd4d06b170291a1128b504c338bde45a2362384371129c58982b11506fe9b7697e619712ef8f5204412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sats: 123311n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a5037534c5032000453454e4469fdb3d4559c236fcad29505fd53ffb3e1193cf96f7cb0e60aeb59af702295d1021027000000008813000000001e0074616263617368746162206d736720696e20616e20414c502073656e64',
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914110e3b40d115011988a5935c613a58a093b417ab88ac',
                    token: {
                        tokenId:
                            'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 10000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 5000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 122678n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1769896178,
            size: 633,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
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
            block: {
                height: 934372,
                hash: '00000000000000002064856461a73736498a7947b3ce61340585c6f5e40aee5b',
                timestamp: 1769896202,
            },
        },
        walletHashes: ['110e3b40d115011988a5935c613a58a093b417ab'],
        parsed: {
            appActions: [
                {
                    action: {
                        msg: 'cashtab msg in an ALP send',
                    },
                    app: 'Cashtab Msg',
                    isValid: true,
                    lokadId: '00746162',
                },
            ],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'SEND',
                    tokenId:
                        'd1952270af59eb0ae6b07c6ff93c19e1b3ff53fd0595d2ca6f239c55d4b3fd69',
                    tokenSatoshis: '10000',
                },
            ],
            recipients: ['ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035'],
            replyAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            satoshisSent: 546,
            stackArray: [
                '50',
                '534c5032000453454e4469fdb3d4559c236fcad29505fd53ffb3e1193cf96f7cb0e60aeb59af702295d102102700000000881300000000',
                '0074616263617368746162206d736720696e20616e20414c502073656e64',
            ],
            xecTxType: 'Received',
        },
    },
    {
        description: 'CACHET sent to EverydayJackpot game address (free play)',
        tx: {
            txid: 'c7a434022c7c3c9385b22ae0c1469a0eff6d625417b6e7ff6f58166edf05841b',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'c968b465a4c5ef4519ebdeb58524ea6c642add35120b6fccd47f394fb6b8e6b5',
                        outIdx: 1,
                    },
                    inputScript:
                        '414350360b32145102ea79e4f535a6f92da328e8c1eaf8ad5ba75fbc199b0b673c6d268f760839323882d79416d7d216226f6d3b7c4e7c135fa79d64e1915d9671412102eb09e912aca38a5c8b55b15b814f3e0a32b9992e629e85bd094da39979cab96d',
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
                        atoms: 10000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a9140f4a11f54fd2fab2b508bdb3a3972fa313af143488ac',
                },
                {
                    prevOut: {
                        txid: 'e535264a652ccd14ad395d51045823184a6395e1d5a205d0aabc16eb44144102',
                        outIdx: 3,
                    },
                    inputScript:
                        '417fb259316b5519202e2e48efc337ff15066f38ae20bd193c2193dc3917698fbbc464e540091468428b0aca568d316c13248b1a57256aa1ac2a56ec8b390ba4f8412102eb09e912aca38a5c8b55b15b814f3e0a32b9992e629e85bd094da39979cab96d',
                    sats: 8723n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a9140f4a11f54fd2fab2b508bdb3a3972fa313af143488ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb10800000000000003e8080000000000002328',
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        atoms: 1000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a9140f4a11f54fd2fab2b508bdb3a3972fa313af143488ac',
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        atoms: 9000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 7710n,
                    outputScript:
                        '76a9140f4a11f54fd2fab2b508bdb3a3972fa313af143488ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1771369231,
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
            isFinal: true,
        },
        walletHashes: ['0f4a11f54fd2fab2b508bdb3a3972fa313af1434'],
        parsed: {
            satoshisSent: 546,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                '00000000000003e8',
                '0000000000002328',
            ],
            xecTxType: 'Sent',
            recipients: ['ecash:qzqcq9p5lxa3jhc5lhwaefua9cjfhfjvcvsj887fg5'],
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'SEND',
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenSatoshis: '1000',
                },
            ],
        },
    },
    {
        description: 'CACHET send with p2sh input data (part 1 of chained tx)',
        tx: {
            txid: '8482970715ecdc3b9462d65c7d5d83520623b2953b3b6c8d2eb02ad951cfc66d',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'e1fe12aadfbcbbf982f5f3893a04769a19461b4eb47199a146457b391db8e234',
                        outIdx: 2,
                    },
                    inputScript:
                        '4199c7bca5ed1cbd61a7ffbcbfb4c91ddeaa8b5c59b0522cce44324e6c6788b430e4c1e4625fca72a6c6dbe72eec5c2228798f22fe35889b70d8a7833c1a087b14412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
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
                        atoms: 10539984n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
                {
                    prevOut: {
                        txid: 'e1fe12aadfbcbbf982f5f3893a04769a19461b4eb47199a146457b391db8e234',
                        outIdx: 3,
                    },
                    inputScript:
                        '4124f5a0d5fbace0f9681e0f0530b0df2d9a19ac42110b3083c9237eeddf30f97026d0d2984e6944d6f49d6f75a8fe324b52be611dc891066b52bd3ea433a39a06412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sats: 3210219n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1080000000000000064080000000000a0d36c',
                },
                {
                    sats: 829n,
                    outputScript:
                        'a914606af286432b243cac514130826db9ef8fbd1b0887',
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        atoms: 100n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'fff8f6fc074fa6c7edbecfdbf6bbc0819162af4540f4b1683440c83a56334e61',
                        outIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        atoms: 10539884n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 3208925n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1772187349,
            size: 465,
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
            isFinal: true,
            block: {
                height: 938221,
                hash: '00000000000000005d2ec237c3d326ce7e6da71206cd9e695778f4855683d24d',
                timestamp: 1772187359,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        parsed: {
            satoshisSent: 829,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                '0000000000000064',
                '0000000000a0d36c',
            ],
            xecTxType: 'Sent',
            recipients: ['ecash:ppsx4u5xgv4jg09v29qnpqndh8hcl0gmpqm85ppqnj'],
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'Blitz play',
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenSatoshis: '100',
                },
            ],
        },
    },
    {
        description:
            'CACHET receive with p2sh input data (part 2 of chained tx)',
        tx: {
            txid: 'fff8f6fc074fa6c7edbecfdbf6bbc0819162af4540f4b1683440c83a56334e61',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '8482970715ecdc3b9462d65c7d5d83520623b2953b3b6c8d2eb02ad951cfc66d',
                        outIdx: 1,
                    },
                    inputScript:
                        '044449434509000100000000e1f505419c5c9214740f95c0326c2baf2426514f2fdfead9618e390232fbedafdd2960f73f0eceb07b91cfc205aa314b03d69932daaa4d48e89c08a0d83742cb9835014a412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba612ad09000100000000e1f50588044449434587',
                    sats: 829n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        atoms: 100n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        'a914606af286432b243cac514130826db9ef8fbd1b0887',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1080000000000000064',
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914110e3b40d115011988a5935c613a58a093b417ab88ac',
                    token: {
                        tokenId:
                            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                        tokenType: {
                            protocol: 'SLP',
                            type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                            number: 1,
                        },
                        atoms: 100n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1772187349,
            size: 283,
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
            isFinal: true,
            block: {
                height: 938221,
                hash: '00000000000000005d2ec237c3d326ce7e6da71206cd9e695778f4855683d24d',
                timestamp: 1772187359,
            },
        },
        walletHashes: ['110e3b40d115011988a5935c613a58a093b417ab'],
        parsed: {
            satoshisSent: 546,
            stackArray: [
                '534c5000',
                '01',
                '53454e44',
                'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                '0000000000000064',
            ],
            xecTxType: 'Received',
            recipients: [],
            replyAddress: 'ecash:ppsx4u5xgv4jg09v29qnpqndh8hcl0gmpqm85ppqnj',
            appActions: [
                {
                    lokadId: '44494345',
                    app: 'DICE Bet',
                    isValid: true,
                    action: {
                        minValue: 1,
                        maxValue: 100000000,
                    },
                },
            ],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'SLP',
                    renderedTxType: 'SEND',
                    tokenId:
                        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                    tokenSatoshis: '100',
                },
            ],
        },
    },
    {
        description: 'EDJ sent to EverydayJackpot game address (EDJ Play)',
        tx: {
            txid: '35cd644d4afd04d9e8cb1dd3477299656910c650b2397e3567b7e1e30ae28de5',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '0b7d7a982e4f50b9244594a9ed0da488904f56850866034730d04f95a180eebf',
                        outIdx: 2,
                    },
                    inputScript:
                        '41c191e6eb9f205cee16657ba3a956d93cb600c076aeba3b918d14dbb794cd73f937284701bfb366034f145cf46291de481d415ceca447388616aee5966f236012412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 2000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
                {
                    prevOut: {
                        txid: '093d06604c52eb564a623eb76f71306583961275baed4cb655d2ef9bdd35e8ae',
                        outIdx: 2,
                    },
                    inputScript:
                        '4163523d65fce1e66d23ffee72994c303c49a821f1c6808d24b3f0ea70f62ee4358b710242b8f7f1489ee77f02422fef9ad20af47320370db1fb37331d33cef935412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 49900n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
                {
                    prevOut: {
                        txid: '80cdad6793581616546d588697d7077aec6e9b1fae54e7747c30445a2b15b3f0',
                        outIdx: 3,
                    },
                    inputScript:
                        '41f33c6103a2511d8ce2b2aed073948467aaf667e3dfd0e598fdbeeaeec538a8b1ab50b1620be1ef89a218bfb1f0b332d5a6c2a984d72c4a06ca27010a9d1576cc412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
                    sats: 42973850n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a5037534c5032000453454e44847d7722207ca58c839f0796fb568e22b73b6788dc68c3e0e1e8981b17071f4102102700000000aca300000000',
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                    token: {
                        tokenId:
                            '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 10000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '0c962cfdcab05b4fbbb50fbec6c367cefb3a8fe0c4f21f3ba4591d86e9870380',
                        outIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 41900n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 42973248n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1771030097,
            size: 602,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
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
            block: {
                height: 936254,
                hash: '000000000000000053ddb6315989a8722de986db44c510465f9d1dc43166f357',
                timestamp: 1771030370,
            },
        },
        walletHashes: ['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d'],
        parsed: {
            satoshisSent: 546,
            stackArray: [
                '50',
                '534c5032000453454e44847d7722207ca58c839f0796fb568e22b73b6788dc68c3e0e1e8981b17071f4102102700000000aca300000000',
            ],
            xecTxType: 'Sent',
            recipients: ['ecash:qzqcq9p5lxa3jhc5lhwaefua9cjfhfjvcvsj887fg5'],
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'SEND',
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenSatoshis: '10000',
                },
            ],
        },
    },
    {
        description:
            'EDJ received from EverydayJackpot game address (EDJ payout)',
        tx: {
            txid: 'c5a063835f29b62256a02a80b8a131b2a4cd20d69fc838013f867b38d4fce819',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '105e21345097411ef103eb13d31b6b74b3f486f8027c2004bce4de0bde77d775',
                        outIdx: 5,
                    },
                    inputScript:
                        '41c1f853126f5cfc8fe783563f7abef797c331255a7736c75af3ba9b1c709096b16dcdf3ee89c0fe541c5e7b76b440aca1df707db600a1e36f899342bfcdc928414121037609a974d6c91903caf954a0161500db5c433e70abf91d756efa789646e4545c',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 99993802267n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                },
                {
                    prevOut: {
                        txid: 'bf057c77bb03274b67864024400c9ef7557804f3da03e504a5d322971afb4439',
                        outIdx: 3,
                    },
                    inputScript:
                        '412eab0609bbe71cf88af0fc1d3b4644e85bbaa3aaf1a06266bc6a4705177df5da70c29fab375b985ec799132f1836fa8de7fd4b392d028377ee98c065ce68c00d4121037609a974d6c91903caf954a0161500db5c433e70abf91d756efa789646e4545c',
                    sats: 754n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                },
                {
                    prevOut: {
                        txid: 'f53b31223bfcc46d7144923f84113c5291432f9bbac92d3d7b8ae79d525b7047',
                        outIdx: 3,
                    },
                    inputScript:
                        '4168fef94a04ad1ef744e2d7c3afc44c26abe04e4504df1569536ec1655e510f2608c823104e24211fbfd54795fe4be9d195ac3179b34172e77051bf4198680de84121037609a974d6c91903caf954a0161500db5c433e70abf91d756efa789646e4545c',
                    sats: 109073884n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a504c73534c5032000453454e44847d7722207ca58c839f0796fb568e22b73b6788dc68c3e0e1e8981b17071f410c881300000000a00f00000000160800000000e80300000000e80300000000d00700000000e80300000000e80300000000d00700000000d00700000000f40100000000d90118481700',
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914286eabaf796ec8be1265c79f57b6c93114c0387f88ac',
                    token: {
                        tokenId:
                            '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 5000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91459b8f0f91b24792154b85f3fe2503160d840598688ac',
                    token: {
                        tokenId:
                            '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 4000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    token: {
                        tokenId:
                            '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 2070n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914d81ad40ed53da4375cd4fd5e6d05936df985b68888ac',
                    token: {
                        tokenId:
                            '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 1000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91404dda0a1de831ac9f51d58dad4a6ed491383e72988ac',
                    token: {
                        tokenId:
                            '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 1000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91476458db0ed96fe9863fc1ccec9fa2cfab884b0f688ac',
                    token: {
                        tokenId:
                            '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 2000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91484d1d94729b016516b88926ace165bf50ca2075b88ac',
                    token: {
                        tokenId:
                            '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 1000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a9148614d64f2b03d2dd25bd5ca796ecca726292134588ac',
                    token: {
                        tokenId:
                            '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 1000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914f7ecc10ddef23b211a6d3ca8051f42a9ef68805c88ac',
                    token: {
                        tokenId:
                            '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 2000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91442b9f0f923ddb327ef4d10adf0b6d5044d5e533388ac',
                    token: {
                        tokenId:
                            '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 2000n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914267f8d6bedba41f8f636f0fa756eafac8a17124588ac',
                    token: {
                        tokenId:
                            '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 500n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                    token: {
                        tokenId:
                            '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 99993780697n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: '0c962cfdcab05b4fbbb50fbec6c367cefb3a8fe0c4f21f3ba4591d86e9870380',
                        outIdx: 1,
                    },
                },
                {
                    sats: 109067629n,
                    outputScript:
                        '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                    spentBy: {
                        txid: 'f6a4748ec6f567edfc42ae2176656d6085f39622640b565869eb89009d5cba52',
                        outIdx: 2,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1771106402,
            size: 1003,
            isCoinbase: false,
            tokenEntries: [
                {
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
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
            block: {
                height: 936387,
                hash: '000000000000000061c6384cbae4e1c0e9a4206e2339b1e57801b4732ae2e271',
                timestamp: 1771106980,
            },
        },
        walletHashes: ['286eabaf796ec8be1265c79f57b6c93114c0387f'],
        parsed: {
            satoshisSent: 546,
            stackArray: [
                '50',
                '534c5032000453454e44847d7722207ca58c839f0796fb568e22b73b6788dc68c3e0e1e8981b17071f410c881300000000a00f00000000160800000000e80300000000e80300000000d00700000000e80300000000e80300000000d00700000000d00700000000f40100000000d90118481700',
            ],
            xecTxType: 'Received',
            recipients: [
                'ecash:qpvm3u8ervj8jg25hp0nlcjsx9sdsszescqyqwuy4j',
                'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                'ecash:qrvp44qw6576gd6u6n74umg9jdklnpdk3q42nllafs',
                'ecash:qqzdmg9pm6p34j04r4vd449xa4y38ql89yauzdvysq',
                'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                'ecash:qzzdrk289xcpv5tt3zfx4nskt06segs8tv0k8cvm6j',
                'ecash:qzrpf4j09vpa9hf9h4w209hvefex9ysng5yectwda9',
                'ecash:qrm7esgdmmerkgg6d572spglg25776yqtsczgtwz06',
                'ecash:qpptnu8ey0wmxfl0f5g2mu9k65zy6hjnxv0ylj6ayx',
                'ecash:qqn8lrttakayr78kxmc05atw47kg59cjg5ktys8sds',
                'ecash:qzqcq9p5lxa3jhc5lhwaefua9cjfhfjvcvsj887fg5',
            ],
            replyAddress: 'ecash:qzqcq9p5lxa3jhc5lhwaefua9cjfhfjvcvsj887fg5',
            appActions: [],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'SEND',
                    tokenId:
                        '411f07171b98e8e1e0c368dc88673bb7228e56fb96079f838ca57c2022777d84',
                    tokenSatoshis: '5000',
                },
            ],
        },
    },
    {
        description:
            'FIRMA received from EverydayJackpot game address (EDJ.com payout with trophy)',
        tx: {
            txid: '62cbd0419cb896b43d062487d73fc66f9fd1e0dbf465d309fe26541385ff8936',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '9128128e6b7a5fde33362b931e6e4b6c74ccb4a353bc8d036a191b8cba5b07ce',
                        outIdx: 1,
                    },
                    inputScript:
                        '410be2f99b8bb84305405332bf23141cb79e9dc96ac76eb58bead7e4b9d64d960aea2fd4b7bc5483404b4b6b005e0fdc335382ecbf83f4428eb165f3d12efc32a44121037609a974d6c91903caf954a0161500db5c433e70abf91d756efa789646e4545c',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 11n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                },
                {
                    prevOut: {
                        txid: 'bf094d0e36adbf9abff09e305e382affb89958df68c79ca5d98b3e162e660c54',
                        outIdx: 2,
                    },
                    inputScript:
                        '410b660e0cda30f26e90e32b8b1aa6a820bac9c9acf238a2689397275349f45721009b3c6f694d5c243539e53b059433f5e5a979435393954f9ea7951579e889564121037609a974d6c91903caf954a0161500db5c433e70abf91d756efa789646e4545c',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 49537n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                },
                {
                    prevOut: {
                        txid: 'c4adc31eed0f47e774e03f5e99903eb736785bb567b33b29851e558b9947a51a',
                        outIdx: 2,
                    },
                    inputScript:
                        '4107aa943983a0f6bcbf5649965b8f1a9c75742f5fa80fa6c1c1522ce8f986a4f661019bf3da55e367151f28f4bb2226800c05a7d6944d51de6cfb0d9e6700c3aa4121037609a974d6c91903caf954a0161500db5c433e70abf91d756efa789646e4545c',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 52860n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                },
                {
                    prevOut: {
                        txid: 'ee80070dfda7f4f0ca3cf5aa4d5cc1c6e6be802837f8deabbc3fc620d6f33ce2',
                        outIdx: 24,
                    },
                    inputScript:
                        '410add4c528f71958faa48c303d2f9df569d0a3013d56a908732947cc60c5f4485c888fec5f908409acb24f5e626eef9911809338377fbb59ee7227745c010c09a4121037609a974d6c91903caf954a0161500db5c433e70abf91d756efa789646e4545c',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 106n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                },
                {
                    prevOut: {
                        txid: '0a4f46313d5e5594588b13308b5354384c7538d81d050dc8fa686600c8287396',
                        outIdx: 2,
                    },
                    inputScript:
                        '41586d5eb9f1252f36afedfa2f25dc6d713cf4852b44a4fa55db67c6cf3547bc732104bf88d8746959b64108d6a2487cd24063d413cc84ca8bba96a3762e9a7b074121037609a974d6c91903caf954a0161500db5c433e70abf91d756efa789646e4545c',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 47048n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    outputScript:
                        '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a5037534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f94870302822a02000000b81d0000000034f09f8f8667000000543a02000000000089000000956c1d56c0ef15ed31fa69ff2c5773020b18adc1ec763eeb46f4774bf83c8fca',
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a914c9ff3dc758c72bdd1fac4a557799a16c465668c688ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 141954n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 546n,
                    outputScript:
                        '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 7608n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                },
                {
                    sats: 701n,
                    outputScript:
                        '76a91481801434f9bb195f14fddddca79d2e249ba64cc388ac',
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1771452003,
            size: 937,
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
            block: {
                height: 936949,
                hash: '000000000000000015ef9f68e4def4ed0009d901f050632d672779cd444c6c8c',
                timestamp: 1771452363,
            },
        },
        walletHashes: ['c9ff3dc758c72bdd1fac4a557799a16c465668c6'],
        parsed: {
            satoshisSent: 546,
            stackArray: [
                '50',
                '534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f94870302822a02000000b81d00000000',
                'f09f8f8667000000543a02000000000089000000956c1d56c0ef15ed31fa69ff2c5773020b18adc1ec763eeb46f4774bf83c8fca',
            ],
            xecTxType: 'Received',
            recipients: ['ecash:qzqcq9p5lxa3jhc5lhwaefua9cjfhfjvcvsj887fg5'],
            replyAddress: 'ecash:qzqcq9p5lxa3jhc5lhwaefua9cjfhfjvcvsj887fg5',
            appActions: [
                {
                    lokadId: 'f09f8f86',
                    app: 'EDJ.com Payout',
                    isValid: true,
                    action: {
                        numTxs: 103,
                        potAtoms: 146004n,
                        winnerOddsBps: 137,
                        winnerTxid:
                            '956c1d56c0ef15ed31fa69ff2c5773020b18adc1ec763eeb46f4774bf83c8fca',
                    },
                },
            ],
            parsedTokenEntries: [
                {
                    renderedTokenType: 'ALP',
                    renderedTxType: 'SEND',
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    tokenSatoshis: '141954',
                },
            ],
        },
    },
    {
        description: 'ALP agora relist tx',
        tx: {
            txid: '92604d8db0d72f145556d9b8d0c07c48a841acbc449e1197c7a00758bae0b459',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '410337b42ef386087f372a044495e8d7a3a7c0dd2c2ab85b49d61c7924f1839b',
                        outIdx: 1,
                    },
                    inputScript:
                        '4190041bde0d631c4c293ceeca9b4c5321a00f6f15ba985c125c7b804c54c17124d1bbc3001557d74ac121b43e34bd9ef688b1259b297d04bb8cb005d4e1e829da41004d5f014c78534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f9487036a504b41475230075041525449414c0000e9c5243f30000000b759820900000000044f5daad812000080cf182e03fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105080f7aaff4ffffff7fab7b63817b6ea2697606044f5daad812a2697605e9c5243f309700887d945279012a7f757892635357807e7805e9c5243f30965667525768807e527905e9c5243f309656807e827c7e5379012a7f777c7e825980bc7c7e007e7b04b65982099304b75982099658807e041976a914707501577f77a97e0288ac7e7e6b7d02220258800317a9147e024c7872587d807e7e7e01ab7e537901257f7702db007f5c7f7701207f547f750480cf182e886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501577f7768ac',
                    sats: 546n,
                    sequenceNo: 4294967295,
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 44510519n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    plugins: {
                        agora: {
                            groups: [
                                '5003fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105',
                                '540387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                                '460387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                            ],
                            data: [
                                '5041525449414c',
                                '00',
                                '00',
                                'e9c5243f30000000',
                                'b759820900000000',
                                '044f5daad8120000',
                                '80cf182e',
                            ],
                        },
                    },
                    outputScript:
                        'a914e6f96c46f7cd901d54a299dcb2c943ab8e50c1cb87',
                },
                {
                    prevOut: {
                        txid: '92ef4778d5dbca1e5ca147e4ec7e9fce7e16a2c1da77acce21000afd1afcfbb7',
                        outIdx: 2,
                    },
                    inputScript:
                        '410e129f1a0c4bed39388e1e68f1737f3bfe418a5e51bb4a24d556006d5bb013f3313abb2d997c971f4be5cda4f98379d016c92495f6814b66b763e3e4d31971b4412103fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105',
                    sats: 5460144255n,
                    sequenceNo: 4294967295,
                    outputScript:
                        '76a914cf76d8e334b149cb49ad1f95de339c3e6e9ed54188ac',
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a504b41475230075041525449414c0000e9c5243f300000001c24790900000000044f5daad8120000ee97233903fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d10531534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f94870301372da7020000',
                },
                {
                    sats: 546n,
                    outputScript:
                        'a9141a84a578409caada180a85b63ba0ffaabb8d437f87',
                    plugins: {
                        agora: {
                            groups: [
                                '5003fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105',
                                '540387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                                '460387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                            ],
                            data: [
                                '5041525449414c',
                                '00',
                                '00',
                                'e9c5243f30000000',
                                '1c24790900000000',
                                '044f5daad8120000',
                                'ee972339',
                            ],
                        },
                    },
                    token: {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        atoms: 44510519n,
                        isMintBaton: false,
                        entryIdx: 0,
                    },
                    spentBy: {
                        txid: 'a687c9e4f808a94239951c5430277d691a9783374e48adb80c5a1a88dd905b8c',
                        outIdx: 0,
                    },
                },
                {
                    sats: 5460143437n,
                    outputScript:
                        '76a914cf76d8e334b149cb49ad1f95de339c3e6e9ed54188ac',
                    spentBy: {
                        txid: 'bcebe8103e87e90b7d606bddec276accee358e3a9b747319bee9ca9a426ffede',
                        outIdx: 1,
                    },
                },
            ],
            lockTime: 0,
            timeFirstSeen: 1784540580,
            size: 818,
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
            block: {
                height: 958797,
                hash: '0000000000000000078dde3856a3d3ba7c69e56ca86f5a33b2f15106e4d4f1cf',
                timestamp: 1784542964,
            },
        },
        walletHashes: ['cf76d8e334b149cb49ad1f95de339c3e6e9ed541'],
        parsed: {
            recipients: ['ecash:pqdgfftcgzw24kscp2zmvwaql74thr2r0ucdx0erha'],
            satoshisSent: 546,
            stackArray: [
                '50',
                '41475230075041525449414c0000e9c5243f300000001c24790900000000044f5daad8120000ee97233903fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105',
                '534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f94870301372da7020000',
            ],
            xecTxType: 'Sent',
            appActions: [],
            parsedTokenEntries: [
                {
                    tokenId:
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                    renderedTxType: 'Agora Relist',
                    renderedTokenType: 'ALP',
                    tokenSatoshis: '44510519',
                },
            ],
        },
    },
] as ParseFixture[];

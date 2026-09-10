// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { ParseFixture, NotificationFixture } from './vectors';
import { XecTxType } from '../types';

const walletHash = '69535ed57a629cb83609de1e958a3c87a2d5e9db';
const recipientHash = 'dd1a2c6207afd46643e2af1c8134c92e636d15c7';

/** Valid XECV script (with leading 6a) for memo "hello" */
const validXecvScript = '6a04584543560568656c6c6f';

export const xecvParseFixtures: ParseFixture[] = [
    {
        description: 'XecVibe payment with memo',
        tx: {
            txid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
                        outIdx: 0,
                    },
                    inputScript:
                        '4160b48670db8fa89d83bf8ecaa125b5b4fb665a8da0e5a0b1353695cc006bfe328a0af4c6159758b3be4efb6c8324c4015443a879403c14cc3358e063df85015a412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 20000n,
                    sequenceNo: 4294967295,
                    outputScript: `76a914${walletHash}88ac`,
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript: validXecvScript,
                },
                {
                    sats: 10000n,
                    outputScript: `76a914${recipientHash}88ac`,
                },
                {
                    sats: 9700n,
                    outputScript: `76a914${walletHash}88ac`,
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
            stackArray: ['58454356', '68656c6c6f'],
            xecTxType: XecTxType.Sent,
            recipients: ['ecash:qrw35trzq7hagejru2h3eqf5eyhxxmg4cul69u7am3'],
            appActions: [
                {
                    lokadId: '58454356',
                    app: 'XecVibe',
                    isValid: true,
                    action: {
                        memo: 'hello',
                    },
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'XecVibe memo with leading UTF-8 BOM',
        tx: {
            txid: '5555555555555555555555555555555555555555555555555555555555555555',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '6666666666666666666666666666666666666666666666666666666666666666',
                        outIdx: 0,
                    },
                    inputScript:
                        '4160b48670db8fa89d83bf8ecaa125b5b4fb665a8da0e5a0b1353695cc006bfe328a0af4c6159758b3be4efb6c8324c4015443a879403c14cc3358e063df85015a412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 20000n,
                    sequenceNo: 4294967295,
                    outputScript: `76a914${walletHash}88ac`,
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript: '6a045845435606efbbbf616263',
                },
                {
                    sats: 10000n,
                    outputScript: `76a914${recipientHash}88ac`,
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
            stackArray: ['58454356', 'efbbbf616263'],
            xecTxType: XecTxType.Sent,
            recipients: ['ecash:qrw35trzq7hagejru2h3eqf5eyhxxmg4cul69u7am3'],
            appActions: [
                {
                    lokadId: '58454356',
                    app: 'XecVibe',
                    isValid: true,
                    action: {
                        memo: '\uFEFFabc',
                    },
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Invalid XecVibe (missing memo)',
        tx: {
            txid: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
                        outIdx: 0,
                    },
                    inputScript:
                        '4160b48670db8fa89d83bf8ecaa125b5b4fb665a8da0e5a0b1353695cc006bfe328a0af4c6159758b3be4efb6c8324c4015443a879403c14cc3358e063df85015a412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 20000n,
                    sequenceNo: 4294967295,
                    outputScript: `76a914${walletHash}88ac`,
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript: '6a0458454356',
                },
                {
                    sats: 10000n,
                    outputScript: `76a914${recipientHash}88ac`,
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
            stackArray: ['58454356'],
            xecTxType: XecTxType.Sent,
            recipients: ['ecash:qrw35trzq7hagejru2h3eqf5eyhxxmg4cul69u7am3'],
            appActions: [
                {
                    lokadId: '58454356',
                    app: 'XecVibe',
                    isValid: false,
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Invalid XecVibe (extra push after memo)',
        tx: {
            txid: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
                        outIdx: 0,
                    },
                    inputScript:
                        '4160b48670db8fa89d83bf8ecaa125b5b4fb665a8da0e5a0b1353695cc006bfe328a0af4c6159758b3be4efb6c8324c4015443a879403c14cc3358e063df85015a412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 20000n,
                    sequenceNo: 4294967295,
                    outputScript: `76a914${walletHash}88ac`,
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        '6a04584543560568656c6c6f0b786563766962652e636f6d',
                },
                {
                    sats: 10000n,
                    outputScript: `76a914${recipientHash}88ac`,
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
            stackArray: ['58454356', '68656c6c6f', '786563766962652e636f6d'],
            xecTxType: XecTxType.Sent,
            recipients: ['ecash:qrw35trzq7hagejru2h3eqf5eyhxxmg4cul69u7am3'],
            appActions: [
                {
                    lokadId: '58454356',
                    app: 'XecVibe',
                    isValid: false,
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Invalid XecVibe (malformed UTF-8 memo)',
        tx: {
            txid: '1111111111111111111111111111111111111111111111111111111111111111',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '2222222222222222222222222222222222222222222222222222222222222222',
                        outIdx: 0,
                    },
                    inputScript:
                        '4160b48670db8fa89d83bf8ecaa125b5b4fb665a8da0e5a0b1353695cc006bfe328a0af4c6159758b3be4efb6c8324c4015443a879403c14cc3358e063df85015a412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 20000n,
                    sequenceNo: 4294967295,
                    outputScript: `76a914${walletHash}88ac`,
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript: '6a045845435601ff',
                },
                {
                    sats: 10000n,
                    outputScript: `76a914${recipientHash}88ac`,
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
            stackArray: ['58454356', 'ff'],
            xecTxType: XecTxType.Sent,
            recipients: ['ecash:qrw35trzq7hagejru2h3eqf5eyhxxmg4cul69u7am3'],
            appActions: [
                {
                    lokadId: '58454356',
                    app: 'XecVibe',
                    isValid: false,
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'Invalid XecVibe (bare opcode instead of memo push)',
        tx: {
            txid: '3333333333333333333333333333333333333333333333333333333333333333',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '4444444444444444444444444444444444444444444444444444444444444444',
                        outIdx: 0,
                    },
                    inputScript:
                        '4160b48670db8fa89d83bf8ecaa125b5b4fb665a8da0e5a0b1353695cc006bfe328a0af4c6159758b3be4efb6c8324c4015443a879403c14cc3358e063df85015a412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 20000n,
                    sequenceNo: 4294967295,
                    outputScript: `76a914${walletHash}88ac`,
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript: '6a045845435651',
                },
                {
                    sats: 10000n,
                    outputScript: `76a914${recipientHash}88ac`,
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
            stackArray: ['58454356', '51'],
            xecTxType: XecTxType.Sent,
            recipients: ['ecash:qrw35trzq7hagejru2h3eqf5eyhxxmg4cul69u7am3'],
            appActions: [
                {
                    lokadId: '58454356',
                    app: 'XecVibe',
                    isValid: false,
                },
            ],
            parsedTokenEntries: [],
        },
    },
    {
        description: 'XecVibe memo from pushed byte 0x51',
        tx: {
            txid: '7777777777777777777777777777777777777777777777777777777777777777',
            version: 2,
            inputs: [
                {
                    prevOut: {
                        txid: '8888888888888888888888888888888888888888888888888888888888888888',
                        outIdx: 0,
                    },
                    inputScript:
                        '4160b48670db8fa89d83bf8ecaa125b5b4fb665a8da0e5a0b1353695cc006bfe328a0af4c6159758b3be4efb6c8324c4015443a879403c14cc3358e063df85015a412102f267109c5c7a76c24f158705f236f7b394f2e091112ce3b737b27b25b119e5e3',
                    sats: 20000n,
                    sequenceNo: 4294967295,
                    outputScript: `76a914${walletHash}88ac`,
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript: '6a04584543560151',
                },
                {
                    sats: 10000n,
                    outputScript: `76a914${recipientHash}88ac`,
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
            stackArray: ['58454356', '51'],
            xecTxType: XecTxType.Sent,
            recipients: ['ecash:qrw35trzq7hagejru2h3eqf5eyhxxmg4cul69u7am3'],
            appActions: [
                {
                    lokadId: '58454356',
                    app: 'XecVibe',
                    isValid: true,
                    action: {
                        memo: 'Q',
                    },
                },
            ],
            parsedTokenEntries: [],
        },
    },
];

export const xecvNotificationFixtures: NotificationFixture[] = [
    {
        description: 'XecVibe notification with memo',
        parsedTx: xecvParseFixtures[0].parsed,
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'XecVibe | Sent 100.00 XEC | hello',
    },
    {
        description: 'Invalid XecVibe notification',
        parsedTx: xecvParseFixtures[2].parsed,
        fiatPrice: null,
        userLocale: 'en-US',
        selectedFiatTicker: 'USD',
        genesisInfo: undefined,
        expected: 'Sent 100.00 XEC | Invalid XecVibe',
    },
];

// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
/**
 * op_return.js
 * Constants related to OP_RETURN script
 * https://en.bitcoin.it/wiki/Script
 */
module.exports = {
    opReturnPrefix: '6a',
    opReturnAppPrefixLength: '04',
    opPushDataOne: '4c',
    opReserved: '50',
    knownApps: {
        airdrop: { prefix: '64726f70', app: 'Airdrop' },
        cashtabMsg: { prefix: '00746162', app: 'Cashtab Msg' },
        cashtabMsgEncrypted: {
            prefix: '65746162',
            app: 'Cashtab Encrypted',
        },
        swap: { prefix: '53575000', app: 'SWaP' },
        authentication: { prefix: '61757468', app: 'Authentication' },
        fusion: { prefix: '46555a00', app: 'CashFusion' },
        fusionLegacy: { prefix: '5920070', app: 'CashFusion' },
        slp2: { prefix: '534c5032', app: 'ALP' },
        alias: { prefix: '2e786563', app: 'Alias (beta)' },
        payButton: { prefix: '50415900', app: 'PayButton' },
        paywall: { prefix: '70617977', app: 'Paywall' },
    },
    memo: {
        'prefix': '6d',
        'app': 'memo',
        '01': 'Set name',
        '02': 'Post memo',
        '03': 'Reply to memo',
        '04': 'Like / tip memo',
        '05': 'Set profile text',
        '06': 'Follow user',
        '07': 'Unfollow user',
        '0a': 'Set profile picture',
        '0b': 'Repost memo',
        '0c': 'Post topic message',
        '0d': 'Topic follow',
        '0e': 'Topic unfollow',
        '10': 'Create poll',
        '13': 'Add poll option',
        '14': 'Poll vote',
        '16': 'Mute user',
        '17': 'Unmute user',
        '24': 'Send money',
        '30': 'Sell tokens',
        '31': 'Token buy offer',
        '32': 'Attach token sale signature',
        '35': 'Pin token post',
        '20': 'Link request',
        '21': 'Link accept',
        '22': 'Link revoke',
        '26': 'Set address alias',
    },
};

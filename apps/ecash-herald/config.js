// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
module.exports = {
    chronik: 'https://chronik.fabien.cash', // URL of chronik instance
    blockExplorer: 'https://explorer.e.cash',
    priceApi: {
        apiBase: 'https://api.coingecko.com/api/v3/simple/price',
        cryptos: [
            { coingeckoSlug: 'ecash', ticker: 'XEC' },
            { coingeckoSlug: 'bitcoin', ticker: 'BTC' },
            { coingeckoSlug: 'ethereum', ticker: 'ETH' },
        ],
        fiat: 'usd',
        precision: 8,
    },
    fiatReference: { usd: '$', jpy: '¥', eur: '€', gbp: '£' },
    ifpAddress: 'ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
    tgMsgOptions: {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    },
    knownMiners: [
        {
            coinbaseScript: '566961425443',
            miner: 'ViaBTC',
        },
        {
            coinbaseScript: '4d696e696e672d4475746368',
            miner: 'Mining-Dutch',
        },
    ],
    opReturn: {
        opReturnPrefix: '6a',
        opReturnAppPrefixLength: '04',
        opPushDataOne: '4c',
        appPrefixes: {
            '00746162': 'Cashtab Msg',
            '2e786563': 'Alias',
        },
        memo: {
            'prefix': '026d',
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
            '30': 'Sell tokens Spec',
            '31': 'Token buy offer Spec',
            '32': 'Attach token sale signature Spec',
            '35': 'Pin token post',
            '20': 'Link request',
            '21': 'Link accept',
            '22': 'Link revoke',
            '26': 'Set address alias',
        },
    },
};

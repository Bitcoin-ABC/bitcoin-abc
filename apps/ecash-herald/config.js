// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
module.exports = {
    xecSendDisplayCount: 12,
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
    whaleSats: {
        // 20 billion xec
        bigWhale: 2000000000000,
        // 10 billion xec
        modestWhale: 1000000000000,
        // 5 billion xec
        shark: 500000000000,
        // 1 billion xec
        swordfish: 100000000000,
        // 700 million xec
        barracuda: 70000000000,
        // 500 million xec
        octopus: 50000000000,
        // 250 million xec
        piranha: 25000000000,
        // 100 million xec
        crab: 10000000000,
        // anything under 100 million xec
        shrimp: 0,
    },
    emojis: {
        alias: '👾',
        block: '📦',
        xecSend: '💸',
        arrowRight: '➡️',
        tokenBurn: '🔥',
        tokenGenesis: '🧪',
        tokenSend: '🎟',
        fusion: '⚛️',
        cashtabMsg: '🖋',
        cashtabEncrypted: '🔏',
        swap: '🤳',
        airdrop: '🪂',
        unknown: '❓',
        memo: '🗞',
        bigWhale: '🐋',
        modestWhale: '🐳',
        shark: '🦈',
        swordfish: '🐬',
        barracuda: '🐠',
        octopus: '🐙',
        piranha: '🐡',
        crab: '🦀',
        // Most addresses seen by the app are shrimp, so use empty string
        shrimp: '',
    },
};

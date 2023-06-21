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
    emojis: {
        block: '📦',
        xecSend: '💸',
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
    },
};

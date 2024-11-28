// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { SendMessageOptions } from 'node-telegram-bot-api';

interface CryptoSlug {
    coingeckoSlug: string;
    ticker: string;
}
export type FiatCode = 'usd' | 'eur' | 'gbp' | 'jpy';
export interface HeraldPriceApi {
    apiBase: string;
    cryptos: CryptoSlug[];
    fiat: FiatCode;
    precision: number;
}
export interface HeraldConfig {
    cacheTtlMsecs: number;
    xecSendDisplayCount: number;
    chronik: string[];
    blockExplorer: string;
    tokenLandingBase: string;
    priceApi: HeraldPriceApi;
    fiatReference: { usd: string; jpy: string; eur: string; gbp: string };
    stakingRewardApiUrl: string;
    ifpAddress: string;
    tgMsgOptions: SendMessageOptions;
    whaleSats: {
        bigWhale: number;
        // 10 billion xec
        modestWhale: number;
        // 5 billion xec
        shark: number;
        // 1 billion xec
        swordfish: number;
        // 700 million xec
        barracuda: number;
        // 500 million xec
        octopus: number;
        // 250 million xec
        piranha: number;
        // 100 million xec
        crab: number;
        // anything under 100 million xec
        shrimp: number;
    };
    emojis: {
        agora: string;
        volume: string;
        agoraBuy: string;
        agoraList: string;
        agoraCancel: string;
        alias: string;
        alp: string;
        invalid: string;
        nft: string;
        mintvault: string;
        block: string;
        miner: string;
        staker: string;
        stakingNode: string;
        xecSend: string;
        arrowRight: string;
        tokenBurn: string;
        tokenGenesis: string;
        tokenSend: string;
        tokenMint: string;
        tokenFixed: string;
        gift: string;
        bank: string;
        app: string;
        token: string;
        fusion: string;
        cashtabMsg: string;
        cashtabEncrypted: string;
        payButton: string;
        swap: string;
        airdrop: string;
        paywall: string;
        authentication: string;
        unknown: string;
        memo: string;
        bigWhale: string;
        modestWhale: string;
        shark: string;
        swordfish: string;
        barracuda: string;
        octopus: string;
        piranha: string;
        crab: string;
        shrimp: string;
        priceUp: string;
        priceDown: string;
    };
}
const config: HeraldConfig = {
    cacheTtlMsecs: 1000 * 60 * 60 * 4, // 4 hours
    xecSendDisplayCount: 12,
    chronik: [
        'https://chronik-native1.fabien.cash',
        'https://chronik-native2.fabien.cash',
        'https://chronik-native.fabien.cash',
        'https://chronik.pay2stay.com/xec',
        'https://chronik.be.cash/xec2',
    ],
    blockExplorer: 'https://explorer.e.cash',
    tokenLandingBase: 'https://cashtab.com/#/token',
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
    stakingRewardApiUrl: 'https://avalanche.cash/api/nextstakingreward',
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
        agora: '🏛',
        volume: '🔊',
        agoraBuy: '💰',
        agoraList: '🏷',
        agoraCancel: '❌',
        alias: '👾',
        alp: '🗻',
        invalid: '❌',
        nft: '🖼',
        mintvault: '🧩',
        block: '📦',
        miner: '⛏️',
        staker: '💰',
        stakingNode: '🧮',
        xecSend: '💸',
        arrowRight: '➡️',
        tokenBurn: '🔥',
        tokenGenesis: '🧪',
        tokenSend: '🎟',
        tokenMint: '🔨',
        tokenFixed: '🔒',
        gift: '🎁',
        bank: '🏦',
        app: '📱',
        token: '🪙',
        fusion: '⚛️',
        cashtabMsg: '🖋',
        cashtabEncrypted: '🔏',
        payButton: '🛒',
        swap: '🤳',
        airdrop: '🪂',
        paywall: '💸',
        authentication: '🔓',
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
        priceUp: '📈',
        priceDown: '📉',
    },
};

export default config;

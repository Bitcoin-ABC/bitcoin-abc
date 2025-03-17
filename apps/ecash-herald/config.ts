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
        bigWhale: bigint;
        // 10 billion xec
        modestWhale: bigint;
        // 5 billion xec
        shark: bigint;
        // 1 billion xec
        swordfish: bigint;
        // 700 million xec
        barracuda: bigint;
        // 500 million xec
        octopus: bigint;
        // 250 million xec
        piranha: bigint;
        // 100 million xec
        crab: bigint;
        // anything under 100 million xec
        shrimp: bigint;
    };
    emojis: {
        capacityLow: string;
        capacityMed: string;
        capacityHigh: string;
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
    /**
     * chronik servers must be indexed with agora.py plugin
     * for full herald functionality
     */
    chronik: [
        'https://chronik-native2.fabien.cash',
        'https://chronik-native3.fabien.cash',
        'https://chronik.pay2stay.com/xec2',
        'https://chronik-native1.fabien.cash',
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
        bigWhale: 2000000000000n,
        // 10 billion xec
        modestWhale: 1000000000000n,
        // 5 billion xec
        shark: 500000000000n,
        // 1 billion xec
        swordfish: 100000000000n,
        // 700 million xec
        barracuda: 70000000000n,
        // 500 million xec
        octopus: 50000000000n,
        // 250 million xec
        piranha: 25000000000n,
        // 100 million xec
        crab: 10000000000n,
        // anything under 100 million xec
        shrimp: 0n,
    },
    emojis: {
        capacityLow: '💧',
        capacityMed: '🚰',
        capacityHigh: '🌊',
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

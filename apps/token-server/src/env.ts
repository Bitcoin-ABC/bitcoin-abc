// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export interface TokenServerEnv {
    telegramBotToken: string;
    telegramChannelId: string;
    approvedMods: number[];
    mongodbUrl: string;
}

const parseApprovedMods = (value: string | undefined): number[] => {
    if (typeof value === 'undefined' || value.trim() === '') {
        return [];
    }

    return value.split(',').map(entry => {
        const modId = Number.parseInt(entry.trim(), 10);
        if (Number.isNaN(modId)) {
            throw new Error(`Invalid APPROVED_MODS entry: ${entry}`);
        }
        return modId;
    });
};

/**
 * Load and validate token-server environment variables.
 */
export const getEnv = (): TokenServerEnv => {
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!telegramBotToken) {
        throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
    }

    const telegramChannelId = process.env.TELEGRAM_CHANNEL_ID;
    if (!telegramChannelId) {
        throw new Error('TELEGRAM_CHANNEL_ID environment variable is required');
    }

    const mongodbUrl = process.env.MONGODB_URL;
    if (!mongodbUrl) {
        throw new Error('MONGODB_URL environment variable is required');
    }

    return {
        telegramBotToken,
        telegramChannelId,
        approvedMods: parseApprovedMods(process.env.APPROVED_MODS),
        mongodbUrl,
    };
};

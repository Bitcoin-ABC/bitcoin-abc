// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

interface TelegramSettings {
    botId: string;
    channelId: string;
    dailyChannelId: string;
    /** ID of the main public chat, for daily summaries */
    mainChannelId?: string;
}

interface Secrets {
    dev: { telegram: TelegramSettings };
    prod: {
        telegram: TelegramSettings;
        stakerApiKey: string;
    };
}

const secrets: Secrets = {
    dev: {
        telegram: {
            botId: 'botIdFromTelegramBotfather',
            channelId: 'channelIdCanFindInTelegramWebThenPrefaceWith100',
            dailyChannelId: 'dailyChannelId',
        },
    },
    prod: {
        telegram: {
            botId: 'botIdFromTelegramBotfather',
            channelId: 'channelIdCanFindInTelegramWebThenPrefaceWith100',
            dailyChannelId: 'dailyChannelId',
        },
        stakerApiKey: 'stakerApiKey',
    },
};

export default secrets;

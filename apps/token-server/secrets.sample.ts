// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

interface TelegramSecrets {
    botId: string;
    channelId: string;
    approvedMods: number[];
}

interface TokenServerSecrets {
    dev: TelegramSecrets;
    prod: TelegramSecrets;
}

const secrets: TokenServerSecrets = {
    dev: {
        botId: 'yourBotId',
        channelId: 'yourChannelId',
        approvedMods: [],
    },
    prod: {
        botId: 'yourBotId',
        channelId: 'yourChannelId',
        approvedMods: [],
    },
};

export default secrets;

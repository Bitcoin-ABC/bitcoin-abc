// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

interface Secrets {
    botId: string;
    channelId: string;
    approvedMods: number[];
    db: {
        username: string;
        password: string;
        containerName: string;
        port: number;
    };
}

interface TokenServerSecrets {
    dev: Secrets;
    prod: Secrets;
}

const secrets: TokenServerSecrets = {
    dev: {
        botId: 'yourBotId',
        channelId: 'yourChannelId',
        approvedMods: [],
        db: {
            username: 'username',
            password: 'password',
            containerName: 'localhost',
            port: 27017,
        },
    },
    prod: {
        botId: 'yourBotId',
        channelId: 'yourChannelId',
        approvedMods: [],
        db: {
            username: 'username',
            password: 'password',
            containerName: 'localhost',
            port: 27017,
        },
    },
};

export default secrets;

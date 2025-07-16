// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

interface DbCollections {
    blacklist: { name: string };
}

interface DatabaseConfig {
    name: string;
    collections: DbCollections;
}

interface TokenServerConfig {
    port: number;
    db: DatabaseConfig;
    imageDir: string;
    rejectedDir: string;
    maxUploadSize: number;
    whitelist: string[];
    iconSizes: number[];
}

const config: TokenServerConfig = {
    port: 3333,
    db: {
        name: 'tokenServerDb',
        collections: { blacklist: { name: 'blacklist' } },
    },
    // Note: this must be the target= parameter for the --mount instruction of docker run
    // See Production Step 3 in README.md
    imageDir: '/token-server/token-icons',
    rejectedDir: '/token-server/rejected',
    maxUploadSize: 2000000, // max upload size in bytes
    // We support uploading image files from these origins
    whitelist: [
        'http://localhost:3000',
        'https://cashtab.com',
        'https://cashtab.io',
        'https://cashtab-local-dev.netlify.app',
        'https://cashtab-testnet.fabien.cash',
        'chrome-extension://aleabaopoakgpbijdnicepefdiglggfl', // dev extension
        'chrome-extension://obldfcmebhllhjlhjbnghaipekcppeag', // prod extension
    ],
    iconSizes: [32, 64, 128, 256, 512],
};

export default config;

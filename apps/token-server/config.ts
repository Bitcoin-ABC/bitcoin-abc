// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

interface TokenServerConfig {
    port: Number;
    chronikUrls: string[];
    eligibilityResetSeconds: number;
    rewardsTokenId: string;
    rewardAmountTokenSats: bigint;
    xecAirdropAmountSats: number;
    imageDir: string;
    rejectedDir: string;
    maxUploadSize: number;
    whitelist: string[];
    iconSizes: number[];
}

const config: TokenServerConfig = {
    port: 3333,
    chronikUrls: [
        'https://chronik-native1.fabien.cash',
        'https://chronik-native2.fabien.cash',
        'https://chronik.pay2stay.com/xec',
    ],
    eligibilityResetSeconds: 86400, // 24 hours
    // Cachet
    rewardsTokenId:
        'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
    rewardAmountTokenSats: 10000n, // Cachet is a 2-decimal token, so this is 100.00 Cachet
    xecAirdropAmountSats: 3000, // satoshis to send in new wallet XEC airdrops, 1000 = 10 XEC
    // Note: this must be the target= parameter for the --mount instruction of docker run
    // See Production Step 3 in README.md
    imageDir: '/token-server/token-icons',
    rejectedDir: '/token-server/rejected',
    maxUploadSize: 1000000, // max upload size in bytes
    // We support uploading image files from these origins
    whitelist: [
        'http://localhost:3000',
        'https://cashtab.com',
        'https://cashtab-local-dev.netlify.app',
        'chrome-extension://aleabaopoakgpbijdnicepefdiglggfl', // dev extension
        'chrome-extension://obldfcmebhllhjlhjbnghaipekcppeag', // prod extension
    ],
    iconSizes: [32, 64, 128, 256, 512],
};

export default config;

// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

interface TokenServerConfig {
    port: Number;
    chronikUrls: string[];
    eligibilityResetSeconds: number;
    rewardsTokenId: string;
    serverOutputScript: string;
    imageDir: string;
    rejectedDir: string;
    maxUploadSize: number;
    whitelist: string[];
    iconSizes: number[];
}

const config: TokenServerConfig = {
    port: 3333,
    chronikUrls: [
        'https://chronik-native.fabien.cash',
        'https://chronik.pay2stay.com/xec',
        'https://chronik.be.cash/xec2',
    ],
    eligibilityResetSeconds: 86400, // 24 hours
    // Placeholder - rewards token not yet created
    // TODO create specs for Cashtab rewards token and mint
    rewardsTokenId:
        'b132878bfa81cf1b9e19192045ed4c797b10944cc17ae07da06aed3d7b566cb7',
    // Placeholder - tokenserver does not yet have a wallet
    // TODO add ability to broadcast token reward txs
    serverOutputScript: 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
    // Note: this must be the target= parameter for the --mount instruction of docker run
    // See Production Step 3 in README.md
    imageDir: '/token-icons',
    rejectedDir: '/rejected',
    maxUploadSize: 500000, // max upload size in bytes
    // We support uploading image files from these origins
    whitelist: ['https://cashtab.com'],
    iconSizes: [32, 64, 128, 256, 512],
};

export default config;

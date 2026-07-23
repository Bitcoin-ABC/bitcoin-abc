// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { createApp } from './src/app';
import { createChronikClient } from './src/chronik/createChronik';
import { loadTradedConfig } from './src/config/tradedConfig';
import { loadTradedTokens } from './src/tokens/tradedTokens';
import { createLpWallets } from './src/wallet/accounts';

const main = async (): Promise<void> => {
    const tradedConfig = loadTradedConfig();
    const chronik = createChronikClient(tradedConfig.chronikUrls);
    const { seller, slush, addresses } = createLpWallets(
        tradedConfig.mnemonic,
        chronik,
        tradedConfig.feeAddress,
    );

    await Promise.all([seller.sync(), slush.sync()]);
    const tradedTokens = await loadTradedTokens(chronik, tradedConfig);

    const app = createApp();
    await new Promise<void>((resolve, reject) => {
        const server = app.listen(tradedConfig.port, () => {
            console.log(
                `alp-dex listening on port ${tradedConfig.port} (${tradedConfig.pairs.length} pair(s))`,
            );
            console.log(`seller ${addresses.sellerAddress}`);
            console.log(`slush  ${addresses.slushAddress}`);
            console.log(`fee    ${addresses.feeAddress}`);
            for (const token of tradedTokens.values()) {
                console.log(
                    `token  ${token.tokenId} ${token.tokenTicker} ` +
                        `decimals=${token.decimals} utxoAtoms=${token.utxoAtoms}`,
                );
            }
            resolve();
        });
        server.once('error', reject);
    });
};

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});

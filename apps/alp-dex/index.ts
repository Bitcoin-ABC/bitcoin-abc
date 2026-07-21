// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { createApp } from './src/app';
import { loadTradedConfig } from './src/config/tradedConfig';

let tradedConfig;
try {
    tradedConfig = loadTradedConfig();
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
}

const app = createApp();
app.listen(tradedConfig.port, () => {
    console.log(
        `alp-dex listening on port ${tradedConfig.port} (${tradedConfig.pairs.length} pair(s))`,
    );
});

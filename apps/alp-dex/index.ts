// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import 'dotenv/config';
import { createApp } from './src/app';

const port = Number.parseInt(process.env.PORT ?? '');
if (Number.isNaN(port) || port <= 0) {
    console.error('PORT must be set to a positive integer (see env.sample)');
    process.exit(1);
}

const app = createApp();
app.listen(port, () => {
    console.log(`alp-dex listening on port ${port}`);
});

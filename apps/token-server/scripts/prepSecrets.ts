// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * prepSecrets.ts
 *
 * If there is no secrets.ts in place, create a stub
 * This allows CI to test npm run build without keeping secrets in the repo
 */

import fs from 'fs';

if (fs.existsSync('secrets.ts')) {
    console.log(`secrets.ts exists, proceeding to build...`);
} else {
    console.log(`secrets.ts does not exist, copying secrets.sample.ts...`);
    fs.copyFileSync('secrets.sample.ts', 'secrets.ts');
}

// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

const fs = require('fs');
const path = require('path');

const packageRoot = path.join(__dirname, '..');
const packageJsonPath = path.join(packageRoot, 'package.json');
const manifestPath = path.join(
    packageRoot,
    'extension',
    'public',
    'manifest.json',
);

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const newVersion = packageJson.version;

if (manifest.version !== newVersion) {
    manifest.version = newVersion;
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 4)}\n`);
    console.log(`Updated extension manifest version to ${newVersion}`);
} else {
    console.log(`Extension manifest version already ${newVersion}`);
}

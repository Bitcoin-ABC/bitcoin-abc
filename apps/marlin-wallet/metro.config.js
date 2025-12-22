// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const monorepoRoot = path.resolve(__dirname, '../..');

const config = {
    // Watch the monorepo root for changes
    watchFolders: [monorepoRoot],

    nodeModulesPaths: [
        path.resolve(__dirname, 'node_modules'),
        path.resolve(monorepoRoot, 'node_modules'),
    ],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

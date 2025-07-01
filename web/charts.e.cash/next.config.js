// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    env: {
        CUSTOM_KEY: process.env.CUSTOM_KEY,
    },
    // Remove rewrites since we're using local API routes
};

module.exports = nextConfig;

// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Preview config distinct from production config
// For now, the only difference is the absence of async headers() {
const nextConfig = {
    reactStrictMode: true,
    compiler: {
        styledComponents: true,
    },
    eslint: {
        dirs: [
            'pages',
            'app',
            'components',
            'lib',
            'src',
            'data',
            'styles',
            '.eslintrc.js',
            'next.config.js',
            'jest.config.js',
        ],
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'api.scorecard.cash',
            },
            {
                protocol: 'https',
                hostname: 'strapi.fabien.cash',
            },
        ],
    },
    async redirects() {
        return [
            {
                source: '/roadmap-explained',
                destination: '/roadmap',
                permanent: true,
            },
            {
                source: '/ecash-brand',
                destination: '/brand',
                permanent: true,
            },
        ];
    },
};

module.exports = nextConfig;

// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
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
    async headers() {
        return [
            {
                source: '/(.*?)',
                headers: [
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains; preload',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=()',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value:
                            process.env.NODE_ENV === 'development'
                                ? `default-src 'self' https: wss: 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data:;`
                                : `default-src https: wss: 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data:;`,
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;

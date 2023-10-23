// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Define header
const headerArray = [
    ` Copyright (c) ${new Date().getFullYear()} The Bitcoin developers`,
    ' Distributed under the MIT software license, see the accompanying',
    ' file COPYING or http://www.opensource.org/licenses/mit-license.php.',
];
module.exports = {
    // root: true as this repo exists within a monorepo
    // We only want these special next settings to be used in this repo
    // https://github.com/vercel/next.js/issues/40687
    root: true,
    extends: 'next/core-web-vitals',
    overrides: [
        {
            files: ['*.js'],
            // This is the default parser of ESLint
            parser: 'espree',
            parserOptions: {
                ecmaVersion: 2020,
            },
        },
    ],
    plugins: ['header'],
    rules: {
        'header/header': [
            2,
            'line',
            [
                ' Copyright (c) 2023 The Bitcoin developers',
                ' Distributed under the MIT software license, see the accompanying',
                ' file COPYING or http://www.opensource.org/licenses/mit-license.php.',
            ],
            1,
        ],
    },
};

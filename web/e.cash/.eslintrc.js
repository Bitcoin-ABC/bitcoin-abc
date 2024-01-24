// Copyright (c) 2023-2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
const headerArray = [
    {
        pattern:
            '^ Copyright \\(c\\) [2][0-9]{3}([-][2][0-9]{3})? The Bitcoin developers$',
        template: ` Copyright (c) 2023-${new Date().getFullYear()} The Bitcoin developers`,
    },
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
    ignorePatterns: ['__mocks__/'],
    rules: {
        'header/header': [2, 'line', headerArray, 1],
    },
};

// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

const headerArray = [
    {
        pattern:
            '^ Copyright \\(c\\) 2[0-9]{3}(-2[0-9]{3})? The Bitcoin developers$',
        template: ` Copyright (c) ${new Date().getFullYear()} The Bitcoin developers`,
    },
    ' Distributed under the MIT software license, see the accompanying',
    ' file COPYING or http://www.opensource.org/licenses/mit-license.php.',
];

module.exports = {
    env: {
        node: true,
        commonjs: true,
        es2021: true,
        mocha: true,
    },
    overrides: [],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended', // Add TypeScript recommended rules
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module', // If you're using ES modules
        parser: '@typescript-eslint/parser', // Use the TS parser
    },
    plugins: [
        'header',
        '@typescript-eslint', // Add the TypeScript plugin
    ],
    rules: {
        'strict': 'error',
        'header/header': [2, 'line', headerArray, 2],
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [
            'error',
            { varsIgnorePattern: '^_' },
        ],
    },
};

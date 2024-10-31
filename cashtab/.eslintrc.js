// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

const headerArray = [
    {
        pattern:
            '^ Copyright \\(c\\) [2][0-9]{3}([-][2][0-9]{3})? The Bitcoin developers$',
        template: ` Copyright (c) ${new Date().getFullYear()} The Bitcoin developers`,
    },
    ' Distributed under the MIT software license, see the accompanying',
    ' file COPYING or http://www.opensource.org/licenses/mit-license.php.',
];

module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:jest/recommended',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
            jsx: true,
        },
    },
    plugins: [
        'etc',
        'react',
        'jest',
        'testing-library',
        'header',
        '@typescript-eslint',
    ],
    rules: {
        'jest/no-mocks-import': 'off',
        'etc/no-commented-out-code': 'error',
        'header/header': [2, 'line', headerArray, 2],
    },
    settings: {
        'react': { version: 'detect' },
        'import/resolver': {
            node: {
                paths: ['src'],
            },
        },
    },
    overrides: [
        {
            // Enable eslint-plugin-testing-library rules or preset only for matching testing files!
            files: [
                '**/__tests__/**/*.[jt]s?(x)',
                '**/?(*.)+(spec|test).[jt]s?(x)',
            ],
            extends: ['plugin:testing-library/react'],
            rules: {
                'testing-library/no-node-access': 'off',
            },
        },
    ],
};

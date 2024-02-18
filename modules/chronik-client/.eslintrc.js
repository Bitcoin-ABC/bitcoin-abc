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
    root: true,
    env: {
        node: true,
        commonjs: true,
        es2021: true,
        mocha: true,
    },
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'header'],
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    rules: {
        'strict': 'error',
        'header/header': [2, 'line', headerArray, 2],
    },
};

// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

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
        node: true,
        commonjs: true,
        es2021: true,
        mocha: true,
    },
    overrides: [],
    extends: 'eslint:recommended',
    parserOptions: {
        ecmaVersion: 'latest',
    },
    plugins: ['header'],
    rules: {
        'strict': 'error',
        'header/header': [2, 'line', headerArray, 2],
    },
};

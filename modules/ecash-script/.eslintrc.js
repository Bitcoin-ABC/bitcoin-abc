// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

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

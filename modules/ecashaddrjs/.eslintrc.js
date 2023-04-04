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
    rules: { strict: 'error' },
};

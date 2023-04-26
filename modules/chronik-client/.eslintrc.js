module.exports = {
    root: true,
    env: {
        node: true,
        commonjs: true,
        es2021: true,
        mocha: true,
    },
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
};

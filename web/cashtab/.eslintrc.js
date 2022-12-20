module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:jest/recommended',
    ],
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
        },
        ecmaVersion: 12,
        sourceType: 'module',
    },
    plugins: ['etc', 'react', 'jest'],
    rules: {
        'jest/no-mocks-import': 'off',
        'etc/no-commented-out-code': 'error',
    },
    settings: { react: { version: 'detect' } },
};

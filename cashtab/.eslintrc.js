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
    plugins: ['etc', 'react', 'jest', 'testing-library'],
    rules: {
        'jest/no-mocks-import': 'off',
        'etc/no-commented-out-code': 'error',
    },
    settings: { react: { version: 'detect' } },
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

// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import pluginJs from '@eslint/js';
import header from 'eslint-plugin-header';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import jest from 'eslint-plugin-jest';
import mocha from 'eslint-plugin-mocha';
import coreWebVitals from 'eslint-config-next/core-web-vitals.js';
import nextTypescript from 'eslint-config-next/typescript.js';
import parser from '@typescript-eslint/parser';

export const abcHeaderRule = {
    'header/header': [
        2, // Severity (1 for warning, 2 for error)
        'line', // Comment style (line or block)
        [
            {
                pattern:
                    '^ Copyright \\(c\\) [2][0-9]{3}([-][2][0-9]{3})? The Bitcoin developers$',
                template: ` Copyright (c) ${new Date().getFullYear()} The Bitcoin developers`,
            },
            ' Distributed under the MIT software license, see the accompanying',
            ' file COPYING or http://www.opensource.org/licenses/mit-license.php.',
        ], // the actual header
        1, // number of new lines enforced after header
    ],
};

// Shim for header plugin
header.rules.header.meta.schema = false;

// NextJS
const coreWebVitalsRules = coreWebVitals.rules;
const typescriptRules = nextTypescript.rules;

export default tseslint.config(
    // Base configurations
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended.map(config => ({
        ...config,
        rules: {
            ...config.rules,
        },
    })),

    // nodejs (not including tests)
    {
        files: [
            'apps/**/*.{js,jsx,ts,tsx,cjs,mjs}',
            'modules/**/*.{js,jsx,ts,tsx,cjs,mjs}',
        ],
        plugins: {
            header,
        },
        rules: {
            ...abcHeaderRule,
            '@typescript-eslint/no-require-imports': 'off',
            'eol-last': ['error', 'always'],
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    args: 'all',
                    argsIgnorePattern: '^_',
                    vars: 'all',
                    varsIgnorePattern: '^_',
                },
            ],
        },
        languageOptions: {
            globals: {
                ...globals.node,
                structuredClone: true,
            },
        },
    },

    // nodejs test files (apps/ and modules/)
    {
        files: [
            'apps/**/__tests__/**/*.{js,jsx,ts,tsx}',
            'apps/**/*.test.{js,ts,jsx,tsx}',
            'modules/**/__tests__/**/*.{js,jsx,ts,tsx}',
            'modules/**/*.test.{js,ts,jsx,tsx}',
        ],
        plugins: {
            mocha: mocha,
        },
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.mocha,
                structuredClone: true,
            },
        },
        rules: {
            ...abcHeaderRule,
            'mocha/no-exclusive-tests': 'error',
            'mocha/no-pending-tests': 'error',
            'mocha/no-identical-title': 'error',
            'mocha/handle-done-callback': 'error',
            'mocha/no-async-describe': 'error',
            'eol-last': ['error', 'always'],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    args: 'all',
                    argsIgnorePattern: '^_',
                    vars: 'all',
                    varsIgnorePattern: '^_',
                },
            ],
        },
    },

    // cashtab/
    {
        files: ['cashtab/**/*.{js,jsx,ts,tsx,cjs,mjs}'],
        plugins: {
            header,
        },
        rules: {
            ...abcHeaderRule,
            '@typescript-eslint/no-require-imports': 'off',
            'eol-last': ['error', 'always'],
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    args: 'all',
                    argsIgnorePattern: '^_',
                    vars: 'all',
                    varsIgnorePattern: '^_',
                },
            ],
        },
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser,
                structuredClone: true,
            },
        },
    },

    // NextJS
    {
        files: ['web/**/*.{js,jsx,ts,tsx,mjs,cjs}'],
        plugins: {
            header: header,
        },
        rules: {
            ...coreWebVitalsRules,
            ...typescriptRules,
            ...abcHeaderRule,
            'react/no-unescaped-entities': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    args: 'all',
                    argsIgnorePattern: '^_',
                    vars: 'all',
                    varsIgnorePattern: '^_',
                },
            ],
        },
        languageOptions: {
            parser,
            globals: {
                ...globals.node,
                ...globals.browser,
            },
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },

    // jest test files
    {
        files: [
            'cashtab/jest.setup.js',
            'cashtab/**/__tests__/**/*.{js,jsx,ts,tsx}',
            'cashtab/**/*.test.{js,ts,jsx,tsx}',
            'web/**/*.test.{js,ts,jsx,tsx}',
        ],
        plugins: {
            jest,
        },
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser,
                ...globals.jest,
                structuredClone: true,
            },
        },
        rules: {
            ...abcHeaderRule,
            'jest/no-disabled-tests': 'warn',
            'jest/no-focused-tests': 'error',
            'jest/no-identical-title': 'error',
            'jest/prefer-to-have-length': 'warn',
            'jest/valid-expect': 'error',
            'jest/valid-describe-callback': 'error',
            'jest/valid-expect-in-promise': 'error',
            'eol-last': ['error', 'always'],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    args: 'all',
                    argsIgnorePattern: '^_',
                    vars: 'all',
                    varsIgnorePattern: '^_',
                },
            ],
        },
    },
);

module.exports = {
    roots: ['<rootDir>/src'],
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}', '!src/**/*.d.ts'],
    coverageDirectory: '<rootDir>/coverage',
    coverageThreshold: {
        global: {
            branches: 0,
            functions: 0,
            lines: 0,
            statements: 0,
        },
    },
    setupFiles: ['react-app-polyfill/jsdom'],
    testTimeout: 20000,
    testMatch: [
        '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
        '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
    ],
    testEnvironment: './config/jest/uint8array-environment',
    transform: {
        '\\.[jt]sx?$': 'babel-jest',
    },
    transformIgnorePatterns: [
        '/node_modules/(?!antd|@ant-design|rc-.+?|@babel/runtime).+(js|jsx)$',
        '[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs|cjs|ts|tsx)$',
        '^.+\\.module\\.(css|sass|scss)$',
    ],
    modulePaths: ['src'],
    moduleNameMapper: {
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
            '<rootDir>/config/jest/__mocks__/fileMock.js',
        '\\.svg': '<rootDir>/config/jest/__mocks__/svg.js',
        '\\.(css|less)$': 'identity-obj-proxy',
    },
    moduleFileExtensions: [
        'web.js',
        'js',
        'web.ts',
        'ts',
        'web.tsx',
        'tsx',
        'json',
        'web.jsx',
        'jsx',
        'node',
    ],
    watchPlugins: [
        'jest-watch-typeahead/filename',
        'jest-watch-typeahead/testname',
    ],
    resetMocks: true,
};

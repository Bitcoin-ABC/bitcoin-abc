'use strict';

module.exports = {
    require: ['mocha-suppress-logs', 'ts-node/register'],
    extensions: ['js', 'ts'],
    spec: ['test/**/*.test.ts'],
    timeout: 15000,
};

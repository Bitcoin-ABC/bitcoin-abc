'use strict';
module.exports = {
    require: ['mocha-suppress-logs', 'ts-node/register'],
    extensions: ['ts'],
    spec: ['src/**/*.test.ts'],
};

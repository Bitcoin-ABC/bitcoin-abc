// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'test';
process.env.NODE_ENV = 'test';
process.env.PUBLIC_URL = '';
process.env.TZ = 'UTC';
process.env.LANG = 'en_US.UTF-8';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
    throw err;
});

// Ensure environment variables are read.
require('../config/env');

// eslint-disable-next-line jest/no-jest-import
const jest = require('jest');
let argv = process.argv.slice(2);

// watchAll unless on CI or explicitly told not to watchAll
if (!process.env.CI && argv.indexOf('--watchAll=false') === -1) {
    // Always run all tests
    argv.push('--watchAll');
    // Update snapshots
    argv.push('--updateSnapshot');
}

jest.run(argv);

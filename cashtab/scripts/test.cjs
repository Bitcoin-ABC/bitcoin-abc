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
require('../config/env.cjs');

const jest = require('jest');
let argv = process.argv.slice(2);

// Silence logs unless env var DEBUG=true
if (process.env.DEBUG !== 'true') {
    argv.push('--silent');
}

jest.run(argv);

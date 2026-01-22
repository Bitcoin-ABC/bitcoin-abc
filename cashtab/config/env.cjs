// Copyright (c) 2024-2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

const fs = require('fs');
const path = require('path');

const NODE_ENV = process.env.NODE_ENV;
if (!NODE_ENV) {
    throw new Error(
        'The NODE_ENV environment variable is required but was not specified.',
    );
}

// Resolve app directory (project root)
const appDirectory = fs.realpathSync(process.cwd());
const dotenv = path.resolve(appDirectory, '.env');

// https://github.com/bkeepers/dotenv#what-other-env-files-can-i-use
// Check for .env.android first (used for Android builds)
const envAndroidPath = path.resolve(appDirectory, '.env.android');
const dotenvFiles = [
    envAndroidPath,
    `${dotenv}.${NODE_ENV}.local`,
    // Don't include `.env.local` for `test` environment
    // since normally you expect tests to produce the same
    // results for everyone
    NODE_ENV !== 'test' && `${dotenv}.local`,
    `${dotenv}.${NODE_ENV}`,
    dotenv,
].filter(Boolean);

// Load environment variables from .env* files. Suppress warnings using silent
// if this file is missing. dotenv will never modify any environment variables
// that have already been set.  Variable expansion is supported in .env files.
// https://github.com/motdotla/dotenv
// https://github.com/motdotla/dotenv-expand
dotenvFiles.forEach(dotenvFile => {
    if (fs.existsSync(dotenvFile)) {
        require('dotenv-expand').expand(
            require('dotenv').config({
                path: dotenvFile,
            }),
        );
    }
});

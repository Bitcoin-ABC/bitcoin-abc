// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { defineConfig } from 'cypress';

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        defaultCommandTimeout: 60 * 1000,
        pageLoadTimeout: 60 * 1000,
        specPattern: 'cypress/e2e/**/*.cy.ts',
        supportFile: false,
    },
});

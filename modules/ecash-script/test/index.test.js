// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');

describe('index.js', function () {
    it('index.js exports all functions exported by src files', function () {
        const scriptFunctions = require('../src/script');
        const utilsFunctions = require('../src/utils');

        const allFunctionsExportedBySrcFiles = Object.keys(
            scriptFunctions,
        ).concat(Object.keys(utilsFunctions));

        const exportedByIndex = require('../index');

        const allFunctionsExportedByIndex = Object.keys(exportedByIndex);
        assert.deepEqual(
            allFunctionsExportedBySrcFiles,
            allFunctionsExportedByIndex,
        );
    });
});

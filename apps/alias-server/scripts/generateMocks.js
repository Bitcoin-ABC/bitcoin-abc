// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const fs = require('fs');
const path = require('path');
const config = require('../config');
const {
    getAliasTxs,
    sortAliasTxsByTxidAndBlockheight,
    getValidAliasRegistrations,
} = require('../src/alias');
const { getAllTxHistory } = require('../src/chronik');
const {
    generateReservedAliasTxArray,
    getHexFromAlias,
    getAliasBytecount,
} = require('../src/utils');

const { ChronikClient } = require('chronik-client');
const chronik = new ChronikClient(config.chronik);

async function generateMocks() {
    // Directory for mocks. Relative to /scripts, ../test/mocks/generated/
    const mocksDir = path.join(__dirname, '..', 'test', 'mocks', 'generated');

    // Create directory if it does not exist
    if (!fs.existsSync(mocksDir)) {
        fs.mkdirSync(mocksDir);
    }

    // chronik tx history of alias registration address
    const aliasTxHistory = await getAllTxHistory(
        chronik,
        config.aliasConstants.registrationHash160,
    );
    fs.writeFileSync(
        `${mocksDir}/aliasTxHistory.json`,
        JSON.stringify(aliasTxHistory, null, 2),
        'utf-8',
    );

    // All valid alias txs at alias registration address
    // NB unconfirmed txs have blockheight === 100,000,000
    const allAliasTxs = getAliasTxs(aliasTxHistory, config.aliasConstants);
    fs.writeFileSync(
        `${mocksDir}/allAliasTxs.json`,
        JSON.stringify(allAliasTxs, null, 2),
        'utf-8',
    );

    /* 
    All valid alias txs at alias registration address, 
    sorted by blockheight earliest to most recent, and txid
    alphabetically.

    NB unconfirmed txs have blockheight === 100,000,000
    */
    const allAliasTxsSortedByTxidAndBlockheight =
        sortAliasTxsByTxidAndBlockheight(allAliasTxs);
    fs.writeFileSync(
        `${mocksDir}/allAliasTxsSortedByTxidAndBlockheight.json`,
        JSON.stringify(allAliasTxsSortedByTxidAndBlockheight, null, 2),
        'utf-8',
    );

    /*
    validAliasRegistrations
    
    validAliasRegistrations are registered aliases. 
    These will never change unless and until Phase 2 migration.
    */
    const validAliasRegistrations = getValidAliasRegistrations(allAliasTxs);
    fs.writeFileSync(
        `${mocksDir}/validAliasTxs.json`,
        JSON.stringify(validAliasRegistrations, null, 2),
        'utf-8',
    );

    const reservedAliasTxArray = generateReservedAliasTxArray();
    fs.writeFileSync(
        `${mocksDir}/reservedAliasTxArray.json`,
        JSON.stringify(reservedAliasTxArray, null, 2),
        'utf-8',
    );

    // Get an array of just valid aliases
    const aliasHexConversions = [];
    for (let i = 0; i < validAliasRegistrations.length; i += 1) {
        const { alias } = validAliasRegistrations[i];
        const aliasHex = getHexFromAlias(alias);
        const aliasByteCount = getAliasBytecount(alias);
        aliasHexConversions.push({ alias, aliasHex, aliasByteCount });
    }
    fs.writeFileSync(
        `${mocksDir}/aliasHexConversions.json`,
        JSON.stringify(aliasHexConversions, null, 2),
        'utf-8',
    );
    // Exit script in success condition
    process.exit(0);
}

generateMocks();

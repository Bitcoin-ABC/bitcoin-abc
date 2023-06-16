// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const fs = require('fs');
const path = require('path');
const config = require('../config');
const aliasConstants = require('../constants/alias');
const {
    getAliasTxs,
    sortAliasTxsByTxidAndBlockheight,
    registerAliases,
} = require('../src/alias');
const { getAllTxHistory } = require('../src/chronik');
const { getHexFromAlias, getAliasBytecount } = require('../src/utils');

const { ChronikClient } = require('chronik-client');
const chronik = new ChronikClient(config.chronik);

// Use an in-memory db
// Mock mongodb
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { initializeDb } = require('../src/db');

async function generateMocks() {
    // Initialize mock db
    // Start mongo memory server before running this suite of unit tests
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    const testMongoClient = new MongoClient(mongoUri);

    let testDb;
    try {
        testDb = await initializeDb(testMongoClient);
    } catch (err) {
        console.log('\x1b[31m%s\x1b[0m', `Error in initializeDb`, err);
        process.exit(1);
    }

    // Directory for mocks. Relative to /scripts, ../test/mocks/generated/
    const mocksDir = path.join(__dirname, '..', 'test', 'mocks', 'generated');

    // Create directory if it does not exist
    if (!fs.existsSync(mocksDir)) {
        fs.mkdirSync(mocksDir);
    }

    // chronik tx history of alias registration address
    const aliasTxHistory = await getAllTxHistory(
        chronik,
        aliasConstants.registrationAddress,
    );
    if (!aliasTxHistory) {
        // getAllTxHistory returns false if there is a chronik error
        console.log(
            '\x1b[31m%s\x1b[0m',
            `Error in getAllTxHistory, exiting generateMocks.js`,
        );
        process.exit(1);
    }
    fs.writeFileSync(
        `${mocksDir}/aliasTxHistory.json`,
        JSON.stringify(aliasTxHistory, null, 2),
        'utf-8',
    );

    // All valid alias txs at alias registration address
    // NB unconfirmed txs have blockheight === 100,000,000
    const allAliasTxs = getAliasTxs(aliasTxHistory, aliasConstants);
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

    const validAliasRegistrations = await registerAliases(testDb, allAliasTxs);
    fs.writeFileSync(
        `${mocksDir}/validAliasRegistrations.json`,
        JSON.stringify(validAliasRegistrations, null, 2),
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

    // Wipe the database after using the in-memory mock
    await testDb.dropDatabase();
    // Shut down mongo memory server after running this suite of unit tests
    await testMongoClient.close();
    await mongoServer.stop();

    console.log(
        '\x1b[32m%s\x1b[0m',
        `✔ Mocks successfully written to ${mocksDir}`,
    );

    // Exit script in success condition
    process.exit(0);
}

generateMocks();

'use strict';
const fs = require('fs');
const path = require('path');
const config = require('../config');
const {
    getAliasTxs,
    sortAliasTxsByTxidAndBlockheight,
    getValidAliasRegistrations,
} = require('../alias');
const { getAllTxHistory } = require('../chronik');
const {
    generateReservedAliasTxArray,
    getHexFromAlias,
    getAliasBytecount,
} = require('../utils');
const { initializeDb } = require('../db');

async function generateMocks() {
    // Directory for mocks. Relative to /scripts, ../test/mocks/generated/
    const mocksDir = path.join(__dirname, '..', 'test', 'mocks', 'generated');

    // Create directory if it does not exist
    if (!fs.existsSync(mocksDir)) {
        fs.mkdirSync(mocksDir);
    }

    // Initialize db
    const db = await initializeDb();

    // Get the valid aliases already in the db
    let validAliasesInDb;
    try {
        validAliasesInDb = await db
            .collection(config.database.collections.validAliases)
            .find()
            .sort({ blockheight: 1 })
            .project({ _id: 0 })
            .toArray();
        console.log(`${validAliasesInDb.length} valid aliases in database`);
    } catch (error) {
        console.log(`Error in determining validAliasesInDb`, error);
    }

    fs.writeFileSync(
        `${mocksDir}/validAliasesInDb.json`,
        JSON.stringify(validAliasesInDb, null, 2),
        'utf-8',
    );

    // Get confirmedTxHistory already in db
    let confirmedTxHistoryInDb;
    try {
        confirmedTxHistoryInDb = await db
            .collection(config.database.collections.confirmedTxHistory)
            .find()
            .sort({ blockheight: 1 })
            .project({ _id: 0 })
            .toArray();
        console.log(
            `Fetched ${confirmedTxHistoryInDb.length} confirmed transactions at alias registration address from database`,
        );
    } catch (error) {
        console.log(`Error in determining confirmedTxHistoryInDb`, error);
        console.log(`Assuming no cached tx history`);
        confirmedTxHistoryInDb = [];
        // Exit script in error condition
        process.exit(1);
    }

    fs.writeFileSync(
        `${mocksDir}/confirmedTxHistoryInDb.json`,
        JSON.stringify(confirmedTxHistoryInDb, null, 2),
        'utf-8',
    );

    // chronik tx history of alias registration address
    const aliasTxHistory = await getAllTxHistory(
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

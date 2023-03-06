const fs = require('fs');
const path = require('path');
const config = require('../config');
const {
    getAllAliasTxs,
    sortAliasTxsByTxidAndBlockheight,
    getValidAliasRegistrations,
} = require('../alias');
const { getAllTxHistory } = require('../chronik');
const {
    generateReservedAliasTxArray,
    getHexFromAlias,
    getAliasBytecount,
} = require('../utils');

async function generateMocks() {
    // Directory for mocks. Relative to /scripts, ../test/mocks/generated/
    const mocksDir = path.join(__dirname, '..', 'test', 'mocks', 'generated');

    // Create directory if it does not exist
    if (!fs.existsSync(mocksDir)) {
        fs.mkdirSync(mocksDir);
    }
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
    const allAliasTxs = getAllAliasTxs(aliasTxHistory, config.aliasConstants);
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
    validAliasObjects, pendingAliasObjects
    
    validAliasObjects are registered aliases. 
    These will never change unless and until Phase 2 migration.
    
    pendingAliasObjects are alias registrations that will be valid after the tx confirmed,
    assuming no other tx with an alphabetically earlier txid comes into the same block
    */
    const { validAliasTxs, pendingAliasTxs } =
        getValidAliasRegistrations(allAliasTxs);
    fs.writeFileSync(
        `${mocksDir}/validAliasTxs.json`,
        JSON.stringify(validAliasTxs, null, 2),
        'utf-8',
    );
    fs.writeFileSync(
        `${mocksDir}/pendingAliasTxs.json`,
        JSON.stringify(pendingAliasTxs, null, 2),
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
    for (let i = 0; i < validAliasTxs.length; i += 1) {
        const { alias } = validAliasTxs[i];
        const aliasHex = getHexFromAlias(alias);
        const aliasByteCount = getAliasBytecount(alias);
        aliasHexConversions.push({ alias, aliasHex, aliasByteCount });
    }
    fs.writeFileSync(
        `${mocksDir}/aliasHexConversions.json`,
        JSON.stringify(aliasHexConversions, null, 2),
        'utf-8',
    );
}

generateMocks();

const config = require('./config');
const { getAllTxHistory } = require('./chronik');
const {
    getAllAliasTxs,
    sortAliasTxsByTxidAndBlockheight,
    getValidAliasRegistrations,
} = require('./alias.js');
const fs = require('fs');

async function writeTestDataToDatabase(testData) {}

async function generateMocks() {
    // chronik tx history of alias registration address
    const aliasTxHistory = await getAllTxHistory(
        config.aliasConstants.registrationHash160,
    );
    fs.writeFileSync(
        './test/mocks/generated/aliasTxHistory.json',
        JSON.stringify(aliasTxHistory, null, 2),
        'utf-8',
    );

    // All valid alias txs at alias registration address
    // NB unconfirmed txs have blockheight === 100,000,000
    const allAliasTxs = getAllAliasTxs(aliasTxHistory, config.aliasConstants);
    fs.writeFileSync(
        './test/mocks/generated/allAliasTxs.json',
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
        './test/mocks/generated/allAliasTxsSortedByTxidAndBlockheight.json',
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
        './test/mocks/generated/validAliasTxs.json',
        JSON.stringify(validAliasTxs, null, 2),
        'utf-8',
    );
    fs.writeFileSync(
        './test/mocks/generated/pendingAliasTxs.json',
        JSON.stringify(pendingAliasTxs, null, 2),
        'utf-8',
    );
}

generateMocks();

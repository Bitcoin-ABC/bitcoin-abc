const config = require('./config');
const {
    getAllTxHistory,
    initializeWebsocket,
    parseWebsocketMessage,
} = require('./chronik');
const {
    getAllAliasTxs,
    sortAliasTxsByTxidAndBlockheight,
    getValidAliasRegistrations,
} = require('./alias.js');
const { generateReservedAliasTxArray } = require('./utils');
const fs = require('fs');
const { initializeDb } = require('./db');
const log = require('./log');
const express = require('express');

async function main() {
    // Initialize db connection
    const db = await initializeDb();

    // Initialize websocket connection
    const aliasWebsocket = await initializeWebsocket(db);
    if (aliasWebsocket && aliasWebsocket._subs && aliasWebsocket._subs[0]) {
        const subscribedHash160 = aliasWebsocket._subs[0].scriptPayload;
        log(`Websocket subscribed to ${subscribedHash160}`);
    }

    // Run parseWebsocketMessage on startup mocking a block found
    parseWebsocketMessage(db);

    // Set up your API endpoints
    const app = express();
    app.use(express.json());

    app.get('/aliases', async function (req, res) {
        log(`API request received, processing...`);
        let aliases;
        try {
            aliases = await db
                .collection(config.database.collections.validAliases)
                .find()
                .project({ _id: 0, txid: 0, blockheight: 0 })
                .toArray();
            return res.status(200).json(aliases);
        } catch (error) {
            return res.status(500).json({ error });
        }
    });

    app.listen(config.express.port);
}

async function writeAliasDataToDatabase() {
    // Get alias data
    // chronik tx history of alias registration address
    const aliasTxHistory = await getAllTxHistory(
        config.aliasConstants.registrationHash160,
    );
    const allAliasTxs = getAllAliasTxs(aliasTxHistory, config.aliasConstants);
    const { validAliasTxs, pendingAliasTxs } =
        getValidAliasRegistrations(allAliasTxs);

    // Initialize db connection
    const db = await initializeDb();

    // Update with real data
    if (validAliasTxs.length > 0) {
        try {
            const validAliasTxsCollectionInsertResult = await db
                .collection(config.database.collections.validAliases)
                .insertMany(validAliasTxs);
            console.log(
                'validAliasTxsCollection inserted documents =>',
                validAliasTxsCollectionInsertResult,
            );
        } catch (err) {
            log(
                `A MongoBulkWriteException occurred adding validAliasTxs to the db, but there are successfully processed documents.`,
            );
            let ids = err.result.result.insertedIds;
            for (let id of Object.values(ids)) {
                log(`Processed a document with id ${id._id}`);
            }
            log(`Number of documents inserted: ${err.result.result.nInserted}`);
        }
    }
}

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

function generateReservedAliasTxsMock() {
    const reservedAliasTxArray = generateReservedAliasTxArray();
    fs.writeFileSync(
        './test/mocks/generated/reservedAliasTxArray.json',
        JSON.stringify(reservedAliasTxArray, null, 2),
        'utf-8',
    );
}

//generateMocks();
//writeAliasDataToDatabase();
//generateReservedAliasTxsMock();
main();

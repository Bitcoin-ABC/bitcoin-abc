// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const config = require('../config');

const MONGO_DB_ERRORCODES = {
    duplicateKey: 11000,
};

module.exports = {
    initializeDb: async function (mongoClient) {
        // Use connect method to connect to the server
        await mongoClient.connect();
        console.log('Connected successfully to MongoDB server');
        const db = mongoClient.db(config.database.name);
        // Enforce unique aliases
        db.collection(config.database.collections.validAliases).createIndex(
            {
                alias: 1,
            },
            {
                unique: true,
            },
        );
        // Check if serverState collection exists
        const serverStateExists =
            (await db
                .collection(config.database.collections.serverState)
                .countDocuments()) > 0;

        // If serverState collection does not exist
        if (!serverStateExists) {
            // Create it
            await db.createCollection(
                config.database.collections.serverState,
                // serverState may only have one document
                // 4096 is max size in bytes, required by mongo
                // 4096 is smallest max size allowed
                { capped: true, size: 4096, max: 1 },
            );
            // Initialize server with zero alias txs processed
            await module.exports.updateServerState(
                db,
                config.initialServerState,
            );
            console.log(`Initialized serverState on app startup`);
        }
        console.log(
            `Configured connection to database ${config.database.name}`,
        );
        return db;
    },
    getServerState: async function (db) {
        let serverState;
        try {
            serverState = await db
                .collection(config.database.collections.serverState)
                .find()
                // We don't need the _id field
                .project({ _id: 0 })
                .next();
            // Only 1 document in collection
            return serverState;
        } catch (err) {
            console.log(`Error in determining serverState.`, err);
            return false;
        }
    },
    updateServerState: async function (db, newServerState) {
        try {
            const { processedConfirmedTxs, processedBlockheight } =
                newServerState;

            if (
                typeof processedConfirmedTxs !== 'number' ||
                typeof processedBlockheight !== 'number'
            ) {
                return false;
            }

            // An empty document as a query i.e. {} will update the first
            // document returned in the collection
            // serverState only has one document
            const serverStateQuery = {};

            const serverStateUpdate = {
                $set: {
                    processedConfirmedTxs,
                    processedBlockheight,
                },
            };
            // If you are running the server for the first time and there is no
            // serverState in the db, create it
            const serverStateOptions = { upsert: true };

            await db
                .collection(config.database.collections.serverState)
                .updateOne(
                    serverStateQuery,
                    serverStateUpdate,
                    serverStateOptions,
                );
            return true;
        } catch (err) {
            // If this isn't updated, the server will process too many txs next time
            // TODO Let the admin know. This won't impact parsing but will cause processing too many txs
            console.log(`Error in function updateServerState.`, err);
            return false;
        }
    },
    addOneAliasToDb: async function (db, newAliasTx) {
        try {
            await db
                .collection(config.database.collections.validAliases)
                .insertOne(newAliasTx);
            return true;
        } catch (err) {
            // Only log some error other than duplicate key error
            if (err && err.code !== MONGO_DB_ERRORCODES.duplicateKey) {
                console.log(`Error in function addOneAliasToDb:`);
                console.log(err);
            }
            return false;
        }
    },
    addAliasesToDb: async function (db, newValidAliases) {
        let validAliasesAddedToDbSuccess;
        try {
            validAliasesAddedToDbSuccess = await db
                .collection(config.database.collections.validAliases)
                .insertMany(newValidAliases);
            console.log(
                `Inserted ${validAliasesAddedToDbSuccess.insertedCount} aliases into ${config.database.collections.validAliases}`,
            );
            return true;
        } catch (err) {
            console.log(`Error in function addAliasesToDb.`, err);
            return false;
        }
    },
    getAliasesFromDb: async function (db) {
        let validAliasesInDb;
        try {
            validAliasesInDb = await db
                .collection(config.database.collections.validAliases)
                .find()
                .sort({ blockheight: 1 })
                .project({ _id: 0 })
                .toArray();
            return validAliasesInDb;
        } catch (err) {
            console.log(
                `Error in determining validAliasesInDb in function getValidAliasesFromDb.`,
                err,
            );
            return false;
        }
    },
};

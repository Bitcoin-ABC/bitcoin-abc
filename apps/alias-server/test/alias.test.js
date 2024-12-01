// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const { getOutputScriptFromAddress } = require('ecashaddrjs');
const config = require('../config');
const aliasConstants = require('../constants/alias');
const {
    parseAliasTx,
    getAliasTxs,
    sortAliasTxsByTxidAndBlockheight,
    registerAliases,
    parseTxForPendingAliases,
} = require('../src/alias');
const { splitTxsByConfirmed } = require('../src/utils');
const { generated, templates } = require('./mocks/aliasMocks');
// Mock mongodb
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const NodeCache = require('node-cache');
const {
    initializeDb,
    addAliasesToDb,
    getPendingAliases,
} = require('../src/db');

describe('alias-server alias.js', async function () {
    let mongoServer, testMongoClient, registrationOutputScript;
    before(async () => {
        // Start mongo memory server before running this suite of unit tests
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        testMongoClient = new MongoClient(mongoUri);
        // Get outputScript for the IFP address used in parseAliasTx tests
        registrationOutputScript = getOutputScriptFromAddress(
            aliasConstants.registrationAddress,
        );
    });

    after(async () => {
        // Shut down mongo memory server after running this suite of unit tests
        await testMongoClient.close();
        await mongoServer.stop();
    });
    it('parseAliasTx returns tx info for an alias tx with an overpaid fee', function () {
        // txid of a valid alias registration at these aliasConstants
        const validRegistrationTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';
        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(
                    i => i.txid === validRegistrationTxid,
                )
            ];

        // Clone before modifying to avoid altering mocks
        const clonedTx = JSON.parse(JSON.stringify(chronikTxObject));

        // Set the fee to be overpaid by adding another output to the registration address
        clonedTx.outputs.push({
            value: '558',
            outputScript: 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
        });

        const expectedResult = [
            generated.validAliasRegistrations[
                generated.validAliasRegistrations.findIndex(
                    i => i.txid === validRegistrationTxid,
                )
            ],
        ];
        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(clonedTx, aliasConstants, registrationOutputScript),
            expectedResult,
        );
    });
    it('parseAliasTx returns false for an alias tx registering a cashaddress with a hash greater than 20 bytes', function () {
        const thisTxid =
            'aabfacbd3f10a79a9a246eb91d1b4016df254ae6763e8edd4193d50caca479ea';
        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(i => i.txid === thisTxid)
            ];

        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(
                chronikTxObject,
                aliasConstants,
                registrationOutputScript,
            ),
            false,
        );
    });
    it('parseAliasTx returns false for an alias tx with an underpaid fee', function () {
        // txid of an alias registering tx with underpaid fee
        const testTxid =
            '5488810babff675cd1da1ca213ffece96c6b4a372f304833734d8f5dbb197dc5';
        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(i => i.txid === testTxid)
            ];

        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(
                chronikTxObject,
                aliasConstants,
                registrationOutputScript,
            ),
            false,
        );
    });
    it('parseAliasTx returns false for an etoken tx', function () {
        const testTxid =
            'e4d80b015e75fe2e54b5ef10571ce78c17086f96a7876d466f92d8c2a8c92b64';
        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(i => i.txid === testTxid)
            ];

        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(
                chronikTxObject,
                aliasConstants,
                registrationOutputScript,
            ),
            false,
        );
    });
    it('parseAliasTx returns false for a Cashtab msg tx including the text .xec', function () {
        const testTxid =
            'e73030820d7db7727151c167de2bf5c4a5d3728b757af78b60bb11143d418f71';
        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(i => i.txid === testTxid)
            ];

        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(
                chronikTxObject,
                aliasConstants,
                registrationOutputScript,
            ),
            false,
        );
    });
    it('parseAliasTx returns false for a registration with non-alphanumeric characters', function () {
        // CapitalLetters_And_+!
        const testTxid =
            'a2861460d090243af6b85eda5439e9545ad5abcc652cc6e65ac1c0222a553c06';
        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(i => i.txid === testTxid)
            ];

        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(
                chronikTxObject,
                aliasConstants,
                registrationOutputScript,
            ),
            false,
        );
    });
    it('parseAliasTx returns false for a registration of an empty string', function () {
        // ''
        const testTxid =
            'c6a24c60f7d05fcd283f20ac15e323eb831c1bac50e9a03cb9d6b78db188a055';
        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(i => i.txid === testTxid)
            ];

        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(
                chronikTxObject,
                aliasConstants,
                registrationOutputScript,
            ),
            false,
        );
    });
    it('parseAliasTx returns false for a registration of an emoji', function () {
        // 🎯
        const testTxid =
            '0ded74eeacdc80cec493dfbe61dab9c35e51d0fe2a13709a4098c4278143f5ac';
        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(i => i.txid === testTxid)
            ];

        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(
                chronikTxObject,
                aliasConstants,
                registrationOutputScript,
            ),
            false,
        );
    });
    it('parseAliasTx returns false for a registration longer than 21 characters', function () {
        // twentytwocharactertest (length 22)
        const testTxid =
            '5a811654b8aaf68c01b0c92a4350d6109ea3857c1838bacc558b277f11a800b9';
        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(i => i.txid === testTxid)
            ];

        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(
                chronikTxObject,
                aliasConstants,
                registrationOutputScript,
            ),
            false,
        );
    });
    it('parseAliasTx returns false for a registration of an invalid cash address', function () {
        // Registering "notanaddress" in address field
        const testTxid =
            '13d9990104217e6dfb37df95ec07f1a329b2bbfa9ce8042a49bd7a0600137adb';
        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(i => i.txid === testTxid)
            ];

        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(
                chronikTxObject,
                aliasConstants,
                registrationOutputScript,
            ),
            false,
        );
    });
    it('parseAliasTx returns false for an otherwise valid registration that pushes the alias version with OP_PUSHDATA1 instead of using OP_0', function () {
        const testTxid =
            '1a88df48f476bf2857cd6c3e8b46b0fee8f0ff11adfa148d131d12609a7fa398';
        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(i => i.txid === testTxid)
            ];

        // Clone to modify
        const clonedTx = JSON.parse(JSON.stringify(chronikTxObject));

        // Modify the OP_RETURN output pushdata
        // Formerly 6a042e786563000f6669667465656e636861726163313515006ffbe7c7d7bd01295eb1e371de9550339bdcf9fd
        clonedTx.outputs[0].outputScript =
            '6a042e7865634c000f6669667465656e636861726163313515006ffbe7c7d7bd01295eb1e371de9550339bdcf9fd';

        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(clonedTx, aliasConstants, registrationOutputScript),
            false,
        );
    });
    it('parseAliasTx returns false for an otherwise valid registration that pushes the alias with OP_PUSHDATA1 instead of direct hex bytes', function () {
        const testTxid =
            '1a88df48f476bf2857cd6c3e8b46b0fee8f0ff11adfa148d131d12609a7fa398';
        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(i => i.txid === testTxid)
            ];

        // Clone to modify
        const clonedTx = JSON.parse(JSON.stringify(chronikTxObject));

        // Modify the OP_RETURN output pushdata
        // Formerly 6a042e786563000f6669667465656e636861726163313515006ffbe7c7d7bd01295eb1e371de9550339bdcf9fd
        clonedTx.outputs[0].outputScript =
            '6a042e786563004c0f6669667465656e636861726163313515006ffbe7c7d7bd01295eb1e371de9550339bdcf9fd';

        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(clonedTx, aliasConstants, registrationOutputScript),
            false,
        );
    });
    it('parseAliasTx returns false for an otherwise valid registration that pushes the address type and hash with OP_PUSHDATA1 instead of direct hex bytes', function () {
        const testTxid =
            '1a88df48f476bf2857cd6c3e8b46b0fee8f0ff11adfa148d131d12609a7fa398';
        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(i => i.txid === testTxid)
            ];

        // Clone to modify
        const clonedTx = JSON.parse(JSON.stringify(chronikTxObject));

        // Modify the OP_RETURN output pushdata
        // Formerly 6a042e786563000f6669667465656e636861726163313515006ffbe7c7d7bd01295eb1e371de9550339bdcf9fd
        clonedTx.outputs[0].outputScript =
            '6a042e786563000f6669667465656e63686172616331354c15006ffbe7c7d7bd01295eb1e371de9550339bdcf9fd';

        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(clonedTx, aliasConstants, registrationOutputScript),
            false,
        );
    });
    it('getAliasTxs correctly parses all test vectors including all character lengths, p2pkh, and p2sh addresses', function () {
        assert.deepEqual(
            getAliasTxs(generated.txHistory, aliasConstants),
            generated.allAliasTxs,
        );
    });
    it('getAliasTxs correctly parses all test vectors including all character lengths, p2pkh, and p2sh addresses, if some txs are still unconfirmed', function () {
        // Modify a few txs to be unconfirmed
        // Note: unconfirmed txs in chronik simply lack the 'block' key

        // First, clone the mock so that you are not modifying it in place
        const txHistoryWithSomeUnconfirmedTxs = JSON.parse(
            JSON.stringify(generated.txHistory),
        );

        // Then, delete the 'block' key of the most recent 3 txs
        // NB these do not include valid alias registrations
        delete txHistoryWithSomeUnconfirmedTxs[0].block; // db09c578d38f37bd9f2bb69eeb8ecb2e24c5be01aa2914f17d94759aadf71386
        delete txHistoryWithSomeUnconfirmedTxs[1].block; // c040ccdc46df2951b2ab0cd6d48cf9db7c518068d1f871e60379ee8ccd1caa0e
        delete txHistoryWithSomeUnconfirmedTxs[2].block; // 828201e4680e6617636193d3f2a319daab80a8cc5772b9a5b6e068de639f2d9c

        // Delete the 'block' key of the most recent valid alias registration
        delete txHistoryWithSomeUnconfirmedTxs[
            txHistoryWithSomeUnconfirmedTxs.findIndex(
                tx =>
                    tx.txid ===
                    'e9f0a9984b4ae354fb8b4dd8193c974074942b0ee6fba14bf85fa1ca14dc5987',
            )
        ].block;

        // Clone your expected result
        const expectedResult = JSON.parse(
            JSON.stringify(generated.allAliasTxs),
        );

        // Modify expected blockheight of the unconfirmed registration
        expectedResult[
            expectedResult.findIndex(
                result =>
                    result.txid ===
                    'e9f0a9984b4ae354fb8b4dd8193c974074942b0ee6fba14bf85fa1ca14dc5987',
            )
        ].blockheight = config.unconfirmedBlockheight;

        // Modify expected result to have expected "unconfirmed" blockheight
        assert.deepEqual(
            getAliasTxs(txHistoryWithSomeUnconfirmedTxs, aliasConstants),
            expectedResult,
        );
    });
    it('sortAliasTxsByTxidAndBlockheight correctly sorts simple template alias txs including unconfirmed alias txs by blockheight and txid', function () {
        assert.deepEqual(
            sortAliasTxsByTxidAndBlockheight(templates.unsortedSimple),
            templates.sortedSimple,
        );
    });
    it('sortAliasTxsByTxidAndBlockheight correctly sorts template alias txs including unconfirmed alias txs by blockheight and txid', function () {
        assert.deepEqual(
            sortAliasTxsByTxidAndBlockheight(templates.allAliasTxs),
            templates.allAliasTxsSortedByTxidAndBlockheight,
        );
    });
    it('sortAliasTxsByTxidAndBlockheight correctly sorts alias txs including unconfirmed alias txs by blockheight and txid', function () {
        // First, clone the mock so that you are not modifying it in place
        const txHistoryWithSomeUnconfirmedTxs = JSON.parse(
            JSON.stringify(generated.txHistory),
        );

        // Then, delete the 'block' key of the most recent 3 txs
        // NB these do not include valid alias registrations
        delete txHistoryWithSomeUnconfirmedTxs[0].block; // db09c578d38f37bd9f2bb69eeb8ecb2e24c5be01aa2914f17d94759aadf71386
        delete txHistoryWithSomeUnconfirmedTxs[1].block; // c040ccdc46df2951b2ab0cd6d48cf9db7c518068d1f871e60379ee8ccd1caa0e
        delete txHistoryWithSomeUnconfirmedTxs[2].block; // 828201e4680e6617636193d3f2a319daab80a8cc5772b9a5b6e068de639f2d9c

        // Delete the 'block' key of the most recent valid alias registration
        delete txHistoryWithSomeUnconfirmedTxs[
            txHistoryWithSomeUnconfirmedTxs.findIndex(
                tx =>
                    tx.txid ===
                    'e9f0a9984b4ae354fb8b4dd8193c974074942b0ee6fba14bf85fa1ca14dc5987',
            )
        ].block;

        // Clone your expected result
        const allAliasTxsWithUnconfirmed = JSON.parse(
            JSON.stringify(generated.allAliasTxs),
        );

        // Modify expected blockheight of the unconfirmed registration
        allAliasTxsWithUnconfirmed[
            allAliasTxsWithUnconfirmed.findIndex(
                result =>
                    result.txid ===
                    'e9f0a9984b4ae354fb8b4dd8193c974074942b0ee6fba14bf85fa1ca14dc5987',
            )
        ].blockheight = config.unconfirmedBlockheight;

        // Modify generated.allAliasTxsSortedByTxidAndBlockheight to include unconfirmed txs
        const expectedResult = JSON.parse(
            JSON.stringify(generated.allAliasTxsSortedByTxidAndBlockheight),
        );

        expectedResult[
            expectedResult.findIndex(
                result =>
                    result.txid ===
                    'e9f0a9984b4ae354fb8b4dd8193c974074942b0ee6fba14bf85fa1ca14dc5987',
            )
        ].blockheight = config.unconfirmedBlockheight;

        assert.deepEqual(
            sortAliasTxsByTxidAndBlockheight(allAliasTxsWithUnconfirmed),
            expectedResult,
        );
    });
    it('Correctly returns only valid alias registrations starting with an empty database', async function () {
        // Initialize db before each unit test
        let testDb = await initializeDb(testMongoClient);

        // Clone unprocessedAliasTxs since the act of adding to db gives it an _id field
        const mockAllAliasTxs = JSON.parse(
            JSON.stringify(generated.allAliasTxs),
        );

        // Use tipHeight same as most recent confirmed registration
        const tipHeight = 792598;

        assert.deepEqual(
            await registerAliases(testDb, mockAllAliasTxs, tipHeight),
            generated.validAliasRegistrations,
        );

        // Wipe the database after this unit test
        await testDb.dropDatabase();
    });
    it('Ignores alias tx objects if their blockheight is > avalanche confirmed tip height', async function () {
        // Initialize db before each unit test
        let testDb = await initializeDb(testMongoClient);

        // Clone unprocessedAliasTxs since the act of adding to db gives it an _id field
        const mockAllAliasTxs = JSON.parse(
            JSON.stringify(generated.allAliasTxs),
        );

        // Use tipHeight as one less than that of the most recent confirmed alias registration in mocks
        const tipHeight = 792598 - 1;

        const expectedRegistrations = generated.validAliasRegistrations.slice(
            0,
            generated.validAliasRegistrations.length - 1,
        );

        assert.deepEqual(
            await registerAliases(testDb, mockAllAliasTxs, tipHeight),
            expectedRegistrations,
        );

        // Wipe the database after this unit test
        await testDb.dropDatabase();
    });
    it('Correctly returns only new valid alias registrations  given partial txHistory and list of registered aliases', async function () {
        // Take only txs after registration of alias '7777777'
        // Note: allAliasTxs are sorted with most recent txs first
        const unprocessedAliasTxs = generated.allAliasTxs.slice(
            0,
            generated.allAliasTxs.findIndex(i => i.alias === '7777777'),
        );

        // Clone unprocessedAliasTxs since the act of adding to db gives it an _id field
        const mockUnprocessedAliasTxs = JSON.parse(
            JSON.stringify(unprocessedAliasTxs),
        );

        // Get list of all valid alias registrations before '7777777'
        // Note: validAliasTxs are sorted with most recent txs last
        // Note: you want to include 7777777 here
        const registeredAliases = generated.validAliasRegistrations.slice(
            0,
            generated.validAliasRegistrations.findIndex(
                i => i.alias === '7777777',
            ) + 1,
        );

        // newlyValidAliases will be all the valid alias txs registered after '7777777'
        // Note: you do not want 7777777 in this set
        const newlyValidAliases = generated.validAliasRegistrations.slice(
            generated.validAliasRegistrations.findIndex(
                i => i.alias === '7777777',
            ) + 1,
        );
        // Initialize db before each unit test
        let testDb = await initializeDb(testMongoClient);

        // mockRegisteredAliases needs to be a clone of the mock because
        // each object gets an _id field when added to the database
        const mockRegisteredAliases = JSON.parse(
            JSON.stringify(registeredAliases),
        );
        // Add expected registered aliases to the db
        await addAliasesToDb(testDb, mockRegisteredAliases);

        // Use tipHeight same as most recent confirmed registration
        const tipHeight = 792598;

        assert.deepEqual(
            await registerAliases(testDb, mockUnprocessedAliasTxs, tipHeight),
            newlyValidAliases,
        );
        // Wipe the database after this unit test
        await testDb.dropDatabase();
    });
    it('Correctly returns valid alias registrations given some unconfirmed txs in history', async function () {
        // Initialize db
        let testDb = await initializeDb(testMongoClient);

        // First, clone the mock so that you are not modifying it in place
        const txHistoryWithSomeUnconfirmedTxs = JSON.parse(
            JSON.stringify(generated.txHistory),
        );

        // Then, delete the 'block' key of the most recent 3 txs
        // NB these do not include valid alias registrations
        delete txHistoryWithSomeUnconfirmedTxs[0].block; // db09c578d38f37bd9f2bb69eeb8ecb2e24c5be01aa2914f17d94759aadf71386
        delete txHistoryWithSomeUnconfirmedTxs[1].block; // c040ccdc46df2951b2ab0cd6d48cf9db7c518068d1f871e60379ee8ccd1caa0e
        delete txHistoryWithSomeUnconfirmedTxs[2].block; // 828201e4680e6617636193d3f2a319daab80a8cc5772b9a5b6e068de639f2d9c

        // Delete the 'block' key of the most recent valid alias registration
        delete txHistoryWithSomeUnconfirmedTxs[
            txHistoryWithSomeUnconfirmedTxs.findIndex(
                tx =>
                    tx.txid ===
                    'e9f0a9984b4ae354fb8b4dd8193c974074942b0ee6fba14bf85fa1ca14dc5987',
            )
        ].block;

        // App logic is to remove unconfirmed txs before calling registeredAliases. Follow this.
        const { confirmedTxs } = splitTxsByConfirmed(
            txHistoryWithSomeUnconfirmedTxs,
        );

        // Now getAllAlias txs from this set
        const allAliasTxs = getAliasTxs(confirmedTxs, aliasConstants);

        // registerAliases won't see the unconfirmed tx, so remove this from your expected result
        const validAliasRegistrationsClone = JSON.parse(
            JSON.stringify(generated.validAliasRegistrations),
        );

        const registeredAliasesCloneLessUnconfirmed =
            validAliasRegistrationsClone.slice(
                0,
                validAliasRegistrationsClone.findIndex(
                    result =>
                        result.txid ===
                        'e9f0a9984b4ae354fb8b4dd8193c974074942b0ee6fba14bf85fa1ca14dc5987',
                ),
            );

        // Use tipHeight same as most recent confirmed registration
        const tipHeight = 792598;

        // This tests startup condition, so add no aliases to the database
        assert.deepEqual(
            await registerAliases(testDb, allAliasTxs, tipHeight),
            registeredAliasesCloneLessUnconfirmed,
        );
        // Wipe the database after this unit test
        await testDb.dropDatabase();
    });
    it('parseAliasTx returns array of two valid aliases for a tx with two valid OP_RETURN alias registrations and the correct fee for both', function () {
        // txid of a valid alias registration at these aliasConstants
        const firstValidAliasTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';
        const secondValidAliasTxid =
            '0c77e4f7e0ff4f1028372042cbeb97eaddb64d505efe960b5a1ca4fce65598e2';

        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(
                    i => i.txid === firstValidAliasTxid,
                )
            ];

        // Clone before modifying to avoid altering mocks
        const clonedTx = JSON.parse(JSON.stringify(chronikTxObject));

        // Add the OP_RETURN output and fee paying output from 0c77e4f7e0ff4f1028372042cbeb97eaddb64d505efe960b5a1ca4fce65598e2
        clonedTx.outputs.push({
            value: '0',
            outputScript:
                '6a042e7865630003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        });
        clonedTx.outputs.push({
            value: '556',
            outputScript: 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
        });

        const firstValidAliasRegistration =
            generated.validAliasRegistrations[
                generated.validAliasRegistrations.findIndex(
                    i => i.txid === firstValidAliasTxid,
                )
            ];
        const secondValidAliasRegistration =
            generated.validAliasRegistrations[
                generated.validAliasRegistrations.findIndex(
                    i => i.txid === secondValidAliasTxid,
                )
            ];

        // Clone before modifying to leave mocks unchanged
        const clonedSecond = JSON.parse(
            JSON.stringify(secondValidAliasRegistration),
        );

        // Note that in this case, secondValidAliasRegistration should have the same blockheight and txid as clonedTx
        clonedSecond.blockheight = clonedTx.block.height;
        clonedSecond.txid = clonedTx.txid;

        const expectedResult = [firstValidAliasRegistration, clonedSecond];
        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(clonedTx, aliasConstants, registrationOutputScript),
            expectedResult,
        );
    });
    it('parseAliasTx returns false for a tx with two valid OP_RETURN alias registrations but fee great enough only for one', function () {
        // txid of a valid alias registration at these aliasConstants
        const firstValidAliasTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';

        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(
                    i => i.txid === firstValidAliasTxid,
                )
            ];

        // Clone before modifying to avoid altering mocks
        const clonedTx = JSON.parse(JSON.stringify(chronikTxObject));

        // Add the OP_RETURN output and fee paying output from 0c77e4f7e0ff4f1028372042cbeb97eaddb64d505efe960b5a1ca4fce65598e2
        clonedTx.outputs.push({
            value: '0',
            outputScript:
                '6a042e7865630003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        });
        // Underpay the fee, should be 556
        clonedTx.outputs.push({
            value: '555',
            outputScript: 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
        });

        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(clonedTx, aliasConstants, registrationOutputScript),
            false,
        );
    });
    it('parseAliasTx returns false for a tx with two valid OP_RETURN alias registrations that pay the correct fee but attempt to register the same alias', function () {
        // txid of a valid alias registration at these aliasConstants
        const firstValidAliasTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';

        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(
                    i => i.txid === firstValidAliasTxid,
                )
            ];

        // Clone before modifying to avoid altering mocks
        const clonedTx = JSON.parse(JSON.stringify(chronikTxObject));

        // Add the OP_RETURN output and fee paying output from 0c77e4f7e0ff4f1028372042cbeb97eaddb64d505efe960b5a1ca4fce65598e2
        clonedTx.outputs.push({
            value: '0',
            outputScript:
                '6a042e786563000131150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        });
        clonedTx.outputs.push({
            value: '558',
            outputScript: 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
        });

        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(clonedTx, aliasConstants, registrationOutputScript),
            false,
        );
    });
    it('parseAliasTx returns array of one valid alias for a tx with one valid OP_RETURN alias registration and one other OP_RETURN output unrelated to aliases', function () {
        // txid of a valid alias registration at these aliasConstants
        const firstValidAliasTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';

        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(
                    i => i.txid === firstValidAliasTxid,
                )
            ];

        // Clone before modifying to avoid altering mocks
        const clonedTx = JSON.parse(JSON.stringify(chronikTxObject));

        // Add alias registration OP_RETURN from 0c77e4f7e0ff4f1028372042cbeb97eaddb64d505efe960b5a1ca4fce65598e2
        // But make it invalid with a 4c push of the version number
        clonedTx.outputs.push({
            value: '0',
            outputScript:
                '6a042e7865634c0003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        });
        clonedTx.outputs.push({
            value: '556',
            outputScript: 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
        });

        const firstValidAliasRegistration =
            generated.validAliasRegistrations[
                generated.validAliasRegistrations.findIndex(
                    i => i.txid === firstValidAliasTxid,
                )
            ];

        const expectedResult = [firstValidAliasRegistration];
        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(clonedTx, aliasConstants, registrationOutputScript),
            expectedResult,
        );
    });
    it('parseAliasTx returns false for a tx no OP_RETURN outputs', function () {
        // txid of a valid alias registration at these aliasConstants
        const firstValidAliasTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';

        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(
                    i => i.txid === firstValidAliasTxid,
                )
            ];

        // Clone before modifying to avoid altering mocks
        const clonedTx = JSON.parse(JSON.stringify(chronikTxObject));

        // Remove the OP_RETURN output
        clonedTx.outputs = clonedTx.outputs.slice(0, 1);

        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(clonedTx, aliasConstants, registrationOutputScript),
            false,
        );
    });
    it('parseAliasTx returns false for an otherwise valid alias registration that includes empty OP_RETURN pushes', function () {
        // txid of a valid alias registration at these aliasConstants
        const firstValidAliasTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';

        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(
                    i => i.txid === firstValidAliasTxid,
                )
            ];

        // Clone before modifying to avoid altering mocks
        const clonedTx = JSON.parse(JSON.stringify(chronikTxObject));

        // Modify the OP_RETURN output
        clonedTx.outputs[0] = {
            value: '0',
            outputScript:
                '6a042e786563000131150076458db0ed96fe9863fc1ccec9fa2cfab884b0f64c00',
        };

        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(clonedTx, aliasConstants, registrationOutputScript),
            false,
        );
    });
    it('parseAliasTx returns one valid alias for a tx with one invalid OP_RETURN alias registration due to bad address and another that is valid, with fee great enough only for the valid registration', function () {
        // Note - by configuring the first alias to fail at the last spec check,
        // this unit test ensures that aliasFeeRequiredSats is only incremented for valid aliases

        // txid of a valid alias registration at these aliasConstants
        const firstValidAliasTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';

        const chronikTxObject =
            generated.txHistory[
                generated.txHistory.findIndex(
                    i => i.txid === firstValidAliasTxid,
                )
            ];

        // Clone before modifying to avoid altering mocks
        const clonedTx = JSON.parse(JSON.stringify(chronikTxObject));

        // Modify the existing OP_RETURN so that the address pushdata is invalid
        // Original 6a042e786563000131150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6
        // Mod      6a042e786563000131 4c 150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6
        clonedTx.outputs[0].outputScript =
            '6a042e7865630001314c150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6';
        // Reduce the fee payment for this first registration
        clonedTx.outputs[1].value = 557; // should be 558
        // Add the OP_RETURN output and fee paying output from 0c77e4f7e0ff4f1028372042cbeb97eaddb64d505efe960b5a1ca4fce65598e2
        clonedTx.outputs.push({
            value: '0',
            outputScript:
                '6a042e7865630003333333150076458db0ed96fe9863fc1ccec9fa2cfab884b0f6',
        });
        clonedTx.outputs.push({
            value: '556',
            outputScript: 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087',
        });

        const secondValidAliasTxid =
            '0c77e4f7e0ff4f1028372042cbeb97eaddb64d505efe960b5a1ca4fce65598e2';
        const secondValidAliasRegistration =
            generated.validAliasRegistrations[
                generated.validAliasRegistrations.findIndex(
                    i => i.txid === secondValidAliasTxid,
                )
            ];

        // Clone before modifying to leave mocks unchanged
        const clonedSecond = JSON.parse(
            JSON.stringify(secondValidAliasRegistration),
        );

        // Note that in this case, secondValidAliasRegistration should have the same blockheight and txid as clonedTx
        clonedSecond.blockheight = clonedTx.block.height;
        clonedSecond.txid = clonedTx.txid;

        // Get this tx from txHistory
        assert.deepEqual(
            parseAliasTx(clonedTx, aliasConstants, registrationOutputScript),
            [clonedSecond],
        );
    });
    it('parseTxForPendingAliases returns false if given txDetails are from a confirmed tx', async function () {
        // Initialize db
        let testDb = await initializeDb(testMongoClient);

        // Initialize cache with tipHeight
        let testCache = new NodeCache();
        const tipHeight = 800000;
        testCache.set('tipHeight', tipHeight);

        // Valid alias tx
        const incomingTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';
        const txObject =
            generated.txHistory[
                generated.txHistory.findIndex(i => i.txid === incomingTxid)
            ];

        // Do not make it unconfirmed
        const pendingTxObject = JSON.parse(JSON.stringify(txObject));

        assert.strictEqual(
            await parseTxForPendingAliases(
                testDb,
                testCache,
                pendingTxObject,
                aliasConstants,
            ),
            false,
        );

        // Verify that no pending aliases have been added to the pending alias collection
        assert.deepEqual(await getPendingAliases(testDb), []);

        // Wipe the database after this unit test
        await testDb.dropDatabase();

        // Close test cache
        testCache.flushAll();
        testCache.close();
    });
    it('parseTxForPendingAliases returns false if given txDetails are not from a valid pending alias tx', async function () {
        // Initialize db
        let testDb = await initializeDb(testMongoClient);

        // Initialize cache with tipHeight
        let testCache = new NodeCache();
        const tipHeight = 800000;
        testCache.set('tipHeight', tipHeight);

        // Invalid alias tx
        const incomingTxid =
            'aabfacbd3f10a79a9a246eb91d1b4016df254ae6763e8edd4193d50caca479ea';
        const txObject =
            generated.txHistory[
                generated.txHistory.findIndex(i => i.txid === incomingTxid)
            ];

        // Make it unconfirmed
        const pendingTxObject = JSON.parse(JSON.stringify(txObject));
        delete pendingTxObject.block;

        assert.strictEqual(
            await parseTxForPendingAliases(
                testDb,
                testCache,
                pendingTxObject,
                aliasConstants,
            ),
            false,
        );

        // Verify that no pending aliases have been added to the pending alias collection
        assert.deepEqual(await getPendingAliases(testDb), []);

        // Wipe the database after this unit test
        await testDb.dropDatabase();

        // Close test cache
        testCache.flushAll();
        testCache.close();
    });
    it('parseTxForPendingAliases returns true for a valid pending alias tx', async function () {
        // Initialize db
        let testDb = await initializeDb(testMongoClient);

        // Initialize cache with tipHeight
        let testCache = new NodeCache();
        const tipHeight = 800000;
        testCache.set('tipHeight', tipHeight);

        // valid alias tx
        const incomingTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';
        const txObject =
            generated.txHistory[
                generated.txHistory.findIndex(i => i.txid === incomingTxid)
            ];

        // Clone aliasObject to prevent key added in other unit tests
        const aliasObject = JSON.parse(
            JSON.stringify(
                generated.validAliasRegistrations[
                    generated.validAliasRegistrations.findIndex(
                        i => i.txid === incomingTxid,
                    )
                ],
            ),
        );

        // Make both unconfirmed
        const pendingTxObject = JSON.parse(JSON.stringify(txObject));
        delete pendingTxObject.block;
        // blockheight is not expected in pending alias results
        delete aliasObject.blockheight;
        // add expected tipHeight
        aliasObject.tipHeight = tipHeight;

        assert.strictEqual(
            await parseTxForPendingAliases(
                testDb,
                testCache,
                pendingTxObject,
                aliasConstants,
            ),
            true,
        );

        // Verify the expected alias is in the pending collection
        assert.deepEqual(await getPendingAliases(testDb), [aliasObject]);

        // Wipe the database after this unit test
        await testDb.dropDatabase();

        // Close test cache
        testCache.flushAll();
        testCache.close();
    });
    it('parseTxForPendingAliases sets a tipHeight of zero if tipHeight key is not in cache', async function () {
        // Initialize db
        let testDb = await initializeDb(testMongoClient);

        // Initialize cache with tipHeight
        let testCache = new NodeCache();
        // Do not set tipHeight in cache

        // valid alias tx
        const incomingTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';
        const txObject =
            generated.txHistory[
                generated.txHistory.findIndex(i => i.txid === incomingTxid)
            ];

        // Clone aliasObject to prevent key added in other unit tests
        const aliasObject = JSON.parse(
            JSON.stringify(
                generated.validAliasRegistrations[
                    generated.validAliasRegistrations.findIndex(
                        i => i.txid === incomingTxid,
                    )
                ],
            ),
        );

        // Make both unconfirmed
        const pendingTxObject = JSON.parse(JSON.stringify(txObject));
        delete pendingTxObject.block;
        // blockheight is not expected in pending alias results
        delete aliasObject.blockheight;
        // add expected tipHeight per server state since it is not in cache
        aliasObject.tipHeight = config.initialServerState.processedBlockheight;

        assert.strictEqual(
            await parseTxForPendingAliases(
                testDb,
                testCache,
                pendingTxObject,
                aliasConstants,
            ),
            true,
        );

        // Verify the expected alias is in the pending collection
        assert.deepEqual(await getPendingAliases(testDb), [aliasObject]);

        // Wipe the database after this unit test
        await testDb.dropDatabase();

        // Close test cache
        testCache.flushAll();
        testCache.close();
    });
    it('parseTxForPendingAliases adds multiple pending alias registrations to the database if an incoming tx containing multiple alias registrations comes in', async function () {
        // Initialize db
        let testDb = await initializeDb(testMongoClient);

        // Initialize cache with tipHeight
        let testCache = new NodeCache();
        const tipHeight = 800000;
        testCache.set('tipHeight', tipHeight);

        // valid alias tx
        const incomingTxid =
            'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d';
        const txObject = JSON.parse(
            JSON.stringify(
                generated.txHistory[
                    generated.txHistory.findIndex(i => i.txid === incomingTxid)
                ],
            ),
        );
        // Add another output from another valid alias registration
        const txidOfAnotherValidRegistration =
            '0c77e4f7e0ff4f1028372042cbeb97eaddb64d505efe960b5a1ca4fce65598e2';
        const txObjectOfAnotherValidRegistration = JSON.parse(
            JSON.stringify(
                generated.txHistory[
                    generated.txHistory.findIndex(
                        i => i.txid === txidOfAnotherValidRegistration,
                    )
                ],
            ),
        );
        txObject.outputs = txObject.outputs.concat(
            txObjectOfAnotherValidRegistration.outputs,
        );

        const aliasObject = JSON.parse(
            JSON.stringify(
                generated.validAliasRegistrations[
                    generated.validAliasRegistrations.findIndex(
                        i => i.txid === incomingTxid,
                    )
                ],
            ),
        );
        const anotherAliasObject = JSON.parse(
            JSON.stringify(
                generated.validAliasRegistrations[
                    generated.validAliasRegistrations.findIndex(
                        i => i.txid === txidOfAnotherValidRegistration,
                    )
                ],
            ),
        );
        // Note that, in this case, your second alias object would be expected to have the same txid and blockheight as the first
        anotherAliasObject.txid = aliasObject.txid;

        // Add expected tipHeight
        aliasObject.tipHeight = tipHeight;
        anotherAliasObject.tipHeight = tipHeight;

        // We won't have a blockheight in results for pending aliases
        delete aliasObject.blockheight;
        delete anotherAliasObject.blockheight;

        const pendingAliases = [aliasObject, anotherAliasObject];

        // Make it unconfirmed
        const pendingTxObject = JSON.parse(JSON.stringify(txObject));
        delete pendingTxObject.block;

        assert.strictEqual(
            await parseTxForPendingAliases(
                testDb,
                testCache,
                pendingTxObject,
                aliasConstants,
            ),
            true,
        );
        // Verify the pending alias has been added to the pending alias collection
        assert.deepEqual(await getPendingAliases(testDb), pendingAliases);

        // Wipe the database after this unit test
        await testDb.dropDatabase();

        // Close test cache
        testCache.flushAll();
        testCache.close();
    });
});

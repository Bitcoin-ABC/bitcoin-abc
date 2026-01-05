// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { Context, Bot } from 'grammy';
import { Pool } from 'pg';
import { newDb } from 'pg-mem';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
    HdNode,
    mnemonicToSeed,
    fromHex,
    ALP_TOKEN_TYPE_STANDARD,
    shaRmd160,
    toHex,
} from 'ecash-lib';
import { encodeCashAddress } from 'ecashaddrjs';
import { ChronikClient } from 'chronik-client';
import { Wallet } from 'ecash-wallet';
import { MockChronikClient } from '../../../modules/mock-chronik-client';
import { register, claim, sendErrorToAdmin } from './bot';
import { REWARDS_TOKEN_ID, REGISTRATION_REWARD_ATOMS } from './constants';

// Set up chai
const expect = chai.expect;
chai.use(sinonChai);
chai.use(chaiAsPromised);

/**
 * Create an in-memory PostgreSQL database for testing
 * @returns A Pool connected to the in-memory database
 */
const createTestDb = async (): Promise<Pool> => {
    const db = newDb();
    const { Pool: PgMemPool } = db.adapters.createPg();
    const pool = new PgMemPool();

    // Initialize schema
    const schemaPath = join(process.cwd(), 'schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf-8');
    await pool.query(schemaSql);

    return pool as Pool;
};

describe('bot', () => {
    describe('sendErrorToAdmin', () => {
        let mockBot: Bot;
        let sandbox: sinon.SinonSandbox;
        const ADMIN_CHAT_ID = '-1001234567890';

        beforeEach(() => {
            sandbox = sinon.createSandbox();
            mockBot = {
                api: {
                    sendMessage: sandbox.stub().resolves({
                        message_id: 1,
                        date: Date.now(),
                        chat: { id: ADMIN_CHAT_ID, type: 'supergroup' },
                        text: 'test',
                    }),
                },
            } as unknown as Bot;
        });

        afterEach(() => {
            sandbox.restore();
        });

        it('should send error message to admin group chat', async () => {
            const error = new Error('Test error message');
            const action = 'test-action';
            const userId = 12345;

            await sendErrorToAdmin(
                mockBot,
                ADMIN_CHAT_ID,
                action,
                userId,
                error,
            );

            expect(mockBot.api.sendMessage).to.have.callCount(1);
            const callArgs = (mockBot.api.sendMessage as sinon.SinonStub)
                .firstCall.args;
            expect(callArgs[0]).to.equal(ADMIN_CHAT_ID);
            expect(callArgs[1]).to.include('🚨 **Bot Action Error**');
            expect(callArgs[1]).to.include(`**Action:** ${action}`);
            expect(callArgs[1]).to.include(`**User:** User ID: ${userId}`);
            expect(callArgs[1]).to.include('**Error:** `Test error message`');
            expect(callArgs[1]).to.include('```');
            expect(callArgs[2]).to.deep.equal({ parse_mode: 'Markdown' });
        });

        it('should handle unknown user when userId is undefined', async () => {
            const error = new Error('Test error');
            const action = 'test-action';

            await sendErrorToAdmin(
                mockBot,
                ADMIN_CHAT_ID,
                action,
                undefined,
                error,
            );

            expect(mockBot.api.sendMessage).to.have.callCount(1);
            const callArgs = (mockBot.api.sendMessage as sinon.SinonStub)
                .firstCall.args;
            expect(callArgs[1]).to.include('**User:** Unknown user');
        });

        it('should handle non-Error objects', async () => {
            const error = 'String error message';
            const action = 'test-action';
            const userId = 12345;

            await sendErrorToAdmin(
                mockBot,
                ADMIN_CHAT_ID,
                action,
                userId,
                error,
            );

            expect(mockBot.api.sendMessage).to.have.callCount(1);
            const callArgs = (mockBot.api.sendMessage as sinon.SinonStub)
                .firstCall.args;
            expect(callArgs[1]).to.include('**Error:** `String error message`');
            // Should not include stack trace for non-Error objects
            expect(callArgs[1]).to.not.include('```');
        });

        it('should handle errors when sending message fails', async () => {
            const sendError = new Error('Telegram API error');
            (mockBot.api.sendMessage as sinon.SinonStub).rejects(sendError);

            const consoleErrorStub = sandbox.stub(console, 'error');

            const error = new Error('Test error');
            await sendErrorToAdmin(
                mockBot,
                ADMIN_CHAT_ID,
                'test-action',
                12345,
                error,
            );

            // Should log the error but not throw
            expect(consoleErrorStub).to.have.been.calledWith(
                'Failed to send error notification to admin group:',
                sendError,
            );
        });
    });

    describe('register', () => {
        let mockCtx: Context;
        let pool: Pool;
        let masterNode: HdNode;
        let sandbox: sinon.SinonSandbox;

        beforeEach(async () => {
            sandbox = sinon.createSandbox();

            // Create a real master node from a test mnemonic
            const testMnemonic =
                'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
            const seed = mnemonicToSeed(testMnemonic);
            masterNode = HdNode.fromSeed(seed);

            // Mock Grammy Context
            mockCtx = {
                from: {
                    id: 12345,
                    is_bot: false,
                    first_name: 'Test',
                    username: 'testuser',
                },
                reply: sandbox.stub().resolves({
                    message_id: 1,
                    date: Date.now(),
                    chat: { id: 12345, type: 'private' },
                    text: 'test',
                }),
            } as unknown as Context;

            // Create in-memory database
            pool = await createTestDb();
        });

        afterEach(async () => {
            sandbox.restore();
            if (pool) {
                await pool.end();
            }
        });

        it('should register a new user successfully', async () => {
            // Derive expected address for first user (hd_index 1, account 1)
            const firstUserNode = masterNode.derivePath("m/44'/1899'/1'/0/0");
            const firstUserPk = firstUserNode.pubkey();
            const firstUserPkh = shaRmd160(firstUserPk);
            const expectedAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(firstUserPkh),
            );

            await register(mockCtx, masterNode, pool);

            // Verify user was inserted into database
            const userResult = await pool.query(
                'SELECT * FROM users WHERE user_tg_id = $1',
                [12345],
            );
            expect(userResult.rows).to.have.length(1);
            expect(userResult.rows[0].user_tg_id).to.equal(12345);
            expect(userResult.rows[0].address).to.equal(expectedAddress);
            expect(userResult.rows[0].hd_index).to.equal(1);
            expect(userResult.rows[0].username).to.equal('testuser');

            // Verify user action table was created by querying it
            const tableCheck = await pool.query(
                "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'user_actions_12345'",
            );
            expect(parseInt(tableCheck.rows[0].count)).to.be.greaterThan(0);

            // Verify reply was called with success message and correct address
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('✅ Registration successful!');
            expect(replyCall.args[0]).to.include(
                `Your address: \`${expectedAddress}\``,
            );
            expect(replyCall.args[0]).to.include('User number: 1');
        });

        it('should return existing address if user is already registered', async () => {
            const existingAddress =
                'ecash:qpzry9x8gf2tvdw0s3jn54khce6mua7lcw20ayyn';
            const existingHdIndex = 5;

            // Insert existing user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, existingAddress, existingHdIndex, 'testuser'],
            );

            await register(mockCtx, masterNode, pool);

            // Verify user still exists with same data
            const userResult = await pool.query(
                'SELECT * FROM users WHERE user_tg_id = $1',
                [12345],
            );
            expect(userResult.rows).to.have.length(1);
            expect(userResult.rows[0].address).to.equal(existingAddress);
            expect(userResult.rows[0].hd_index).to.equal(existingHdIndex);

            // Verify reply with existing address
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include(
                '✅ You are already registered!',
            );
            expect(replyCall.args[0]).to.include(existingAddress);
        });

        it('should handle missing user ID', async () => {
            // Mock context without user ID
            const ctxWithoutId = {
                from: undefined,
                reply: sandbox.stub().resolves({
                    message_id: 1,
                    date: Date.now(),
                    chat: { id: 12345, type: 'private' },
                    text: 'test',
                }),
            } as unknown as Context;

            await register(ctxWithoutId, masterNode, pool);

            // Verify error message
            expect((ctxWithoutId.reply as sinon.SinonStub).callCount).to.equal(
                1,
            );
            expect(
                (ctxWithoutId.reply as sinon.SinonStub).firstCall.args[0],
            ).to.equal('❌ Could not identify your user ID.');

            // Verify no user was inserted
            const userResult = await pool.query(
                'SELECT * FROM users WHERE user_tg_id = $1',
                [12345],
            );
            expect(userResult.rows).to.have.length(0);
        });

        it('should use correct HD index when users already exist', async () => {
            // Derive expected address for user at hd_index 10 (account 10)
            const userNode = masterNode.derivePath("m/44'/1899'/10'/0/0");
            const userPk = userNode.pubkey();
            const userPkh = shaRmd160(userPk);
            const expectedAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(userPkh),
            );

            // Insert 9 existing users to set max index to 9
            for (let i = 1; i <= 9; i++) {
                const existingNode = masterNode.derivePath(
                    `m/44'/1899'/${i}'/0/0`,
                );
                const existingPk = existingNode.pubkey();
                const existingPkh = shaRmd160(existingPk);
                const existingAddress = encodeCashAddress(
                    'ecash',
                    'p2pkh',
                    toHex(existingPkh),
                );
                await pool.query(
                    'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                    [10000 + i, existingAddress, i, `user${i}`],
                );
            }

            await register(mockCtx, masterNode, pool);

            // Verify the new user was inserted with hd_index 10
            const userResult = await pool.query(
                'SELECT * FROM users WHERE user_tg_id = $1',
                [12345],
            );
            expect(userResult.rows).to.have.length(1);
            expect(userResult.rows[0].address).to.equal(expectedAddress);
            expect(userResult.rows[0].hd_index).to.equal(10);

            // Verify reply mentions index 10
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('User number: 10');
        });

        it('should derive correct address from HD path', async () => {
            // Derive expected address for first user (hd_index 1, account 1)
            const firstUserNode = masterNode.derivePath("m/44'/1899'/1'/0/0");
            const firstUserPk = firstUserNode.pubkey();
            const firstUserPkh = shaRmd160(firstUserPk);
            const expectedAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(firstUserPkh),
            );

            await register(mockCtx, masterNode, pool);

            // Verify the address was derived and stored correctly
            const userResult = await pool.query(
                'SELECT * FROM users WHERE user_tg_id = $1',
                [12345],
            );
            expect(userResult.rows[0].address).to.equal(expectedAddress);

            // Verify reply includes the address
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include(expectedAddress);
        });

        it('should handle database errors gracefully', async () => {
            // Create a new pool that will throw an error on query
            const errorPool = {
                query: sandbox
                    .stub()
                    .rejects(new Error('Database connection failed')),
            } as unknown as Pool;

            await expect(
                register(mockCtx, masterNode, errorPool),
            ).to.be.rejectedWith('Database connection failed');
        });
    });

    describe('claim', () => {
        let mockCtx: Context;
        let pool: Pool;
        let mockChronik: MockChronikClient;
        let wallet: Wallet;
        let mockBot: Bot;
        let sandbox: sinon.SinonSandbox;
        const ADMIN_CHAT_ID = '-1001234567890';
        // Bot wallet SK: all 1s (0101...01)
        const BOT_SK_ALL_ONES_HEX =
            '0101010101010101010101010101010101010101010101010101010101010101';
        const BOT_SK = fromHex(BOT_SK_ALL_ONES_HEX);
        // First user address derived from test mnemonic at m/44'/1899'/1'/0/0
        const FIRST_USER_ADDRESS =
            'ecash:qrfm48gr3zdgph6dt593hzlp587002ec4ysl59mavw';

        beforeEach(async () => {
            sandbox = sinon.createSandbox();

            // Create mock bot
            mockBot = {
                api: {
                    sendMessage: sandbox.stub().resolves({
                        message_id: 1,
                        date: Date.now(),
                        chat: { id: ADMIN_CHAT_ID, type: 'supergroup' },
                        text: 'test',
                    }),
                },
            } as unknown as Bot;

            // Create mock chronik client
            mockChronik = new MockChronikClient();

            // Create wallet with mock chronik using SK of all 1s
            wallet = Wallet.fromSk(
                BOT_SK,
                mockChronik as unknown as ChronikClient,
            );

            // Mock Grammy Context
            mockCtx = {
                from: {
                    id: 12345,
                    is_bot: false,
                    first_name: 'Test',
                    username: 'testuser',
                },
                reply: sandbox.stub().resolves({
                    message_id: 1,
                    date: Date.now(),
                    chat: { id: 12345, type: 'private' },
                    text: 'test',
                }),
            } as unknown as Context;

            // Create in-memory database
            pool = await createTestDb();

            // Set up wallet UTXOs with reward tokens to send
            mockChronik.setUtxosByAddress(wallet.address, [
                {
                    outpoint: {
                        txid: '0000000000000000000000000000000000000000000000000000000000000001',
                        outIdx: 0,
                    },
                    blockHeight: 800000,
                    isCoinbase: false,
                    sats: 10000n,
                    isFinal: true,
                    token: {
                        tokenId: REWARDS_TOKEN_ID,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                        atoms: 100_000_00n, // 1,000,000 tokens (enough to send rewards)
                        isMintBaton: false,
                    },
                },
                {
                    outpoint: {
                        txid: '0000000000000000000000000000000000000000000000000000000000000002',
                        outIdx: 0,
                    },
                    blockHeight: 800000,
                    isCoinbase: false,
                    sats: 100000n, // XEC for fees
                    isFinal: true,
                },
            ]);

            // Mock blockchain info
            if (!mockChronik.blockchainInfo) {
                mockChronik.blockchainInfo = () =>
                    Promise.resolve({ tipHash: 'mock_tip', tipHeight: 800000 });
            }
        });

        afterEach(async () => {
            sandbox.restore();
            if (pool) {
                await pool.end();
            }
        });

        it('should successfully claim reward tokens for a registered user', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, FIRST_USER_ADDRESS, 1, 'testuser'],
            );

            // Mock: user address has no reward tokens yet
            mockChronik.setUtxosByAddress(FIRST_USER_ADDRESS, []);

            // Set up broadcast response with the actual raw transaction hex and txid
            const rawTxHex =
                '02000000020100000000000000000000000000000000000000000000000000000000000000000000006441dfc0ff59f2b276ad2af18725da1cabaaa949db7bd9da9ae097e6694813f8f1e8c2a9fb15cf7964e0cfaecbc9d642b0fe5ea504fcd8169556fd2cbcfd6dfe6f804121031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078fffffffff020000000000000000000000000000000000000000000000000000000000000000000000644126f57a80304f54380aa106679f07be3bee1c6863894c8dbb1d0defeb4ca7ffc46b2b598fd048e12fbf5a1f34cbbf5229b79a912cc0da7a523dc4d38447b897a84121031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078fffffffff050000000000000000406a503d534c5032000453454e44efb82f4a412819f138f7d01aa39e9378319ac026f332685a539d00791965972d036400000000000000000000001c969800000022020000000000001976a914d3ba9d03889a80df4d5d0b1b8be1a1fcf7ab38a988aca0860100000000001976a914d3ba9d03889a80df4d5d0b1b8be1a1fcf7ab38a988ac22020000000000001976a91479b000887626b294a914501a4cd226b58b23598388acd7200000000000001976a91479b000887626b294a914501a4cd226b58b23598388ac00000000';
            const expectedTxid =
                '83319e7f0c53810009316315badbbf78f956abd98e6f84ce65d1bfeaa1b7b327';
            mockChronik.setBroadcastTx(rawTxHex, expectedTxid);

            await claim(mockCtx, pool, wallet, mockBot, ADMIN_CHAT_ID);

            // Verify action was logged in user action table
            const actionResult = await pool.query(
                'SELECT * FROM user_actions_12345 WHERE action = $1',
                ['claim'],
            );
            expect(actionResult.rows).to.have.length(1);
            expect(actionResult.rows[0].action).to.equal('claim');
            expect(actionResult.rows[0].txid).to.equal(expectedTxid);
            expect(actionResult.rows[0].post_id).to.equal(null);

            // Verify reply was called with success message and expected txid
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('✅ Claim successful!');
            expect(replyCall.args[0]).to.include(FIRST_USER_ADDRESS);
            expect(replyCall.args[0]).to.include('10,000 reward tokens');
            expect(replyCall.args[0]).to.include(expectedTxid);
        });

        it('should reject claim if user is not registered', async () => {
            await claim(mockCtx, pool, wallet, mockBot, ADMIN_CHAT_ID);

            // Verify error reply
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('❌ You must register first!');

            // Verify no action was logged (table should not exist)
            const tableCheck = await pool.query(
                "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'user_actions_12345'",
            );
            expect(parseInt(tableCheck.rows[0].count)).to.equal(0);
        });

        it('should reject claim if user has already received reward tokens', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, FIRST_USER_ADDRESS, 1, 'testuser'],
            );

            // Mock: user address already has reward tokens
            mockChronik.setUtxosByAddress(FIRST_USER_ADDRESS, [
                {
                    outpoint: {
                        txid: '0000000000000000000000000000000000000000000000000000000000000003',
                        outIdx: 0,
                    },
                    blockHeight: 800000,
                    isCoinbase: false,
                    sats: 546n,
                    isFinal: true,
                    token: {
                        tokenId: REWARDS_TOKEN_ID,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                        atoms: REGISTRATION_REWARD_ATOMS,
                        isMintBaton: false,
                    },
                },
            ]);

            await claim(mockCtx, pool, wallet, mockBot, ADMIN_CHAT_ID);

            // Verify error reply
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include(
                '❌ You have already claimed your reward tokens!',
            );
            expect(replyCall.args[0]).to.include(FIRST_USER_ADDRESS);

            // Verify no action was logged (claim was rejected)
            // Check if table exists, and if so, verify no actions were logged
            const tableCheck = await pool.query(
                "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'user_actions_12345'",
            );
            if (parseInt(tableCheck.rows[0].count) > 0) {
                const actionResult = await pool.query(
                    'SELECT * FROM user_actions_12345',
                );
                expect(actionResult.rows).to.have.length(0);
            }
            // If table doesn't exist, that's also fine - no actions were logged
        });

        it('should handle missing user ID', async () => {
            // Mock context without user ID
            const ctxWithoutId = {
                from: undefined,
                reply: sandbox.stub().resolves({
                    message_id: 1,
                    date: Date.now(),
                    chat: { id: 12345, type: 'private' },
                    text: 'test',
                }),
            } as unknown as Context;

            await claim(ctxWithoutId, pool, wallet, mockBot, ADMIN_CHAT_ID);

            // Verify error message
            expect((ctxWithoutId.reply as sinon.SinonStub).callCount).to.equal(
                1,
            );
            expect(
                (ctxWithoutId.reply as sinon.SinonStub).firstCall.args[0],
            ).to.equal('❌ Could not identify your user ID.');

            // Verify no action was logged (table should not exist)
            const tableCheck = await pool.query(
                "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'user_actions_12345'",
            );
            expect(parseInt(tableCheck.rows[0].count)).to.equal(0);
        });

        it('should handle chronik errors when checking token history', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, FIRST_USER_ADDRESS, 1, 'testuser'],
            );

            // Mock: chronik address query fails by setting an Error
            const chronikError = new Error('Chronik connection failed');
            mockChronik.setUtxosByAddress(FIRST_USER_ADDRESS, chronikError);

            await claim(mockCtx, pool, wallet, mockBot, ADMIN_CHAT_ID);

            // Verify error reply
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include(
                '❌ Error checking your token history',
            );

            // Verify error was sent to admin group
            expect(mockBot.api.sendMessage).to.have.callCount(1);
            const adminCall = (mockBot.api.sendMessage as sinon.SinonStub)
                .firstCall.args;
            expect(adminCall[0]).to.equal(ADMIN_CHAT_ID);
            expect(adminCall[1]).to.include('🚨 **Bot Action Error**');
            expect(adminCall[1]).to.include('claim (checking token history)');
            expect(adminCall[1]).to.include('User ID: 12345');
            expect(adminCall[1]).to.include('Chronik connection failed');

            // Verify no action was logged (claim failed)
            // Check if table exists, and if so, verify no actions were logged
            const tableCheck = await pool.query(
                "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'user_actions_12345'",
            );
            if (parseInt(tableCheck.rows[0].count) > 0) {
                const actionResult = await pool.query(
                    'SELECT * FROM user_actions_12345',
                );
                expect(actionResult.rows).to.have.length(0);
            }
            // If table doesn't exist, that's also fine - no actions were logged
        });

        it('should send error to admin when wallet action throws an error', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, FIRST_USER_ADDRESS, 1, 'testuser'],
            );

            // Mock: user address has no reward tokens yet
            mockChronik.setUtxosByAddress(FIRST_USER_ADDRESS, []);

            // Mock: make broadcast fail by throwing an error
            const broadcastError = new Error('Wallet broadcast failed');
            const rawTxHex =
                '02000000020100000000000000000000000000000000000000000000000000000000000000000000006441dfc0ff59f2b276ad2af18725da1cabaaa949db7bd9da9ae097e6694813f8f1e8c2a9fb15cf7964e0cfaecbc9d642b0fe5ea504fcd8169556fd2cbcfd6dfe6f804121031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078fffffffff020000000000000000000000000000000000000000000000000000000000000000000000644126f57a80304f54380aa106679f07be3bee1c6863894c8dbb1d0defeb4ca7ffc46b2b598fd048e12fbf5a1f34cbbf5229b79a912cc0da7a523dc4d38447b897a84121031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078fffffffff050000000000000000406a503d534c5032000453454e44efb82f4a412819f138f7d01aa39e9378319ac026f332685a539d00791965972d036400000000000000000000001c969800000022020000000000001976a914d3ba9d03889a80df4d5d0b1b8be1a1fcf7ab38a988aca0860100000000001976a914d3ba9d03889a80df4d5d0b1b8be1a1fcf7ab38a988ac22020000000000001976a91479b000887626b294a914501a4cd226b58b23598388acd7200000000000001976a91479b000887626b294a914501a4cd226b58b23598388ac00000000';
            mockChronik.setBroadcastTx(rawTxHex, broadcastError);

            await claim(mockCtx, pool, wallet, mockBot, ADMIN_CHAT_ID);

            // Verify error reply to user
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include(
                '❌ Error sending reward tokens',
            );

            // Verify error was sent to admin group
            expect(mockBot.api.sendMessage).to.have.callCount(1);
            const adminCall = (mockBot.api.sendMessage as sinon.SinonStub)
                .firstCall.args;
            expect(adminCall[0]).to.equal(ADMIN_CHAT_ID);
            expect(adminCall[1]).to.include('🚨 **Bot Action Error**');
            expect(adminCall[1]).to.include('claim (sending reward tokens)');
            expect(adminCall[1]).to.include('User ID: 12345');
            expect(adminCall[1]).to.include('Wallet broadcast failed');

            // Verify no action was logged (claim failed)
            const tableCheck = await pool.query(
                "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'user_actions_12345'",
            );
            if (parseInt(tableCheck.rows[0].count) > 0) {
                const actionResult = await pool.query(
                    'SELECT * FROM user_actions_12345',
                );
                expect(actionResult.rows).to.have.length(0);
            }
        });
    });
});

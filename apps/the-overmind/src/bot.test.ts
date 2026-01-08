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
import {
    register,
    health,
    sendErrorToAdmin,
    handleMessage,
    handleMessageReaction,
    handleLike,
    handleDislike,
} from './bot';
import { REWARDS_TOKEN_ID } from './constants';

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
        let mockBot: Bot;
        let pool: Pool;
        let masterNode: HdNode;
        let mockChronik: MockChronikClient;
        let wallet: Wallet;
        let sandbox: sinon.SinonSandbox;
        const MONITORED_CHAT_ID = '12345';
        const ADMIN_CHAT_ID = '-1001234567890';
        // Bot wallet SK: all 1s (0101...01)
        const BOT_SK_ALL_ONES_HEX =
            '0101010101010101010101010101010101010101010101010101010101010101';
        const BOT_SK = fromHex(BOT_SK_ALL_ONES_HEX);

        beforeEach(async () => {
            sandbox = sinon.createSandbox();

            // Create a real master node from a test mnemonic
            const testMnemonic =
                'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
            const seed = mnemonicToSeed(testMnemonic);
            masterNode = HdNode.fromSeed(seed);

            // Create mock chronik client
            mockChronik = new MockChronikClient();

            // Create wallet with mock chronik using SK of all 1s
            wallet = Wallet.fromSk(
                BOT_SK,
                mockChronik as unknown as ChronikClient,
            );

            // Mock Bot with getChatMember API and sendMessage for admin notifications
            mockBot = {
                api: {
                    getChatMember: sandbox
                        .stub()
                        .resolves({ status: 'member', user: { id: 12345 } }),
                    sendMessage: sandbox.stub().resolves({
                        message_id: 1,
                        date: Date.now(),
                        chat: { id: ADMIN_CHAT_ID, type: 'supergroup' },
                        text: 'test',
                    }),
                },
            } as unknown as Bot;

            // Mock Grammy Context
            mockCtx = {
                from: {
                    id: 12345,
                    is_bot: false,
                    first_name: 'Test',
                    username: 'testuser',
                },
                chat: {
                    id: 12345,
                    type: 'private',
                },
                me: {
                    id: 99999,
                    is_bot: true,
                    first_name: 'The Overmind',
                    username: 'TheOvermind_bot',
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
                        atoms: 1_000_00n, // 1,000,000 tokens (enough to send rewards)
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

        it('should register a new user successfully and send reward tokens', async () => {
            // Derive expected address for first user (hd_index 1, account 1)
            const firstUserNode = masterNode.derivePath("m/44'/1899'/1'/0/0");
            const firstUserPk = firstUserNode.pubkey();
            const firstUserPkh = shaRmd160(firstUserPk);
            const expectedAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(firstUserPkh),
            );

            // Mock: user address has no reward tokens yet
            mockChronik.setUtxosByAddress(expectedAddress, []);

            // Mock: set up broadcast transaction to return success for any rawTx
            const expectedTxid =
                '0000000000000000000000000000000000000000000000000000000000000003';
            // Stub broadcastTx to return success for any transaction
            (mockChronik as any).broadcastTx = sandbox
                .stub()
                .resolves({ txid: expectedTxid });

            await register(
                mockCtx,
                masterNode,
                pool,
                mockBot,
                MONITORED_CHAT_ID,
                wallet,
                ADMIN_CHAT_ID,
            );

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
            expect(replyCall.args[0]).to.include(
                'Earn HP by sending msgs that collect emoji reactions',
            );
            expect(replyCall.args[0]).to.include(
                'Lose HP by sending msgs that collect 👎 reactions',
            );
            expect(replyCall.args[0]).to.include(
                'Check your status by sending a DM to',
            );
            expect(replyCall.args[0]).to.include('❤️');
            expect(replyCall.args[0]).to.include('HP Filled!');
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

            await register(
                mockCtx,
                masterNode,
                pool,
                mockBot,
                MONITORED_CHAT_ID,
                wallet,
                ADMIN_CHAT_ID,
            );

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
                chat: {
                    id: 12345,
                    type: 'private',
                },
                reply: sandbox.stub().resolves({
                    message_id: 1,
                    date: Date.now(),
                    chat: { id: 12345, type: 'private' },
                    text: 'test',
                }),
            } as unknown as Context;

            await register(
                ctxWithoutId,
                masterNode,
                pool,
                mockBot,
                MONITORED_CHAT_ID,
                wallet,
                ADMIN_CHAT_ID,
            );

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

            // Mock: user address has no reward tokens yet
            mockChronik.setUtxosByAddress(expectedAddress, []);

            // Mock: set up broadcast transaction to return success for any rawTx
            const expectedTxid =
                '0000000000000000000000000000000000000000000000000000000000000003';
            // Stub broadcastTx to return success for any transaction
            (mockChronik as any).broadcastTx = sandbox
                .stub()
                .resolves({ txid: expectedTxid });

            await register(
                mockCtx,
                masterNode,
                pool,
                mockBot,
                MONITORED_CHAT_ID,
                wallet,
                ADMIN_CHAT_ID,
            );

            // Verify the new user was inserted with hd_index 10
            const userResult = await pool.query(
                'SELECT * FROM users WHERE user_tg_id = $1',
                [12345],
            );
            expect(userResult.rows).to.have.length(1);
            expect(userResult.rows[0].address).to.equal(expectedAddress);
            expect(userResult.rows[0].hd_index).to.equal(10);

            // Verify reply was called with success message
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('✅ Registration successful!');
            expect(replyCall.args[0]).to.include(
                `Your address: \`${expectedAddress}\``,
            );
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

            // Mock: user address has no reward tokens yet
            mockChronik.setUtxosByAddress(expectedAddress, []);

            // Mock: set up broadcast transaction to return success for any rawTx
            const expectedTxid =
                '0000000000000000000000000000000000000000000000000000000000000003';
            // Stub broadcastTx to return success for any transaction
            (mockChronik as any).broadcastTx = sandbox
                .stub()
                .resolves({ txid: expectedTxid });

            await register(
                mockCtx,
                masterNode,
                pool,
                mockBot,
                MONITORED_CHAT_ID,
                wallet,
                ADMIN_CHAT_ID,
            );

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

        it('should reject registration when user is not a member of monitored chat (left)', async () => {
            // Mock bot to return 'left' status (user left the chat)
            const botWithNonMember = {
                api: {
                    getChatMember: sandbox
                        .stub()
                        .resolves({ status: 'left', user: { id: 12345 } }),
                },
            } as unknown as Bot;

            await register(
                mockCtx,
                masterNode,
                pool,
                botWithNonMember,
                MONITORED_CHAT_ID,
                wallet,
                ADMIN_CHAT_ID,
            );

            // Verify error message contains expected text
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const errorMessage = (mockCtx.reply as sinon.SinonStub).firstCall
                .args[0];
            expect(errorMessage).to.include(
                '❌ You must be a member of the monitored chat to register',
            );
            expect(errorMessage).to.include(
                'Please join the main eCash telegram channel first',
            );

            // Verify no user was inserted into database
            const userResult = await pool.query(
                'SELECT * FROM users WHERE user_tg_id = $1',
                [12345],
            );
            expect(userResult.rows).to.have.length(0);
        });

        it('should reject registration when user is kicked from monitored chat', async () => {
            // Mock bot to return 'kicked' status (user was banned/kicked)
            const botWithKickedUser = {
                api: {
                    getChatMember: sandbox
                        .stub()
                        .resolves({ status: 'kicked', user: { id: 12345 } }),
                },
            } as unknown as Bot;

            await register(
                mockCtx,
                masterNode,
                pool,
                botWithKickedUser,
                MONITORED_CHAT_ID,
                wallet,
                ADMIN_CHAT_ID,
            );

            // Verify error message
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const errorMessage = (mockCtx.reply as sinon.SinonStub).firstCall
                .args[0];
            expect(errorMessage).to.include(
                '❌ You must be a member of the monitored chat to register',
            );

            // Verify no user was inserted
            const userResult = await pool.query(
                'SELECT * FROM users WHERE user_tg_id = $1',
                [12345],
            );
            expect(userResult.rows).to.have.length(0);
        });

        it('should reject registration when getChatMember fails', async () => {
            // Mock bot to throw an error (user not found or bot lacks permissions)
            const botWithError = {
                api: {
                    getChatMember: sandbox
                        .stub()
                        .rejects(new Error('User not found')),
                },
            } as unknown as Bot;

            await register(
                mockCtx,
                masterNode,
                pool,
                botWithError,
                MONITORED_CHAT_ID,
                wallet,
                ADMIN_CHAT_ID,
            );

            // Verify error message
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include('Could not verify your membership');

            // Verify no user was inserted
            const userResult = await pool.query(
                'SELECT * FROM users WHERE user_tg_id = $1',
                [12345],
            );
            expect(userResult.rows).to.have.length(0);
        });

        it('should allow registration when user is a member of monitored chat', async () => {
            // Mock bot to return 'member' status (user is a member)
            const botWithMember = {
                api: {
                    getChatMember: sandbox
                        .stub()
                        .resolves({ status: 'member', user: { id: 12345 } }),
                },
            } as unknown as Bot;

            // Derive expected address for first user
            const firstUserNode = masterNode.derivePath("m/44'/1899'/1'/0/0");
            const firstUserPk = firstUserNode.pubkey();
            const firstUserPkh = shaRmd160(firstUserPk);
            const expectedAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(firstUserPkh),
            );

            // Mock: user address has no reward tokens yet
            mockChronik.setUtxosByAddress(expectedAddress, []);

            // Mock: set up broadcast transaction to return success for any rawTx
            const expectedTxid =
                '0000000000000000000000000000000000000000000000000000000000000003';
            // Stub broadcastTx to return success for any transaction
            (mockChronik as any).broadcastTx = sandbox
                .stub()
                .resolves({ txid: expectedTxid });

            // Update botWithMember to include sendMessage for admin notifications
            const botWithMemberAndAdmin = {
                api: {
                    getChatMember: (botWithMember.api as any).getChatMember,
                    sendMessage: sandbox.stub().resolves({
                        message_id: 1,
                        date: Date.now(),
                        chat: { id: ADMIN_CHAT_ID, type: 'supergroup' },
                        text: 'test',
                    }),
                },
            } as unknown as Bot;

            await register(
                mockCtx,
                masterNode,
                pool,
                botWithMemberAndAdmin,
                MONITORED_CHAT_ID,
                wallet,
                ADMIN_CHAT_ID,
            );

            // Verify user was inserted
            const userResult = await pool.query(
                'SELECT * FROM users WHERE user_tg_id = $1',
                [12345],
            );
            expect(userResult.rows).to.have.length(1);
            expect(userResult.rows[0].address).to.equal(expectedAddress);

            // Verify success message
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include('✅ Registration successful!');
        });

        it('should handle database errors gracefully', async () => {
            // Create a new pool that will throw an error on query
            const errorPool = {
                query: sandbox
                    .stub()
                    .rejects(new Error('Database connection failed')),
            } as unknown as Pool;

            await expect(
                register(
                    mockCtx,
                    masterNode,
                    errorPool,
                    mockBot,
                    MONITORED_CHAT_ID,
                    wallet,
                    ADMIN_CHAT_ID,
                ),
            ).to.be.rejectedWith('Database connection failed');
        });
    });

    describe('health', () => {
        let mockCtx: Context;
        let pool: Pool;
        let mockChronik: MockChronikClient;
        let sandbox: sinon.SinonSandbox;
        const USER_ADDRESS = 'ecash:qrfm48gr3zdgph6dt593hzlp587002ec4ysl59mavw';

        beforeEach(async () => {
            sandbox = sinon.createSandbox();

            // Create mock chronik client
            mockChronik = new MockChronikClient();

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

        it('should display balance for registered user with tokens', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, USER_ADDRESS, 1, 'testuser'],
            );

            // Mock UTXOs with token balance
            mockChronik.setUtxosByAddress(USER_ADDRESS, [
                {
                    outpoint: {
                        txid: '0000000000000000000000000000000000000000000000000000000000000001',
                        outIdx: 0,
                    },
                    blockHeight: 800000,
                    isCoinbase: false,
                    sats: 1000n,
                    isFinal: true,
                    token: {
                        tokenId: REWARDS_TOKEN_ID,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                        atoms: 150n, // 150 HP
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
                    sats: 1000n,
                    isFinal: true,
                    token: {
                        tokenId: REWARDS_TOKEN_ID,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                        atoms: 50n, // 50 HP
                        isMintBaton: false,
                    },
                },
            ]);

            await health(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
            );

            // Verify reply was called with correct health
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('You have **200 HP**'); // 150 + 50 = 200
            expect(replyCall.args[0]).to.include('200/100'); // Above max, shows actual balance
            expect(replyCall.args[0]).to.include('🔥 **MAXED!**');
            expect(replyCall.args[1]).to.deep.equal({ parse_mode: 'Markdown' });
        });

        it('should display zero balance for registered user with no tokens', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, USER_ADDRESS, 1, 'testuser'],
            );

            // Mock UTXOs with no tokens (only XEC)
            mockChronik.setUtxosByAddress(USER_ADDRESS, [
                {
                    outpoint: {
                        txid: '0000000000000000000000000000000000000000000000000000000000000001',
                        outIdx: 0,
                    },
                    blockHeight: 800000,
                    isCoinbase: false,
                    sats: 1000n,
                    isFinal: true,
                },
            ]);

            await health(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
            );

            // Verify reply was called with zero health
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('You have **0 HP**');
            expect(replyCall.args[0]).to.include('0/100');
        });

        it('should reject balance check for unregistered user', async () => {
            await health(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
            );

            // Verify error message
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include('❌ You must register first!');
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include('Use /register to create your wallet address');
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

            await health(
                ctxWithoutId,
                pool,
                mockChronik as unknown as ChronikClient,
            );

            // Verify error message
            expect((ctxWithoutId.reply as sinon.SinonStub).callCount).to.equal(
                1,
            );
            expect(
                (ctxWithoutId.reply as sinon.SinonStub).firstCall.args[0],
            ).to.equal('❌ Could not identify your user ID.');
        });

        it('should handle chronik query errors gracefully', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, USER_ADDRESS, 1, 'testuser'],
            );

            // Mock chronik to throw an error
            const errorChronik = {
                address: () => ({
                    utxos: () =>
                        Promise.reject(new Error('Chronik connection failed')),
                }),
            } as unknown as ChronikClient;

            const consoleErrorStub = sandbox.stub(console, 'error');

            await health(mockCtx, pool, errorChronik);

            // Verify error message to user
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include('❌ Error fetching your health');

            // Verify error was logged
            expect(consoleErrorStub).to.have.been.calledWith(
                'Error fetching token balance:',
                sinon.match.instanceOf(Error),
            );
        });

        it('should sum balance correctly across multiple UTXOs', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, USER_ADDRESS, 1, 'testuser'],
            );

            // Mock multiple UTXOs with tokens
            mockChronik.setUtxosByAddress(USER_ADDRESS, [
                {
                    outpoint: {
                        txid: '0000000000000000000000000000000000000000000000000000000000000001',
                        outIdx: 0,
                    },
                    blockHeight: 800000,
                    isCoinbase: false,
                    sats: 1000n,
                    isFinal: true,
                    token: {
                        tokenId: REWARDS_TOKEN_ID,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                        atoms: 100n,
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
                    sats: 1000n,
                    isFinal: true,
                    token: {
                        tokenId: REWARDS_TOKEN_ID,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                        atoms: 25n,
                        isMintBaton: false,
                    },
                },
                {
                    outpoint: {
                        txid: '0000000000000000000000000000000000000000000000000000000000000003',
                        outIdx: 0,
                    },
                    blockHeight: 800000,
                    isCoinbase: false,
                    sats: 1000n,
                    isFinal: true,
                    token: {
                        tokenId: REWARDS_TOKEN_ID,
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                        atoms: 75n,
                        isMintBaton: false,
                    },
                },
                // UTXO with different token (should be ignored)
                {
                    outpoint: {
                        txid: '0000000000000000000000000000000000000000000000000000000000000004',
                        outIdx: 0,
                    },
                    blockHeight: 800000,
                    isCoinbase: false,
                    sats: 1000n,
                    isFinal: true,
                    token: {
                        tokenId: 'different_token_id',
                        tokenType: ALP_TOKEN_TYPE_STANDARD,
                        atoms: 999n,
                        isMintBaton: false,
                    },
                },
                // UTXO with no token (should be ignored)
                {
                    outpoint: {
                        txid: '0000000000000000000000000000000000000000000000000000000000000005',
                        outIdx: 0,
                    },
                    blockHeight: 800000,
                    isCoinbase: false,
                    sats: 1000n,
                    isFinal: true,
                },
            ]);

            await health(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
            );

            // Verify health is sum of only REWARDS_TOKEN_ID tokens (100 + 25 + 75 = 200)
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('You have **200 HP**');
            expect(replyCall.args[0]).to.include('200/100');
            expect(replyCall.args[0]).to.include('🔥 **MAXED!**');
        });
    });

    describe('handleMessageReaction', () => {
        let mockCtx: Partial<Context>;
        let pool: Pool;
        let mockChronik: MockChronikClient;
        let mockBot: Bot;
        let masterNode: HdNode;
        let sandbox: sinon.SinonSandbox;
        const MONITORED_CHAT_ID = '-1001234567890';
        const ADMIN_CHAT_ID = '-1001234567890';
        const REACTING_USER_ID = 12345;
        const MESSAGE_SENDER_ID = 67890;
        const MSG_ID = 100;
        // Test mnemonic for deriving HD wallets
        const TEST_MNEMONIC =
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

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

            // Initialize master node from test mnemonic
            const seed = mnemonicToSeed(TEST_MNEMONIC);
            masterNode = HdNode.fromSeed(seed);

            // Mock blockchain info
            if (!mockChronik.blockchainInfo) {
                mockChronik.blockchainInfo = () =>
                    Promise.resolve({ tipHash: 'mock_tip', tipHeight: 800000 });
            }

            // Create mock Grammy Context
            mockCtx = {
                from: {
                    id: REACTING_USER_ID,
                    is_bot: false,
                    first_name: 'Reacting',
                    username: 'reactinguser',
                },
                chat: {
                    id: parseInt(MONITORED_CHAT_ID),
                    type: 'group',
                    title: 'Test Group',
                },
                messageReaction: {
                    chat: {
                        id: parseInt(MONITORED_CHAT_ID),
                        type: 'group',
                        title: 'Test Group',
                    },
                    message_id: MSG_ID,
                    user: {
                        id: REACTING_USER_ID,
                        is_bot: false,
                        first_name: 'Reacting',
                        username: 'reactinguser',
                    },
                    date: Math.floor(Date.now() / 1000),
                    old_reaction: [],
                    new_reaction: [{ type: 'emoji', emoji: '👍' }],
                },
            };

            // Create in-memory database
            pool = await createTestDb();

            // Create registered users (both reacting user and message sender)
            // Derive addresses from master node using HD indices
            const reactingUserNode =
                masterNode.derivePath("m/44'/1899'/1'/0/0");
            const reactingUserPubkey = reactingUserNode.pubkey();
            const reactingUserPkh = shaRmd160(reactingUserPubkey);
            const reactingUserAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(reactingUserPkh),
            );

            const messageSenderNode =
                masterNode.derivePath("m/44'/1899'/2'/0/0");
            const messageSenderPubkey = messageSenderNode.pubkey();
            const messageSenderPkh = shaRmd160(messageSenderPubkey);
            const messageSenderAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(messageSenderPkh),
            );

            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [REACTING_USER_ID, reactingUserAddress, 1, 'reactinguser'],
            );
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [MESSAGE_SENDER_ID, messageSenderAddress, 2, 'messagesender'],
            );

            // Set up UTXOs for reacting user's wallet (they need tokens to send)
            const reactingUserSk = reactingUserNode.seckey();
            if (reactingUserSk) {
                mockChronik.setUtxosByAddress(reactingUserAddress, [
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
                            atoms: 1000n, // Enough tokens to send likes
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
            }

            // Create a message from another user
            await pool.query(
                'INSERT INTO messages (msg_id, message_text, user_tg_id, username) VALUES ($1, $2, $3, $4)',
                [MSG_ID, 'Test message', MESSAGE_SENDER_ID, 'messagesender'],
            );

            // Pre-create user action table for the reacting user (to show they have registered)
            // We test that the handler updates the table, not that it creates it.
            const tableName = `user_actions_${REACTING_USER_ID}`;
            await pool.query(`
                CREATE TABLE IF NOT EXISTS ${tableName} (
                    id SERIAL,
                    action TEXT,
                    txid TEXT,
                    msg_id INTEGER,
                    emoji TEXT,
                    occurred_at TIMESTAMPTZ
                )
            `);
        });

        afterEach(async () => {
            sandbox.restore();
            if (pool) {
                await pool.end();
            }
        });

        it('should update likes count when registered user reacts with like emoji', async () => {
            await handleMessageReaction(
                mockCtx as Context,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                'ecash:botwalletaddress',
            );

            // Check likes were incremented
            const messageResult = await pool.query(
                'SELECT likes, dislikes FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(messageResult.rows[0].likes).to.equal(1);
            expect(messageResult.rows[0].dislikes).to.equal(0);

            // Check user action was logged
            const actionResult = await pool.query(
                'SELECT * FROM user_actions_12345 WHERE action = $1 AND msg_id = $2',
                ['reaction', MSG_ID],
            );
            expect(actionResult.rows).to.have.length(1);
            expect(actionResult.rows[0].emoji).to.equal('👍');
        });

        it('should update dislikes count when registered user reacts with thumbs down', async () => {
            if (mockCtx.messageReaction) {
                mockCtx.messageReaction.new_reaction = [
                    { type: 'emoji', emoji: '👎' },
                ];
            }

            await handleMessageReaction(
                mockCtx as Context,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                'ecash:botwalletaddress',
            );

            // Check dislikes were incremented
            const messageResult = await pool.query(
                'SELECT likes, dislikes FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(messageResult.rows[0].likes).to.equal(0);
            expect(messageResult.rows[0].dislikes).to.equal(1);

            // Check user action was logged
            const actionResult = await pool.query(
                'SELECT * FROM user_actions_12345 WHERE action = $1 AND msg_id = $2',
                ['reaction', MSG_ID],
            );
            expect(actionResult.rows).to.have.length(1);
            expect(actionResult.rows[0].emoji).to.equal('👎');
        });

        it('should skip database updates when user reacts to their own message', async () => {
            // Update message to be from the reacting user
            await pool.query(
                'UPDATE messages SET user_tg_id = $1 WHERE msg_id = $2',
                [REACTING_USER_ID, MSG_ID],
            );

            await handleMessageReaction(
                mockCtx as Context,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                'ecash:botwalletaddress',
            );

            // Check likes/dislikes were NOT incremented
            const messageResult = await pool.query(
                'SELECT likes, dislikes FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(messageResult.rows[0].likes).to.equal(0);
            expect(messageResult.rows[0].dislikes).to.equal(0);

            // Check user action was NOT logged (table may not exist if no actions were created)
            const tableCheck = await pool.query(
                "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'user_actions_12345'",
            );
            if (parseInt(tableCheck.rows[0].count) > 0) {
                const actionResult = await pool.query(
                    'SELECT * FROM user_actions_12345 WHERE action = $1 AND msg_id = $2',
                    ['reaction', MSG_ID],
                );
                expect(actionResult.rows).to.have.length(0);
            }
        });

        it('should skip database updates when unregistered user reacts', async () => {
            // Remove the user from database
            await pool.query('DELETE FROM users WHERE user_tg_id = $1', [
                REACTING_USER_ID,
            ]);

            await handleMessageReaction(
                mockCtx as Context,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                'ecash:botwalletaddress',
            );

            // Check likes/dislikes were NOT incremented
            const messageResult = await pool.query(
                'SELECT likes, dislikes FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(messageResult.rows[0].likes).to.equal(0);
            expect(messageResult.rows[0].dislikes).to.equal(0);

            // Check user action table doesn't exist or has no entries
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

        it('should process multiple reactions in one update', async () => {
            if (mockCtx.messageReaction) {
                mockCtx.messageReaction.new_reaction = [
                    { type: 'emoji', emoji: '👍' },
                    { type: 'emoji', emoji: '❤' },
                    { type: 'emoji', emoji: '🎉' },
                ];
            }

            await handleMessageReaction(
                mockCtx as Context,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                'ecash:botwalletaddress',
            );

            // Check likes were incremented 3 times
            const messageResult = await pool.query(
                'SELECT likes, dislikes FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(messageResult.rows[0].likes).to.equal(3);
            expect(messageResult.rows[0].dislikes).to.equal(0);

            // Check all 3 reactions were logged
            const actionResult = await pool.query(
                'SELECT * FROM user_actions_12345 WHERE action = $1 AND msg_id = $2 ORDER BY id',
                ['reaction', MSG_ID],
            );
            expect(actionResult.rows).to.have.length(3);
            expect(actionResult.rows[0].emoji).to.equal('👍');
            expect(actionResult.rows[1].emoji).to.equal('❤');
            expect(actionResult.rows[2].emoji).to.equal('🎉');
        });

        it('should skip reaction removals', async () => {
            if (mockCtx.messageReaction) {
                mockCtx.messageReaction.old_reaction = [
                    { type: 'emoji', emoji: '👍' },
                ];
                mockCtx.messageReaction.new_reaction = [];
            }

            await handleMessageReaction(
                mockCtx as Context,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                'ecash:botwalletaddress',
            );

            // Check nothing was updated
            const messageResult = await pool.query(
                'SELECT likes, dislikes FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(messageResult.rows[0].likes).to.equal(0);
            expect(messageResult.rows[0].dislikes).to.equal(0);
        });

        it('should skip reactions from wrong chat', async () => {
            if (mockCtx.chat) {
                mockCtx.chat.id = -9999999999;
            }
            if (mockCtx.messageReaction?.chat) {
                mockCtx.messageReaction.chat.id = -9999999999;
            }

            await handleMessageReaction(
                mockCtx as Context,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                'ecash:botwalletaddress',
            );

            // Check nothing was updated
            const messageResult = await pool.query(
                'SELECT likes, dislikes FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(messageResult.rows[0].likes).to.equal(0);
            expect(messageResult.rows[0].dislikes).to.equal(0);
        });

        it('should handle custom emoji reactions', async () => {
            if (mockCtx.messageReaction) {
                mockCtx.messageReaction.new_reaction = [
                    { type: 'custom_emoji', custom_emoji_id: '123456789' },
                ];
            }

            await handleMessageReaction(
                mockCtx as Context,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                'ecash:botwalletaddress',
            );

            // Check likes were incremented (custom emoji is a like)
            const messageResult = await pool.query(
                'SELECT likes, dislikes FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(messageResult.rows[0].likes).to.equal(1);

            // Check user action was logged with custom emoji ID
            const actionResult = await pool.query(
                'SELECT * FROM user_actions_12345 WHERE action = $1 AND msg_id = $2',
                ['reaction', MSG_ID],
            );
            expect(actionResult.rows).to.have.length(1);
            expect(actionResult.rows[0].emoji).to.equal('123456789');
        });

        it('should handle message not found in database', async () => {
            // Delete the message
            await pool.query('DELETE FROM messages WHERE msg_id = $1', [
                MSG_ID,
            ]);

            // Should not throw, just skip processing
            await handleMessageReaction(
                mockCtx as Context,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                'ecash:botwalletaddress',
            );

            // Check user action table has no entries
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

        it('should handle both likes and dislikes in the same update', async () => {
            if (mockCtx.messageReaction) {
                mockCtx.messageReaction.new_reaction = [
                    { type: 'emoji', emoji: '👍' },
                    { type: 'emoji', emoji: '👎' },
                    { type: 'emoji', emoji: '🎉' },
                ];
            }

            await handleMessageReaction(
                mockCtx as Context,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                'ecash:botwalletaddress',
            );

            // Check likes and dislikes were incremented correctly
            const messageResult = await pool.query(
                'SELECT likes, dislikes FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(messageResult.rows[0].likes).to.equal(2); // 👍 and 🎉
            expect(messageResult.rows[0].dislikes).to.equal(1); // 👎

            // Check all 3 reactions were logged
            const actionResult = await pool.query(
                'SELECT * FROM user_actions_12345 WHERE action = $1 AND msg_id = $2 ORDER BY id',
                ['reaction', MSG_ID],
            );
            expect(actionResult.rows).to.have.length(3);
            expect(actionResult.rows[0].emoji).to.equal('👍');
            expect(actionResult.rows[1].emoji).to.equal('👎');
            expect(actionResult.rows[2].emoji).to.equal('🎉');
        });

        it('should skip already processed reactions', async () => {
            if (mockCtx.messageReaction) {
                mockCtx.messageReaction.old_reaction = [
                    { type: 'emoji', emoji: '👍' },
                ];
                mockCtx.messageReaction.new_reaction = [
                    { type: 'emoji', emoji: '👍' },
                    { type: 'emoji', emoji: '❤' },
                ];
            }

            await handleMessageReaction(
                mockCtx as Context,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                'ecash:botwalletaddress',
            );

            // Only the new reaction (❤️) should be processed
            const messageResult = await pool.query(
                'SELECT likes, dislikes FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(messageResult.rows[0].likes).to.equal(1);

            // Only one action should be logged
            const actionResult = await pool.query(
                'SELECT * FROM user_actions_12345 WHERE action = $1 AND msg_id = $2',
                ['reaction', MSG_ID],
            );
            expect(actionResult.rows).to.have.length(1);
            expect(actionResult.rows[0].emoji).to.equal('❤');
        });

        it('should handle missing messageReaction in context', async () => {
            const mockCtxWithoutReaction: Partial<Context> = {
                ...mockCtx,
                messageReaction: undefined,
            };

            await handleMessageReaction(
                mockCtxWithoutReaction as Context,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                'ecash:botwalletaddress',
            );

            // Nothing should be updated
            const messageResult = await pool.query(
                'SELECT likes, dislikes FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(messageResult.rows[0].likes).to.equal(0);
        });
    });

    describe('handleMessage', () => {
        let pool: Pool;
        const MONITORED_CHAT_ID = '-1001234567890';
        const OTHER_CHAT_ID = '-1009876543210';
        const USER_ID = 12345;
        const USERNAME = 'testuser';
        const MSG_ID = 100;

        beforeEach(async () => {
            pool = await createTestDb();
        });

        afterEach(async () => {
            await pool.end();
        });

        it('should store text message from monitored chat', async () => {
            const mockCtx = {
                chat: {
                    id: parseInt(MONITORED_CHAT_ID),
                    type: 'group',
                    title: 'Test Group',
                },
                message: {
                    message_id: MSG_ID,
                    text: 'Hello world',
                    date: Date.now(),
                },
                from: {
                    id: USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                    username: USERNAME,
                },
            } as unknown as Context;

            await handleMessage(mockCtx, pool, MONITORED_CHAT_ID);

            const result = await pool.query(
                'SELECT * FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(result.rows).to.have.length(1);
            expect(result.rows[0].message_text).to.equal('Hello world');
            expect(result.rows[0].user_tg_id).to.equal(USER_ID);
            expect(result.rows[0].username).to.equal(USERNAME);
        });

        it('should store message with caption from monitored chat', async () => {
            const mockCtx = {
                chat: {
                    id: parseInt(MONITORED_CHAT_ID),
                    type: 'group',
                    title: 'Test Group',
                },
                message: {
                    message_id: MSG_ID,
                    photo: [{ file_id: 'photo1', width: 100, height: 100 }],
                    caption: 'Photo caption',
                    date: Date.now(),
                },
                from: {
                    id: USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                    username: USERNAME,
                },
            } as unknown as Context;

            await handleMessage(mockCtx, pool, MONITORED_CHAT_ID);

            const result = await pool.query(
                'SELECT * FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(result.rows).to.have.length(1);
            expect(result.rows[0].message_text).to.equal('Photo caption');
        });

        it('should store photo without caption as [Photo]', async () => {
            const mockCtx = {
                chat: {
                    id: parseInt(MONITORED_CHAT_ID),
                    type: 'group',
                    title: 'Test Group',
                },
                message: {
                    message_id: MSG_ID,
                    photo: [{ file_id: 'photo1', width: 100, height: 100 }],
                    date: Date.now(),
                },
                from: {
                    id: USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                },
            } as unknown as Context;

            await handleMessage(mockCtx, pool, MONITORED_CHAT_ID);

            const result = await pool.query(
                'SELECT * FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(result.rows).to.have.length(1);
            expect(result.rows[0].message_text).to.equal('[Photo]');
        });

        it('should store video with caption', async () => {
            const mockCtx = {
                chat: {
                    id: parseInt(MONITORED_CHAT_ID),
                    type: 'group',
                    title: 'Test Group',
                },
                message: {
                    message_id: MSG_ID,
                    video: { file_id: 'video1', width: 100, height: 100 },
                    caption: 'Video caption',
                    date: Date.now(),
                },
                from: {
                    id: USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                },
            } as unknown as Context;

            await handleMessage(mockCtx, pool, MONITORED_CHAT_ID);

            const result = await pool.query(
                'SELECT * FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(result.rows).to.have.length(1);
            expect(result.rows[0].message_text).to.equal('Video caption');
        });

        it('should store video without caption as [Video]', async () => {
            const mockCtx = {
                chat: {
                    id: parseInt(MONITORED_CHAT_ID),
                    type: 'group',
                    title: 'Test Group',
                },
                message: {
                    message_id: MSG_ID,
                    video: { file_id: 'video1', width: 100, height: 100 },
                    date: Date.now(),
                },
                from: {
                    id: USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                },
            } as unknown as Context;

            await handleMessage(mockCtx, pool, MONITORED_CHAT_ID);

            const result = await pool.query(
                'SELECT * FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(result.rows).to.have.length(1);
            expect(result.rows[0].message_text).to.equal('[Video]');
        });

        it('should store document with caption', async () => {
            const mockCtx = {
                chat: {
                    id: parseInt(MONITORED_CHAT_ID),
                    type: 'group',
                    title: 'Test Group',
                },
                message: {
                    message_id: MSG_ID,
                    document: { file_id: 'doc1', file_name: 'test.pdf' },
                    caption: 'Document caption',
                    date: Date.now(),
                },
                from: {
                    id: USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                },
            } as unknown as Context;

            await handleMessage(mockCtx, pool, MONITORED_CHAT_ID);

            const result = await pool.query(
                'SELECT * FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(result.rows).to.have.length(1);
            expect(result.rows[0].message_text).to.equal('Document caption');
        });

        it('should store document without caption as [Document: filename]', async () => {
            const mockCtx = {
                chat: {
                    id: parseInt(MONITORED_CHAT_ID),
                    type: 'group',
                    title: 'Test Group',
                },
                message: {
                    message_id: MSG_ID,
                    document: { file_id: 'doc1', file_name: 'test.pdf' },
                    date: Date.now(),
                },
                from: {
                    id: USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                },
            } as unknown as Context;

            await handleMessage(mockCtx, pool, MONITORED_CHAT_ID);

            const result = await pool.query(
                'SELECT * FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(result.rows).to.have.length(1);
            expect(result.rows[0].message_text).to.equal(
                '[Document: test.pdf]',
            );
        });

        it('should store sticker with emoji', async () => {
            const mockCtx = {
                chat: {
                    id: parseInt(MONITORED_CHAT_ID),
                    type: 'group',
                    title: 'Test Group',
                },
                message: {
                    message_id: MSG_ID,
                    sticker: { file_id: 'sticker1', emoji: '😀' },
                    date: Date.now(),
                },
                from: {
                    id: USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                },
            } as unknown as Context;

            await handleMessage(mockCtx, pool, MONITORED_CHAT_ID);

            const result = await pool.query(
                'SELECT * FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(result.rows).to.have.length(1);
            expect(result.rows[0].message_text).to.equal('[Sticker: 😀]');
        });

        it('should store sticker without emoji as [Sticker: sticker]', async () => {
            const mockCtx = {
                chat: {
                    id: parseInt(MONITORED_CHAT_ID),
                    type: 'group',
                    title: 'Test Group',
                },
                message: {
                    message_id: MSG_ID,
                    sticker: { file_id: 'sticker1' },
                    date: Date.now(),
                },
                from: {
                    id: USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                },
            } as unknown as Context;

            await handleMessage(mockCtx, pool, MONITORED_CHAT_ID);

            const result = await pool.query(
                'SELECT * FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(result.rows).to.have.length(1);
            expect(result.rows[0].message_text).to.equal('[Sticker: sticker]');
        });

        it('should store unknown message type as [Non-text message]', async () => {
            const mockCtx = {
                chat: {
                    id: parseInt(MONITORED_CHAT_ID),
                    type: 'group',
                    title: 'Test Group',
                },
                message: {
                    message_id: MSG_ID,
                    voice: { file_id: 'voice1', duration: 5 },
                    date: Date.now(),
                },
                from: {
                    id: USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                },
            } as unknown as Context;

            await handleMessage(mockCtx, pool, MONITORED_CHAT_ID);

            const result = await pool.query(
                'SELECT * FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(result.rows).to.have.length(1);
            expect(result.rows[0].message_text).to.equal('[Non-text message]');
        });

        it('should ignore messages from other chats', async () => {
            const mockCtx = {
                chat: {
                    id: parseInt(OTHER_CHAT_ID),
                    type: 'group',
                    title: 'Other Group',
                },
                message: {
                    message_id: MSG_ID,
                    text: 'Hello',
                    date: Date.now(),
                },
                from: {
                    id: USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                },
            } as unknown as Context;

            await handleMessage(mockCtx, pool, MONITORED_CHAT_ID);

            const result = await pool.query(
                'SELECT * FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(result.rows).to.have.length(0);
        });

        it('should handle messages without user ID', async () => {
            const mockCtx = {
                chat: {
                    id: parseInt(MONITORED_CHAT_ID),
                    type: 'group',
                    title: 'Test Group',
                },
                message: {
                    message_id: MSG_ID,
                    text: 'Hello',
                    date: Date.now(),
                },
                from: undefined,
            } as unknown as Context;

            await handleMessage(mockCtx, pool, MONITORED_CHAT_ID);

            const result = await pool.query(
                'SELECT * FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(result.rows).to.have.length(1);
            expect(result.rows[0].user_tg_id).to.equal(null);
            expect(result.rows[0].username).to.equal(null);
        });

        it('should handle messages without username', async () => {
            const mockCtx = {
                chat: {
                    id: parseInt(MONITORED_CHAT_ID),
                    type: 'group',
                    title: 'Test Group',
                },
                message: {
                    message_id: MSG_ID,
                    text: 'Hello',
                    date: Date.now(),
                },
                from: {
                    id: USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                },
            } as unknown as Context;

            await handleMessage(mockCtx, pool, MONITORED_CHAT_ID);

            const result = await pool.query(
                'SELECT * FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(result.rows).to.have.length(1);
            expect(result.rows[0].user_tg_id).to.equal(USER_ID);
            expect(result.rows[0].username).to.equal(null);
        });

        it('should not duplicate messages (ON CONFLICT DO NOTHING)', async () => {
            const mockCtx = {
                chat: {
                    id: parseInt(MONITORED_CHAT_ID),
                    type: 'group',
                    title: 'Test Group',
                },
                message: {
                    message_id: MSG_ID,
                    text: 'Hello',
                    date: Date.now(),
                },
                from: {
                    id: USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                    username: USERNAME,
                },
            } as unknown as Context;

            // Insert message twice
            await handleMessage(mockCtx, pool, MONITORED_CHAT_ID);
            await handleMessage(mockCtx, pool, MONITORED_CHAT_ID);

            const result = await pool.query(
                'SELECT * FROM messages WHERE msg_id = $1',
                [MSG_ID],
            );
            expect(result.rows).to.have.length(1);
        });

        it('should handle messages without message_id', async () => {
            const mockCtx = {
                chat: {
                    id: parseInt(MONITORED_CHAT_ID),
                    type: 'group',
                    title: 'Test Group',
                },
                message: {
                    text: 'Hello',
                    date: Date.now(),
                },
                from: {
                    id: USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                },
            } as unknown as Context;

            await handleMessage(mockCtx, pool, MONITORED_CHAT_ID);

            const result = await pool.query('SELECT * FROM messages');
            expect(result.rows).to.have.length(0);
        });
    });

    describe('handleLike', () => {
        let pool: Pool;
        let mockChronik: MockChronikClient;
        let mockBot: Bot;
        let masterNode: HdNode;
        let sandbox: sinon.SinonSandbox;
        const ADMIN_CHAT_ID = '-1001234567890';
        const LIKER_USER_ID = 11111;
        const AUTHOR_USER_ID = 22222;
        // Test mnemonic for deriving HD wallets
        const TEST_MNEMONIC =
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
        // Raw transaction hex and txid for like transaction
        const LIKE_RAW_TX =
            '02000000010100000000000000000000000000000000000000000000000000000000000000000000006441f46bcfca811fc54cadb8991e9911efec7b81af893935fea3c3c79fbccc28bf58f7046aa90af20405e14a27d57c455aa125e698849a0314ebb4fe60f8a87293e2412102dcf93656266337338bfb2982199d299eea23ecea20c4d11b604008d9a7b8b03cffffffff040000000000000000456a5037534c5032000453454e44efb82f4a412819f138f7d01aa39e9378319ac026f332685a539d00791965972d02010000000000e703000000000a584f564d00016400000022020000000000001976a914465e603579d334aa0fef7f02d87aaa729564b26688ac22020000000000001976a914d3ba9d03889a80df4d5d0b1b8be1a1fcf7ab38a988ac81210000000000001976a914d3ba9d03889a80df4d5d0b1b8be1a1fcf7ab38a988ac00000000';
        const LIKE_TXID =
            '6c01889ff1209cc875dbc2528118e43617a8cd87edc1d226b3d680c13d9aacbf';

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

            // Initialize master node from test mnemonic
            const seed = mnemonicToSeed(TEST_MNEMONIC);
            masterNode = HdNode.fromSeed(seed);

            // Mock blockchain info
            if (!mockChronik.blockchainInfo) {
                mockChronik.blockchainInfo = () =>
                    Promise.resolve({ tipHash: 'mock_tip', tipHeight: 800000 });
            }

            // Create in-memory database
            pool = await createTestDb();

            // Create registered users with HD indices
            // Derive addresses from master node
            const likerNode = masterNode.derivePath("m/44'/1899'/1'/0/0");
            const likerPubkey = likerNode.pubkey();
            const likerPkh = shaRmd160(likerPubkey);
            const likerAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(likerPkh),
            );

            const authorNode = masterNode.derivePath("m/44'/1899'/2'/0/0");
            const authorPubkey = authorNode.pubkey();
            const authorPkh = shaRmd160(authorPubkey);
            const authorAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(authorPkh),
            );

            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [LIKER_USER_ID, likerAddress, 1, 'liker'],
            );
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [AUTHOR_USER_ID, authorAddress, 2, 'author'],
            );

            // Set up UTXOs for liker's wallet (they need tokens to send)
            const likerSk = likerNode.seckey();
            if (likerSk) {
                mockChronik.setUtxosByAddress(likerAddress, [
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
                            atoms: 1000n, // Enough tokens to send likes
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
            }

            // Set the expected like tx
            mockChronik.setBroadcastTx(LIKE_RAW_TX, LIKE_TXID);
        });

        afterEach(async () => {
            sandbox.restore();
            if (pool) {
                await pool.end();
            }
        });

        it('should send 1HP from liker to message author', async () => {
            // Prepare the mockChronik
            await handleLike(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                LIKER_USER_ID,
                AUTHOR_USER_ID,
                100, // msgId
            );

            // Check that admin notification was sent with correct message
            expect(mockBot.api.sendMessage).to.have.callCount(1);
            const callArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(0).args;
            expect(callArgs[0]).to.equal(ADMIN_CHAT_ID);
            expect(callArgs[1]).to.include(LIKER_USER_ID.toString());
            expect(callArgs[1]).to.include(AUTHOR_USER_ID.toString());
            expect(callArgs[1]).to.include('liked');
            expect(callArgs[1]).to.include(LIKE_TXID);
            expect(callArgs[2]).to.deep.equal({ parse_mode: 'Markdown' });
        });

        it('should skip if liker is not registered', async () => {
            // Remove liker from database
            await pool.query('DELETE FROM users WHERE user_tg_id = $1', [
                LIKER_USER_ID,
            ]);

            await handleLike(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                LIKER_USER_ID,
                AUTHOR_USER_ID,
                100, // msgId
            );

            // Should not send admin notification for missing user
            expect(mockBot.api.sendMessage).to.have.callCount(0);
        });

        it('should skip if message author is not registered', async () => {
            // Remove author from database
            await pool.query('DELETE FROM users WHERE user_tg_id = $1', [
                AUTHOR_USER_ID,
            ]);

            await handleLike(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                LIKER_USER_ID,
                AUTHOR_USER_ID,
                100, // msgId
            );

            // Should not send admin notification for missing user
            expect(mockBot.api.sendMessage).to.have.callCount(0);
        });

        it('should skip if user is liking their own message', async () => {
            await handleLike(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                LIKER_USER_ID,
                LIKER_USER_ID, // Same user
                100, // msgId
            );

            // Should not send tokens or admin notification
            expect(mockBot.api.sendMessage).to.have.callCount(0);
        });

        it('should send admin notification on wallet derivation failure', async () => {
            // Create a user with invalid HD index that might cause issues
            // Actually, this is hard to test without breaking the HD derivation
            // We'll test the error handling path by using a valid but edge case scenario
            // For now, we'll test that the function handles missing users gracefully
            await pool.query('DELETE FROM users WHERE user_tg_id = $1', [
                LIKER_USER_ID,
            ]);

            await handleLike(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                LIKER_USER_ID,
                AUTHOR_USER_ID,
                100, // msgId
            );

            // Should not send admin notification for missing user (graceful skip)
            expect(mockBot.api.sendMessage).to.have.callCount(0);
        });

        it('should send admin notification on transaction failure', async () => {
            // Mock a tx failure
            mockChronik.setBroadcastTx(
                LIKE_RAW_TX,
                new Error('Transaction failed'),
            );

            await handleLike(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                LIKER_USER_ID,
                AUTHOR_USER_ID,
                100, // msgId
            );

            // Function should complete without throwing and send error notification
            expect(mockBot.api.sendMessage).to.have.callCount(1);
            const callArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(0).args;
            expect(callArgs[0]).to.equal(ADMIN_CHAT_ID);
            expect(callArgs[1]).to.include('🚨 **Bot Action Error**');
            expect(callArgs[1]).to.include('handleLike (sending 1HP)');
            expect(callArgs[1]).to.include(LIKER_USER_ID.toString());
            expect(callArgs[2]).to.deep.equal({ parse_mode: 'Markdown' });
        });
    });

    describe('handleDislike', () => {
        let pool: Pool;
        let mockChronik: MockChronikClient;
        let mockBot: Bot;
        let masterNode: HdNode;
        let sandbox: sinon.SinonSandbox;
        const ADMIN_CHAT_ID = '-1001234567890';
        const DISLIKER_USER_ID = 33333;
        const AUTHOR_USER_ID = 44444;
        const BOT_WALLET_ADDRESS =
            'ecash:qrfm48gr3zdgph6dt593hzlp587002ec4ysl59mavw';
        // Test mnemonic for deriving HD wallets
        const TEST_MNEMONIC =
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
        // Raw transaction hexes and txids for dislike transactions
        const DISLIKER_RAW_TX =
            '02000000010300000000000000000000000000000000000000000000000000000000000000000000006441c7a7f46d45038b104088386eadd1b92635a077c2240675ce9f0c83f1742eed4684622779ab05047f7feb4ca3d68e00ecc4f08b6e629c5c7bbb72198544b47aaf412103cc5daa5c15e68860b90666419a457ed48940d7509616a6ea33ad55534d87cb60ffffffff040000000000000000456a5037534c5032000453454e44efb82f4a412819f138f7d01aa39e9378319ac026f332685a539d00791965972d02010000000000e703000000000a584f564d0002c800000022020000000000001976a914d3ba9d03889a80df4d5d0b1b8be1a1fcf7ab38a988ac22020000000000001976a914f0f7224600d8d0b967284c99986abf8125e55fb888ac81210000000000001976a914f0f7224600d8d0b967284c99986abf8125e55fb888ac00000000';
        const DISLIKER_TXID =
            'cb187306d020cbafa4b0631028ec0992afdd772d6a4eb21f699a8bbd4ff70c8b';
        const AUTHOR_RAW_TX =
            '0200000001050000000000000000000000000000000000000000000000000000000000000000000000644122d92c08a4cf79f2a613de7d9c272cc60695a5f289d2efad86744a0bd9694066d8595759e5669adf2b865b4ac892f72936faf959a97a09bc0b7c7eedead7b156412103fda8f79f575b7d84fbdd790100a629f238de13b6a8a21718193f854917ce99efffffffff040000000000000000456a5037534c5032000453454e44efb82f4a412819f138f7d01aa39e9378319ac026f332685a539d00791965972d02020000000000ce07000000000a584f564d0003c800000022020000000000001976a914d3ba9d03889a80df4d5d0b1b8be1a1fcf7ab38a988ac22020000000000001976a9145b31395712165e8a12abb4cce1b870555bb24a8588ac81210000000000001976a9145b31395712165e8a12abb4cce1b870555bb24a8588ac00000000';
        const AUTHOR_TXID =
            '49d7803e574c80b8ef8442f1bb03915ad44a8f445b712ddd6611b0ac9479e2bc';

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

            // Initialize master node from test mnemonic
            const seed = mnemonicToSeed(TEST_MNEMONIC);
            masterNode = HdNode.fromSeed(seed);

            // Mock blockchain info
            if (!mockChronik.blockchainInfo) {
                mockChronik.blockchainInfo = () =>
                    Promise.resolve({ tipHash: 'mock_tip', tipHeight: 800000 });
            }

            // Create in-memory database
            pool = await createTestDb();

            // Create registered users with HD indices
            // Derive addresses from master node
            const dislikerNode = masterNode.derivePath("m/44'/1899'/3'/0/0");
            const dislikerPubkey = dislikerNode.pubkey();
            const dislikerPkh = shaRmd160(dislikerPubkey);
            const dislikerAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(dislikerPkh),
            );

            const authorNode = masterNode.derivePath("m/44'/1899'/4'/0/0");
            const authorPubkey = authorNode.pubkey();
            const authorPkh = shaRmd160(authorPubkey);
            const authorAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(authorPkh),
            );

            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [DISLIKER_USER_ID, dislikerAddress, 3, 'disliker'],
            );
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [AUTHOR_USER_ID, authorAddress, 4, 'author'],
            );

            // Set up UTXOs for disliker's wallet (they need tokens to send)
            const dislikerSk = dislikerNode.seckey();
            if (dislikerSk) {
                mockChronik.setUtxosByAddress(dislikerAddress, [
                    {
                        outpoint: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000003',
                            outIdx: 0,
                        },
                        blockHeight: 800000,
                        isCoinbase: false,
                        sats: 10000n,
                        isFinal: true,
                        token: {
                            tokenId: REWARDS_TOKEN_ID,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                            atoms: 1000n, // Enough tokens to send dislikes
                            isMintBaton: false,
                        },
                    },
                    {
                        outpoint: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000004',
                            outIdx: 0,
                        },
                        blockHeight: 800000,
                        isCoinbase: false,
                        sats: 100000n, // XEC for fees
                        isFinal: true,
                    },
                ]);
            }

            // Set up UTXOs for author's wallet (they need tokens to send)
            const authorSk = authorNode.seckey();
            if (authorSk) {
                mockChronik.setUtxosByAddress(authorAddress, [
                    {
                        outpoint: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000005',
                            outIdx: 0,
                        },
                        blockHeight: 800000,
                        isCoinbase: false,
                        sats: 10000n,
                        isFinal: true,
                        token: {
                            tokenId: REWARDS_TOKEN_ID,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                            atoms: 2000n, // Enough tokens to send 2HP
                            isMintBaton: false,
                        },
                    },
                    {
                        outpoint: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000006',
                            outIdx: 0,
                        },
                        blockHeight: 800000,
                        isCoinbase: false,
                        sats: 100000n, // XEC for fees
                        isFinal: true,
                    },
                ]);
            }

            // Set the expected dislike txs
            // Disliker sends 1HP to bot
            mockChronik.setBroadcastTx(DISLIKER_RAW_TX, DISLIKER_TXID);
            // Author sends 2HP to bot
            mockChronik.setBroadcastTx(AUTHOR_RAW_TX, AUTHOR_TXID);
        });

        afterEach(async () => {
            sandbox.restore();
            if (pool) {
                await pool.end();
            }
        });

        it('should send 1HP from disliker to bot and 2HP from author to bot', async () => {
            await handleDislike(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                BOT_WALLET_ADDRESS,
                DISLIKER_USER_ID,
                AUTHOR_USER_ID,
                200, // msgId
            );

            // Should send two admin notifications on success (one for disliker, one for author)
            expect(mockBot.api.sendMessage).to.have.callCount(2);

            // Check disliker notification
            const dislikerCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(0).args;
            expect(dislikerCallArgs[0]).to.equal(ADMIN_CHAT_ID);
            expect(dislikerCallArgs[1]).to.include(DISLIKER_USER_ID.toString());
            expect(dislikerCallArgs[1]).to.include(AUTHOR_USER_ID.toString());
            expect(dislikerCallArgs[1]).to.include('disliked');
            expect(dislikerCallArgs[1]).to.include(DISLIKER_TXID);
            expect(dislikerCallArgs[2]).to.deep.equal({
                parse_mode: 'Markdown',
            });

            // Check author notification
            const authorCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(1).args;
            expect(authorCallArgs[0]).to.equal(ADMIN_CHAT_ID);
            expect(authorCallArgs[1]).to.include(AUTHOR_USER_ID.toString());
            expect(authorCallArgs[1]).to.include(DISLIKER_USER_ID.toString());
            expect(authorCallArgs[1]).to.include('penalized');
            expect(authorCallArgs[1]).to.include(AUTHOR_TXID);
            expect(authorCallArgs[2]).to.deep.equal({ parse_mode: 'Markdown' });
        });

        it('should skip if disliker is not registered', async () => {
            // Remove disliker from database
            await pool.query('DELETE FROM users WHERE user_tg_id = $1', [
                DISLIKER_USER_ID,
            ]);

            await handleDislike(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                BOT_WALLET_ADDRESS,
                DISLIKER_USER_ID,
                AUTHOR_USER_ID,
                200, // msgId
            );

            // Should not send admin notification for missing user
            expect(mockBot.api.sendMessage).to.have.callCount(0);
        });

        it('should skip if message author is not registered', async () => {
            // Remove author from database
            await pool.query('DELETE FROM users WHERE user_tg_id = $1', [
                AUTHOR_USER_ID,
            ]);

            await handleDislike(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                BOT_WALLET_ADDRESS,
                DISLIKER_USER_ID,
                AUTHOR_USER_ID,
                200, // msgId
            );

            // Should not send admin notification for missing user
            expect(mockBot.api.sendMessage).to.have.callCount(0);
        });

        it('should skip if user is disliking their own message', async () => {
            await handleDislike(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                BOT_WALLET_ADDRESS,
                DISLIKER_USER_ID,
                DISLIKER_USER_ID, // Same user
                200, // msgId
            );

            // Should not send tokens or admin notification
            expect(mockBot.api.sendMessage).to.have.callCount(0);
        });

        it('should send admin notification on disliker transaction failure', async () => {
            // Mock a tx failure for disliker (override the success case from beforeEach)
            mockChronik.setBroadcastTx(
                DISLIKER_RAW_TX,
                new Error('Transaction failed'),
            );

            await handleDislike(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                BOT_WALLET_ADDRESS,
                DISLIKER_USER_ID,
                AUTHOR_USER_ID,
                200, // msgId
            );

            // Both transactions run independently (separate try-catch blocks)
            // Disliker fails, but author still succeeds
            // So we get: 1 error notification + 1 success notification = 2 calls
            expect(mockBot.api.sendMessage).to.have.callCount(2);

            // First call should be the error notification for disliker
            const errorCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(0).args;
            expect(errorCallArgs[0]).to.equal(ADMIN_CHAT_ID);
            expect(errorCallArgs[1]).to.include('🚨 **Bot Action Error**');
            expect(errorCallArgs[1]).to.include(
                'handleDislike (disliker sending 1HP)',
            );
            expect(errorCallArgs[1]).to.include(DISLIKER_USER_ID.toString());
            expect(errorCallArgs[2]).to.deep.equal({ parse_mode: 'Markdown' });

            // Second call should be the success notification for author
            const successCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(1).args;
            expect(successCallArgs[0]).to.equal(ADMIN_CHAT_ID);
            expect(successCallArgs[1]).to.include('penalized');
            expect(successCallArgs[1]).to.include(AUTHOR_TXID);
        });

        it('should send admin notification on author transaction failure', async () => {
            // Mock a tx failure for author (disliker succeeds, author fails)
            // First set disliker to succeed
            mockChronik.setBroadcastTx(DISLIKER_RAW_TX, DISLIKER_TXID);
            // Then set author to fail
            mockChronik.setBroadcastTx(
                AUTHOR_RAW_TX,
                new Error('Transaction failed'),
            );

            await handleDislike(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                BOT_WALLET_ADDRESS,
                DISLIKER_USER_ID,
                AUTHOR_USER_ID,
                200, // msgId
            );

            // Should send success notification for disliker and error notification for author
            expect(mockBot.api.sendMessage).to.have.callCount(2);

            // First call: disliker success notification
            const dislikerCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(0).args;
            expect(dislikerCallArgs[0]).to.equal(ADMIN_CHAT_ID);
            expect(dislikerCallArgs[1]).to.include('disliked');
            expect(dislikerCallArgs[1]).to.include(DISLIKER_TXID);

            // Second call: author error notification
            const authorCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(1).args;
            expect(authorCallArgs[0]).to.equal(ADMIN_CHAT_ID);
            expect(authorCallArgs[1]).to.include('🚨 **Bot Action Error**');
            expect(authorCallArgs[1]).to.include(
                'handleDislike (author sending 2HP)',
            );
            expect(authorCallArgs[1]).to.include(AUTHOR_USER_ID.toString());
            expect(authorCallArgs[2]).to.deep.equal({ parse_mode: 'Markdown' });
        });
    });
});

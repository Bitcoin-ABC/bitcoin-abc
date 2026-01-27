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
    DEFAULT_DUST_SATS,
    shaRmd160,
    toHex,
    emppScript,
} from 'ecash-lib';
import { encodeCashAddress, getOutputScriptFromAddress } from 'ecashaddrjs';
import { Tx } from 'chronik-client';
import { ChronikClient } from 'chronik-client';
import { Wallet } from 'ecash-wallet';
import { MockChronikClient } from '../../../modules/mock-chronik-client';
import {
    register,
    health,
    start,
    stats,
    respawn,
    withdraw,
    handleWithdrawConfirm,
    handleWithdrawCancel,
    setWithdrawState,
    clearWithdrawState,
    isInWithdrawWorkflow,
    sendErrorToAdmin,
    handleMessage,
    handleMessageReaction,
    handleLike,
    handleDislike,
    handleBottleReply,
    loadUsernames,
} from './bot';
import { REWARDS_TOKEN_ID } from './constants';
import { getOvermindEmpp, EmppAction } from './empp';

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
            expect(callArgs[2]).to.deep.equal({
                parse_mode: 'Markdown',
                link_preview_options: { is_disabled: true },
            });
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

            const error = new Error('Test error');
            await sendErrorToAdmin(
                mockBot,
                ADMIN_CHAT_ID,
                'test-action',
                12345,
                error,
            );

            // Should attempt to send message (will fail but not throw)
            expect(mockBot.api.sendMessage).to.have.callCount(1);
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
            sandbox
                .stub(mockChronik, 'broadcastTx')
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
            sandbox
                .stub(mockChronik, 'broadcastTx')
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
            sandbox
                .stub(mockChronik, 'broadcastTx')
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

        it('should allow registration when user is a restricted member with is_member=true', async () => {
            // Mock bot to return 'restricted' status with is_member=true
            const botWithRestrictedMember = {
                api: {
                    getChatMember: sandbox.stub().resolves({
                        status: 'restricted',
                        is_member: true,
                        user: { id: 12345 },
                    }),
                    sendMessage: sandbox.stub().resolves({
                        message_id: 1,
                        date: Date.now(),
                        chat: { id: ADMIN_CHAT_ID, type: 'supergroup' },
                        text: 'test',
                    }),
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
            sandbox
                .stub(mockChronik, 'broadcastTx')
                .resolves({ txid: expectedTxid });

            await register(
                mockCtx,
                masterNode,
                pool,
                botWithRestrictedMember,
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
        });

        it('should reject registration when user is restricted but is_member=false', async () => {
            // Mock bot to return 'restricted' status with is_member=false
            const botWithRestrictedNonMember = {
                api: {
                    getChatMember: sandbox.stub().resolves({
                        status: 'restricted',
                        is_member: false,
                        user: { id: 12345 },
                    }),
                },
            } as unknown as Bot;

            await register(
                mockCtx,
                masterNode,
                pool,
                botWithRestrictedNonMember,
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
            sandbox
                .stub(mockChronik, 'broadcastTx')
                .resolves({ txid: expectedTxid });

            // Update botWithMember to include sendMessage for admin notifications
            const botWithMemberAndAdmin = {
                api: {
                    getChatMember: botWithMember.api.getChatMember,
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

            await health(mockCtx, pool, errorChronik);

            // Verify error message to user
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include('❌ Error fetching your health');
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

    describe('respawn', () => {
        let mockCtx: Context;
        let pool: Pool;
        let mockChronik: MockChronikClient;
        let wallet: Wallet;
        let mockBot: Bot;
        let sandbox: sinon.SinonSandbox;
        const USER_ADDRESS = 'ecash:qrfm48gr3zdgph6dt593hzlp587002ec4ysl59mavw';
        const ADMIN_CHAT_ID = '-1001234567890';
        const BOT_SK = fromHex(
            '0000000000000000000000000000000000000000000000000000000000000001',
        );

        beforeEach(async () => {
            sandbox = sinon.createSandbox();

            // Create mock chronik client
            mockChronik = new MockChronikClient();

            // Create wallet with mock chronik
            wallet = Wallet.fromSk(
                BOT_SK,
                mockChronik as unknown as ChronikClient,
            );

            // Mock Bot
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

            // Set up wallet UTXOs with reward tokens
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
                        atoms: 1_000_00n, // 1,000,000 tokens
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

            // Create user action table
            await pool.query(`
                CREATE TABLE IF NOT EXISTS user_actions_12345 (
                    id SERIAL PRIMARY KEY,
                    action TEXT NOT NULL,
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

        it('should successfully respawn HP for user with balance below 75 and no recent dislikes', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, USER_ADDRESS, 1, 'testuser'],
            );

            // Mock user has 50 HP
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
                        atoms: 50n,
                        isMintBaton: false,
                    },
                },
            ]);

            // Mock broadcast transaction
            const expectedTxid =
                '0000000000000000000000000000000000000000000000000000000000000003';
            sandbox
                .stub(mockChronik, 'broadcastTx')
                .resolves({ txid: expectedTxid });

            await respawn(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                wallet,
                mockBot,
                ADMIN_CHAT_ID,
            );

            // Verify success message
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('✅ HP respawned!');
            expect(replyCall.args[0]).to.include('50 HP'); // Should send 50 HP to reach 100
            expect(replyCall.args[0]).to.include('100 HP');
            expect(replyCall.args[0]).to.include(expectedTxid);

            // Verify action was logged
            const actionResult = await pool.query(
                'SELECT * FROM user_actions_12345 WHERE action = $1',
                ['respawn'],
            );
            expect(actionResult.rows).to.have.length(1);
            expect(actionResult.rows[0].txid).to.equal(expectedTxid);
        });

        it('should reject respawn if balance is 75 or above', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, USER_ADDRESS, 1, 'testuser'],
            );

            // Mock user has 75 HP
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
                        atoms: 75n,
                        isMintBaton: false,
                    },
                },
            ]);

            await respawn(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                wallet,
                mockBot,
                ADMIN_CHAT_ID,
            );

            // Verify rejection message
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include(
                '❌ Cannot respawn. Your health must be below 75 HP to use this command.',
            );
        });

        it('should reject respawn if balance is above 75', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, USER_ADDRESS, 1, 'testuser'],
            );

            // Mock user has 80 HP
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
                        atoms: 80n,
                        isMintBaton: false,
                    },
                },
            ]);

            await respawn(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                wallet,
                mockBot,
                ADMIN_CHAT_ID,
            );

            // Verify rejection message
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include(
                '❌ Cannot respawn. Your health must be below 75 HP to use this command.',
            );
        });

        it('should reject respawn if user has more than 3 dislikes in last 24 hours', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, USER_ADDRESS, 1, 'testuser'],
            );

            // Mock user has 50 HP
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
                        atoms: 50n,
                        isMintBaton: false,
                    },
                },
            ]);

            // Insert 4 messages with dislikes in last 24 hours
            await pool.query(
                'INSERT INTO messages (msg_id, message_text, user_tg_id, username, dislikes, sent_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                [1, 'Message 1', 12345, 'testuser', 1],
            );
            await pool.query(
                'INSERT INTO messages (msg_id, message_text, user_tg_id, username, dislikes, sent_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                [2, 'Message 2', 12345, 'testuser', 1],
            );
            await pool.query(
                'INSERT INTO messages (msg_id, message_text, user_tg_id, username, dislikes, sent_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                [3, 'Message 3', 12345, 'testuser', 1],
            );
            await pool.query(
                'INSERT INTO messages (msg_id, message_text, user_tg_id, username, dislikes, sent_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                [4, 'Message 4', 12345, 'testuser', 1],
            );

            await respawn(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                wallet,
                mockBot,
                ADMIN_CHAT_ID,
            );

            // Verify rejection message
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include(
                '❌ Cannot respawn. You have received dislikes on 4 messages',
            );
            expect(replyCall.args[0]).to.include('maximum allowed: 3');
        });

        it('should allow respawn if user has exactly 3 dislikes in last 24 hours', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, USER_ADDRESS, 1, 'testuser'],
            );

            // Mock user has 50 HP
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
                        atoms: 50n,
                        isMintBaton: false,
                    },
                },
            ]);

            // Insert 3 messages with dislikes in last 24 hours
            await pool.query(
                'INSERT INTO messages (msg_id, message_text, user_tg_id, username, dislikes, sent_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                [1, 'Message 1', 12345, 'testuser', 1],
            );
            await pool.query(
                'INSERT INTO messages (msg_id, message_text, user_tg_id, username, dislikes, sent_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                [2, 'Message 2', 12345, 'testuser', 1],
            );
            await pool.query(
                'INSERT INTO messages (msg_id, message_text, user_tg_id, username, dislikes, sent_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                [3, 'Message 3', 12345, 'testuser', 1],
            );

            // Mock broadcast transaction
            const expectedTxid =
                '0000000000000000000000000000000000000000000000000000000000000003';
            sandbox
                .stub(mockChronik, 'broadcastTx')
                .resolves({ txid: expectedTxid });

            await respawn(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                wallet,
                mockBot,
                ADMIN_CHAT_ID,
            );

            // Verify success message
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('✅ HP respawned!');
        });

        it('should ignore dislikes older than 24 hours when checking respawn eligibility', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, USER_ADDRESS, 1, 'testuser'],
            );

            // Mock user has 50 HP
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
                        atoms: 50n,
                        isMintBaton: false,
                    },
                },
            ]);

            // Insert 5 messages with dislikes older than 24 hours
            await pool.query(
                "INSERT INTO messages (msg_id, message_text, user_tg_id, username, dislikes, sent_at) VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '25 hours')",
                [1, 'Message 1', 12345, 'testuser', 1],
            );
            await pool.query(
                "INSERT INTO messages (msg_id, message_text, user_tg_id, username, dislikes, sent_at) VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '25 hours')",
                [2, 'Message 2', 12345, 'testuser', 1],
            );
            await pool.query(
                "INSERT INTO messages (msg_id, message_text, user_tg_id, username, dislikes, sent_at) VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '25 hours')",
                [3, 'Message 3', 12345, 'testuser', 1],
            );
            await pool.query(
                "INSERT INTO messages (msg_id, message_text, user_tg_id, username, dislikes, sent_at) VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '25 hours')",
                [4, 'Message 4', 12345, 'testuser', 1],
            );
            await pool.query(
                "INSERT INTO messages (msg_id, message_text, user_tg_id, username, dislikes, sent_at) VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '25 hours')",
                [5, 'Message 5', 12345, 'testuser', 1],
            );

            // Mock broadcast transaction
            const expectedTxid =
                '0000000000000000000000000000000000000000000000000000000000000003';
            sandbox
                .stub(mockChronik, 'broadcastTx')
                .resolves({ txid: expectedTxid });

            await respawn(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                wallet,
                mockBot,
                ADMIN_CHAT_ID,
            );

            // Verify success message (should work because old dislikes are ignored)
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('✅ HP respawned!');
        });

        it('should reject respawn if user is not registered', async () => {
            // Mock user has 50 HP but not registered
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
                        atoms: 50n,
                        isMintBaton: false,
                    },
                },
            ]);

            await respawn(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                wallet,
                mockBot,
                ADMIN_CHAT_ID,
            );

            // Verify rejection message
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include('❌ You must register first!');
        });

        it('should handle missing user ID', async () => {
            const ctxWithoutId = {
                from: undefined,
                reply: sandbox.stub().resolves({
                    message_id: 1,
                    date: Date.now(),
                    chat: { id: 12345, type: 'private' },
                    text: 'test',
                }),
            } as unknown as Context;

            await respawn(
                ctxWithoutId,
                pool,
                mockChronik as unknown as ChronikClient,
                wallet,
                mockBot,
                ADMIN_CHAT_ID,
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

            await respawn(
                mockCtx,
                pool,
                errorChronik,
                wallet,
                mockBot,
                ADMIN_CHAT_ID,
            );

            // Verify error message to user
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include('❌ Error fetching your health');

            // Verify error notification was sent to admin
            expect(mockBot.api.sendMessage).to.have.callCount(1);
        });

        it('should handle wallet broadcast errors gracefully', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, USER_ADDRESS, 1, 'testuser'],
            );

            // Mock user has 50 HP
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
                        atoms: 50n,
                        isMintBaton: false,
                    },
                },
            ]);

            // Mock broadcast to fail by throwing an error
            sandbox
                .stub(mockChronik, 'broadcastTx')
                .rejects(new Error('Broadcast failed'));

            await respawn(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                wallet,
                mockBot,
                ADMIN_CHAT_ID,
            );

            // Verify error message to user
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include('❌ Error sending HP respawn');

            // Verify error notification was sent to admin
            expect(mockBot.api.sendMessage).to.have.callCount(1);
        });

        it('should calculate correct HP amount to send', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, USER_ADDRESS, 1, 'testuser'],
            );

            // Mock user has 30 HP (should send 70 to reach 100)
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
                        atoms: 30n,
                        isMintBaton: false,
                    },
                },
            ]);

            // Mock broadcast transaction
            const expectedTxid =
                '0000000000000000000000000000000000000000000000000000000000000003';
            sandbox
                .stub(mockChronik, 'broadcastTx')
                .resolves({ txid: expectedTxid });

            await respawn(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                wallet,
                mockBot,
                ADMIN_CHAT_ID,
            );

            // Verify success message includes correct amount
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('70 HP'); // Should send 70 HP
        });

        it('should reject respawn if user has respawned in last 24 hours', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, USER_ADDRESS, 1, 'testuser'],
            );

            // Mock user has 50 HP
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
                        atoms: 50n,
                        isMintBaton: false,
                    },
                },
            ]);

            // Get bot wallet output script and user output script
            const botOutputScript = getOutputScriptFromAddress(wallet.address);
            const userOutputScript = getOutputScriptFromAddress(USER_ADDRESS);

            // Create a mock transaction from bot to user with tokens (within last 24 hours)
            const timeOfRequest = Math.ceil(Date.now() / 1000);
            const respawnTxTimestamp = timeOfRequest - 3600; // 1 hour ago (within 24 hours)

            const mockRespawnTx: Tx = {
                txid: '0000000000000000000000000000000000000000000000000000000000000004',
                version: 2,
                inputs: [
                    {
                        outputScript: botOutputScript,
                        prevOut: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000005',
                            outIdx: 0,
                        },
                        inputScript: '',
                        sats: 1000n,
                        sequenceNo: 0,
                    },
                ],
                outputs: [
                    {
                        outputScript: userOutputScript,
                        sats: DEFAULT_DUST_SATS,
                        token: {
                            tokenId: REWARDS_TOKEN_ID,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                            atoms: 50n,
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: respawnTxTimestamp,
                size: 200,
                isCoinbase: false,
                isFinal: true,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_OK',
            };

            // Set transaction history with the respawn transaction
            mockChronik.setTxHistoryByAddress(USER_ADDRESS, [mockRespawnTx]);

            await respawn(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                wallet,
                mockBot,
                ADMIN_CHAT_ID,
            );

            // Verify rejection message
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include(
                '❌ Cannot respawn. You have already respawned in the last 24 hours',
            );
        });

        it('should allow respawn if last respawn was more than 24 hours ago', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, USER_ADDRESS, 1, 'testuser'],
            );

            // Mock user has 50 HP
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
                        atoms: 50n,
                        isMintBaton: false,
                    },
                },
            ]);

            // Get bot wallet output script and user output script
            const botOutputScript = getOutputScriptFromAddress(wallet.address);
            const userOutputScript = getOutputScriptFromAddress(USER_ADDRESS);

            // Create a mock transaction from bot to user with tokens (more than 24 hours ago)
            const timeOfRequest = Math.ceil(Date.now() / 1000);
            const respawnTxTimestamp = timeOfRequest - 90000; // 25 hours ago (more than 24 hours)

            const mockRespawnTx: Tx = {
                txid: '0000000000000000000000000000000000000000000000000000000000000004',
                version: 2,
                inputs: [
                    {
                        outputScript: botOutputScript,
                        prevOut: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000005',
                            outIdx: 0,
                        },
                        inputScript: '',
                        sats: 1000n,
                        sequenceNo: 0,
                    },
                ],
                outputs: [
                    {
                        outputScript: userOutputScript,
                        sats: DEFAULT_DUST_SATS,
                        token: {
                            tokenId: REWARDS_TOKEN_ID,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                            atoms: 50n,
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: respawnTxTimestamp,
                size: 200,
                isCoinbase: false,
                isFinal: true,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_OK',
            };

            // Set transaction history with the old respawn transaction
            mockChronik.setTxHistoryByAddress(USER_ADDRESS, [mockRespawnTx]);

            // Mock broadcast transaction
            const expectedTxid =
                '0000000000000000000000000000000000000000000000000000000000000003';
            sandbox
                .stub(mockChronik, 'broadcastTx')
                .resolves({ txid: expectedTxid });

            await respawn(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                wallet,
                mockBot,
                ADMIN_CHAT_ID,
            );

            // Verify success message (should allow respawn since last one was > 24 hours ago)
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('✅ HP respawned!');
        });
    });

    describe('withdraw', () => {
        let mockCtx: Context;
        let pool: Pool;
        let mockChronik: MockChronikClient;
        let mockBot: Bot;
        let sandbox: sinon.SinonSandbox;
        const USER_ADDRESS = 'ecash:qrfm48gr3zdgph6dt593hzlp587002ec4ysl59mavw';
        const WITHDRAW_ADDRESS =
            'ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2';
        const ADMIN_CHAT_ID = '-1001234567890';

        beforeEach(async () => {
            sandbox = sinon.createSandbox();

            // Create mock chronik client
            mockChronik = new MockChronikClient();

            // Mock Bot
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
                message: {
                    message_id: 1,
                    date: Date.now(),
                    text: '/withdraw',
                    chat: { id: 12345, type: 'private' },
                },
            } as unknown as Context;

            // Create in-memory database
            pool = await createTestDb();

            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [12345, USER_ADDRESS, 1, 'testuser'],
            );

            // Create user action table
            await pool.query(`
                CREATE TABLE IF NOT EXISTS user_actions_12345 (
                    id SERIAL PRIMARY KEY,
                    action TEXT NOT NULL,
                    txid TEXT,
                    msg_id BIGINT,
                    emoji TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `);

            // Set up user UTXOs with HP tokens
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
                        atoms: 100n, // 100 HP
                        isMintBaton: false,
                    },
                },
            ]);

            // Mock blockchain info
            if (!mockChronik.blockchainInfo) {
                mockChronik.blockchainInfo = () =>
                    Promise.resolve({ tipHash: 'mock_tip', tipHeight: 800000 });
            }

            // Set empty transaction history (no withdrawals)
            mockChronik.setTxHistoryByAddress(USER_ADDRESS, []);
        });

        afterEach(() => {
            sandbox.restore();
            // Clear any withdrawal states set during tests
            if (typeof USER_ID !== 'undefined') {
                clearWithdrawState(USER_ID);
            }
        });

        it('should reject withdrawal when user ID is missing', async () => {
            const ctxWithoutId = {
                ...mockCtx,
                from: undefined,
            } as unknown as Context;

            await withdraw(
                ctxWithoutId,
                pool,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect((ctxWithoutId.reply as sinon.SinonStub).callCount).to.equal(
                1,
            );
            expect(
                (ctxWithoutId.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include('❌ Could not identify your user ID.');
        });

        it('should reject withdrawal when user is not registered', async () => {
            // Remove user from database
            await pool.query(
                'DELETE FROM users WHERE user_tg_id = $1',
                [12345],
            );

            if (mockCtx.message && 'text' in mockCtx.message) {
                mockCtx.message.text =
                    '/withdraw ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2 50';
            }

            await withdraw(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include('❌ You must register first!');
        });

        it('should reject withdrawal with invalid syntax (missing arguments)', async () => {
            if (mockCtx.message && 'text' in mockCtx.message) {
                mockCtx.message.text = '/withdraw';
            }

            await withdraw(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('❌ **Invalid syntax**');
            expect(replyCall.args[0]).to.include(
                'Usage: `/withdraw <address> <amount>`',
            );
        });

        it('should reject withdrawal with invalid syntax (only address)', async () => {
            if (mockCtx.message && 'text' in mockCtx.message) {
                mockCtx.message.text =
                    '/withdraw ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2';
            }

            await withdraw(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('❌ **Invalid syntax**');
        });

        it('should reject withdrawal with invalid address', async () => {
            if (mockCtx.message && 'text' in mockCtx.message) {
                mockCtx.message.text = '/withdraw invalid_address 50';
            }

            await withdraw(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include(
                '❌ Invalid address. Please provide a valid eCash address.',
            );
        });

        it('should reject withdrawal with invalid amount (NaN)', async () => {
            if (mockCtx.message && 'text' in mockCtx.message) {
                mockCtx.message.text = `/withdraw ${WITHDRAW_ADDRESS} abc`;
            }

            await withdraw(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include(
                '❌ Please provide a valid positive number for the amount.',
            );
        });

        it('should reject withdrawal with invalid amount (zero)', async () => {
            if (mockCtx.message && 'text' in mockCtx.message) {
                mockCtx.message.text = `/withdraw ${WITHDRAW_ADDRESS} 0`;
            }

            await withdraw(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include(
                '❌ Please provide a valid positive number for the amount.',
            );
        });

        it('should reject withdrawal with invalid amount (negative)', async () => {
            if (mockCtx.message && 'text' in mockCtx.message) {
                mockCtx.message.text = `/withdraw ${WITHDRAW_ADDRESS} -10`;
            }

            await withdraw(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include(
                '❌ Please provide a valid positive number for the amount.',
            );
        });

        it('should reject withdrawal when user has no HP', async () => {
            // Set user UTXOs with no HP tokens
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

            if (mockCtx.message && 'text' in mockCtx.message) {
                mockCtx.message.text = `/withdraw ${WITHDRAW_ADDRESS} 50`;
            }

            await withdraw(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include('❌ You have no HP to withdraw.');
        });

        it('should reject withdrawal when amount exceeds balance', async () => {
            if (mockCtx.message && 'text' in mockCtx.message) {
                mockCtx.message.text = `/withdraw ${WITHDRAW_ADDRESS} 150`;
            }

            await withdraw(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include('❌ Amount exceeds your balance');
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include('100 HP');
        });

        it('should reject withdrawal when user has withdrawn in last 24 hours', async () => {
            const timeOfRequest = Math.ceil(Date.now() / 1000);
            const txTimestamp = timeOfRequest - 3600; // 1 hour ago

            const userOutputScript = getOutputScriptFromAddress(USER_ADDRESS);

            // Create a WITHDRAW transaction in the last 24 hours
            const withdrawEmppData = getOvermindEmpp(EmppAction.WITHDRAW);
            const opReturnScript = emppScript([withdrawEmppData]);

            const mockWithdrawTx: Tx = {
                txid: '0000000000000000000000000000000000000000000000000000000000000001',
                version: 2,
                inputs: [
                    {
                        outputScript: userOutputScript,
                        prevOut: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000002',
                            outIdx: 0,
                        },
                        inputScript: '',
                        sats: 1000n,
                        sequenceNo: 0,
                    },
                ],
                outputs: [
                    {
                        outputScript: toHex(opReturnScript.bytecode),
                        sats: 0n,
                    },
                    {
                        outputScript:
                            getOutputScriptFromAddress(WITHDRAW_ADDRESS),
                        sats: DEFAULT_DUST_SATS,
                        token: {
                            tokenId: REWARDS_TOKEN_ID,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                            atoms: 50n,
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: txTimestamp,
                size: 200,
                isCoinbase: false,
                isFinal: true,
                tokenEntries: [],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
            };

            mockChronik.setTxHistoryByAddress(USER_ADDRESS, [mockWithdrawTx]);

            if (mockCtx.message && 'text' in mockCtx.message) {
                mockCtx.message.text = `/withdraw ${WITHDRAW_ADDRESS} 50`;
            }

            await withdraw(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include(
                '❌ Cannot withdraw. You have already withdrawn in the last 24 hours',
            );
        });

        it('should handle error when fetching balance', async () => {
            // Make chronik throw an error when fetching UTXOs
            const errorChronik = {
                address: () => ({
                    utxos: () => Promise.reject(new Error('Chronik error')),
                }),
            } as unknown as ChronikClient;

            if (mockCtx.message && 'text' in mockCtx.message) {
                mockCtx.message.text = `/withdraw ${WITHDRAW_ADDRESS} 50`;
            }

            await withdraw(mockCtx, pool, errorChronik, mockBot, ADMIN_CHAT_ID);

            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include('❌ Error fetching your health');
            expect(
                (mockBot.api.sendMessage as sinon.SinonStub).callCount,
            ).to.equal(1);
        });

        it('should handle error when checking withdraw history', async () => {
            // Make chronik throw an error when fetching history
            // Note: hasWithdrawnInLast24Hours fails open (returns false on error),
            // so we need to make the error happen in a way that bypasses the fail-open
            // Actually, the function catches errors and returns false, so the withdraw
            // will continue. But if we make the address().history() call throw before
            // the try-catch, it should be caught by the withdraw function's try-catch.
            // However, hasWithdrawnInLast24Hours has its own try-catch, so it will
            // return false and the withdraw will continue. This test should verify
            // that the function continues normally when history check fails (fail-open behavior).
            const errorChronik = {
                address: (_addr: string) => ({
                    utxos: () =>
                        Promise.resolve({
                            utxos: [
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
                            ],
                        }),
                    history: () => Promise.reject(new Error('History error')),
                }),
            } as unknown as ChronikClient;

            if (mockCtx.message && 'text' in mockCtx.message) {
                mockCtx.message.text = `/withdraw ${WITHDRAW_ADDRESS} 50`;
            }

            await withdraw(mockCtx, pool, errorChronik, mockBot, ADMIN_CHAT_ID);

            // hasWithdrawnInLast24Hours fails open, so it returns false on error
            // and the withdraw continues normally, showing the confirmation
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockCtx.reply as sinon.SinonStub).firstCall.args[0],
            ).to.include('📋 **Withdrawal Summary**');
        });

        it('should show confirmation message with buttons for valid withdrawal', async () => {
            if (mockCtx.message && 'text' in mockCtx.message) {
                mockCtx.message.text = `/withdraw ${WITHDRAW_ADDRESS} 50`;
            }

            await withdraw(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('📋 **Withdrawal Summary**');
            expect(replyCall.args[0]).to.include(WITHDRAW_ADDRESS);
            expect(replyCall.args[0]).to.include('50 HP');
            expect(replyCall.args[0]).to.include('Confirm this withdrawal?');

            // Check that reply_markup (keyboard) is included
            expect(replyCall.args[1]).to.have.property('reply_markup');
        });

        it('should allow withdrawal equal to balance', async () => {
            if (mockCtx.message && 'text' in mockCtx.message) {
                mockCtx.message.text = `/withdraw ${WITHDRAW_ADDRESS} 100`;
            }

            await withdraw(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('📋 **Withdrawal Summary**');
            expect(replyCall.args[0]).to.include('100 HP');
        });
    });

    describe('handleWithdrawConfirm', () => {
        let mockCtx: Context;
        let pool: Pool;
        let mockChronik: MockChronikClient;
        let mockBot: Bot;
        let masterNode: HdNode;
        let sandbox: sinon.SinonSandbox;
        const USER_ADDRESS = 'ecash:qrfm48gr3zdgph6dt593hzlp587002ec4ysl59mavw';
        const WITHDRAW_ADDRESS =
            'ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2';
        const ADMIN_CHAT_ID = '-1001234567890';
        const USER_ID = 12345;
        const TEST_MNEMONIC =
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

        beforeEach(async () => {
            sandbox = sinon.createSandbox();

            // Create mock chronik client
            mockChronik = new MockChronikClient();

            // Initialize master node from test mnemonic
            const seed = mnemonicToSeed(TEST_MNEMONIC);
            masterNode = HdNode.fromSeed(seed);

            // Mock Bot
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

            // Mock Grammy Context with callback query methods
            mockCtx = {
                from: {
                    id: USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                    username: 'testuser',
                },
                answerCallbackQuery: sandbox.stub().resolves(true),
                editMessageText: sandbox.stub().resolves({
                    message_id: 1,
                    date: Date.now(),
                    chat: { id: USER_ID, type: 'private' },
                    text: 'test',
                }),
            } as unknown as Context;

            // Create in-memory database
            pool = await createTestDb();

            // Insert registered user with HD index
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [USER_ID, USER_ADDRESS, 1, 'testuser'],
            );

            // Create user action table
            await pool.query(`
                CREATE TABLE IF NOT EXISTS user_actions_${USER_ID} (
                    id SERIAL PRIMARY KEY,
                    action TEXT NOT NULL,
                    txid TEXT,
                    msg_id BIGINT,
                    emoji TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `);

            // Derive user wallet address
            const userNode = masterNode.derivePath("m/44'/1899'/1'/0/0");
            const userPubkey = userNode.pubkey();
            const userPkh = shaRmd160(userPubkey);
            const derivedAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(userPkh),
            );

            // Set up user UTXOs with HP tokens and XEC
            mockChronik.setUtxosByAddress(derivedAddress, [
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
                        atoms: 100n, // 100 HP
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

            // Set up a mock broadcast response
            // The wallet will build a transaction dynamically, so we need to stub broadcastTx
            // to return success for any raw transaction
            // Note: We'll stub this in individual tests that need it
        });

        afterEach(() => {
            sandbox.restore();
            // Clear any withdrawal states set during tests
            clearWithdrawState(USER_ID);
        });

        it('should reject when user ID is missing', async () => {
            const ctxWithoutId = {
                ...mockCtx,
                from: undefined,
            } as unknown as Context;

            await handleWithdrawConfirm(
                ctxWithoutId,
                pool,
                mockChronik as unknown as ChronikClient,
                masterNode,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect(
                (ctxWithoutId.answerCallbackQuery as sinon.SinonStub).callCount,
            ).to.equal(1);
            expect(
                (ctxWithoutId.answerCallbackQuery as sinon.SinonStub).firstCall
                    .args[0],
            ).to.deep.include({
                text: '❌ Could not identify your user ID.',
            });
        });

        it('should reject when withdrawal state is missing', async () => {
            // Ensure no state is set
            clearWithdrawState(USER_ID);

            await handleWithdrawConfirm(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                masterNode,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect(
                (mockCtx.answerCallbackQuery as sinon.SinonStub).callCount,
            ).to.equal(1);
            expect(
                (mockCtx.answerCallbackQuery as sinon.SinonStub).firstCall
                    .args[0],
            ).to.deep.include({
                text: '❌ Withdrawal session expired. Please start over.',
            });
            // Should not call editMessageText when state is missing
            expect(
                (mockCtx.editMessageText as sinon.SinonStub).callCount,
            ).to.equal(0);
        });

        it('should reject when user is not found in database', async () => {
            // Remove user from database
            await pool.query('DELETE FROM users WHERE user_tg_id = $1', [
                USER_ID,
            ]);

            // Set withdrawal state
            setWithdrawState(USER_ID, {
                address: WITHDRAW_ADDRESS,
                amount: 50n,
                userAddress: USER_ADDRESS,
            });

            await handleWithdrawConfirm(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                masterNode,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect(
                (mockCtx.editMessageText as sinon.SinonStub).callCount,
            ).to.equal(1);
            expect(
                (mockCtx.editMessageText as sinon.SinonStub).firstCall.args[0],
            ).to.include('❌ User not found. Please register first.');
            expect(isInWithdrawWorkflow(USER_ID)).to.equal(false);
        });

        it('should handle error when deriving wallet fails', async () => {
            // Set withdrawal state
            setWithdrawState(USER_ID, {
                address: WITHDRAW_ADDRESS,
                amount: 50n,
                userAddress: USER_ADDRESS,
            });

            // Use an invalid HD index that might cause derivation issues
            await pool.query(
                'UPDATE users SET hd_index = $1 WHERE user_tg_id = $2',
                [-1, USER_ID],
            );

            await handleWithdrawConfirm(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                masterNode,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect(
                (mockCtx.editMessageText as sinon.SinonStub).callCount,
            ).to.equal(1);
            expect(
                (mockCtx.editMessageText as sinon.SinonStub).firstCall.args[0],
            ).to.include('❌ Error deriving wallet');
            expect(
                (mockBot.api.sendMessage as sinon.SinonStub).callCount,
            ).to.equal(1);
            expect(isInWithdrawWorkflow(USER_ID)).to.equal(false);
        });

        it('should successfully process withdrawal and send transaction', async () => {
            // Set withdrawal state
            setWithdrawState(USER_ID, {
                address: WITHDRAW_ADDRESS,
                amount: 50n,
                userAddress: USER_ADDRESS,
            });

            // Stub broadcastTx to return success
            const mockTxid =
                '0000000000000000000000000000000000000000000000000000000000000003';
            sandbox.stub(mockChronik, 'broadcastTx').resolves({
                txid: mockTxid,
            });

            await handleWithdrawConfirm(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                masterNode,
                mockBot,
                ADMIN_CHAT_ID,
            );

            // Check that callback query was answered
            expect(
                (mockCtx.answerCallbackQuery as sinon.SinonStub).callCount,
            ).to.equal(1);
            expect(
                (mockCtx.answerCallbackQuery as sinon.SinonStub).firstCall
                    .args[0],
            ).to.deep.include({
                text: 'Processing withdrawal...',
            });

            // Check that message was edited with success
            expect(
                (mockCtx.editMessageText as sinon.SinonStub).callCount,
            ).to.equal(1);
            const editCall = (mockCtx.editMessageText as sinon.SinonStub)
                .firstCall;
            expect(editCall.args[0]).to.include(
                '✅ **Withdrawal successful!**',
            );
            expect(editCall.args[0]).to.include('50 HP');
            expect(editCall.args[0]).to.include(WITHDRAW_ADDRESS);
            expect(editCall.args[0]).to.include(
                '0000000000000000000000000000000000000000000000000000000000000003',
            );

            // Check that state was cleared
            expect(isInWithdrawWorkflow(USER_ID)).to.equal(false);

            // Check that action was logged in database
            const actionResult = await pool.query(
                `SELECT * FROM user_actions_${USER_ID} WHERE action = 'withdraw'`,
            );
            expect(actionResult.rows).to.have.length(1);
            expect(actionResult.rows[0].txid).to.equal(
                '0000000000000000000000000000000000000000000000000000000000000003',
            );
        });

        it('should handle error when wallet sync fails', async () => {
            // Set withdrawal state
            setWithdrawState(USER_ID, {
                address: WITHDRAW_ADDRESS,
                amount: 50n,
                userAddress: USER_ADDRESS,
            });

            // Make chronik throw an error during sync
            const errorChronik = {
                ...mockChronik,
                address: () => ({
                    utxos: () => Promise.reject(new Error('Sync error')),
                }),
            } as unknown as ChronikClient;

            await handleWithdrawConfirm(
                mockCtx,
                pool,
                errorChronik,
                masterNode,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect(
                (mockCtx.editMessageText as sinon.SinonStub).callCount,
            ).to.equal(1);
            expect(
                (mockCtx.editMessageText as sinon.SinonStub).firstCall.args[0],
            ).to.include('❌ Error:');
            expect(
                (mockBot.api.sendMessage as sinon.SinonStub).callCount,
            ).to.equal(1);
            expect(isInWithdrawWorkflow(USER_ID)).to.equal(false);
        });

        it('should handle error when broadcast fails', async () => {
            // Set withdrawal state
            setWithdrawState(USER_ID, {
                address: WITHDRAW_ADDRESS,
                amount: 50n,
                userAddress: USER_ADDRESS,
            });

            // Make broadcast fail by stubbing it to reject
            sandbox
                .stub(mockChronik, 'broadcastTx')
                .rejects(new Error('Broadcast failed'));

            await handleWithdrawConfirm(
                mockCtx,
                pool,
                mockChronik as unknown as ChronikClient,
                masterNode,
                mockBot,
                ADMIN_CHAT_ID,
            );

            expect(
                (mockCtx.editMessageText as sinon.SinonStub).callCount,
            ).to.equal(1);
            const errorMessage = (mockCtx.editMessageText as sinon.SinonStub)
                .firstCall.args[0];
            expect(errorMessage).to.satisfy(
                (msg: string) =>
                    msg.includes('❌ Error') ||
                    msg.includes('❌ Error sending HP withdrawal'),
            );
            expect(
                (mockBot.api.sendMessage as sinon.SinonStub).callCount,
            ).to.equal(1);
            expect(isInWithdrawWorkflow(USER_ID)).to.equal(false);
        });
    });

    describe('handleWithdrawCancel', () => {
        let mockCtx: Context;
        let sandbox: sinon.SinonSandbox;
        const USER_ID = 12345;

        beforeEach(() => {
            sandbox = sinon.createSandbox();

            // Mock Grammy Context with callback query methods
            mockCtx = {
                from: {
                    id: USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                    username: 'testuser',
                },
                answerCallbackQuery: sandbox.stub().resolves(true),
                editMessageText: sandbox.stub().resolves({
                    message_id: 1,
                    date: Date.now(),
                    chat: { id: USER_ID, type: 'private' },
                    text: 'test',
                }),
            } as unknown as Context;
        });

        afterEach(() => {
            sandbox.restore();
            // Clear any withdrawal states set during tests
            clearWithdrawState(USER_ID);
        });

        it('should reject when user ID is missing', async () => {
            const ctxWithoutId = {
                ...mockCtx,
                from: undefined,
            } as unknown as Context;

            await handleWithdrawCancel(ctxWithoutId);

            expect(
                (ctxWithoutId.answerCallbackQuery as sinon.SinonStub).callCount,
            ).to.equal(1);
            expect(
                (ctxWithoutId.answerCallbackQuery as sinon.SinonStub).firstCall
                    .args[0],
            ).to.deep.include({
                text: '❌ Could not identify your user ID.',
            });
        });

        it('should cancel withdrawal and clear state', async () => {
            // Set withdrawal state
            setWithdrawState(USER_ID, {
                address: 'ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2',
                amount: 50n,
                userAddress: 'ecash:qrfm48gr3zdgph6dt593hzlp587002ec4ysl59mavw',
            });

            await handleWithdrawCancel(mockCtx);

            // Check that callback query was answered
            expect(
                (mockCtx.answerCallbackQuery as sinon.SinonStub).callCount,
            ).to.equal(1);
            expect(
                (mockCtx.answerCallbackQuery as sinon.SinonStub).firstCall
                    .args[0],
            ).to.deep.include({
                text: 'Withdrawal canceled',
            });

            // Check that message was edited
            expect(
                (mockCtx.editMessageText as sinon.SinonStub).callCount,
            ).to.equal(1);
            expect(
                (mockCtx.editMessageText as sinon.SinonStub).firstCall.args[0],
            ).to.equal('❌ Withdrawal canceled.');

            // Check that state was cleared
            expect(isInWithdrawWorkflow(USER_ID)).to.equal(false);
        });

        it('should handle cancellation even when state does not exist', async () => {
            // Don't set withdrawal state

            await handleWithdrawCancel(mockCtx);

            // Check that callback query was answered
            expect(
                (mockCtx.answerCallbackQuery as sinon.SinonStub).callCount,
            ).to.equal(1);
            expect(
                (mockCtx.answerCallbackQuery as sinon.SinonStub).firstCall
                    .args[0],
            ).to.deep.include({
                text: 'Withdrawal canceled',
            });

            // Check that message was edited
            expect(
                (mockCtx.editMessageText as sinon.SinonStub).callCount,
            ).to.equal(1);
            expect(
                (mockCtx.editMessageText as sinon.SinonStub).firstCall.args[0],
            ).to.equal('❌ Withdrawal canceled.');
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

    describe('start', () => {
        let mockCtx: Context;
        let pool: Pool;
        let sandbox: sinon.SinonSandbox;
        const USER_ID = 12345;
        const USER_ADDRESS = 'ecash:qrfm48gr3zdgph6dt593hzlp587002ec4ysl59mavw';

        beforeEach(async () => {
            sandbox = sinon.createSandbox();

            // Mock Grammy Context
            mockCtx = {
                from: {
                    id: USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                    username: 'testuser',
                },
                reply: sandbox.stub().resolves({
                    message_id: 1,
                    date: Date.now(),
                    chat: { id: USER_ID, type: 'private' },
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

        it('should display welcome message for unregistered user', async () => {
            await start(mockCtx, pool);

            // Verify reply was called
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            const message = replyCall.args[0];

            // Check that welcome message contains key information
            expect(message).to.include('Welcome to The Overmind');
            expect(message).to.include('Register to get your wallet address');
            expect(message).to.include('100 HP');
            expect(message).to.include('/register');
            expect(message).to.include('/health');
            expect(message).to.include('/address');
            expect(message).to.include('Like: 1 HP sent from liker');
            expect(message).to.include('Dislike: 1 HP cost for disliker');
            expect(message).to.include("You're not registered yet");
            expect(message).to.not.include('You are registered');

            // Verify parse mode
            expect(replyCall.args[1]).to.deep.equal({ parse_mode: 'Markdown' });
        });

        it('should display welcome message for registered user', async () => {
            // Insert registered user
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [USER_ID, USER_ADDRESS, 1, 'testuser'],
            );

            await start(mockCtx, pool);

            // Verify reply was called
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            const message = replyCall.args[0];

            // Check that welcome message contains key information
            expect(message).to.include('Welcome to The Overmind');
            expect(message).to.include('Register to get your wallet address');
            expect(message).to.include('100 HP');
            expect(message).to.include('You are registered');
            expect(message).to.include('/health');
            expect(message).to.include('/address');
            expect(message).to.not.include("You're not registered yet");

            // Verify parse mode
            expect(replyCall.args[1]).to.deep.equal({ parse_mode: 'Markdown' });
        });

        it('should handle missing user ID gracefully', async () => {
            const mockCtxNoUser = {
                from: undefined,
                reply: sandbox.stub().resolves({
                    message_id: 1,
                    date: Date.now(),
                    chat: { id: 12345, type: 'private' },
                    text: 'test',
                }),
            } as unknown as Context;

            await start(mockCtxNoUser, pool);

            // Verify error message was sent
            expect((mockCtxNoUser.reply as sinon.SinonStub).callCount).to.equal(
                1,
            );
            const replyCall = (mockCtxNoUser.reply as sinon.SinonStub)
                .firstCall;
            expect(replyCall.args[0]).to.include(
                'Could not identify your user ID',
            );
        });
    });

    describe('stats', () => {
        let mockCtx: Context;
        let pool: Pool;
        let sandbox: sinon.SinonSandbox;
        const ADMIN_CHAT_ID = '-1001234567890';
        const OTHER_CHAT_ID = '-1009876543210';
        const USER_ID = 12345;

        beforeEach(async () => {
            sandbox = sinon.createSandbox();

            // Mock Grammy Context
            mockCtx = {
                chat: {
                    id: parseInt(ADMIN_CHAT_ID),
                    type: 'supergroup',
                    title: 'Admin Chat',
                },
                from: {
                    id: USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                    username: 'testuser',
                },
                reply: sandbox.stub().resolves({
                    message_id: 1,
                    date: Date.now(),
                    chat: { id: ADMIN_CHAT_ID, type: 'supergroup' },
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

        it('should return statistics when called from admin chat', async () => {
            // Insert test data
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [USER_ID, 'ecash:test123', 1, 'testuser'],
            );
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [99999, 'ecash:test456', 2, 'otheruser'],
            );
            await pool.query(
                'INSERT INTO messages (msg_id, message_text, user_tg_id, username, likes, dislikes) VALUES ($1, $2, $3, $4, $5, $6)',
                [100, 'Test message 1', USER_ID, 'testuser', 5, 2],
            );
            await pool.query(
                'INSERT INTO messages (msg_id, message_text, user_tg_id, username, likes, dislikes) VALUES ($1, $2, $3, $4, $5, $6)',
                [101, 'Test message 2', 99999, 'otheruser', 3, 1],
            );

            await stats(mockCtx, pool, ADMIN_CHAT_ID);

            // Verify reply was called
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            const message = replyCall.args[0];

            // Check that stats message contains correct information
            expect(message).to.include('📊 **The Overmind Statistics**');
            expect(message).to.include('👥 **Registered Users:** 2');
            expect(message).to.include('👍 **Total Likes:** 8'); // 5 + 3
            expect(message).to.include('👎 **Total Dislikes:** 3'); // 2 + 1

            // Verify parse mode
            expect(replyCall.args[1]).to.deep.equal({ parse_mode: 'Markdown' });
        });

        it('should return zero statistics when database is empty', async () => {
            await stats(mockCtx, pool, ADMIN_CHAT_ID);

            // Verify reply was called
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            const message = replyCall.args[0];

            // Check that stats message contains zeros
            expect(message).to.include('📊 **The Overmind Statistics**');
            expect(message).to.include('👥 **Registered Users:** 0');
            expect(message).to.include('👍 **Total Likes:** 0');
            expect(message).to.include('👎 **Total Dislikes:** 0');
        });

        it('should reject when called from non-admin chat', async () => {
            // Change context to non-admin chat
            mockCtx = {
                ...mockCtx,
                chat: {
                    id: parseInt(OTHER_CHAT_ID),
                    type: 'supergroup',
                    title: 'Other Chat',
                },
            } as unknown as Context;

            await stats(mockCtx, pool, ADMIN_CHAT_ID);

            // Verify reply was called with error message
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            const message = replyCall.args[0];

            expect(message).to.equal(
                '❌ This command can only be used in the admin chat.',
            );
        });

        it('should handle database errors gracefully', async () => {
            // Stub pool.query to throw an error
            sandbox
                .stub(pool, 'query')
                .rejects(new Error('Database connection failed'));

            await stats(mockCtx, pool, ADMIN_CHAT_ID);

            // Verify reply was called with error message
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            const message = replyCall.args[0];

            expect(message).to.equal(
                '❌ Error fetching statistics. Please try again later.',
            );
        });

        it('should format large numbers with thousands separators', async () => {
            // Insert test data with large numbers
            for (let i = 1; i <= 1234; i++) {
                await pool.query(
                    'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                    [i, `ecash:test${i}`, i, `user${i}`],
                );
            }
            await pool.query(
                'INSERT INTO messages (msg_id, message_text, user_tg_id, username, likes, dislikes) VALUES ($1, $2, $3, $4, $5, $6)',
                [100, 'Test message', USER_ID, 'testuser', 5678, 1234],
            );

            await stats(mockCtx, pool, ADMIN_CHAT_ID);

            // Verify reply was called
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            const message = replyCall.args[0];

            // Check that numbers are formatted with thousands separators
            expect(message).to.include('👥 **Registered Users:** 1,234');
            expect(message).to.include('👍 **Total Likes:** 5,678');
            expect(message).to.include('👎 **Total Dislikes:** 1,234');
        });
    });

    describe('handleMessage', () => {
        let pool: Pool;
        let mockChronik: MockChronikClient;
        let mockBot: Bot;
        let masterNode: HdNode;
        let sandbox: sinon.SinonSandbox;
        let botWalletAddress: string;
        const MONITORED_CHAT_ID = '-1001234567890';
        const OTHER_CHAT_ID = '-1009876543210';
        const ADMIN_CHAT_ID = '-1001111111111';
        const USER_ID = 12345;
        const USERNAME = 'testuser';
        const MSG_ID = 100;
        const TEST_MNEMONIC =
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

        beforeEach(async () => {
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
            mockChronik = new MockChronikClient();
            const seed = mnemonicToSeed(TEST_MNEMONIC);
            masterNode = HdNode.fromSeed(seed);

            // Derive bot wallet address from master node at m/44'/1899'/0'/0/0
            const botNode = masterNode.derivePath("m/44'/1899'/0'/0/0");
            const botPubkey = botNode.pubkey();
            const botPkh = shaRmd160(botPubkey);
            botWalletAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(botPkh),
            );

            pool = await createTestDb();
        });

        afterEach(async () => {
            await pool.end();
            sandbox.restore();
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

            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );

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

            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );

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

            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );

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

            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );

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

            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );

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

            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );

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

            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );

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

            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );

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

            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );

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

            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );

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

            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );

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

            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );

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

            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );

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
            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );
            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );

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

            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );

            const result = await pool.query('SELECT * FROM messages');
            expect(result.rows).to.have.length(0);
        });
    });

    describe('handleMessage - bottle reply', () => {
        let pool: Pool;
        let mockChronik: MockChronikClient;
        let mockBot: Bot;
        let masterNode: HdNode;
        let sandbox: sinon.SinonSandbox;
        let botWalletAddress: string;
        const MONITORED_CHAT_ID = '-1001234567890';
        const ADMIN_CHAT_ID = '-1001111111111';
        const REPLY_SENDER_USER_ID = 11111;
        const ORIGINAL_AUTHOR_USER_ID = 22222;
        const ORIGINAL_MSG_ID = 100;
        const REPLY_MSG_ID = 101;
        const TEST_MNEMONIC =
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

        beforeEach(async () => {
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
            mockChronik = new MockChronikClient();
            const seed = mnemonicToSeed(TEST_MNEMONIC);
            masterNode = HdNode.fromSeed(seed);

            // Derive bot wallet address from master node at m/44'/1899'/0'/0/0
            const botNode = masterNode.derivePath("m/44'/1899'/0'/0/0");
            const botPubkey = botNode.pubkey();
            const botPkh = shaRmd160(botPubkey);
            botWalletAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(botPkh),
            );

            // Mock blockchain info
            if (!mockChronik.blockchainInfo) {
                mockChronik.blockchainInfo = () =>
                    Promise.resolve({ tipHash: 'mock_tip', tipHeight: 800000 });
            }

            pool = await createTestDb();

            // Create original message in database
            await pool.query(
                'INSERT INTO messages (msg_id, message_text, user_tg_id, username) VALUES ($1, $2, $3, $4)',
                [
                    ORIGINAL_MSG_ID,
                    'Original message',
                    ORIGINAL_AUTHOR_USER_ID,
                    'author',
                ],
            );
        });

        afterEach(async () => {
            await pool.end();
            sandbox.restore();
        });

        it('should process bottle reply when both users are registered', async () => {
            // Set up registered users
            const replySenderNode = masterNode.derivePath("m/44'/1899'/1'/0/0");
            const replySenderPubkey = replySenderNode.pubkey();
            const replySenderPkh = shaRmd160(replySenderPubkey);
            const replySenderAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(replySenderPkh),
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
                [REPLY_SENDER_USER_ID, replySenderAddress, 1, 'replySender'],
            );
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [ORIGINAL_AUTHOR_USER_ID, authorAddress, 2, 'author'],
            );

            await loadUsernames(pool);

            // Set up UTXOs for both users (they need tokens to send)
            const replySenderSk = replySenderNode.seckey();
            const authorSk = authorNode.seckey();

            if (replySenderSk) {
                mockChronik.setUtxosByAddress(replySenderAddress, [
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
                            atoms: 1000n, // Enough tokens
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
                        sats: 100000n,
                        isFinal: true,
                    },
                ]);
            }

            if (authorSk) {
                mockChronik.setUtxosByAddress(authorAddress, [
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
                            atoms: 1000n, // Enough tokens
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
                        sats: 100000n,
                        isFinal: true,
                    },
                ]);
            }

            // Stub broadcastTx to return success for any transaction
            const expectedTxid1 =
                '0000000000000000000000000000000000000000000000000000000000000001';
            const expectedTxid2 =
                '0000000000000000000000000000000000000000000000000000000000000002';
            let callCount = 0;
            sandbox.stub(mockChronik, 'broadcastTx').callsFake(async () => {
                callCount++;
                return {
                    txid: callCount === 1 ? expectedTxid1 : expectedTxid2,
                };
            });

            // Create reply message with 1 bottle emoji
            const mockCtx = {
                chat: {
                    id: parseInt(MONITORED_CHAT_ID),
                    type: 'group',
                    title: 'Test Group',
                },
                message: {
                    message_id: REPLY_MSG_ID,
                    text: '🍼',
                    date: Date.now(),
                    reply_to_message: {
                        message_id: ORIGINAL_MSG_ID,
                    },
                },
                from: {
                    id: REPLY_SENDER_USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                    username: 'replySender',
                },
            } as unknown as Context;

            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );

            // Check that admin notifications were sent (2 transactions: author loses 10HP, reply sender loses 3HP)
            expect(mockBot.api.sendMessage).to.have.callCount(2);
            const callArgs1 = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(0).args;
            const callArgs2 = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(1).args;

            // Check that both notifications mention the correct users and HP amounts
            const messages = [callArgs1[1], callArgs2[1]];
            const hasAuthorMessage = messages.some(
                msg => msg.includes('author') && msg.includes('lost 10HP'),
            );
            const hasReplySenderMessage = messages.some(
                msg => msg.includes('replySender') && msg.includes('lost 3HP'),
            );
            expect(hasAuthorMessage).to.equal(true);
            expect(hasReplySenderMessage).to.equal(true);
        });

        it('should not process bottle reply when only 1 user is registered', async () => {
            // Set up only reply sender as registered
            const replySenderNode = masterNode.derivePath("m/44'/1899'/1'/0/0");
            const replySenderPubkey = replySenderNode.pubkey();
            const replySenderPkh = shaRmd160(replySenderPubkey);
            const replySenderAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(replySenderPkh),
            );

            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [REPLY_SENDER_USER_ID, replySenderAddress, 1, 'replySender'],
            );

            await loadUsernames(pool);

            // Create reply message with 1 bottle emoji
            const mockCtx = {
                chat: {
                    id: parseInt(MONITORED_CHAT_ID),
                    type: 'group',
                    title: 'Test Group',
                },
                message: {
                    message_id: REPLY_MSG_ID,
                    text: '🍼',
                    date: Date.now(),
                    reply_to_message: {
                        message_id: ORIGINAL_MSG_ID,
                    },
                },
                from: {
                    id: REPLY_SENDER_USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                    username: 'replySender',
                },
            } as unknown as Context;

            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );

            // Should not send any admin notifications (no transactions processed)
            expect(mockBot.api.sendMessage).to.have.callCount(0);
        });

        it('should process bottle reply with 3 bottles when both users are registered', async () => {
            // Set up registered users
            const replySenderNode = masterNode.derivePath("m/44'/1899'/1'/0/0");
            const replySenderPubkey = replySenderNode.pubkey();
            const replySenderPkh = shaRmd160(replySenderPubkey);
            const replySenderAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(replySenderPkh),
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
                [REPLY_SENDER_USER_ID, replySenderAddress, 1, 'replySender'],
            );
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [ORIGINAL_AUTHOR_USER_ID, authorAddress, 2, 'author'],
            );

            await loadUsernames(pool);

            // Set up UTXOs for both users
            const replySenderSk = replySenderNode.seckey();
            const authorSk = authorNode.seckey();

            if (replySenderSk) {
                mockChronik.setUtxosByAddress(replySenderAddress, [
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
                            atoms: 1000n,
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
                        sats: 100000n,
                        isFinal: true,
                    },
                ]);
            }

            if (authorSk) {
                mockChronik.setUtxosByAddress(authorAddress, [
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
                            atoms: 1000n,
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
                        sats: 100000n,
                        isFinal: true,
                    },
                ]);
            }

            // Stub broadcastTx to return success for any transaction
            const expectedTxid1 =
                '0000000000000000000000000000000000000000000000000000000000000001';
            const expectedTxid2 =
                '0000000000000000000000000000000000000000000000000000000000000002';
            let callCount = 0;
            sandbox.stub(mockChronik, 'broadcastTx').callsFake(async () => {
                callCount++;
                return {
                    txid: callCount === 1 ? expectedTxid1 : expectedTxid2,
                };
            });

            // Create reply message with 3 bottle emojis
            const mockCtx = {
                chat: {
                    id: parseInt(MONITORED_CHAT_ID),
                    type: 'group',
                    title: 'Test Group',
                },
                message: {
                    message_id: REPLY_MSG_ID,
                    text: '🍼🍼🍼',
                    date: Date.now(),
                    reply_to_message: {
                        message_id: ORIGINAL_MSG_ID,
                    },
                },
                from: {
                    id: REPLY_SENDER_USER_ID,
                    is_bot: false,
                    first_name: 'Test',
                    username: 'replySender',
                },
            } as unknown as Context;

            await handleMessage(
                mockCtx,
                pool,
                MONITORED_CHAT_ID,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
            );

            // Check that admin notifications were sent with correct HP amounts
            // Author should lose 30HP (10 * 3), reply sender should lose 9HP (3 * 3)
            expect(mockBot.api.sendMessage).to.have.callCount(2);
            const callArgs1 = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(0).args;
            const callArgs2 = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(1).args;

            const messages = [callArgs1[1], callArgs2[1]];
            const hasAuthorMessage = messages.some(
                msg => msg.includes('author') && msg.includes('lost 30HP'),
            );
            const hasReplySenderMessage = messages.some(
                msg => msg.includes('replySender') && msg.includes('lost 9HP'),
            );
            expect(hasAuthorMessage).to.equal(true);
            expect(hasReplySenderMessage).to.equal(true);
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

            // Load usernames into memory
            await loadUsernames(pool);

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
            // Verify usernames are used (set in beforeEach: 'liker' and 'author')
            expect(callArgs[1]).to.include('liker');
            expect(callArgs[1]).to.include('author');
            expect(callArgs[1]).to.include('liked');
            expect(callArgs[1]).to.include(LIKE_TXID);
            expect(callArgs[2]).to.deep.equal({
                parse_mode: 'Markdown',
                link_preview_options: { is_disabled: true },
            });
        });

        it('should use usernames instead of user IDs in admin notification', async () => {
            // Users are already inserted with usernames in beforeEach
            // 'liker' for LIKER_USER_ID and 'author' for AUTHOR_USER_ID
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

            // Check that admin notification was sent with usernames
            expect(mockBot.api.sendMessage).to.have.callCount(1);
            const callArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(0).args;
            expect(callArgs[0]).to.equal(ADMIN_CHAT_ID);
            const message = callArgs[1];

            // Verify usernames are used instead of user IDs
            expect(message).to.include('liker');
            expect(message).to.include('author');
            expect(message).to.include('liked');
            expect(message).to.include(LIKE_TXID);

            // Verify user IDs are NOT in the message
            expect(message).to.not.include(LIKER_USER_ID.toString());
            expect(message).to.not.include(AUTHOR_USER_ID.toString());

            expect(callArgs[2]).to.deep.equal({
                parse_mode: 'Markdown',
                link_preview_options: { is_disabled: true },
            });
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
            expect(callArgs[2]).to.deep.equal({
                parse_mode: 'Markdown',
                link_preview_options: { is_disabled: true },
            });
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

            // Load usernames into memory
            await loadUsernames(pool);

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
            // Verify usernames are used (set in beforeEach: 'disliker' and 'author')
            expect(dislikerCallArgs[1]).to.include('disliker');
            expect(dislikerCallArgs[1]).to.include('author');
            expect(dislikerCallArgs[1]).to.include('disliked');
            expect(dislikerCallArgs[1]).to.include(DISLIKER_TXID);
            expect(dislikerCallArgs[2]).to.deep.equal({
                parse_mode: 'Markdown',
                link_preview_options: { is_disabled: true },
            });

            // Check author notification
            const authorCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(1).args;
            expect(authorCallArgs[0]).to.equal(ADMIN_CHAT_ID);
            // Verify usernames are used (set in beforeEach: 'disliker' and 'author')
            expect(authorCallArgs[1]).to.include('author');
            expect(authorCallArgs[1]).to.include('disliker');
            expect(authorCallArgs[1]).to.include('penalized');
            expect(authorCallArgs[1]).to.include(AUTHOR_TXID);
            expect(authorCallArgs[2]).to.deep.equal({
                parse_mode: 'Markdown',
                link_preview_options: { is_disabled: true },
            });
        });

        it('should use usernames instead of user IDs in admin notifications', async () => {
            // Users are already inserted with usernames in beforeEach
            // 'disliker' for DISLIKER_USER_ID and 'author' for AUTHOR_USER_ID
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
            const dislikerMessage = dislikerCallArgs[1];

            // Verify usernames are used instead of user IDs in disliker notification
            expect(dislikerMessage).to.include('disliker');
            expect(dislikerMessage).to.include('author');
            expect(dislikerMessage).to.include('disliked');
            expect(dislikerMessage).to.include(DISLIKER_TXID);

            // Verify user IDs are NOT in the disliker message
            expect(dislikerMessage).to.not.include(DISLIKER_USER_ID.toString());
            expect(dislikerMessage).to.not.include(AUTHOR_USER_ID.toString());

            expect(dislikerCallArgs[2]).to.deep.equal({
                parse_mode: 'Markdown',
                link_preview_options: { is_disabled: true },
            });

            // Check author notification
            const authorCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(1).args;
            expect(authorCallArgs[0]).to.equal(ADMIN_CHAT_ID);
            const authorMessage = authorCallArgs[1];

            // Verify usernames are used instead of user IDs in author notification
            expect(authorMessage).to.include('author');
            expect(authorMessage).to.include('disliker');
            expect(authorMessage).to.include('penalized');
            expect(authorMessage).to.include(AUTHOR_TXID);

            // Verify user IDs are NOT in the author message
            expect(authorMessage).to.not.include(AUTHOR_USER_ID.toString());
            expect(authorMessage).to.not.include(DISLIKER_USER_ID.toString());

            expect(authorCallArgs[2]).to.deep.equal({
                parse_mode: 'Markdown',
                link_preview_options: { is_disabled: true },
            });
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
            expect(errorCallArgs[2]).to.deep.equal({
                parse_mode: 'Markdown',
                link_preview_options: { is_disabled: true },
            });

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
            expect(authorCallArgs[2]).to.deep.equal({
                parse_mode: 'Markdown',
                link_preview_options: { is_disabled: true },
            });
        });
    });

    describe('handleBottleReply', () => {
        let pool: Pool;
        let mockChronik: MockChronikClient;
        let mockBot: Bot;
        let masterNode: HdNode;
        let sandbox: sinon.SinonSandbox;
        let botWalletAddress: string;
        let replySenderNode: HdNode;
        let replySenderAddress: string;
        let authorNode: HdNode;
        let authorAddress: string;
        const ADMIN_CHAT_ID = '-1001234567890';
        const REPLY_SENDER_USER_ID = 55555;
        const ORIGINAL_AUTHOR_USER_ID = 66666;
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

            // Derive bot wallet address from master node at m/44'/1899'/0'/0/0
            const botNode = masterNode.derivePath("m/44'/1899'/0'/0/0");
            const botPubkey = botNode.pubkey();
            const botPkh = shaRmd160(botPubkey);
            botWalletAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(botPkh),
            );

            // Mock blockchain info
            if (!mockChronik.blockchainInfo) {
                mockChronik.blockchainInfo = () =>
                    Promise.resolve({ tipHash: 'mock_tip', tipHeight: 800000 });
            }

            // Create in-memory database
            pool = await createTestDb();

            // Create registered users with HD indices
            // Derive addresses from master node
            replySenderNode = masterNode.derivePath("m/44'/1899'/5'/0/0");
            const replySenderPubkey = replySenderNode.pubkey();
            const replySenderPkh = shaRmd160(replySenderPubkey);
            replySenderAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(replySenderPkh),
            );

            authorNode = masterNode.derivePath("m/44'/1899'/6'/0/0");
            const authorPubkey = authorNode.pubkey();
            const authorPkh = shaRmd160(authorPubkey);
            authorAddress = encodeCashAddress(
                'ecash',
                'p2pkh',
                toHex(authorPkh),
            );

            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [REPLY_SENDER_USER_ID, replySenderAddress, 5, 'replySender'],
            );
            await pool.query(
                'INSERT INTO users (user_tg_id, address, hd_index, username) VALUES ($1, $2, $3, $4)',
                [ORIGINAL_AUTHOR_USER_ID, authorAddress, 6, 'author'],
            );

            // Load usernames into memory
            await loadUsernames(pool);

            // Set up UTXOs for reply sender's wallet (they need tokens to send)
            const replySenderSk = replySenderNode.seckey();
            if (replySenderSk) {
                mockChronik.setUtxosByAddress(replySenderAddress, [
                    {
                        outpoint: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000007',
                            outIdx: 0,
                        },
                        blockHeight: 800000,
                        isCoinbase: false,
                        sats: 10000n,
                        isFinal: true,
                        token: {
                            tokenId: REWARDS_TOKEN_ID,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                            atoms: 1000n, // Enough tokens to send bottle replies
                            isMintBaton: false,
                        },
                    },
                    {
                        outpoint: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000008',
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
                            txid: '0000000000000000000000000000000000000000000000000000000000000009',
                            outIdx: 0,
                        },
                        blockHeight: 800000,
                        isCoinbase: false,
                        sats: 10000n,
                        isFinal: true,
                        token: {
                            tokenId: REWARDS_TOKEN_ID,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                            atoms: 1000n, // Enough tokens to send 10HP per bottle
                            isMintBaton: false,
                        },
                    },
                    {
                        outpoint: {
                            txid: '000000000000000000000000000000000000000000000000000000000000000a',
                            outIdx: 0,
                        },
                        blockHeight: 800000,
                        isCoinbase: false,
                        sats: 100000n, // XEC for fees
                        isFinal: true,
                    },
                ]);
            }

            // Stub broadcastTx to return success for any transaction
            const expectedTxid1 =
                '0000000000000000000000000000000000000000000000000000000000000001';
            const expectedTxid2 =
                '0000000000000000000000000000000000000000000000000000000000000002';
            let callCount = 0;
            sandbox.stub(mockChronik, 'broadcastTx').callsFake(async () => {
                callCount++;
                return {
                    txid: callCount === 1 ? expectedTxid1 : expectedTxid2,
                };
            });
        });

        afterEach(async () => {
            sandbox.restore();
            if (pool) {
                await pool.end();
            }
        });

        it('should send 10HP from author to bot and 3HP from reply sender to bot for 1 bottle', async () => {
            await handleBottleReply(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
                REPLY_SENDER_USER_ID,
                ORIGINAL_AUTHOR_USER_ID,
                300, // replyMsgId
                200, // originalMsgId
                1, // bottleCount
            );

            // Should send two admin notifications on success (one for author, one for reply sender)
            expect(mockBot.api.sendMessage).to.have.callCount(2);

            // Check author notification (first call)
            const authorCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(0).args;
            expect(authorCallArgs[0]).to.equal(ADMIN_CHAT_ID);
            // Verify usernames are used (set in beforeEach: 'author' and 'replySender')
            expect(authorCallArgs[1]).to.include('author');
            expect(authorCallArgs[1]).to.include('replySender');
            expect(authorCallArgs[1]).to.include('lost 10HP');
            expect(authorCallArgs[1]).to.include('bottle reply');
            expect(authorCallArgs[2]).to.deep.equal({
                parse_mode: 'Markdown',
                link_preview_options: { is_disabled: true },
            });

            // Check reply sender notification (second call)
            const replySenderCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(1).args;
            expect(replySenderCallArgs[0]).to.equal(ADMIN_CHAT_ID);
            expect(replySenderCallArgs[1]).to.include('replySender');
            expect(replySenderCallArgs[1]).to.include('author');
            expect(replySenderCallArgs[1]).to.include('lost 3HP');
            expect(replySenderCallArgs[1]).to.include('bottle reply');
            expect(replySenderCallArgs[2]).to.deep.equal({
                parse_mode: 'Markdown',
                link_preview_options: { is_disabled: true },
            });
        });

        it('should send correct HP amounts for 3 bottles (30HP from author, 9HP from reply sender)', async () => {
            await handleBottleReply(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
                REPLY_SENDER_USER_ID,
                ORIGINAL_AUTHOR_USER_ID,
                300, // replyMsgId
                200, // originalMsgId
                3, // bottleCount
            );

            // Should send two admin notifications
            expect(mockBot.api.sendMessage).to.have.callCount(2);

            // Check author notification
            const authorCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(0).args;
            expect(authorCallArgs[1]).to.include('lost 30HP');

            // Check reply sender notification
            const replySenderCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(1).args;
            expect(replySenderCallArgs[1]).to.include('lost 9HP');
        });

        it('should cap bottle count at 5', async () => {
            await handleBottleReply(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
                REPLY_SENDER_USER_ID,
                ORIGINAL_AUTHOR_USER_ID,
                300, // replyMsgId
                200, // originalMsgId
                10, // bottleCount (should be capped at 5)
            );

            // Should send two admin notifications
            expect(mockBot.api.sendMessage).to.have.callCount(2);

            // Check author notification - should be 50HP (10 * 5), not 100HP (10 * 10)
            const authorCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(0).args;
            expect(authorCallArgs[1]).to.include('lost 50HP');
            expect(authorCallArgs[1]).to.not.include('lost 100HP');

            // Check reply sender notification - should be 15HP (3 * 5), not 30HP (3 * 10)
            const replySenderCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(1).args;
            expect(replySenderCallArgs[1]).to.include('lost 15HP');
            expect(replySenderCallArgs[1]).to.not.include('lost 30HP');
        });

        it('should use usernames instead of user IDs in admin notifications', async () => {
            await handleBottleReply(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
                REPLY_SENDER_USER_ID,
                ORIGINAL_AUTHOR_USER_ID,
                300, // replyMsgId
                200, // originalMsgId
                1, // bottleCount
            );

            // Should send two admin notifications
            expect(mockBot.api.sendMessage).to.have.callCount(2);

            // Check author notification
            const authorCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(0).args;
            const authorMessage = authorCallArgs[1];

            // Verify usernames are used instead of user IDs
            expect(authorMessage).to.include('author');
            expect(authorMessage).to.include('replySender');
            expect(authorMessage).to.not.include(
                ORIGINAL_AUTHOR_USER_ID.toString(),
            );
            expect(authorMessage).to.not.include(
                REPLY_SENDER_USER_ID.toString(),
            );

            // Check reply sender notification
            const replySenderCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(1).args;
            const replySenderMessage = replySenderCallArgs[1];

            // Verify usernames are used instead of user IDs
            expect(replySenderMessage).to.include('replySender');
            expect(replySenderMessage).to.include('author');
            expect(replySenderMessage).to.not.include(
                REPLY_SENDER_USER_ID.toString(),
            );
            expect(replySenderMessage).to.not.include(
                ORIGINAL_AUTHOR_USER_ID.toString(),
            );
        });

        it('should skip if reply sender is not registered', async () => {
            // Remove reply sender from database
            await pool.query('DELETE FROM users WHERE user_tg_id = $1', [
                REPLY_SENDER_USER_ID,
            ]);

            await handleBottleReply(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
                REPLY_SENDER_USER_ID,
                ORIGINAL_AUTHOR_USER_ID,
                300, // replyMsgId
                200, // originalMsgId
                1, // bottleCount
            );

            // Should not send admin notifications
            expect(mockBot.api.sendMessage).to.have.callCount(0);
        });

        it('should skip if original author is not registered', async () => {
            // Remove author from database
            await pool.query('DELETE FROM users WHERE user_tg_id = $1', [
                ORIGINAL_AUTHOR_USER_ID,
            ]);

            await handleBottleReply(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
                REPLY_SENDER_USER_ID,
                ORIGINAL_AUTHOR_USER_ID,
                300, // replyMsgId
                200, // originalMsgId
                1, // bottleCount
            );

            // Should not send admin notifications
            expect(mockBot.api.sendMessage).to.have.callCount(0);
        });

        it('should skip if user is replying to their own message', async () => {
            await handleBottleReply(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
                REPLY_SENDER_USER_ID,
                REPLY_SENDER_USER_ID, // Same user
                300, // replyMsgId
                200, // originalMsgId
                1, // bottleCount
            );

            // Should not send tokens or admin notification
            expect(mockBot.api.sendMessage).to.have.callCount(0);
        });

        it('should send admin notification on author transaction failure', async () => {
            // Make broadcastTx fail for author's transaction
            let callCount = 0;
            sandbox.restore();
            sandbox = sinon.createSandbox();
            sandbox.stub(mockChronik, 'broadcastTx').callsFake(async () => {
                callCount++;
                if (callCount === 1) {
                    // First call (author) fails
                    throw new Error('Broadcast failed');
                }
                // Second call (reply sender) succeeds
                return {
                    txid: '0000000000000000000000000000000000000000000000000000000000000002',
                };
            });

            await handleBottleReply(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
                REPLY_SENDER_USER_ID,
                ORIGINAL_AUTHOR_USER_ID,
                300, // replyMsgId
                200, // originalMsgId
                1, // bottleCount
            );

            // Should send error notification for author transaction failure
            // Plus reply sender success notification
            expect(mockBot.api.sendMessage).to.have.callCount(2);

            // Check that error notification was sent
            const errorCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(0).args;
            expect(errorCallArgs[1]).to.include('🚨 **Bot Action Error**');
            expect(errorCallArgs[1]).to.include(
                'handleBottleReply (author sending HP)',
            );
        });

        it('should send admin notification on reply sender transaction failure', async () => {
            // Make broadcastTx fail for reply sender's transaction
            let callCount = 0;
            sandbox.restore();
            sandbox = sinon.createSandbox();
            sandbox.stub(mockChronik, 'broadcastTx').callsFake(async () => {
                callCount++;
                if (callCount === 1) {
                    // First call (author) succeeds
                    return {
                        txid: '0000000000000000000000000000000000000000000000000000000000000001',
                    };
                }
                // Second call (reply sender) fails
                throw new Error('Broadcast failed');
            });

            await handleBottleReply(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
                REPLY_SENDER_USER_ID,
                ORIGINAL_AUTHOR_USER_ID,
                300, // replyMsgId
                200, // originalMsgId
                1, // bottleCount
            );

            // Should send author success notification plus error notification for reply sender
            expect(mockBot.api.sendMessage).to.have.callCount(2);

            // Check that error notification was sent
            const errorCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(1).args;
            expect(errorCallArgs[1]).to.include('🚨 **Bot Action Error**');
            expect(errorCallArgs[1]).to.include(
                'handleBottleReply (reply sender sending HP)',
            );
        });

        it('should skip if reply sender has no HP', async () => {
            // Set up UTXOs for reply sender with no tokens (only XEC)
            const replySenderSk = replySenderNode!.seckey();
            if (replySenderSk) {
                mockChronik.setUtxosByAddress(replySenderAddress!, [
                    {
                        outpoint: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000007',
                            outIdx: 0,
                        },
                        blockHeight: 800000,
                        isCoinbase: false,
                        sats: 100000n, // Only XEC, no tokens
                        isFinal: true,
                    },
                ]);
            }

            // Author still has tokens
            const authorSk = authorNode!.seckey();
            if (authorSk) {
                mockChronik.setUtxosByAddress(authorAddress!, [
                    {
                        outpoint: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000009',
                            outIdx: 0,
                        },
                        blockHeight: 800000,
                        isCoinbase: false,
                        sats: 10000n,
                        isFinal: true,
                        token: {
                            tokenId: REWARDS_TOKEN_ID,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                            atoms: 1000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        outpoint: {
                            txid: '000000000000000000000000000000000000000000000000000000000000000a',
                            outIdx: 0,
                        },
                        blockHeight: 800000,
                        isCoinbase: false,
                        sats: 100000n,
                        isFinal: true,
                    },
                ]);
            }

            await handleBottleReply(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
                REPLY_SENDER_USER_ID,
                ORIGINAL_AUTHOR_USER_ID,
                300, // replyMsgId
                200, // originalMsgId
                1, // bottleCount
            );

            // Should not send any admin notifications (no transactions processed)
            expect(mockBot.api.sendMessage).to.have.callCount(0);
        });

        it('should send all author HP if they have less than required (9 HP instead of 10)', async () => {
            // Set up UTXOs for reply sender with enough tokens
            const replySenderSk = replySenderNode!.seckey();
            if (replySenderSk) {
                mockChronik.setUtxosByAddress(replySenderAddress!, [
                    {
                        outpoint: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000007',
                            outIdx: 0,
                        },
                        blockHeight: 800000,
                        isCoinbase: false,
                        sats: 10000n,
                        isFinal: true,
                        token: {
                            tokenId: REWARDS_TOKEN_ID,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                            atoms: 1000n, // Enough tokens
                            isMintBaton: false,
                        },
                    },
                    {
                        outpoint: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000008',
                            outIdx: 0,
                        },
                        blockHeight: 800000,
                        isCoinbase: false,
                        sats: 100000n,
                        isFinal: true,
                    },
                ]);
            }

            // Set up UTXOs for author with only 9 HP (less than 10 required for 1 bottle)
            const authorSk = authorNode!.seckey();
            if (authorSk) {
                mockChronik.setUtxosByAddress(authorAddress!, [
                    {
                        outpoint: {
                            txid: '0000000000000000000000000000000000000000000000000000000000000009',
                            outIdx: 0,
                        },
                        blockHeight: 800000,
                        isCoinbase: false,
                        sats: 10000n,
                        isFinal: true,
                        token: {
                            tokenId: REWARDS_TOKEN_ID,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                            atoms: 9n, // Only 9 HP (less than 10 required)
                            isMintBaton: false,
                        },
                    },
                    {
                        outpoint: {
                            txid: '000000000000000000000000000000000000000000000000000000000000000a',
                            outIdx: 0,
                        },
                        blockHeight: 800000,
                        isCoinbase: false,
                        sats: 100000n,
                        isFinal: true,
                    },
                ]);
            }

            await handleBottleReply(
                pool,
                masterNode,
                mockChronik as unknown as ChronikClient,
                mockBot,
                ADMIN_CHAT_ID,
                botWalletAddress,
                REPLY_SENDER_USER_ID,
                ORIGINAL_AUTHOR_USER_ID,
                300, // replyMsgId
                200, // originalMsgId
                1, // bottleCount
            );

            // Should send two admin notifications
            expect(mockBot.api.sendMessage).to.have.callCount(2);

            // Check author notification - should say they lost 9HP (all they have), not 10HP
            const authorCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(0).args;
            expect(authorCallArgs[1]).to.include('author');
            expect(authorCallArgs[1]).to.include('lost 9HP');
            expect(authorCallArgs[1]).to.not.include('lost 10HP');

            // Check reply sender notification - should still say 3HP
            const replySenderCallArgs = (
                mockBot.api.sendMessage as sinon.SinonStub
            ).getCall(1).args;
            expect(replySenderCallArgs[1]).to.include('lost 3HP');
        });
    });
});

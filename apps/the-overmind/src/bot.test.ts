// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as chai from 'chai';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { Context } from 'grammy';
import { Pool } from 'pg';
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
import { register, claim } from './bot';
import { REWARDS_TOKEN_ID, REGISTRATION_REWARD_ATOMS } from './constants';

// Set up chai
const expect = chai.expect;
chai.use(sinonChai);

describe('bot', () => {
    describe('register', () => {
        let mockCtx: Context;
        let mockPool: Pool;
        let masterNode: HdNode;
        let sandbox: sinon.SinonSandbox;

        beforeEach(() => {
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

            // Mock database pool
            mockPool = {
                query: sandbox.stub(),
            } as unknown as Pool;
        });

        afterEach(() => {
            sandbox.restore();
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

            // Mock: user doesn't exist
            (mockPool.query as sinon.SinonStub)
                .onFirstCall()
                .resolves({ rows: [] });

            // Mock: get max index (no users yet, so max_index is 0, first user gets hd_index 1)
            (mockPool.query as sinon.SinonStub)
                .onSecondCall()
                .resolves({ rows: [{ max_index: 0 }] });

            // Mock: insert user
            (mockPool.query as sinon.SinonStub)
                .onThirdCall()
                .resolves({ rows: [], rowCount: 1 });

            await register(mockCtx, masterNode, mockPool);

            // Verify database queries
            expect((mockPool.query as sinon.SinonStub).callCount).to.equal(3);
            expect(
                (mockPool.query as sinon.SinonStub).firstCall.args[1],
            ).to.deep.equal([12345]);
            expect(
                (mockPool.query as sinon.SinonStub).secondCall.args[0],
            ).to.include('MAX(hd_index)');
            expect(
                (mockPool.query as sinon.SinonStub).thirdCall.args[0],
            ).to.include('INSERT INTO users');

            // Verify the correct address was stored
            const insertArgs = (mockPool.query as sinon.SinonStub).thirdCall
                .args[1] as [number, string, number, string | null];
            expect(insertArgs[1]).to.equal(expectedAddress);

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

            // Mock: user exists
            (mockPool.query as sinon.SinonStub).resolves({
                rows: [{ address: existingAddress, hd_index: existingHdIndex }],
            });

            await register(mockCtx, masterNode, mockPool);

            // Verify only one query (check for existing user)
            expect((mockPool.query as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockPool.query as sinon.SinonStub).firstCall.args[1],
            ).to.deep.equal([12345]);

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

            await register(ctxWithoutId, masterNode, mockPool);

            // Verify error message
            expect((ctxWithoutId.reply as sinon.SinonStub).callCount).to.equal(
                1,
            );
            expect(
                (ctxWithoutId.reply as sinon.SinonStub).firstCall.args[0],
            ).to.equal('❌ Could not identify your user ID.');

            // Verify no database queries
            expect((mockPool.query as sinon.SinonStub).callCount).to.equal(0);
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

            // Mock: user doesn't exist
            (mockPool.query as sinon.SinonStub)
                .onFirstCall()
                .resolves({ rows: [] });

            // Mock: get max index (some users exist, max index is 9)
            (mockPool.query as sinon.SinonStub)
                .onSecondCall()
                .resolves({ rows: [{ max_index: 9 }] });

            // Mock: insert user
            (mockPool.query as sinon.SinonStub)
                .onThirdCall()
                .resolves({ rows: [], rowCount: 1 });

            await register(mockCtx, masterNode, mockPool);

            // Verify the insert used hd_index 10 (max_index + 1)
            const insertCall = (mockPool.query as sinon.SinonStub).thirdCall;
            const insertArgs = insertCall.args[1] as [number, string, number];
            expect(insertArgs[0]).to.equal(12345);
            expect(insertArgs[1]).to.equal(expectedAddress);
            expect(insertArgs[2]).to.equal(10);

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

            // Mock: user doesn't exist
            (mockPool.query as sinon.SinonStub)
                .onFirstCall()
                .resolves({ rows: [] });

            // Mock: get max index (no users yet)
            (mockPool.query as sinon.SinonStub)
                .onSecondCall()
                .resolves({ rows: [{ max_index: 0 }] });

            // Mock: insert user
            (mockPool.query as sinon.SinonStub)
                .onThirdCall()
                .resolves({ rows: [], rowCount: 1 });

            await register(mockCtx, masterNode, mockPool);

            // Verify the address was derived and stored correctly
            const insertCall = (mockPool.query as sinon.SinonStub).thirdCall;
            const storedAddress = insertCall.args[1][1] as string;
            expect(storedAddress).to.equal(expectedAddress);

            // Verify reply includes the address
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include(expectedAddress);
        });

        it('should handle database errors gracefully', async () => {
            const dbError = new Error('Database connection failed');

            // Mock: database query fails
            (mockPool.query as sinon.SinonStub).rejects(dbError);

            try {
                await register(mockCtx, masterNode, mockPool);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).to.equal(dbError);
            }
        });
    });

    describe('claim', () => {
        let mockCtx: Context;
        let mockPool: Pool;
        let mockChronik: MockChronikClient;
        let wallet: Wallet;
        let sandbox: sinon.SinonSandbox;
        // Bot wallet SK: all 1s (0101...01)
        const BOT_SK_ALL_ONES_HEX =
            '0101010101010101010101010101010101010101010101010101010101010101';
        const BOT_SK = fromHex(BOT_SK_ALL_ONES_HEX);
        // First user address derived from test mnemonic at m/44'/1899'/1'/0/0
        const FIRST_USER_ADDRESS =
            'ecash:qrfm48gr3zdgph6dt593hzlp587002ec4ysl59mavw';

        beforeEach(() => {
            sandbox = sinon.createSandbox();

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

            // Mock database pool
            mockPool = {
                query: sandbox.stub(),
            } as unknown as Pool;

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

        afterEach(() => {
            sandbox.restore();
        });

        it('should successfully claim reward tokens for a registered user', async () => {
            // Mock: user is registered
            (mockPool.query as sinon.SinonStub)
                .onFirstCall()
                .resolves({ rows: [{ address: FIRST_USER_ADDRESS }] });

            // Mock: user address has no reward tokens yet
            mockChronik.setUtxosByAddress(FIRST_USER_ADDRESS, []);

            // Set up broadcast response with the actual raw transaction hex and txid
            const rawTxHex =
                '02000000020100000000000000000000000000000000000000000000000000000000000000000000006441dfc0ff59f2b276ad2af18725da1cabaaa949db7bd9da9ae097e6694813f8f1e8c2a9fb15cf7964e0cfaecbc9d642b0fe5ea504fcd8169556fd2cbcfd6dfe6f804121031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078fffffffff020000000000000000000000000000000000000000000000000000000000000000000000644126f57a80304f54380aa106679f07be3bee1c6863894c8dbb1d0defeb4ca7ffc46b2b598fd048e12fbf5a1f34cbbf5229b79a912cc0da7a523dc4d38447b897a84121031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078fffffffff050000000000000000406a503d534c5032000453454e44efb82f4a412819f138f7d01aa39e9378319ac026f332685a539d00791965972d036400000000000000000000001c969800000022020000000000001976a914d3ba9d03889a80df4d5d0b1b8be1a1fcf7ab38a988aca0860100000000001976a914d3ba9d03889a80df4d5d0b1b8be1a1fcf7ab38a988ac22020000000000001976a91479b000887626b294a914501a4cd226b58b23598388acd7200000000000001976a91479b000887626b294a914501a4cd226b58b23598388ac00000000';
            const expectedTxid =
                '83319e7f0c53810009316315badbbf78f956abd98e6f84ce65d1bfeaa1b7b327';
            mockChronik.setBroadcastTx(rawTxHex, expectedTxid);

            await claim(mockCtx, mockPool, wallet);

            // Verify database query
            expect((mockPool.query as sinon.SinonStub).callCount).to.equal(1);
            expect(
                (mockPool.query as sinon.SinonStub).firstCall.args[1],
            ).to.deep.equal([12345]);

            // Verify reply was called with success message and expected txid
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('✅ Claim successful!');
            expect(replyCall.args[0]).to.include(FIRST_USER_ADDRESS);
            expect(replyCall.args[0]).to.include('10,000 reward tokens');
            expect(replyCall.args[0]).to.include(expectedTxid);
        });

        it('should reject claim if user is not registered', async () => {
            // Mock: user is not registered
            (mockPool.query as sinon.SinonStub).resolves({ rows: [] });

            await claim(mockCtx, mockPool, wallet);

            // Verify database query
            expect((mockPool.query as sinon.SinonStub).callCount).to.equal(1);

            // Verify error reply
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include('❌ You must register first!');
        });

        it('should reject claim if user has already received reward tokens', async () => {
            // Mock: user is registered
            (mockPool.query as sinon.SinonStub)
                .onFirstCall()
                .resolves({ rows: [{ address: FIRST_USER_ADDRESS }] });

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

            await claim(mockCtx, mockPool, wallet);

            // Verify database query
            expect((mockPool.query as sinon.SinonStub).callCount).to.equal(1);

            // Verify error reply
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include(
                '❌ You have already claimed your reward tokens!',
            );
            expect(replyCall.args[0]).to.include(FIRST_USER_ADDRESS);
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

            await claim(ctxWithoutId, mockPool, wallet);

            // Verify error message
            expect((ctxWithoutId.reply as sinon.SinonStub).callCount).to.equal(
                1,
            );
            expect(
                (ctxWithoutId.reply as sinon.SinonStub).firstCall.args[0],
            ).to.equal('❌ Could not identify your user ID.');

            // Verify no database queries
            expect((mockPool.query as sinon.SinonStub).callCount).to.equal(0);
        });

        it('should handle chronik errors when checking token history', async () => {
            // Mock: user is registered
            (mockPool.query as sinon.SinonStub)
                .onFirstCall()
                .resolves({ rows: [{ address: FIRST_USER_ADDRESS }] });

            // Mock: chronik address query fails by setting an Error
            const chronikError = new Error('Chronik connection failed');
            mockChronik.setUtxosByAddress(FIRST_USER_ADDRESS, chronikError);

            await claim(mockCtx, mockPool, wallet);

            // Verify error reply
            expect((mockCtx.reply as sinon.SinonStub).callCount).to.equal(1);
            const replyCall = (mockCtx.reply as sinon.SinonStub).firstCall;
            expect(replyCall.args[0]).to.include(
                '❌ Error checking your token history',
            );
        });
    });
});

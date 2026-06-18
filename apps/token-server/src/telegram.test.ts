// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { Pool } from 'pg';
import { createFsFromVolume, vol, IFs } from 'memfs';
import config from '../config';
import {
    getOneBlacklistEntry,
    insertBlacklistEntry,
    resetBlacklist,
    seedBlacklist,
    initialBlacklist,
} from '../src/db';
import {
    alertNewTokenIcon,
    buildNewTokenIconCaption,
    formatTokenTypeLabel,
    initializeTelegramBot,
    prepareTelegramBotForPolling,
} from '../src/telegram';
import { upsertCashtabToken } from '../src/cashtabTokens';
import { createTestPool } from '../test/testDb';

const APPROVED_MOD_ID = 111111;
const UNAUTHORIZED_MOD_ID = 999999;
const TEST_TOKEN_ID =
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const TEST_MINTER_ADDRESS = 'ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2';
const TEST_CHANNEL_ID = '-1001234567890';

interface RecordedTelegramApiCall {
    method: string;
    payload: unknown;
}

const TEST_BOT_INFO = {
    id: 1,
    is_bot: true,
    first_name: 'Token Server',
    username: 'token_server_bot',
    can_join_groups: true,
    can_read_all_group_messages: true,
    supports_inline_queries: false,
};

/**
 * Intercept grammY API calls without importing grammY types in this test file.
 */
const installTelegramApiTestDouble = (
    bot: unknown,
): {
    calls: RecordedTelegramApiCall[];
    webhookUrl: string | undefined;
    setWebhookUrl: (url: string | undefined) => void;
} => {
    const calls: RecordedTelegramApiCall[] = [];
    let webhookUrl: string | undefined;
    const apiConfig = (
        bot as { api: { config: { use: (fn: unknown) => void } } }
    ).api.config;

    apiConfig.use(async (_prev: unknown, method: string, payload: unknown) => {
        calls.push({ method, payload });

        if (method === 'getMe') {
            return { ok: true, result: TEST_BOT_INFO };
        }
        if (method === 'getWebhookInfo') {
            return {
                ok: true,
                result: {
                    url: webhookUrl ?? '',
                    has_custom_certificate: false,
                    pending_update_count: 0,
                },
            };
        }
        if (method === 'deleteWebhook') {
            webhookUrl = undefined;
            return { ok: true, result: true };
        }
        if (method === 'answerCallbackQuery') {
            return { ok: true, result: true };
        }
        if (method === 'sendMessage') {
            const payloadRecord = payload as {
                chat_id?: number | string;
            };
            return {
                ok: true,
                result: {
                    message_id: 99,
                    date: Math.floor(Date.now() / 1000),
                    chat: {
                        id: payloadRecord.chat_id ?? -1001234567890,
                        type: 'supergroup',
                    },
                },
            };
        }
        if (method === 'sendPhoto') {
            const payloadRecord = payload as {
                chat_id?: number | string;
            };
            return {
                ok: true,
                result: {
                    message_id: 100,
                    date: Math.floor(Date.now() / 1000),
                    chat: {
                        id: payloadRecord.chat_id ?? -1001234567890,
                        type: 'channel',
                    },
                },
            };
        }

        return { ok: true, result: true };
    });

    return {
        calls,
        get webhookUrl() {
            return webhookUrl;
        },
        setWebhookUrl: (url: string | undefined) => {
            webhookUrl = url;
        },
    };
};

const ensureIconDirs = (fs: IFs, baseDir: string): void => {
    for (const size of config.iconSizes) {
        const dir = `${baseDir}/${size}`;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
};

const writeIconFiles = (fs: IFs, baseDir: string, tokenId: string): void => {
    ensureIconDirs(fs, baseDir);
    for (const size of config.iconSizes) {
        fs.writeFileSync(`${baseDir}/${size}/${tokenId}.png`, 'png-data');
    }
};

const iconExistsAt = (
    fs: IFs,
    baseDir: string,
    tokenId: string,
    size: number,
): boolean => {
    return fs.existsSync(`${baseDir}/${size}/${tokenId}.png`);
};

const findApiCall = (
    calls: RecordedTelegramApiCall[],
    method: string,
): RecordedTelegramApiCall | undefined => {
    return calls.find(call => call.method === method);
};

const createCallbackQueryUpdate = (options: {
    tokenId: string;
    userId: number;
    username?: string;
    messageId?: number;
    chatId?: number;
    updateId?: number;
    callbackQueryId?: string;
}) => {
    const {
        tokenId,
        userId,
        username,
        messageId = 42,
        chatId = -1001234567890,
        updateId = 1,
        callbackQueryId = 'callback-query-1',
    } = options;

    return {
        update_id: updateId,
        callback_query: {
            id: callbackQueryId,
            from: {
                id: userId,
                is_bot: false,
                first_name: 'Mod',
                ...(typeof username === 'string' ? { username } : {}),
            },
            message: {
                message_id: messageId,
                date: Math.floor(Date.now() / 1000),
                chat: {
                    id: chatId,
                    type: 'supergroup',
                    title: 'Token Icons',
                },
                text: 'New token icon',
            },
            chat_instance: 'chat-instance-1',
            data: tokenId,
        },
    };
};

describe('telegram.ts, token-server Telegram admin actions', function () {
    let testPool: Pool;
    let fs: IFs;

    beforeEach(async () => {
        testPool = await createTestPool();
        await seedBlacklist(testPool, initialBlacklist);
        vol.reset();
        fs = createFsFromVolume(vol);
        ensureIconDirs(fs, config.imageDir);
        ensureIconDirs(fs, config.rejectedDir);
    });

    afterEach(async () => {
        vol.reset();
        await resetBlacklist(testPool);
        await testPool.end();
    });

    describe('callback_query moderation', function () {
        it('denies an approved icon for an authorized mod', async function () {
            writeIconFiles(fs, config.imageDir, TEST_TOKEN_ID);

            const bot = initializeTelegramBot(
                'test-bot-token',
                [APPROVED_MOD_ID],
                fs,
                testPool,
            );
            const recorder = installTelegramApiTestDouble(bot);
            await (bot as { init: () => Promise<void> }).init();

            await (
                bot as { handleUpdate: (u: unknown) => Promise<void> }
            ).handleUpdate(
                createCallbackQueryUpdate({
                    tokenId: TEST_TOKEN_ID,
                    userId: APPROVED_MOD_ID,
                    username: 'iconarchon',
                }),
            );

            const blacklistEntry = await getOneBlacklistEntry(
                testPool,
                TEST_TOKEN_ID,
            );
            assert.ok(blacklistEntry);
            assert.equal(blacklistEntry.tokenId, TEST_TOKEN_ID);
            assert.equal(blacklistEntry.reason, 'report from icon archon');
            assert.equal(blacklistEntry.addedBy, 'iconarchon');

            for (const size of config.iconSizes) {
                assert.equal(
                    iconExistsAt(fs, config.imageDir, TEST_TOKEN_ID, size),
                    false,
                );
                assert.equal(
                    iconExistsAt(fs, config.rejectedDir, TEST_TOKEN_ID, size),
                    true,
                );
            }

            const answerCall = findApiCall(
                recorder.calls,
                'answerCallbackQuery',
            );
            assert.ok(answerCall);
            assert.deepEqual(
                (answerCall.payload as { text?: string }).text,
                `Processing token icon deny for ${TEST_TOKEN_ID}`,
            );

            const sendMessageCall = findApiCall(recorder.calls, 'sendMessage');
            assert.ok(sendMessageCall);
            const sendPayload = sendMessageCall.payload as {
                text?: string;
                reply_to_message_id?: number;
                reply_markup?: {
                    inline_keyboard: Array<Array<{ callback_data: string }>>;
                };
            };
            assert.equal(
                sendPayload.text,
                'Icon denied and removed from server',
            );
            assert.equal(sendPayload.reply_to_message_id, 42);
            assert.equal(
                sendPayload.reply_markup?.inline_keyboard[0][0].callback_data,
                TEST_TOKEN_ID,
            );
        });

        it('restores a rejected icon for an authorized mod', async function () {
            writeIconFiles(fs, config.rejectedDir, TEST_TOKEN_ID);
            await insertBlacklistEntry(testPool, TEST_TOKEN_ID, {
                reason: 'report from icon archon',
                timestamp: 1,
                addedBy: 'iconarchon',
            });

            const bot = initializeTelegramBot(
                'test-bot-token',
                [APPROVED_MOD_ID],
                fs,
                testPool,
            );
            const recorder = installTelegramApiTestDouble(bot);
            await (bot as { init: () => Promise<void> }).init();

            await (
                bot as { handleUpdate: (u: unknown) => Promise<void> }
            ).handleUpdate(
                createCallbackQueryUpdate({
                    tokenId: TEST_TOKEN_ID,
                    userId: APPROVED_MOD_ID,
                }),
            );

            assert.equal(
                await getOneBlacklistEntry(testPool, TEST_TOKEN_ID),
                null,
            );

            for (const size of config.iconSizes) {
                assert.equal(
                    iconExistsAt(fs, config.imageDir, TEST_TOKEN_ID, size),
                    true,
                );
                assert.equal(
                    iconExistsAt(fs, config.rejectedDir, TEST_TOKEN_ID, size),
                    false,
                );
            }

            const sendMessageCall = findApiCall(recorder.calls, 'sendMessage');
            assert.ok(sendMessageCall);
            assert.equal(
                (sendMessageCall.payload as { text?: string }).text,
                'Icon un-denied and restored to served endpoint',
            );
        });

        it('rejects moderation from an unauthorized Telegram user', async function () {
            writeIconFiles(fs, config.imageDir, TEST_TOKEN_ID);

            const bot = initializeTelegramBot(
                'test-bot-token',
                [APPROVED_MOD_ID],
                fs,
                testPool,
            );
            const recorder = installTelegramApiTestDouble(bot);
            await (bot as { init: () => Promise<void> }).init();

            await (
                bot as { handleUpdate: (u: unknown) => Promise<void> }
            ).handleUpdate(
                createCallbackQueryUpdate({
                    tokenId: TEST_TOKEN_ID,
                    userId: UNAUTHORIZED_MOD_ID,
                }),
            );

            assert.equal(
                await getOneBlacklistEntry(testPool, TEST_TOKEN_ID),
                null,
            );
            assert.equal(
                iconExistsAt(
                    fs,
                    config.imageDir,
                    TEST_TOKEN_ID,
                    config.iconSizes[config.iconSizes.length - 1],
                ),
                true,
            );

            const answerCall = findApiCall(
                recorder.calls,
                'answerCallbackQuery',
            );
            assert.ok(answerCall);
            const answerPayload = answerCall.payload as {
                text?: string;
                show_alert?: boolean;
            };
            assert.equal(
                answerPayload.text,
                'You are not authorized to moderate token icons.',
            );
            assert.equal(answerPayload.show_alert, true);
            assert.equal(
                recorder.calls.some(call => call.method === 'sendMessage'),
                false,
            );
        });

        it('rejects callback queries with missing tokenId data', async function () {
            const bot = initializeTelegramBot(
                'test-bot-token',
                [APPROVED_MOD_ID],
                fs,
                testPool,
            );
            const recorder = installTelegramApiTestDouble(bot);
            await (bot as { init: () => Promise<void> }).init();

            await (
                bot as { handleUpdate: (u: unknown) => Promise<void> }
            ).handleUpdate({
                update_id: 2,
                callback_query: {
                    id: 'invalid-callback',
                    from: {
                        id: APPROVED_MOD_ID,
                        is_bot: false,
                        first_name: 'Mod',
                    },
                    chat_instance: 'chat-instance-1',
                },
            });

            const answerCall = findApiCall(
                recorder.calls,
                'answerCallbackQuery',
            );
            assert.ok(answerCall);
            const answerPayload = answerCall.payload as {
                text?: string;
                show_alert?: boolean;
            };
            assert.equal(answerPayload.text, 'Invalid callback data');
            assert.equal(answerPayload.show_alert, true);
        });

        it('uses the Telegram user id when username is unavailable', async function () {
            writeIconFiles(fs, config.imageDir, TEST_TOKEN_ID);

            const bot = initializeTelegramBot(
                'test-bot-token',
                [APPROVED_MOD_ID],
                fs,
                testPool,
            );
            installTelegramApiTestDouble(bot);
            await (bot as { init: () => Promise<void> }).init();

            await (
                bot as { handleUpdate: (u: unknown) => Promise<void> }
            ).handleUpdate(
                createCallbackQueryUpdate({
                    tokenId: TEST_TOKEN_ID,
                    userId: APPROVED_MOD_ID,
                }),
            );

            const blacklistEntry = await getOneBlacklistEntry(
                testPool,
                TEST_TOKEN_ID,
            );
            assert.ok(blacklistEntry);
            assert.equal(blacklistEntry.addedBy, APPROVED_MOD_ID.toString());
        });
    });

    describe('prepareTelegramBotForPolling', function () {
        it('clears an existing webhook before polling starts', async function () {
            const bot = initializeTelegramBot(
                'test-bot-token',
                [APPROVED_MOD_ID],
                fs,
                testPool,
            );
            const recorder = installTelegramApiTestDouble(bot);
            recorder.setWebhookUrl('https://example.com/webhook');
            await (bot as { init: () => Promise<void> }).init();

            await prepareTelegramBotForPolling(
                bot as Parameters<typeof prepareTelegramBotForPolling>[0],
            );

            assert.ok(
                recorder.calls.some(call => call.method === 'getWebhookInfo'),
            );
            assert.ok(
                recorder.calls.some(call => call.method === 'deleteWebhook'),
            );
            assert.equal(recorder.webhookUrl, undefined);
        });

        it('does not delete the webhook when none is configured', async function () {
            const bot = initializeTelegramBot(
                'test-bot-token',
                [APPROVED_MOD_ID],
                fs,
                testPool,
            );
            const recorder = installTelegramApiTestDouble(bot);
            await (bot as { init: () => Promise<void> }).init();

            await prepareTelegramBotForPolling(
                bot as Parameters<typeof prepareTelegramBotForPolling>[0],
            );

            assert.ok(
                recorder.calls.some(call => call.method === 'getWebhookInfo'),
            );
            assert.equal(
                recorder.calls.some(call => call.method === 'deleteWebhook'),
                false,
            );
        });
    });

    describe('alertNewTokenIcon', function () {
        it('sends a moderation photo with deny button to the channel', async function () {
            writeIconFiles(fs, config.imageDir, TEST_TOKEN_ID);

            await upsertCashtabToken(testPool, {
                tokenId: TEST_TOKEN_ID,
                minterAddress: TEST_MINTER_ADDRESS,
                tokenType: 'ALP_TOKEN_TYPE_STANDARD',
                supplyType: 'FIXED',
            });

            const bot = initializeTelegramBot(
                'test-bot-token',
                [APPROVED_MOD_ID],
                fs,
                testPool,
            );
            const recorder = installTelegramApiTestDouble(bot);
            await (bot as { init: () => Promise<void> }).init();

            await alertNewTokenIcon(
                bot as Parameters<typeof alertNewTokenIcon>[0],
                TEST_CHANNEL_ID,
                testPool,
                {
                    tokenId: TEST_TOKEN_ID,
                    name: 'Test Token',
                    ticker: 'TST',
                    decimals: 2,
                    url: 'https://cashtab.com',
                    genesisQty: '1000',
                    minterAddress: TEST_MINTER_ADDRESS,
                    tokenType: 'ALP_TOKEN_TYPE_STANDARD',
                    supplyType: 'FIXED',
                },
            );

            const sendPhotoCall = findApiCall(recorder.calls, 'sendPhoto');
            assert.ok(sendPhotoCall);
            const sendPhotoPayload = sendPhotoCall.payload as {
                chat_id?: string;
                caption?: string;
                parse_mode?: string;
                reply_markup?: {
                    inline_keyboard: Array<
                        Array<{ text: string; callback_data: string }>
                    >;
                };
            };
            assert.equal(sendPhotoPayload.chat_id, TEST_CHANNEL_ID);
            assert.equal(
                sendPhotoPayload.caption,
                buildNewTokenIconCaption(
                    {
                        tokenId: TEST_TOKEN_ID,
                        name: 'Test Token',
                        ticker: 'TST',
                        decimals: 2,
                        url: 'https://cashtab.com',
                        genesisQty: '1000',
                        minterAddress: TEST_MINTER_ADDRESS,
                        tokenType: 'ALP_TOKEN_TYPE_STANDARD',
                        supplyType: 'FIXED',
                    },
                    {
                        tokensMinted: 1,
                        blacklistedTokens: 0,
                    },
                ),
            );
            assert.equal(sendPhotoPayload.parse_mode, 'Markdown');
            assert.deepEqual(
                sendPhotoPayload.reply_markup?.inline_keyboard[0][0],
                {
                    text: 'Deny',
                    callback_data: TEST_TOKEN_ID,
                },
            );
        });

        it('includes blacklisted token count for the minter', async function () {
            writeIconFiles(fs, config.imageDir, TEST_TOKEN_ID);

            const blacklistedTokenId =
                'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
            await upsertCashtabToken(testPool, {
                tokenId: blacklistedTokenId,
                minterAddress: TEST_MINTER_ADDRESS,
                tokenType: 'SLP_TOKEN_TYPE_FUNGIBLE',
                supplyType: 'VARIABLE',
            });
            await insertBlacklistEntry(testPool, blacklistedTokenId, {
                reason: 'test blacklist',
                timestamp: 1,
                addedBy: 'test',
            });
            await upsertCashtabToken(testPool, {
                tokenId: TEST_TOKEN_ID,
                minterAddress: TEST_MINTER_ADDRESS,
                tokenType: 'ALP_TOKEN_TYPE_STANDARD',
                supplyType: 'FIXED',
            });

            const bot = initializeTelegramBot(
                'test-bot-token',
                [APPROVED_MOD_ID],
                fs,
                testPool,
            );
            const recorder = installTelegramApiTestDouble(bot);
            await (bot as { init: () => Promise<void> }).init();

            await alertNewTokenIcon(
                bot as Parameters<typeof alertNewTokenIcon>[0],
                TEST_CHANNEL_ID,
                testPool,
                {
                    tokenId: TEST_TOKEN_ID,
                    name: 'Test Token',
                    ticker: 'TST',
                    decimals: 2,
                    url: 'https://cashtab.com',
                    genesisQty: '1000',
                    minterAddress: TEST_MINTER_ADDRESS,
                    tokenType: 'ALP_TOKEN_TYPE_STANDARD',
                    supplyType: 'FIXED',
                },
            );

            const sendPhotoCall = findApiCall(recorder.calls, 'sendPhoto');
            assert.ok(sendPhotoCall);
            const sendPhotoPayload = sendPhotoCall.payload as {
                caption?: string;
            };
            assert.match(
                sendPhotoPayload.caption ?? '',
                /2 tokens minted, 1 blacklisted/,
            );
        });
    });

    describe('buildNewTokenIconCaption', () => {
        const baseTokenInfo = {
            tokenId: TEST_TOKEN_ID,
            name: 'Lazy Carl',
            ticker: 'LCRL',
            decimals: 0,
            url: 'https://cashtab.com',
            genesisQty: '50',
            minterAddress: 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
            tokenType: 'ALP_TOKEN_TYPE_STANDARD',
            supplyType: 'VARIABLE',
        };

        it('formats the Sleepy Carl moderation alert caption', () => {
            const caption = buildNewTokenIconCaption(
                {
                    tokenId:
                        '67e4cb702558fe815efb15dacf3f68a3f2c662bb9d73c3f8682fc3cbb9a47993',
                    name: 'Sleepy Carl',
                    ticker: 'SCRL',
                    decimals: 0,
                    url: 'https://cashtab.com',
                    genesisQty: '50',
                    minterAddress:
                        'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
                    tokenType: 'ALP_TOKEN_TYPE_STANDARD',
                    supplyType: 'VARIABLE',
                },
                {
                    tokensMinted: 51,
                    blacklistedTokens: 0,
                },
            );

            assert.equal(
                caption,
                [
                    '[Sleepy Carl](https://explorer.e.cash/tx/67e4cb702558fe815efb15dacf3f68a3f2c662bb9d73c3f8682fc3cbb9a47993) (SCRL)',
                    'Minter: [qz...035](https://explorer.e.cash/address/ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035)',
                    '51 tokens minted, 0 blacklisted',
                    'ALP, variable supply',
                ].join('\n'),
            );
        });

        it('uses fixed supply label when supply type is FIXED', () => {
            const caption = buildNewTokenIconCaption(
                {
                    ...baseTokenInfo,
                    supplyType: 'FIXED',
                },
                {
                    tokensMinted: 1,
                    blacklistedTokens: 0,
                },
            );

            assert.match(caption, /ALP, fixed supply/);
        });

        it('maps token types to human-readable labels', () => {
            assert.equal(
                formatTokenTypeLabel('ALP_TOKEN_TYPE_STANDARD'),
                'ALP',
            );
            assert.equal(
                formatTokenTypeLabel('SLP_TOKEN_TYPE_FUNGIBLE'),
                'SLP',
            );
            assert.equal(
                formatTokenTypeLabel('SLP_TOKEN_TYPE_NFT1_GROUP'),
                'NFT Group',
            );
            assert.equal(
                formatTokenTypeLabel('SLP_TOKEN_TYPE_NFT1_CHILD'),
                'NFT',
            );
            assert.equal(
                formatTokenTypeLabel('SLP_TOKEN_TYPE_MINT_VAULT'),
                'Mint Vault',
            );
            assert.equal(
                formatTokenTypeLabel('SLP_TOKEN_TYPE_UNKNOWN'),
                'Other',
            );
        });

        it('escapes markdown characters in token name and ticker', () => {
            const caption = buildNewTokenIconCaption(
                {
                    ...baseTokenInfo,
                    name: 'Token_with_underscores',
                    ticker: 'T_ST',
                },
                {
                    tokensMinted: 1,
                    blacklistedTokens: 0,
                },
            );

            assert.match(
                caption,
                /\[Token\\_with\\_underscores\]\(https:\/\/explorer\.e\.cash\/tx\//,
            );
            assert.match(caption, /\(T\\_ST\)/);
        });
    });
});

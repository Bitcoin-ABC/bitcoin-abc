// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { Bot, GrammyError } from 'grammy';
import {
    TELEGRAM_SEND_TIMEOUT_SECONDS,
    createTelegramBot,
    createTelegramOpsSender,
    extractTelegramRetryAfterMs,
    isPermanentTelegramApiError,
    isTelegram429Error,
    sendTelegramOps,
} from '../src/ops/telegram';

const grammyError = (
    code: number,
    description: string,
    retryAfter?: number,
): GrammyError =>
    new GrammyError(
        'call to sendMessage',
        {
            ok: false,
            error_code: code,
            description,
            parameters:
                retryAfter === undefined ? {} : { retry_after: retryAfter },
        },
        'sendMessage',
        {},
    );

const stubSend = (bot: Bot, impl: Bot['api']['sendMessage']): void => {
    bot.api.sendMessage = impl;
};

describe('telegram ops (grammy)', () => {
    it('createTelegramBot is outbound-only with a bounded client timeout', () => {
        const bot = createTelegramBot('123456:test-token');
        assert.ok(bot instanceof Bot);
        assert.strictEqual(bot.isInited(), false);
        assert.strictEqual(
            bot.api.options.timeoutSeconds,
            TELEGRAM_SEND_TIMEOUT_SECONDS,
        );
    });

    it('sendTelegramOps posts HTML to the ops chat', async () => {
        const bot = createTelegramBot('123456:test-token');
        const calls: Array<{
            chatId: string | number;
            text: string;
            extra: { parse_mode?: string } | undefined;
        }> = [];
        stubSend(bot, (async (chatId, text, extra) => {
            calls.push({
                chatId,
                text,
                extra: extra as { parse_mode?: string } | undefined,
            });
            return { message_id: 1 } as Awaited<
                ReturnType<Bot['api']['sendMessage']>
            >;
        }) as Bot['api']['sendMessage']);

        await sendTelegramOps(bot, '-100123', '<b>Swap Successful</b>');

        assert.strictEqual(calls.length, 1);
        assert.strictEqual(calls[0]!.chatId, '-100123');
        assert.strictEqual(calls[0]!.text, '<b>Swap Successful</b>');
        assert.strictEqual(calls[0]!.extra?.parse_mode, 'HTML');
    });

    it('sendTelegramOps surfaces grammy errors to the caller', async () => {
        const bot = createTelegramBot('123456:test-token');
        stubSend(bot, (async () => {
            throw new Error('Telegram sendMessage failed');
        }) as Bot['api']['sendMessage']);

        await assert.rejects(
            () => sendTelegramOps(bot, '-100123', 'hi'),
            /Telegram sendMessage failed/,
        );
    });
});

describe('telegram 429 helpers', () => {
    it('reads retry_after from GrammyError.parameters', () => {
        const err = grammyError(429, 'Too Many Requests: retry after 7', 7);
        assert.strictEqual(isTelegram429Error(err), true);
        assert.strictEqual(extractTelegramRetryAfterMs(err), 7_000);
        assert.strictEqual(isPermanentTelegramApiError(err), false);
    });

    it('parses retry after from the description when parameters are empty', () => {
        const err = grammyError(429, 'Too Many Requests: retry after 3');
        assert.strictEqual(extractTelegramRetryAfterMs(err), 3_000);
    });

    it('treats other 4xx GrammyError as permanent', () => {
        const err = grammyError(400, "Bad Request: can't parse entities");
        assert.strictEqual(isTelegram429Error(err), false);
        assert.strictEqual(isPermanentTelegramApiError(err), true);
    });
});

describe('telegram ops sender queue', () => {
    const ok = { message_id: 1 } as Awaited<
        ReturnType<Bot['api']['sendMessage']>
    >;

    it('retries a 429 using retry_after then succeeds', async () => {
        const bot = createTelegramBot('123456:test-token');
        let calls = 0;
        stubSend(bot, (async () => {
            calls += 1;
            if (calls === 1) {
                throw grammyError(429, 'Too Many Requests: retry after 2', 2);
            }
            return ok;
        }) as Bot['api']['sendMessage']);

        const sleeps: number[] = [];
        const sender = createTelegramOpsSender(
            bot,
            '-100123',
            { minIntervalMs: 0 },
            {
                sleep: async ms => {
                    sleeps.push(ms);
                },
                random: () => 0,
            },
        );

        await sender.send('<b>ok</b>');
        assert.strictEqual(calls, 2);
        assert.deepStrictEqual(sleeps, [2_000]);
    });

    it('does not retry a permanent 400', async () => {
        const bot = createTelegramBot('123456:test-token');
        let calls = 0;
        stubSend(bot, (async () => {
            calls += 1;
            throw grammyError(400, "Bad Request: can't parse entities");
        }) as Bot['api']['sendMessage']);

        const sender = createTelegramOpsSender(
            bot,
            '-100123',
            { minIntervalMs: 0 },
            { sleep: async () => undefined, random: () => 0 },
        );

        await assert.rejects(
            () => sender.send('bad html'),
            /can't parse entities/,
        );
        assert.strictEqual(calls, 1);
    });

    it('serializes concurrent sends onto one in-flight API call', async () => {
        const bot = createTelegramBot('123456:test-token');
        let inFlight = 0;
        let maxInFlight = 0;
        const order: string[] = [];
        stubSend(bot, (async (_chat, text) => {
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            order.push(String(text));
            await new Promise(resolve => setTimeout(resolve, 15));
            inFlight -= 1;
            return ok;
        }) as Bot['api']['sendMessage']);

        const sender = createTelegramOpsSender(
            bot,
            '-100123',
            { minIntervalMs: 0 },
            { sleep: async () => undefined, random: () => 0 },
        );

        await Promise.all([
            sender.send('a'),
            sender.send('b'),
            sender.send('c'),
        ]);
        assert.strictEqual(maxInFlight, 1);
        assert.deepStrictEqual(order, ['a', 'b', 'c']);
    });

    it('drops sends when the FIFO is already full', async () => {
        const bot = createTelegramBot('123456:test-token');
        let release!: () => void;
        const held = new Promise<void>(resolve => {
            release = resolve;
        });
        stubSend(bot, (async () => {
            await held;
            return ok;
        }) as Bot['api']['sendMessage']);

        const sender = createTelegramOpsSender(
            bot,
            '-100123',
            { maxQueued: 2, minIntervalMs: 0 },
            { sleep: async () => undefined, random: () => 0 },
        );

        const first = sender.send('one');
        const second = sender.send('two');
        await assert.rejects(
            () => sender.send('three'),
            /Telegram ops queue full/,
        );
        release();
        await Promise.all([first, second]);
    });

    it('backs off transient errors then gives up', async () => {
        const bot = createTelegramBot('123456:test-token');
        let calls = 0;
        stubSend(bot, (async () => {
            calls += 1;
            throw new Error('socket hang up');
        }) as Bot['api']['sendMessage']);

        const sleeps: number[] = [];
        const sender = createTelegramOpsSender(
            bot,
            '-100123',
            { maxAttempts: 3, minIntervalMs: 0, baseDelayMs: 100 },
            {
                sleep: async ms => {
                    sleeps.push(ms);
                },
                random: () => 0,
            },
        );

        await assert.rejects(() => sender.send('x'), /socket hang up/);
        assert.strictEqual(calls, 3);
        assert.deepStrictEqual(sleeps, [100, 200]);
    });
});

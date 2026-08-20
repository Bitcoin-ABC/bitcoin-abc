// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Bot, GrammyError } from 'grammy';
import { AsyncQueue } from '../methods/queue';

/** Bound grammy's HTTP client so a stalled Telegram API cannot hang forever. */
export const TELEGRAM_SEND_TIMEOUT_SECONDS = 10;

export type TelegramSendRetryOptions = {
    /** Transient (non-429) attempts, including the first try. */
    maxAttempts: number;
    /** All sendMessage calls for one message, including 429 retries. */
    maxApiAttempts: number;
    /** First transient backoff; doubles each non-429 retry. */
    baseDelayMs: number;
    fallback429WaitMs: number;
    max429WaitMs: number;
    maxTotalWaitMs: number;
    /** Gap after a successful send before the next queued message. */
    minIntervalMs: number;
    /** Drop additional fire-and-forget sends when the FIFO is this deep. */
    maxQueued: number;
};

export const DEFAULT_TELEGRAM_RETRY: TelegramSendRetryOptions = {
    maxAttempts: 3,
    maxApiAttempts: 5,
    baseDelayMs: 1_000,
    fallback429WaitMs: 5_000,
    max429WaitMs: 60_000,
    maxTotalWaitMs: 90_000,
    minIntervalMs: 100,
    maxQueued: 32,
};

export type TelegramOpsSender = {
    send: (html: string) => Promise<void>;
};

type TelegramSendHooks = {
    sleep?: (ms: number) => Promise<void>;
    random?: () => number;
    now?: () => number;
};

/**
 * Outbound-only bot (no `bot.start()`). alp-dex sends ops messages; it does
 * not receive Telegram updates.
 */
export const createTelegramBot = (botToken: string): Bot =>
    new Bot(botToken, {
        client: { timeoutSeconds: TELEGRAM_SEND_TIMEOUT_SECONDS },
    });

/**
 * Read Telegram's suggested wait from a 429. Prefers grammy
 * `parameters.retry_after`, then "retry after N" in the description.
 */
export const extractTelegramRetryAfterMs = (error: unknown): number | null => {
    if (error instanceof GrammyError) {
        const retryAfter = error.parameters.retry_after;
        if (typeof retryAfter === 'number' && retryAfter > 0) {
            return Math.round(retryAfter * 1000);
        }
        const fromDesc = parseRetryAfterSeconds(error.description);
        if (fromDesc !== null) {
            return fromDesc;
        }
    }
    if (error instanceof Error) {
        return parseRetryAfterSeconds(error.message);
    }
    return null;
};

const parseRetryAfterSeconds = (text: string): number | null => {
    const match = text.match(/retry after (\d+)/i);
    if (match === null) {
        return null;
    }
    const sec = Number.parseInt(match[1]!, 10);
    return Number.isFinite(sec) && sec > 0 ? sec * 1000 : null;
};

export const isTelegram429Error = (error: unknown): boolean => {
    if (error instanceof GrammyError) {
        return error.error_code === 429;
    }
    if (!(error instanceof Error)) {
        return false;
    }
    return /(?:ETELEGRAM:\s*)?\b429\b\s*(?:Too Many Requests|:)/i.test(
        error.message,
    );
};

/** 4xx other than 429 (bad HTML, bad token) — do not retry. */
export const isPermanentTelegramApiError = (error: unknown): boolean => {
    if (isTelegram429Error(error)) {
        return false;
    }
    if (error instanceof GrammyError) {
        return error.error_code >= 400 && error.error_code < 500;
    }
    return false;
};

const defaultSleep = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

/**
 * One-shot HTML sendMessage. Prefer {@link createTelegramOpsSender} so
 * concurrent settles serialize and 429s back off.
 */
export const sendTelegramOps = async (
    bot: Bot,
    opsChat: string,
    html: string,
): Promise<void> => {
    await bot.api.sendMessage(opsChat, html, { parse_mode: 'HTML' });
};

const deliverWithRetries = async (
    bot: Bot,
    opsChat: string,
    html: string,
    opts: TelegramSendRetryOptions,
    hooks: Required<TelegramSendHooks>,
): Promise<void> => {
    let apiAttempts = 0;
    let non429Failures = 0;
    let lastError: unknown;
    const deadline = hooks.now() + opts.maxTotalWaitMs;

    while (true) {
        if (apiAttempts >= opts.maxApiAttempts || hooks.now() >= deadline) {
            throw (
                lastError ??
                new Error(
                    `Abandoned Telegram send after ${opts.maxApiAttempts} API attempts`,
                )
            );
        }
        apiAttempts += 1;

        try {
            await sendTelegramOps(bot, opsChat, html);
            if (opts.minIntervalMs > 0) {
                await hooks.sleep(opts.minIntervalMs);
            }
            return;
        } catch (error: unknown) {
            lastError = error;

            if (isTelegram429Error(error)) {
                const parsed = extractTelegramRetryAfterMs(error);
                const baseWait =
                    parsed !== null ? parsed : opts.fallback429WaitMs;
                const jitter = Math.round(hooks.random() * 250);
                const waitMs = Math.min(baseWait + jitter, opts.max429WaitMs);
                const remainingMs = Math.max(0, deadline - hooks.now());
                if (remainingMs === 0) {
                    throw error;
                }
                const boundedWaitMs = Math.min(waitMs, remainingMs);
                console.warn(
                    `Telegram 429: waiting ${boundedWaitMs}ms before retry ` +
                        `(attempt ${apiAttempts}/${opts.maxApiAttempts})`,
                );
                await hooks.sleep(boundedWaitMs);
                continue;
            }

            if (isPermanentTelegramApiError(error)) {
                throw error;
            }

            non429Failures += 1;
            if (non429Failures >= opts.maxAttempts) {
                throw error;
            }
            const delay = Math.min(
                opts.baseDelayMs * 2 ** (non429Failures - 1),
                opts.max429WaitMs,
            );
            const boundedDelay = Math.min(
                delay,
                Math.max(0, deadline - hooks.now()),
            );
            if (boundedDelay === 0) {
                throw error;
            }
            await hooks.sleep(boundedDelay);
        }
    }
};

/**
 * FIFO ops sender: one in-flight Telegram call, 429/`retry_after` backoff,
 * and a bounded queue so a settle flood cannot open unbounded HTTP.
 * Settle HTTP must still fire-and-forget `send`.
 */
export const createTelegramOpsSender = (
    bot: Bot,
    opsChat: string,
    retry: Partial<TelegramSendRetryOptions> = {},
    hooks: TelegramSendHooks = {},
): TelegramOpsSender => {
    const opts = { ...DEFAULT_TELEGRAM_RETRY, ...retry };
    const resolvedHooks: Required<TelegramSendHooks> = {
        sleep: hooks.sleep ?? defaultSleep,
        random: hooks.random ?? Math.random,
        now: hooks.now ?? Date.now,
    };
    const queue = new AsyncQueue();
    let pending = 0;

    return {
        send: async (html: string): Promise<void> => {
            if (pending >= opts.maxQueued) {
                throw new Error(
                    `Telegram ops queue full (${opts.maxQueued}); dropping message`,
                );
            }
            pending += 1;
            try {
                await queue.enqueue(() =>
                    deliverWithRetries(bot, opsChat, html, opts, resolvedHooks),
                );
            } finally {
                pending -= 1;
            }
        },
    };
};

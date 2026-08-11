// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import config, { SendMessageOptions } from '../config';
import { Bot } from 'grammy';
import { MockTelegramBot } from '../test/mocks/telegramBotMock';
import { SendMessageResponse } from './events';

// undocumented API behavior of HTML parsing mode, discovered through brute force
const TG_MSG_MAX_LENGTH = 4096;

/** Retry / rate-limit tunables for {@link heraldSend} */
export interface HeraldSendRetryOptions {
    /**
     * Max send attempts for non-429 errors, including the first try
     * (default 3).
     */
    maxAttempts?: number;
    /** Base delay for non-429 exponential backoff in ms (default 1000) */
    baseDelay?: number;
    /** Cap for non-429 exponential backoff in ms (default 30000) */
    maxDelay?: number;
    /**
     * Minimum gap after each successful send before the next API call (default
     * 100). Reduces avoidable 429s when messages are sent in quick succession.
     */
    minIntervalMs?: number;
    /**
     * Max sendMessage attempts for one message, including 429 retries
     * (default 100).
     */
    maxApiAttemptsPerMessage?: number;
    /**
     * If 429 is returned but retry_after cannot be parsed, wait this long in ms
     * (default 5000).
     */
    fallback429WaitMs?: number;
    /**
     * Upper bound on a single honored retry_after wait in ms (default 60000).
     */
    max429WaitMs?: number;
    /**
     * Max wall-clock time one message may hold the shared send queue in ms
     * (default 120000).
     */
    maxTotalWaitMs?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<HeraldSendRetryOptions> = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    minIntervalMs: 100,
    maxApiAttemptsPerMessage: 100,
    fallback429WaitMs: 5000,
    max429WaitMs: 60000,
    maxTotalWaitMs: 120000,
};

/** Active defaults (overridable in unit tests) */
let retryDefaults: Required<HeraldSendRetryOptions> = {
    ...DEFAULT_RETRY_OPTIONS,
};

/** Earliest time (epoch ms) the next sendMessage call is allowed */
let nextSendEarliestAt = 0;
/** Serialize sends so parallel callers do not stampede the API */
let sendChain: Promise<void> = Promise.resolve();

/**
 * Override default retry / pacing options. For unit tests only (e.g. when
 * FakeTimers are installed and minInterval sleeps would otherwise hang).
 *
 * @param overrides - Partial defaults to merge over production defaults
 */
export const setHeraldSendRetryDefaultsForTests = (
    overrides: Partial<HeraldSendRetryOptions>,
): void => {
    retryDefaults = { ...DEFAULT_RETRY_OPTIONS, ...overrides };
};

/**
 * Reset module-level send pacing state and retry defaults. For unit tests only.
 */
export const resetHeraldSendStateForTests = (): void => {
    nextSendEarliestAt = 0;
    sendChain = Promise.resolve();
    retryDefaults = { ...DEFAULT_RETRY_OPTIONS };
};

/**
 * Read Telegram's suggested wait time from a 429 response (seconds → ms).
 * Prefers `parameters.retry_after` when present; falls back to parsing the
 * description or error message.
 *
 * @param error - Caught value from Grammy / Telegram API
 * @returns Milliseconds to wait, or null if not parseable
 */
export const extractTelegramRetryAfterMs = (error: unknown): number | null => {
    if (!error || typeof error !== 'object') {
        return null;
    }
    const err = error as {
        message?: string;
        /** Grammy GrammyError: Telegram API parameters (includes retry_after) */
        parameters?: { retry_after?: number };
        response?: {
            body?: {
                description?: string;
                parameters?: { retry_after?: number };
            };
        };
    };
    const retryAfterSec =
        typeof err.parameters?.retry_after === 'number' &&
        err.parameters.retry_after > 0
            ? err.parameters.retry_after
            : err.response?.body?.parameters?.retry_after;
    if (typeof retryAfterSec === 'number' && retryAfterSec > 0) {
        return Math.round(retryAfterSec * 1000);
    }
    const desc = err.response?.body?.description;
    if (typeof desc === 'string') {
        const m = desc.match(/retry after (\d+)/i);
        if (m) {
            const sec = Number.parseInt(m[1], 10);
            if (Number.isFinite(sec) && sec > 0) {
                return sec * 1000;
            }
        }
    }
    const msg = err.message;
    if (typeof msg === 'string') {
        const m = msg.match(/retry after (\d+)/i);
        if (m) {
            const sec = Number.parseInt(m[1], 10);
            if (Number.isFinite(sec) && sec > 0) {
                return sec * 1000;
            }
        }
    }
    return null;
};

/**
 * @param error - API error object
 * @returns Whether this looks like a Telegram HTTP 429 / flood error
 */
export const isTelegram429Error = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') {
        return false;
    }
    const e = error as {
        error_code?: number;
        response?: { statusCode?: number; body?: { error_code?: number } };
        message?: string;
    };
    if (
        e.error_code === 429 ||
        e.response?.statusCode === 429 ||
        e.response?.body?.error_code === 429
    ) {
        return true;
    }
    // Anchor to Telegram flood / rate-limit phrasing — do not match bare "429"
    // (chat ids, message ids, or echoed text can contain that number).
    return (
        typeof e.message === 'string' &&
        /(?:ETELEGRAM:\s*)?\b429\b\s*(?:Too Many Requests|:)/i.test(e.message)
    );
};

/**
 * Client errors (4xx other than 429) are not worth retrying — e.g. bad HTML,
 * unauthorized bot token.
 *
 * @param error - Caught send error
 * @returns true if this should fail immediately without backoff retries
 */
export const isPermanentTelegramApiError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object' || isTelegram429Error(error)) {
        return false;
    }
    const e = error as {
        error_code?: number;
        response?: { statusCode?: number; body?: { error_code?: number } };
        message?: string;
    };
    const code =
        e.error_code ?? e.response?.body?.error_code ?? e.response?.statusCode;
    if (typeof code === 'number' && code >= 400 && code < 500) {
        return true;
    }
    const msg = e.message ?? '';
    return /ETELEGRAM:\s*4\d\d\b/.test(msg);
};

const calculateNon429BackoffDelay = (
    attemptIndex: number,
    baseDelay: number,
    maxDelay: number,
): number => {
    const exponentialDelay = baseDelay * Math.pow(2, attemptIndex);
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    const delay = Math.min(exponentialDelay + jitter, maxDelay);
    return Math.max(delay, baseDelay);
};

const waitUntilSendAllowed = async (): Promise<void> => {
    const wait = nextSendEarliestAt - Date.now();
    if (wait > 0) {
        await new Promise(resolve => setTimeout(resolve, wait));
    }
};

const sleep = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

export const prepareStringForTelegramHTML = (string: string): string => {
    /*
        See "HTML Style" at https://core.telegram.org/bots/api

        Replace < with &lt;
        Replace > with &gt;
        Replace & with &amp;
      */
    let tgReadyString = string;
    // need to replace the '&' characters first
    tgReadyString = tgReadyString.replace(/&/g, '&amp;');
    tgReadyString = tgReadyString.replace(/</g, '&lt;');
    tgReadyString = tgReadyString.replace(/>/g, '&gt;');

    return tgReadyString;
};

/**
 * Send a Telegram message with serialized delivery, 429 retry_after handling,
 * and exponential backoff for other transient errors.
 *
 * @param telegramBot Telegram bot instance
 * @param channelId Channel ID to send to
 * @param message Message to send
 * @param options Send message options
 * @param retryOptions Retry / rate-limit tunables
 * @returns Promise that resolves with the message result or rejects with the final error
 */
export const heraldSend = async (
    telegramBot: Bot | MockTelegramBot,
    channelId: string,
    message: string,
    options: SendMessageOptions,
    retryOptions: HeraldSendRetryOptions = {},
): Promise<SendMessageResponse> => {
    const {
        maxAttempts,
        baseDelay,
        maxDelay,
        minIntervalMs,
        maxApiAttemptsPerMessage,
        fallback429WaitMs,
        max429WaitMs,
        maxTotalWaitMs,
    } = { ...retryDefaults, ...retryOptions };

    return new Promise((resolve, reject) => {
        sendChain = sendChain
            .catch(() => undefined)
            .then(async () => {
                try {
                    const result = await deliverWithRetries(
                        () =>
                            telegramBot.api.sendMessage(
                                channelId,
                                message,
                                options,
                            ) as Promise<SendMessageResponse>,
                        {
                            maxAttempts,
                            baseDelay,
                            maxDelay,
                            minIntervalMs,
                            maxApiAttemptsPerMessage,
                            fallback429WaitMs,
                            max429WaitMs,
                            maxTotalWaitMs,
                        },
                    );
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
    });
};

const deliverWithRetries = async (
    deliver: () => Promise<SendMessageResponse>,
    opts: Required<HeraldSendRetryOptions>,
): Promise<SendMessageResponse> => {
    let apiAttempts = 0;
    let non429Failures = 0;
    let lastError: unknown;
    const deadline = Date.now() + opts.maxTotalWaitMs;

    while (true) {
        await waitUntilSendAllowed();

        if (
            apiAttempts >= opts.maxApiAttemptsPerMessage ||
            Date.now() >= deadline
        ) {
            throw (
                lastError ??
                new Error(
                    `Abandoned Telegram send after ${opts.maxApiAttemptsPerMessage} API attempts`,
                )
            );
        }
        apiAttempts += 1;

        try {
            const result = await deliver();
            nextSendEarliestAt = Date.now() + opts.minIntervalMs;
            return result;
        } catch (error: unknown) {
            lastError = error;

            if (isTelegram429Error(error)) {
                const parsed = extractTelegramRetryAfterMs(error);
                const baseWait =
                    parsed !== null ? parsed : opts.fallback429WaitMs;
                // Clamp after jitter so max429WaitMs is a true upper bound
                const waitMs = Math.min(
                    baseWait + Math.random() * 500,
                    opts.max429WaitMs,
                );
                // Do not schedule waits past the per-message deadline
                const remainingMs = Math.max(0, deadline - Date.now());
                if (remainingMs === 0) {
                    throw error;
                }
                const boundedWaitMs = Math.min(waitMs, remainingMs);
                nextSendEarliestAt = Date.now() + boundedWaitMs;
                const source = parsed !== null ? 'retry_after' : 'fallback';
                console.log(
                    `Telegram 429: waiting ${Math.round(
                        boundedWaitMs,
                    )}ms before retry (${source}, attempt ${apiAttempts}/${
                        opts.maxApiAttemptsPerMessage
                    })`,
                );
                await sleep(boundedWaitMs);
                continue;
            }

            if (isPermanentTelegramApiError(error)) {
                throw error;
            }

            non429Failures += 1;
            if (non429Failures >= opts.maxAttempts) {
                throw error;
            }

            const delay = calculateNon429BackoffDelay(
                non429Failures - 1,
                opts.baseDelay,
                opts.maxDelay,
            );
            const boundedDelay = Math.min(
                delay,
                Math.max(0, deadline - Date.now()),
            );
            const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';
            console.log(
                `Telegram send error, retrying in ${Math.round(
                    boundedDelay,
                )}ms (non-429 ${non429Failures}/${opts.maxAttempts}):`,
                errorMessage,
            );
            if (boundedDelay > 0) {
                await sleep(boundedDelay);
            }
        }
    }
};

export const splitOverflowTgMsg = (tgMsgArray: string[]): string[] => {
    /* splitOverflowTgMsg
     *
     * Params
     * tgMsgArray - an array of unjoined strings prepared by getBlockTgMessage
     *              each string has length <= 4096 characters
     *
     * Output
     * tgMsgStrings - an array of ready-to-broadcast HTML-parsed telegram messages, all under
     *                the 4096 character limit
     */

    // Iterate over tgMsgArray to build an array of messages under the TG_MSG_MAX_LENGTH ceiling
    const tgMsgStrings = [];

    let thisTgMsgStringLength = 0;
    let sliceStartIndex = 0;
    for (let i = 0; i < tgMsgArray.length; i += 1) {
        const thisLine = tgMsgArray[i];
        // Account for the .join('\n'), each line has an extra 2 characters
        // Note: this is undocumented behavior of telegram API HTML parsing mode
        // '\n' is counted as 2 characters and also is parsed as a new line in HTML mode
        thisTgMsgStringLength += thisLine.length + 2;
        console.assert(thisLine.length + 2 <= TG_MSG_MAX_LENGTH, '%o', {
            length: thisLine.length + 2,
            line: thisLine,
            error: 'Telegram message line is longer than 4096 characters',
        });

        // If this particular message line pushes the message over TG_MSG_MAX_LENGTH
        // less 2 as there is no `\n` at the end of the last line of the msg
        if (thisTgMsgStringLength - 2 > TG_MSG_MAX_LENGTH) {
            // Build a msg string with preceding lines, i.e. do not include this i'th line
            const sliceEndIndex = i; // Note that the slice end index is not included
            tgMsgStrings.push(
                tgMsgArray.slice(sliceStartIndex, sliceEndIndex).join('\n'),
            );
            // Reset sliceStartIndex and thisTgMsgStringLength for the next message
            sliceStartIndex = sliceEndIndex;

            // Reset thisTgMsgStringLength to thisLine.length + 2;
            // The line of the current index will go into the next batched slice
            thisTgMsgStringLength = thisLine.length + 2;
        }
    }

    // Build a tg msg of all unused lines, if you have them
    if (sliceStartIndex < tgMsgArray.length) {
        tgMsgStrings.push(tgMsgArray.slice(sliceStartIndex).join('\n'));
    }

    return tgMsgStrings;
};

export const sendBlockSummary = async (
    tgMsgStrings: string[],
    telegramBot: Bot | MockTelegramBot,
    channelId: string,
    blockheightOrMsgDesc?: number | string,
) => {
    /* sendBlockSummary
     *
     * Params
     * tgMsgStrings - an array of ready-to-be broadcast HTML-parsed telegram messages,
     * all under the 4096 character length limit
     * telegramBot - a telegram bot instance
     * channelId - the channel where the messages will be broadcast
     *
     * Output
     * Message(s) will be broadcast by telegramBot to channelId
     * If there are multiple messages, each message will be sent as a reply to its
     * preceding message
     * Function returns 'false' if there is an error in sending any one message
     * Function returns an array of msgSuccess objects for each successfully send msg
     */

    let msgReplyId;
    const msgSuccessArray = [];
    for (let i = 0; i < tgMsgStrings.length; i += 1) {
        const thisMsg = tgMsgStrings[i];
        let msgSuccess: SendMessageResponse;
        const thisMsgOptions =
            typeof msgReplyId === 'number'
                ? {
                      ...config.tgMsgOptions,
                      reply_to_message_id: msgReplyId,
                  }
                : config.tgMsgOptions;
        try {
            msgSuccess = await heraldSend(
                telegramBot,
                channelId,
                thisMsg,
                thisMsgOptions,
            );
            msgReplyId = msgSuccess.message_id;
            msgSuccessArray.push(msgSuccess);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Unknown error';
            console.log(
                `Failed to send message ${i + 1} of ${
                    tgMsgStrings.length
                } after retries: ${errorMessage}`,
            );
            return false;
        }
    }
    if (msgSuccessArray.length === tgMsgStrings.length) {
        if (typeof blockheightOrMsgDesc === 'number') {
            console.log('\x1b[32m%s\x1b[0m', `✔ ${blockheightOrMsgDesc}`);
        } else if (blockheightOrMsgDesc === 'daily') {
            console.log(
                '\x1b[32m%s\x1b[0m',
                `✔ Sent daily summary of last 24 hrs`,
            );
        }
        return msgSuccessArray;
    }
    // Catch potential edge case
    console.log({
        msgsSent: msgSuccessArray.length,
        msgsAttempted: tgMsgStrings.length,
        error: 'Failed to send all messages',
    });
    return false;
};

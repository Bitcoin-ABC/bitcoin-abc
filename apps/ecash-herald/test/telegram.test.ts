// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import assert from 'assert';
import {
    prepareStringForTelegramHTML,
    splitOverflowTgMsg,
    sendBlockSummary,
    heraldSend,
    extractTelegramRetryAfterMs,
    isTelegram429Error,
    isPermanentTelegramApiError,
    resetHeraldSendStateForTests,
} from '../src/telegram';
import templates from './mocks/templates';
import tgMsgMocks from './mocks/telegramMsgs';
import block from './mocks/block';
import { MockTelegramBot, mockChannelId } from './mocks/telegramBotMock';
const {
    overflowMsg,
    overflowMsgTwo,
    overflowMsgSplit,
    overflowMsgSplitTwo,
    overflowMsgSuccess,
    nonOverflowMsg,
    nonOverflowMsgSuccess,
} = tgMsgMocks;

const { telegramHtmlStrings } = templates;

/** Fast retries for unit tests (no real pacing delay) */
const fastRetry = {
    maxAttempts: 3,
    baseDelay: 0,
    maxDelay: 0,
    minIntervalMs: 0,
    fallback429WaitMs: 0,
    max429WaitMs: 60_000,
    maxTotalWaitMs: 120_000,
};

describe('ecash-herald telegram.js functions', function () {
    beforeEach(function () {
        resetHeraldSendStateForTests();
    });

    it(`prepareStringForTelegramHTML replaces '<', '>', and '&' per specifications`, function () {
        const { safe, dangerous } = telegramHtmlStrings;
        assert.strictEqual(prepareStringForTelegramHTML(dangerous), safe);
    });
    it(`prepareStringForTelegramHTML does not change a string if it does not contain characters restricted by Telegram's API`, function () {
        const { noChangeExpected } = telegramHtmlStrings;
        assert.strictEqual(
            prepareStringForTelegramHTML(noChangeExpected),
            noChangeExpected,
        );
    });
    it(`Given a block summary string array longer than 4096 characters, splitOverflowTgMsg returns an array of strings each shorter than 4096 characters`, function () {
        assert.deepEqual(splitOverflowTgMsg(overflowMsg), overflowMsgSplit);
    });
    it(`Given a block summary string array longer than 4096 characters and with the first line of a split msg long enough to overflow without D13854 bugfix, splitOverflowTgMsg returns an array of strings each shorter than 4096 characters`, function () {
        assert.deepEqual(
            splitOverflowTgMsg(overflowMsgTwo),
            overflowMsgSplitTwo,
        );
    });
    it(`Given a block summary string array shorter than 4096 characters, splitOverflowTgMsg returns an array of a single string shorter than 4096 characters`, function () {
        assert.deepEqual(splitOverflowTgMsg(nonOverflowMsg), nonOverflowMsg);
    });
    it(`sendBlockSummary returns false if there is an error in telegramBot.sendMessage`, async function () {
        const tgMsgStrings = nonOverflowMsg;
        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        // Permanent API error — should not burn retry budget
        telegramBot.api.setExpectedError(
            'sendMessage',
            "ETELEGRAM: 400 Bad Request: can't parse entities",
        );

        assert.strictEqual(
            await sendBlockSummary(tgMsgStrings, telegramBot, channelId),
            false,
        );
    });
    it(`sendBlockSummary returns an array containing one msg success item if original msg is not > 4096 characters`, async function () {
        const tgMsgStrings = nonOverflowMsg;
        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        assert.deepEqual(
            await sendBlockSummary(tgMsgStrings, telegramBot, channelId),
            nonOverflowMsgSuccess,
        );
    });
    it(`sendBlockSummary returns an array containing a msg success item for each sent msg if original msg is > 4096 characters`, async function () {
        const tgMsgStrings = overflowMsgSplit;
        const telegramBot = new MockTelegramBot();
        const channelId = mockChannelId;

        assert.deepEqual(
            await sendBlockSummary(tgMsgStrings, telegramBot, channelId),
            overflowMsgSuccess,
        );
    });
    it(`None of the prepared telegram messages exceed the character limit of 4096`, function () {
        const TG_MSG_MAX_LENGTH = 4096;

        const thisBlock = block;
        const { blockSummaryTgMsgs } = thisBlock;
        for (let j = 0; j < blockSummaryTgMsgs.length; j += 1) {
            assert.strictEqual(
                blockSummaryTgMsgs[j].length <= TG_MSG_MAX_LENGTH,
                true,
                `Message is too long: ${blockSummaryTgMsgs[j].length} > ${TG_MSG_MAX_LENGTH}`,
            );
        }
    });

    describe('Telegram error helpers', function () {
        it(`extractTelegramRetryAfterMs reads Grammy parameters.retry_after`, function () {
            assert.strictEqual(
                extractTelegramRetryAfterMs({
                    error_code: 429,
                    parameters: { retry_after: 12 },
                }),
                12000,
            );
        });
        it(`extractTelegramRetryAfterMs reads response.body.parameters.retry_after`, function () {
            assert.strictEqual(
                extractTelegramRetryAfterMs({
                    response: { body: { parameters: { retry_after: 16 } } },
                }),
                16000,
            );
        });
        it(`extractTelegramRetryAfterMs parses retry after from message text`, function () {
            assert.strictEqual(
                extractTelegramRetryAfterMs({
                    message: 'Too Many Requests: retry after 7',
                }),
                7000,
            );
        });
        it(`extractTelegramRetryAfterMs returns null when unparseable`, function () {
            assert.strictEqual(extractTelegramRetryAfterMs(null), null);
            assert.strictEqual(extractTelegramRetryAfterMs({}), null);
        });
        it(`isTelegram429Error detects error_code and statusCode`, function () {
            assert.strictEqual(isTelegram429Error({ error_code: 429 }), true);
            assert.strictEqual(
                isTelegram429Error({
                    response: { statusCode: 429, body: { error_code: 429 } },
                }),
                true,
            );
            assert.strictEqual(
                isTelegram429Error({
                    message: 'ETELEGRAM: 429 Too Many Requests',
                }),
                true,
            );
            assert.strictEqual(
                isTelegram429Error({
                    message: 'ETELEGRAM: 429: retry after 2',
                }),
                true,
            );
            assert.strictEqual(isTelegram429Error({ error_code: 400 }), false);
            // Bare "429" in unrelated text (chat / message ids) must not match
            assert.strictEqual(
                isTelegram429Error({
                    message: 'Failed to send to chat -1004299999999',
                }),
                false,
            );
            assert.strictEqual(isTelegram429Error({ message: '429' }), false);
        });
        it(`isPermanentTelegramApiError detects 4xx except 429`, function () {
            assert.strictEqual(
                isPermanentTelegramApiError({ error_code: 400 }),
                true,
            );
            assert.strictEqual(
                isPermanentTelegramApiError({
                    message: 'ETELEGRAM: 401 Unauthorized',
                }),
                true,
            );
            assert.strictEqual(
                isPermanentTelegramApiError({ error_code: 429 }),
                false,
            );
            assert.strictEqual(
                isPermanentTelegramApiError({
                    message: 'socket hang up',
                }),
                false,
            );
        });
    });

    // Tests for heraldSend retry logic
    describe('heraldSend retry logic', function () {
        it(`should retry on network errors like 'socket hang up'`, async function () {
            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;

            // Mock a network error that should be retried for all 3 attempts
            telegramBot.api.setCallCountError(
                'sendMessage',
                'socket hang up',
                3,
            );

            try {
                await heraldSend(
                    telegramBot,
                    channelId,
                    'Test message',
                    {},
                    fastRetry,
                );
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.strictEqual((error as Error).message, 'socket hang up');
                assert.strictEqual(telegramBot.api.callCount, 3); // Should have tried 3 times
            }
        });

        it(`should retry on EFATAL network errors`, async function () {
            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;

            // Mock EFATAL error that should be retried for all 3 attempts
            telegramBot.api.setCallCountError(
                'sendMessage',
                'Network connection failed',
                3,
            );

            try {
                await heraldSend(
                    telegramBot,
                    channelId,
                    'Test message',
                    {},
                    fastRetry,
                );
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.strictEqual(
                    (error as Error).message,
                    'Network connection failed',
                );
                assert.strictEqual(telegramBot.api.callCount, 3); // Should have tried 3 times
            }
        });

        it(`should retry on ECONNRESET network errors`, async function () {
            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;

            // Override sendMessage to track calls and throw ECONNRESET
            let callCount = 0;
            telegramBot.api.sendMessage = () => {
                callCount++;
                const networkError = new Error(
                    'ECONNRESET: Connection reset by peer',
                );
                throw networkError;
            };

            try {
                await heraldSend(
                    telegramBot,
                    channelId,
                    'Test message',
                    {},
                    fastRetry,
                );
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.strictEqual(
                    (error as Error).message,
                    'ECONNRESET: Connection reset by peer',
                );
                assert.strictEqual(callCount, 3); // Should have tried 3 times
            }
        });

        it(`should retry on ETIMEDOUT network errors`, async function () {
            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;

            // Override sendMessage to track calls and throw ETIMEDOUT
            let callCount = 0;
            telegramBot.api.sendMessage = () => {
                callCount++;
                const networkError = new Error(
                    'ETIMEDOUT: Connection timed out',
                );
                throw networkError;
            };

            try {
                await heraldSend(
                    telegramBot,
                    channelId,
                    'Test message',
                    {},
                    fastRetry,
                );
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.strictEqual(
                    (error as Error).message,
                    'ETIMEDOUT: Connection timed out',
                );
                assert.strictEqual(callCount, 3); // Should have tried 3 times
            }
        });

        it(`should NOT retry on API errors like 400 Bad Request`, async function () {
            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;

            // Override sendMessage to track calls and throw API error
            let callCount = 0;
            telegramBot.api.sendMessage = () => {
                callCount++;
                const apiError = new Error(
                    "ETELEGRAM: 400 Bad Request: can't parse entities",
                ) as Error & { code: string };
                apiError.code = 'ETELEGRAM';
                throw apiError;
            };

            try {
                await heraldSend(
                    telegramBot,
                    channelId,
                    'Test message',
                    {},
                    fastRetry,
                );
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.strictEqual(
                    (error as Error).message,
                    "ETELEGRAM: 400 Bad Request: can't parse entities",
                );
                assert.strictEqual(callCount, 1); // Should have tried only once (no retry)
            }
        });

        it(`should NOT retry on 401 Unauthorized errors`, async function () {
            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;

            // Override sendMessage to track calls and throw auth error
            let callCount = 0;
            telegramBot.api.sendMessage = () => {
                callCount++;
                const authError = new Error(
                    'ETELEGRAM: 401 Unauthorized',
                ) as Error & { code: string };
                authError.code = 'ETELEGRAM';
                throw authError;
            };

            try {
                await heraldSend(
                    telegramBot,
                    channelId,
                    'Test message',
                    {},
                    fastRetry,
                );
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.strictEqual(
                    (error as Error).message,
                    'ETELEGRAM: 401 Unauthorized',
                );
                assert.strictEqual(callCount, 1); // Should have tried only once (no retry)
            }
        });

        it(`should succeed after retry on temporary network error`, async function () {
            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;

            // Mock sendMessage to fail twice, then succeed on third call
            telegramBot.api.setCallCountError(
                'sendMessage',
                'socket hang up',
                2,
            );

            const result = await heraldSend(
                telegramBot,
                channelId,
                'Test message',
                {},
                { ...fastRetry, baseDelay: 1, maxDelay: 10 },
            );
            assert.strictEqual(telegramBot.api.callCount, 3); // Should have tried 3 times
            assert.strictEqual(
                (result as unknown as { success: boolean }).success,
                true,
            ); // Should succeed
        });

        it(`should honor Telegram retry_after on 429 then succeed`, async function () {
            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;
            let callCount = 0;

            telegramBot.api.sendMessage = () => {
                callCount++;
                if (callCount === 1) {
                    const rateLimitError = new Error(
                        'ETELEGRAM: 429 Too Many Requests: retry after 1',
                    ) as Error & {
                        error_code: number;
                        parameters: { retry_after: number };
                    };
                    rateLimitError.error_code = 429;
                    // Fractional second keeps the unit test fast
                    rateLimitError.parameters = { retry_after: 0.01 };
                    throw rateLimitError;
                }
                return {
                    success: true,
                    chat_id: channelId,
                    text: 'Test message',
                    options: {},
                };
            };

            const result = await heraldSend(
                telegramBot,
                channelId,
                'Test message',
                {},
                { ...fastRetry, maxApiAttemptsPerMessage: 10 },
            );
            assert.strictEqual(callCount, 2);
            assert.strictEqual(
                (result as unknown as { success: boolean }).success,
                true,
            );
        });

        it(`should not count 429 retries against maxAttempts`, async function () {
            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;
            let callCount = 0;

            telegramBot.api.sendMessage = () => {
                callCount++;
                if (callCount <= 4) {
                    const rateLimitError = new Error(
                        '429 Too Many Requests',
                    ) as Error & {
                        error_code: number;
                        parameters: { retry_after: number };
                    };
                    rateLimitError.error_code = 429;
                    rateLimitError.parameters = { retry_after: 0.001 };
                    throw rateLimitError;
                }
                return {
                    success: true,
                    chat_id: channelId,
                    text: 'Test message',
                    options: {},
                };
            };

            const result = await heraldSend(
                telegramBot,
                channelId,
                'Test message',
                {},
                {
                    ...fastRetry,
                    maxAttempts: 2,
                    maxApiAttemptsPerMessage: 10,
                },
            );
            assert.strictEqual(callCount, 5);
            assert.strictEqual(
                (result as unknown as { success: boolean }).success,
                true,
            );
        });

        it(`should abandon after maxApiAttemptsPerMessage on repeated 429`, async function () {
            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;
            let callCount = 0;

            telegramBot.api.sendMessage = () => {
                callCount++;
                const rateLimitError = new Error(
                    '429 Too Many Requests',
                ) as Error & {
                    error_code: number;
                    parameters: { retry_after: number };
                };
                rateLimitError.error_code = 429;
                rateLimitError.parameters = { retry_after: 0.001 };
                throw rateLimitError;
            };

            try {
                await heraldSend(
                    telegramBot,
                    channelId,
                    'Test message',
                    {},
                    {
                        ...fastRetry,
                        maxApiAttemptsPerMessage: 3,
                        fallback429WaitMs: 1,
                    },
                );
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.strictEqual(
                    (error as Error).message,
                    '429 Too Many Requests',
                );
                assert.strictEqual(callCount, 3);
            }
        });

        it(`should clamp retry_after waits to max429WaitMs`, async function () {
            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;
            let callCount = 0;

            telegramBot.api.sendMessage = () => {
                callCount++;
                if (callCount === 1) {
                    const rateLimitError = new Error(
                        'ETELEGRAM: 429 Too Many Requests',
                    ) as Error & {
                        error_code: number;
                        parameters: { retry_after: number };
                    };
                    rateLimitError.error_code = 429;
                    // Would be 10s without the clamp
                    rateLimitError.parameters = { retry_after: 10 };
                    throw rateLimitError;
                }
                return {
                    success: true,
                    chat_id: channelId,
                    text: 'Test message',
                    options: {},
                };
            };

            const started = Date.now();
            const result = await heraldSend(
                telegramBot,
                channelId,
                'Test message',
                {},
                {
                    ...fastRetry,
                    max429WaitMs: 30,
                    maxApiAttemptsPerMessage: 5,
                },
            );
            const elapsed = Date.now() - started;
            assert.strictEqual(callCount, 2);
            assert.strictEqual(
                (result as unknown as { success: boolean }).success,
                true,
            );
            // Clamped wait + jitter (≤500ms) — must not honor the full 10s
            assert.ok(elapsed < 2000, `elapsed ${elapsed}ms looked unclamped`);
        });

        it(`should abandon when maxTotalWaitMs deadline is reached`, async function () {
            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;
            let callCount = 0;

            telegramBot.api.sendMessage = () => {
                callCount++;
                const rateLimitError = new Error(
                    'ETELEGRAM: 429 Too Many Requests',
                ) as Error & {
                    error_code: number;
                };
                rateLimitError.error_code = 429;
                throw rateLimitError;
            };

            const started = Date.now();
            try {
                await heraldSend(
                    telegramBot,
                    channelId,
                    'Test message',
                    {},
                    {
                        ...fastRetry,
                        maxApiAttemptsPerMessage: 100,
                        fallback429WaitMs: 40,
                        maxTotalWaitMs: 80,
                    },
                );
                assert.fail('Expected error to be thrown');
            } catch (error) {
                const elapsed = Date.now() - started;
                assert.ok(callCount >= 1);
                assert.ok(
                    elapsed < 2000,
                    `elapsed ${elapsed}ms exceeded expected deadline window`,
                );
                assert.strictEqual(
                    (error as Error).message,
                    'ETELEGRAM: 429 Too Many Requests',
                );
            }
        });

        it(`should serialize concurrent heraldSend calls`, async function () {
            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;
            const order: string[] = [];
            let inFlight = 0;
            let maxInFlight = 0;

            telegramBot.api.sendMessage = async (
                _chatId: string,
                text: string,
            ) => {
                inFlight++;
                maxInFlight = Math.max(maxInFlight, inFlight);
                await new Promise(resolve => setTimeout(resolve, 5));
                order.push(text);
                inFlight--;
                return {
                    success: true,
                    chat_id: channelId,
                    text,
                    options: {},
                };
            };

            await Promise.all([
                heraldSend(telegramBot, channelId, 'a', {}, fastRetry),
                heraldSend(telegramBot, channelId, 'b', {}, fastRetry),
                heraldSend(telegramBot, channelId, 'c', {}, fastRetry),
            ]);

            assert.strictEqual(maxInFlight, 1);
            assert.deepEqual(order, ['a', 'b', 'c']);
        });
    });
});

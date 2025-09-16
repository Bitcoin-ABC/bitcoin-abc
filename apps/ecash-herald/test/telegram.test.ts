// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import assert from 'assert';
import {
    prepareStringForTelegramHTML,
    splitOverflowTgMsg,
    sendBlockSummary,
    heraldSend,
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

describe('ecash-herald telegram.js functions', function () {
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

        // Set an expected error in sendMessage method
        telegramBot.setExpectedError(
            'sendMessage',
            'Error: message failed to send',
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

    // Tests for heraldSend retry logic
    describe('heraldSend retry logic', function () {
        it(`should retry on network errors like 'socket hang up'`, async function () {
            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;

            // Mock a network error that should be retried for all 3 attempts
            telegramBot.setCallCountError('sendMessage', 'socket hang up', 3);

            try {
                await heraldSend(
                    telegramBot,
                    channelId,
                    'Test message',
                    {},
                    3,
                    0,
                );
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.strictEqual((error as Error).message, 'socket hang up');
                assert.strictEqual(telegramBot.callCount, 3); // Should have tried 3 times
            }
        });

        it(`should retry on EFATAL network errors`, async function () {
            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;

            // Mock EFATAL error that should be retried for all 3 attempts
            telegramBot.setCallCountError(
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
                    3,
                    0,
                );
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.strictEqual(
                    (error as Error).message,
                    'Network connection failed',
                );
                assert.strictEqual(telegramBot.callCount, 3); // Should have tried 3 times
            }
        });

        it(`should retry on ECONNRESET network errors`, async function () {
            const telegramBot = new MockTelegramBot();
            const channelId = mockChannelId;

            // Override sendMessage to track calls and throw ECONNRESET
            let callCount = 0;
            telegramBot.sendMessage = () => {
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
                    3,
                    0,
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
            telegramBot.sendMessage = () => {
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
                    3,
                    0,
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
            telegramBot.sendMessage = () => {
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
                    3,
                    0,
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
            telegramBot.sendMessage = () => {
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
                    3,
                    0,
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
            telegramBot.setCallCountError('sendMessage', 'socket hang up', 2);

            const result = await heraldSend(
                telegramBot,
                channelId,
                'Test message',
                {},
                3,
                15,
            );
            assert.strictEqual(telegramBot.callCount, 3); // Should have tried 3 times
            assert.strictEqual(
                (result as unknown as { success: boolean }).success,
                true,
            ); // Should succeed
        });
    });
});

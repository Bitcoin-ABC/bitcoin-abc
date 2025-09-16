// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import config from '../config';
import TelegramBot, {
    Message,
    SendMessageOptions,
} from 'node-telegram-bot-api';
import { MockTelegramBot } from '../test/mocks/telegramBotMock';
import { SendMessageResponse } from './events';

interface NetworkError extends Error {
    code?: string;
}

// undocumented API behavior of HTML parsing mode, discovered through brute force
const TG_MSG_MAX_LENGTH = 4096;

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
 * Send a Telegram message with retry logic for network errors
 * @param telegramBot Telegram bot instance
 * @param channelId Channel ID to send to
 * @param message Message to send
 * @param options Send message options
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @param baseDelay Base delay in milliseconds (default: 1000)
 * @returns Promise that resolves with the message result or rejects with the final error
 */
export const heraldSend = async (
    telegramBot: TelegramBot | MockTelegramBot,
    channelId: string,
    message: string,
    options: any,
    maxRetries: number = 3,
    baseDelay: number = 1000,
): Promise<SendMessageResponse> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return (await telegramBot.sendMessage(
                channelId,
                message,
                options,
            )) as SendMessageResponse;
        } catch (error: unknown) {
            // Don't retry on the last attempt
            if (attempt === maxRetries) {
                throw error;
            }

            // Only retry on network errors, not API errors e.g telegram syntax failures
            const networkError = error as NetworkError;
            const isNetworkError =
                networkError.code === 'EFATAL' ||
                networkError.message?.includes('socket hang up') ||
                networkError.message?.includes('ECONNRESET') ||
                networkError.message?.includes('ETIMEDOUT') ||
                networkError.message?.includes('ENOTFOUND') ||
                networkError.message?.includes('ECONNREFUSED');

            if (isNetworkError) {
                const delay =
                    baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
                console.log(
                    `Network error on attempt ${attempt}/${maxRetries}, retrying in ${Math.round(
                        delay,
                    )}ms:`,
                    networkError.message,
                );
                if (baseDelay > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                continue;
            }

            // Don't retry API errors (like 400 Bad Request, 401 Unauthorized, etc.)
            throw error;
        }
    }
    // Not expected to happen, satisfies typescript
    throw new Error('Retry logic failed unexpectedly');
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
    telegramBot: TelegramBot | MockTelegramBot,
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
        let msgSuccess: Message | SendMessageResponse;
        const thisMsgOptions: SendMessageOptions =
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

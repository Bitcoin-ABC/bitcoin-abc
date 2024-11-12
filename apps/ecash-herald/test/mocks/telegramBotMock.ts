// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/* Mock node-telegram-bot-api TelegramBot instance
 * Supports sendMessage function
 */
import { SendMessageOptions } from 'node-telegram-bot-api';
export const mockChannelId = '-1001999999999';

interface SendMessageResponse {
    success: boolean;
    channelId: string;
    msg: string;
    options: SendMessageOptions;
}

export interface MockTelegramBotInterface {
    messageSent: boolean;
    errors: { [key: string]: string | undefined };
    sendMessage: (
        channelId: string,
        msg: string,
        options: SendMessageOptions,
    ) => SendMessageResponse;
    setExpectedError: (method: string, error: string) => void;
}

export class MockTelegramBot implements MockTelegramBotInterface {
    public messageSent = false;
    public errors: { [key: string]: string | undefined } = {};
    public sendMessage(
        channelId: string,
        msg: string,
        options: SendMessageOptions,
    ): SendMessageResponse {
        if (!this.errors.sendMessage) {
            this.messageSent = true;
            return { success: true, channelId, msg, options };
        }
        throw new Error(this.errors.sendMessage || 'Unknown error');
    }

    public setExpectedError(method: string, error: string): void {
        this.errors[method] = error;
    }
}

// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/* Mock node-telegram-bot-api TelegramBot instance
 * Supports sendMessage function
 */
import { SendMessageOptions } from 'node-telegram-bot-api';
export const mockChannelId = '-1001999999999';

interface NetworkError extends Error {
    code?: string;
}

export interface SendMessageResponse {
    success: boolean;
    channelId: string;
    msg: string;
    options: SendMessageOptions;
}

export interface MockTelegramBotInterface {
    messageSent: boolean;
    errors: { [key: string]: string | undefined };
    callCount: number;
    sendMessage: (
        channelId: string,
        msg: string,
        options: SendMessageOptions,
    ) => SendMessageResponse;
    setExpectedError: (method: string, error: string) => void;
    setCallCountError: (
        method: string,
        error: string,
        failUntilCall: number,
    ) => void;
    resetCallCount: () => void;
}

export class MockTelegramBot implements MockTelegramBotInterface {
    public messageSent = false;
    public errors: { [key: string]: string | undefined } = {};
    public callCount = 0;
    private callCountErrors: {
        [key: string]: { error: string; failUntilCall: number };
    } = {};

    public sendMessage(
        channelId: string,
        msg: string,
        options: SendMessageOptions,
    ): SendMessageResponse {
        this.callCount++;

        // Check for call count based errors first
        const callCountError = this.callCountErrors.sendMessage;
        if (callCountError && this.callCount <= callCountError.failUntilCall) {
            const error = new Error(callCountError.error) as NetworkError;
            // Add error code for network errors
            if (
                callCountError.error.includes('socket hang up') ||
                callCountError.error.includes('Network connection failed')
            ) {
                error.code = 'EFATAL';
            }
            throw error;
        }

        // Check for regular errors
        if (!this.errors.sendMessage) {
            this.messageSent = true;
            return { success: true, channelId, msg, options };
        }
        throw new Error(this.errors.sendMessage || 'Unknown error');
    }

    public setExpectedError(method: string, error: string): void {
        this.errors[method] = error;
    }

    public setCallCountError(
        method: string,
        error: string,
        failUntilCall: number,
    ): void {
        this.callCountErrors[method] = { error, failUntilCall };
    }

    public resetCallCount(): void {
        this.callCount = 0;
        this.callCountErrors = {};
        this.errors = {};
    }
}

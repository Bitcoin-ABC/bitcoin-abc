// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';

/* Mock node-telegram-bot-api TelegramBot instance
 * Supports sendMessage function
 */

module.exports = {
    MockTelegramBot: class {
        constructor() {
            // Use self since it is not a reserved term in js
            // Can access self from inside a method and still get the class
            const self = this;
            self.messageSent = false;
            self.errors = {};
            self.sendMessage = async function (channelId, msg, options) {
                if (!self.errors.sendMessage) {
                    self.messageSent = true;
                    return { success: true, channelId, msg, options };
                }
                throw new Error(self.errors.sendMessage);
            };
            self.setExpectedError = function (method, error) {
                self.errors[method] = error;
            };
        }
    },
    mockChannelId: '-1001999999999',
};

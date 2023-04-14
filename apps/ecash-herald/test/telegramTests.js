// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const assert = require('assert');
const { prepareStringForTelegramHTML } = require('../src/telegram');
const { telegramHtmlStrings } = require('./mocks/templates');

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
});

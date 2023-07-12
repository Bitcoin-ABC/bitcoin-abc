// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';
const assert = require('assert');
const { buildAliasTgMsg, sendAliasAnnouncements } = require('../src/telegram');
const MockAdapter = require('axios-mock-adapter');
const axios = require('axios');
const { MockTelegramBot, mockChannelId } = require('./mocks/telegramBotMock');
const { generated } = require('./mocks/aliasMocks');

describe('alias-server telegram.js', function () {
    const aliasObj = {
        address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
        alias: '1',
        blockheight: 792417,
        txid: 'ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d',
    };
    it('buildAliasTgMsg returns expected string for registered alias tx and a given fiat price', function () {
        const xecPrice = '0.000033';
        assert.strictEqual(
            buildAliasTgMsg(aliasObj, xecPrice),
            'alias "1" <a href="https://explorer.e.cash/tx/ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d">registered</a> to <a href="https://explorer.e.cash/address/ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj">qpm...asj</a> for $0.0002',
        );
    });
    it('buildAliasTgMsg returns expected string for registered alias tx and failed fiat price fetch', function () {
        const xecPrice = false;
        assert.strictEqual(
            buildAliasTgMsg(aliasObj, xecPrice),
            'alias "1" <a href="https://explorer.e.cash/tx/ec92610fc41df2387e7febbb358b138a802ac26023f30b2442aa01ca733fff7d">registered</a> to <a href="https://explorer.e.cash/address/ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj">qpm...asj</a> for 5.58 XEC',
        );
    });
    // Assume you get these first three registrations in one run of handleBlockConnected
    const newAliasRegistrations = generated.validAliasRegistrations.slice(0, 3);
    it('sendAliasAnnouncements does nothing if telegramBot is null', async function () {
        assert.strictEqual(
            await sendAliasAnnouncements(
                null,
                mockChannelId,
                newAliasRegistrations,
            ),
            undefined,
        );
    });
    it('sendAliasAnnouncements sends multiple alias announcements on successful price API call', async function () {
        // Mock good API price
        // Mock a successful API request
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });
        const mockResult = { ecash: { usd: 3.331e-5 } };
        mock.onGet().reply(200, mockResult);

        // mock expected tg msgs
        const telegramBot = new MockTelegramBot();
        // Set expected tg mock responses
        const options = {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
        };
        const success = true;
        // Build expected result
        let expectedTgPromiseResults = [];
        for (let i in newAliasRegistrations) {
            const msg = buildAliasTgMsg(
                newAliasRegistrations[i],
                mockResult.ecash.usd,
            );
            expectedTgPromiseResults.push({
                msg,
                channelId: mockChannelId,
                options,
                success,
            });
        }
        assert.deepEqual(
            await sendAliasAnnouncements(
                telegramBot,
                mockChannelId,
                newAliasRegistrations,
            ),
            expectedTgPromiseResults,
        );
    });
    it('sendAliasAnnouncements sends multiple alias announcements on failed price API call', async function () {
        // Mock good API price
        // Mock a successful API request
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });
        const mockResult = { error: 'API is down' };
        mock.onGet().reply(500, mockResult);

        // mock expected tg msgs
        const telegramBot = new MockTelegramBot();
        // Set expected tg mock responses
        const options = {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
        };
        const success = true;
        // Build expected result
        let expectedTgPromiseResults = [];
        for (let i in newAliasRegistrations) {
            const msg = buildAliasTgMsg(
                newAliasRegistrations[i],
                false, // result of bad price API
            );
            expectedTgPromiseResults.push({
                msg,
                channelId: mockChannelId,
                options,
                success,
            });
        }
        assert.deepEqual(
            await sendAliasAnnouncements(
                telegramBot,
                mockChannelId,
                newAliasRegistrations,
            ),
            expectedTgPromiseResults,
        );
    });
    it('sendAliasAnnouncements returns tg error instead of throwing one if there is an error in sending a msg', async function () {
        // Mock good API price
        // Mock a successful API request
        const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });
        const mockResult = { ecash: { usd: 3.331e-5 } };
        mock.onGet().reply(200, mockResult);

        // mock expected tg msgs
        const telegramBot = new MockTelegramBot();
        // Set an expected error in sendMessage method
        const expectedError = 'Message failed to send';
        telegramBot.setExpectedError('sendMessage', expectedError);

        // Build expected result
        let expectedTgPromiseResults = Array(newAliasRegistrations.length)
            .join('.')
            .split('.')
            .map(() => {
                return new Error(expectedError);
            });

        assert.deepEqual(
            await sendAliasAnnouncements(
                telegramBot,
                mockChannelId,
                newAliasRegistrations,
            ),
            expectedTgPromiseResults,
        );
    });
});

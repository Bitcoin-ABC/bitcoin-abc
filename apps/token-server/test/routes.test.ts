// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as http from 'http';
import request from 'supertest';
import config from '../config';
import cashaddr from 'ecashaddrjs';
import { startExpressServer } from '../src/routes';
import { MockChronikClient } from '../../../modules/mock-chronik-client';
import TelegramBot from 'node-telegram-bot-api';
import { createFsFromVolume, vol } from 'memfs';
import sharp from 'sharp';

describe('routes.js', async function () {
    let app: http.Server;
    const ELIGIBLE_ADDRESS = 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y';
    const ELIGIBLE_OUTPUTSCRIPT =
        cashaddr.getOutputScriptFromAddress(ELIGIBLE_ADDRESS);
    const INELIGIBLE_ADDRESS =
        'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
    const INELIGIBLE_OUTPUTSCRIPT =
        cashaddr.getOutputScriptFromAddress(INELIGIBLE_ADDRESS);
    const ERROR_ADDRESS = 'ecash:erroraddress';
    let mockedChronikClient = new MockChronikClient();
    // Set an eligible mock
    // Seen ~ 2x before the amount of time required
    const eligibleTimeFirstSeen =
        Math.ceil(Date.now() / 1000) - 2 * config.eligibilityResetSeconds;
    mockedChronikClient.setAddress(ELIGIBLE_ADDRESS);
    mockedChronikClient.setTxHistoryByAddress(ELIGIBLE_ADDRESS, [
        {
            timeFirstSeen: eligibleTimeFirstSeen,
            inputs: [{ outputScript: config.serverOutputScript }],
            outputs: [
                {
                    outputScript: ELIGIBLE_OUTPUTSCRIPT,
                    token: { tokenId: config.rewardsTokenId },
                },
            ],
        },
    ]);
    // Set an ineligible mock
    // Seen just now
    const ineligibleTimeFirstSeen = Math.ceil(Date.now() / 1000);
    mockedChronikClient.setAddress(INELIGIBLE_ADDRESS);
    mockedChronikClient.setTxHistoryByAddress(INELIGIBLE_ADDRESS, [
        {
            timeFirstSeen: ineligibleTimeFirstSeen,
            inputs: [{ outputScript: config.serverOutputScript }],
            outputs: [
                {
                    outputScript: INELIGIBLE_OUTPUTSCRIPT,
                    token: { tokenId: config.rewardsTokenId },
                },
            ],
        },
    ]);
    // Mock chronik throwing an error
    mockedChronikClient.setAddress(ERROR_ADDRESS);
    mockedChronikClient.setTxHistoryByAddress(
        ERROR_ADDRESS,
        new Error('some chronik error'),
    );

    // Mock a stub telegram bot
    const mockedTgBot = { sendPhoto: () => {} };

    // Initialize fs, to be memfs in these tests
    let fs: any;
    beforeEach(async () => {
        // Mock expected file structure for fs
        const fileStructureJson: any = {};
        // Create mock empty directories for all supported sizes
        for (const size of config.iconSizes) {
            fileStructureJson[`${size}`] = null;
        }
        vol.fromJSON(fileStructureJson, config.imageDir);
        fs = createFsFromVolume(vol);
        const TEST_PORT = 5000;
        app = startExpressServer(
            TEST_PORT,
            mockedChronikClient,
            mockedTgBot as unknown as TelegramBot,
            fs,
        );
    });
    afterEach(async () => {
        // Reset mocked fs
        vol.reset();
        // Stop express server
        app.close();
    });
    it('/status returns expected status', function () {
        return request(app)
            .get('/status')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({ status: 'running' });
    });
    it('/is-eligible/:address returns expected status for an ineligible address', function () {
        return request(app)
            .get(`/is-eligible/${INELIGIBLE_ADDRESS}`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({
                address: INELIGIBLE_ADDRESS,
                isEligible: false,
                becomesEligible:
                    ineligibleTimeFirstSeen + config.eligibilityResetSeconds,
            });
    });
    it('/is-eligible/:address returns expected status for an eligible address', function () {
        return request(app)
            .get(`/is-eligible/${ELIGIBLE_ADDRESS}`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({ address: ELIGIBLE_ADDRESS, isEligible: true });
    });
    it('/is-eligible/:address returns expected error status on chronik error', function () {
        return request(app)
            .get(`/is-eligible/${ERROR_ADDRESS}`)
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                error: 'Error fetching /is-eligible/ecash:erroraddress',
            });
    });
    it('We get a rendered blockie for a valid token image request', function () {
        return request(app)
            .get(
                `/512/3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae3cf17ce3ef4d109.png`,
            )
            .expect(200)
            .expect('Content-Type', /image\/png/);
    });
    it('We get a 404 for an invalid token icon requeset', function () {
        return request(app)
            .get(
                `/512/3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae3cf17ce3ef4d109.jpg`,
            )
            .expect(404)
            .expect('Content-Type', /json/)
            .expect({
                error: 'Could not find /512/3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae3cf17ce3ef4d109.jpg',
            });
    });
    it('We get a 404 for any request not handled by other endpoints', function () {
        return request(app)
            .get(`/some/request/test`)
            .expect(404)
            .expect('Content-Type', /json/)
            .expect({
                error: 'Could not find /some/request/test',
            });
    });
    it('We receive a 500 error if post has no file', function () {
        return request(app)
            .post(`/new`)
            .field('newTokenName', 'Test Token')
            .field('newTokenTicker', 'TST')
            .field('newTokenDecimals', 3)
            .field('newTokenDocumentUrl', 'https://cashtab.com/')
            .field('newTokenInitialQty', '10000')
            .field(
                'tokenId',
                '1111111111111111111111111111111111111111111111111111111111111111',
            )
            .attach(
                'tokenIcon',
                Buffer.alloc(config.maxUploadSize - 1, 1),
                // no file name
            )
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                status: 'error',
                msg: `No file in "/new" token icon request`,
            });
    });
    it('We receive a 500 error if image upload exceeds server limit', function () {
        return request(app)
            .post(`/new`)
            .field('newTokenName', 'Test Token')
            .field('newTokenTicker', 'TST')
            .field('newTokenDecimals', 3)
            .field('newTokenDocumentUrl', 'https://cashtab.com/')
            .field('newTokenInitialQty', '10000')
            .field(
                'tokenId',
                '1111111111111111111111111111111111111111111111111111111111111111',
            )
            .attach(
                'tokenIcon',
                Buffer.alloc(config.maxUploadSize, 1),
                'mockicon.png',
            )
            .expect(500)
            .expect('Content-Type', 'text/html; charset=utf-8')
            .expect(/MulterError: File too large/);
    });
    it('We can accept a png upload and resize it on the server', async function () {
        // Create a mock 512x512 png that sharp can process
        const semiTransparentRedPng = await sharp({
            create: {
                width: 512,
                height: 512,
                channels: 4,
                background: { r: 255, g: 0, b: 0, alpha: 0.5 },
            },
        })
            .png()
            .toBuffer();

        return request(app)
            .post(`/new`)
            .field('newTokenName', 'Test Token')
            .field('newTokenTicker', 'TST')
            .field('newTokenDecimals', 3)
            .field('newTokenDocumentUrl', 'https://cashtab.com/')
            .field('newTokenInitialQty', '10000')
            .field(
                'tokenId',
                '1111111111111111111111111111111111111111111111111111111111111111',
            )
            .attach('tokenIcon', semiTransparentRedPng, 'mockicon.png')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({
                status: 'ok',
            });
    });
    it('A png upload request from a non-whitelisted domain is rejected', async function () {
        // Create a mock 512x512 png that sharp can process
        const semiTransparentRedPng = await sharp({
            create: {
                width: 512,
                height: 512,
                channels: 4,
                background: { r: 255, g: 0, b: 0, alpha: 0.5 },
            },
        })
            .png()
            .toBuffer();

        return request(app)
            .post(`/new`)
            .set('Origin', 'https://notcashtab.com/')
            .field('newTokenName', 'Test Token')
            .field('newTokenTicker', 'TST')
            .field('newTokenDecimals', 3)
            .field('newTokenDocumentUrl', 'https://cashtab.com/')
            .field('newTokenInitialQty', '10000')
            .field(
                'tokenId',
                '1111111111111111111111111111111111111111111111111111111111111111',
            )
            .attach('tokenIcon', semiTransparentRedPng, 'mockicon.png')
            .expect(500)
            .expect('Content-Type', 'text/html; charset=utf-8')
            .expect(/Not allowed by CORS/);
    });
    it('If the token icon already exists on the server, the /new request is rejected', async function () {
        // Create a mock 512x512 png that sharp can process
        const semiTransparentRedPng = await sharp({
            create: {
                width: 512,
                height: 512,
                channels: 4,
                background: { r: 255, g: 0, b: 0, alpha: 0.5 },
            },
        })
            .png()
            .toBuffer();

        // First request is ok
        await request(app)
            .post(`/new`)
            .field('newTokenName', 'Test Token')
            .field('newTokenTicker', 'TST')
            .field('newTokenDecimals', 3)
            .field('newTokenDocumentUrl', 'https://cashtab.com/')
            .field('newTokenInitialQty', '10000')
            .field(
                'tokenId',
                '1111111111111111111111111111111111111111111111111111111111111111',
            )
            .attach('tokenIcon', semiTransparentRedPng, 'mockicon.png')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({
                status: 'ok',
            });

        // Now an identical request will fail
        return request(app)
            .post(`/new`)
            .field('newTokenName', 'Test Token')
            .field('newTokenTicker', 'TST')
            .field('newTokenDecimals', 3)
            .field('newTokenDocumentUrl', 'https://cashtab.com/')
            .field('newTokenInitialQty', '10000')
            .field(
                'tokenId',
                '1111111111111111111111111111111111111111111111111111111111111111',
            )
            .attach('tokenIcon', semiTransparentRedPng, 'mockicon.png')
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                status: 'error',
                msg: `Token icon already exists for 1111111111111111111111111111111111111111111111111111111111111111`,
            });
    });
    it('We only accept pngs at the /new post endpoint', async function () {
        const semiTransparentRedJpg = await sharp({
            create: {
                width: 512,
                height: 512,
                channels: 4,
                background: { r: 255, g: 0, b: 0, alpha: 0.5 },
            },
        })
            .jpeg()
            .toBuffer();

        return request(app)
            .post(`/new`)
            .field('newTokenName', 'Test Token')
            .field('newTokenTicker', 'TST')
            .field('newTokenDecimals', 3)
            .field('newTokenDocumentUrl', 'https://cashtab.com/')
            .field('newTokenInitialQty', '10000')
            .field(
                'tokenId',
                '1111111111111111111111111111111111111111111111111111111111111111',
            )
            .attach('tokenIcon', semiTransparentRedJpg, 'mockicon.jpg')
            .expect(403)
            .expect('Content-Type', /json/)
            .expect({
                status: 'error',
                msg: 'Only .png files are allowed.',
            });
    });
    it('Error in sharp resize is handled', async function () {
        return request(app)
            .post(`/new`)
            .field('newTokenName', 'Test Token')
            .field('newTokenTicker', 'TST')
            .field('newTokenDecimals', 3)
            .field('newTokenDocumentUrl', 'https://cashtab.com/')
            .field('newTokenInitialQty', '10000')
            .field(
                'tokenId',
                '1111111111111111111111111111111111111111111111111111111111111111',
            )
            .attach(
                'tokenIcon',
                Buffer.alloc(config.maxUploadSize - 1, 1),
                'mockicon.png',
            )
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                status: 'error',
                msg: 'Error resizing uploaded token icon',
            });
    });
});

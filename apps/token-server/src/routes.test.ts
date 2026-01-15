// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as http from 'http';
import request from 'supertest';
import config from '../config';
import { startExpressServer } from '../src/routes';
import { Bot } from 'grammy';
import { createFsFromVolume, vol, IFs, DirectoryJSON } from 'memfs';
import sharp from 'sharp';
import { MongoClient, Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { initializeDb, initialBlacklist } from '../src/db';

// Clone initialBlacklist before initializing the database
// initializeDb(initialBlacklist) will modify the entries by adding an "_id" key
const mockBlacklist = initialBlacklist.map(entry => ({ ...entry }));

describe('routes.js', function () {
    let mongoServer: MongoMemoryServer, testMongoClient: MongoClient;
    before(async () => {
        // Start mongo memory server before running this suite of unit tests
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        testMongoClient = new MongoClient(mongoUri);
    });

    after(async () => {
        // Shut down mongo memory server after running this suite of unit tests
        await testMongoClient.close();
        await mongoServer.stop();
    });

    let app: http.Server;
    let badDbApp: http.Server;

    // Mock a stub telegram bot
    const mockedTgBot = { api: { sendPhoto: () => Promise.resolve({}) } };

    // Initialize fs, to be memfs in these tests
    let fs: IFs;
    let testDb: Db;
    beforeEach(async () => {
        testDb = await initializeDb(testMongoClient, initialBlacklist);
        // Mock expected file structure for fs
        const fileStructureJson: DirectoryJSON = {};
        // Create mock empty directories for all supported sizes
        for (const size of config.iconSizes) {
            fileStructureJson[`${size}`] = null;
        }
        vol.fromJSON(fileStructureJson, config.imageDir);
        fs = createFsFromVolume(vol);
        const TEST_PORT = 5000;
        app = startExpressServer(
            TEST_PORT,
            testDb,
            mockedTgBot as unknown as Bot,
            fs,
        );
        const TEST_PORT_BAD_DB = 5001;
        badDbApp = startExpressServer(
            TEST_PORT_BAD_DB,
            {} as unknown as Db,
            mockedTgBot as unknown as Bot,
            fs,
        );
    });
    afterEach(async () => {
        // Reset mocked fs
        vol.reset();
        // Stop express server
        app.close();
        badDbApp.close();
        // Wipe the database after each unit test
        await testDb.dropDatabase();
    });
    it('/status returns expected status', function () {
        return request(app)
            .get('/status')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({ status: 'running' });
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
    it('We can accept a png upload from Cashtab extension and resize it on the server', async function () {
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
            .set(
                'Origin',
                'chrome-extension://obldfcmebhllhjlhjbnghaipekcppeag',
            )
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
    it('/blacklist returns tokenIds of the blacklist', function () {
        return request(app)
            .get(`/blacklist`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({
                status: 'success',
                tokenIds: mockBlacklist.map(entry => entry.tokenId),
            });
    });
    it('/blacklist returns expected error if tokenIds cannot be retrieved', function () {
        return request(badDbApp)
            .get(`/blacklist`)
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                status: 'error',
                message: 'Failed to retrieve tokenIds',
            });
    });
    it('/blacklist/:tokenId returns expected entry for a valid tokenId in the blacklist', function () {
        const tokenId = mockBlacklist[0].tokenId;
        return request(app)
            .get(`/blacklist/${tokenId}`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({
                status: 'success',
                isBlacklisted: true,
                entry: mockBlacklist[0],
            });
    });
    it('/blacklist/:tokenId returns expected error for an invalid tokenId', function () {
        const tokenId = 'not a token id';
        return request(app)
            .get(`/blacklist/${tokenId}`)
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                status: 'error',
                message: `Invalid tokenId: ${tokenId}`,
            });
    });
    it('/blacklist/:tokenId returns expected entry for a valid tokenId NOT in the blacklist', function () {
        const tokenId =
            '0000000000000000000000000000000000000000000000000000000000000000';
        return request(app)
            .get(`/blacklist/${tokenId}`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({
                status: 'success',
                isBlacklisted: false,
            });
    });
    it('/blacklist/:tokenId returns expected error if database fails to lookup a valid tokenId', function () {
        const tokenId = mockBlacklist[0].tokenId;
        return request(badDbApp)
            .get(`/blacklist/${tokenId}`)
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                status: 'error',
                message: `Failed to retrieve tokenId ${tokenId} from the database`,
            });
    });
});

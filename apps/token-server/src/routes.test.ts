// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import * as http from 'http';
import request from 'supertest';
import config from '../config';
import { startExpressServer } from '../src/routes';
import { Bot } from 'grammy';
import { createFsFromVolume, vol, IFs, DirectoryJSON } from 'memfs';
import sharp from 'sharp';
import { Pool } from 'pg';
import { seedBlacklist, initialBlacklist, resetBlacklist } from '../src/db';
import { createTestPool } from '../test/testDb';
import { hashTokenIcon } from '../src/iconAuth';
import { signMsg, Ecc, Address, shaRmd160, toHex, fromHex } from 'ecash-lib';

const TEST_SECRET_KEY = fromHex(
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
);
const TEST_MINTER_ADDRESS = Address.p2pkh(
    toHex(shaRmd160(new Ecc().derivePubkey(TEST_SECRET_KEY))),
).toString();

const mockBlacklist = initialBlacklist.map(entry => ({ ...entry }));
const sortedMockTokenIds = mockBlacklist.map(entry => entry.tokenId).sort();

const TEST_TOKEN_ID =
    '1111111111111111111111111111111111111111111111111111111111111111';
const TEST_TOKEN_TYPE = 'ALP_TOKEN_TYPE_STANDARD';
const TEST_SUPPLY_TYPE = 'FIXED';

// Mirrors Cashtab submitTokenIcon: signMsg(hashFile(icon), wallet.sk)
const getTestIconUploadSignature = (iconBuffer: Buffer) => {
    return signMsg(hashTokenIcon(iconBuffer), TEST_SECRET_KEY);
};

interface AppendCashtabNewTokenFieldsOptions {
    signature?: string;
    iconBuffer?: Buffer;
}

const appendCashtabNewTokenFields = (
    req: request.Test,
    tokenId: string = TEST_TOKEN_ID,
    options: AppendCashtabNewTokenFieldsOptions = {},
) => {
    const { signature, iconBuffer } = options;
    const resolvedSignature =
        signature ??
        (iconBuffer !== undefined
            ? getTestIconUploadSignature(iconBuffer)
            : 'unsigned');

    return req
        .field('name', 'Test Token')
        .field('ticker', 'TST')
        .field('decimals', '3')
        .field('url', 'https://cashtab.com/')
        .field('genesisQty', '10000')
        .field('tokenId', tokenId)
        .field('minterAddress', TEST_MINTER_ADDRESS)
        .field('tokenType', TEST_TOKEN_TYPE)
        .field('supplyType', TEST_SUPPLY_TYPE)
        .field('signature', resolvedSignature);
};

describe('routes.js', function () {
    let testPool: Pool;
    let app: http.Server;
    let badDbApp: http.Server;

    const mockedTgBot = { api: { sendPhoto: () => Promise.resolve({}) } };

    let fs: IFs;
    const badDbPool = {
        query: () => Promise.reject(new Error('Database error')),
    } as unknown as Pool;

    beforeEach(async () => {
        testPool = await createTestPool();
        await seedBlacklist(testPool, initialBlacklist);
        const fileStructureJson: DirectoryJSON = {};
        for (const size of config.iconSizes) {
            fileStructureJson[`${size}`] = null;
        }
        vol.fromJSON(fileStructureJson, config.imageDir);
        fs = createFsFromVolume(vol);
        const TEST_PORT = 5000;
        app = startExpressServer(
            TEST_PORT,
            testPool,
            mockedTgBot as unknown as Bot,
            fs,
            'test-channel-id',
        );
        const TEST_PORT_BAD_DB = 5001;
        badDbApp = startExpressServer(
            TEST_PORT_BAD_DB,
            badDbPool,
            mockedTgBot as unknown as Bot,
            fs,
            'test-channel-id',
        );
    });
    afterEach(async () => {
        vol.reset();
        app.close();
        badDbApp.close();
        await resetBlacklist(testPool);
        await testPool.end();
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
        return appendCashtabNewTokenFields(request(app).post(`/new`))
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
        return appendCashtabNewTokenFields(request(app).post(`/new`))
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

        return appendCashtabNewTokenFields(
            request(app).post(`/new`),
            TEST_TOKEN_ID,
            {
                iconBuffer: semiTransparentRedPng,
            },
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

        return appendCashtabNewTokenFields(
            request(app)
                .post(`/new`)
                .set(
                    'Origin',
                    'chrome-extension://obldfcmebhllhjlhjbnghaipekcppeag',
                ),
            TEST_TOKEN_ID,
            { iconBuffer: semiTransparentRedPng },
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

        return appendCashtabNewTokenFields(
            request(app).post(`/new`).set('Origin', 'https://notcashtab.com/'),
            TEST_TOKEN_ID,
            { iconBuffer: semiTransparentRedPng },
        )
            .attach('tokenIcon', semiTransparentRedPng, 'mockicon.png')
            .expect(500)
            .expect('Content-Type', 'text/html; charset=utf-8')
            .expect(/Not allowed by CORS/);
    });
    it('We reject a /new request with an invalid tokenId', async function () {
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

        return appendCashtabNewTokenFields(
            request(app).post(`/new`),
            'not-a-valid-token-id',
            { iconBuffer: semiTransparentRedPng },
        )
            .attach('tokenIcon', semiTransparentRedPng, 'mockicon.png')
            .expect(400)
            .expect('Content-Type', /json/)
            .expect({
                status: 'error',
                msg: 'Invalid tokenId: not-a-valid-token-id',
            });
    });
    it('We reject a /new request with a path traversal tokenId', async function () {
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

        const traversalTokenId = '../../rejected/32/probe';

        return appendCashtabNewTokenFields(
            request(app).post(`/new`),
            traversalTokenId,
            { iconBuffer: semiTransparentRedPng },
        )
            .attach('tokenIcon', semiTransparentRedPng, 'mockicon.png')
            .expect(400)
            .expect('Content-Type', /json/)
            .expect({
                status: 'error',
                msg: `Invalid tokenId: ${traversalTokenId}`,
            });
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
        await appendCashtabNewTokenFields(
            request(app).post(`/new`),
            TEST_TOKEN_ID,
            {
                iconBuffer: semiTransparentRedPng,
            },
        )
            .attach('tokenIcon', semiTransparentRedPng, 'mockicon.png')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({
                status: 'ok',
            });

        // Now an identical request will fail
        return appendCashtabNewTokenFields(
            request(app).post(`/new`),
            TEST_TOKEN_ID,
            {
                iconBuffer: semiTransparentRedPng,
            },
        )
            .attach('tokenIcon', semiTransparentRedPng, 'mockicon.png')
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                status: 'error',
                msg: `Token icon already exists for ${TEST_TOKEN_ID}`,
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

        return appendCashtabNewTokenFields(request(app).post(`/new`))
            .attach('tokenIcon', semiTransparentRedJpg, 'mockicon.jpg')
            .expect(403)
            .expect('Content-Type', /json/)
            .expect({
                status: 'error',
                msg: 'Only .png files are allowed.',
            });
    });
    it('We reject uploads whose bytes are not a png even if the filename is .png', async function () {
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

        return appendCashtabNewTokenFields(
            request(app).post(`/new`),
            TEST_TOKEN_ID,
            { iconBuffer: semiTransparentRedJpg },
        )
            .attach('tokenIcon', semiTransparentRedJpg, 'mockicon.png')
            .expect(403)
            .expect('Content-Type', /json/)
            .expect({
                status: 'error',
                msg: 'Only .png files are allowed.',
            });
    });
    it('Error in sharp resize is handled', async function () {
        const invalidPng = Buffer.concat([
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            Buffer.alloc(100, 1),
        ]);
        return appendCashtabNewTokenFields(
            request(app).post(`/new`),
            TEST_TOKEN_ID,
            {
                iconBuffer: invalidPng,
            },
        )
            .attach('tokenIcon', invalidPng, 'mockicon.png')
            .expect(500)
            .expect('Content-Type', /json/)
            .expect({
                status: 'error',
                msg: 'Error resizing uploaded token icon',
            });
    });
    it('We reject a /new request with an invalid minterAddress', async function () {
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
            .field('name', 'Test Token')
            .field('ticker', 'TST')
            .field('decimals', '3')
            .field('url', 'https://cashtab.com/')
            .field('genesisQty', '10000')
            .field('tokenId', TEST_TOKEN_ID)
            .field('minterAddress', 'not-an-address')
            .field('tokenType', TEST_TOKEN_TYPE)
            .field('supplyType', TEST_SUPPLY_TYPE)
            .attach('tokenIcon', semiTransparentRedPng, 'mockicon.png')
            .expect(400)
            .expect('Content-Type', /json/)
            .expect({
                status: 'error',
                msg: 'Invalid minterAddress: not-an-address',
            });
    });
    it('We reject a /new request with invalid token metadata', async function () {
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
            .field('name', 'Test Token')
            .field('ticker', 'TST')
            .field('decimals', '3')
            .field('url', 'https://cashtab.com/')
            .field('genesisQty', '10000')
            .field('tokenId', TEST_TOKEN_ID)
            .field('minterAddress', TEST_MINTER_ADDRESS)
            .field('tokenType', 'NOT_A_REAL_TOKEN_TYPE')
            .field('supplyType', TEST_SUPPLY_TYPE)
            .field(
                'signature',
                getTestIconUploadSignature(semiTransparentRedPng),
            )
            .attach('tokenIcon', semiTransparentRedPng, 'mockicon.png')
            .expect(400)
            .expect('Content-Type', /json/)
            .expect({
                status: 'error',
                msg: 'Invalid tokenType: NOT_A_REAL_TOKEN_TYPE',
            });
    });
    it('We reject a /new request with a missing signature', async function () {
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
            .field('name', 'Test Token')
            .field('ticker', 'TST')
            .field('decimals', '3')
            .field('url', 'https://cashtab.com/')
            .field('genesisQty', '10000')
            .field('tokenId', TEST_TOKEN_ID)
            .field('minterAddress', TEST_MINTER_ADDRESS)
            .field('tokenType', TEST_TOKEN_TYPE)
            .field('supplyType', TEST_SUPPLY_TYPE)
            .attach('tokenIcon', semiTransparentRedPng, 'mockicon.png')
            .expect(400)
            .expect('Content-Type', /json/)
            .expect({
                status: 'error',
                msg: 'Missing signature',
            });
    });
    it('We reject a /new request with an invalid signature', async function () {
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

        return appendCashtabNewTokenFields(
            request(app).post(`/new`),
            TEST_TOKEN_ID,
            {
                signature: 'not-a-valid-signature',
                iconBuffer: semiTransparentRedPng,
            },
        )
            .attach('tokenIcon', semiTransparentRedPng, 'mockicon.png')
            .expect(403)
            .expect('Content-Type', /json/)
            .expect({
                status: 'error',
                msg: 'Invalid signature for token icon upload',
            });
    });
    it('We save cashtab_tokens metadata on successful icon upload', async function () {
        const tokenId =
            '2222222222222222222222222222222222222222222222222222222222222222';
        const semiTransparentRedPng = await sharp({
            create: {
                width: 512,
                height: 512,
                channels: 4,
                background: { r: 0, g: 255, b: 0, alpha: 0.5 },
            },
        })
            .png()
            .toBuffer();

        await appendCashtabNewTokenFields(request(app).post(`/new`), tokenId, {
            iconBuffer: semiTransparentRedPng,
        })
            .attach('tokenIcon', semiTransparentRedPng, 'mockicon.png')
            .expect(200);

        const result = await testPool.query(
            `SELECT token_id, minter_address, token_type, supply_type
             FROM cashtab_tokens WHERE token_id = $1`,
            [tokenId],
        );

        assert.equal(result.rows.length, 1);
        assert.deepEqual(result.rows[0], {
            token_id: tokenId,
            minter_address: TEST_MINTER_ADDRESS,
            token_type: TEST_TOKEN_TYPE,
            supply_type: TEST_SUPPLY_TYPE,
        });
    });
    it('/blacklist returns tokenIds of the blacklist', function () {
        return request(app)
            .get(`/blacklist`)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect(res => {
                assert.deepEqual(res.body.status, 'success');
                assert.deepEqual(res.body.tokenIds.sort(), sortedMockTokenIds);
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

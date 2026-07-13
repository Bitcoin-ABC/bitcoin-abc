// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import request from 'supertest';
import { signMsg, fromHex } from 'ecash-lib';
import { Pool } from 'pg';
import { createApp } from '../app';

const ACTIVE_ADDRESS = 'ecash:qpgc9g89yhp4cepepn30t6wa3jcxuym8ecewdpl8pj';
const ACTIVE_SECRET_KEY =
    'a15b17382a7d139ad748cc5cee8343af94e69816c11fc5de71e8310ded84191b';

const signPushRegister = (): string =>
    signMsg(ACTIVE_ADDRESS, fromHex(ACTIVE_SECRET_KEY));

describe('Push routes', () => {
    let mockPool: {
        query: (
            sql: string,
            params?: unknown[],
        ) => Promise<{ rows: unknown[]; rowCount: number }>;
    };
    let app: ReturnType<typeof createApp>;

    beforeEach(() => {
        mockPool = {
            query: async () => ({ rows: [], rowCount: 1 }),
        };
        app = createApp(mockPool as unknown as Pool);
    });

    it('registers a signed device token', async () => {
        const response = await request(app).post('/api/push/register').send({
            active_address: ACTIVE_ADDRESS,
            signature: signPushRegister(),
            platform: 'ios',
            fcm_token: 'fcm-token-abc',
        });

        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.body.success, true);
    });

    it('registers a signed web device token', async () => {
        const response = await request(app).post('/api/push/register').send({
            active_address: ACTIVE_ADDRESS,
            signature: signPushRegister(),
            platform: 'web',
            fcm_token: 'fcm-web-token-abc',
        });

        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.body.success, true);
    });

    it('rejects unsigned register requests', async () => {
        const response = await request(app).post('/api/push/register').send({
            active_address: ACTIVE_ADDRESS,
            platform: 'android',
            fcm_token: 'fcm-token-abc',
        });

        assert.strictEqual(response.status, 400);
        assert.match(response.body.error, /signature is required/);
    });

    it('rejects register requests with invalid signature', async () => {
        const response = await request(app).post('/api/push/register').send({
            active_address: ACTIVE_ADDRESS,
            signature: 'not-a-valid-signature',
            platform: 'android',
            fcm_token: 'fcm-token-abc',
        });

        assert.strictEqual(response.status, 401);
        assert.match(response.body.error, /Invalid signature/);
    });

    it('unregisters a signed device token', async () => {
        mockPool.query = async () => ({ rows: [], rowCount: 1 });

        const response = await request(app).post('/api/push/unregister').send({
            active_address: ACTIVE_ADDRESS,
            signature: signPushRegister(),
            fcm_token: 'fcm-token-abc',
        });

        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.body.data.removed, true);
    });

    it('rejects unsigned unregister requests', async () => {
        const response = await request(app).post('/api/push/unregister').send({
            active_address: ACTIVE_ADDRESS,
            fcm_token: 'fcm-token-abc',
        });

        assert.strictEqual(response.status, 400);
        assert.match(response.body.error, /signature is required/);
    });

    it('allows Capacitor WebView origins for CORS preflight', async () => {
        const response = await request(app)
            .options('/api/push/register')
            .set('Origin', 'https://localhost')
            .set('Access-Control-Request-Method', 'POST')
            .set('Access-Control-Request-Headers', 'content-type');

        assert.strictEqual(response.status, 204);
        assert.strictEqual(
            response.headers['access-control-allow-origin'],
            'https://localhost',
        );
    });

    it('allows cashtab.com for CORS preflight', async () => {
        const response = await request(app)
            .options('/api/push/register')
            .set('Origin', 'https://cashtab.com')
            .set('Access-Control-Request-Method', 'POST')
            .set('Access-Control-Request-Headers', 'content-type');

        assert.strictEqual(response.status, 204);
        assert.strictEqual(
            response.headers['access-control-allow-origin'],
            'https://cashtab.com',
        );
    });

    it('rejects disallowed origins', async () => {
        const response = await request(app)
            .post('/api/push/register')
            .set('Origin', 'https://evil.example')
            .send({
                active_address: ACTIVE_ADDRESS,
                signature: signPushRegister(),
                platform: 'android',
                fcm_token: 'fcm-token-abc',
            });

        assert.strictEqual(response.status, 403);
        assert.match(response.body.error, /Origin not allowed/);
    });
});

// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import request from 'supertest';
import { createApp } from '../src/app';
import { SPEC_VERSION } from '../src/constants';

describe('alp-dex scaffold HTTP', () => {
    const app = createApp();

    it('GET / returns service metadata', async () => {
        const res = await request(app).get('/').expect(200);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.data.specVersion, SPEC_VERSION);
        assert.strictEqual(res.body.data.status, 'scaffold');
        assert.strictEqual(res.body.data.pricing, 'local-liquidity');
    });

    it('GET /api/v1/status returns OK health', async () => {
        const res = await request(app).get('/api/v1/status').expect(200);
        assert.strictEqual(res.body.status, 'OK');
        assert.strictEqual(res.body.specVersion, SPEC_VERSION);
        assert.strictEqual(typeof res.body.timestamp, 'string');
        assert.ok(!Number.isNaN(Date.parse(res.body.timestamp)));
    });
});

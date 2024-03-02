// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as http from 'http';
import request from 'supertest';
import { startExpressServer } from '../src/routes';

describe('routes.js', async function () {
    let app: http.Server;
    beforeEach(async () => {
        const TEST_PORT = 5000;
        app = startExpressServer(TEST_PORT);
    });
    afterEach(async () => {
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
});

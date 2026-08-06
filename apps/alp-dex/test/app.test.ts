// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import type { ChronikClient } from 'chronik-client';
import { ALP_TOKEN_TYPE_STANDARD } from 'ecash-lib';
import { MockChronikClient } from 'mock-chronik-client';
import request from 'supertest';
import { createApp } from '../src/app';
import type { ParsedTradedConfig } from '../src/config/tradedConfig';
import { POSTAGE_SATS, SPEC_VERSION } from '../src/constants';
import type { TradedTokens } from '../src/tokens/tradedTokens';
import { createLpWallets } from '../src/wallet/accounts';

const MNEMONIC =
    'shift satisfy hammer fit plunge swear athlete gentle tragic sorry blush cheap';
const FEE = 'ecash:qrwzys2q6xq98vwz0kjn6ulu5m6yljr5fyc909kalg';
const TOKEN_A = 'aa'.repeat(32);
const TOKEN_B = 'bb'.repeat(32);

const tradedConfig = (): ParsedTradedConfig => ({
    port: 3003,
    mnemonic: MNEMONIC,
    feeAddress: FEE,
    chronikUrls: ['https://chronik.test'],
    utxoQtyByToken: new Map([
        [TOKEN_A, 20],
        [TOKEN_B, 20],
    ]),
    pairs: [{ tokenIdA: TOKEN_A, tokenIdB: TOKEN_B, feePct: 0.02 }],
});

const tradedTokens = (): TradedTokens =>
    new Map([
        [
            TOKEN_A,
            {
                tokenId: TOKEN_A,
                decimals: 4,
                utxoQty: 20,
                utxoAtoms: 200_000n,
                tokenTicker: 'A',
                tokenName: 'Token A',
                tokenType: ALP_TOKEN_TYPE_STANDARD,
            },
        ],
        [
            TOKEN_B,
            {
                tokenId: TOKEN_B,
                decimals: 4,
                utxoQty: 20,
                utxoAtoms: 200_000n,
                tokenTicker: 'B',
                tokenName: 'Token B',
                tokenType: ALP_TOKEN_TYPE_STANDARD,
            },
        ],
    ]);

describe('alp-dex HTTP metadata', () => {
    const mock = new MockChronikClient();
    mock.setBlockchainInfo({
        tipHash: '00'.repeat(32),
        tipHeight: 800_000,
    });
    const chronik = mock as unknown as ChronikClient;
    const { seller, slush, addresses } = createLpWallets(
        MNEMONIC,
        chronik,
        FEE,
    );
    mock.setUtxosByAddress(seller.address, []);
    mock.setUtxosByAddress(slush.address, []);

    const app = createApp({
        seller,
        slush,
        feeAddress: addresses.feeAddress,
        tradedConfig: tradedConfig(),
        tradedTokens: tradedTokens(),
    });

    it('GET / returns service metadata', async () => {
        const res = await request(app).get('/').expect(200);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.data.specVersion, SPEC_VERSION);
        assert.strictEqual(res.body.data.status, 'running');
        assert.strictEqual(res.body.data.pricing, 'local-liquidity');
        assert.strictEqual(res.body.data.swapAddress, seller.address);
        assert.strictEqual(res.body.data.platformFeeEnabled, false);
    });

    it('GET /api/v1/status returns OK health with LP discovery fields', async () => {
        const res = await request(app).get('/api/v1/status').expect(200);
        assert.strictEqual(res.body.status, 'OK');
        assert.strictEqual(res.body.specVersion, SPEC_VERSION);
        assert.strictEqual(typeof res.body.timestamp, 'string');
        assert.ok(!Number.isNaN(Date.parse(res.body.timestamp)));
        assert.strictEqual(res.body.swapAddress, seller.address);
        assert.strictEqual(res.body.slushAddress, slush.address);
        assert.strictEqual(res.body.feeAddress, addresses.feeAddress);
        assert.strictEqual(res.body.postage.sats, POSTAGE_SATS.toString());
        assert.strictEqual(res.body.platformFeeEnabled, false);
        assert.strictEqual(res.body.tradedPairs.length, 1);
        assert.strictEqual(res.body.tradedPairs[0].feePct, 0.02);
        assert.strictEqual(res.body.tradedTokens.length, 2);
    });
});

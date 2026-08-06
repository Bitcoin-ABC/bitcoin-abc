// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import type { ChronikClient, ScriptUtxo } from 'chronik-client';
import { ALP_TOKEN_TYPE_STANDARD, Address } from 'ecash-lib';
import { MockChronikClient } from 'mock-chronik-client';
import request from 'supertest';
import { createApp } from '../src/app';
import type { ParsedTradedConfig } from '../src/config/tradedConfig';
import { splitExactInTotalAtoms } from '../src/pricing/templates';
import type { TradedTokens } from '../src/tokens/tradedTokens';
import { createLpWallets } from '../src/wallet/accounts';

const MNEMONIC =
    'shift satisfy hammer fit plunge swear athlete gentle tragic sorry blush cheap';
const FEE = 'ecash:qrwzys2q6xq98vwz0kjn6ulu5m6yljr5fyc909kalg';
const TOKEN_A = 'aa'.repeat(32);
const TOKEN_B = 'bb'.repeat(32);
const TOKEN_UNLISTED = 'cc'.repeat(32);

/** 20 human units at 4 decimals. */
const UTXO_ATOMS = 200_000n;

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
                utxoAtoms: UTXO_ATOMS,
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
                utxoAtoms: UTXO_ATOMS,
                tokenTicker: 'B',
                tokenName: 'Token B',
                tokenType: ALP_TOKEN_TYPE_STANDARD,
            },
        ],
    ]);

const tokenUtxo = (
    tokenId: string,
    atoms: bigint,
    outIdx: number,
    txPrefix: string,
): ScriptUtxo => ({
    outpoint: {
        txid: `${txPrefix}${outIdx.toString(16).padStart(62, '0')}`,
        outIdx: 0,
    },
    blockHeight: 800_000,
    isCoinbase: false,
    sats: 1000n,
    isFinal: true,
    token: {
        tokenId,
        tokenType: ALP_TOKEN_TYPE_STANDARD,
        atoms,
        isMintBaton: false,
    },
});

describe('splitExactInTotalAtoms', () => {
    it('splits total into price leg + maker fee on top', () => {
        // 1.02 human @ 4 decimals = 10200 atoms; 2% fee → price 10000, fee 200
        const { priceLegAtoms, feeAtoms } = splitExactInTotalAtoms(
            10_200n,
            0.02,
        );
        assert.strictEqual(priceLegAtoms, 10_000n);
        assert.strictEqual(feeAtoms, 200n);
        assert.strictEqual(priceLegAtoms + feeAtoms, 10_200n);
    });

    it('returns full amount as price leg when feePct is 0', () => {
        const { priceLegAtoms, feeAtoms } = splitExactInTotalAtoms(50n, 0);
        assert.strictEqual(priceLegAtoms, 50n);
        assert.strictEqual(feeAtoms, 0n);
    });

    it('rejects feePct of 1 (100% fee)', () => {
        assert.throws(
            () => splitExactInTotalAtoms(100n, 1),
            /feePct must be in \[0, 1\)/,
        );
    });

    it('assigns floor dust to fee so outs sum to the requested total', () => {
        // Floored makerFeeAtoms(99, 1%) is 0, but priceLeg alone is 99 — the
        // leftover 1 atom must still be paid (on the fee out).
        const split = splitExactInTotalAtoms(100n, 0.01);
        assert.strictEqual(split.priceLegAtoms, 99n);
        assert.strictEqual(split.feeAtoms, 1n);
        assert.strictEqual(split.priceLegAtoms + split.feeAtoms, 100n);

        // Small totals where floored fee on the price leg would be 0.
        const small = splitExactInTotalAtoms(3n, 0.02);
        assert.strictEqual(small.priceLegAtoms, 2n);
        assert.strictEqual(small.feeAtoms, 1n);
        assert.strictEqual(small.priceLegAtoms + small.feeAtoms, 3n);
    });
});

describe('alp-dex quote API', () => {
    let mock: MockChronikClient;
    let sellerAddress: string;
    let slushAddress: string;
    let feeScriptHex: string;
    let app: ReturnType<typeof createApp>;

    beforeEach(async () => {
        mock = new MockChronikClient();
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
        sellerAddress = seller.address;
        slushAddress = slush.address;
        feeScriptHex = Address.fromCashAddress(
            addresses.feeAddress,
        ).toScriptHex();

        // Seller: 2000 A + 1000 B (100×20 + 50×20) at 4 decimals
        const aUtxos = Array.from({ length: 100 }, (_, i) =>
            tokenUtxo(TOKEN_A, UTXO_ATOMS, i, '11'),
        );
        const bUtxos = Array.from({ length: 50 }, (_, i) =>
            tokenUtxo(TOKEN_B, UTXO_ATOMS, i, '22'),
        );
        mock.setUtxosByAddress(seller.address, [...aUtxos, ...bUtxos]);
        mock.setUtxosByAddress(slush.address, []);
        // Quote routes read in-memory utxos only (no per-request sync).
        await Promise.all([seller.sync(), slush.sync()]);

        app = createApp({
            seller,
            slush,
            feeAddress: addresses.feeAddress,
            tradedConfig: tradedConfig(),
            tradedTokens: tradedTokens(),
        });
    });

    it('GET /token/:tokenId/available returns seller atoms', async () => {
        const res = await request(app)
            .get(`/api/v1/token/${TOKEN_B}/available`)
            .expect(200);
        assert.strictEqual(res.body.tokenId, TOKEN_B);
        assert.strictEqual(res.body.atoms, (1000n * 10_000n).toString());
    });

    it('rejects available for unlisted token', async () => {
        const res = await request(app)
            .get(`/api/v1/token/${TOKEN_UNLISTED}/available`)
            .expect(400);
        assert.match(res.body.error, /not in traded/);
    });

    it('GET /swap/inventory returns seller+slush human balances', async () => {
        const res = await request(app)
            .get('/api/v1/swap/inventory')
            .expect(200);
        assert.strictEqual(res.body[TOKEN_A], '2000');
        assert.strictEqual(res.body[TOKEN_B], '1000');
    });

    it('GET /swap/:from/:to/price returns spot + reserves', async () => {
        const res = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}/price`)
            .expect(200);
        assert.strictEqual(res.body.rate, '0.5');
        assert.strictEqual(res.body.feePct, 0.02);
        assert.strictEqual(res.body.source, 'local-liquidity');
        assert.strictEqual(
            res.body.reserves[TOKEN_A],
            (2000n * 10_000n).toString(),
        );
        assert.strictEqual(
            res.body.reserves[TOKEN_B],
            (1000n * 10_000n).toString(),
        );
    });

    it('GET /swap/:from/:to/amm/:qty returns CP discovery quote', async () => {
        const res = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}/amm/100`)
            .expect(200);
        assert.strictEqual(res.body.source, 'local-liquidity');
        assert.strictEqual(res.body.amountIn, '100');
        assert.strictEqual(res.body.amountInAtoms, (100n * 10_000n).toString());
        // dy = 1e6 * 1e7 / (2e7 + 1e6) = 476190
        assert.strictEqual(res.body.amountOutAtoms, '476190');
        assert.strictEqual(res.body.spotRate, '0.5');
        // effective: floor(476190 * 10^4 / 1_000_000) = 4761 → "0.4761" @ 4 dec
        assert.strictEqual(res.body.effectiveRate, '0.4761');
        assert.ok(Number(res.body.effectiveRate) < Number(res.body.spotRate));
        assert.ok(res.body.priceImpactPct > 0);
        assert.strictEqual(res.body.feePct, 0.02);
    });

    it('GET /swap/:from/:to/quote/:qty returns exact-in template outs', async () => {
        const res = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}/quote/1.02`)
            .expect(200);
        assert.strictEqual(res.body.feePct, 0.02);
        assert.strictEqual(res.body.price, '1');
        assert.strictEqual(res.body.fee, '0.02');
        assert.strictEqual(res.body.outputs.length, 3);
        assert.strictEqual(res.body.outputs[0].tokenId, TOKEN_A);
        assert.strictEqual(
            res.body.outputs[0].script,
            Address.fromCashAddress(slushAddress).toScriptHex(),
        );
        assert.strictEqual(res.body.outputs[0].atoms, '10000');
        assert.strictEqual(res.body.outputs[1].script, feeScriptHex);
        assert.strictEqual(res.body.outputs[1].atoms, '200');
        assert.strictEqual(res.body.outputs[2].tokenId, TOKEN_B);
        assert.strictEqual(res.body.outputs[2].script, undefined);
        // CP exact-in 10000 on 2e7/1e7 → floor(1e4*1e7/20010000) = 4997
        assert.strictEqual(res.body.outputs[2].atoms, '4997');
        assert.strictEqual(res.body.platformFeePct, 0);
    });

    it('GET /swap/:from/:to/price/:qty returns exact-out template', async () => {
        const res = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}/price/100`)
            .expect(200);
        assert.strictEqual(res.body.feePct, 0.02);
        assert.strictEqual(res.body.outputs.length, 3);
        assert.strictEqual(res.body.outputs[2].tokenId, TOKEN_B);
        assert.strictEqual(
            res.body.outputs[2].atoms,
            (100n * 10_000n).toString(),
        );
        assert.ok(Number(res.body.price) > 0);
        assert.ok(Number(res.body.fee) > 0);
    });

    it('GET /swap/:from/:to?from=&feePct= matches quote template', async () => {
        const quote = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}/quote/1.02`)
            .expect(200);
        const settleable = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}?from=1.02&feePct=0.02`)
            .expect(200);
        assert.deepStrictEqual(settleable.body.outputs, quote.body.outputs);
    });

    it('GET /swap/:from/:to?to=&feePct= matches price/:qty template', async () => {
        const priced = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}/price/1`)
            .expect(200);
        const settleable = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}?to=1&feePct=0.02`)
            .expect(200);
        assert.deepStrictEqual(settleable.body.outputs, priced.body.outputs);
    });

    it('rejects settleable template when feePct mismatches pair', async () => {
        const res = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}?from=1&feePct=0.15`)
            .expect(400);
        assert.match(res.body.error, /must match configured pair fee/);
    });

    it('rejects empty from/to query values instead of treating them as absent', async () => {
        const emptyFrom = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}?from=&to=1&feePct=0.02`)
            .expect(400);
        assert.match(emptyFrom.body.error, /both 'from' and 'to'/);
        const emptyTo = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}?from=1&to=&feePct=0.02`)
            .expect(400);
        assert.match(emptyTo.body.error, /both 'from' and 'to'/);
        const onlyEmptyFrom = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}?from=&feePct=0.02`)
            .expect(400);
        assert.match(onlyEmptyFrom.body.error, /qty must be a positive/);
    });

    it('rejects feePct with trailing garbage or repeated params', async () => {
        const garbage = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}?from=1&feePct=0.02abc`)
            .expect(400);
        assert.match(garbage.body.error, /feePct must be a number/);
        const repeated = await request(app)
            .get(
                `/api/v1/swap/${TOKEN_A}/${TOKEN_B}?from=1&feePct=0.02&feePct=0.15`,
            )
            .expect(400);
        assert.match(repeated.body.error, /feePct must be a number/);
    });

    it('rejects bad qty and unlisted pairs', async () => {
        await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}/amm/0`)
            .expect(400);
        // Leading-zero zero must not pass the string-only zero check.
        await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}/amm/00`)
            .expect(400);
        await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}/amm/abc`)
            .expect(400);
        const unlisted = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_UNLISTED}/price`)
            .expect(400);
        assert.match(unlisted.body.error, /not a traded|not in traded/);
        // sellerAddress used so lint does not flag fixture setup as unused
        assert.ok(sellerAddress.startsWith('ecash:'));
    });

    it('rejects exact-out that would drain the pool', async () => {
        const res = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}/price/1000`)
            .expect(400);
        assert.match(res.body.error, /less than/);
    });
});

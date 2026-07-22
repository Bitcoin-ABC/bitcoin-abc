// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    assertTokenIdInConfig,
    CONFIG_SAMPLE_FILENAME,
    getAlpDexRoot,
    loadTradedConfig,
    MNEMONIC_PLACEHOLDER,
    parseTradedConfigJson,
    tokenIdsFromConfig,
} from '../src/config/tradedConfig';

const TOKEN_A = 'aa'.repeat(32);
const TOKEN_B = 'bb'.repeat(32);
const TOKEN_C = 'cc'.repeat(32);

const SAMPLE_MNEMONIC =
    'shift satisfy hammer fit plunge swear athlete gentle tragic sorry blush cheap';
const SAMPLE_FEE = 'ecash:qrwzys2q6xq98vwz0kjn6ulu5m6yljr5fyc909kalg';
const SELLER = 'ecash:qq86jv6h0y97q8l63ndynvk3fn9aq8fqru3exew8gl';

const samplePath = path.join(getAlpDexRoot(), CONFIG_SAMPLE_FILENAME);

const pair = (
    aTokenId: string,
    bTokenId: string,
    feePct: number,
    aUtxoQty: number,
    bUtxoQty: number,
) => ({ aTokenId, bTokenId, feePct, aUtxoQty, bUtxoQty });

const withBase = (overrides: Record<string, unknown> = {}) =>
    JSON.stringify({
        port: 3003,
        mnemonic: SAMPLE_MNEMONIC,
        feeAddress: SAMPLE_FEE,
        pairs: [pair(TOKEN_A, TOKEN_B, 0.01, 1, 1)],
        ...overrides,
    });

describe('tradedConfig', () => {
    it('config.sample.json uses non-usable placeholders (must be replaced)', () => {
        const raw = fs.readFileSync(samplePath, 'utf8');
        const sample = JSON.parse(raw) as {
            port: number;
            mnemonic: string;
            feeAddress: string;
            pairs: unknown[];
        };
        assert.strictEqual(sample.port, 3003);
        assert.strictEqual(sample.mnemonic, MNEMONIC_PLACEHOLDER);
        assert.ok(sample.feeAddress.includes('REPLACE_WITH_YOUR'));
        assert.strictEqual(sample.pairs.length, 1);
        assert.throws(
            () => parseTradedConfigJson(raw),
            /placeholder|not a valid ecash address/,
        );
    });

    it('rejects the sample mnemonic placeholder', () => {
        assert.throws(
            () =>
                parseTradedConfigJson(
                    withBase({ mnemonic: MNEMONIC_PLACEHOLDER }),
                ),
            /placeholder/,
        );
    });

    it('parses pairs with per-pair fee and utxo sizes', () => {
        const config = parseTradedConfigJson(
            withBase({
                pairs: [
                    pair(TOKEN_B, TOKEN_A, 0.02, 1, 1_000_000),
                    pair(TOKEN_A, TOKEN_C, 0.01, 1_000_000, 20),
                ],
            }),
        );
        assert.strictEqual(config.utxoQtyByToken.get(TOKEN_A), 1_000_000);
        assert.strictEqual(config.utxoQtyByToken.get(TOKEN_B), 1);
        assert.strictEqual(config.utxoQtyByToken.get(TOKEN_C), 20);
        assert.deepStrictEqual(config.pairs, [
            { tokenIdA: TOKEN_A, tokenIdB: TOKEN_B, feePct: 0.02 },
            { tokenIdA: TOKEN_A, tokenIdB: TOKEN_C, feePct: 0.01 },
        ]);
        assert.deepStrictEqual(tokenIdsFromConfig(config), [
            TOKEN_A,
            TOKEN_B,
            TOKEN_C,
        ]);
    });

    it('rejects missing required fields and bad shapes', () => {
        assert.throws(() => parseTradedConfigJson('{'), /not valid JSON/);
        assert.throws(
            () =>
                parseTradedConfigJson(
                    JSON.stringify({
                        mnemonic: SAMPLE_MNEMONIC,
                        feeAddress: SAMPLE_FEE,
                        pairs: [pair(TOKEN_A, TOKEN_B, 0.01, 1, 1)],
                    }),
                ),
            /port is required/,
        );
        assert.throws(
            () =>
                parseTradedConfigJson(
                    JSON.stringify({
                        port: 3003,
                        feeAddress: SAMPLE_FEE,
                        pairs: [pair(TOKEN_A, TOKEN_B, 0.01, 1, 1)],
                    }),
                ),
            /mnemonic is required/,
        );
        assert.throws(
            () =>
                parseTradedConfigJson(
                    JSON.stringify({
                        port: 3003,
                        mnemonic: SAMPLE_MNEMONIC,
                        pairs: [pair(TOKEN_A, TOKEN_B, 0.01, 1, 1)],
                    }),
                ),
            /feeAddress is required/,
        );
        // 12 English words with an invalid BIP39 checksum
        assert.throws(
            () =>
                parseTradedConfigJson(
                    withBase({
                        mnemonic:
                            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon',
                    }),
                ),
            /not a valid BIP39/,
        );
        assert.throws(
            () =>
                parseTradedConfigJson(
                    withBase({
                        mnemonic: 'only eleven words in this phrase here now',
                    }),
                ),
            /not a valid BIP39/,
        );
        assert.throws(
            () => parseTradedConfigJson(withBase({ pairs: [] })),
            /non-empty/,
        );
        assert.throws(
            () =>
                parseTradedConfigJson(
                    withBase({
                        pairs: [
                            {
                                aTokenId: TOKEN_A,
                                bTokenId: TOKEN_B,
                                aUtxoQty: 1,
                                bUtxoQty: 1,
                            },
                        ],
                    }),
                ),
            /feePct is required/,
        );
        assert.throws(
            () =>
                parseTradedConfigJson(
                    withBase({ feeAddress: 'not-a-cashaddr' }),
                ),
            /not a valid ecash address/,
        );
        assert.throws(
            () => parseTradedConfigJson(withBase({ feeAddress: SELLER })),
            /must not collide/,
        );
    });

    it('rejects out-of-range feePct and non-numeric fee/utxo values', () => {
        const base = pair(TOKEN_A, TOKEN_B, 0.01, 1, 1);
        assert.throws(
            () =>
                parseTradedConfigJson(
                    withBase({ pairs: [{ ...base, feePct: 5 }] }),
                ),
            /between 0 and 1/,
        );
        assert.throws(
            () =>
                parseTradedConfigJson(
                    withBase({ pairs: [{ ...base, feePct: null }] }),
                ),
            /must be a number/,
        );
        assert.throws(
            () =>
                parseTradedConfigJson(
                    withBase({ pairs: [{ ...base, aUtxoQty: true }] }),
                ),
            /must be a number/,
        );
        assert.throws(
            () => parseTradedConfigJson(withBase({ port: 0 })),
            /positive integer/,
        );
    });

    it('rejects conflicting utxoQty for the same token across pairs', () => {
        assert.throws(
            () =>
                parseTradedConfigJson(
                    withBase({
                        pairs: [
                            pair(TOKEN_A, TOKEN_B, 0.01, 20, 1),
                            pair(TOKEN_A, TOKEN_C, 0.01, 5, 1),
                        ],
                    }),
                ),
            /conflicting utxoQty/,
        );
    });

    it('loadTradedConfig throws when config.json is missing', () => {
        const missing = path.join(
            os.tmpdir(),
            `alp-dex-missing-config-${process.pid}.json`,
        );
        assert.throws(() => loadTradedConfig(missing), /Missing /);
        assert.throws(() => loadTradedConfig(missing), /config\.sample\.json/);
    });

    it('loadTradedConfig reads a config.json path', () => {
        const tmp = path.join(
            os.tmpdir(),
            `alp-dex-config-${process.pid}.json`,
        );
        fs.writeFileSync(
            tmp,
            withBase({
                port: 4001,
                pairs: [pair(TOKEN_A, TOKEN_B, 0.05, 7, 9)],
            }),
        );
        try {
            const config = loadTradedConfig(tmp);
            assert.strictEqual(config.port, 4001);
            assert.strictEqual(config.mnemonic, SAMPLE_MNEMONIC);
            assert.strictEqual(config.feeAddress, SAMPLE_FEE);
            assert.strictEqual(config.pairs[0]!.feePct, 0.05);
            assert.strictEqual(assertTokenIdInConfig(config, TOKEN_A), TOKEN_A);
            assert.throws(
                () => assertTokenIdInConfig(config, 'dd'.repeat(32)),
                /not in traded config/,
            );
        } finally {
            fs.unlinkSync(tmp);
        }
    });
});

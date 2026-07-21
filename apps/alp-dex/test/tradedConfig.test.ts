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
    parseTradedConfigJson,
    tokenIdsFromConfig,
} from '../src/config/tradedConfig';

const TOKEN_A = 'aa'.repeat(32);
const TOKEN_B = 'bb'.repeat(32);
const TOKEN_C = 'cc'.repeat(32);

const samplePath = path.join(getAlpDexRoot(), CONFIG_SAMPLE_FILENAME);

const pair = (
    aTokenId: string,
    bTokenId: string,
    feePct: number,
    aUtxoQty: number,
    bUtxoQty: number,
) => ({ aTokenId, bTokenId, feePct, aUtxoQty, bUtxoQty });

describe('tradedConfig', () => {
    it('parses config.sample.json', () => {
        const raw = fs.readFileSync(samplePath, 'utf8');
        const config = parseTradedConfigJson(raw);
        assert.strictEqual(config.port, 3003);
        assert.strictEqual(config.pairs.length, 1);
        assert.strictEqual(config.pairs[0]!.feePct, 0.01);
        assert.strictEqual(config.utxoQtyByToken.get(TOKEN_A), 20);
        assert.strictEqual(config.utxoQtyByToken.get(TOKEN_B), 1);
    });

    it('parses pairs with per-pair fee and utxo sizes', () => {
        const config = parseTradedConfigJson(
            JSON.stringify({
                port: 3003,
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
                        pairs: [pair(TOKEN_A, TOKEN_B, 0.01, 1, 1)],
                    }),
                ),
            /port is required/,
        );
        assert.throws(
            () =>
                parseTradedConfigJson(
                    JSON.stringify({ port: 3003, pairs: [] }),
                ),
            /non-empty/,
        );
        assert.throws(
            () =>
                parseTradedConfigJson(
                    JSON.stringify({
                        port: 3003,
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
    });

    it('rejects out-of-range feePct and non-numeric fee/utxo values', () => {
        const base = pair(TOKEN_A, TOKEN_B, 0.01, 1, 1);
        assert.throws(
            () =>
                parseTradedConfigJson(
                    JSON.stringify({
                        port: 3003,
                        pairs: [{ ...base, feePct: 5 }],
                    }),
                ),
            /between 0 and 1/,
        );
        assert.throws(
            () =>
                parseTradedConfigJson(
                    JSON.stringify({
                        port: 3003,
                        pairs: [{ ...base, feePct: null }],
                    }),
                ),
            /must be a number/,
        );
        assert.throws(
            () =>
                parseTradedConfigJson(
                    JSON.stringify({
                        port: 3003,
                        pairs: [{ ...base, aUtxoQty: true }],
                    }),
                ),
            /must be a number/,
        );
        assert.throws(
            () =>
                parseTradedConfigJson(
                    JSON.stringify({
                        port: 0,
                        pairs: [base],
                    }),
                ),
            /positive integer/,
        );
    });

    it('rejects conflicting utxoQty for the same token across pairs', () => {
        assert.throws(
            () =>
                parseTradedConfigJson(
                    JSON.stringify({
                        port: 3003,
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
            JSON.stringify({
                port: 4001,
                pairs: [pair(TOKEN_A, TOKEN_B, 0.05, 7, 9)],
            }),
        );
        try {
            const config = loadTradedConfig(tmp);
            assert.strictEqual(config.port, 4001);
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

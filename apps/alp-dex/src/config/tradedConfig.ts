// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as fs from 'fs';
import * as path from 'path';
import { assertTokenId } from '../methods/tokenId';
import { canonicalizePair, pairKey, type TradedPair } from './tradedPairs';

export const CONFIG_FILENAME = 'config.json';
export const CONFIG_SAMPLE_FILENAME = 'config.sample.json';

export type ParsedTradedConfig = {
    /** HTTP listen port */
    port: number;
    /** tokenId → inventory UTXO size in human units */
    utxoQtyByToken: Map<string, number>;
    pairs: TradedPair[];
};

const parseNumberish = (raw: unknown, label: string): number => {
    if (typeof raw !== 'number' && typeof raw !== 'string') {
        throw new Error(`${label} must be a number (got ${typeof raw})`);
    }
    const value = typeof raw === 'number' ? raw : Number(raw.trim());
    if (!Number.isFinite(value)) {
        throw new Error(
            `${label} must be a finite number (got ${String(raw)})`,
        );
    }
    return value;
};

const parsePort = (raw: unknown): number => {
    const port = parseNumberish(raw, 'port');
    if (!Number.isInteger(port) || port <= 0) {
        throw new Error(`port must be a positive integer (got ${String(raw)})`);
    }
    return port;
};

/** Maker fee as a decimal in [0, 1] (e.g. 0.01 = 1%). */
const parseFeePct = (raw: unknown, label: string): number => {
    const pct = parseNumberish(raw, label);
    if (pct < 0 || pct > 1) {
        throw new Error(
            `${label} must be between 0 and 1 (got ${String(raw)})`,
        );
    }
    return pct;
};

const parsePositiveUtxoQty = (raw: unknown, label: string): number => {
    const qty = parseNumberish(raw, label);
    if (qty <= 0) {
        throw new Error(
            `${label} must be a positive number (got ${String(raw)})`,
        );
    }
    return qty;
};

const setUtxoQty = (
    utxoQtyByToken: Map<string, number>,
    tokenId: string,
    qty: number,
    label: string,
): void => {
    const existing = utxoQtyByToken.get(tokenId);
    if (existing !== undefined && existing !== qty) {
        throw new Error(
            `${label}: token ${tokenId} has conflicting utxoQty ` +
                `(${existing} vs ${qty}); use the same size in every pair`,
        );
    }
    utxoQtyByToken.set(tokenId, qty);
};

/**
 * Locate the alp-dex package root (directory containing package.json).
 */
export const getAlpDexRoot = (startDir: string = __dirname): string => {
    let dir = path.resolve(startDir);
    for (;;) {
        const pkgPath = path.join(dir, 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
                name?: string;
            };
            if (pkg.name === 'alp-dex') {
                return dir;
            }
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
            throw new Error('Could not locate alp-dex package root');
        }
        dir = parent;
    }
};

/**
 * Parse config JSON (see `config.sample.json`).
 *
 * Top-level `port` is required. Each pair must set `aTokenId`, `bTokenId`,
 * `feePct`, `aUtxoQty`, and `bUtxoQty`. Postage stamp size is fixed in code
 * (`POSTAGE_SATS`), not config.
 */
export const parseTradedConfigJson = (raw: string): ParsedTradedConfig => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        throw new Error(
            `config.json is not valid JSON: ${
                error instanceof Error ? error.message : String(error)
            }`,
        );
    }
    if (
        parsed === null ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
    ) {
        throw new Error('config.json must be a JSON object');
    }
    const obj = parsed as {
        port?: unknown;
        pairs?: unknown;
    };

    if (obj.port === undefined) {
        throw new Error('config.json port is required');
    }
    const port = parsePort(obj.port);

    if (!Array.isArray(obj.pairs) || obj.pairs.length === 0) {
        throw new Error('config.json pairs must be a non-empty array');
    }

    const pairKeys = new Set<string>();
    const pairs: TradedPair[] = [];
    const utxoQtyByToken = new Map<string, number>();

    for (const [i, item] of obj.pairs.entries()) {
        if (item === null || typeof item !== 'object' || Array.isArray(item)) {
            throw new Error(`config.json pairs[${i}] must be an object`);
        }
        const pairObj = item as {
            aTokenId?: unknown;
            bTokenId?: unknown;
            feePct?: unknown;
            aUtxoQty?: unknown;
            bUtxoQty?: unknown;
        };
        if (
            typeof pairObj.aTokenId !== 'string' ||
            typeof pairObj.bTokenId !== 'string'
        ) {
            throw new Error(
                `config.json pairs[${i}] requires string aTokenId and bTokenId`,
            );
        }
        if (pairObj.feePct === undefined) {
            throw new Error(`config.json pairs[${i}].feePct is required`);
        }
        if (pairObj.aUtxoQty === undefined) {
            throw new Error(`config.json pairs[${i}].aUtxoQty is required`);
        }
        if (pairObj.bUtxoQty === undefined) {
            throw new Error(`config.json pairs[${i}].bUtxoQty is required`);
        }

        const feePct = parseFeePct(pairObj.feePct, `pairs[${i}].feePct`);
        const aUtxoQty = parsePositiveUtxoQty(
            pairObj.aUtxoQty,
            `pairs[${i}].aUtxoQty`,
        );
        const bUtxoQty = parsePositiveUtxoQty(
            pairObj.bUtxoQty,
            `pairs[${i}].bUtxoQty`,
        );

        const canonical = canonicalizePair(pairObj.aTokenId, pairObj.bTokenId);
        const key = pairKey(canonical.tokenIdA, canonical.tokenIdB);
        if (pairKeys.has(key)) {
            throw new Error(
                `Duplicate pair in config.json: ${canonical.tokenIdA}:${canonical.tokenIdB}`,
            );
        }
        pairKeys.add(key);

        // UTXO sizes follow aTokenId/bTokenId labels, not canonical order.
        const aId = assertTokenId(pairObj.aTokenId);
        const bId = assertTokenId(pairObj.bTokenId);
        setUtxoQty(utxoQtyByToken, aId, aUtxoQty, `config.json pairs[${i}]`);
        setUtxoQty(utxoQtyByToken, bId, bUtxoQty, `config.json pairs[${i}]`);

        pairs.push({ ...canonical, feePct });
    }

    pairs.sort((x, y) => {
        const aCmp = x.tokenIdA.localeCompare(y.tokenIdA);
        return aCmp !== 0 ? aCmp : x.tokenIdB.localeCompare(y.tokenIdB);
    });

    return {
        port,
        utxoQtyByToken,
        pairs,
    };
};

/**
 * Load and parse `config.json` from the alp-dex package root.
 * @throws if the file is missing or invalid
 */
export const loadTradedConfig = (
    configPath: string = path.join(getAlpDexRoot(), CONFIG_FILENAME),
): ParsedTradedConfig => {
    if (!fs.existsSync(configPath)) {
        throw new Error(
            `Missing ${configPath}. Copy ${CONFIG_SAMPLE_FILENAME} to ${CONFIG_FILENAME} and edit it.`,
        );
    }
    return parseTradedConfigJson(fs.readFileSync(configPath, 'utf8'));
};

/** Token ids referenced by a parsed config (sorted). */
export const tokenIdsFromConfig = (config: ParsedTradedConfig): string[] => {
    return [...config.utxoQtyByToken.keys()].sort();
};

/**
 * Assert `tokenId` is allowlisted in the parsed config.
 */
export const assertTokenIdInConfig = (
    config: ParsedTradedConfig,
    tokenId: string,
): string => {
    const id = assertTokenId(tokenId);
    if (!config.utxoQtyByToken.has(id)) {
        throw new Error(`Token ${id} is not in traded config`);
    }
    return id;
};

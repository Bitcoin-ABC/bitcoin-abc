// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as fs from 'fs';
import * as path from 'path';
import { ValidationError } from '../methods/errors';
import { assertTokenId } from '../methods/tokenId';
import { assertEcashAddress, resolveLpAddresses } from '../wallet/accounts';
import { assertBip39Mnemonic, MNEMONIC_PLACEHOLDER } from './mnemonic';
import { canonicalizePair, pairKey, type TradedPair } from './tradedPairs';

export const CONFIG_FILENAME = 'config.json';
export const CONFIG_SAMPLE_FILENAME = 'config.sample.json';
export { MNEMONIC_PLACEHOLDER };

export type TelegramConfig = {
    /** Admin alert chat id (required if `telegram` is present) */
    adminChat: string;
    /** Bot token used for admin + ops sends */
    botToken: string;
    /** Ops alert chat id (settle audit messages) */
    opsChat: string;
};

export type ParsedTradedConfig = {
    /** HTTP listen port */
    port: number;
    /** Valid BIP39 English mnemonic; seeds seller + slush only */
    mnemonic: string;
    /**
     * Fee / misc-sweep payout address (must not be seller/slush).
     * The fee wallet should be off the server and does not need to be a hot
     * wallet.
     */
    feeAddress: string;
    /** Chronik HTTP URLs (primary first, then failover). */
    chronikUrls: string[];
    /**
     * Optional Telegram ops/admin alerts. All three fields are required when
     * this object is present; omit the key entirely to disable.
     */
    telegram?: TelegramConfig;
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

/**
 * Non-empty Chronik URL list. chronik-client rejects trailing slashes and
 * non-http(s) schemes when the client is constructed.
 */
const parseChronikUrls = (raw: unknown): string[] => {
    if (!Array.isArray(raw) || raw.length === 0) {
        throw new Error('config.json chronikUrls must be a non-empty array');
    }
    const urls: string[] = [];
    for (const [i, item] of raw.entries()) {
        if (typeof item !== 'string' || item.trim() === '') {
            throw new Error(`chronikUrls[${i}] must be a non-empty string`);
        }
        const url = item.trim();
        if (url.endsWith('/')) {
            throw new Error(
                `chronikUrls[${i}] must not end with a trailing slash`,
            );
        }
        urls.push(url);
    }
    return urls;
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

const parseRequiredString = (raw: unknown, label: string): string => {
    if (typeof raw !== 'string' || raw.trim() === '') {
        throw new Error(`${label} must be a non-empty string`);
    }
    return raw.trim();
};

/**
 * Optional Telegram block: omit entirely, or supply all of adminChat,
 * botToken, and opsChat.
 */
const parseTelegram = (raw: unknown): TelegramConfig | undefined => {
    if (raw === undefined) {
        return undefined;
    }
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error(
            'config.json telegram must be an object with adminChat, botToken, and opsChat',
        );
    }
    const obj = raw as {
        adminChat?: unknown;
        botToken?: unknown;
        opsChat?: unknown;
    };
    if (
        obj.adminChat === undefined ||
        obj.botToken === undefined ||
        obj.opsChat === undefined
    ) {
        throw new Error(
            'config.json telegram requires adminChat, botToken, and opsChat (or omit telegram entirely)',
        );
    }
    return {
        adminChat: parseRequiredString(obj.adminChat, 'telegram.adminChat'),
        botToken: parseRequiredString(obj.botToken, 'telegram.botToken'),
        opsChat: parseRequiredString(obj.opsChat, 'telegram.opsChat'),
    };
};

/**
 * Parse config JSON (see `config.sample.json`).
 *
 * Top-level `port`, `mnemonic` (valid BIP39 English), `feeAddress`, and
 * `chronikUrls` are required. `feeAddress` must not be seller/slush (fee
 * wallet should be off the server and does not need to be a hot wallet).
 * Optional `telegram` is all-or-nothing.
 * Each pair must set `aTokenId`, `bTokenId`, `feePct`, `aUtxoQty`, and
 * `bUtxoQty`. Postage stamp size is fixed in code (`POSTAGE_SATS`), not
 * config.
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
        mnemonic?: unknown;
        feeAddress?: unknown;
        chronikUrls?: unknown;
        telegram?: unknown;
        pairs?: unknown;
    };

    if (obj.port === undefined) {
        throw new Error('config.json port is required');
    }
    const port = parsePort(obj.port);

    if (obj.mnemonic === undefined) {
        throw new Error('config.json mnemonic is required');
    }
    const mnemonic = assertBip39Mnemonic(obj.mnemonic);

    if (obj.feeAddress === undefined) {
        throw new Error('config.json feeAddress is required');
    }
    if (typeof obj.feeAddress !== 'string') {
        throw new Error(
            `feeAddress must be a string (got ${typeof obj.feeAddress})`,
        );
    }
    const feeAddress = assertEcashAddress(obj.feeAddress, 'feeAddress');
    // Reject feeAddress == seller/slush early.
    resolveLpAddresses(mnemonic, feeAddress);

    if (obj.chronikUrls === undefined) {
        throw new Error('config.json chronikUrls is required');
    }
    const chronikUrls = parseChronikUrls(obj.chronikUrls);

    const telegram = parseTelegram(obj.telegram);

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
        mnemonic,
        feeAddress,
        chronikUrls,
        ...(telegram !== undefined ? { telegram } : {}),
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
        throw new ValidationError(`Token ${id} is not in traded config`);
    }
    return id;
};

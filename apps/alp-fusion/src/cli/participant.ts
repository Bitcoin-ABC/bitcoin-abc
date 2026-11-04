// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Node participant: mnemonic → non-HD key → {@link createNodeFusionClient}.
 *
 * One ALP UTXO and one XEC fuel UTXO per round. Change is an uncolored
 * output so the fuel UTXO does not have to be pre-sized to the fee.
 * Every player in the round must use the same `minPlayers` (the
 * coordinator's) so the equal fee share matches the merged tx.
 */
import { ChronikClient } from 'chronik-client';
import {
    Address,
    DEFAULT_DUST_SATS,
    HdNode,
    mnemonicToSeed,
    Script,
    shaRmd160,
    XEC_TOKEN_AWARE_DERIVATION_PATH,
} from 'ecash-lib';

import type { FusionChronik } from '../client/chronik.js';
import {
    FusionClient,
    type FusionRoundArgs,
    type FusionRoundResult,
    type LoadedCoins,
} from '../client/fusionClient.js';
import { createNodeFusionClient } from '../node.js';
import {
    ALP_MAX_OUTPUTS,
    DEFAULT_CONTROL_PORT,
    DEFAULT_MIN_PLAYERS,
} from '../protocol/constants.js';
import type { WireContribution } from '../protocol/components.js';
import { estimateAlpSendFeeSats } from '../tx/assemble.js';
import type { FusionInputKey } from '../tx/sign.js';
import { parseCsv, parseUint } from './parse.js';

/** Printed for `--help` and missing/invalid env. */
export const PARTICIPANT_ENV_USAGE = `Usage: pnpm start:participant

Config via .env (copy env.sample). Required:
  MNEMONIC              12 or 24 lowercase words, single spaces
  CHRONIK_URLS          Comma-separated Chronik HTTP(S) URLs
  TOKEN_ID              64-hex ALP token id to fuse

Optional:
  ATOM_TIER             Pool tier to join (default 0)
  COORDINATOR_HOST      Coordinator control host (default 127.0.0.1)
  CONTROL_PORT          Coordinator control port (default ${DEFAULT_CONTROL_PORT})
  MIN_PLAYERS           Must match the coordinator (default ${DEFAULT_MIN_PLAYERS})
  ONCE                  1 = exit after a single attempt; otherwise loop
`;

/** Parse / start failure. `exitCode` 0 is `--help`. */
export class ParticipantConfigError extends Error {
    readonly exitCode: number;

    constructor(message: string, exitCode = 1) {
        super(message);
        this.name = 'ParticipantConfigError';
        this.exitCode = exitCode;
    }
}

/** Validated participant process config. */
export interface ParticipantConfig {
    mnemonic: string;
    chronikUrls: string[];
    tokenId: string;
    atomTier: bigint;
    coordinatorHost: string;
    controlPort: number;
    minPlayers: number;
    once: boolean;
}

export interface StartParticipantDeps {
    /** Override Chronik construction (tests inject MockChronikClient). */
    createChronik?: (urls: string[]) => FusionChronik;
    /** Override the TCP round (tests skip the network). */
    runRound?: (args: FusionRoundArgs) => Promise<FusionRoundResult>;
    log?: (line: string) => void;
}

export interface StartedParticipant {
    config: ParticipantConfig;
    client: FusionClient;
    log: (line: string) => void;
}

const MNEMONIC_FORMAT =
    'MNEMONIC must be 12 or 24 lowercase words separated by single spaces';

/**
 * Key at {@link XEC_TOKEN_AWARE_DERIVATION_PATH} (`m/44'/1899'/0'/0/0`),
 * the same address as `Wallet.fromMnemonic` without `{ hd: true }`.
 *
 * @param mnemonic - 12 or 24 lowercase words, single spaces
 */
export function fusionKeyFromMnemonic(mnemonic: string): FusionInputKey {
    const phrase = checkedMnemonic(mnemonic.trim());
    const node = HdNode.fromSeed(mnemonicToSeed(phrase)).derivePath(
        XEC_TOKEN_AWARE_DERIVATION_PATH,
    );
    const sk = node.seckey();
    if (!sk) {
        throw new ParticipantConfigError(
            'MNEMONIC did not derive a private key',
        );
    }
    return { sk, pubkey: node.pubkey() };
}

/**
 * Parse participant config from `process.env` (or a test double).
 * `--help` / `-h` throws with `exitCode` 0. `--once` forces one attempt.
 * A leading `--` is pnpm's argument separator (`pnpm start:participant -- --once`).
 *
 * @param env - Environment map
 * @param argv - `process.argv.slice(2)`
 */
export function parseParticipantEnv(
    env: NodeJS.Dict<string> = process.env,
    argv: string[] = [],
): ParticipantConfig {
    const args = argv[0] === '--' ? argv.slice(1) : argv;
    if (args.includes('--help') || args.includes('-h')) {
        throw new ParticipantConfigError(PARTICIPANT_ENV_USAGE, 0);
    }
    const onceFlag = args.includes('--once');
    const rest = args.filter(arg => arg !== '--once');
    if (rest.length > 0) {
        throw new ParticipantConfigError(
            `Unexpected argument(s): ${rest.join(' ')}\n\n${PARTICIPANT_ENV_USAGE}`,
        );
    }

    const mnemonicRaw = (env.MNEMONIC ?? '').trim();
    if (mnemonicRaw.length === 0) {
        throw new ParticipantConfigError(
            `MNEMONIC is required\n\n${PARTICIPANT_ENV_USAGE}`,
        );
    }
    const mnemonic = checkedMnemonic(mnemonicRaw);

    const chronikUrls = parseCsv(env.CHRONIK_URLS);
    if (chronikUrls.length === 0) {
        throw new ParticipantConfigError(
            `CHRONIK_URLS is required\n\n${PARTICIPANT_ENV_USAGE}`,
        );
    }
    for (const url of chronikUrls) {
        if (url.endsWith('/')) {
            throw new ParticipantConfigError(
                `CHRONIK_URLS entry cannot end with '/', got: ${url}`,
            );
        }
        if (!url.startsWith('https://') && !url.startsWith('http://')) {
            throw new ParticipantConfigError(
                `CHRONIK_URLS entry must start with 'https://' or 'http://', got: ${url}`,
            );
        }
    }

    const tokenRaw = (env.TOKEN_ID ?? '').trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(tokenRaw)) {
        throw new ParticipantConfigError('TOKEN_ID must be 64 hex characters');
    }

    const host = (env.COORDINATOR_HOST ?? '127.0.0.1').trim();
    if (host.length === 0) {
        throw new ParticipantConfigError('COORDINATOR_HOST must be non-empty');
    }

    const onceEnv = (env.ONCE ?? '').trim().toLowerCase();
    const once =
        onceFlag || onceEnv === '1' || onceEnv === 'true' || onceEnv === 'yes';

    return {
        mnemonic,
        chronikUrls,
        tokenId: tokenRaw,
        atomTier: parseAtomTier(env.ATOM_TIER),
        coordinatorHost: host,
        controlPort: parsePort(env.CONTROL_PORT, DEFAULT_CONTROL_PORT),
        minPlayers: parseMinPlayers(env.MIN_PLAYERS),
        once,
    };
}

/**
 * One token UTXO, one fuel UTXO, one dust token output, one XEC change.
 * Returns no token inputs when the wallet cannot fund that shape (idle).
 *
 * Fee share is `ceil(roundFee / minPlayers)`. Callers in the same round
 * must pass the same `minPlayers` the coordinator used.
 *
 * @param coins - UTXOs from {@link loadWireInputsFromChronik}
 * @param minPlayers - Players in the round, including this one
 */
export function buildParticipantContribution(
    coins: LoadedCoins,
    minPlayers: number,
): WireContribution {
    if (!Number.isSafeInteger(minPlayers) || minPlayers < 2) {
        throw new Error('minPlayers must be an integer >= 2');
    }
    const empty: WireContribution = { tokenInputs: [], tokenOutputs: [] };
    const token = coins.tokenInputs.find(
        inp => inp.atoms > 0n && inp.sats > 0n,
    );
    if (!token) {
        return empty;
    }
    const feeShare = roundFeeShare(minPlayers, token.script);
    const dust = DEFAULT_DUST_SATS;
    const fuels = (coins.fuelInputs ?? [])
        .filter(fuel => fuel.atoms === 0n && fuel.sats > 0n)
        .sort((a, b) => {
            if (a.sats < b.sats) {
                return -1;
            }
            if (a.sats > b.sats) {
                return 1;
            }
            return 0;
        });
    for (const fuel of fuels) {
        const change = token.sats + fuel.sats - dust - feeShare;
        if (change < dust) {
            continue;
        }
        return {
            tokenInputs: [token],
            fuelInputs: [fuel],
            tokenOutputs: [
                { script: token.script, atoms: token.atoms, sats: dust },
            ],
            xecOutputs: [{ script: token.script, sats: change }],
        };
    }
    return empty;
}

/**
 * Build a {@link FusionClient} and log the payout address. Does not connect.
 *
 * @param config - From {@link parseParticipantEnv}
 * @param deps - Optional Chronik factory, round runner, and log sink
 */
export async function startParticipant(
    config: ParticipantConfig,
    deps: StartParticipantDeps = {},
): Promise<StartedParticipant> {
    const log = deps.log ?? (() => {});
    let chronik: FusionChronik;
    try {
        chronik = (deps.createChronik ?? (urls => new ChronikClient(urls)))(
            config.chronikUrls,
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new ParticipantConfigError(`Chronik client: ${message}`);
    }

    let key: FusionInputKey;
    try {
        key = fusionKeyFromMnemonic(config.mnemonic);
    } catch (err) {
        if (err instanceof ParticipantConfigError) {
            throw err;
        }
        const message = err instanceof Error ? err.message : String(err);
        throw new ParticipantConfigError(`MNEMONIC: ${message}`);
    }

    const client = createNodeFusionClient({
        host: config.coordinatorHost,
        port: config.controlPort,
        chronik,
        tokenId: config.tokenId,
        atomTier: config.atomTier,
        keys: [key],
        buildContribution: coins =>
            buildParticipantContribution(coins, config.minPlayers),
        runRound: deps.runRound,
        onIteration: outcome => {
            log(`alp-fusion participant ${outcome}`);
        },
        onFused: result => {
            log(
                `alp-fusion participant fused txid=${result.txid ?? 'unknown'}`,
            );
        },
    });
    log(
        `alp-fusion participant address=${Address.p2pkh(shaRmd160(key.pubkey)).address} ` +
            `coordinator=${config.coordinatorHost}:${config.controlPort} ` +
            `tokenId=${config.tokenId} atomTier=${config.atomTier} ` +
            `minPlayers=${config.minPlayers}` +
            (config.once ? ' once' : ' loop'),
    );
    return { config, client, log };
}

/**
 * One attempt, or loop until {@link FusionClient.stop}.
 *
 * @param started - From {@link startParticipant}
 */
export async function runParticipant(
    started: StartedParticipant,
): Promise<void> {
    try {
        if (started.config.once) {
            const attempt = await started.client.fuseOnce();
            if (attempt.outcome === 'idle') {
                started.log('alp-fusion participant idle');
                return;
            }
            started.log(
                `alp-fusion participant fused txid=${attempt.result.txid ?? 'unknown'}`,
            );
            return;
        }
        await started.client.run();
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(message);
    }
}

/**
 * Parse env and start. Convenience for the process entry.
 *
 * @param env - Environment map
 * @param argv - `process.argv.slice(2)`
 * @param deps - Optional Chronik factory, round runner, and log sink
 */
export async function startParticipantFromEnv(
    env: NodeJS.Dict<string> = process.env,
    argv: string[] = process.argv.slice(2),
    deps: StartParticipantDeps = {},
): Promise<StartedParticipant> {
    return startParticipant(parseParticipantEnv(env, argv), deps);
}

/**
 * Fee this player should add for a round of `minPlayers` identical shapes
 * (one token input, one token output, one fuel input, one change output).
 */
function roundFeeShare(minPlayers: number, script: Script): bigint {
    const dust = DEFAULT_DUST_SATS;
    const tokenId = '00'.repeat(32);
    const tokenInputs = [];
    const tokenOutputs = [];
    const fuelInputs = [];
    const xecOutputs = [];
    for (let i = 0; i < minPlayers; i++) {
        tokenInputs.push({
            prevOut: { txid: '11'.repeat(32), outIdx: i },
            sats: dust,
            script,
            tokenId,
            atoms: 1n,
        });
        tokenOutputs.push({ script, atoms: 1n, sats: dust });
        fuelInputs.push({
            prevOut: { txid: '22'.repeat(32), outIdx: i },
            sats: dust,
            script,
            atoms: 0n,
        });
        xecOutputs.push({ script, sats: dust });
    }
    const { feeSats } = estimateAlpSendFeeSats({
        tokenId,
        tokenInputs,
        tokenOutputs,
        fuelInputs,
        xecOutputs,
    });
    const players = BigInt(minPlayers);
    return (feeSats + players - 1n) / players;
}

function fail(message: string): never {
    throw new ParticipantConfigError(message);
}

/**
 * Trim is the caller's job. Rejects anything other than 12 or 24
 * lowercase words separated by single spaces.
 */
function checkedMnemonic(mnemonic: string): string {
    const words = mnemonic.split(' ');
    if (
        (words.length !== 12 && words.length !== 24) ||
        words.some(word => !/^[a-z]+$/.test(word))
    ) {
        throw new ParticipantConfigError(MNEMONIC_FORMAT);
    }
    return mnemonic;
}

function parsePort(raw: string | undefined, defaultPort: number): number {
    if (raw === undefined || raw.trim() === '') {
        return defaultPort;
    }
    const n = parseUint('CONTROL_PORT', raw.trim(), fail);
    if (n > 65535) {
        throw new ParticipantConfigError(
            `CONTROL_PORT must be 0-65535, got ${raw}`,
        );
    }
    return n;
}

function parseMinPlayers(raw: string | undefined): number {
    if (raw === undefined || raw.trim() === '') {
        return DEFAULT_MIN_PLAYERS;
    }
    const n = parseUint('MIN_PLAYERS', raw.trim(), fail);
    if (n < 2 || n > ALP_MAX_OUTPUTS) {
        throw new ParticipantConfigError(
            `MIN_PLAYERS must be an integer from 2 to ${ALP_MAX_OUTPUTS}, got ${raw}`,
        );
    }
    return n;
}

function parseAtomTier(raw: string | undefined): bigint {
    if (raw === undefined || raw.trim() === '') {
        return 0n;
    }
    const trimmed = raw.trim();
    if (!/^\d+$/.test(trimmed)) {
        throw new ParticipantConfigError(
            `ATOM_TIER must be a non-negative integer, got ${raw}`,
        );
    }
    return BigInt(trimmed);
}

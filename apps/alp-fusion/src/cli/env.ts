// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Coordinator process config from environment (see `env.sample`).
 */
import { BlockList, isIPv4, isIPv6 } from 'node:net';

import {
    DEFAULT_CONTROL_PORT,
    DEFAULT_COVERT_PORT,
    DEFAULT_MIN_PLAYERS,
} from '../protocol/constants.js';

/** Printed for `--help` and missing/invalid env. */
export const COORDINATOR_ENV_USAGE = `Usage: pnpm start:coordinator

Config via .env (copy env.sample). Required:
  CHRONIK_URLS          Comma-separated Chronik HTTP(S) URLs

Optional:
  HOST                  Bind address (default 127.0.0.1)
  COVERT_DOMAIN         Advertised covert host (default: HOST).
                        Required when HOST is a wildcard (0.0.0.0 / ::).
  CONTROL_PORT          Control TCP port (default ${DEFAULT_CONTROL_PORT})
  COVERT_PORT           Covert TCP port (default ${DEFAULT_COVERT_PORT})
  MIN_PLAYERS           Players to start a round (default ${DEFAULT_MIN_PLAYERS})
`;

/** Parse / start failure. `exitCode` 0 is `--help`. */
export class CoordinatorConfigError extends Error {
    readonly exitCode: number;

    constructor(message: string, exitCode = 1) {
        super(message);
        this.name = 'CoordinatorConfigError';
        this.exitCode = exitCode;
    }
}

/** Validated coordinator process config. */
export interface CoordinatorConfig {
    chronikUrls: string[];
    host: string;
    /** Host clients dial for covert (must not be a wildcard). */
    covertDomain: string;
    controlPort: number;
    covertPort: number;
    minPlayers: number;
}

/** Unspecified bind addresses (IPv4 + IPv6 any), via Node `net.BlockList`. */
const UNSPECIFIED_BIND = new BlockList();
UNSPECIFIED_BIND.addAddress('0.0.0.0', 'ipv4');
UNSPECIFIED_BIND.addAddress('::', 'ipv6');

/**
 * True when `host` is an all-interfaces bind that clients must not dial.
 * Uses {@link isIPv4} / {@link isIPv6} + {@link BlockList}.
 *
 * @param host - Bind or advertised hostname / IP
 */
export function isWildcardBind(host: string): boolean {
    const h =
        host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
    if (isIPv4(h)) {
        return UNSPECIFIED_BIND.check(h, 'ipv4');
    }
    if (isIPv6(h)) {
        return UNSPECIFIED_BIND.check(h, 'ipv6');
    }
    return false;
}

/**
 * Parse coordinator config from `process.env` (or a test double).
 * `--help` / `-h` in `argv` throws with {@link CoordinatorConfigError}
 * `exitCode` 0.
 *
 * @param env - Environment map
 * @param argv - `process.argv.slice(2)` (only `--help` / `-h` recognized)
 */
export function parseCoordinatorEnv(
    env: NodeJS.Dict<string> = process.env,
    argv: string[] = [],
): CoordinatorConfig {
    const args = argv[0] === '--' ? argv.slice(1) : argv;
    if (args.includes('--help') || args.includes('-h')) {
        throw new CoordinatorConfigError(COORDINATOR_ENV_USAGE, 0);
    }
    if (args.length > 0) {
        throw new CoordinatorConfigError(
            `Unexpected argument(s): ${args.join(' ')}\n\n${COORDINATOR_ENV_USAGE}`,
        );
    }

    const chronikUrls = parseCsv(env.CHRONIK_URLS);
    if (chronikUrls.length === 0) {
        throw new CoordinatorConfigError(
            `CHRONIK_URLS is required\n\n${COORDINATOR_ENV_USAGE}`,
        );
    }
    for (const url of chronikUrls) {
        if (url.endsWith('/')) {
            throw new CoordinatorConfigError(
                `CHRONIK_URLS entry cannot end with '/', got: ${url}`,
            );
        }
        if (!url.startsWith('https://') && !url.startsWith('http://')) {
            throw new CoordinatorConfigError(
                `CHRONIK_URLS entry must start with 'https://' or 'http://', got: ${url}`,
            );
        }
    }

    const host = (env.HOST ?? '127.0.0.1').trim();
    if (host.length === 0) {
        throw new CoordinatorConfigError('HOST must be non-empty');
    }

    const covertDomainRaw = env.COVERT_DOMAIN?.trim();
    let covertDomain: string;
    if (covertDomainRaw === undefined || covertDomainRaw.length === 0) {
        if (env.COVERT_DOMAIN !== undefined) {
            throw new CoordinatorConfigError('COVERT_DOMAIN must be non-empty');
        }
        if (isWildcardBind(host)) {
            throw new CoordinatorConfigError(
                `HOST ${host} is not reachable by clients; ` +
                    `set COVERT_DOMAIN to a hostname or IP\n\n${COORDINATOR_ENV_USAGE}`,
            );
        }
        covertDomain = host;
    } else {
        if (isWildcardBind(covertDomainRaw)) {
            throw new CoordinatorConfigError(
                `COVERT_DOMAIN must be a reachable host, not ${covertDomainRaw}`,
            );
        }
        covertDomain = covertDomainRaw;
    }

    return {
        chronikUrls,
        host,
        covertDomain,
        controlPort: parsePort(
            'CONTROL_PORT',
            env.CONTROL_PORT,
            DEFAULT_CONTROL_PORT,
        ),
        covertPort: parsePort(
            'COVERT_PORT',
            env.COVERT_PORT,
            DEFAULT_COVERT_PORT,
        ),
        minPlayers: parseMinPlayers(env.MIN_PLAYERS),
    };
}

function parseCsv(value: string | undefined): string[] {
    return (value ?? '')
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
}

function parsePort(
    name: string,
    raw: string | undefined,
    defaultPort: number,
): number {
    if (raw === undefined || raw.trim() === '') {
        return defaultPort;
    }
    const n = parseUint(name, raw.trim());
    if (n > 65535) {
        throw new CoordinatorConfigError(`${name} must be 0-65535, got ${raw}`);
    }
    return n;
}

function parseMinPlayers(raw: string | undefined): number {
    if (raw === undefined || raw.trim() === '') {
        return DEFAULT_MIN_PLAYERS;
    }
    const n = parseUint('MIN_PLAYERS', raw.trim());
    if (n < 2) {
        throw new CoordinatorConfigError(
            `MIN_PLAYERS must be an integer >= 2, got ${raw}`,
        );
    }
    return n;
}

function parseUint(name: string, raw: string): number {
    if (!/^\d+$/.test(raw)) {
        throw new CoordinatorConfigError(
            `${name} must be an integer, got ${raw}`,
        );
    }
    const n = Number(raw);
    if (!Number.isSafeInteger(n)) {
        throw new CoordinatorConfigError(`${name} out of range: ${raw}`);
    }
    return n;
}

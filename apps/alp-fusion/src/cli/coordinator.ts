// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Start {@link FusionCoordinator} from validated env config.
 */
import { ChronikClient } from 'chronik-client';

import type { FusionBroadcaster } from '../client/chronik.js';
import { FusionCoordinator } from '../coordinator/wire.js';
import {
    CoordinatorConfigError,
    parseCoordinatorEnv,
    type CoordinatorConfig,
} from './env.js';

export {
    COORDINATOR_ENV_USAGE,
    CoordinatorConfigError,
    isWildcardBind,
    parseCoordinatorEnv,
    type CoordinatorConfig,
} from './env.js';

export interface StartCoordinatorDeps {
    /** Override Chronik construction (tests inject MockChronikClient). */
    createChronik?: (urls: string[]) => FusionBroadcaster;
    log?: (line: string) => void;
}

export interface StartedCoordinator {
    config: CoordinatorConfig;
    coordinator: FusionCoordinator;
    controlPort: number;
    covertPort: number;
}

/**
 * Bind control + covert. Caller must {@link FusionCoordinator.close}.
 *
 * @param config - From {@link parseCoordinatorEnv}
 * @param deps - Optional Chronik factory and log sink
 */
export async function startCoordinator(
    config: CoordinatorConfig,
    deps: StartCoordinatorDeps = {},
): Promise<StartedCoordinator> {
    let chronik: FusionBroadcaster;
    try {
        chronik = (deps.createChronik ?? (urls => new ChronikClient(urls)))(
            config.chronikUrls,
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new CoordinatorConfigError(`Chronik client: ${message}`);
    }

    const coordinator = new FusionCoordinator({
        host: config.host,
        covertDomain: config.covertDomain,
        minPlayers: config.minPlayers,
        chronik,
    });

    try {
        const ports = await coordinator.start(
            config.host,
            config.controlPort,
            config.covertPort,
        );
        deps.log?.(
            `alp-fusion coordinator listening ` +
                `bind=${config.host} ` +
                `control=${ports.controlPort} ` +
                `covert=${ports.covertPort} ` +
                `advertise=${config.covertDomain} ` +
                `minPlayers=${config.minPlayers}`,
        );
        return {
            config,
            coordinator,
            controlPort: ports.controlPort,
            covertPort: ports.covertPort,
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        try {
            await coordinator.close();
        } catch {
            // Bind failed; ignore a follow-on close error.
        }
        throw new CoordinatorConfigError(
            `Failed to start coordinator: ${message}`,
        );
    }
}

/**
 * Parse env + bind. Convenience for the process entry.
 *
 * @param env - Environment map
 * @param argv - `process.argv.slice(2)`
 * @param deps - Optional Chronik factory and log sink
 */
export async function startCoordinatorFromEnv(
    env: NodeJS.Dict<string> = process.env,
    argv: string[] = process.argv.slice(2),
    deps: StartCoordinatorDeps = {},
): Promise<StartedCoordinator> {
    return startCoordinator(parseCoordinatorEnv(env, argv), deps);
}

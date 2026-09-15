// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Node TCP helper. Import {@link FusionClient} from `fusionClient.ts`;
 * this file only binds {@link runWireRound} as the default `runRound`.
 *
 * Browser / Cashtab must not import this file.
 */
import {
    FusionClient,
    type FusionClientOptions,
} from './client/fusionClient.js';
import { runWireRound, type RunWireRoundOptions } from './client/wire.js';

export {
    runWireRound,
    type RunWireRoundOptions,
    type WireRoundResult,
} from './client/wire.js';

export type NodeFusionClientOptions = Omit<FusionClientOptions, 'runRound'> & {
    host: string;
    port: number;
    connect?: RunWireRoundOptions['connect'];
    recvTimeoutMs?: number;
    pools?: RunWireRoundOptions['pools'];
    covertRandSpanMs?: number;
    covertTimeoutMs?: number;
    runRound?: FusionClientOptions['runRound'];
};

/**
 * {@link FusionClient} with Node TCP {@link runWireRound} as the default
 * round runner.
 *
 * @param opts - Wallet deps plus coordinator `host` / `port`
 */
export function createNodeFusionClient(
    opts: NodeFusionClientOptions,
): FusionClient {
    const {
        host,
        port,
        connect,
        recvTimeoutMs,
        pools,
        covertRandSpanMs,
        covertTimeoutMs,
        runRound,
        ...clientOpts
    } = opts;
    return new FusionClient({
        ...clientOpts,
        runRound:
            runRound ??
            (args =>
                runWireRound({
                    host,
                    port,
                    tokenId: args.tokenId,
                    atomTier: args.atomTier,
                    contribution: args.contribution,
                    connect,
                    recvTimeoutMs,
                    pools,
                    covertRandSpanMs,
                    covertTimeoutMs,
                })),
    });
}

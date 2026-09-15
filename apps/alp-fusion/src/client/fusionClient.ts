// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Wallet-facing fusion client. Callers inject Chronik, keys, output
 * construction, and {@link FusionClientOptions.runRound}.
 *
 * Node daemons use `createNodeFusionClient` in `src/node.ts` to supply
 * the TCP `runWireRound` default.
 */
import { loadWireInputsFromChronik, type FusionChronik } from './chronik.js';
import {
    ContinuousClient,
    type ContinuousClientOptions,
    type FuseLoopOutcome,
} from './continuous.js';
import type {
    WireContribution,
    WireFuelInput,
    WireTokenInput,
} from '../protocol/components.js';
import type { FusionInputKey } from '../tx/sign.js';

/** Coins {@link loadWireInputsFromChronik} returned for this wallet. */
export interface LoadedCoins {
    tokenInputs: WireTokenInput[];
    fuelInputs: WireFuelInput[];
}

/** Payload handed to the injected round runner. */
export interface FusionRoundArgs {
    tokenId: string;
    atomTier: bigint;
    contribution: WireContribution;
}

export interface FusionRoundResult {
    rawTx: Uint8Array;
    txid?: string;
    components?: Uint8Array[];
}

export type FusionAttempt =
    | { outcome: 'idle' }
    | { outcome: 'fused'; result: FusionRoundResult };

export interface FusionClientOptions extends ContinuousClientOptions {
    chronik: FusionChronik;
    tokenId: string;
    atomTier: bigint;
    keys: FusionInputKey[];
    /**
     * Turn loaded UTXOs into this round's inputs + fresh token outputs.
     * Wallet policy (chops, change, fee fuel) lives here.
     */
    buildContribution: (coins: LoadedCoins) => WireContribution;
    /**
     * One networked (or test) round. Required so this module never imports
     * Node TCP. Use `createNodeFusionClient` for the default wire path.
     */
    runRound: (args: FusionRoundArgs) => Promise<FusionRoundResult>;
    /**
     * Fired from {@link FusionClient.run} after a successful round.
     * Awaited so the next iteration waits; a throw/reject does not become
     * `'failed'` (the fuse already completed).
     */
    onFused?: (result: FusionRoundResult) => void | Promise<void>;
}

/**
 * Shared one-shot + continuous client. {@link fuseOnce} is the wallet
 * primitive; {@link run} reuses {@link ContinuousClient} delays.
 */
export class FusionClient {
    readonly #opts: FusionClientOptions;
    readonly #loop: ContinuousClient;

    constructor(opts: FusionClientOptions) {
        if (opts.keys.length === 0) {
            throw new Error('FusionClient: no keys');
        }
        if (typeof opts.runRound !== 'function') {
            throw new Error('FusionClient: runRound is required');
        }
        this.#opts = opts;
        this.#loop = new ContinuousClient({
            successDelayMs: opts.successDelayMs,
            failureDelayMs: opts.failureDelayMs,
            idleDelayMs: opts.idleDelayMs,
            sleep: opts.sleep,
            onIteration: opts.onIteration,
        });
    }

    /** Request loop exit and abort any in-progress delay sleep. */
    stop(): void {
        this.#loop.stop();
    }

    /**
     * Load UTXOs from Chronik and run one injected round. Returns `idle` when
     * there are no fuseable ALP inputs (or `buildContribution` drops them).
     *
     * @returns Idle or a signed fused tx from the coordinator
     */
    async fuseOnce(): Promise<FusionAttempt> {
        let coins: LoadedCoins;
        try {
            coins = await loadWireInputsFromChronik(
                this.#opts.chronik,
                this.#opts.keys,
                this.#opts.tokenId,
            );
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(`FusionClient: Chronik load failed: ${message}`);
        }
        if (coins.tokenInputs.length === 0) {
            return { outcome: 'idle' };
        }

        const contribution = this.#opts.buildContribution(coins);
        if (contribution.tokenInputs.length === 0) {
            return { outcome: 'idle' };
        }

        try {
            const result = await this.#opts.runRound({
                tokenId: this.#opts.tokenId,
                atomTier: this.#opts.atomTier,
                contribution,
            });
            return { outcome: 'fused', result };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(`FusionClient: round failed: ${message}`);
        }
    }

    /**
     * Keep calling {@link fuseOnce} until {@link stop}. Round errors become
     * `'failed'` and the loop rejoins after Electrum-ABC-style delays.
     */
    async run(): Promise<void> {
        await this.#loop.run(async (): Promise<FuseLoopOutcome> => {
            const attempt = await this.fuseOnce();
            if (attempt.outcome === 'fused') {
                try {
                    await this.#opts.onFused?.(attempt.result);
                } catch {
                    // Notify failed; do not treat a completed fuse as 'failed'.
                }
            }
            return attempt.outcome;
        });
    }
}

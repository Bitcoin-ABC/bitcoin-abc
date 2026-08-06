// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Continuous (daemon-style) client wrapper around {@link runFuseLoop}.
 *
 * Callers inject one round attempt via `runOnce` (network + wallet + signing
 * land in follow-up diffs). This class owns stop / abort semantics so a CLI or
 * wallet can SIGINT without tearing down mid-sleep forever.
 */
import {
    runFuseLoop,
    type FuseLoopOutcome,
    type RunFuseLoopOptions,
} from './fuseLoop.js';

export type { FuseLoopOutcome };

export interface ContinuousClientOptions {
    successDelayMs?: number;
    failureDelayMs?: number;
    idleDelayMs?: number;
    sleep?: RunFuseLoopOptions['sleep'];
    onIteration?: RunFuseLoopOptions['onIteration'];
}

/**
 * Long-lived fuse client: {@link run} loops until {@link stop}.
 */
export class ContinuousClient {
    private stopped = false;
    private stopAbort: AbortController | null = null;

    constructor(readonly opts: ContinuousClientOptions = {}) {}

    /** Request loop exit and abort any in-progress delay sleep. */
    stop(): void {
        this.stopped = true;
        this.stopAbort?.abort();
    }

    /**
     * Keep calling `runOnce` until {@link stop}. Rejoins after fused / idle /
     * failed — Electrum-ABC-style continuous client.
     *
     * Rejects a second call while a loop is already active so `stop()` cannot
     * lose the first AbortController (and the first loop cannot clear the
     * second one's controller in `finally`).
     */
    async run(runOnce: () => Promise<FuseLoopOutcome>): Promise<void> {
        if (this.stopAbort !== null) {
            throw new Error('ContinuousClient is already running');
        }
        this.stopped = false;
        const stopAbort = new AbortController();
        this.stopAbort = stopAbort;
        try {
            await runFuseLoop({
                shouldStop: () => this.stopped,
                abortSignal: stopAbort.signal,
                runOnce,
                sleep: this.opts.sleep,
                successDelayMs: this.opts.successDelayMs,
                failureDelayMs: this.opts.failureDelayMs,
                idleDelayMs: this.opts.idleDelayMs,
                onIteration: this.opts.onIteration,
            });
        } finally {
            if (this.stopAbort === stopAbort) {
                this.stopAbort = null;
            }
        }
    }
}

export { runFuseLoop };

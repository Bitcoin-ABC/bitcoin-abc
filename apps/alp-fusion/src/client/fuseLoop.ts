// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Continuous fuse loop (CashFusion / Electrum-ABC style).
 *
 * Runs until `shouldStop()` is true. Does not exit on success or failure —
 * long-lived clients rejoin after each outcome so pools stay warm.
 *
 * Transport, signing, Chronik, and Tor are out of scope here; inject those via
 * {@link RunFuseLoopOptions.runOnce}.
 */
import { FUSE_LOOP } from '../protocol/constants.js';

export type FuseLoopOutcome = 'fused' | 'idle' | 'failed';

export interface RunFuseLoopOptions {
    /** Return true to exit the loop (e.g. SIGINT). */
    shouldStop: () => boolean;
    /** One join→wait→round attempt (or scan with nothing to do). */
    runOnce: () => Promise<FuseLoopOutcome>;
    sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
    /** Abort in-progress sleep when stop is requested. */
    abortSignal?: AbortSignal;
    successDelayMs?: number;
    failureDelayMs?: number;
    idleDelayMs?: number;
    onIteration?: (outcome: FuseLoopOutcome, delayMs: number) => void;
}

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
        return Promise.resolve();
    }
    return new Promise(resolve => {
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            resolve();
        };
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}

/**
 * Keep calling `runOnce` until `shouldStop()`. Sleeps between iterations using
 * {@link FUSE_LOOP} (or overrides). Thrown `runOnce` errors become `'failed'`.
 */
export async function runFuseLoop(opts: RunFuseLoopOptions): Promise<void> {
    const sleep = opts.sleep ?? defaultSleep;
    const delays = {
        successDelayMs: opts.successDelayMs ?? FUSE_LOOP.successDelayMs,
        failureDelayMs: opts.failureDelayMs ?? FUSE_LOOP.failureDelayMs,
        idleDelayMs: opts.idleDelayMs ?? FUSE_LOOP.idleDelayMs,
    };

    while (!opts.shouldStop()) {
        let outcome: FuseLoopOutcome;
        try {
            outcome = await opts.runOnce();
        } catch {
            outcome = 'failed';
        }
        if (opts.shouldStop()) {
            break;
        }

        let delayMs: number;
        switch (outcome) {
            case 'fused':
                delayMs = delays.successDelayMs;
                break;
            case 'failed':
                delayMs = delays.failureDelayMs;
                break;
            case 'idle':
                delayMs = delays.idleDelayMs;
                break;
        }
        opts.onIteration?.(outcome, delayMs);
        if (delayMs > 0) {
            await sleep(delayMs, opts.abortSignal);
        }
    }
}

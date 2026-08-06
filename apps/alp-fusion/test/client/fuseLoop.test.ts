// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { ContinuousClient } from '../../src/client/continuous.js';
import {
    runFuseLoop,
    type FuseLoopOutcome,
} from '../../src/client/fuseLoop.js';

describe('runFuseLoop', () => {
    it('stops when shouldStop becomes true after an iteration', async () => {
        let n = 0;
        const outcomes: FuseLoopOutcome[] = [];
        const sleepCalls: number[] = [];

        await runFuseLoop({
            shouldStop: () => n >= 2,
            runOnce: async () => {
                n++;
                return 'fused';
            },
            sleep: async ms => {
                sleepCalls.push(ms);
            },
            successDelayMs: 100,
            onIteration: outcome => outcomes.push(outcome),
        });

        // Second runOnce sets n=2 → shouldStop before second onIteration/sleep.
        expect(n).to.equal(2);
        expect(outcomes).to.deep.equal(['fused']);
        expect(sleepCalls).to.deep.equal([100]);
    });

    it('treats thrown runOnce as failed and continues', async () => {
        let n = 0;
        const seen: FuseLoopOutcome[] = [];
        const sleepCalls: number[] = [];

        await runFuseLoop({
            shouldStop: () => n >= 2,
            runOnce: async () => {
                n++;
                if (n === 1) {
                    throw new Error('boom');
                }
                return 'idle';
            },
            sleep: async ms => {
                sleepCalls.push(ms);
            },
            failureDelayMs: 50,
            idleDelayMs: 10,
            onIteration: o => seen.push(o),
        });

        expect(seen).to.deep.equal(['failed']);
        expect(sleepCalls).to.deep.equal([50]);
    });

    it('exits without sleeping when stopped during runOnce', async () => {
        let stop = false;
        let slept = false;

        await runFuseLoop({
            shouldStop: () => stop,
            runOnce: async () => {
                stop = true;
                return 'fused';
            },
            sleep: async () => {
                slept = true;
            },
            successDelayMs: 999,
        });

        expect(slept).to.equal(false);
    });

    it('aborts in-progress sleep when abortSignal fires', async () => {
        const ac = new AbortController();
        let n = 0;
        const t0 = Date.now();

        await runFuseLoop({
            shouldStop: () => n >= 1 && ac.signal.aborted,
            abortSignal: ac.signal,
            runOnce: async () => {
                n++;
                return 'fused';
            },
            successDelayMs: 60_000,
            onIteration: () => {
                setTimeout(() => ac.abort(), 20);
            },
        });

        expect(Date.now() - t0).to.be.lessThan(5_000);
    });
});

describe('ContinuousClient', () => {
    it('rejoins until stop() and aborts delay sleep', async () => {
        const outcomes: FuseLoopOutcome[] = [];
        let n = 0;
        const client = new ContinuousClient({
            successDelayMs: 60_000,
            onIteration: o => outcomes.push(o),
        });

        const t0 = Date.now();
        const running = client.run(async () => {
            n++;
            if (n === 1) {
                setTimeout(() => client.stop(), 20);
                return 'fused';
            }
            return 'idle';
        });

        await running;
        expect(n).to.equal(1);
        expect(outcomes).to.deep.equal(['fused']);
        expect(Date.now() - t0).to.be.lessThan(5_000);
    });

    it('rejects overlapping run() so stop() cannot orphan the first loop', async () => {
        const client = new ContinuousClient({
            successDelayMs: 60_000,
        });
        let entered = 0;

        const first = client.run(async () => {
            entered++;
            return 'fused';
        });

        try {
            await client.run(async () => 'idle');
            expect.fail('second run() should throw');
        } catch (err) {
            expect((err as Error).message).to.equal(
                'ContinuousClient is already running',
            );
        }

        client.stop();
        await first;
        expect(entered).to.equal(1);

        // After stop, a fresh run() is allowed.
        let secondEntered = 0;
        await client.run(async () => {
            secondEntered++;
            client.stop();
            return 'idle';
        });
        expect(secondEntered).to.equal(1);
    });
});

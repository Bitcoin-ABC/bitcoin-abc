// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { AsyncQueue } from '../src/methods/queue';

describe('AsyncQueue', () => {
    it('processes tasks sequentially', async () => {
        const queue = new AsyncQueue();
        const executionOrder: number[] = [];

        const task1 = queue.enqueue(async () => {
            executionOrder.push(1);
            await new Promise(resolve => setTimeout(resolve, 50));
            executionOrder.push(2);
            return 'task1';
        });

        const task2 = queue.enqueue(async () => {
            executionOrder.push(3);
            await new Promise(resolve => setTimeout(resolve, 10));
            executionOrder.push(4);
            return 'task2';
        });

        const task3 = queue.enqueue(async () => {
            executionOrder.push(5);
            return 'task3';
        });

        const [result1, result2, result3] = await Promise.all([
            task1,
            task2,
            task3,
        ]);

        assert.strictEqual(result1, 'task1');
        assert.strictEqual(result2, 'task2');
        assert.strictEqual(result3, 'task3');
        assert.deepStrictEqual(executionOrder, [1, 2, 3, 4, 5]);
    });

    it('isolates errors so later tasks still run', async () => {
        const queue = new AsyncQueue();

        const errorTask = queue.enqueue(async () => {
            throw new Error('Test error');
        });

        const successTask = queue.enqueue(async () => {
            return 'success';
        });

        await assert.rejects(errorTask, /Test error/);
        assert.strictEqual(await successTask, 'success');
    });

    it('never runs more than one critical section concurrently', async () => {
        const queue = new AsyncQueue();
        let concurrentExecutions = 0;
        let maxConcurrent = 0;

        const tasks = Array.from({ length: 10 }, (_, i) =>
            queue.enqueue(async () => {
                concurrentExecutions++;
                maxConcurrent = Math.max(maxConcurrent, concurrentExecutions);
                await new Promise(resolve => setTimeout(resolve, 10));
                concurrentExecutions--;
                return i;
            }),
        );

        await Promise.all(tasks);
        assert.strictEqual(maxConcurrent, 1);
    });
});

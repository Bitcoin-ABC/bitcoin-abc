// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

type QueueItem = {
    task: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
};

/**
 * Process-local FIFO async queue.
 *
 * Settles (and similar critical sections) run one at a time so seller UTXO
 * selection cannot race. Task errors reject only that waiter; the queue
 * continues with the next item.
 */
export class AsyncQueue {
    private queue: QueueItem[] = [];
    private processing = false;

    /**
     * Enqueue `task` and resolve/reject when it finishes (FIFO).
     */
    public async enqueue<T>(task: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.queue.push({
                task: task as () => Promise<unknown>,
                resolve: resolve as (value: unknown) => void,
                reject,
            });
            void this.process();
        });
    }

    private async process(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.queue.length > 0) {
            const item = this.queue.shift();
            if (item === undefined) {
                break;
            }

            try {
                const result = await item.task();
                item.resolve(result);
            } catch (error) {
                item.reject(
                    error instanceof Error ? error : new Error(String(error)),
                );
            }
        }

        this.processing = false;
    }
}

// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { BookSnapshot } from './bookSnapshot';

export type BookListener = (json: string) => void;

/**
 * Fan-out of the in-memory book. Subscribers get the current snapshot
 * immediately; later {@link publish} calls skip when pair reserves/spots
 * are unchanged (inventory reshape must not spam).
 */
export class BookHub {
    private readonly listeners = new Set<BookListener>();
    private lastPairsJson = '';
    private lastSnapshot: BookSnapshot | null = null;

    constructor(private readonly takeSnapshot: () => BookSnapshot) {}

    /**
     * Send the current book now. Returns an unsubscribe function.
     */
    subscribe(listener: BookListener): () => void {
        this.listeners.add(listener);
        const snap = this.lastSnapshot ?? this.takeSnapshot();
        this.lastSnapshot = snap;
        this.lastPairsJson = JSON.stringify(snap.pairs);
        listener(JSON.stringify(snap));
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Snapshot the wallets and notify listeners only if the book moved.
     */
    publish(): void {
        const snap = this.takeSnapshot();
        const pairsJson = JSON.stringify(snap.pairs);
        if (this.lastSnapshot !== null && pairsJson === this.lastPairsJson) {
            return;
        }
        this.lastPairsJson = pairsJson;
        this.lastSnapshot = snap;
        const json = JSON.stringify(snap);
        for (const listener of this.listeners) {
            listener(json);
        }
    }

    get listenerCount(): number {
        return this.listeners.size;
    }
}

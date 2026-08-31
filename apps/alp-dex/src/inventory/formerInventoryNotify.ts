// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { formerInventoryKey, type FormerInventoryPile } from './classify';

export type FormerInventoryNotifyStart = {
    key: string;
    generation: number;
};

/**
 * Dedup former-inventory Telegram across maintain passes.
 *
 * Sends are fire-and-forget (Telegram retries can outlive a later pass,
 * including post-settle). Only a completion whose generation is still
 * current may update lastKey — a stale success must not restore an
 * obsolete key after piles disappeared or a newer notify started.
 */
export class FormerInventoryNotify {
    #lastKey = '';
    #pendingKey = '';
    #generation = 0;

    /**
     * Decide whether this pass should send. Empty piles reset so a later
     * reappearance notifies again, and invalidate in-flight completions.
     *
     * @returns send handle, or null to skip
     */
    begin(
        label: string,
        piles: FormerInventoryPile[],
    ): FormerInventoryNotifyStart | null {
        if (piles.length === 0) {
            this.#lastKey = '';
            this.#pendingKey = '';
            this.#generation += 1;
            return null;
        }
        const key = formerInventoryKey(piles);
        if (
            (label === 'startup' || key !== this.#lastKey) &&
            key !== this.#pendingKey
        ) {
            this.#generation += 1;
            this.#pendingKey = key;
            return { key, generation: this.#generation };
        }
        return null;
    }

    /**
     * Apply a send result. No-op when a later pass already invalidated
     * this generation.
     */
    complete(start: FormerInventoryNotifyStart, ok: boolean): void {
        if (start.generation !== this.#generation) {
            return;
        }
        if (ok) {
            this.#lastKey = start.key;
        }
        this.#pendingKey = '';
    }
}

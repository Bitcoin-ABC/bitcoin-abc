// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { webViewError } from './common';

const HD_INDICES_STORAGE_KEY = 'ecashwallet.hdIndices.1';

interface StoredHdIndices {
    receiveIndex: number;
    changeIndex: number;
}

export interface HdIndices {
    receiveIndex: number;
    changeIndex: number;
}

function isValidIndex(index: number): boolean {
    return Number.isInteger(index) && index >= 0;
}

function normalizeHdIndices(stored: Partial<StoredHdIndices>): HdIndices {
    const receiveIndex = stored.receiveIndex ?? 0;
    const changeIndex = stored.changeIndex ?? 0;

    if (!isValidIndex(receiveIndex) || !isValidIndex(changeIndex)) {
        return { receiveIndex: 0, changeIndex: 0 };
    }

    return { receiveIndex, changeIndex };
}

/** Load persisted HD receive/change indices (defaults to 0). */
export function loadHdIndices(): HdIndices {
    try {
        const stored = localStorage.getItem(HD_INDICES_STORAGE_KEY);
        if (!stored) {
            return { receiveIndex: 0, changeIndex: 0 };
        }

        return normalizeHdIndices(JSON.parse(stored) as StoredHdIndices);
    } catch (error) {
        webViewError('Failed to load HD indices from localStorage:', error);
        return { receiveIndex: 0, changeIndex: 0 };
    }
}

/**
 * Persist HD receive/change indices to localStorage.
 * Throws on invalid indices or if localStorage write fails.
 */
export function saveHdIndices(indices: HdIndices): void {
    if (
        !isValidIndex(indices.receiveIndex) ||
        !isValidIndex(indices.changeIndex)
    ) {
        throw new Error('HD indices must be non-negative integers');
    }

    try {
        const stored: StoredHdIndices = {
            receiveIndex: indices.receiveIndex,
            changeIndex: indices.changeIndex,
        };
        localStorage.setItem(HD_INDICES_STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
        webViewError('Failed to save HD indices to localStorage:', error);
        throw error;
    }
}

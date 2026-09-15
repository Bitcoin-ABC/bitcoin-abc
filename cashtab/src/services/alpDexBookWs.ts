// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { alpSwap, alpSwapBaseUrl } from 'config/alpSwap';

/** One allowlisted pair on the alp-dex book websocket. */
export interface AlpDexBookPair {
    aTokenId: string;
    bTokenId: string;
    feePct: number;
    reserves: Record<string, string>;
    spotAtoB: string;
    spotBtoA: string;
}

/**
 * In-memory CP book pushed on `WS /api/v1/book`.
 *
 * Same units as GET `/swap/:from/:to/price`. Empty sides use `n/a` spots.
 */
export interface AlpDexBookSnapshot {
    type: 'book';
    timestamp: string;
    pairs: AlpDexBookPair[];
}

export interface DirectedBookSpot {
    rate: number;
    reserves: Record<string, string>;
    feePct: number;
}

/**
 * Book websocket URL for an alp-dex HTTP base (`https` → `wss`).
 *
 * @param baseUrl alp-dex HTTP origin
 */
export function bookWsUrl(baseUrl = alpSwapBaseUrl()): string {
    const origin = baseUrl.replace(/\/+$/, '');
    const wsOrigin = origin.replace(/^http/i, 'ws');
    return `${wsOrigin}${alpSwap.bookWsPath}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const sameTokenId = (left: string, right: string): boolean =>
    left.toLowerCase() === right.toLowerCase();

/**
 * Parse one alp-dex book text frame. Unknown kinds and malformed JSON
 * return null so Cashtab can ignore future message types.
 *
 * @param raw WebSocket `message` data
 */
export function parseAlpDexBookMessage(
    raw: unknown,
): AlpDexBookSnapshot | null {
    if (typeof raw !== 'string' || raw === '') {
        return null;
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }
    if (!isRecord(parsed) || parsed.type !== 'book') {
        return null;
    }
    if (typeof parsed.timestamp !== 'string' || parsed.timestamp === '') {
        return null;
    }
    if (!Array.isArray(parsed.pairs)) {
        return null;
    }
    const pairs: AlpDexBookPair[] = [];
    for (const row of parsed.pairs) {
        if (!isRecord(row)) {
            return null;
        }
        if (typeof row.aTokenId !== 'string' || row.aTokenId === '') {
            return null;
        }
        if (typeof row.bTokenId !== 'string' || row.bTokenId === '') {
            return null;
        }
        if (typeof row.feePct !== 'number' || !Number.isFinite(row.feePct)) {
            return null;
        }
        if (!isRecord(row.reserves)) {
            return null;
        }
        const reserves: Record<string, string> = {};
        for (const [tokenId, atoms] of Object.entries(row.reserves)) {
            if (typeof atoms !== 'string') {
                return null;
            }
            reserves[tokenId] = atoms;
        }
        if (
            typeof row.spotAtoB !== 'string' ||
            typeof row.spotBtoA !== 'string'
        ) {
            return null;
        }
        pairs.push({
            aTokenId: row.aTokenId,
            bTokenId: row.bTokenId,
            feePct: row.feePct,
            reserves,
            spotAtoB: row.spotAtoB,
            spotBtoA: row.spotBtoA,
        });
    }
    return {
        type: 'book',
        timestamp: parsed.timestamp,
        pairs,
    };
}

const encodedSpotToRate = (encoded: string): number => {
    if (encoded === 'n/a' || encoded === '') {
        return 0;
    }
    const rate = Number(encoded);
    return Number.isFinite(rate) ? rate : 0;
};

/**
 * Directed to-per-from spot and reserves for a selected pair.
 *
 * @param book Latest book snapshot
 * @param fromTokenId Pay-side token
 * @param toTokenId Receive-side token
 */
export function directedSpotFromBook(
    book: AlpDexBookSnapshot,
    fromTokenId: string,
    toTokenId: string,
): DirectedBookSpot | null {
    if (fromTokenId === '' || toTokenId === '' || fromTokenId === toTokenId) {
        return null;
    }
    for (const pair of book.pairs) {
        const fromIsA = sameTokenId(pair.aTokenId, fromTokenId);
        const toIsB = sameTokenId(pair.bTokenId, toTokenId);
        const fromIsB = sameTokenId(pair.bTokenId, fromTokenId);
        const toIsA = sameTokenId(pair.aTokenId, toTokenId);
        if (fromIsA && toIsB) {
            return {
                rate: encodedSpotToRate(pair.spotAtoB),
                reserves: pair.reserves,
                feePct: pair.feePct,
            };
        }
        if (fromIsB && toIsA) {
            return {
                rate: encodedSpotToRate(pair.spotBtoA),
                reserves: pair.reserves,
                feePct: pair.feePct,
            };
        }
    }
    return null;
}

export interface ConnectAlpDexBookWsOpts {
    /** Called after the socket is open (dev logging). */
    onOpen?: (url: string) => void;
    /** Called for each valid book frame (snapshot + later changes). */
    onBook: (book: AlpDexBookSnapshot) => void;
    /** Unexpected socket errors. */
    onError?: (err: Event) => void;
}

/**
 * Open the alp-dex book websocket. Reconnects after unexpected close.
 * The returned function closes the socket and stops reconnects.
 *
 * @param opts Open / book / error handlers
 */
export function connectAlpDexBookWs(opts: ConnectAlpDexBookWsOpts): () => void {
    if (typeof WebSocket === 'undefined') {
        return () => undefined;
    }
    const url = bookWsUrl();
    let closedByClient = false;
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const clearRetry = () => {
        if (retryTimer !== null) {
            clearTimeout(retryTimer);
            retryTimer = null;
        }
    };

    const open = () => {
        if (closedByClient) {
            return;
        }
        clearRetry();
        const ws = new WebSocket(url);
        socket = ws;
        ws.addEventListener('open', () => {
            if (closedByClient || socket !== ws) {
                return;
            }
            opts.onOpen?.(url);
        });
        ws.addEventListener('message', event => {
            if (closedByClient || socket !== ws) {
                return;
            }
            const book = parseAlpDexBookMessage(event.data);
            if (book === null) {
                return;
            }
            opts.onBook(book);
        });
        ws.addEventListener('error', event => {
            if (closedByClient || socket !== ws) {
                return;
            }
            opts.onError?.(event);
        });
        ws.addEventListener('close', () => {
            if (socket === ws) {
                socket = null;
            }
            if (closedByClient) {
                return;
            }
            clearRetry();
            retryTimer = setTimeout(open, alpSwap.bookWsReconnectMs);
        });
    };

    open();

    return () => {
        closedByClient = true;
        clearRetry();
        if (socket !== null) {
            socket.close();
            socket = null;
        }
    };
}

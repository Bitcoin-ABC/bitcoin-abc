// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { alpSwap } from 'config/alpSwap';
import {
    bookWsUrl,
    connectAlpDexBookWs,
    directedSpotFromBook,
    parseAlpDexBookMessage,
    AlpDexBookSnapshot,
} from 'services/alpDexBookWs';

const TOKEN_A =
    '488fb8fb66ce0a0a3800b83720d45b7d5acd5337b4aba71d63590708bfb4688c';
const TOKEN_B =
    '4b7ac96d8348e48d7935bddb5d3cd1352f5e8f02a1ce4b6091cb63473b27056c';

const bookSnapshot = (): AlpDexBookSnapshot => ({
    type: 'book',
    timestamp: '2026-09-15T00:00:00.000Z',
    pairs: [
        {
            aTokenId: TOKEN_A,
            bTokenId: TOKEN_B,
            feePct: 0.01,
            reserves: {
                [TOKEN_A]: '5000000',
                [TOKEN_B]: '50000',
            },
            spotAtoB: '1',
            spotBtoA: '1',
        },
    ],
});

type WsHandler = (event?: { data?: unknown }) => void;

class MockWebSocket {
    static instances: MockWebSocket[] = [];
    url: string;
    readyState = 0;
    close = jest.fn(() => {
        this.readyState = 3;
        this.emit('close');
    });
    private listeners: Record<string, WsHandler[]> = {};

    constructor(url: string) {
        this.url = url;
        MockWebSocket.instances.push(this);
    }

    addEventListener(type: string, handler: WsHandler): void {
        const list = this.listeners[type] ?? [];
        list.push(handler);
        this.listeners[type] = list;
    }

    open(): void {
        this.readyState = 1;
        this.emit('open');
    }

    emit(type: string, event: { data?: unknown } = {}): void {
        for (const handler of this.listeners[type] ?? []) {
            handler(event);
        }
    }
}

describe('alpDexBookWs', () => {
    const originalWebSocket = global.WebSocket;

    beforeEach(() => {
        MockWebSocket.instances = [];
        global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        global.WebSocket = originalWebSocket;
    });

    it('builds the wss book URL from the HTTPS alp-dex origin', () => {
        expect(bookWsUrl('https://lp.alpswap.com')).toBe(
            'wss://lp.alpswap.com/api/v1/book',
        );
        expect(bookWsUrl('http://127.0.0.1:3003/')).toBe(
            'ws://127.0.0.1:3003/api/v1/book',
        );
        expect(bookWsUrl()).toBe(`wss://lp.alpswap.com${alpSwap.bookWsPath}`);
    });

    it('parses a book frame and ignores unknown or malformed messages', () => {
        const snap = bookSnapshot();
        expect(parseAlpDexBookMessage(JSON.stringify(snap))).toEqual(snap);
        expect(parseAlpDexBookMessage('')).toBeNull();
        expect(parseAlpDexBookMessage('{')).toBeNull();
        expect(
            parseAlpDexBookMessage(JSON.stringify({ type: 'pong' })),
        ).toBeNull();
        expect(
            parseAlpDexBookMessage(
                JSON.stringify({ type: 'book', timestamp: 't', pairs: {} }),
            ),
        ).toBeNull();
    });

    it('reads both directed spots from an undirected book pair', () => {
        const snap = bookSnapshot();
        snap.pairs[0].spotAtoB = '2.5';
        snap.pairs[0].spotBtoA = '0.4';
        expect(directedSpotFromBook(snap, TOKEN_A, TOKEN_B)?.rate).toBe(2.5);
        expect(directedSpotFromBook(snap, TOKEN_B, TOKEN_A)?.rate).toBe(0.4);
        expect(directedSpotFromBook(snap, TOKEN_A, TOKEN_A)).toBeNull();
        snap.pairs[0].spotAtoB = 'n/a';
        expect(directedSpotFromBook(snap, TOKEN_A, TOKEN_B)?.rate).toBe(0);
    });

    it('connects, delivers books, and stops reconnecting after disconnect', () => {
        const onOpen = jest.fn();
        const onBook = jest.fn();
        const disconnect = connectAlpDexBookWs({ onOpen, onBook });

        expect(MockWebSocket.instances).toHaveLength(1);
        const first = MockWebSocket.instances[0];
        expect(first.url).toBe(bookWsUrl());
        first.open();
        expect(onOpen).toHaveBeenCalledWith(bookWsUrl());

        first.emit('message', { data: JSON.stringify(bookSnapshot()) });
        expect(onBook).toHaveBeenCalledTimes(1);
        expect(onBook.mock.calls[0][0].type).toBe('book');

        first.emit('close');
        jest.advanceTimersByTime(alpSwap.bookWsReconnectMs);
        expect(MockWebSocket.instances).toHaveLength(2);

        disconnect();
        expect(MockWebSocket.instances[1].close).toHaveBeenCalled();
        MockWebSocket.instances[1].emit('close');
        jest.advanceTimersByTime(alpSwap.bookWsReconnectMs);
        expect(MockWebSocket.instances).toHaveLength(2);
    });
});

// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Node-only WebSocket dialer. The `ws` package's browser entry throws, so
 * {@link runWebSocketRound} loads this file only when a lab TLS option is set.
 */
import type { Socket } from 'node:net';
import { Duplex } from 'node:stream';

import { WebSocket, type RawData } from 'ws';

import type { WebSocketTlsOptions } from './websocket.js';
import { FusionConnection } from '../protocol/connection.js';

/**
 * Dial one framed fusion socket with the Node `ws` client.
 *
 * @param url - Full `ws://` or `wss://` URL including `/control` or `/covert`
 * @param timeoutMs - Handshake limit
 * @param tls - `rejectUnauthorized` / `ca` for a lab certificate
 */
export function openNodeFusionSocket(
    url: string,
    timeoutMs: number,
    tls: WebSocketTlsOptions,
): Promise<FusionConnection> {
    const ws = new WebSocket(url, {
        perMessageDeflate: false,
        handshakeTimeout: timeoutMs,
        ...(tls.rejectUnauthorized !== undefined
            ? { rejectUnauthorized: tls.rejectUnauthorized }
            : {}),
        ...(tls.ca !== undefined ? { ca: tls.ca } : {}),
    });
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            ws.terminate();
            reject(new Error('WebSocket connection timed out'));
        }, timeoutMs);
        const fail = (err: unknown) => {
            cleanup();
            ws.terminate();
            reject(err instanceof Error ? err : new Error(String(err)));
        };
        const onOpen = () => {
            cleanup();
            try {
                resolve(
                    new FusionConnection(
                        new NodeWebSocketPipe(ws) as unknown as Socket,
                    ),
                );
            } catch (err) {
                ws.terminate();
                reject(err instanceof Error ? err : new Error(String(err)));
            }
        };
        const cleanup = () => {
            clearTimeout(timer);
            ws.off('error', fail);
            ws.off('open', onOpen);
        };
        ws.once('error', fail);
        ws.once('open', onOpen);
    });
}

function asBuffer(data: RawData): Buffer {
    if (Buffer.isBuffer(data)) {
        return data;
    }
    if (Array.isArray(data)) {
        return Buffer.concat(data);
    }
    return Buffer.from(data);
}

/**
 * Byte pipe so {@link FusionConnection} can frame a Node `ws` socket.
 * Writes become binary messages; binary messages become `data`.
 */
class NodeWebSocketPipe extends Duplex {
    private readonly ws: WebSocket;

    constructor(ws: WebSocket) {
        super();
        this.ws = ws;
        ws.on('message', (data, isBinary) => {
            if (!isBinary) {
                this.destroy(new Error('WebSocket message must be binary'));
                return;
            }
            if (!this.destroyed) {
                this.push(asBuffer(data));
            }
        });
        ws.on('close', () => {
            if (!this.destroyed && !this.readableEnded) {
                this.push(null);
            }
            if (!this.destroyed) {
                this.destroy();
            }
        });
        ws.on('error', err => {
            if (!this.destroyed) {
                this.destroy(err);
            }
        });
    }

    override _read(): void {
        // FusionConnection consumes in flowing mode.
    }

    override _write(
        chunk: unknown,
        _encoding: BufferEncoding,
        callback: (error?: Error | null) => void,
    ): void {
        if (this.ws.readyState !== WebSocket.OPEN) {
            callback(new Error('Connection closed'));
            return;
        }
        const buf = Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk as Uint8Array);
        this.ws.send(buf, err => callback(err ?? null));
    }

    override _destroy(
        err: Error | null,
        callback: (error?: Error | null) => void,
    ): void {
        const state = this.ws.readyState;
        if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
            this.ws.terminate();
        }
        callback(err);
    }
}

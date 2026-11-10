// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * WebSocket gateway for the framed alp-fusion sockets.
 *
 * Binary messages are chunks of the same byte stream TCP carries
 * (8-byte magic + uint32 BE length + payload). Paths are
 * {@link WSS_CONTROL_PATH} and {@link WSS_COVERT_PATH}. Text frames and
 * any other path are closed. TLS is optional; Node daemons keep using
 * {@link listen}.
 */
import { createServer as createHttpServer, type Server } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import type { Socket } from 'node:net';
import { Duplex } from 'node:stream';

import { WebSocket, WebSocketServer, type RawData } from 'ws';

import {
    HANDSHAKE_TIMEOUT_MS,
    MAX_RECV_BUFFER_BYTES,
    WSS_CONTROL_PATH,
    WSS_COVERT_PATH,
} from './constants.js';
import { FusionConnection, loadPem, type ListenOptions } from './connection.js';

const WSS_PING_MS = 30_000;

/** Control and covert acceptors. Each receives a framed socket. */
export interface WebSocketHandlers {
    control: (conn: FusionConnection) => void;
    covert: (conn: FusionConnection) => void;
}

/**
 * Bind an HTTP(S) server that upgrades `/control` and `/covert` to framed
 * {@link FusionConnection}s. Port `0` picks an ephemeral port.
 *
 * @param host - Bind address
 * @param port - TCP port (`0` ephemeral)
 * @param handlers - One callback per fusion channel
 * @param opts - TLS cert/key, same shape as {@link listen}
 */
export function listenWebSocket(
    host: string,
    port: number,
    handlers: WebSocketHandlers,
    opts: ListenOptions = {},
): Promise<{ port: number; close: () => Promise<void> }> {
    return new Promise((resolve, reject) => {
        if (opts.ssl && (!opts.cert || !opts.key)) {
            reject(
                new Error(
                    'TLS listen requires cert and key (PEM file paths or Buffers)',
                ),
            );
            return;
        }

        let server: Server;
        try {
            server = createGatewayServer(opts);
        } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
            return;
        }

        const wss = new WebSocketServer({
            noServer: true,
            maxPayload: MAX_RECV_BUFFER_BYTES,
            perMessageDeflate: false,
        });
        const framed = new Set<FusionConnection>();
        const rawSockets = new Set<Socket>();

        server.on('connection', (sock: Socket) => {
            rawSockets.add(sock);
            sock.once('close', () => rawSockets.delete(sock));
        });

        // Health checks and scanners are not WebSocket upgrades. Answer and
        // close so they do not sit on the socket until the request timeout.
        server.on('request', (_req, res) => {
            res.writeHead(426, {
                'Content-Length': '0',
                'Connection': 'close',
            });
            res.end();
        });

        server.on('upgrade', (request, netSocket, head) => {
            const pathname = request.url?.split('?')[0];
            const onConnection =
                pathname === WSS_CONTROL_PATH
                    ? handlers.control
                    : pathname === WSS_COVERT_PATH
                      ? handlers.covert
                      : undefined;
            if (!onConnection) {
                netSocket.write(
                    'HTTP/1.1 404 Not Found\r\n' +
                        'Connection: close\r\n' +
                        'Content-Length: 0\r\n' +
                        '\r\n',
                );
                netSocket.destroy();
                return;
            }
            wss.handleUpgrade(request, netSocket, head, ws => {
                const conn = adopt(ws);
                framed.add(conn);
                conn.socket.once('close', () => framed.delete(conn));
                onConnection(conn);
            });
        });

        const ping = setInterval(() => {
            for (const client of wss.clients) {
                const sock = client as WebSocket & { isAlive?: boolean };
                if (sock.isAlive === false) {
                    sock.terminate();
                    continue;
                }
                sock.isAlive = false;
                sock.ping();
            }
        }, WSS_PING_MS);
        ping.unref();

        const onListenError = (err: Error) => reject(err);
        server.once('error', onListenError);
        server.listen(port, host, () => {
            server.off('error', onListenError);
            server.on('error', () => {
                /* surfaced by close() */
            });
            const addr = server.address();
            const bound =
                typeof addr === 'object' && addr !== null ? addr.port : port;
            resolve({
                port: bound,
                close: () =>
                    new Promise((res, rej) => {
                        clearInterval(ping);
                        for (const conn of framed) {
                            conn.close();
                        }
                        for (const sock of rawSockets) {
                            sock.destroy();
                        }
                        wss.close();
                        server.close(err => (err ? rej(err) : res()));
                    }),
            });
        });
    });
}

function createGatewayServer(opts: ListenOptions): Server {
    if (!opts.ssl) {
        return createHttpServer();
    }
    const handshakeTimeoutMs = opts.handshakeTimeoutMs ?? HANDSHAKE_TIMEOUT_MS;
    return createHttpsServer({
        cert: pem(opts.cert as string | Buffer),
        key: pem(opts.key as string | Buffer),
        ...(handshakeTimeoutMs > 0
            ? { handshakeTimeout: handshakeTimeoutMs }
            : {}),
    });
}

function pem(value: string | Buffer): Buffer {
    return typeof value === 'string' ? loadPem(value) : value;
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
 * Byte pipe so {@link FusionConnection} can frame a WebSocket.
 * Writes become binary messages; binary messages become `data`.
 */
class WebSocketBytePipe extends Duplex {
    private readonly ws: WebSocket;

    constructor(ws: WebSocket) {
        super();
        this.ws = ws;
        const alive = ws as WebSocket & { isAlive?: boolean };
        alive.isAlive = true;
        ws.on('pong', () => {
            alive.isAlive = true;
        });
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

function adopt(ws: WebSocket): FusionConnection {
    return new FusionConnection(new WebSocketBytePipe(ws) as unknown as Socket);
}

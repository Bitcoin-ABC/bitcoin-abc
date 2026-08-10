// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Framed TCP/TLS control channel for alp-fusion (CashFusion wire shape).
 *
 * Frame: 8-byte {@link FRAME_MAGIC} + uint32 BE length + payload.
 *
 * Electrum ABC often terminates TLS at a reverse proxy; we also support
 * optional native TLS so a standalone VPS can serve SSL without nginx.
 */
import { readFileSync } from 'node:fs';
import { createServer, Socket, type Server } from 'node:net';
import {
    connect as tlsConnect,
    createServer as createTlsServer,
    type TlsOptions,
} from 'node:tls';

import {
    FRAME_MAGIC,
    HANDSHAKE_TIMEOUT_MS,
    MAX_FRAME_PAYLOAD_BYTES,
    MAX_RECV_BUFFER_BYTES,
} from './constants.js';

const FRAME_HEADER_LEN = 12;

/**
 * One framed control-channel connection (plain TCP or TLS socket).
 *
 * A persistent `data` listener appends into {@link recvBuf} so bytes are not
 * lost between {@link recvMessage} calls (Node flowing-mode pitfall).
 */
export class FusionConnection {
    private recvBuf = Buffer.alloc(0);
    private closed = false;
    private readonly waiters = new Set<() => void>();

    constructor(
        readonly socket: Socket,
        readonly defaultTimeoutMs = 120_000,
    ) {
        socket.setKeepAlive?.(true, 30_000);
        // Peer disconnects must not crash the process via unhandled 'error'.
        socket.on('error', () => {
            /* logged by callers of send/recv */
        });
        socket.on('data', (chunk: Buffer) => {
            this.recvBuf = Buffer.concat([this.recvBuf, chunk]);
            if (this.recvBuf.length > MAX_RECV_BUFFER_BYTES) {
                // Peer pipelined faster than we consume (or is flooding).
                this.close();
                return;
            }
            this.notifyWaiters();
        });
        const onClosed = () => {
            this.closed = true;
            this.notifyWaiters();
        };
        socket.on('end', onClosed);
        socket.on('close', onClosed);
    }

    get destroyed(): boolean {
        return this.socket.destroyed || this.closed;
    }

    /** Resolve when the underlying socket closes (or immediately if already closed). */
    whenClosed(): Promise<void> {
        if (this.destroyed) {
            return Promise.resolve();
        }
        return new Promise(resolve => {
            this.socket.once('close', () => resolve());
        });
    }

    async sendMessage(msg: Uint8Array): Promise<void> {
        if (this.destroyed) {
            throw new Error('Connection closed');
        }
        if (msg.length > MAX_FRAME_PAYLOAD_BYTES) {
            throw new Error('Message too large');
        }
        const len = Buffer.alloc(4);
        len.writeUInt32BE(msg.length);
        const frame = Buffer.concat([
            Buffer.from(FRAME_MAGIC),
            len,
            Buffer.from(msg),
        ]);
        await new Promise<void>((resolve, reject) => {
            const onError = (err: Error) => {
                this.socket.off('error', onError);
                reject(err);
            };
            this.socket.once('error', onError);
            this.socket.write(frame, err => {
                this.socket.off('error', onError);
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async recvMessage(timeoutMs = this.defaultTimeoutMs): Promise<Buffer> {
        const deadline = Date.now() + timeoutMs;
        while (true) {
            let parsed: { msg: Buffer; rest: Buffer } | null;
            try {
                parsed = tryParseFrame(this.recvBuf);
            } catch (err) {
                // Bad magic / oversize length: stream cannot be resynchronized.
                this.close();
                throw err;
            }
            if (parsed) {
                this.recvBuf = Buffer.from(parsed.rest);
                return parsed.msg;
            }
            if (this.destroyed) {
                throw new Error('Connection closed');
            }
            const remaining = deadline - Date.now();
            if (remaining <= 0) {
                throw new Error('Timed out waiting for message');
            }
            await this.waitForData(remaining);
        }
    }

    close(): void {
        this.closed = true;
        this.notifyWaiters();
        this.socket.destroy();
    }

    private notifyWaiters(): void {
        for (const wake of [...this.waiters]) {
            wake();
        }
    }

    private waitForData(timeoutMs: number): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.recvBuf.length > 0 || this.destroyed) {
                resolve();
                return;
            }
            const timer = setTimeout(() => {
                cleanup();
                reject(new Error('Socket read timeout'));
            }, timeoutMs);
            const wake = () => {
                cleanup();
                resolve();
            };
            const cleanup = () => {
                clearTimeout(timer);
                this.waiters.delete(wake);
            };
            this.waiters.add(wake);
            // Data may have arrived between the empty check and subscribe.
            if (this.recvBuf.length > 0 || this.destroyed) {
                wake();
            }
        });
    }
}

function tryParseFrame(buf: Buffer): { msg: Buffer; rest: Buffer } | null {
    if (buf.length < FRAME_HEADER_LEN) {
        return null;
    }
    if (!buf.subarray(0, 8).equals(Buffer.from(FRAME_MAGIC))) {
        throw new Error('Bad frame magic');
    }
    const len = buf.readUInt32BE(8);
    if (len > MAX_FRAME_PAYLOAD_BYTES) {
        throw new Error('Message too large');
    }
    if (buf.length < FRAME_HEADER_LEN + len) {
        return null;
    }
    return {
        msg: buf.subarray(FRAME_HEADER_LEN, FRAME_HEADER_LEN + len),
        rest: buf.subarray(FRAME_HEADER_LEN + len),
    };
}

export interface ConnectOptions {
    /** Wrap the TCP connection in TLS (CashFusion client `ssl=True`). */
    ssl?: boolean;
    /** TLS SNI / hostname verification (defaults to `host`). */
    servername?: string;
    /**
     * Verify server certificate (default true).
     * Set false only for lab self-signed certs.
     */
    rejectUnauthorized?: boolean;
    /** Extra CA / trust store: PEM Buffer(s) or filesystem path(s). */
    ca?: string | Buffer | Array<string | Buffer>;
    timeoutMs?: number;
}

export interface ListenOptions {
    /** Terminate TLS in-process (optional; nginx proxy also fine). */
    ssl?: boolean;
    /**
     * TLS certificate: filesystem path or PEM Buffer.
     * Required when ssl=true. Paths are read via {@link loadPem}.
     */
    cert?: string | Buffer;
    /**
     * TLS private key: filesystem path or PEM Buffer.
     * Required when ssl=true. Paths are read via {@link loadPem}.
     */
    key?: string | Buffer;
    /** Optional CA chain (paths and/or PEM Buffers). */
    ca?: string | Buffer | Array<string | Buffer>;
    /**
     * TLS handshake deadline (default {@link HANDSHAKE_TIMEOUT_MS}).
     * Plain TCP ignores this — framing starts on accept. Use a short value
     * in TLS tests.
     */
    handshakeTimeoutMs?: number;
}

/**
 * Read a PEM file from disk. Paths only — put cert/key files on disk (e.g.
 * `./certs/server.crt`) rather than stuffing PEM into env vars. Pass a
 * Buffer to {@link listen} / {@link connect} when contents are already loaded.
 */
export function loadPem(path: string): Buffer {
    const trimmed = path.trim();
    if (
        trimmed === '' ||
        trimmed.includes('\n') ||
        trimmed.includes('-----BEGIN')
    ) {
        throw new Error('loadPem: expected a filesystem path to a PEM file');
    }
    return readFileSync(trimmed);
}

function resolvePem(value: string | Buffer): Buffer {
    return typeof value === 'string' ? loadPem(value) : value;
}

function resolvePemList(
    value: string | Buffer | Array<string | Buffer> | undefined,
): Buffer | Buffer[] | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value.map(resolvePem);
    }
    return resolvePem(value);
}

export function connect(
    host: string,
    port: number,
    opts: ConnectOptions = {},
): Promise<FusionConnection> {
    const timeoutMs = opts.timeoutMs ?? 10_000;
    if (opts.ssl) {
        return new Promise((resolve, reject) => {
            const socket = tlsConnect({
                host,
                port,
                servername: opts.servername ?? host,
                rejectUnauthorized: opts.rejectUnauthorized ?? true,
                ca: resolvePemList(opts.ca),
            });
            const timer = setTimeout(() => {
                socket.destroy();
                reject(new Error(`TLS connect timeout to ${host}:${port}`));
            }, timeoutMs);
            socket.once('secureConnect', () => {
                clearTimeout(timer);
                resolve(new FusionConnection(socket));
            });
            socket.once('error', err => {
                clearTimeout(timer);
                reject(err);
            });
        });
    }

    return new Promise((resolve, reject) => {
        const socket = new Socket();
        const timer = setTimeout(() => {
            socket.destroy();
            reject(new Error(`Connect timeout to ${host}:${port}`));
        }, timeoutMs);
        socket.connect(port, host, () => {
            clearTimeout(timer);
            resolve(new FusionConnection(socket));
        });
        socket.once('error', err => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

export function listen(
    host: string,
    port: number,
    onConnection: (conn: FusionConnection) => void,
    opts: ListenOptions = {},
): Promise<{ server: Server; port: number; close: () => Promise<void> }> {
    return new Promise((resolve, reject) => {
        const framed = new Set<FusionConnection>();
        // Raw TCP sockets (incl. pre-TLS-handshake). TLS secureConnection only
        // tracks completed handshakes; without this, close() can hang forever.
        const rawSockets = new Set<Socket>();
        const track = (conn: FusionConnection) => {
            framed.add(conn);
            conn.socket.once('close', () => framed.delete(conn));
            onConnection(conn);
        };

        const handshakeTimeoutMs =
            opts.handshakeTimeoutMs ?? HANDSHAKE_TIMEOUT_MS;

        let server: Server;
        if (opts.ssl) {
            if (!opts.cert || !opts.key) {
                reject(
                    new Error(
                        'TLS listen requires cert and key (PEM file paths or Buffers)',
                    ),
                );
                return;
            }
            const tlsOpts: TlsOptions = {
                cert: resolvePem(opts.cert),
                key: resolvePem(opts.key),
                ca: resolvePemList(opts.ca),
                // Bound incomplete TLS handshakes. Do NOT setTimeout on the
                // raw 'connection' socket — that re-arms after FusionConnection
                // clears idle timeout and kills framed plain-TCP peers.
                ...(handshakeTimeoutMs > 0
                    ? { handshakeTimeout: handshakeTimeoutMs }
                    : {}),
            };
            server = createTlsServer(tlsOpts, socket => {
                track(new FusionConnection(socket));
            });
            // Node emits tlsClientError on handshakeTimeout but does not
            // destroy the socket; without this, silent peers linger forever.
            server.on('tlsClientError', (_err, tlsSocket) => {
                tlsSocket.destroy();
            });
        } else {
            server = createServer(socket => {
                track(new FusionConnection(socket));
            });
        }

        server.on('connection', (sock: Socket) => {
            rawSockets.add(sock);
            sock.once('close', () => rawSockets.delete(sock));
        });

        const onListenError = (err: Error) => reject(err);
        server.once('error', onListenError);
        server.listen(port, host, () => {
            server.off('error', onListenError);
            // Avoid unhandled 'error' after listen resolves; callers use close().
            server.on('error', () => {
                /* surfaced by close() / process logs */
            });
            const addr = server.address();
            const bound =
                typeof addr === 'object' && addr !== null ? addr.port : port;
            resolve({
                server,
                port: bound,
                close: () =>
                    new Promise((res, rej) => {
                        for (const conn of framed) {
                            conn.close();
                        }
                        for (const sock of rawSockets) {
                            sock.destroy();
                        }
                        server.close(err => (err ? rej(err) : res()));
                    }),
            });
        });
    });
}

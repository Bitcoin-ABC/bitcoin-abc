// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * WebSocket `runRound` for {@link FusionClient}.
 *
 * Dials `/control` and `/covert` with the platform `WebSocket` (browser or
 * Node). Does not import `src/node.ts` or the Node-only `ws` package.
 * Lab TLS that the platform socket cannot express (`rejectUnauthorized`,
 * `ca`) loads {@link openNodeFusionSocket} from `websocketNode.ts`.
 */
import type { FusionRoundArgs, FusionRoundResult } from './fusionClient.js';
import { runWireRound, type WireRoundResult } from './wire.js';
import type { WireContribution } from '../protocol/components.js';
import { WSS_CONTROL_PATH, WSS_COVERT_PATH } from '../protocol/constants.js';
import { FusionConnection } from '../protocol/connection.js';
import type { FusionChain } from '../tx/matchInputs.js';

/** TLS options for a Node `wss://` lab cert. Omitted for platform sockets. */
export interface WebSocketTlsOptions {
    rejectUnauthorized?: boolean;
    ca?: string | Buffer | Array<string | Buffer>;
}

/**
 * Gateway origin and round timeouts. `url` is `ws://` or `wss://` with no
 * path; this module appends `/control` and `/covert`.
 */
export interface WebSocketRunRoundOptions {
    url: string;
    recvTimeoutMs?: number;
    pools?: { tokenId: string; atomTier: bigint }[];
    covertRandSpanMs?: number;
    covertTimeoutMs?: number;
    chronik?: FusionChain;
    /**
     * Node-only. Set to dial with the `ws` package instead of the platform
     * WebSocket. Browsers trust the system store and leave this unset.
     */
    tls?: WebSocketTlsOptions;
}

export interface RunWebSocketRoundOptions extends WebSocketRunRoundOptions {
    tokenId: string;
    atomTier: bigint;
    contribution: WireContribution;
}

const WS_CONNECTING = 0;
const WS_OPEN = 1;

/**
 * Subset of the platform WebSocket this file touches. Declared here so the
 * wallet entry does not depend on the Node `ws` types.
 */
interface PlatformWebSocket {
    binaryType: string;
    readyState: number;
    send(data: Uint8Array): void;
    close(): void;
    addEventListener(type: 'open', cb: () => void): void;
    addEventListener(type: 'error', cb: () => void): void;
    addEventListener(type: 'close', cb: () => void): void;
    addEventListener(
        type: 'message',
        cb: (ev: { data: unknown }) => void,
    ): void;
    removeEventListener(type: 'open' | 'error', cb: () => void): void;
}

type SocketListener = (...args: unknown[]) => void;

/**
 * Join one pool over the WebSocket gateway and return the signed fused tx.
 *
 * @param opts - Gateway origin plus the same round inputs as TCP
 */
export async function runWebSocketRound(
    opts: RunWebSocketRoundOptions,
): Promise<WireRoundResult> {
    const base = gatewayUrl(opts.url);
    const openMs = opts.covertTimeoutMs ?? 5_000;
    // TCP host/port are unused: both sockets are the dials below. They point
    // at this origin so a missed dial cannot open the coordinator's TCP port.
    const fallback = tcpFallback(base);
    try {
        return await runWireRound({
            host: fallback.host,
            port: fallback.port,
            tokenId: opts.tokenId,
            atomTier: opts.atomTier,
            contribution: opts.contribution,
            recvTimeoutMs: opts.recvTimeoutMs,
            pools: opts.pools,
            covertRandSpanMs: opts.covertRandSpanMs,
            covertTimeoutMs: opts.covertTimeoutMs,
            chronik: opts.chronik,
            dialControl: () =>
                openFusionSocket(
                    new URL(WSS_CONTROL_PATH, base).toString(),
                    openMs,
                    opts.tls,
                ),
            dialCovert: () =>
                openFusionSocket(
                    new URL(WSS_COVERT_PATH, base).toString(),
                    openMs,
                    opts.tls,
                ),
        });
    } catch (err) {
        if (err instanceof Error) {
            throw err;
        }
        throw new Error(String(err));
    }
}

/**
 * `FusionClient` `runRound` bound to a coordinator WebSocket origin.
 *
 * @param opts - Gateway origin (`ws://` or `wss://`, no path) and timeouts
 */
export function createWebSocketRunRound(
    opts: WebSocketRunRoundOptions,
): (args: FusionRoundArgs) => Promise<FusionRoundResult> {
    return args =>
        runWebSocketRound({
            ...opts,
            tokenId: args.tokenId,
            atomTier: args.atomTier,
            contribution: args.contribution,
        });
}

/**
 * Require a gateway origin with no path so callers cannot skip `/control`.
 *
 * @param url - `ws://host:port` or `wss://host:port`
 */
function gatewayUrl(url: string): URL {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error('Fusion WebSocket URL is invalid');
    }
    if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
        throw new Error('Fusion WebSocket URL must use ws:// or wss://');
    }
    if (parsed.pathname !== '/' && parsed.pathname !== '') {
        throw new Error('Fusion WebSocket URL must not include a path');
    }
    parsed.pathname = '/';
    parsed.search = '';
    parsed.hash = '';
    return parsed;
}

function tcpFallback(url: URL): { host: string; port: number } {
    const port =
        url.port !== '' ? Number(url.port) : url.protocol === 'wss:' ? 443 : 80;
    return { host: url.hostname, port };
}

async function openFusionSocket(
    url: string,
    timeoutMs: number,
    tls: WebSocketTlsOptions | undefined,
): Promise<FusionConnection> {
    try {
        if (tls) {
            const { openNodeFusionSocket } = await import('./websocketNode.js');
            return await openNodeFusionSocket(url, timeoutMs, tls);
        }
        return await openNativeFusionSocket(url, timeoutMs);
    } catch (err) {
        if (err instanceof Error) {
            throw err;
        }
        throw new Error(String(err));
    }
}

function platformWebSocket(): new (url: string) => PlatformWebSocket {
    const ctor = (
        globalThis as { WebSocket?: new (url: string) => PlatformWebSocket }
    ).WebSocket;
    if (typeof ctor !== 'function') {
        throw new Error('WebSocket is not available');
    }
    return ctor;
}

function openNativeFusionSocket(
    url: string,
    timeoutMs: number,
): Promise<FusionConnection> {
    let ws: PlatformWebSocket;
    try {
        ws = new (platformWebSocket())(url);
    } catch (err) {
        return Promise.reject(
            err instanceof Error ? err : new Error(String(err)),
        );
    }
    ws.binaryType = 'arraybuffer';
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            ws.close();
            reject(new Error('WebSocket connection timed out'));
        }, timeoutMs);
        const fail = () => {
            cleanup();
            ws.close();
            reject(new Error('WebSocket connection failed'));
        };
        const onOpen = () => {
            cleanup();
            try {
                resolve(
                    new FusionConnection(
                        new PlatformWebSocketSocket(ws) as never,
                    ),
                );
            } catch (err) {
                ws.close();
                reject(err instanceof Error ? err : new Error(String(err)));
            }
        };
        const cleanup = () => {
            clearTimeout(timer);
            ws.removeEventListener('error', fail);
            ws.removeEventListener('open', onOpen);
        };
        ws.addEventListener('error', fail);
        ws.addEventListener('open', onOpen);
    });
}

/**
 * Byte pipe so {@link FusionConnection} can frame a platform WebSocket.
 * No `node:stream` and no `ws` package: those throw in a browser bundle.
 */
class PlatformWebSocketSocket {
    destroyed = false;
    private readonly ws: PlatformWebSocket;
    private readonly listeners = new Map<string, Set<SocketListener>>();
    /** `once` wrappers, so `off(original)` removes the listener that fired. */
    private readonly onceWrappers = new Map<SocketListener, SocketListener>();
    private readonly pending: Buffer[] = [];
    private dataListeners = 0;

    constructor(ws: PlatformWebSocket) {
        this.ws = ws;
        ws.addEventListener('message', ev => {
            const chunk = binaryChunk(ev.data);
            if (!chunk) {
                this.fail(new Error('WebSocket message must be binary'));
                return;
            }
            this.pushData(chunk);
        });
        ws.addEventListener('close', () => {
            this.markClosed();
        });
        ws.addEventListener('error', () => {
            this.fail(new Error('WebSocket error'));
        });
    }

    setKeepAlive(): void {
        // Platform WebSocket has no TCP keepalive knob.
    }

    on(event: string, cb: SocketListener): void {
        this.add(event, cb);
        if (event !== 'data') {
            return;
        }
        this.dataListeners += 1;
        if (this.pending.length === 0) {
            return;
        }
        const queued = this.pending.splice(0);
        for (const chunk of queued) {
            cb(chunk);
        }
    }

    once(event: string, cb: SocketListener): void {
        const wrapped: SocketListener = (...args) => {
            this.off(event, cb);
            cb(...args);
        };
        this.onceWrappers.set(cb, wrapped);
        this.on(event, wrapped);
    }

    off(event: string, cb: SocketListener): void {
        const wrapped = this.onceWrappers.get(cb);
        this.listeners.get(event)?.delete(wrapped ?? cb);
        if (wrapped) {
            this.onceWrappers.delete(cb);
        }
        if (event === 'data' && this.dataListeners > 0) {
            this.dataListeners -= 1;
        }
    }

    write(chunk: Uint8Array, cb: (err?: Error | null) => void): void {
        if (this.destroyed || this.ws.readyState !== WS_OPEN) {
            cb(new Error('Connection closed'));
            return;
        }
        try {
            const bytes =
                chunk instanceof Uint8Array ? chunk : Uint8Array.from(chunk);
            this.ws.send(bytes);
            cb(null);
        } catch (err) {
            cb(err instanceof Error ? err : new Error(String(err)));
        }
    }

    destroy(): void {
        this.markClosed();
    }

    private pushData(chunk: Buffer): void {
        if (this.dataListeners === 0) {
            this.pending.push(chunk);
            return;
        }
        this.emit('data', chunk);
    }

    private fail(err: Error): void {
        this.emit('error', err);
        this.markClosed();
    }

    private markClosed(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        const state = this.ws.readyState;
        if (state === WS_OPEN || state === WS_CONNECTING) {
            this.ws.close();
        }
        this.emit('end');
        this.emit('close');
    }

    private add(event: string, cb: SocketListener): void {
        let set = this.listeners.get(event);
        if (!set) {
            set = new Set();
            this.listeners.set(event, set);
        }
        set.add(cb);
    }

    private emit(event: string, ...args: unknown[]): void {
        for (const cb of [...(this.listeners.get(event) ?? [])]) {
            cb(...args);
        }
    }
}

function binaryChunk(data: unknown): Buffer | null {
    if (typeof data === 'string') {
        return null;
    }
    if (data instanceof ArrayBuffer) {
        return Buffer.from(data);
    }
    if (ArrayBuffer.isView(data)) {
        return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    }
    return null;
}

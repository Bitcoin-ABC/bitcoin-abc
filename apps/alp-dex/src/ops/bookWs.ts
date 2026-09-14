// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { IncomingMessage, Server } from 'http';
import { createRequire } from 'module';
import type WebSocket from 'ws';
import type { WebSocketServer } from 'ws';
import {
    BOOK_WS_MAX_PAYLOAD,
    BOOK_WS_PATH,
    BOOK_WS_PING_MS,
} from '../constants';
import type { BookHub } from './bookHub';

/**
 * `ws` is CJS (`module.exports = WebSocket`). `createRequire` loads the
 * real export under both `tsc` (commonjs) and mocha/tsx.
 */
type WsCtor = typeof WebSocket & {
    OPEN: typeof WebSocket.OPEN;
    WebSocketServer: typeof WebSocketServer;
    Server: typeof WebSocketServer;
};

const Ws = createRequire(__filename)('ws') as WsCtor;
const WebSocketServerImpl = Ws.WebSocketServer ?? Ws.Server;

type BookSocket = WebSocket & { isAlive: boolean };

export type AttachBookWsOpts = {
    /** Override {@link BOOK_WS_PING_MS} (tests). */
    pingMs?: number;
};

/**
 * Upgrade `GET {BOOK_WS_PATH}` to a WebSocket that receives book JSON.
 *
 * Unknown upgrade paths are destroyed so a reverse proxy cannot leak them
 * onto this server. Clients that miss a pong are terminated. Inbound
 * frames are capped at {@link BOOK_WS_MAX_PAYLOAD}.
 */
export const attachBookWs = (
    server: Server,
    hub: BookHub,
    opts: AttachBookWsOpts = {},
): WebSocketServer => {
    const pingMs = opts.pingMs ?? BOOK_WS_PING_MS;
    const wss = new WebSocketServerImpl({
        noServer: true,
        maxPayload: BOOK_WS_MAX_PAYLOAD,
    });
    server.on(
        'upgrade',
        (request: IncomingMessage, netSocket, head: Buffer) => {
            const pathname = request.url?.split('?')[0];
            if (pathname !== BOOK_WS_PATH) {
                netSocket.destroy();
                return;
            }
            wss.handleUpgrade(request, netSocket, head, client => {
                const socket = client as BookSocket;
                socket.isAlive = true;
                socket.on('pong', () => {
                    socket.isAlive = true;
                });
                const unsub = hub.subscribe(json => {
                    if (socket.readyState === Ws.OPEN) {
                        socket.send(json);
                    }
                });
                socket.on('close', unsub);
                socket.on('error', unsub);
            });
        },
    );
    const ping = setInterval(() => {
        for (const client of wss.clients) {
            const socket = client as BookSocket;
            if (socket.isAlive === false) {
                socket.terminate();
                continue;
            }
            socket.isAlive = false;
            socket.ping();
        }
    }, pingMs);
    ping.unref();
    server.on('close', () => {
        clearInterval(ping);
        wss.close();
    });
    return wss;
};

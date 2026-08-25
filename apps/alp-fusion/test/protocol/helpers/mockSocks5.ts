// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { createServer, Socket } from 'node:net';

export interface MockSocks5Options {
    requireAuth?: boolean;
    onLogin?: (user: string, pass: string) => void;
}

/**
 * Minimal SOCKS5 CONNECT proxy for tests. Relays TCP after a successful
 * handshake. Records RFC 1929 logins when `requireAuth` is set.
 */
export function listenMockSocks5(
    opts: MockSocks5Options = {},
): Promise<{ port: number; logins: string[]; close: () => Promise<void> }> {
    const logins: string[] = [];
    const raw = new Set<Socket>();
    return new Promise((resolve, reject) => {
        const server = createServer(socket => {
            raw.add(socket);
            socket.once('close', () => raw.delete(socket));
            void handleSocksClient(socket, opts, logins).catch(() => {
                socket.destroy();
            });
        });
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const addr = server.address();
            const port =
                typeof addr === 'object' && addr !== null ? addr.port : 0;
            resolve({
                port,
                logins,
                close: () =>
                    new Promise((res, rej) => {
                        for (const s of raw) {
                            s.destroy();
                        }
                        server.close(err => (err ? rej(err) : res()));
                    }),
            });
        });
    });
}

async function handleSocksClient(
    socket: Socket,
    opts: MockSocks5Options,
    logins: string[],
): Promise<void> {
    const reader = socketReader(socket);
    const greet = await reader.read(2);
    if (greet[0] !== 0x05) {
        throw new Error('bad ver');
    }
    const nmethods = greet[1];
    const methods = await reader.read(nmethods);
    const want = opts.requireAuth ? 0x02 : 0x00;
    if (!methods.includes(want)) {
        socket.write(Buffer.from([0x05, 0xff]));
        socket.destroy();
        return;
    }
    socket.write(Buffer.from([0x05, want]));

    if (opts.requireAuth) {
        const authHead = await reader.read(2);
        if (authHead[0] !== 0x01) {
            throw new Error('bad auth ver');
        }
        const user = (await reader.read(authHead[1])).toString('utf8');
        const plen = (await reader.read(1))[0];
        const pass = (await reader.read(plen)).toString('utf8');
        logins.push(`${user}:${pass}`);
        opts.onLogin?.(user, pass);
        socket.write(Buffer.from([0x01, 0x00]));
    }

    const req = await reader.read(4);
    if (req[0] !== 0x05 || req[1] !== 0x01) {
        throw new Error('expected CONNECT');
    }
    let destHost: string;
    if (req[3] === 0x01) {
        const ip = await reader.read(4);
        destHost = Array.from(ip).join('.');
    } else if (req[3] === 0x04) {
        const ip = await reader.read(16);
        destHost = ipv6FromBuf(ip);
    } else if (req[3] === 0x03) {
        const len = (await reader.read(1))[0];
        destHost = (await reader.read(len)).toString('ascii');
    } else {
        throw new Error(`unsupported ATYP ${req[3]}`);
    }
    const destPort = (await reader.read(2)).readUInt16BE(0);

    const dest = await tcpConnect(destHost, destPort);
    socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
    const leftover = reader.detach();
    if (leftover.length > 0) {
        dest.write(leftover);
    }
    dest.pipe(socket);
    socket.pipe(dest);
    socket.once('close', () => dest.destroy());
    dest.once('close', () => socket.destroy());
}

function ipv6FromBuf(buf: Buffer): string {
    const parts: string[] = [];
    for (let i = 0; i < 16; i += 2) {
        parts.push(buf.readUInt16BE(i).toString(16));
    }
    return parts.join(':');
}

function tcpConnect(host: string, port: number): Promise<Socket> {
    return new Promise((resolve, reject) => {
        const s = new Socket();
        s.once('error', reject);
        s.connect(port, host, () => {
            s.removeAllListeners('error');
            s.on('error', () => {
                /* relay */
            });
            resolve(s);
        });
    });
}

function socketReader(socket: Socket) {
    let buf = Buffer.alloc(0);
    const waiters = new Set<() => void>();
    const onData = (chunk: Buffer) => {
        buf = Buffer.concat([buf, chunk]);
        for (const w of [...waiters]) {
            w();
        }
    };
    socket.on('data', onData);
    return {
        detach: (): Buffer => {
            socket.off('data', onData);
            const rest = buf;
            buf = Buffer.alloc(0);
            return rest;
        },
        read: (n: number): Promise<Buffer> =>
            new Promise((resolve, reject) => {
                const tryRead = () => {
                    if (buf.length >= n) {
                        const out = buf.subarray(0, n);
                        buf = buf.subarray(n);
                        cleanup();
                        resolve(Buffer.from(out));
                        return true;
                    }
                    if (socket.destroyed || socket.readableEnded) {
                        cleanup();
                        reject(new Error('closed'));
                        return true;
                    }
                    return false;
                };
                const wake = () => {
                    tryRead();
                };
                const cleanup = () => {
                    clearTimeout(timer);
                    waiters.delete(wake);
                };
                const timer = setTimeout(() => {
                    cleanup();
                    reject(new Error('socks mock read timeout'));
                }, 5_000);
                waiters.add(wake);
                tryRead();
            }),
    };
}

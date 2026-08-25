// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * SOCKS5 CONNECT (RFC 1928) with optional username/password (RFC 1929).
 *
 * CashFusion isolates Tor circuits by using a unique proxy login per covert
 * socket. This is the same hook: alp-fusion does not require a live Tor
 * daemon — any SOCKS5 (Tor, a test mock, or another proxy) works.
 */
import { isIPv4, isIPv6, Socket } from 'node:net';

export interface Socks5Options {
    host: string;
    port: number;
    /** RFC 1929. When set, `password` is required. */
    username?: string;
    password?: string;
    timeoutMs?: number;
}

/**
 * Open a TCP connection to `destHost:destPort` through a SOCKS5 proxy.
 *
 * @param destHost - Destination hostname, IPv4, IPv6, or onion.
 * @param destPort - Destination TCP port (1..65535).
 * @param proxy - SOCKS5 endpoint and optional RFC 1929 credentials.
 */
export function socks5Connect(
    destHost: string,
    destPort: number,
    proxy: Socks5Options,
): Promise<Socket> {
    assertPort(destPort, 'destPort');
    assertPort(proxy.port, 'proxy.port');
    if (proxy.username !== undefined && proxy.password === undefined) {
        throw new Error('SOCKS5: password required when username is set');
    }
    const timeoutMs = proxy.timeoutMs ?? 10_000;
    const deadline = Date.now() + timeoutMs;
    const useAuth = proxy.username !== undefined;

    return new Promise((resolve, reject) => {
        const socket = new Socket();
        const timer = setTimeout(() => {
            socket.destroy();
            reject(
                new Error(
                    `SOCKS5 connect timeout to ${proxy.host}:${proxy.port}`,
                ),
            );
        }, timeoutMs);

        const fail = (err: Error) => {
            clearTimeout(timer);
            socket.destroy();
            reject(err);
        };

        socket.once('error', err => fail(err));
        socket.connect(proxy.port, proxy.host, () => {
            const reader = attachReader(socket);
            handshake(
                socket,
                reader,
                destHost,
                destPort,
                proxy,
                useAuth,
                deadline,
            )
                .then(() => {
                    reader.detach();
                    if (reader.bufferedLength() > 0) {
                        fail(
                            new Error(
                                'SOCKS5: unexpected leftover after handshake',
                            ),
                        );
                        return;
                    }
                    clearTimeout(timer);
                    socket.removeAllListeners('error');
                    // Peer errors after handoff are handled by FusionConnection.
                    socket.on('error', () => {
                        /* logged by callers of send/recv */
                    });
                    resolve(socket);
                })
                .catch(err => fail(err as Error));
        });
    });
}

function assertPort(port: number, name: string): void {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`${name} must be an integer in 1..65535`);
    }
}

function attachReader(socket: Socket) {
    let buf = Buffer.alloc(0);
    const waiters = new Set<() => void>();
    const onData = (chunk: Buffer) => {
        buf = Buffer.concat([buf, chunk]);
        for (const wake of [...waiters]) {
            wake();
        }
    };
    socket.on('data', onData);
    return {
        bufferedLength: () => buf.length,
        detach: () => {
            socket.off('data', onData);
        },
        read: (n: number, deadline: number): Promise<Buffer> =>
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
                        reject(new Error('SOCKS5: connection closed'));
                        return true;
                    }
                    return false;
                };
                const onTimeout = () => {
                    cleanup();
                    reject(new Error('SOCKS5: read timeout'));
                };
                const wake = () => {
                    tryRead();
                };
                const cleanup = () => {
                    clearTimeout(timer);
                    waiters.delete(wake);
                };
                const remaining = deadline - Date.now();
                if (remaining <= 0) {
                    reject(new Error('SOCKS5: read timeout'));
                    return;
                }
                const timer = setTimeout(onTimeout, remaining);
                waiters.add(wake);
                if (tryRead()) {
                    return;
                }
            }),
    };
}

async function handshake(
    socket: Socket,
    reader: ReturnType<typeof attachReader>,
    destHost: string,
    destPort: number,
    proxy: Socks5Options,
    useAuth: boolean,
    deadline: number,
): Promise<void> {
    // Greeting: VER=5, NMETHODS=1, METHOD (0x00 none / 0x02 user/pass).
    const method = useAuth ? 0x02 : 0x00;
    socket.write(Buffer.from([0x05, 0x01, method]));
    const methodReply = await reader.read(2, deadline);
    if (methodReply[0] !== 0x05) {
        throw new Error(`SOCKS5: bad version ${methodReply[0]}`);
    }
    if (methodReply[1] !== method) {
        throw new Error(
            `SOCKS5: proxy rejected auth method 0x${method.toString(16)}`,
        );
    }

    if (useAuth) {
        const user = Buffer.from(proxy.username ?? '', 'utf8');
        const pass = Buffer.from(proxy.password ?? '', 'utf8');
        if (user.length > 255 || pass.length > 255) {
            throw new Error('SOCKS5: username/password longer than 255 bytes');
        }
        socket.write(
            Buffer.concat([
                Buffer.from([0x01, user.length]),
                user,
                Buffer.from([pass.length]),
                pass,
            ]),
        );
        const authReply = await reader.read(2, deadline);
        if (authReply[0] !== 0x01 || authReply[1] !== 0x00) {
            throw new Error('SOCKS5: username/password rejected');
        }
    }

    socket.write(encodeConnectRequest(destHost, destPort));
    const head = await reader.read(4, deadline);
    if (head[0] !== 0x05) {
        throw new Error(`SOCKS5: bad reply version ${head[0]}`);
    }
    if (head[1] !== 0x00) {
        throw new Error(`SOCKS5: CONNECT failed (REP=${head[1]})`);
    }
    await readBindAddress(reader, head[3], deadline);
}

/**
 * SOCKS5 CONNECT request: VER=5 CMD=1 RSV=0 ATYP DST.ADDR DST.PORT.
 * ATYP is IPv4 / IPv6 when {@link isIPv4} / {@link isIPv6} say so,
 * otherwise domain (onion, hostname).
 */
export function encodeConnectRequest(host: string, port: number): Buffer {
    const portBuf = Buffer.alloc(2);
    portBuf.writeUInt16BE(port);
    if (isIPv4(host)) {
        return Buffer.concat([
            Buffer.from([0x05, 0x01, 0x00, 0x01]),
            Buffer.from(host.split('.').map(n => Number(n))),
            portBuf,
        ]);
    }
    if (isIPv6(host)) {
        return Buffer.concat([
            Buffer.from([0x05, 0x01, 0x00, 0x04]),
            ipv6ToBuffer(host),
            portBuf,
        ]);
    }
    const name = Buffer.from(host, 'ascii');
    if (name.length === 0 || name.length > 255) {
        throw new Error('SOCKS5: dest host must be 1..255 ASCII bytes');
    }
    return Buffer.concat([
        Buffer.from([0x05, 0x01, 0x00, 0x03, name.length]),
        name,
        portBuf,
    ]);
}

/**
 * Expand a Node-validated IPv6 literal to 16 bytes (RFC 4291, incl. IPv4-mapped).
 */
function ipv6ToBuffer(host: string): Buffer {
    const bare = host.includes('%') ? host.slice(0, host.indexOf('%')) : host;
    let ipv4Tail: number[] | undefined;
    const lastColon = bare.lastIndexOf(':');
    const after = lastColon >= 0 ? bare.slice(lastColon + 1) : '';
    let hex = bare;
    if (after.includes('.')) {
        if (!isIPv4(after)) {
            throw new Error('SOCKS5: invalid IPv4-mapped IPv6 address');
        }
        ipv4Tail = after.split('.').map(n => Number(n));
        hex = bare.slice(0, lastColon);
    }
    const sides = hex.split('::');
    if (sides.length > 2) {
        throw new Error('SOCKS5: invalid IPv6 address');
    }
    const parseHextets = (s: string): number[] => {
        if (s === '') {
            return [];
        }
        return s.split(':').map(h => {
            const n = parseInt(h, 16);
            if (!Number.isFinite(n) || n < 0 || n > 0xffff) {
                throw new Error('SOCKS5: invalid IPv6 address');
            }
            return n;
        });
    };
    const left = parseHextets(sides[0] ?? '');
    const right = sides.length === 2 ? parseHextets(sides[1] ?? '') : [];
    const need = 8 - left.length - right.length - (ipv4Tail ? 2 : 0);
    if (need < 0 || (sides.length === 1 && need !== 0)) {
        throw new Error('SOCKS5: invalid IPv6 address');
    }
    const hextets = [...left, ...Array(need).fill(0), ...right];
    const buf = Buffer.alloc(16);
    for (let i = 0; i < hextets.length; i++) {
        buf.writeUInt16BE(hextets[i], i * 2);
    }
    if (ipv4Tail) {
        buf[12] = ipv4Tail[0];
        buf[13] = ipv4Tail[1];
        buf[14] = ipv4Tail[2];
        buf[15] = ipv4Tail[3];
    }
    return buf;
}

async function readBindAddress(
    reader: ReturnType<typeof attachReader>,
    atyp: number,
    deadline: number,
): Promise<void> {
    if (atyp === 0x01) {
        await reader.read(4 + 2, deadline);
        return;
    }
    if (atyp === 0x04) {
        await reader.read(16 + 2, deadline);
        return;
    }
    if (atyp === 0x03) {
        const lenBuf = await reader.read(1, deadline);
        await reader.read(lenBuf[0] + 2, deadline);
        return;
    }
    throw new Error(`SOCKS5: unsupported ATYP ${atyp}`);
}

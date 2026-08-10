// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { execFileSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    FRAME_MAGIC,
    MAX_FRAME_PAYLOAD_BYTES,
    MAX_RECV_BUFFER_BYTES,
} from '../../src/protocol/constants.js';
import {
    connect,
    FusionConnection,
    listen,
    loadPem,
} from '../../src/protocol/connection.js';

/** Minimal socket mock for frame parsing. */
class MockSocket extends EventEmitter {
    written: Buffer[] = [];
    destroyed = false;

    write(data: Buffer, cb?: (err?: Error) => void): boolean {
        this.written.push(Buffer.from(data));
        cb?.();
        return true;
    }

    push(data: Buffer): void {
        this.emit('data', data);
    }

    destroy(): void {
        this.destroyed = true;
        this.emit('close');
    }

    setKeepAlive(): this {
        return this;
    }
}

function mkFrame(text: string): Buffer {
    const body = Buffer.from(text);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    return Buffer.concat([Buffer.from(FRAME_MAGIC), len, body]);
}

describe('FusionConnection framing', () => {
    it('sendMessage prefixes magic and length', async () => {
        const mock = new MockSocket();
        const conn = new FusionConnection(mock as unknown as Socket);
        const body = Buffer.from('hello');
        await conn.sendMessage(body);
        expect(mock.written.length).to.equal(1);
        const frame = mock.written[0];
        expect(frame.subarray(0, 8).equals(Buffer.from(FRAME_MAGIC))).to.equal(
            true,
        );
        expect(frame.readUInt32BE(8)).to.equal(body.length);
        expect(frame.subarray(12).equals(body)).to.equal(true);
    });

    it('recvMessage parses one frame', async () => {
        const mock = new MockSocket();
        const conn = new FusionConnection(mock as unknown as Socket);
        const body = Buffer.from('test payload');
        const len = Buffer.alloc(4);
        len.writeUInt32BE(body.length);
        const frame = Buffer.concat([Buffer.from(FRAME_MAGIC), len, body]);

        const recvPromise = conn.recvMessage(5000);
        mock.push(frame);
        const got = await recvPromise;
        expect(got.equals(body)).to.equal(true);
    });

    it('recvMessage unblocks promptly when connection is closed', async () => {
        const mock = new MockSocket();
        const conn = new FusionConnection(mock as unknown as Socket);
        const recvPromise = conn.recvMessage(60_000);
        const t0 = Date.now();
        conn.close();
        try {
            await recvPromise;
            expect.fail('expected Connection closed');
        } catch (err) {
            expect((err as Error).message).to.match(/Connection closed/);
        }
        expect(Date.now() - t0).to.be.lessThan(2_000);
    });

    it('rejects bad frame magic and closes the connection', async () => {
        const mock = new MockSocket();
        const conn = new FusionConnection(mock as unknown as Socket);
        const bad = Buffer.alloc(12, 0);
        const recvPromise = conn.recvMessage(1000);
        mock.push(bad);
        try {
            await recvPromise;
            expect.fail('expected Bad frame magic');
        } catch (err) {
            expect((err as Error).message).to.match(/Bad frame magic/);
        }
        expect(conn.destroyed).to.equal(true);
    });

    it('rejects oversize outbound payloads locally', async () => {
        const mock = new MockSocket();
        const conn = new FusionConnection(mock as unknown as Socket);
        const huge = Buffer.alloc(MAX_FRAME_PAYLOAD_BYTES + 1, 1);
        try {
            await conn.sendMessage(huge);
            expect.fail('expected Message too large');
        } catch (err) {
            expect((err as Error).message).to.match(/Message too large/);
        }
        expect(mock.written.length).to.equal(0);
    });

    it('closes on oversize frame length in the header', async () => {
        const mock = new MockSocket();
        const conn = new FusionConnection(mock as unknown as Socket);
        const len = Buffer.alloc(4);
        len.writeUInt32BE(MAX_FRAME_PAYLOAD_BYTES + 1);
        const header = Buffer.concat([Buffer.from(FRAME_MAGIC), len]);
        const recvPromise = conn.recvMessage(1000);
        mock.push(header);
        try {
            await recvPromise;
            expect.fail('expected Message too large');
        } catch (err) {
            expect((err as Error).message).to.match(/Message too large/);
        }
        expect(conn.destroyed).to.equal(true);
    });

    it('closes when recvBuf exceeds MAX_RECV_BUFFER_BYTES', async () => {
        const mock = new MockSocket();
        const conn = new FusionConnection(mock as unknown as Socket);
        // Incomplete frame with a legal claimed length so tryParseFrame waits,
        // but flood past the buffer cap before a full payload arrives.
        const len = Buffer.alloc(4);
        len.writeUInt32BE(MAX_FRAME_PAYLOAD_BYTES);
        const header = Buffer.concat([Buffer.from(FRAME_MAGIC), len]);
        mock.push(header);
        mock.push(Buffer.alloc(MAX_RECV_BUFFER_BYTES));
        expect(conn.destroyed).to.equal(true);
    });

    it('recvMessage reassembles a frame split across chunks', async () => {
        const mock = new MockSocket();
        const conn = new FusionConnection(mock as unknown as Socket);
        const frame = mkFrame('split payload');

        const recvPromise = conn.recvMessage(5000);
        mock.push(frame.subarray(0, 10));
        mock.push(frame.subarray(10));
        expect((await recvPromise).toString()).to.equal('split payload');
    });

    it('recvMessage returns two frames delivered in one chunk', async () => {
        const mock = new MockSocket();
        const conn = new FusionConnection(mock as unknown as Socket);

        const recvPromise = conn.recvMessage(5000);
        mock.push(Buffer.concat([mkFrame('one'), mkFrame('two')]));
        expect((await recvPromise).toString()).to.equal('one');
        expect((await conn.recvMessage(5000)).toString()).to.equal('two');
    });

    it('buffers a frame that arrives between recvMessage calls', async () => {
        const mock = new MockSocket();
        const conn = new FusionConnection(mock as unknown as Socket);

        mock.push(mkFrame('first'));
        expect((await conn.recvMessage(5000)).toString()).to.equal('first');

        // No recvMessage awaiting — persistent listener must keep these bytes.
        mock.push(mkFrame('second'));
        expect((await conn.recvMessage(5000)).toString()).to.equal('second');
    });

    it('two TCP clients send to matching server sockets', async () => {
        const serverConns: FusionConnection[] = [];
        const { port, close } = await listen('127.0.0.1', 0, conn => {
            serverConns.push(conn);
        });

        try {
            const c1 = await connect('127.0.0.1', port);
            const c2 = await connect('127.0.0.1', port);
            while (serverConns.length < 2) {
                await new Promise(r => setTimeout(r, 10));
            }

            await c1.sendMessage(Buffer.from('a'));
            await c2.sendMessage(Buffer.from('b'));

            const [m0, m1] = await Promise.all([
                serverConns[0].recvMessage(2000),
                serverConns[1].recvMessage(2000),
            ]);

            // Accept order is not guaranteed — assert the multiset.
            expect([m0.toString(), m1.toString()].sort()).to.deep.equal([
                'a',
                'b',
            ]);

            c1.close();
            c2.close();
        } finally {
            await close();
        }
    });
});

describe('TLS framing', () => {
    it('client and server exchange a frame over TLS', async function () {
        this.timeout(15_000);

        const dir = mkdtempSync(join(tmpdir(), 'alp-fusion-tls-'));
        try {
            const keyPath = join(dir, 'key.pem');
            const certPath = join(dir, 'cert.pem');
            execFileSync(
                'openssl',
                [
                    'req',
                    '-x509',
                    '-newkey',
                    'rsa:2048',
                    '-keyout',
                    keyPath,
                    '-out',
                    certPath,
                    '-days',
                    '1',
                    '-nodes',
                    '-subj',
                    '/CN=localhost',
                ],
                { stdio: 'pipe' },
            );
            const cert = readFileSync(certPath);
            const key = readFileSync(keyPath);

            const serverConns: FusionConnection[] = [];
            const { port, close } = await listen(
                '127.0.0.1',
                0,
                conn => {
                    serverConns.push(conn);
                },
                { ssl: true, cert, key },
            );

            try {
                const client = await connect('127.0.0.1', port, {
                    ssl: true,
                    rejectUnauthorized: false,
                    servername: 'localhost',
                });
                while (serverConns.length < 1) {
                    await new Promise(r => setTimeout(r, 10));
                }

                const body = Buffer.from('tls-hello');
                await client.sendMessage(body);
                const got = await serverConns[0].recvMessage(2000);
                expect(got.equals(body)).to.equal(true);

                client.close();
            } finally {
                await close();
            }
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe('listen TLS options', () => {
    it('rejects ssl listen without cert/key', async () => {
        try {
            await listen('127.0.0.1', 0, () => {}, { ssl: true });
            expect.fail('expected TLS listen error');
        } catch (err) {
            expect((err as Error).message).to.match(/cert and key/);
        }
    });
});

describe('loadPem', () => {
    it('rejects inline PEM and multiline strings (paths only)', () => {
        try {
            loadPem(
                '-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----',
            );
            expect.fail('expected loadPem to throw');
        } catch (err) {
            expect((err as Error).message).to.match(/filesystem path/);
        }
        try {
            loadPem('not-a-pem\nwith-a-newline');
            expect.fail('expected loadPem to throw');
        } catch (err) {
            expect((err as Error).message).to.match(/filesystem path/);
        }
    });

    it('reads a PEM file from disk', () => {
        const dir = mkdtempSync(join(tmpdir(), 'alp-fusion-pem-'));
        try {
            const pem =
                '-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----\n';
            const path = join(dir, 'server.crt');
            writeFileSync(path, pem);
            expect(loadPem(path).toString('utf8')).to.equal(pem);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe('listen close', () => {
    it('destroys open clients so close() does not hang', async () => {
        const serverConns: FusionConnection[] = [];
        const { port, close } = await listen('127.0.0.1', 0, conn => {
            serverConns.push(conn);
        });
        const client = await connect('127.0.0.1', port);
        while (serverConns.length < 1) {
            await new Promise(r => setTimeout(r, 10));
        }
        const t0 = Date.now();
        await close();
        expect(Date.now() - t0).to.be.lessThan(2_000);
        expect(serverConns[0].destroyed).to.equal(true);
        await client.whenClosed();
        expect(client.destroyed).to.equal(true);
    });

    it('keeps idle framed plain-TCP connections alive past handshakeTimeoutMs', async () => {
        // Regression: arming setTimeout on 'connection' after FusionConnection
        // cleared idle timeout used to kill framed TCP peers after the deadline.
        const serverConns: FusionConnection[] = [];
        const { port, close } = await listen(
            '127.0.0.1',
            0,
            conn => {
                serverConns.push(conn);
            },
            { handshakeTimeoutMs: 80 },
        );
        try {
            const client = await connect('127.0.0.1', port);
            while (serverConns.length < 1) {
                await new Promise(r => setTimeout(r, 10));
            }
            await new Promise(r => setTimeout(r, 150));
            expect(serverConns[0].destroyed).to.equal(false);
            await client.sendMessage(Buffer.from('still-here'));
            expect(
                (await serverConns[0].recvMessage(1000)).toString(),
            ).to.equal('still-here');
            client.close();
        } finally {
            await close();
        }
    });

    it('close() does not hang on a stalled TLS handshake', async function () {
        this.timeout(15_000);

        const dir = mkdtempSync(join(tmpdir(), 'alp-fusion-tls-stall-'));
        let stall: Socket | undefined;
        try {
            const keyPath = join(dir, 'key.pem');
            const certPath = join(dir, 'cert.pem');
            execFileSync(
                'openssl',
                [
                    'req',
                    '-x509',
                    '-newkey',
                    'rsa:2048',
                    '-keyout',
                    keyPath,
                    '-out',
                    certPath,
                    '-days',
                    '1',
                    '-nodes',
                    '-subj',
                    '/CN=localhost',
                ],
                { stdio: 'pipe' },
            );

            let framed = 0;
            const { port, close } = await listen(
                '127.0.0.1',
                0,
                () => {
                    framed++;
                },
                {
                    ssl: true,
                    cert: readFileSync(certPath),
                    key: readFileSync(keyPath),
                },
            );

            // Plain TCP connect — never completes TLS, so secureConnection
            // never fires and the framed set stays empty.
            stall = new Socket();
            await new Promise<void>((resolve, reject) => {
                stall!.once('error', reject);
                stall!.connect(port, '127.0.0.1', () => resolve());
            });
            expect(framed).to.equal(0);

            const stallClosed = new Promise<void>(resolve => {
                stall!.once('close', () => resolve());
            });
            const t0 = Date.now();
            await close();
            expect(Date.now() - t0).to.be.lessThan(2_000);
            await stallClosed;
            expect(stall.destroyed).to.equal(true);
        } finally {
            stall?.destroy();
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('destroys stalled TLS handshakes after handshakeTimeoutMs', async function () {
        this.timeout(15_000);

        const dir = mkdtempSync(join(tmpdir(), 'alp-fusion-tls-hs-'));
        let stall: Socket | undefined;
        let close: (() => Promise<void>) | undefined;
        try {
            const keyPath = join(dir, 'key.pem');
            const certPath = join(dir, 'cert.pem');
            execFileSync(
                'openssl',
                [
                    'req',
                    '-x509',
                    '-newkey',
                    'rsa:2048',
                    '-keyout',
                    keyPath,
                    '-out',
                    certPath,
                    '-days',
                    '1',
                    '-nodes',
                    '-subj',
                    '/CN=localhost',
                ],
                { stdio: 'pipe' },
            );

            let framed = 0;
            const listened = await listen(
                '127.0.0.1',
                0,
                () => {
                    framed++;
                },
                {
                    ssl: true,
                    cert: readFileSync(certPath),
                    key: readFileSync(keyPath),
                    handshakeTimeoutMs: 100,
                },
            );
            close = listened.close;

            stall = new Socket();
            const stallClosed = new Promise<void>(resolve => {
                stall!.once('close', () => resolve());
            });
            await new Promise<void>((resolve, reject) => {
                stall!.once('error', reject);
                stall!.connect(listened.port, '127.0.0.1', () => resolve());
            });
            expect(framed).to.equal(0);

            const t0 = Date.now();
            await stallClosed;
            expect(Date.now() - t0).to.be.lessThan(2_000);
            expect(framed).to.equal(0);
            expect(stall.destroyed).to.equal(true);
        } finally {
            stall?.destroy();
            if (close) {
                await close();
            }
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

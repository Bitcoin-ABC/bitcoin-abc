// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect } from 'chai';
import { WebSocket, type RawData } from 'ws';

import {
    FRAME_MAGIC,
    WSS_CONTROL_PATH,
    WSS_COVERT_PATH,
} from '../../src/protocol/constants.js';
import { listenWebSocket } from '../../src/protocol/websocket.js';

function encodeFrame(payload: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(payload.length);
    return Buffer.concat([Buffer.from(FRAME_MAGIC), len, payload]);
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

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(label)), ms);
        p.then(
            value => {
                clearTimeout(timer);
                resolve(value);
            },
            err => {
                clearTimeout(timer);
                reject(err instanceof Error ? err : new Error(String(err)));
            },
        );
    });
}

async function waitOpen(ws: WebSocket): Promise<void> {
    await withTimeout(once(ws, 'open'), 2_000, 'open timed out');
}

describe('listenWebSocket', () => {
    it('answers a plain HTTP request with 426', async () => {
        const { port, close } = await listenWebSocket('127.0.0.1', 0, {
            control: () => undefined,
            covert: () => undefined,
        });
        try {
            const status = await new Promise<number>((resolve, reject) => {
                const req = httpRequest(
                    { host: '127.0.0.1', port, path: '/', method: 'GET' },
                    res => {
                        res.resume();
                        resolve(res.statusCode ?? 0);
                    },
                );
                req.on('error', reject);
                req.end();
            });
            expect(status).to.equal(426);
        } finally {
            await close();
        }
    });

    it('rejects tls without cert and key', async () => {
        try {
            await listenWebSocket(
                '127.0.0.1',
                0,
                { control: () => undefined, covert: () => undefined },
                { ssl: true },
            );
            expect.fail('expected TLS listen error');
        } catch (err) {
            expect((err as Error).message).to.match(/cert and key/);
        }
    });

    it('reassembles a frame split across websocket messages', async () => {
        const payload = Buffer.from('split-frame');
        const frame = encodeFrame(payload);
        const { port, close } = await listenWebSocket('127.0.0.1', 0, {
            control: conn => {
                void conn
                    .recvMessage(2_000)
                    .then(msg => conn.sendMessage(msg))
                    .catch(() => conn.close());
            },
            covert: () => undefined,
        });
        const ws = new WebSocket(`ws://127.0.0.1:${port}${WSS_CONTROL_PATH}`);
        try {
            await waitOpen(ws);
            ws.send(frame.subarray(0, 5));
            ws.send(frame.subarray(5));
            const [data] = await withTimeout(
                once(ws, 'message'),
                2_000,
                'message timed out',
            );
            expect(asBuffer(data as RawData).equals(frame)).to.equal(true);
        } finally {
            ws.terminate();
            await close();
        }
    });

    it('echoes a frame on the covert path', async () => {
        const payload = Buffer.from('covert-frame');
        const frame = encodeFrame(payload);
        const { port, close } = await listenWebSocket('127.0.0.1', 0, {
            control: () => undefined,
            covert: conn => {
                void conn
                    .recvMessage(2_000)
                    .then(msg => conn.sendMessage(msg))
                    .catch(() => conn.close());
            },
        });
        const ws = new WebSocket(`ws://127.0.0.1:${port}${WSS_COVERT_PATH}`);
        try {
            await waitOpen(ws);
            ws.send(frame);
            const [data] = await withTimeout(
                once(ws, 'message'),
                2_000,
                'message timed out',
            );
            expect(asBuffer(data as RawData).equals(frame)).to.equal(true);
        } finally {
            ws.terminate();
            await close();
        }
    });

    it('rejects an unknown upgrade path', async () => {
        const { port, close } = await listenWebSocket('127.0.0.1', 0, {
            control: () => undefined,
            covert: () => undefined,
        });
        const ws = new WebSocket(`ws://127.0.0.1:${port}/nope`);
        const outcome = new Promise<string>(resolve => {
            ws.once('open', () => resolve('open'));
            ws.once('error', () => resolve('error'));
            ws.once('unexpected-response', () => resolve('unexpected'));
        });
        try {
            const result = await withTimeout(
                outcome,
                2_000,
                'unknown path timed out',
            );
            expect(result).to.not.equal('open');
        } finally {
            ws.terminate();
            await close();
        }
    });

    it('closes a text frame', async () => {
        let settle: (err: Error) => void = () => undefined;
        const recvFailed = new Promise<Error>(resolve => {
            settle = resolve;
        });
        const { port, close } = await listenWebSocket('127.0.0.1', 0, {
            control: conn => {
                void conn.recvMessage(2_000).then(
                    () => settle(new Error('expected the text frame to close')),
                    err =>
                        settle(
                            err instanceof Error ? err : new Error(String(err)),
                        ),
                );
            },
            covert: () => undefined,
        });
        const ws = new WebSocket(`ws://127.0.0.1:${port}${WSS_CONTROL_PATH}`);
        try {
            await waitOpen(ws);
            ws.send('not-binary');
            const err = await withTimeout(
                recvFailed,
                2_000,
                'text frame timed out',
            );
            expect(err.message).to.match(/closed|binary/);
        } finally {
            ws.terminate();
            await close();
        }
    });

    it('serves wss when cert and key are set', async function () {
        this.timeout(15_000);
        const dir = mkdtempSync(join(tmpdir(), 'alp-fusion-wss-'));
        const keyPath = join(dir, 'key.pem');
        const certPath = join(dir, 'cert.pem');
        try {
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
            const payload = Buffer.from('tls-frame');
            const frame = encodeFrame(payload);
            const { port, close } = await listenWebSocket(
                '127.0.0.1',
                0,
                {
                    control: conn => {
                        void conn
                            .recvMessage(2_000)
                            .then(msg => conn.sendMessage(msg))
                            .catch(() => conn.close());
                    },
                    covert: () => undefined,
                },
                { ssl: true, cert: certPath, key: keyPath },
            );
            const ws = new WebSocket(
                `wss://127.0.0.1:${port}${WSS_CONTROL_PATH}`,
                { rejectUnauthorized: false },
            );
            try {
                await waitOpen(ws);
                ws.send(frame);
                const [data] = await withTimeout(
                    once(ws, 'message'),
                    2_000,
                    'message timed out',
                );
                expect(asBuffer(data as RawData).equals(frame)).to.equal(true);
            } finally {
                ws.terminate();
                await close();
            }
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

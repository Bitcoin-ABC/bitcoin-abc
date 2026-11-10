// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect } from 'chai';
import { WebSocket, type RawData } from 'ws';

import { FusionCoordinator } from '../../src/coordinator/wire.js';
import {
    FRAME_MAGIC,
    PROTOCOL_VERSION,
    WSS_CONTROL_PATH,
    WSS_COVERT_PATH,
} from '../../src/protocol/constants.js';
import {
    decodeMessage,
    encodeMessage,
    getTypes,
} from '../../src/protocol/messages.js';

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

function decodeFrame(buf: Buffer): Buffer {
    expect(buf.subarray(0, 8).equals(Buffer.from(FRAME_MAGIC))).to.equal(true);
    const len = buf.readUInt32BE(8);
    return buf.subarray(12, 12 + len);
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

function waitOpen(ws: WebSocket): Promise<void> {
    if (ws.readyState === WebSocket.OPEN) {
        return Promise.resolve();
    }
    return withTimeout(
        new Promise((resolve, reject) => {
            ws.once('open', () => resolve());
            ws.once('error', err =>
                reject(err instanceof Error ? err : new Error(String(err))),
            );
        }),
        2_000,
        'open timed out',
    );
}

async function nextPayload(ws: WebSocket): Promise<Buffer> {
    const [data] = await withTimeout(
        once(ws, 'message'),
        2_000,
        'message timed out',
    );
    return decodeFrame(asBuffer(data as RawData));
}

describe('FusionCoordinator WebSocket gateway', () => {
    it('answers clienthello on /control and ping on /covert', async () => {
        const coord = new FusionCoordinator({
            minPlayers: 2,
            recvTimeoutMs: 2_000,
            wss: { port: 0 },
        });
        await coord.start('127.0.0.1', 0, 0);
        const port = coord.wssPort;
        expect(port).to.be.a('number');
        const types = await getTypes();
        const control = new WebSocket(
            `ws://127.0.0.1:${port}${WSS_CONTROL_PATH}`,
        );
        const covert = new WebSocket(
            `ws://127.0.0.1:${port}${WSS_COVERT_PATH}`,
        );
        try {
            await waitOpen(control);
            control.send(
                encodeFrame(
                    encodeMessage(types.ClientMessage, 'clienthello', {
                        version: PROTOCOL_VERSION,
                    }),
                ),
            );
            const hello = decodeMessage(
                types.ServerMessage,
                await nextPayload(control),
            );
            expect(hello.field).to.equal('serverhello');

            await waitOpen(covert);
            covert.send(
                encodeFrame(encodeMessage(types.CovertMessage, 'ping', {})),
            );
            const pong = decodeMessage(
                types.CovertResponse,
                await nextPayload(covert),
            );
            expect(pong.field).to.equal('ok');
        } finally {
            control.terminate();
            covert.terminate();
            await coord.close();
        }
    });

    it('answers clienthello over wss', async function () {
        this.timeout(15_000);
        const dir = mkdtempSync(join(tmpdir(), 'alp-fusion-wss-coord-'));
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
            const coord = new FusionCoordinator({
                minPlayers: 2,
                recvTimeoutMs: 2_000,
                wss: {
                    port: 0,
                    cert: readFileSync(certPath),
                    key: readFileSync(keyPath),
                },
            });
            await coord.start('127.0.0.1', 0, 0);
            const types = await getTypes();
            const ws = new WebSocket(
                `wss://127.0.0.1:${coord.wssPort}${WSS_CONTROL_PATH}`,
                { rejectUnauthorized: false },
            );
            try {
                await waitOpen(ws);
                ws.send(
                    encodeFrame(
                        encodeMessage(types.ClientMessage, 'clienthello', {
                            version: PROTOCOL_VERSION,
                        }),
                    ),
                );
                const hello = decodeMessage(
                    types.ServerMessage,
                    await nextPayload(ws),
                );
                expect(hello.field).to.equal('serverhello');
            } finally {
                ws.terminate();
                await coord.close();
            }
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

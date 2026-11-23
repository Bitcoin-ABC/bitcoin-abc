// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect } from 'chai';
import { MockChronikClient } from 'mock-chronik-client';

import { startCoordinator } from '../../src/cli/coordinator.js';
import { parseCoordinatorEnv } from '../../src/cli/env.js';
import { FusionCoordinator } from '../../src/coordinator/wire.js';
import { PROTOCOL_VERSION } from '../../src/protocol/constants.js';
import { connect } from '../../src/protocol/connection.js';
import {
    decodeMessage,
    encodeMessage,
    getTypes,
} from '../../src/protocol/messages.js';

describe('coordinator TCP TLS', function () {
    this.timeout(15_000);

    it('rejects TCP TLS unless both cert and key are set', async () => {
        const coord = new FusionCoordinator({
            tls: { cert: 'certs/server.crt', key: '' },
        });
        let threw: Error | undefined;
        try {
            await coord.start('127.0.0.1', 0, 0);
        } catch (err) {
            threw = err as Error;
        }
        expect(threw?.message).to.match(/TCP TLS requires both cert and key/);
    });

    it('answers clienthello and covert ping over TLS', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'alp-fusion-tcp-tls-'));
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
            const lines: string[] = [];
            const started = await startCoordinator(
                parseCoordinatorEnv({
                    CHRONIK_URLS: 'https://chronik.example',
                    CONTROL_PORT: '0',
                    COVERT_PORT: '0',
                    MIN_PLAYERS: '2',
                    TLS_CERT: certPath,
                    TLS_KEY: keyPath,
                }),
                {
                    createChronik: () => new MockChronikClient(),
                    log: line => {
                        lines.push(line);
                    },
                },
            );
            try {
                expect(lines[0]).to.include('tls=1');
                const types = await getTypes();
                const tls = {
                    ssl: true,
                    rejectUnauthorized: false,
                    servername: 'localhost',
                };
                const control = await connect(
                    '127.0.0.1',
                    started.controlPort,
                    tls,
                );
                try {
                    await control.sendMessage(
                        encodeMessage(types.ClientMessage, 'clienthello', {
                            version: PROTOCOL_VERSION,
                        }),
                    );
                    const hello = decodeMessage(
                        types.ServerMessage,
                        await control.recvMessage(2_000),
                    );
                    expect(hello.field).to.equal('serverhello');

                    const covert = await connect(
                        '127.0.0.1',
                        started.covertPort,
                        tls,
                    );
                    try {
                        await covert.sendMessage(
                            encodeMessage(types.CovertMessage, 'ping', {}),
                        );
                        const pong = decodeMessage(
                            types.CovertResponse,
                            await covert.recvMessage(2_000),
                        );
                        expect(pong.field).to.equal('ok');

                        const plain = await connect(
                            '127.0.0.1',
                            started.controlPort,
                            { timeoutMs: 1_000 },
                        );
                        try {
                            let exchanged = false;
                            try {
                                await plain.sendMessage(
                                    encodeMessage(
                                        types.ClientMessage,
                                        'clienthello',
                                        { version: PROTOCOL_VERSION },
                                    ),
                                );
                                const reply = decodeMessage(
                                    types.ServerMessage,
                                    await plain.recvMessage(2_000),
                                );
                                exchanged = reply.field === 'serverhello';
                            } catch {
                                exchanged = false;
                            }
                            // A plaintext clienthello must not complete.
                            // The same exchange on a plain listener returns
                            // serverhello and fails this assertion.
                            expect(exchanged).to.equal(false);
                        } finally {
                            plain.close();
                        }
                    } finally {
                        covert.close();
                    }
                } finally {
                    control.close();
                }
            } finally {
                await started.coordinator.close();
            }
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

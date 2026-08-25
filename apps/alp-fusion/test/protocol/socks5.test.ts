// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import {
    connect,
    listen,
    type FusionConnection,
} from '../../src/protocol/connection.js';
import {
    encodeConnectRequest,
    socks5Connect,
} from '../../src/protocol/socks5.js';
import { listenMockSocks5 } from './helpers/mockSocks5.js';

describe('encodeConnectRequest', () => {
    it('uses ATYP IPv4 when node:net.isIPv4 accepts the dest', () => {
        const req = encodeConnectRequest('127.0.0.1', 8789);
        expect(req[3]).to.equal(0x01);
        expect(req.subarray(4, 8)).to.deep.equal(Buffer.from([127, 0, 0, 1]));
        expect(req.readUInt16BE(8)).to.equal(8789);
    });

    it('uses ATYP IPv6 when node:net.isIPv6 accepts the dest', () => {
        const req = encodeConnectRequest('::1', 443);
        expect(req[3]).to.equal(0x04);
        expect(req.subarray(4, 20)).to.deep.equal(
            Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]),
        );
        expect(req.readUInt16BE(20)).to.equal(443);
    });

    it('encodes IPv4-mapped IPv6 as ATYP 4', () => {
        const req = encodeConnectRequest('::ffff:127.0.0.1', 80);
        expect(req[3]).to.equal(0x04);
        expect(req.subarray(4, 20)).to.deep.equal(
            Buffer.from([
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff, 127, 0, 0, 1,
            ]),
        );
    });

    it('falls back to domain ATYP for invalid IPv4 and hostnames', () => {
        expect(encodeConnectRequest('999.1.2.3', 80)[3]).to.equal(0x03);
        expect(encodeConnectRequest('fusion.example', 80)[3]).to.equal(0x03);
        expect(encodeConnectRequest('abcxxxxyz.onion', 80)[3]).to.equal(0x03);
    });
});

describe('socks5Connect', () => {
    it('rejects out-of-range ports', async () => {
        try {
            await socks5Connect('127.0.0.1', 0, { host: '127.0.0.1', port: 1 });
            expect.fail('expected destPort 0 to throw');
        } catch (err) {
            expect((err as Error).message).to.match(/destPort/);
        }
    });

    it('tunnels a framed FusionConnection through a mock proxy', async () => {
        const serverConns: FusionConnection[] = [];
        const dest = await listen('127.0.0.1', 0, conn => {
            serverConns.push(conn);
        });
        const proxy = await listenMockSocks5();
        let client: FusionConnection | undefined;
        try {
            client = await connect('127.0.0.1', dest.port, {
                socks5: { host: '127.0.0.1', port: proxy.port },
                timeoutMs: 2_000,
            });
            while (serverConns.length < 1) {
                await new Promise(r => setTimeout(r, 10));
            }
            await client.sendMessage(Buffer.from('via-socks'));
            const got = await serverConns[0].recvMessage(2_000);
            expect(got.toString()).to.equal('via-socks');
        } finally {
            client?.close();
            await dest.close();
            await proxy.close();
        }
    });

    it('sends RFC 1929 credentials when username/password are set', async () => {
        const dest = await listen('127.0.0.1', 0, conn => {
            void conn.recvMessage(2_000).then(() => conn.close());
        });
        const proxy = await listenMockSocks5({ requireAuth: true });
        let client: FusionConnection | undefined;
        try {
            client = await connect('127.0.0.1', dest.port, {
                socks5: {
                    host: '127.0.0.1',
                    port: proxy.port,
                    username: 'AF-test',
                    password: 'AF-test',
                },
                timeoutMs: 2_000,
            });
            await client.sendMessage(Buffer.from('auth'));
            await new Promise(r => setTimeout(r, 50));
            expect(proxy.logins).to.deep.equal(['AF-test:AF-test']);
        } finally {
            client?.close();
            await dest.close();
            await proxy.close();
        }
    });

    it('destroys the tunneled socket when TLS-over-SOCKS handshake fails', async () => {
        const destClosed: Promise<void>[] = [];
        const dest = await listen('127.0.0.1', 0, conn => {
            destClosed.push(conn.whenClosed());
        });
        const proxy = await listenMockSocks5();
        try {
            try {
                await connect('127.0.0.1', dest.port, {
                    ssl: true,
                    rejectUnauthorized: false,
                    servername: 'localhost',
                    socks5: { host: '127.0.0.1', port: proxy.port },
                    timeoutMs: 500,
                });
                expect.fail('expected TLS handshake to fail');
            } catch (err) {
                expect(err).to.be.instanceOf(Error);
            }
            while (destClosed.length < 1) {
                await new Promise(r => setTimeout(r, 10));
            }
            await destClosed[0];
        } finally {
            await dest.close();
            await proxy.close();
        }
    });
});

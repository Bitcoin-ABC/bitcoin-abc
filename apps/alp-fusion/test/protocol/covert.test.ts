// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { EventEmitter } from 'node:events';
import { Socket } from 'node:net';

import { COVERT } from '../../src/protocol/constants.js';
import {
    connect,
    FusionConnection,
    listen,
} from '../../src/protocol/connection.js';
import {
    CovertSubmitter,
    CovertUnrecoverable,
    randTrap,
    serveCovertPeer,
    TorLimiter,
} from '../../src/protocol/covert.js';
import {
    encodeMessage,
    getTypes,
    initProto,
} from '../../src/protocol/messages.js';
import { listenMockSocks5 } from './helpers/mockSocks5.js';

function componentWork(tag: number) {
    return {
        field: 'component' as const,
        payload: {
            signature: Buffer.alloc(64, tag),
            component: Buffer.alloc(32, tag + 1),
        },
    };
}

async function withCovertServer(
    onMessage: (
        field: string,
        payload: Record<string, unknown>,
        remotePort: number,
    ) => { ok: true } | { ok: false; message: string },
): Promise<{
    port: number;
    peers: number;
    close: () => Promise<void>;
}> {
    let peers = 0;
    const { port, close } = await listen('127.0.0.1', 0, conn => {
        peers += 1;
        const remotePort = conn.socket.remotePort ?? 0;
        void serveCovertPeer(conn, (field, payload) =>
            onMessage(field, payload, remotePort),
        );
    });
    return {
        port,
        get peers() {
            return peers;
        },
        close,
    };
}

describe('randTrap / TorLimiter', () => {
    it('randTrap stays in [0, 1] and is not uniform at the tails', () => {
        const seq = [0, 0.05, 0.5, 0.95, 0.999];
        let i = 0;
        const rng = {
            random: () => seq[i++ % seq.length],
        };
        for (let n = 0; n < seq.length; n++) {
            const x = randTrap(rng);
            expect(x).to.be.at.least(0);
            expect(x).to.be.at.most(1);
        }
        // f=0 → 0; f=0.5 → 0.75*0.5+0.125 = 0.5
        i = 0;
        expect(randTrap({ random: () => 0 })).to.equal(0);
        expect(randTrap({ random: () => 0.5 })).to.equal(0.5);
    });

    it('TorLimiter expires attempts after lifetimeMs', () => {
        const lim = new TorLimiter(50);
        lim.bump(1_000);
        lim.bump(1_010);
        // `count` uses Date.now(); pin cleanup/countAt to the fake timeline.
        expect(lim.countAt(1_049)).to.equal(2);
        expect(lim.countAt(1_050)).to.equal(1);
        expect(lim.countAt(1_060)).to.equal(0);
    });
});

describe('serveCovertPeer', () => {
    before(async () => {
        await initProto();
    });

    it('closes and resolves on an undecodable covert frame', async () => {
        const rejections: unknown[] = [];
        const onRej = (reason: unknown) => {
            rejections.push(reason);
        };
        process.on('unhandledRejection', onRej);
        const loops: Promise<void>[] = [];
        const { port, close } = await listen('127.0.0.1', 0, conn => {
            loops.push(serveCovertPeer(conn));
        });
        const client = await connect('127.0.0.1', port);
        try {
            while (loops.length < 1) {
                await new Promise(r => setTimeout(r, 10));
            }
            await client.sendMessage(Buffer.from('not-a-covert-message'));
            await loops[0];
            await client.whenClosed();
            expect(client.destroyed).to.equal(true);
            expect(rejections).to.deep.equal([]);
        } finally {
            process.off('unhandledRejection', onRej);
            client.close();
            await close();
        }
    });

    it('closes and resolves when onMessage throws', async () => {
        const rejections: unknown[] = [];
        const onRej = (reason: unknown) => {
            rejections.push(reason);
        };
        process.on('unhandledRejection', onRej);
        const loops: Promise<void>[] = [];
        const { port, close } = await listen('127.0.0.1', 0, conn => {
            loops.push(
                serveCovertPeer(conn, () => {
                    throw new Error('handler boom');
                }),
            );
        });
        const client = await connect('127.0.0.1', port);
        try {
            while (loops.length < 1) {
                await new Promise(r => setTimeout(r, 10));
            }
            const types = await getTypes();
            await client.sendMessage(
                encodeMessage(types.CovertMessage, 'ping', {}),
            );
            await loops[0];
            await client.whenClosed();
            expect(rejections).to.deep.equal([]);
        } finally {
            process.off('unhandledRejection', onRej);
            client.close();
            await close();
        }
    });

    it('closes the socket when recvMessage times out', async () => {
        class IdleSocket extends EventEmitter {
            destroyed = false;
            destroy(): void {
                this.destroyed = true;
                this.emit('close');
            }
            setKeepAlive(): this {
                return this;
            }
        }
        const sock = new IdleSocket();
        const conn = new FusionConnection(sock as unknown as Socket, 50);
        await serveCovertPeer(conn);
        expect(conn.destroyed).to.equal(true);
    });
});

describe('CovertSubmitter', () => {
    before(async () => {
        await initProto();
    });

    it('submits CovertComponent on a socket separate from control listen', async () => {
        const seen: string[] = [];
        const server = await withCovertServer((field, payload) => {
            seen.push(field);
            if (field === 'component') {
                expect(
                    Buffer.from(payload.signature as Uint8Array)[0],
                ).to.equal(7);
            }
            return { ok: true };
        });
        const covert = new CovertSubmitter({
            destHost: '127.0.0.1',
            destPort: server.port,
            numSlots: 1,
            randSpanMs: 0,
            submitTimeoutMs: 2_000,
            connectTimeoutMs: 2_000,
        });
        try {
            covert.scheduleConnections(Date.now(), 0, 0);
            await covert.waitUntilConnected(2_000);
            covert.scheduleSubmit(0, Date.now(), componentWork(7));
            await covert.waitUntilDone(2_000);
            expect(seen).to.deep.equal(['component']);
            expect(server.peers).to.equal(1);
        } finally {
            covert.setStopTime(Date.now());
            covert.stop();
            await covert.waitUntilStopped();
            await server.close();
        }
    });

    it('reuses the same connection for two submits on one slot', async () => {
        const ports: number[] = [];
        const server = await withCovertServer((_f, _p, remotePort) => {
            ports.push(remotePort);
            return { ok: true };
        });
        const covert = new CovertSubmitter({
            destHost: '127.0.0.1',
            destPort: server.port,
            numSlots: 1,
            randSpanMs: 0,
            submitTimeoutMs: 2_000,
            connectTimeoutMs: 2_000,
        });
        try {
            covert.scheduleConnections(Date.now(), 0, 0);
            await covert.waitUntilConnected(2_000);
            covert.scheduleSubmit(0, Date.now(), componentWork(1));
            await covert.waitUntilDone(2_000);
            covert.scheduleSubmit(0, Date.now(), componentWork(2));
            await covert.waitUntilDone(2_000);
            expect(ports.length).to.equal(2);
            expect(ports[0]).to.equal(ports[1]);
            expect(server.peers).to.equal(1);
        } finally {
            covert.setStopTime(Date.now());
            covert.stop();
            await covert.waitUntilStopped();
            await server.close();
        }
    });

    it('reassigns a slot to a spare when the first socket dies', async () => {
        const serverConns: Array<{
            close: () => void;
        }> = [];
        const { port, close } = await listen('127.0.0.1', 0, conn => {
            serverConns.push(conn);
            void serveCovertPeer(conn, () => ({ ok: true }));
        });
        const covert = new CovertSubmitter({
            destHost: '127.0.0.1',
            destPort: port,
            numSlots: 1,
            randSpanMs: 0,
            submitTimeoutMs: 2_000,
            connectTimeoutMs: 2_000,
        });
        try {
            covert.scheduleConnections(Date.now(), 0, 1);
            await covert.waitUntilConnected(2_000);
            while (serverConns.length < 2) {
                await new Promise(r => setTimeout(r, 10));
            }
            // Kill the slot's live socket; spare should take over.
            covert.slots[0].covconn?.connection?.close();
            await new Promise(r => setTimeout(r, 50));
            covert.scheduleSubmit(0, Date.now(), componentWork(3));
            await covert.waitUntilDone(3_000);
            expect(covert.countEstablished).to.be.at.least(2);
        } finally {
            covert.setStopTime(Date.now());
            covert.stop();
            await covert.waitUntilStopped();
            await close();
        }
    });

    it('drops a dead spare so a later slot failure does not inherit it', async () => {
        const { port, close } = await listen('127.0.0.1', 0, conn => {
            void serveCovertPeer(conn, () => ({ ok: true }));
        });
        const covert = new CovertSubmitter({
            destHost: '127.0.0.1',
            destPort: port,
            numSlots: 1,
            randSpanMs: 0,
            submitTimeoutMs: 2_000,
            connectTimeoutMs: 2_000,
        });
        try {
            covert.scheduleConnections(Date.now(), 0, 1);
            await covert.waitUntilConnected(2_000);
            const spare = covert.spareConnections[0];
            expect(spare).to.not.equal(undefined);
            spare.connection?.close();
            // Wake the spare so ping hits the closed socket and the task exits.
            covert.scheduleSubmissions(Date.now(), [null]);
            const dropBy = Date.now() + 2_000;
            while (
                covert.spareConnections.includes(spare) &&
                Date.now() < dropBy
            ) {
                await new Promise(r => setTimeout(r, 10));
            }
            expect(covert.spareConnections).to.not.include(spare);

            covert.slots[0].covconn?.connection?.close();
            covert.scheduleSubmit(0, Date.now(), componentWork(9));
            try {
                await covert.waitUntilDone(2_000);
                expect.fail('expected stop after dead spare was dropped');
            } catch (err) {
                expect(err).to.be.instanceOf(CovertUnrecoverable);
            }
        } finally {
            covert.setStopTime(Date.now());
            covert.stop();
            await covert.waitUntilStopped();
            await close();
        }
    });

    it('stops unrecoverably when the covert peer returns Error', async () => {
        const server = await withCovertServer(() => ({
            ok: false,
            message: 'bad component',
        }));
        const covert = new CovertSubmitter({
            destHost: '127.0.0.1',
            destPort: server.port,
            numSlots: 1,
            randSpanMs: 0,
            submitTimeoutMs: 2_000,
            connectTimeoutMs: 2_000,
        });
        try {
            covert.scheduleConnections(Date.now(), 0, 0);
            await covert.waitUntilConnected(2_000);
            covert.scheduleSubmit(0, Date.now(), componentWork(4));
            try {
                await covert.waitUntilDone(2_000);
                expect.fail('expected unrecoverable error');
            } catch (err) {
                expect(err).to.be.instanceOf(CovertUnrecoverable);
                expect((err as Error).message).to.match(/bad component/);
            }
        } finally {
            covert.setStopTime(Date.now());
            covert.stop();
            await covert.waitUntilStopped();
            await server.close();
        }
    });

    it('dials through SOCKS5 with a unique login per connection', async () => {
        const seen: string[] = [];
        const dest = await withCovertServer(field => {
            seen.push(field);
            return { ok: true };
        });
        const proxy = await listenMockSocks5({ requireAuth: true });
        const covert = new CovertSubmitter({
            destHost: '127.0.0.1',
            destPort: dest.port,
            numSlots: 2,
            randSpanMs: 0,
            submitTimeoutMs: 2_000,
            connectTimeoutMs: 2_000,
            socks5: { host: '127.0.0.1', port: proxy.port },
        });
        try {
            covert.scheduleConnections(Date.now(), 0, 0);
            await covert.waitUntilConnected(3_000);
            covert.scheduleSubmissions(Date.now(), [
                componentWork(1),
                componentWork(2),
            ]);
            await covert.waitUntilDone(3_000);
            expect(seen).to.have.members(['component', 'component']);
            expect(covert.socksLogins.length).to.equal(2);
            expect(covert.socksLogins[0]).to.not.equal(covert.socksLogins[1]);
            expect(proxy.logins.length).to.equal(2);
            expect(new Set(proxy.logins).size).to.equal(2);
        } finally {
            covert.setStopTime(Date.now());
            covert.stop();
            await covert.waitUntilStopped();
            await dest.close();
            await proxy.close();
        }
    });

    it('exposes Electrum-shaped COVERT defaults', () => {
        expect(COVERT.connectSpares).to.equal(6);
        expect(COVERT.submitWindowMs).to.equal(5_000);
        expect(COVERT.connectTimeoutMs).to.equal(15_000);
    });
});

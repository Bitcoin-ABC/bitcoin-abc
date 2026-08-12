// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { PROTOCOL_VERSION } from '../../src/protocol/constants.js';
import {
    connect,
    listen,
    type FusionConnection,
} from '../../src/protocol/connection.js';
import {
    decodeComponent,
    decodeInitialCommitment,
    decodeMessage,
    encodeComponent,
    encodeInitialCommitment,
    encodeMessage,
    getTypes,
    initProto,
    requireProto,
} from '../../src/protocol/messages.js';

/** Above Number.MAX_SAFE_INTEGER — must round-trip via bigint. */
const HUGE_ATOMS = 9007199254740993n;

describe('protobuf messages', () => {
    before(async () => {
        await initProto();
    });

    it('roundtrips Component with ALP token fields as bigint', () => {
        const payload = {
            saltCommitment: Buffer.alloc(32, 1),
            input: {
                prevTxid: Buffer.alloc(32, 2),
                prevIndex: 3,
                pubkey: Buffer.alloc(33, 4),
                sats: 546n,
                tokenAtoms: 1000n,
            },
        };
        const ser = encodeComponent(payload);
        const dec = decodeComponent(ser);
        expect(dec.input).to.be.an('object');
        const inp = dec.input as Record<string, unknown>;
        expect(inp.tokenAtoms).to.equal(1000n);
        expect(inp.sats).to.equal(546n);
    });

    it('roundtrips uint64 atom amounts above MAX_SAFE_INTEGER', () => {
        const ser = encodeComponent({
            saltCommitment: Buffer.alloc(32, 1),
            input: {
                prevTxid: Buffer.alloc(32, 2),
                prevIndex: 0,
                pubkey: Buffer.alloc(33, 4),
                sats: 546n,
                tokenAtoms: HUGE_ATOMS,
            },
        });
        const dec = decodeComponent(ser);
        const inp = dec.input as Record<string, unknown>;
        expect(inp.tokenAtoms).to.equal(HUGE_ATOMS);
    });

    it('rejects number for uint64 fields (bigint required)', () => {
        try {
            encodeComponent({
                saltCommitment: Buffer.alloc(32, 1),
                input: {
                    prevTxid: Buffer.alloc(32, 2),
                    prevIndex: 0,
                    pubkey: Buffer.alloc(33, 4),
                    sats: 546,
                    tokenAtoms: 1n,
                },
            });
            expect.fail('expected number uint64 to throw');
        } catch (err) {
            expect((err as Error).message).to.match(/expected bigint/i);
        }
    });

    it('rejects negative number for unsigned fields', () => {
        try {
            encodeComponent({
                saltCommitment: Buffer.alloc(32, 1),
                input: {
                    prevTxid: Buffer.alloc(32, 2),
                    prevIndex: 0,
                    pubkey: Buffer.alloc(33, 4),
                    sats: -1,
                    tokenAtoms: 1n,
                },
            });
            expect.fail('expected negative number to throw');
        } catch (err) {
            expect((err as Error).message).to.match(/expected bigint/i);
        }
    });

    it('rejects out-of-range bigint for uint64 fields', () => {
        for (const tokenAtoms of [-1n, 0x10000000000000000n]) {
            try {
                encodeComponent({
                    saltCommitment: Buffer.alloc(32, 1),
                    input: {
                        prevTxid: Buffer.alloc(32, 2),
                        prevIndex: 0,
                        pubkey: Buffer.alloc(33, 4),
                        sats: 546n,
                        tokenAtoms,
                    },
                });
                expect.fail(`expected out-of-range ${tokenAtoms} to throw`);
            } catch (err) {
                expect((err as Error).message).to.match(/Out-of-range bigint/i);
            }
        }
    });

    it('rejects non-array value for repeated uint64 fields', async () => {
        const types = await getTypes();
        try {
            encodeMessage(types.ServerMessage, 'serverhello', {
                numComponents: 23,
                componentFeerate: 1000n,
                minExcessFee: 100n,
                maxExcessFee: 300000n,
                // proto: repeated uint64 atom_tiers
                atomTiers: 1000n,
                minPlayers: 4,
            });
            expect.fail('expected scalar repeated field to throw');
        } catch (err) {
            expect((err as Error).message).to.match(
                /expected array for repeated field/i,
            );
        }
    });

    it('rejects non-object payload for uint64 field checks', () => {
        try {
            encodeComponent(
                'not-an-object' as unknown as Record<string, unknown>,
            );
            expect.fail('expected non-object payload to throw');
        } catch (err) {
            expect((err as Error).message).to.match(
                /expected plain object payload/i,
            );
        }
    });

    it('rejects Component missing required saltCommitment', () => {
        try {
            encodeComponent({
                input: {
                    prevTxid: Buffer.alloc(32, 2),
                    prevIndex: 0,
                    pubkey: Buffer.alloc(33, 4),
                    sats: 546n,
                },
            });
            expect.fail('expected verify to throw');
        } catch (err) {
            expect((err as Error).message).to.match(
                /saltCommitment.*required/i,
            );
        }
    });

    it('rejects InitialCommitment missing required fields', () => {
        try {
            encodeInitialCommitment({
                saltedComponentHash: Buffer.alloc(32, 5),
            });
            expect.fail('expected verify to throw');
        } catch (err) {
            expect((err as Error).message).to.match(/required field missing/i);
        }
    });

    it('rejects decode of Component with empty required saltCommitment', () => {
        const Type = requireProto().lookupType('alpfusion.Component');
        // Type.create fills required bytes as empty on the wire (0a00); that
        // must not be treated as a valid peer Component.
        const wire = Buffer.from(
            Type.encode(
                Type.create({
                    input: {
                        prevTxid: Buffer.alloc(32, 2),
                        prevIndex: 0,
                        pubkey: Buffer.alloc(33, 4),
                        sats: 546,
                    },
                }),
            ).finish(),
        );
        try {
            decodeComponent(wire);
            expect.fail('expected decode to throw');
        } catch (err) {
            expect((err as Error).message).to.match(
                /saltCommitment.*(required|empty)/i,
            );
        }
    });

    it('rejects decode of ClientHello with empty required version', async () => {
        const types = await getTypes();
        const Hello = requireProto().lookupType('alpfusion.ClientHello');
        // Encode ClientHello with zero-length version, wrapped as ClientMessage.
        const helloBytes = Hello.encode(
            Hello.create({ version: Buffer.alloc(0) }),
        ).finish();
        const wire = Buffer.from(
            types.ClientMessage.encode(
                types.ClientMessage.create({
                    clienthello: Hello.decode(helloBytes),
                }),
            ).finish(),
        );
        try {
            decodeMessage(types.ClientMessage, wire);
            expect.fail('expected decode to throw');
        } catch (err) {
            expect((err as Error).message).to.match(
                /version.*(required|empty)/i,
            );
        }
    });

    it('roundtrips InitialCommitment dual Pedersen points', () => {
        const payload = {
            saltedComponentHash: Buffer.alloc(32, 5),
            satsCommitment: Buffer.alloc(65, 6),
            tokenCommitment: Buffer.alloc(65, 7),
            communicationKey: Buffer.alloc(33, 8),
        };
        const ser = encodeInitialCommitment(payload);
        const dec = decodeInitialCommitment(ser);
        expect((dec.satsCommitment as Uint8Array).length).to.equal(65);
        expect((dec.tokenCommitment as Uint8Array).length).to.equal(65);
    });

    it('roundtrips ClientHello and ServerHello', async () => {
        const types = await getTypes();
        const hello = encodeMessage(types.ClientMessage, 'clienthello', {
            version: PROTOCOL_VERSION,
        });
        const decoded = decodeMessage(types.ClientMessage, hello);
        expect(decoded.field).to.equal('clienthello');
        expect(
            Buffer.from(decoded.payload.version as Uint8Array).equals(
                Buffer.from(PROTOCOL_VERSION),
            ),
        ).to.equal(true);

        const reply = encodeMessage(types.ServerMessage, 'serverhello', {
            numComponents: 23,
            componentFeerate: 1000n,
            minExcessFee: 100n,
            maxExcessFee: 300000n,
            atomTiers: [100n, 1000n],
            minPlayers: 4,
        });
        const serverDec = decodeMessage(types.ServerMessage, reply);
        expect(serverDec.field).to.equal('serverhello');
        expect(serverDec.payload.numComponents).to.equal(23);
        expect(serverDec.payload.atomTiers).to.deep.equal([100n, 1000n]);
    });

    it('rejects unknown oneof field names', async () => {
        const types = await getTypes();
        try {
            encodeMessage(types.ClientMessage, 'notamessage', {});
            expect.fail('expected unsupported field to throw');
        } catch (err) {
            expect((err as Error).message).to.match(
                /Unsupported message field/i,
            );
        }
    });

    it('roundtrips JoinPools with bigint atomTier above MAX_SAFE_INTEGER', async () => {
        const types = await getTypes();
        const tokenId = Buffer.alloc(32, 9);
        const msg = encodeMessage(types.ClientMessage, 'joinpools', {
            pools: [{ tokenId, atomTier: HUGE_ATOMS }],
            tags: [{ id: Buffer.alloc(16), limit: 1 }],
        });
        const dec = decodeMessage(types.ClientMessage, msg);
        expect(dec.field).to.equal('joinpools');
        const pools = dec.payload.pools as Record<string, unknown>[];
        expect(pools[0].atomTier).to.equal(HUGE_ATOMS);
        expect(
            Buffer.from(pools[0].tokenId as Uint8Array).equals(tokenId),
        ).to.equal(true);
    });

    it('roundtrips FusionBegin and PlayerCommit envelopes', async () => {
        const types = await getTypes();
        const begin = encodeMessage(types.ServerMessage, 'fusionbegin', {
            tokenId: Buffer.alloc(32, 0xab),
            atomTier: 1000n,
            covertDomain: Buffer.from('example.onion'),
            covertPort: 8789,
            covertSsl: false,
            serverTime: 1_700_000_000n,
        });
        const beginDec = decodeMessage(types.ServerMessage, begin);
        expect(beginDec.field).to.equal('fusionbegin');
        expect(beginDec.payload.atomTier).to.equal(1000n);
        expect(beginDec.payload.serverTime).to.equal(1_700_000_000n);

        const commit = encodeMessage(types.ClientMessage, 'playercommit', {
            initialCommitments: [Buffer.alloc(32, 1)],
            excessFee: 200n,
            satsPedersenTotalNonce: Buffer.alloc(32, 2),
            tokenPedersenTotalNonce: Buffer.alloc(32, 3),
            randomNumberCommitment: Buffer.alloc(32, 4),
            blindSigRequests: [Buffer.alloc(32, 5)],
        });
        const commitDec = decodeMessage(types.ClientMessage, commit);
        expect(commitDec.field).to.equal('playercommit');
        expect(commitDec.payload.excessFee).to.equal(200n);
    });
});

describe('protobuf over FusionConnection', () => {
    it('exchanges ClientHello / ServerHello over framed TCP', async () => {
        await initProto();
        const types = await getTypes();
        const serverConns: FusionConnection[] = [];
        const { port, close } = await listen('127.0.0.1', 0, conn => {
            serverConns.push(conn);
        });
        let client: FusionConnection | undefined;
        try {
            client = await connect('127.0.0.1', port);
            while (serverConns.length < 1) {
                await new Promise(r => setTimeout(r, 10));
            }

            await client.sendMessage(
                encodeMessage(types.ClientMessage, 'clienthello', {
                    version: PROTOCOL_VERSION,
                }),
            );
            const hello = decodeMessage(
                types.ClientMessage,
                await serverConns[0].recvMessage(2000),
            );
            expect(hello.field).to.equal('clienthello');

            await serverConns[0].sendMessage(
                encodeMessage(types.ServerMessage, 'serverhello', {
                    numComponents: 23,
                    componentFeerate: 1000n,
                    minExcessFee: 100n,
                    maxExcessFee: 300000n,
                    atomTiers: [1000n],
                    minPlayers: 8,
                }),
            );
            const reply = decodeMessage(
                types.ServerMessage,
                await client.recvMessage(2000),
            );
            expect(reply.field).to.equal('serverhello');
            expect(reply.payload.numComponents).to.equal(23);
            expect(reply.payload.atomTiers).to.deep.equal([1000n]);
        } finally {
            client?.close();
            await close();
        }
    });
});

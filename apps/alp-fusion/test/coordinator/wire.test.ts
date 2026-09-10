// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import {
    DEFAULT_DUST_SATS,
    DEFAULT_FEE_SATS_PER_KB,
    Ecc,
    parseAlp,
    parseEmppScript,
    Script,
    SEND_STR,
    shaRmd160,
    Tx,
} from 'ecash-lib';

import { finalizeBlindSigs } from 'ecash-lib';

import { runWireRound } from '../../src/client/wire.js';
import { FusionCoordinator } from '../../src/coordinator/wire.js';
import {
    asBytes,
    componentCommitment,
    componentsToContribution,
    contributionToComponents,
    type WireContribution,
    type WireFuelInput,
    type WireTokenInput,
} from '../../src/protocol/components.js';
import {
    buildPlayerCommit,
    readBlindSigScalars,
} from '../../src/protocol/commit.js';
import { PROTOCOL_VERSION } from '../../src/protocol/constants.js';
import {
    connect,
    listen,
    type FusionConnection,
} from '../../src/protocol/connection.js';
import { CovertSubmitter } from '../../src/protocol/covert.js';
import { tokenIdToBytes } from '../../src/protocol/hash.js';
import {
    decodeComponent,
    decodeMessage,
    encodeMessage,
    getTypes,
    initProto,
} from '../../src/protocol/messages.js';
import { estimateAlpSendFeeSats } from '../../src/tx/assemble.js';
import {
    assembleFromComponents,
    keysFromContribution,
    prevOutsFromContribution,
    signOwnedInputs,
} from '../../src/tx/sign.js';
import type { FusionTokenOutput } from '../../src/tx/types.js';

const TOKEN_ID =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const ecc = new Ecc();
const keysByTag = new Map<number, { sk: Buffer; pk: Buffer }>();

function keypair(tag: number): { sk: Buffer; pk: Buffer } {
    const hit = keysByTag.get(tag);
    if (hit) {
        return hit;
    }
    const sk = Buffer.alloc(32);
    sk.writeUInt32BE(tag + 1, 28);
    const created = { sk, pk: Buffer.from(ecc.derivePubkey(sk)) };
    keysByTag.set(tag, created);
    return created;
}

function dummyPubkey(tag: number): Buffer {
    return keypair(tag).pk;
}

function scriptFromPub(pk: Uint8Array): Script {
    return Script.p2pkh(shaRmd160(pk));
}

function tokenIn(outIdx: number, atoms: bigint, tag: number): WireTokenInput {
    const { sk, pk: pubkey } = keypair(tag);
    return {
        prevOut: { txid: '11'.repeat(32), outIdx },
        sats: DEFAULT_DUST_SATS,
        script: scriptFromPub(pubkey),
        tokenId: TOKEN_ID,
        atoms,
        pubkey,
        sk,
    };
}

function tokenOut(atoms: bigint, tag: number): FusionTokenOutput {
    return { script: scriptFromPub(dummyPubkey(tag)), atoms };
}

function pairPlayers(
    i: number,
    j: number,
): { a: WireContribution; b: WireContribution } {
    const inputsA = [tokenIn(i, 50n, 0xa0 + i)];
    const outsA = [tokenOut(50n, 0xb0 + i)];
    const inputsB = [tokenIn(j, 50n, 0xa0 + j)];
    const outsB = [tokenOut(50n, 0xb0 + j)];
    return {
        a: {
            tokenInputs: inputsA,
            tokenOutputs: outsA,
            fuelInputs: fundFuel(
                [...inputsA, ...inputsB],
                [...outsA, ...outsB],
                0xc0 + i,
                i,
            ),
        },
        b: {
            tokenInputs: inputsB,
            tokenOutputs: outsB,
        },
    };
}

function dustFuel(
    tag: number,
    outIdx: number,
    dust = DEFAULT_DUST_SATS,
): WireFuelInput[] {
    const { sk, pk: pubkey } = keypair(tag);
    return [
        {
            prevOut: { txid: '22'.repeat(32), outIdx },
            sats: dust,
            script: scriptFromPub(pubkey),
            atoms: 0n,
            pubkey,
            sk,
        },
    ];
}

function fundFuel(
    tokenInputs: WireTokenInput[],
    tokenOutputs: FusionTokenOutput[],
    tag = 0xcc,
    fuelOutIdx = 0,
    extraFuel: WireFuelInput[] = [],
): WireFuelInput[] {
    const { sk, pk: pubkey } = keypair(tag);
    const placeholder = {
        prevOut: { txid: '22'.repeat(32), outIdx: fuelOutIdx },
        sats: 1n,
        script: scriptFromPub(pubkey),
        atoms: 0n,
    };
    const shaped = {
        tokenId: TOKEN_ID,
        tokenInputs,
        tokenOutputs,
        fuelInputs: [placeholder, ...extraFuel],
        feePerKb: DEFAULT_FEE_SATS_PER_KB,
    };
    const { feeSats } = estimateAlpSendFeeSats(shaped);
    const outSats = BigInt(tokenOutputs.length) * DEFAULT_DUST_SATS;
    const inSats = BigInt(tokenInputs.length) * DEFAULT_DUST_SATS;
    const extraIn = extraFuel.reduce((sum, f) => sum + f.sats, 0n);
    return [
        {
            prevOut: { txid: '22'.repeat(32), outIdx: fuelOutIdx },
            sats: outSats + feeSats - inSats - extraIn,
            script: scriptFromPub(pubkey),
            atoms: 0n,
            pubkey,
            sk,
        },
    ];
}

describe('wire components', () => {
    before(async () => {
        await initProto();
    });

    it('roundtrips a contribution through Component blobs', () => {
        const tokenInputs = [tokenIn(0, 40n, 0xa1)];
        const tokenOutputs = [tokenOut(40n, 0xb1)];
        const fuelInputs = fundFuel(tokenInputs, tokenOutputs);
        const contrib: WireContribution = {
            tokenInputs,
            tokenOutputs,
            fuelInputs,
        };
        const blobs = contributionToComponents(contrib);
        expect(blobs).to.have.length(3);
        const back = componentsToContribution('p', TOKEN_ID, blobs);
        expect(back.tokenInputs).to.have.length(1);
        expect(back.tokenInputs[0].atoms).to.equal(40n);
        expect(back.tokenOutputs).to.have.length(1);
        expect(back.fuelInputs).to.have.length(1);
        expect(toHexish(componentCommitment(blobs[0]))).to.have.length(64);
    });

    it('rejects a pubkey that does not match the P2PKH script', () => {
        const inp = tokenIn(0, 10n, 0xa1);
        inp.pubkey = dummyPubkey(0xa2);
        expect(() =>
            contributionToComponents({
                tokenInputs: [inp],
                tokenOutputs: [tokenOut(10n, 0xb1)],
            }),
        ).to.throw(/P2PKH/);
    });
});

describe('FusionCoordinator wire round', function () {
    this.timeout(15_000);

    before(async () => {
        await initProto();
    });

    it('hello → join → covert reveal → signed ALP SEND', async () => {
        const broadcasts: string[] = [];
        const coord = new FusionCoordinator({
            minPlayers: 2,
            atomTiers: [100n],
            shuffleSeed: 42,
            recvTimeoutMs: 5_000,
            roundTimeoutMs: 8_000,
            chronik: {
                broadcastTx: async raw => {
                    const hex =
                        typeof raw === 'string'
                            ? raw
                            : Buffer.from(raw).toString('hex');
                    broadcasts.push(hex);
                    return { txid: Tx.deser(Buffer.from(hex, 'hex')).txid() };
                },
            },
        });
        await coord.start('127.0.0.1');
        try {
            const inputsA = [tokenIn(0, 40n, 0xa1)];
            const outsA = [tokenOut(40n, 0xb1)];
            const inputsB = [tokenIn(1, 60n, 0xa2)];
            const outsB = [tokenOut(25n, 0xb2), tokenOut(35n, 0xb3)];
            const fuelB = dustFuel(0xcd, 9);
            const fuel = fundFuel(
                [...inputsA, ...inputsB],
                [...outsA, ...outsB],
                0xcc,
                0,
                fuelB,
            );

            const [a, b] = await Promise.all([
                runWireRound({
                    host: '127.0.0.1',
                    port: coord.controlPort,
                    tokenId: TOKEN_ID,
                    atomTier: 100n,
                    contribution: {
                        tokenInputs: inputsA,
                        tokenOutputs: outsA,
                        fuelInputs: fuel,
                    },
                    recvTimeoutMs: 5_000,
                    covertTimeoutMs: 5_000,
                }),
                runWireRound({
                    host: '127.0.0.1',
                    port: coord.controlPort,
                    tokenId: TOKEN_ID,
                    atomTier: 100n,
                    contribution: {
                        tokenInputs: inputsB,
                        tokenOutputs: outsB,
                        fuelInputs: fuelB,
                    },
                    recvTimeoutMs: 5_000,
                    covertTimeoutMs: 5_000,
                }),
            ]);

            expect(a.txid).to.equal(b.txid);
            expect(broadcasts).to.have.length(1);
            expect(a.txid).to.equal(
                Tx.deser(Buffer.from(broadcasts[0], 'hex')).txid(),
            );
            const tx = Tx.deser(a.rawTx);
            expect(
                tx.inputs.every(inp => (inp.script?.bytecode.length ?? 0) > 0),
            ).to.equal(true);
            expect(tx.outputs.length).to.equal(4);
            const pushes = parseEmppScript(tx.outputs[0].script);
            const alp = parseAlp(pushes![0]);
            expect(alp?.txType).to.equal(SEND_STR);
            if (alp?.txType !== SEND_STR) {
                throw new Error('expected SEND');
            }
            expect(alp.sendAtomsArray.reduce((n, x) => n + x, 0n)).to.equal(
                100n,
            );
            expect(
                [...alp.sendAtomsArray].sort((x, y) => Number(x - y)),
            ).to.deep.equal([25n, 35n, 40n]);
        } finally {
            await coord.close();
        }
    });

    it('rejects a mismatched ClientHello version', async () => {
        const coord = new FusionCoordinator({
            minPlayers: 2,
            recvTimeoutMs: 3_000,
        });
        await coord.start('127.0.0.1');
        const types = await getTypes();
        const client = await connect('127.0.0.1', coord.controlPort);
        try {
            await client.sendMessage(
                encodeMessage(types.ClientMessage, 'clienthello', {
                    version: Buffer.from('nope!!'),
                }),
            );
            const reply = decodeMessage(
                types.ServerMessage,
                await client.recvMessage(3_000),
            );
            expect(reply.field).to.equal('error');
            expect(String(reply.payload.message)).to.match(/version/i);
        } finally {
            client.close();
            await coord.close();
        }
    });

    it('rejects a burned contribution before PlayerCommit', async () => {
        const coord = new FusionCoordinator({
            minPlayers: 2,
            atomTiers: [1n],
            recvTimeoutMs: 5_000,
            roundTimeoutMs: 8_000,
        });
        await coord.start('127.0.0.1');
        try {
            const fuelPubkey = dummyPubkey(0xcc);
            const placeholderFuel: WireFuelInput[] = [
                {
                    prevOut: { txid: '22'.repeat(32), outIdx: 0 },
                    sats: 10_000n,
                    script: scriptFromPub(fuelPubkey),
                    atoms: 0n,
                    pubkey: fuelPubkey,
                },
            ];
            const run = (outIdx: number, tag: number) =>
                runWireRound({
                    host: '127.0.0.1',
                    port: coord.controlPort,
                    tokenId: TOKEN_ID,
                    atomTier: 1n,
                    contribution: {
                        tokenInputs: [tokenIn(outIdx, 50n, tag)],
                        tokenOutputs: [tokenOut(40n, tag + 0x10)],
                        fuelInputs: outIdx === 0 ? placeholderFuel : undefined,
                    },
                    recvTimeoutMs: 5_000,
                    covertTimeoutMs: 5_000,
                });
            const results = await Promise.allSettled([
                run(0, 0xa1),
                run(1, 0xa2),
            ]);
            expect(results.every(r => r.status === 'rejected')).to.equal(true);
            const msg = (results[0] as PromiseRejectedResult).reason as Error;
            expect(msg.message).to.match(/not conserved|atom burn|Pedersen/i);
        } finally {
            await coord.close();
        }
    });

    it('sends PoolStatusUpdate before FusionBegin', async () => {
        const coord = new FusionCoordinator({
            minPlayers: 2,
            atomTiers: [100n],
            recvTimeoutMs: 5_000,
        });
        await coord.start('127.0.0.1');
        const types = await getTypes();
        const client = await connect('127.0.0.1', coord.controlPort);
        try {
            await client.sendMessage(
                encodeMessage(types.ClientMessage, 'clienthello', {
                    version: PROTOCOL_VERSION,
                }),
            );
            const hello = decodeMessage(
                types.ServerMessage,
                await client.recvMessage(3_000),
            );
            expect(hello.field).to.equal('serverhello');
            expect(hello.payload.minPlayers).to.equal(2);

            await client.sendMessage(
                encodeMessage(types.ClientMessage, 'joinpools', {
                    pools: [
                        {
                            tokenId: Buffer.from(tokenIdToBytes(TOKEN_ID)),
                            atomTier: 100n,
                        },
                    ],
                    tags: [],
                }),
            );
            const status = decodeMessage(
                types.ServerMessage,
                await client.recvMessage(3_000),
            );
            expect(status.field).to.equal('poolstatusupdate');
            const statuses = status.payload.statuses as Record<
                string,
                unknown
            >[];
            expect(statuses).to.have.length(1);
            const entry = statuses[0] as {
                status: { players: number; minPlayers: number };
            };
            expect(entry.status.players).to.equal(1);
            expect(entry.status.minPlayers).to.equal(2);
        } finally {
            client.close();
            await coord.close();
        }
    });

    it('unregisters a disconnected waiter so a later join is not a ghost ready pool', async () => {
        const coord = new FusionCoordinator({
            minPlayers: 2,
            atomTiers: [100n],
            recvTimeoutMs: 3_000,
        });
        await coord.start('127.0.0.1');
        const types = await getTypes();
        const ghost = await connect('127.0.0.1', coord.controlPort);
        try {
            await ghost.sendMessage(
                encodeMessage(types.ClientMessage, 'clienthello', {
                    version: PROTOCOL_VERSION,
                }),
            );
            expect(
                decodeMessage(
                    types.ServerMessage,
                    await ghost.recvMessage(3_000),
                ).field,
            ).to.equal('serverhello');
            await ghost.sendMessage(
                encodeMessage(types.ClientMessage, 'joinpools', {
                    pools: [
                        {
                            tokenId: Buffer.from(tokenIdToBytes(TOKEN_ID)),
                            atomTier: 100n,
                        },
                    ],
                    tags: [],
                }),
            );
            expect(
                decodeMessage(
                    types.ServerMessage,
                    await ghost.recvMessage(3_000),
                ).field,
            ).to.equal('poolstatusupdate');
            expect(coord.matcher.size(TOKEN_ID, 100n)).to.equal(1);

            ghost.close();
            await ghost.whenClosed();
            const deadline = Date.now() + 2_000;
            while (
                coord.matcher.size(TOKEN_ID, 100n) > 0 &&
                Date.now() < deadline
            ) {
                await new Promise(r => setTimeout(r, 20));
            }
            expect(coord.matcher.size(TOKEN_ID, 100n)).to.equal(0);
            expect(coord.matcher.isReady(TOKEN_ID, 100n)).to.equal(false);

            const live = await connect('127.0.0.1', coord.controlPort);
            try {
                await live.sendMessage(
                    encodeMessage(types.ClientMessage, 'clienthello', {
                        version: PROTOCOL_VERSION,
                    }),
                );
                expect(
                    decodeMessage(
                        types.ServerMessage,
                        await live.recvMessage(3_000),
                    ).field,
                ).to.equal('serverhello');
                await live.sendMessage(
                    encodeMessage(types.ClientMessage, 'joinpools', {
                        pools: [
                            {
                                tokenId: Buffer.from(tokenIdToBytes(TOKEN_ID)),
                                atomTier: 100n,
                            },
                        ],
                        tags: [],
                    }),
                );
                const status = decodeMessage(
                    types.ServerMessage,
                    await live.recvMessage(3_000),
                );
                expect(status.field).to.equal('poolstatusupdate');
                const statuses = status.payload.statuses as {
                    status: { players: number };
                }[];
                expect(statuses[0].status.players).to.equal(1);
                expect(coord.matcher.isReady(TOKEN_ID, 100n)).to.equal(false);
            } finally {
                live.close();
            }
        } finally {
            ghost.close();
            await coord.close();
        }
    });

    it('rejects covert components before a round starts', async () => {
        const coord = new FusionCoordinator({
            minPlayers: 2,
            maxEarlyCovert: 2,
            recvTimeoutMs: 3_000,
        });
        await coord.start('127.0.0.1');
        const types = await getTypes();
        const replies: string[] = [];
        try {
            for (let i = 1; i <= 3; i++) {
                const covert = await connect('127.0.0.1', coord.covertPort);
                try {
                    await covert.sendMessage(
                        encodeMessage(types.CovertMessage, 'component', {
                            signature: Buffer.alloc(64, i),
                            component: Buffer.alloc(32, i),
                        }),
                    );
                    replies.push(
                        decodeMessage(
                            types.CovertResponse,
                            await covert.recvMessage(2_000),
                        ).field,
                    );
                } finally {
                    covert.close();
                }
            }
            expect(replies).to.deep.equal(['error', 'error', 'error']);
        } finally {
            await coord.close();
        }
    });

    it('a late joiner does not abort an in-flight two-player round', async () => {
        const coord = new FusionCoordinator({
            minPlayers: 2,
            atomTiers: [100n],
            shuffleSeed: 42,
            recvTimeoutMs: 5_000,
            roundTimeoutMs: 8_000,
        });
        await coord.start('127.0.0.1');
        try {
            const inputsA = [tokenIn(0, 40n, 0xa1)];
            const outsA = [tokenOut(40n, 0xb1)];
            const inputsB = [tokenIn(1, 60n, 0xa2)];
            const outsB = [tokenOut(25n, 0xb2), tokenOut(35n, 0xb3)];
            const fuelB = dustFuel(0xcd, 9);
            const fuel = fundFuel(
                [...inputsA, ...inputsB],
                [...outsA, ...outsB],
                0xcc,
                0,
                fuelB,
            );
            const runA = runWireRound({
                host: '127.0.0.1',
                port: coord.controlPort,
                tokenId: TOKEN_ID,
                atomTier: 100n,
                contribution: {
                    tokenInputs: inputsA,
                    tokenOutputs: outsA,
                    fuelInputs: fuel,
                },
                recvTimeoutMs: 5_000,
                covertTimeoutMs: 5_000,
            });
            const waitUntil = async (
                pred: () => boolean,
                label: string,
            ): Promise<void> => {
                const deadline = Date.now() + 5_000;
                while (!pred() && Date.now() < deadline) {
                    await new Promise(r => setTimeout(r, 10));
                }
                expect(pred(), label).to.equal(true);
            };
            await waitUntil(
                () => coord.matcher.size(TOKEN_ID, 100n) === 1,
                'first player should be waiting',
            );
            const runB = runWireRound({
                host: '127.0.0.1',
                port: coord.controlPort,
                tokenId: TOKEN_ID,
                atomTier: 100n,
                contribution: {
                    tokenInputs: inputsB,
                    tokenOutputs: outsB,
                    fuelInputs: fuelB,
                },
                recvTimeoutMs: 5_000,
                covertTimeoutMs: 5_000,
            });
            await waitUntil(
                () => coord.matcher.size(TOKEN_ID, 100n) === 0,
                'pool should be taken into the round',
            );

            const types = await getTypes();
            const late = await connect('127.0.0.1', coord.controlPort);
            try {
                await late.sendMessage(
                    encodeMessage(types.ClientMessage, 'clienthello', {
                        version: PROTOCOL_VERSION,
                    }),
                );
                expect(
                    decodeMessage(
                        types.ServerMessage,
                        await late.recvMessage(3_000),
                    ).field,
                ).to.equal('serverhello');
                await late.sendMessage(
                    encodeMessage(types.ClientMessage, 'joinpools', {
                        pools: [
                            {
                                tokenId: Buffer.from(tokenIdToBytes(TOKEN_ID)),
                                atomTier: 100n,
                            },
                        ],
                        tags: [],
                    }),
                );
                expect(
                    decodeMessage(
                        types.ServerMessage,
                        await late.recvMessage(3_000),
                    ).field,
                ).to.equal('poolstatusupdate');
                const [a, b] = await Promise.all([runA, runB]);
                expect(a.txid).to.equal(b.txid);
            } finally {
                late.close();
            }
        } finally {
            await coord.close();
        }
    });

    it('starts a second round from leftover waiters after the first settles', async () => {
        const coord = new FusionCoordinator({
            minPlayers: 2,
            atomTiers: [100n],
            recvTimeoutMs: 5_000,
            roundTimeoutMs: 8_000,
        });
        await coord.start('127.0.0.1');
        const waitSize = async (n: number, label: string): Promise<void> => {
            const deadline = Date.now() + 5_000;
            while (
                coord.matcher.size(TOKEN_ID, 100n) !== n &&
                Date.now() < deadline
            ) {
                await new Promise(r => setTimeout(r, 10));
            }
            expect(coord.matcher.size(TOKEN_ID, 100n), label).to.equal(n);
        };
        try {
            const first = pairPlayers(0, 1);
            const second = pairPlayers(2, 3);
            const runA = joinRound(coord, first.a);
            await waitSize(1, 'first waiter');
            const runB = joinRound(coord, first.b);
            await waitSize(0, 'first pair taken');
            const runC = joinRound(coord, second.a);
            const runD = joinRound(coord, second.b);
            const results = await Promise.all([runA, runB, runC, runD]);
            expect(results.every(r => r.rawTx.length > 0)).to.equal(true);
            expect(new Set(results.map(r => r.txid)).size).to.equal(2);
        } finally {
            await coord.close();
        }
    });

    it('drops a taken player from their other JoinPools keys', async () => {
        const coord = new FusionCoordinator({
            minPlayers: 2,
            atomTiers: [100n, 200n],
            recvTimeoutMs: 5_000,
            roundTimeoutMs: 8_000,
        });
        await coord.start('127.0.0.1');
        const waitSize = async (
            tier: bigint,
            n: number,
            label: string,
        ): Promise<void> => {
            const deadline = Date.now() + 5_000;
            while (
                coord.matcher.size(TOKEN_ID, tier) !== n &&
                Date.now() < deadline
            ) {
                await new Promise(r => setTimeout(r, 10));
            }
            expect(coord.matcher.size(TOKEN_ID, tier), label).to.equal(n);
        };
        try {
            const first = pairPlayers(0, 1);
            const second = pairPlayers(2, 3);
            const runA = runWireRound({
                host: '127.0.0.1',
                port: coord.controlPort,
                tokenId: TOKEN_ID,
                atomTier: 100n,
                contribution: first.a,
                pools: [
                    { tokenId: TOKEN_ID, atomTier: 100n },
                    { tokenId: TOKEN_ID, atomTier: 200n },
                ],
                recvTimeoutMs: 5_000,
                covertTimeoutMs: 5_000,
            });
            await waitSize(100n, 1, 'A waiting on 100');
            expect(coord.matcher.size(TOKEN_ID, 200n)).to.equal(1);
            const runB = joinRound(coord, first.b);
            await waitSize(100n, 0, '100 taken');
            await waitSize(200n, 0, 'A dropped from 200');
            const runC = runWireRound({
                host: '127.0.0.1',
                port: coord.controlPort,
                tokenId: TOKEN_ID,
                atomTier: 200n,
                contribution: second.a,
                recvTimeoutMs: 5_000,
                covertTimeoutMs: 5_000,
            });
            const runD = runWireRound({
                host: '127.0.0.1',
                port: coord.controlPort,
                tokenId: TOKEN_ID,
                atomTier: 200n,
                contribution: second.b,
                recvTimeoutMs: 5_000,
                covertTimeoutMs: 5_000,
            });
            const results = await Promise.all([runA, runB, runC, runD]);
            expect(new Set(results.map(r => r.txid)).size).to.equal(2);
        } finally {
            await coord.close();
        }
    });

    it('a bad covert peer does not reject the covert listener', async () => {
        const coord = new FusionCoordinator({
            minPlayers: 2,
            atomTiers: [100n],
            recvTimeoutMs: 5_000,
            roundTimeoutMs: 8_000,
        });
        await coord.start('127.0.0.1');
        const rejections: unknown[] = [];
        const onRej = (reason: unknown) => {
            rejections.push(reason);
        };
        process.on('unhandledRejection', onRej);
        try {
            const junk = await connect('127.0.0.1', coord.covertPort);
            try {
                await junk.sendMessage(Buffer.from('not-a-covert-message'));
                await junk.whenClosed();
            } finally {
                junk.close();
            }
            const pair = pairPlayers(12, 13);
            const [a, b] = await Promise.all([
                joinRound(coord, pair.a),
                joinRound(coord, pair.b),
            ]);
            expect(a.txid).to.equal(b.txid);
            expect(rejections).to.deep.equal([]);
        } finally {
            process.off('unhandledRejection', onRej);
            await coord.close();
        }
    });

    it('a mute waiter cannot stall tryStartReady for another pool', async () => {
        const coord = new FusionCoordinator({
            minPlayers: 2,
            atomTiers: [100n, 200n],
            recvTimeoutMs: 5_000,
            roundTimeoutMs: 8_000,
        });
        await coord.start('127.0.0.1');
        const types = await getTypes();
        const mute = await connect('127.0.0.1', coord.controlPort);
        try {
            await mute.sendMessage(
                encodeMessage(types.ClientMessage, 'clienthello', {
                    version: PROTOCOL_VERSION,
                }),
            );
            expect(
                decodeMessage(
                    types.ServerMessage,
                    await mute.recvMessage(2_000),
                ).field,
            ).to.equal('serverhello');
            await mute.sendMessage(
                encodeMessage(types.ClientMessage, 'joinpools', {
                    pools: [
                        {
                            tokenId: Buffer.from(tokenIdToBytes(TOKEN_ID)),
                            atomTier: 100n,
                        },
                    ],
                    tags: [],
                }),
            );
            expect(
                decodeMessage(
                    types.ServerMessage,
                    await mute.recvMessage(2_000),
                ).field,
            ).to.equal('poolstatusupdate');
            mute.socket.pause();

            const live = pairPlayers(14, 15);
            const [a, b] = await Promise.all([
                runWireRound({
                    host: '127.0.0.1',
                    port: coord.controlPort,
                    tokenId: TOKEN_ID,
                    atomTier: 200n,
                    contribution: live.a,
                    recvTimeoutMs: 5_000,
                    covertTimeoutMs: 5_000,
                }),
                runWireRound({
                    host: '127.0.0.1',
                    port: coord.controlPort,
                    tokenId: TOKEN_ID,
                    atomTier: 200n,
                    contribution: live.b,
                    recvTimeoutMs: 5_000,
                    covertTimeoutMs: 5_000,
                }),
            ]);
            expect(a.txid).to.equal(b.txid);
        } finally {
            mute.close();
            await coord.close();
        }
    });

    it('a mute peer cannot stall FusionBegin for later rounds', async () => {
        const coord = new FusionCoordinator({
            minPlayers: 2,
            atomTiers: [100n],
            recvTimeoutMs: 2_000,
            roundTimeoutMs: 400,
        });
        await coord.start('127.0.0.1');
        const types = await getTypes();
        const mute = await connect('127.0.0.1', coord.controlPort);
        try {
            await mute.sendMessage(
                encodeMessage(types.ClientMessage, 'clienthello', {
                    version: PROTOCOL_VERSION,
                }),
            );
            expect(
                decodeMessage(
                    types.ServerMessage,
                    await mute.recvMessage(2_000),
                ).field,
            ).to.equal('serverhello');
            await mute.sendMessage(
                encodeMessage(types.ClientMessage, 'joinpools', {
                    pools: [
                        {
                            tokenId: Buffer.from(tokenIdToBytes(TOKEN_ID)),
                            atomTier: 100n,
                        },
                    ],
                    tags: [],
                }),
            );
            expect(
                decodeMessage(
                    types.ServerMessage,
                    await mute.recvMessage(2_000),
                ).field,
            ).to.equal('poolstatusupdate');

            const live = pairPlayers(8, 9);
            const stalledErr = await joinRound(coord, live.a, {
                recvTimeoutMs: 2_000,
                covertTimeoutMs: 2_000,
            }).then(
                () => undefined,
                (err: Error) => err,
            );
            expect(stalledErr).to.be.instanceOf(Error);

            const next = pairPlayers(10, 11);
            const [a, b] = await Promise.all([
                joinRound(coord, next.a),
                joinRound(coord, next.b),
            ]);
            expect(a.txid).to.equal(b.txid);
        } finally {
            mute.close();
            await coord.close();
        }
    });

    it('rejects FusionBegin for a pool the client did not join', async () => {
        const types = await getTypes();
        const { port, close } = await listen('127.0.0.1', 0, conn => {
            void (async () => {
                await conn.recvMessage(3_000);
                await conn.sendMessage(
                    encodeMessage(types.ServerMessage, 'serverhello', {
                        numComponents: 3,
                        componentFeerate: DEFAULT_FEE_SATS_PER_KB,
                        minExcessFee: 0n,
                        maxExcessFee: 300_000n,
                        atomTiers: [100n],
                        minPlayers: 2,
                    }),
                );
                await conn.recvMessage(3_000);
                await conn.sendMessage(
                    encodeMessage(types.ServerMessage, 'fusionbegin', {
                        tokenId: Buffer.from(tokenIdToBytes(TOKEN_ID)),
                        atomTier: 999n,
                        covertDomain: Buffer.from('127.0.0.1'),
                        covertPort: 1,
                        covertSsl: false,
                        serverTime: 0n,
                    }),
                );
            })().catch(() => {
                conn.close();
            });
        });
        try {
            await runWireRound({
                host: '127.0.0.1',
                port,
                tokenId: TOKEN_ID,
                atomTier: 100n,
                contribution: pairPlayers(30, 31).a,
                recvTimeoutMs: 3_000,
            });
            expect.fail('expected FusionBegin pool mismatch');
        } catch (err) {
            expect((err as Error).message).to.match(
                /FusionBegin pool mismatch/,
            );
        } finally {
            await close();
        }
    });

    it('a mute peer after commit cannot pin the result send', async () => {
        const coord = new FusionCoordinator({
            minPlayers: 2,
            atomTiers: [100n],
            recvTimeoutMs: 2_000,
            roundTimeoutMs: 400,
        });
        await coord.start('127.0.0.1');
        const pair = pairPlayers(20, 21);
        let mute: FusionConnection | undefined;
        try {
            const muteP = commitThenPause(coord, pair.a);
            const liveP = joinRound(coord, pair.b, {
                recvTimeoutMs: 3_000,
                covertTimeoutMs: 2_000,
            });
            mute = await muteP;
            const live = await liveP;
            expect(live.rawTx.length).to.be.greaterThan(0);
            const deadline = Date.now() + 2_000;
            while (coord.sessionCount > 0 && Date.now() < deadline) {
                await new Promise(r => setTimeout(r, 20));
            }
            expect(coord.sessionCount).to.equal(0);

            const next = pairPlayers(22, 23);
            const [a, b] = await Promise.all([
                joinRound(coord, next.a),
                joinRound(coord, next.b),
            ]);
            expect(a.txid).to.equal(b.txid);
        } finally {
            mute?.close();
            await coord.close();
        }
    });

    it('a disconnect after assemble fails signing so the next round can start', async () => {
        const coord = new FusionCoordinator({
            minPlayers: 2,
            atomTiers: [100n],
            recvTimeoutMs: 3_000,
            // Long enough that a missing failSign would stall this test.
            roundTimeoutMs: 8_000,
        });
        await coord.start('127.0.0.1');
        const pair = pairPlayers(24, 25);
        try {
            const dropP = shareThenClose(coord, pair.a);
            const liveP = joinRound(coord, pair.b, {
                recvTimeoutMs: 3_000,
                covertTimeoutMs: 2_000,
            });
            await dropP;
            let threw: Error | undefined;
            try {
                await liveP;
            } catch (err) {
                threw = err as Error;
            }
            expect(threw).to.not.equal(undefined);

            const next = pairPlayers(26, 27);
            const [a, b] = await Promise.all([
                joinRound(coord, next.a),
                joinRound(coord, next.b),
            ]);
            expect(a.txid).to.equal(b.txid);
        } finally {
            await coord.close();
        }
    });
});

function joinRound(
    coord: FusionCoordinator,
    contribution: WireContribution,
    timeouts: { recvTimeoutMs?: number; covertTimeoutMs?: number } = {},
) {
    return runWireRound({
        host: '127.0.0.1',
        port: coord.controlPort,
        tokenId: TOKEN_ID,
        atomTier: 100n,
        contribution,
        recvTimeoutMs: timeouts.recvTimeoutMs ?? 5_000,
        covertTimeoutMs: timeouts.covertTimeoutMs ?? 5_000,
    });
}

async function recvSkipStatus(
    conn: FusionConnection,
    types: Awaited<ReturnType<typeof getTypes>>,
    timeoutMs: number,
): Promise<{ field: string; payload: Record<string, unknown> }> {
    let msg = decodeMessage(
        types.ServerMessage,
        await conn.recvMessage(timeoutMs),
    );
    while (msg.field === 'poolstatusupdate') {
        msg = decodeMessage(
            types.ServerMessage,
            await conn.recvMessage(timeoutMs),
        );
    }
    return msg;
}

/**
 * Hello / join / commit / covert component reveal through ShareCovertComponents.
 */
async function throughShare(
    coord: FusionCoordinator,
    contribution: WireContribution,
): Promise<{
    conn: FusionConnection;
    covert: CovertSubmitter;
    components: Buffer[];
    feerate: bigint;
    shared: Uint8Array[];
    roundPubkey: Buffer;
}> {
    const types = await getTypes();
    const conn = await connect('127.0.0.1', coord.controlPort);
    await conn.sendMessage(
        encodeMessage(types.ClientMessage, 'clienthello', {
            version: PROTOCOL_VERSION,
        }),
    );
    const hello = await recvSkipStatus(conn, types, 3_000);
    if (hello.field !== 'serverhello') {
        throw new Error(`expected serverhello, got ${hello.field}`);
    }
    await conn.sendMessage(
        encodeMessage(types.ClientMessage, 'joinpools', {
            pools: [
                {
                    tokenId: Buffer.from(tokenIdToBytes(TOKEN_ID)),
                    atomTier: 100n,
                },
            ],
            tags: [],
        }),
    );
    const begin = await recvSkipStatus(conn, types, 3_000);
    if (begin.field !== 'fusionbegin') {
        throw new Error(`expected fusionbegin, got ${begin.field}`);
    }
    const start = await recvSkipStatus(conn, types, 3_000);
    if (start.field !== 'startround') {
        throw new Error(`expected startround, got ${start.field}`);
    }
    const roundPubkey = Buffer.from(start.payload.roundPubkey as Uint8Array);
    const nonceRaw = start.payload.blindNoncePoints;
    const noncePoints = Array.isArray(nonceRaw)
        ? nonceRaw.map(p => Buffer.from(p as Uint8Array))
        : [];
    const components = contributionToComponents(contribution);
    const feerate =
        typeof hello.payload.componentFeerate === 'bigint'
            ? hello.payload.componentFeerate
            : DEFAULT_FEE_SATS_PER_KB;
    const built = buildPlayerCommit(
        components,
        roundPubkey,
        noncePoints,
        feerate,
    );
    await conn.sendMessage(
        encodeMessage(types.ClientMessage, 'playercommit', {
            initialCommitments: built.initialCommitments,
            excessFee: built.excessFee,
            satsPedersenTotalNonce: Buffer.from(built.satsPedersenTotalNonce),
            tokenPedersenTotalNonce: Buffer.from(built.tokenPedersenTotalNonce),
            randomNumberCommitment: Buffer.from(built.randomNumberCommitment),
            blindSigRequests: built.blindSigRequests.map(e => Buffer.from(e)),
        }),
    );
    const blinds = await recvSkipStatus(conn, types, 3_000);
    if (blinds.field !== 'blindsigresponses') {
        throw new Error(`expected blindsigresponses, got ${blinds.field}`);
    }
    const sigs = finalizeBlindSigs(
        built.requests,
        readBlindSigScalars(blinds.payload.scalars, built.requests.length),
    );
    const covertPort = begin.payload.covertPort;
    if (typeof covertPort !== 'number') {
        throw new Error('FusionBegin.covertPort: expected number');
    }
    const covert = new CovertSubmitter({
        destHost: '127.0.0.1',
        destPort: covertPort,
        ssl: false,
        numSlots: components.length,
        randSpanMs: 0,
        submitTimeoutMs: 2_000,
        connectTimeoutMs: 2_000,
    });
    covert.scheduleConnections(Date.now(), 0, 0);
    await covert.waitUntilConnected(2_000);
    covert.scheduleSubmissions(
        Date.now(),
        components.map((component, i) => ({
            field: 'component' as const,
            payload: {
                roundPubkey,
                signature: Buffer.from(sigs[i]),
                component,
            },
        })),
    );
    await covert.waitUntilDone(2_000);
    const share = await recvSkipStatus(conn, types, 3_000);
    if (share.field !== 'sharecovertcomponents') {
        throw new Error(`expected sharecovertcomponents, got ${share.field}`);
    }
    const shared = Array.isArray(share.payload.components)
        ? share.payload.components.map(c => Buffer.from(c as Uint8Array))
        : [];
    return { conn, covert, components, feerate, shared, roundPubkey };
}

/**
 * Hello / join / commit / covert reveal, then pause so FusionResult cannot
 * be read. Used to prove the coordinator bounds the terminal send.
 */
async function commitThenPause(
    coord: FusionCoordinator,
    contribution: WireContribution,
): Promise<FusionConnection> {
    const { conn, covert, components, feerate, shared, roundPubkey } =
        await throughShare(coord, contribution);
    try {
        const { assembled } = assembleFromComponents(TOKEN_ID, shared, feerate);
        const owned = signOwnedInputs(
            assembled.tx,
            keysFromContribution(contribution),
            prevOutsFromContribution(contribution),
        );
        const byInput = new Map(owned.map(s => [s.whichInput, s.signature]));
        covert.scheduleSubmissions(
            Date.now(),
            components.map(component => {
                const dec = decodeComponent(component);
                if (!dec.input) {
                    return null;
                }
                const input = dec.input as Record<string, unknown>;
                const prevTxid = asBytes(
                    input.prevTxid,
                    'input.prevTxid',
                ).toString('hex');
                const prevIndex = input.prevIndex;
                if (typeof prevIndex !== 'number') {
                    return null;
                }
                const which = assembled.tx.inputs.findIndex(inp => {
                    const txid =
                        typeof inp.prevOut.txid === 'string'
                            ? inp.prevOut.txid.toLowerCase()
                            : Buffer.from(inp.prevOut.txid).toString('hex');
                    return (
                        txid === prevTxid && inp.prevOut.outIdx === prevIndex
                    );
                });
                const signature = byInput.get(which);
                if (which < 0 || signature === undefined) {
                    return null;
                }
                return {
                    field: 'signature' as const,
                    payload: {
                        roundPubkey,
                        whichInput: which,
                        txsignature: Buffer.from(signature),
                    },
                };
            }),
        );
        await covert.waitUntilDone(2_000);
    } finally {
        covert.setStopTime(Date.now());
        covert.stop();
        await covert.waitUntilStopped().catch(() => undefined);
    }
    conn.socket.pause();
    return conn;
}

/**
 * Reveal components, then drop the control socket so the coordinator
 * must failSign after assemble (not wait out the sign timeout).
 */
async function shareThenClose(
    coord: FusionCoordinator,
    contribution: WireContribution,
): Promise<void> {
    const { conn, covert } = await throughShare(coord, contribution);
    covert.setStopTime(Date.now());
    covert.stop();
    await covert.waitUntilStopped().catch(() => undefined);
    conn.close();
}

function toHexish(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString('hex');
}

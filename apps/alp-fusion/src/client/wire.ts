// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * One-shot networked client: control-channel hello / join / commit, covert
 * component reveal, then unsigned {@link FusionResult}.
 *
 * Chronik, signing, and blind-auth are out of scope — inject real coins via
 * {@link WireContribution}.
 */
import { randomBytes } from 'node:crypto';

import { sha256 } from 'ecash-lib';

import {
    componentCommitment,
    contributionToComponents,
    DUMMY_POINT,
    type WireContribution,
} from '../protocol/components.js';
import { PROTOCOL_VERSION } from '../protocol/constants.js';
import {
    connect,
    type ConnectOptions,
    type FusionConnection,
} from '../protocol/connection.js';
import { CovertSubmitter } from '../protocol/covert.js';
import { tokenIdFromBytes, tokenIdToBytes } from '../protocol/hash.js';
import {
    decodeMessage,
    encodeInitialCommitment,
    encodeMessage,
    getTypes,
    initProto,
} from '../protocol/messages.js';

type ProtoTypes = Awaited<ReturnType<typeof getTypes>>;

export interface RunWireRoundOptions {
    host: string;
    port: number;
    tokenId: string;
    atomTier: bigint;
    contribution: WireContribution;
    connect?: ConnectOptions;
    recvTimeoutMs?: number;
    /**
     * Extra `(tokenId, atomTier)` keys to advertise on JoinPools. The
     * coordinator still runs one round; unused keys are dropped when the
     * session is taken. Defaults to `[{ tokenId, atomTier }]`.
     */
    pools?: { tokenId: string; atomTier: bigint }[];
    covertRandSpanMs?: number;
    covertTimeoutMs?: number;
}

export interface WireRoundResult {
    rawTx: Uint8Array;
    txid?: string;
    components: Uint8Array[];
}

/**
 * Join one `(tokenId, atomTier)` pool, run a single wire round, return the
 * unsigned fused tx. Throws on protocol error or `FusionResult.ok === false`.
 */
export async function runWireRound(
    opts: RunWireRoundOptions,
): Promise<WireRoundResult> {
    await initProto();
    const types = await getTypes();
    const recvMs = opts.recvTimeoutMs ?? 15_000;
    const conn = await connect(opts.host, opts.port, opts.connect);
    const covertSlots: CovertSubmitter[] = [];
    try {
        await sendClient(conn, types, 'clienthello', {
            version: PROTOCOL_VERSION,
        });
        const hello = await recvServerSkipStatus(conn, types, recvMs);
        if (hello.field === 'error') {
            throw new Error(errorMessage(hello.payload));
        }
        if (hello.field !== 'serverhello') {
            throw new Error(`expected serverhello, got ${hello.field}`);
        }

        const joinKeys = opts.pools ?? [
            { tokenId: opts.tokenId, atomTier: opts.atomTier },
        ];
        await sendClient(conn, types, 'joinpools', {
            pools: joinKeys.map(pool => ({
                tokenId: Buffer.from(tokenIdToBytes(pool.tokenId)),
                atomTier: pool.atomTier,
            })),
            tags: [],
        });

        const begin = await recvServerSkipStatus(conn, types, recvMs);
        if (begin.field === 'error') {
            throw new Error(errorMessage(begin.payload));
        }
        if (begin.field !== 'fusionbegin') {
            throw new Error(`expected fusionbegin, got ${begin.field}`);
        }
        const beginToken = tokenIdFromBytes(
            Buffer.from(begin.payload.tokenId as Uint8Array),
        );
        if (typeof begin.payload.atomTier !== 'bigint') {
            throw new Error('FusionBegin.atomTier: expected bigint');
        }
        const joinedPool = joinKeys.some(
            pool =>
                pool.tokenId.toLowerCase() === beginToken &&
                pool.atomTier === begin.payload.atomTier,
        );
        if (!joinedPool) {
            throw new Error('FusionBegin pool mismatch');
        }
        const covertDomain = Buffer.from(
            begin.payload.covertDomain as Uint8Array,
        ).toString('ascii');
        const covertPort = begin.payload.covertPort;
        if (typeof covertPort !== 'number') {
            throw new Error('FusionBegin.covertPort: expected number');
        }

        const start = await recvServerSkipStatus(conn, types, recvMs);
        if (start.field === 'error') {
            throw new Error(errorMessage(start.payload));
        }
        if (start.field !== 'startround') {
            throw new Error(`expected startround, got ${start.field}`);
        }
        const roundPubkey = Buffer.from(
            (start.payload.roundPubkey as Uint8Array) ?? Buffer.alloc(0),
        );

        const components = contributionToComponents(opts.contribution);
        const commKey = randomBytes(33);
        commKey[0] = 0x02;
        await sendClient(conn, types, 'playercommit', {
            initialCommitments: components.map(c =>
                encodeInitialCommitment({
                    saltedComponentHash: Buffer.from(componentCommitment(c)),
                    satsCommitment: DUMMY_POINT,
                    tokenCommitment: DUMMY_POINT,
                    communicationKey: commKey,
                }),
            ),
            excessFee: 0n,
            satsPedersenTotalNonce: Buffer.alloc(32, 1),
            tokenPedersenTotalNonce: Buffer.alloc(32, 2),
            randomNumberCommitment: Buffer.from(sha256(randomBytes(32))),
            blindSigRequests: [] as Buffer[],
        });

        const covert = new CovertSubmitter({
            destHost: covertDomain,
            destPort: covertPort,
            ssl: Boolean(begin.payload.covertSsl),
            numSlots: components.length,
            randSpanMs: opts.covertRandSpanMs ?? 0,
            submitTimeoutMs: opts.covertTimeoutMs ?? 5_000,
            connectTimeoutMs: opts.covertTimeoutMs ?? 5_000,
            rejectUnauthorized: opts.connect?.rejectUnauthorized,
            servername: opts.connect?.servername,
            ca: opts.connect?.ca,
        });
        covertSlots.push(covert);
        covert.scheduleConnections(Date.now(), 0, 0);
        await covert.waitUntilConnected(opts.covertTimeoutMs ?? 5_000);
        covert.scheduleSubmissions(
            Date.now(),
            components.map(component => ({
                field: 'component' as const,
                payload: {
                    roundPubkey,
                    signature: Buffer.alloc(64, 1),
                    component,
                },
            })),
        );
        await covert.waitUntilDone(opts.covertTimeoutMs ?? 5_000);

        let msg = await recvServerSkipStatus(conn, types, recvMs);
        let shared: Uint8Array[] = [];
        while (
            msg.field === 'sharecovertcomponents' ||
            msg.field === 'poolstatusupdate'
        ) {
            if (msg.field === 'sharecovertcomponents') {
                const raw = msg.payload.components;
                if (Array.isArray(raw)) {
                    shared = raw.map(c => Buffer.from(c as Uint8Array));
                }
            }
            msg = await recvServerSkipStatus(conn, types, recvMs);
        }
        if (msg.field === 'error') {
            throw new Error(errorMessage(msg.payload));
        }
        if (msg.field !== 'fusionresult') {
            throw new Error(`expected fusionresult, got ${msg.field}`);
        }
        if (msg.payload.ok !== true) {
            throw new Error(
                typeof msg.payload.error === 'string'
                    ? msg.payload.error
                    : 'FusionResult not ok',
            );
        }
        const rawTx = Buffer.from(msg.payload.rawTx as Uint8Array);
        if (rawTx.length === 0) {
            throw new Error('FusionResult missing rawTx');
        }
        return {
            rawTx,
            txid:
                typeof msg.payload.txid === 'string' && msg.payload.txid !== ''
                    ? msg.payload.txid
                    : undefined,
            components: shared,
        };
    } finally {
        for (const covert of covertSlots) {
            covert.setStopTime(Date.now());
            covert.stop();
            await covert.waitUntilStopped().catch(() => undefined);
        }
        conn.close();
    }
}

async function sendClient(
    conn: FusionConnection,
    types: ProtoTypes,
    field: string,
    payload: Record<string, unknown>,
): Promise<void> {
    await conn.sendMessage(encodeMessage(types.ClientMessage, field, payload));
}

async function recvServer(
    conn: FusionConnection,
    types: ProtoTypes,
    timeoutMs: number,
): Promise<{ field: string; payload: Record<string, unknown> }> {
    return decodeMessage(
        types.ServerMessage,
        await conn.recvMessage(timeoutMs),
    );
}

/**
 * A later join can broadcast `poolstatusupdate` onto an in-round sendChain
 * between FusionBegin / StartRound / FusionResult. Skip those.
 */
async function recvServerSkipStatus(
    conn: FusionConnection,
    types: ProtoTypes,
    timeoutMs: number,
): Promise<{ field: string; payload: Record<string, unknown> }> {
    let msg = await recvServer(conn, types, timeoutMs);
    while (msg.field === 'poolstatusupdate') {
        msg = await recvServer(conn, types, timeoutMs);
    }
    return msg;
}

function errorMessage(payload: Record<string, unknown>): string {
    return typeof payload.message === 'string'
        ? payload.message
        : 'server error';
}

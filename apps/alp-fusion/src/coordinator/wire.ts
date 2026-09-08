// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Control-channel round driver: ClientHello → JoinPools → FusionBegin /
 * StartRound → PlayerCommit, plus covert {@link CovertComponent} reveal, then
 * {@link OneShotRound} assemble and FusionResult (unsigned tx).
 *
 * Chronik, tx signing, and broadcast stay out of scope.
 */
import { randomBytes } from 'node:crypto';

import {
    BlindSigner,
    DEFAULT_FEE_SATS_PER_KB,
    Ecc,
    randomScalarBytes,
    sha256,
    toHex,
} from 'ecash-lib';

import {
    DEFAULT_MIN_PLAYERS,
    NUM_COMPONENTS,
    PROTOCOL_VERSION,
} from '../protocol/constants.js';
import { listen, type FusionConnection } from '../protocol/connection.js';
import { serveCovertPeer } from '../protocol/covert.js';
import {
    asBytes,
    componentCommitment,
    componentsToContribution,
} from '../protocol/components.js';
import {
    verifyCovertComponent,
    verifyPlayerCommit,
} from '../protocol/commit.js';
import { tokenIdFromBytes, tokenIdToBytes } from '../protocol/hash.js';
import {
    decodeMessage,
    encodeMessage,
    getTypes,
    initProto,
} from '../protocol/messages.js';

import { PoolMatcher } from './pool.js';
import { OneShotRound } from './round.js';
import type { PlayerContribution, PlayerId } from './types.js';

type ProtoTypes = Awaited<ReturnType<typeof getTypes>>;

export interface FusionCoordinatorOptions {
    host?: string;
    minPlayers?: number;
    atomTiers?: bigint[];
    numComponents?: number;
    componentFeerate?: bigint;
    minExcessFee?: bigint;
    maxExcessFee?: bigint;
    /** Advertised covert host (ASCII). Defaults to `host`. */
    covertDomain?: string;
    /**
     * Deterministic output shuffle. Test-only (`NODE_ENV=test`); passed to
     * {@link OneShotRound}.
     */
    shuffleSeed?: number;
    /** How long to wait for PlayerCommit + covert reveal. */
    roundTimeoutMs?: number;
    recvTimeoutMs?: number;
    /**
     * Cap on unmatched covert blobs stored before / during a round.
     * Default: `numComponents * minPlayers * 2`.
     */
    maxEarlyCovert?: number;
}

interface Session {
    playerId: PlayerId;
    conn: FusionConnection;
    types: ProtoTypes;
    sendChain: Promise<void>;
    joined: { tokenId: string; atomTier: bigint }[];
    resolveRound: (round: ActiveRound) => void;
    roundAssigned: Promise<ActiveRound>;
    /** Per-session BlindSigners (unique R points). Set in beginRound. */
    blinds: BlindSigner[];
}

interface RoundResult {
    ok: boolean;
    rawTx?: Uint8Array;
    txid?: string;
    error?: string;
    components: Buffer[];
}

class ActiveRound {
    readonly tokenId: string;
    readonly atomTier: bigint;
    readonly playerIds: readonly PlayerId[];
    readonly expected = new Map<PlayerId, Set<string>>();
    readonly received = new Map<PlayerId, Buffer[]>();
    readonly pending = new Map<string, Buffer>();
    readonly result: Promise<RoundResult>;
    private resolveResult!: (r: RoundResult) => void;
    private finished = false;
    private readonly shuffleSeed: number | undefined;
    private readonly feePerKb: bigint;
    private readonly maxPending: number;
    roundSeckey: Uint8Array<ArrayBufferLike> = new Uint8Array(32);
    roundPubkey: Uint8Array<ArrayBufferLike> = new Uint8Array(33);

    constructor(
        tokenId: string,
        atomTier: bigint,
        playerIds: PlayerId[],
        feePerKb: bigint,
        shuffleSeed: number | undefined,
        maxPending: number,
    ) {
        this.tokenId = tokenId;
        this.atomTier = atomTier;
        this.playerIds = playerIds;
        this.feePerKb = feePerKb;
        this.shuffleSeed = shuffleSeed;
        this.maxPending = maxPending;
        this.result = new Promise(resolve => {
            this.resolveResult = resolve;
        });
        for (const id of playerIds) {
            this.received.set(id, []);
        }
    }

    /**
     * Queue an unmatched covert blob, or assign it if a player already
     * committed this hash. Returns false when the unmatched cap is full.
     */
    addPending(hashHex: string, component: Buffer): boolean {
        if (this.finished) {
            return true;
        }
        for (const [playerId, hashes] of this.expected) {
            if (hashes.has(hashHex)) {
                this.assign(playerId, hashHex, component);
                return true;
            }
        }
        if (
            !this.pending.has(hashHex) &&
            this.pending.size >= this.maxPending
        ) {
            return false;
        }
        this.pending.set(hashHex, component);
        return true;
    }

    addCommit(playerId: PlayerId, hashHexes: string[]): void {
        if (this.finished) {
            return;
        }
        if (this.expected.has(playerId)) {
            throw new Error(`player ${playerId} already committed`);
        }
        const set = new Set(hashHexes);
        if (set.size !== hashHexes.length) {
            throw new Error(`player ${playerId}: duplicate commitments`);
        }
        if (set.size === 0) {
            throw new Error(`player ${playerId}: no commitments`);
        }
        this.expected.set(playerId, set);
        for (const hashHex of set) {
            const pending = this.pending.get(hashHex);
            if (pending) {
                this.pending.delete(hashHex);
                this.assign(playerId, hashHex, pending);
            }
        }
    }

    fail(error: string): void {
        if (this.finished) {
            return;
        }
        this.finished = true;
        this.resolveResult({ ok: false, error, components: [] });
    }

    tryAssemble(): void {
        if (this.finished) {
            return;
        }
        if (this.expected.size !== this.playerIds.length) {
            return;
        }
        for (const id of this.playerIds) {
            const want = this.expected.get(id);
            const got = this.received.get(id) ?? [];
            if (!want || got.length !== want.size) {
                return;
            }
        }
        const contributions: PlayerContribution[] = [];
        const allComponents: Buffer[] = [];
        try {
            for (const id of this.playerIds) {
                const blobs = this.received.get(id) ?? [];
                allComponents.push(...blobs);
                contributions.push(
                    componentsToContribution(id, this.tokenId, blobs),
                );
            }
            const round = new OneShotRound(
                {
                    tokenId: this.tokenId,
                    atomTier: this.atomTier,
                    feePerKb: this.feePerKb,
                    shuffleSeed: this.shuffleSeed,
                },
                [...this.playerIds],
            );
            for (const c of contributions) {
                round.submitContribution(c);
            }
            const assembled = round.assemble();
            this.finished = true;
            this.resolveResult({
                ok: true,
                rawTx: assembled.tx.ser(),
                txid: assembled.tx.txid(),
                components: allComponents,
            });
        } catch (err) {
            this.finished = true;
            this.resolveResult({
                ok: false,
                error: err instanceof Error ? err.message : String(err),
                components: allComponents,
            });
        }
    }

    private assign(
        playerId: PlayerId,
        hashHex: string,
        component: Buffer,
    ): void {
        const hashes = this.expected.get(playerId);
        if (!hashes?.has(hashHex)) {
            return;
        }
        const list = this.received.get(playerId);
        if (!list) {
            return;
        }
        if (list.some(b => toHex(sha256(b)) === hashHex)) {
            return;
        }
        list.push(component);
    }
}

/**
 * Listen for control + covert peers and run in-process pool match → assemble
 * over the protobuf RPCs.
 */
export class FusionCoordinator {
    readonly matcher: PoolMatcher;
    private readonly opts: FusionCoordinatorOptions;
    private readonly maxEarlyCovert: number;
    private types: ProtoTypes | null = null;
    private sessions = new Map<PlayerId, Session>();
    private activeRound: ActiveRound | null = null;
    private earlyCovert = new Map<string, Buffer>();
    private control: { port: number; close: () => Promise<void> } | undefined;
    private covert: { port: number; close: () => Promise<void> } | undefined;
    private closed = false;

    constructor(opts: FusionCoordinatorOptions = {}) {
        this.opts = opts;
        this.matcher = new PoolMatcher(opts.minPlayers);
        this.maxEarlyCovert =
            opts.maxEarlyCovert ??
            (opts.numComponents ?? NUM_COMPONENTS) *
                (opts.minPlayers ?? DEFAULT_MIN_PLAYERS) *
                2;
    }

    get controlPort(): number {
        if (!this.control) {
            throw new Error('FusionCoordinator is not listening');
        }
        return this.control.port;
    }

    get covertPort(): number {
        if (!this.covert) {
            throw new Error('FusionCoordinator is not listening');
        }
        return this.covert.port;
    }

    /** Live control sessions (waiting or in-round). */
    get sessionCount(): number {
        return this.sessions.size;
    }

    /**
     * Bind control + covert sockets. Port `0` picks an ephemeral port.
     */
    async start(
        host = this.opts.host ?? '127.0.0.1',
        controlPort = 0,
        covertPort = 0,
    ): Promise<{ controlPort: number; covertPort: number }> {
        await initProto();
        this.types = await getTypes();
        this.closed = false;
        this.control = await listen(host, controlPort, conn => {
            void this.handleSession(conn).catch(() => {
                conn.close();
            });
        });
        this.covert = await listen(host, covertPort, conn => {
            void serveCovertPeer(conn, (field, payload) =>
                this.onCovert(field, payload),
            ).catch(() => {
                conn.close();
            });
        });
        return {
            controlPort: this.control.port,
            covertPort: this.covert.port,
        };
    }

    async close(): Promise<void> {
        this.closed = true;
        if (this.activeRound) {
            this.activeRound.fail('coordinator closed');
            this.activeRound = null;
        }
        for (const session of this.sessions.values()) {
            session.conn.close();
        }
        this.sessions.clear();
        const control = this.control;
        const covert = this.covert;
        this.control = undefined;
        this.covert = undefined;
        await Promise.all([control?.close(), covert?.close()]);
    }

    private requireTypes(): ProtoTypes {
        if (!this.types) {
            throw new Error('Call start() first');
        }
        return this.types;
    }

    private onCovert(
        field: string,
        payload: Record<string, unknown>,
    ): { ok: true } | { ok: false; message: string } {
        if (field === 'ping' || field === 'signature') {
            return { ok: true };
        }
        if (field !== 'component') {
            return { ok: false, message: `unexpected covert ${field}` };
        }
        try {
            if (!this.activeRound) {
                return { ok: false, message: 'no active round' };
            }
            const component = verifyCovertComponent(
                payload,
                this.activeRound.roundPubkey,
            );
            const hashHex = toHex(componentCommitment(component));
            if (!this.activeRound.addPending(hashHex, component)) {
                return {
                    ok: false,
                    message: 'too many covert components',
                };
            }
            this.activeRound.tryAssemble();
            return { ok: true };
        } catch (err) {
            return {
                ok: false,
                message: err instanceof Error ? err.message : String(err),
            };
        }
    }

    private send(
        session: Session,
        field: string,
        payload: Record<string, unknown>,
    ): Promise<void> {
        session.sendChain = session.sendChain.then(async () => {
            if (session.conn.destroyed) {
                throw new Error('Connection closed');
            }
            await session.conn.sendMessage(
                encodeMessage(session.types.ServerMessage, field, payload),
            );
        });
        return session.sendChain;
    }

    private async handleSession(conn: FusionConnection): Promise<void> {
        const types = this.requireTypes();
        const playerId = randomBytes(8).toString('hex');
        let resolveRound: (round: ActiveRound) => void = () => undefined;
        const roundAssigned = new Promise<ActiveRound>(resolve => {
            resolveRound = resolve;
        });
        const session: Session = {
            playerId,
            conn,
            types,
            sendChain: Promise.resolve(),
            joined: [],
            resolveRound,
            roundAssigned,
            blinds: [],
        };
        this.sessions.set(playerId, session);
        const recvMs = this.opts.recvTimeoutMs ?? 15_000;
        try {
            const hello = decodeMessage(
                types.ClientMessage,
                await conn.recvMessage(recvMs),
            );
            if (hello.field !== 'clienthello') {
                await this.send(session, 'error', {
                    message: 'expected clienthello',
                });
                return;
            }
            const version = asBytes(
                hello.payload.version,
                'clienthello.version',
            );
            if (!version.equals(Buffer.from(PROTOCOL_VERSION))) {
                await this.send(session, 'error', {
                    message: 'Mismatched protocol version, please upgrade',
                });
                return;
            }
            await this.send(session, 'serverhello', {
                numComponents: this.opts.numComponents ?? NUM_COMPONENTS,
                componentFeerate:
                    this.opts.componentFeerate ?? DEFAULT_FEE_SATS_PER_KB,
                minExcessFee: this.opts.minExcessFee ?? 0n,
                maxExcessFee: this.opts.maxExcessFee ?? 300_000n,
                atomTiers: this.opts.atomTiers ?? [],
                minPlayers: this.opts.minPlayers ?? DEFAULT_MIN_PLAYERS,
            });

            const join = decodeMessage(
                types.ClientMessage,
                await conn.recvMessage(recvMs),
            );
            if (join.field !== 'joinpools') {
                await this.send(session, 'error', {
                    message: 'expected joinpools',
                });
                return;
            }
            const pools = join.payload.pools;
            if (!Array.isArray(pools) || pools.length === 0) {
                await this.send(session, 'error', { message: 'No pools' });
                return;
            }
            for (const raw of pools) {
                if (raw === null || typeof raw !== 'object') {
                    await this.send(session, 'error', {
                        message: 'invalid pool',
                    });
                    return;
                }
                const pool = raw as Record<string, unknown>;
                const tokenId = tokenIdFromBytes(
                    asBytes(pool.tokenId, 'pool.tokenId'),
                );
                if (typeof pool.atomTier !== 'bigint') {
                    await this.send(session, 'error', {
                        message: 'pool.atomTier: expected bigint',
                    });
                    return;
                }
                this.matcher.register({
                    playerId,
                    tokenId,
                    atomTier: pool.atomTier,
                });
                session.joined.push({ tokenId, atomTier: pool.atomTier });
            }
            // Do not await: a peer that stops reading can pin send() forever
            // and would then block tryStartReady for every pool.
            void this.broadcastPoolStatus();
            this.tryStartReady();

            const round = await Promise.race([
                session.roundAssigned,
                conn.whenClosed().then(() => {
                    throw new Error('Connection closed');
                }),
            ]);
            const commit = decodeMessage(
                types.ClientMessage,
                await conn.recvMessage(recvMs),
            );
            if (commit.field !== 'playercommit') {
                await this.send(session, 'error', {
                    message: 'expected playercommit',
                });
                round.fail('expected playercommit');
                return;
            }
            let verified;
            try {
                verified = verifyPlayerCommit(commit.payload, {
                    minExcessFee: this.opts.minExcessFee ?? 0n,
                    maxExcessFee: this.opts.maxExcessFee ?? 300_000n,
                    maxComponents: this.opts.numComponents ?? NUM_COMPONENTS,
                });
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : String(err);
                await this.send(session, 'error', { message });
                round.fail(message);
                return;
            }
            if (session.blinds.length < verified.eValues.length) {
                await this.send(session, 'error', {
                    message: 'blind nonce miscount',
                });
                round.fail('blind nonce miscount');
                return;
            }
            const scalars = verified.eValues.map((e, i) =>
                session.blinds[i].sign(round.roundSeckey, e),
            );
            await this.send(session, 'blindsigresponses', {
                scalars: scalars.map(s => Buffer.from(s)),
            });
            round.addCommit(playerId, verified.hashes);
            round.tryAssemble();

            const wait = delay(this.opts.roundTimeoutMs ?? 10_000);
            let result: RoundResult;
            try {
                result = await Promise.race([
                    round.result,
                    wait.promise.then(() => {
                        round.fail(
                            'round timed out waiting for covert components',
                        );
                        return round.result;
                    }),
                ]);
            } finally {
                wait.clear();
            }
            const sendBudget = delay(this.opts.roundTimeoutMs ?? 10_000);
            try {
                await Promise.race([
                    (async () => {
                        if (result.components.length > 0) {
                            await this.send(session, 'sharecovertcomponents', {
                                components: result.components,
                                skipSignatures: true,
                                sessionHash: Buffer.from(
                                    sha256(Buffer.from(round.tokenId)),
                                ),
                            });
                        }
                        if (result.ok && result.rawTx) {
                            await this.send(session, 'fusionresult', {
                                ok: true,
                                rawTx: Buffer.from(result.rawTx),
                                txid: result.txid ?? '',
                            });
                        } else {
                            await this.send(session, 'fusionresult', {
                                ok: false,
                                error: result.error ?? 'round failed',
                            });
                        }
                    })(),
                    sendBudget.promise.then(() => {
                        throw new Error('result send timed out');
                    }),
                ]);
            } finally {
                sendBudget.clear();
            }
        } finally {
            let droppedWaiter = false;
            for (const j of session.joined) {
                if (this.matcher.unregister(playerId, j.tokenId, j.atomTier)) {
                    droppedWaiter = true;
                }
            }
            this.sessions.delete(playerId);
            if (this.activeRound?.playerIds.includes(playerId)) {
                this.activeRound.fail(`player ${playerId} disconnected`);
            }
            conn.close();
            if (droppedWaiter && !this.closed) {
                void this.broadcastPoolStatus();
            }
        }
    }

    private async broadcastPoolStatus(): Promise<void> {
        const byKey = new Map<
            string,
            { tokenId: string; atomTier: bigint; players: number }
        >();
        for (const session of this.sessions.values()) {
            for (const j of session.joined) {
                const key = `${j.tokenId}:${j.atomTier}`;
                const size = this.matcher.size(j.tokenId, j.atomTier);
                byKey.set(key, {
                    tokenId: j.tokenId,
                    atomTier: j.atomTier,
                    players: size,
                });
            }
        }
        const statuses = [...byKey.values()].map(e => ({
            key: {
                tokenId: Buffer.from(tokenIdToBytes(e.tokenId)),
                atomTier: e.atomTier,
            },
            status: {
                players: e.players,
                minPlayers: this.opts.minPlayers ?? DEFAULT_MIN_PLAYERS,
            },
        }));
        if (statuses.length === 0) {
            return;
        }
        const inRound = new Set(this.activeRound?.playerIds ?? []);
        await Promise.all(
            [...this.sessions.values()]
                .filter(
                    session =>
                        session.joined.length > 0 &&
                        !inRound.has(session.playerId),
                )
                .map(session =>
                    this.send(session, 'poolstatusupdate', { statuses }).catch(
                        () => undefined,
                    ),
                ),
        );
    }

    private tryStartReady(): void {
        if (this.activeRound || this.closed) {
            return;
        }
        const seen = new Set<string>();
        for (const session of this.sessions.values()) {
            for (const j of session.joined) {
                const key = `${j.tokenId}:${j.atomTier}`;
                if (seen.has(key)) {
                    continue;
                }
                seen.add(key);
                if (!this.matcher.isReady(j.tokenId, j.atomTier)) {
                    continue;
                }
                const ready = this.matcher.takeReady(j.tokenId, j.atomTier);
                // One session, one round: drop leftover JoinPools keys so
                // tryStartReady cannot pick a player who already committed.
                for (const takenId of ready.playerIds) {
                    const taken = this.sessions.get(takenId);
                    if (!taken) {
                        continue;
                    }
                    taken.joined = taken.joined.filter(other => {
                        if (
                            other.tokenId === ready.tokenId &&
                            other.atomTier === ready.atomTier
                        ) {
                            return true;
                        }
                        this.matcher.unregister(
                            takenId,
                            other.tokenId,
                            other.atomTier,
                        );
                        return false;
                    });
                }
                const round = new ActiveRound(
                    ready.tokenId,
                    ready.atomTier,
                    ready.playerIds,
                    this.opts.componentFeerate ?? DEFAULT_FEE_SATS_PER_KB,
                    this.opts.shuffleSeed,
                    this.maxEarlyCovert,
                );
                this.activeRound = round;
                for (const [hashHex, component] of this.earlyCovert) {
                    round.addPending(hashHex, component);
                }
                this.earlyCovert.clear();
                void this.beginRound(round).catch(err => {
                    round.fail(
                        err instanceof Error ? err.message : String(err),
                    );
                });
                void round.result.finally(() => {
                    if (this.activeRound === round) {
                        this.activeRound = null;
                    }
                    // Leftover waiters from takeReady can already be ready;
                    // defer so finished sessions can unregister first.
                    if (!this.closed) {
                        setImmediate(() => this.tryStartReady());
                    }
                });
                return;
            }
        }
    }

    private async beginRound(round: ActiveRound): Promise<void> {
        const covertDomain = Buffer.from(
            this.opts.covertDomain ?? this.opts.host ?? '127.0.0.1',
        );
        const serverTime = BigInt(Math.floor(Date.now() / 1000));
        const numComponents = this.opts.numComponents ?? NUM_COMPONENTS;
        round.roundSeckey = randomScalarBytes();
        round.roundPubkey = new Ecc().derivePubkey(round.roundSeckey);
        const sessions = round.playerIds.map(playerId => {
            const session = this.sessions.get(playerId);
            if (!session) {
                throw new Error(`missing session ${playerId}`);
            }
            return session;
        });
        for (const session of sessions) {
            session.resolveRound(round);
        }
        const begin = {
            tokenId: Buffer.from(tokenIdToBytes(round.tokenId)),
            atomTier: round.atomTier,
            covertDomain,
            covertPort: this.covertPort,
            covertSsl: false,
            serverTime,
        };
        const budget = delay(this.opts.roundTimeoutMs ?? 10_000);
        try {
            await Promise.race([
                Promise.all(
                    sessions.map(async session => {
                        session.blinds = Array.from(
                            { length: numComponents },
                            () => new BlindSigner(),
                        );
                        const start = {
                            roundPubkey: Buffer.from(round.roundPubkey),
                            blindNoncePoints: session.blinds.map(b =>
                                Buffer.from(b.getR()),
                            ),
                            serverTime,
                        };
                        await this.send(session, 'fusionbegin', begin);
                        await this.send(session, 'startround', start);
                    }),
                ),
                budget.promise.then(() => {
                    throw new Error('round start send timed out');
                }),
            ]);
        } catch (err) {
            for (const session of sessions) {
                session.conn.close();
            }
            throw err;
        } finally {
            budget.clear();
        }
    }
}

function delay(ms: number): { promise: Promise<void>; clear: () => void } {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const promise = new Promise<void>(resolve => {
        timer = setTimeout(resolve, ms);
    });
    return {
        promise,
        clear: () => {
            if (timer === undefined) {
                return;
            }
            clearTimeout(timer);
            timer = undefined;
        },
    };
}

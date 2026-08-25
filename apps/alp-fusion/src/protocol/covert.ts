// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * CashFusion-shaped covert submission (Electrum `covert.py`).
 *
 * Components and signatures travel on **separate** sockets from the control
 * channel. Optional SOCKS5 (Tor) plus unique per-connection credentials stop
 * a coordinator from trivially joining IP → component set. Timing stagger
 * uses the same trapezoid (`randTrap`) as Electrum.
 *
 * Round assembly, Chronik, and signing stay out of scope — this is the
 * transport + slot scheduler only.
 */
import { randomBytes } from 'node:crypto';

import { COVERT } from './constants.js';
import { connect, type FusionConnection } from './connection.js';
import { decodeMessage, encodeMessage, getTypes } from './messages.js';

type ProtoTypes = Awaited<ReturnType<typeof getTypes>>;

export type CovertPayload = {
    field: 'component' | 'signature' | 'ping';
    payload: Record<string, unknown>;
};

/**
 * Server error or a slot failure with no spare — the whole submitter stops.
 */
export class CovertUnrecoverable extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CovertUnrecoverable';
    }
}

/**
 * Trapezoid sample in [0, 1] (Electrum `rand_trap`).
 * Peak density 4/3 on [1/4, 3/4]; lighter tails so actions cluster mid-window.
 *
 * @param rng - `Math`-like source (`random()` → [0, 1)).
 */
export function randTrap(rng: { random(): number }): number {
    const sixth = 1 / 6;
    const f = rng.random();
    const fc = 1 - f;
    if (f < sixth) {
        return Math.sqrt(0.375 * f);
    }
    if (fc < sixth) {
        return 1 - Math.sqrt(0.375 * fc);
    }
    return 0.75 * f + 0.125;
}

/**
 * Sliding window of recent SOCKS/Tor connect attempts (Electrum `TorLimiter`).
 */
export class TorLimiter {
    private readonly expires: number[] = [];
    private n = 0;

    constructor(readonly lifetimeMs: number = COVERT.torCooldownMs) {}

    cleanup(now = Date.now()): void {
        while (this.expires.length > 0 && this.expires[0] <= now) {
            this.expires.shift();
            this.n -= 1;
        }
    }

    get count(): number {
        return this.countAt(Date.now());
    }

    /**
     * Number of attempts still inside the window at `now`.
     */
    countAt(now: number): number {
        this.cleanup(now);
        return this.n;
    }

    bump(now = Date.now()): void {
        this.expires.push(now + this.lifetimeMs);
        this.n += 1;
    }
}

/** Shared limiter so later fuse-loop policy can cap concurrent Tor dials. */
export const torLimiter = new TorLimiter();

class Wake {
    private readonly waiters = new Set<(woken: boolean) => void>();

    trigger(): void {
        const pending = [...this.waiters];
        this.waiters.clear();
        for (const w of pending) {
            w(true);
        }
    }

    /**
     * @returns true if triggered before `ms` elapsed.
     */
    wait(ms: number): Promise<boolean> {
        if (ms <= 0) {
            return Promise.resolve(false);
        }
        return new Promise(resolve => {
            const timer = setTimeout(() => {
                this.waiters.delete(wrapped);
                resolve(false);
            }, ms);
            const wrapped = (woken: boolean) => {
                clearTimeout(timer);
                this.waiters.delete(wrapped);
                resolve(woken);
            };
            this.waiters.add(wrapped);
        });
    }
}

class CovertConnection {
    connection: FusionConnection | null = null;
    slotNum: number | null = null;
    tPing: number | undefined;
    connNumber = 0;
    readonly wake = new Wake();
}

class CovertSlot {
    tSubmit: number | undefined;
    work: CovertPayload | undefined;
    done = true;
    covconn: CovertConnection | null = null;
}

export interface CovertSubmitterOptions {
    destHost: string;
    destPort: number;
    ssl?: boolean;
    /** Proxy host/port only — unique RFC 1929 creds are generated per socket. */
    socks5?: { host: string; port: number };
    numSlots: number;
    randSpanMs?: number;
    submitTimeoutMs?: number;
    connectTimeoutMs?: number;
    rejectUnauthorized?: boolean;
    servername?: string;
    ca?: string | Buffer | Array<string | Buffer>;
    now?: () => number;
}

/**
 * N slots + M spare connections. Related work (component, then signature)
 * stays on the same socket when that socket survives.
 */
export class CovertSubmitter {
    readonly destHost: string;
    readonly destPort: number;
    readonly ssl: boolean;
    readonly socks5: { host: string; port: number } | undefined;
    readonly randSpanMs: number;
    readonly submitTimeoutMs: number;
    readonly connectTimeoutMs: number;
    readonly slots: CovertSlot[];
    spareConnections: CovertConnection[] = [];
    stopping = false;
    failureException: Error | undefined;
    stopTStart: number;
    countAttempted = 0;
    countEstablished = 0;
    countFailed = 0;
    readonly socksLogins: string[] = [];

    private readonly now: () => number;
    private readonly connectOpts: {
        rejectUnauthorized?: boolean;
        servername?: string;
        ca?: string | Buffer | Array<string | Buffer>;
    };
    private readonly randtag: string;
    private readonly rng: { random(): number };
    private readonly tasks: Promise<void>[] = [];
    private types: ProtoTypes | null = null;

    constructor(opts: CovertSubmitterOptions) {
        if (!Number.isInteger(opts.numSlots) || opts.numSlots < 1) {
            throw new Error('CovertSubmitter: numSlots must be >= 1');
        }
        this.destHost = opts.destHost;
        this.destPort = opts.destPort;
        this.ssl = opts.ssl ?? false;
        this.socks5 = opts.socks5;
        this.randSpanMs = opts.randSpanMs ?? COVERT.submitWindowMs;
        this.submitTimeoutMs = opts.submitTimeoutMs ?? COVERT.submitTimeoutMs;
        this.connectTimeoutMs =
            opts.connectTimeoutMs ?? COVERT.connectTimeoutMs;
        this.now = opts.now ?? Date.now;
        this.connectOpts = {
            rejectUnauthorized: opts.rejectUnauthorized,
            servername: opts.servername,
            ca: opts.ca,
        };
        this.slots = Array.from(
            { length: opts.numSlots },
            () => new CovertSlot(),
        );
        this.stopTStart = this.now() - this.randSpanMs;
        this.randtag = randomBytes(9).toString('base64url');
        // Timing stagger is privacy-relevant (join covert sockets to a
        // control session). Electrum seeds `random.Random` from
        // `secrets.token_bytes`; sample the unit interval from a CSPRNG
        // so observed delays do not recover later ones.
        this.rng = {
            random: () => randomBytes(6).readUIntBE(0, 6) / 2 ** 48,
        };
    }

    private wakeAll(): void {
        for (const s of this.slots) {
            s.covconn?.wake.trigger();
        }
        for (const c of this.spareConnections) {
            c.wake.trigger();
        }
    }

    /**
     * Schedule staggered close. Safe to call more than once.
     */
    stop(exception?: Error): void {
        if (this.stopping) {
            return;
        }
        this.failureException = exception;
        this.stopping = true;
        this.wakeAll();
    }

    setStopTime(tStart: number): void {
        this.stopTStart = tStart;
        if (this.stopping) {
            this.wakeAll();
        }
    }

    /**
     * Allocate a connection per empty slot, plus spares up to `numSpares`.
     */
    scheduleConnections(tStart: number, tSpanMs: number, numSpares = 0): void {
        const newConns: CovertConnection[] = [];
        for (let i = 0; i < this.slots.length; i++) {
            const slot = this.slots[i];
            if (slot.covconn === null) {
                slot.covconn = new CovertConnection();
                slot.covconn.slotNum = i;
                newConns.push(slot.covconn);
            }
        }
        const extra = Math.max(0, numSpares - this.spareConnections.length);
        const newSpares = Array.from(
            { length: extra },
            () => new CovertConnection(),
        );
        this.spareConnections = [...newSpares, ...this.spareConnections];
        newConns.push(...newSpares);

        for (const cov of newConns) {
            cov.connNumber = this.countAttempted;
            this.countAttempted += 1;
            const connTime = tStart + tSpanMs * randTrap(this.rng);
            const randDelay = this.randSpanMs * randTrap(this.rng);
            this.tasks.push(this.runConnection(cov, connTime, randDelay));
        }
    }

    /**
     * Queue one CovertMessage on `slotNum` at `tStart` (plus that socket's delay).
     */
    scheduleSubmit(slotNum: number, tStart: number, work: CovertPayload): void {
        const slot = this.slots[slotNum];
        if (!slot) {
            throw new Error(`CovertSubmitter: no slot ${slotNum}`);
        }
        if (!slot.done) {
            throw new Error(
                'CovertSubmitter: prior work on this slot is not done',
            );
        }
        slot.work = work;
        slot.done = false;
        slot.tSubmit = tStart;
        slot.covconn?.wake.trigger();
    }

    /**
     * One work item (or ping) per slot. `null` schedules a ping on that slot.
     */
    scheduleSubmissions(
        tStart: number,
        slotMessages: Array<CovertPayload | null>,
    ): void {
        if (slotMessages.length !== this.slots.length) {
            throw new Error(
                'CovertSubmitter: slotMessages length must match numSlots',
            );
        }
        for (const spare of this.spareConnections) {
            spare.tPing = tStart;
            spare.wake.trigger();
        }
        for (let i = 0; i < this.slots.length; i++) {
            const slot = this.slots[i];
            const work = slotMessages[i];
            const cov = slot.covconn;
            if (work === null) {
                if (cov) {
                    cov.tPing = tStart;
                    cov.wake.trigger();
                }
                continue;
            }
            slot.work = work;
            slot.done = false;
            slot.tSubmit = tStart;
            cov?.wake.trigger();
        }
    }

    checkOk(): void {
        if (this.failureException) {
            throw new CovertUnrecoverable(
                `Covert connections failed: ${this.failureException.message}`,
            );
        }
    }

    checkConnected(): void {
        this.checkOk();
        const missing = this.slots.filter(
            s => s.covconn === null || s.covconn.connection === null,
        ).length;
        if (missing > 0) {
            throw new Error(
                `Covert connections were too slow (${missing} incomplete out of ${this.slots.length})`,
            );
        }
    }

    checkDone(): void {
        this.checkOk();
        const missing = this.slots.filter(s => !s.done).length;
        if (missing > 0) {
            throw new Error(
                `Covert submissions were too slow (${missing} incomplete out of ${this.slots.length})`,
            );
        }
    }

    /**
     * Poll until every slot has a live socket (or `timeoutMs` / failure).
     */
    async waitUntilConnected(timeoutMs: number): Promise<void> {
        const deadline = this.now() + timeoutMs;
        while (true) {
            try {
                this.checkConnected();
                return;
            } catch (err) {
                if (this.failureException) {
                    throw err;
                }
                if (this.now() >= deadline) {
                    throw err;
                }
                await sleep(10);
            }
        }
    }

    /**
     * Poll until every slot finished its latest work.
     */
    async waitUntilDone(timeoutMs: number): Promise<void> {
        const deadline = this.now() + timeoutMs;
        while (true) {
            try {
                this.checkDone();
                return;
            } catch (err) {
                if (this.failureException) {
                    throw err;
                }
                if (this.now() >= deadline) {
                    throw err;
                }
                await sleep(10);
            }
        }
    }

    /**
     * Resolve after every connection task exits (call {@link stop} first).
     */
    waitUntilStopped(): Promise<void> {
        return Promise.all(this.tasks).then(() => undefined);
    }

    private async requireTypes(): Promise<ProtoTypes> {
        if (!this.types) {
            this.types = await getTypes();
        }
        return this.types;
    }

    private async runConnection(
        cov: CovertConnection,
        connTime: number,
        randDelay: number,
    ): Promise<void> {
        while (await cov.wake.wait(connTime - this.now())) {
            if (this.stopping) {
                return;
            }
        }
        if (this.stopping) {
            return;
        }

        try {
            const socks5 = this.socks5
                ? {
                      host: this.socks5.host,
                      port: this.socks5.port,
                      username: `AF${this.randtag}_${cov.connNumber}`,
                      password: `AF${this.randtag}_${cov.connNumber}`,
                  }
                : undefined;
            if (socks5) {
                this.socksLogins.push(socks5.username);
                torLimiter.bump(this.now());
            }
            cov.connection = await connect(this.destHost, this.destPort, {
                ssl: this.ssl,
                timeoutMs: this.connectTimeoutMs,
                socks5,
                ...this.connectOpts,
            });
            this.countEstablished += 1;
        } catch (err) {
            this.countFailed += 1;
            this.reassignOrStop(cov, err as Error);
            return;
        }

        let lastAction = this.now();
        try {
            while (!this.stopping) {
                let nextTime: number | undefined;
                let action: (() => Promise<void>) | undefined;
                const slotNum = cov.slotNum;
                if (slotNum !== null) {
                    const slot = this.slots[slotNum];
                    if (slot.tSubmit !== undefined) {
                        nextTime = slot.tSubmit;
                        action = () => this.submitSlot(slot);
                    }
                }
                if (nextTime === undefined && cov.tPing !== undefined) {
                    nextTime = cov.tPing;
                    action = () => this.ping(cov);
                }
                if (nextTime === undefined) {
                    nextTime = lastAction + COVERT.timeoutInactiveMs;
                    action = async () => {
                        throw new CovertUnrecoverable(
                            'timed out from inactivity (this is a bug!)',
                        );
                    };
                }

                const woken = await cov.wake.wait(
                    nextTime + randDelay - this.now(),
                );
                if (woken) {
                    continue;
                }
                if (!action) {
                    continue;
                }
                try {
                    await action();
                } catch (err) {
                    if (err instanceof CovertUnrecoverable) {
                        this.stop(err);
                    }
                    throw err;
                }
                lastAction = this.now();
            }

            while (
                await cov.wake.wait(this.stopTStart + randDelay - this.now())
            ) {
                /* re-evaluate stop time */
            }
        } catch (err) {
            this.reassignOrStop(cov, err as Error);
        } finally {
            cov.connection?.close();
            cov.connection = null;
        }
    }

    private reassignOrStop(cov: CovertConnection, err: Error): void {
        const slotNum = cov.slotNum;
        if (slotNum === null) {
            // A spare whose task exited must not stay in the pool; a later
            // pop() would hand a slot a connection with no running task.
            const idx = this.spareConnections.indexOf(cov);
            if (idx !== -1) {
                this.spareConnections.splice(idx, 1);
            }
            return;
        }
        const spare = this.spareConnections.pop();
        if (!spare) {
            this.stop(err);
            return;
        }
        this.slots[slotNum].covconn = spare;
        spare.slotNum = slotNum;
        cov.slotNum = null;
        spare.wake.trigger();
    }

    private async submitSlot(slot: CovertSlot): Promise<void> {
        const conn = slot.covconn?.connection;
        const work = slot.work;
        if (!conn || !work) {
            throw new Error(
                'CovertSubmitter: submit without connection or work',
            );
        }
        const types = await this.requireTypes();
        await conn.sendMessage(
            encodeMessage(types.CovertMessage, work.field, work.payload),
        );
        const raw = await conn.recvMessage(this.submitTimeoutMs);
        const res = decodeMessage(types.CovertResponse, raw);
        if (res.field === 'error') {
            const msg =
                typeof res.payload.message === 'string'
                    ? res.payload.message
                    : 'error';
            throw new CovertUnrecoverable(`error from server: ${msg}`);
        }
        slot.done = true;
        slot.tSubmit = undefined;
        slot.work = undefined;
        if (slot.covconn) {
            slot.covconn.tPing = undefined;
        }
    }

    private async ping(cov: CovertConnection): Promise<void> {
        const conn = cov.connection;
        if (!conn) {
            throw new Error('CovertSubmitter: ping without connection');
        }
        const types = await this.requireTypes();
        await conn.sendMessage(encodeMessage(types.CovertMessage, 'ping', {}));
        const raw = await conn.recvMessage(this.submitTimeoutMs);
        const res = decodeMessage(types.CovertResponse, raw);
        if (res.field === 'error') {
            throw new CovertUnrecoverable('error from server on ping');
        }
        cov.tPing = undefined;
    }
}

/**
 * Covert peer loop: `CovertMessage` in, `CovertResponse` out, until close.
 *
 * @param conn - Framed covert socket (typically from a second `listen()`).
 * @param onMessage - Return `{ ok: true }` or an error string for the client.
 */
export async function serveCovertPeer(
    conn: FusionConnection,
    onMessage: (
        field: string,
        payload: Record<string, unknown>,
    ) => { ok: true } | { ok: false; message: string } = () => ({ ok: true }),
): Promise<void> {
    const types = await getTypes();
    while (!conn.destroyed) {
        let raw: Buffer;
        try {
            raw = await conn.recvMessage();
        } catch {
            // Timeout / peer drop: recvMessage does not always close (idle
            // 120s wait). Callers use `void serveCovertPeer(...)`.
            conn.close();
            return;
        }
        let result: { ok: true } | { ok: false; message: string };
        try {
            const dec = decodeMessage(types.CovertMessage, raw);
            result = onMessage(dec.field, dec.payload);
        } catch {
            // Undecodable frame or handler fault: do not reject (callers use
            // `void serveCovertPeer(...)`). The framed stream cannot be
            // recovered from a bad CovertMessage.
            conn.close();
            return;
        }
        try {
            if (result.ok) {
                await conn.sendMessage(
                    encodeMessage(types.CovertResponse, 'ok', {}),
                );
            } else {
                await conn.sendMessage(
                    encodeMessage(types.CovertResponse, 'error', {
                        message: result.message,
                    }),
                );
            }
        } catch {
            conn.close();
            return;
        }
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

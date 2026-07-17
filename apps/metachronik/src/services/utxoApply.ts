// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    ResolvedUtxo,
    UtxoEvent,
    txidHexToBuffer,
    utxoOutpointKey,
} from './utxoTypes';
import { isKnownDuplicateCoinbaseRepeat } from './knownDuplicateCoinbases';

interface PgClient {
    query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
}

export interface UtxoBlockApplyInput {
    height: number;
    date: string;
    events: UtxoEvent[];
}

interface PendingUtxo extends ResolvedUtxo {
    createdHeight: number;
}

interface UtxoApplyState {
    pending: Map<string, PendingUtxo>;
    balanceDelta: Map<string, bigint>;
    firstSeenDate: Map<string, string>;
    unresolvedSpends: Array<{
        prevTxid: string;
        prevVout: number;
        date: string;
    }>;
}

const createState = (): UtxoApplyState => ({
    pending: new Map(),
    balanceDelta: new Map(),
    firstSeenDate: new Map(),
    unresolvedSpends: [],
});

const addDelta = (
    state: UtxoApplyState,
    script: string,
    delta: bigint,
    date: string,
) => {
    if (script === '') {
        return;
    }
    state.balanceDelta.set(
        script,
        (state.balanceDelta.get(script) ?? 0n) + delta,
    );
    if (!state.firstSeenDate.has(script)) {
        state.firstSeenDate.set(script, date);
    }
};

/**
 * Replay one block's UTXO events into shared batch state (no SQL).
 * Cross-block create→spend within the batch stays in `pending`.
 */
export const replayUtxoEvents = (
    state: UtxoApplyState,
    blockHeight: number,
    blockDate: string,
    events: UtxoEvent[],
): void => {
    for (const event of events) {
        if (event.type === 'spend') {
            const key = utxoOutpointKey(event.prevTxid, event.prevVout);
            const pending = state.pending.get(key);
            if (pending) {
                state.pending.delete(key);
                addDelta(state, pending.script, -pending.sats, blockDate);
            } else {
                state.unresolvedSpends.push({
                    prevTxid: event.prevTxid,
                    prevVout: event.prevVout,
                    date: blockDate,
                });
            }
            continue;
        }

        if (isKnownDuplicateCoinbaseRepeat(event.txid, blockHeight)) {
            continue;
        }

        const createKey = utxoOutpointKey(event.txid, event.vout);
        state.pending.set(createKey, {
            script: event.script,
            sats: event.sats,
            createdHeight: blockHeight,
        });
        addDelta(state, event.script, event.sats, blockDate);
    }
};

/**
 * Flush accumulated UTXO/balance state with a few statements.
 * Spends use DELETE … RETURNING (no separate SELECT).
 */
export const flushUtxoApplyState = async (
    client: PgClient,
    state: UtxoApplyState,
): Promise<void> => {
    if (state.unresolvedSpends.length > 0) {
        const txidBuffers = state.unresolvedSpends.map(s =>
            txidHexToBuffer(s.prevTxid),
        );
        const vouts = state.unresolvedSpends.map(s => s.prevVout);
        const result = await client.query(
            `DELETE FROM utxos
             WHERE (txid, vout) IN (
                 SELECT * FROM UNNEST($1::bytea[], $2::smallint[])
             )
             RETURNING encode(txid, 'hex') AS txid_hex, vout, output_script, sats`,
            [txidBuffers, vouts],
        );
        const found = new Map<string, ResolvedUtxo>();
        for (const row of result.rows as Array<{
            txid_hex: string;
            vout: number;
            output_script: string;
            sats: string | number | bigint;
        }>) {
            found.set(utxoOutpointKey(row.txid_hex, row.vout), {
                script: row.output_script,
                sats: BigInt(row.sats),
            });
        }

        for (const spend of state.unresolvedSpends) {
            const key = utxoOutpointKey(spend.prevTxid, spend.prevVout);
            const utxo = found.get(key);
            if (!utxo) {
                throw new Error(
                    `Missing UTXO for spend ${spend.prevTxid}:${spend.prevVout}`,
                );
            }
            addDelta(state, utxo.script, -utxo.sats, spend.date);
        }
    }

    const createsTxid: Buffer[] = [];
    const createsVout: number[] = [];
    const createsScript: string[] = [];
    const createsSats: bigint[] = [];
    const createsHeight: number[] = [];

    for (const [key, utxo] of state.pending) {
        const colonIdx = key.lastIndexOf(':');
        const txidHex = key.slice(0, colonIdx);
        const vout = Number(key.slice(colonIdx + 1));
        createsTxid.push(txidHexToBuffer(txidHex));
        createsVout.push(vout);
        createsScript.push(utxo.script);
        createsSats.push(utxo.sats);
        createsHeight.push(utxo.createdHeight);
    }

    if (createsTxid.length > 0) {
        await client.query(
            `INSERT INTO utxos (txid, vout, output_script, sats, created_height)
             SELECT * FROM UNNEST($1::bytea[], $2::smallint[], $3::text[], $4::bigint[], $5::integer[])
             ON CONFLICT (txid, vout) DO NOTHING`,
            [
                createsTxid,
                createsVout,
                createsScript,
                createsSats,
                createsHeight,
            ],
        );
    }

    if (state.balanceDelta.size > 0) {
        const scripts: string[] = [];
        const dates: string[] = [];
        const deltas: bigint[] = [];
        for (const [script, delta] of state.balanceDelta) {
            if (delta === 0n) {
                continue;
            }
            scripts.push(script);
            dates.push(state.firstSeenDate.get(script) ?? '');
            deltas.push(delta);
        }
        if (scripts.length > 0) {
            await client.query(
                `INSERT INTO addresses (output_script, first_seen, balance_sats)
                 SELECT s, d::date, delta
                 FROM UNNEST($1::text[], $2::text[], $3::bigint[]) AS t(s, d, delta)
                 ON CONFLICT (output_script) DO UPDATE SET
                     balance_sats = addresses.balance_sats + EXCLUDED.balance_sats`,
                [scripts, dates, deltas],
            );
        }
    }
};

/**
 * Apply UTXO events for many blocks in height order: one in-memory replay,
 * then a small number of SQL statements for the whole batch.
 */
export async function applyUtxoEventsBatch(
    client: PgClient,
    blocks: UtxoBlockApplyInput[],
    onBlockReplayed?: () => void,
    onBeforeFlush?: () => void,
): Promise<void> {
    if (blocks.length === 0) {
        return;
    }

    const state = createState();
    for (const block of blocks) {
        replayUtxoEvents(state, block.height, block.date, block.events);
        onBlockReplayed?.();
    }
    onBeforeFlush?.();
    await flushUtxoApplyState(client, state);
}

/**
 * Apply ordered UTXO creates/spends for one block inside an open transaction.
 * Maintains `utxos` and incremental `addresses.balance_sats`.
 */
export async function applyUtxoEvents(
    client: PgClient,
    blockHeight: number,
    blockDate: string,
    events: UtxoEvent[],
): Promise<void> {
    await applyUtxoEventsBatch(client, [
        { height: blockHeight, date: blockDate, events },
    ]);
}

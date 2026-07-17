// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    ResolvedTokenUtxo,
    TokenUtxoEvent,
    bigintToNumericParam,
    tokenBalanceKey,
    txidHexToBuffer,
    utxoOutpointKey,
} from './tokenTypes';

interface PgClient {
    query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
}

export interface TokenBlockApplyInput {
    height: number;
    events: TokenUtxoEvent[];
}

interface PendingTokenUtxo extends ResolvedTokenUtxo {
    createdHeight: number;
}

interface TokenApplyState {
    pending: Map<string, PendingTokenUtxo>;
    balanceDelta: Map<string, bigint>;
    balanceMeta: Map<
        string,
        {
            tokenId: string;
            script: string;
            isMintBaton: boolean;
            tokenProtocol: string;
            tokenType: string;
        }
    >;
    unresolvedSpends: Array<{ prevTxid: string; prevVout: number }>;
    /** token_id → first-seen metadata for `tokens` table */
    seenTokens: Map<
        string,
        {
            tokenProtocol: string;
            tokenType: string;
            firstSeenHeight: number;
        }
    >;
}

const createState = (): TokenApplyState => ({
    pending: new Map(),
    balanceDelta: new Map(),
    balanceMeta: new Map(),
    unresolvedSpends: [],
    seenTokens: new Map(),
});

const addDelta = (
    state: TokenApplyState,
    tokenId: string,
    script: string,
    isMintBaton: boolean,
    tokenProtocol: string,
    tokenType: string,
    delta: bigint,
) => {
    const key = tokenBalanceKey(tokenId, script, isMintBaton);
    state.balanceDelta.set(key, (state.balanceDelta.get(key) ?? 0n) + delta);
    if (!state.balanceMeta.has(key)) {
        state.balanceMeta.set(key, {
            tokenId,
            script,
            isMintBaton,
            tokenProtocol,
            tokenType,
        });
    }
};

/**
 * Replay one block's token UTXO events into shared batch state (no SQL).
 */
export const replayTokenUtxoEvents = (
    state: TokenApplyState,
    blockHeight: number,
    events: TokenUtxoEvent[],
): void => {
    if (events.length === 0) {
        return;
    }

    for (const event of events) {
        if (event.type === 'spend') {
            const key = utxoOutpointKey(event.prevTxid, event.prevVout);
            const pending = state.pending.get(key);
            if (pending) {
                state.pending.delete(key);
                addDelta(
                    state,
                    pending.tokenId,
                    pending.script,
                    pending.isMintBaton,
                    pending.tokenProtocol,
                    pending.tokenType,
                    -pending.atoms,
                );
            } else {
                state.unresolvedSpends.push({
                    prevTxid: event.prevTxid,
                    prevVout: event.prevVout,
                });
            }
            continue;
        }

        const createKey = utxoOutpointKey(event.txid, event.vout);
        state.pending.set(createKey, {
            script: event.script,
            tokenId: event.tokenId,
            atoms: event.atoms,
            isMintBaton: event.isMintBaton,
            tokenProtocol: event.tokenProtocol,
            tokenType: event.tokenType,
            createdHeight: blockHeight,
        });
        addDelta(
            state,
            event.tokenId,
            event.script,
            event.isMintBaton,
            event.tokenProtocol,
            event.tokenType,
            event.atoms,
        );
        if (!state.seenTokens.has(event.tokenId)) {
            state.seenTokens.set(event.tokenId, {
                tokenProtocol: event.tokenProtocol,
                tokenType: event.tokenType,
                firstSeenHeight: blockHeight,
            });
        }
    }
};

/**
 * Flush accumulated token UTXO/balance state with a few statements.
 */
export const flushTokenApplyState = async (
    client: PgClient,
    state: TokenApplyState,
): Promise<void> => {
    if (
        state.pending.size === 0 &&
        state.unresolvedSpends.length === 0 &&
        state.balanceDelta.size === 0
    ) {
        return;
    }

    if (state.unresolvedSpends.length > 0) {
        const txidBuffers = state.unresolvedSpends.map(s =>
            txidHexToBuffer(s.prevTxid),
        );
        const vouts = state.unresolvedSpends.map(s => s.prevVout);
        const result = await client.query(
            `DELETE FROM token_utxos
             WHERE (txid, vout) IN (
                 SELECT * FROM UNNEST($1::bytea[], $2::smallint[])
             )
             RETURNING encode(txid, 'hex') AS txid_hex, vout, output_script,
                       token_id, atoms, is_mint_baton, token_protocol, token_type`,
            [txidBuffers, vouts],
        );
        const found = new Map<string, ResolvedTokenUtxo>();
        for (const row of result.rows as Array<{
            txid_hex: string;
            vout: number;
            output_script: string;
            token_id: string;
            atoms: string | number | bigint;
            is_mint_baton: boolean;
            token_protocol: string;
            token_type: string;
        }>) {
            found.set(utxoOutpointKey(row.txid_hex, row.vout), {
                script: row.output_script,
                tokenId: row.token_id,
                atoms: BigInt(row.atoms),
                isMintBaton: row.is_mint_baton,
                tokenProtocol: row.token_protocol,
                tokenType: row.token_type,
            });
        }

        for (const spend of state.unresolvedSpends) {
            const key = utxoOutpointKey(spend.prevTxid, spend.prevVout);
            const utxo = found.get(key);
            if (!utxo) {
                throw new Error(
                    `Missing token UTXO for spend ${spend.prevTxid}:${spend.prevVout}`,
                );
            }
            addDelta(
                state,
                utxo.tokenId,
                utxo.script,
                utxo.isMintBaton,
                utxo.tokenProtocol,
                utxo.tokenType,
                -utxo.atoms,
            );
        }
    }

    const createsTxid: Buffer[] = [];
    const createsVout: number[] = [];
    const createsScript: string[] = [];
    const createsTokenId: string[] = [];
    const createsAtoms: bigint[] = [];
    const createsMintBaton: boolean[] = [];
    const createsProtocol: string[] = [];
    const createsType: string[] = [];
    const createsHeight: number[] = [];

    for (const [key, utxo] of state.pending) {
        const colonIdx = key.lastIndexOf(':');
        const txidHex = key.slice(0, colonIdx);
        const vout = Number(key.slice(colonIdx + 1));
        createsTxid.push(txidHexToBuffer(txidHex));
        createsVout.push(vout);
        createsScript.push(utxo.script);
        createsTokenId.push(utxo.tokenId);
        createsAtoms.push(utxo.atoms);
        createsMintBaton.push(utxo.isMintBaton);
        createsProtocol.push(utxo.tokenProtocol);
        createsType.push(utxo.tokenType);
        createsHeight.push(utxo.createdHeight);
    }

    if (createsTxid.length > 0) {
        await client.query(
            `INSERT INTO token_utxos (
                 txid, vout, output_script, token_id, atoms, is_mint_baton,
                 token_protocol, token_type, created_height
             )
             SELECT * FROM UNNEST(
                 $1::bytea[], $2::smallint[], $3::text[], $4::text[], $5::numeric[],
                 $6::boolean[], $7::text[], $8::text[], $9::integer[]
             )
             ON CONFLICT (txid, vout) DO NOTHING`,
            [
                createsTxid,
                createsVout,
                createsScript,
                createsTokenId,
                createsAtoms.map(bigintToNumericParam),
                createsMintBaton,
                createsProtocol,
                createsType,
                createsHeight,
            ],
        );

        const tokenIds: string[] = [];
        const protocols: string[] = [];
        const types: string[] = [];
        const heights: number[] = [];
        const emitted = new Set<string>();
        for (const utxo of state.pending.values()) {
            if (emitted.has(utxo.tokenId)) {
                continue;
            }
            emitted.add(utxo.tokenId);
            const meta = state.seenTokens.get(utxo.tokenId);
            tokenIds.push(utxo.tokenId);
            protocols.push(meta?.tokenProtocol ?? utxo.tokenProtocol);
            types.push(meta?.tokenType ?? utxo.tokenType);
            heights.push(meta?.firstSeenHeight ?? utxo.createdHeight);
        }
        if (tokenIds.length > 0) {
            await client.query(
                `INSERT INTO tokens (token_id, token_protocol, token_type, first_seen_height)
                 SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[], $4::integer[])
                 ON CONFLICT (token_id) DO NOTHING`,
                [tokenIds, protocols, types, heights],
            );
        }
    }

    if (state.balanceDelta.size > 0) {
        const tokenIds: string[] = [];
        const scripts: string[] = [];
        const mintBatons: boolean[] = [];
        const protocols: string[] = [];
        const types: string[] = [];
        const deltas: bigint[] = [];

        for (const [key, delta] of state.balanceDelta) {
            if (delta === 0n) {
                continue;
            }
            const meta = state.balanceMeta.get(key);
            if (!meta) {
                continue;
            }
            tokenIds.push(meta.tokenId);
            scripts.push(meta.script);
            mintBatons.push(meta.isMintBaton);
            protocols.push(meta.tokenProtocol);
            types.push(meta.tokenType);
            deltas.push(delta);
        }

        if (tokenIds.length > 0) {
            await client.query(
                `INSERT INTO token_balances (
                     token_id, output_script, is_mint_baton,
                     token_protocol, token_type, atoms
                 )
                 SELECT tid, s, mb, proto, ttype, delta
                 FROM UNNEST(
                     $1::text[], $2::text[], $3::boolean[],
                     $4::text[], $5::text[], $6::numeric[]
                 ) AS t(tid, s, mb, proto, ttype, delta)
                 ON CONFLICT (token_id, output_script, is_mint_baton) DO UPDATE SET
                     atoms = token_balances.atoms + EXCLUDED.atoms`,
                [
                    tokenIds,
                    scripts,
                    mintBatons,
                    protocols,
                    types,
                    deltas.map(bigintToNumericParam),
                ],
            );
        }
    }
};

/**
 * Apply token UTXO events for many blocks in height order, then flush once.
 */
export async function applyTokenUtxoEventsBatch(
    client: PgClient,
    blocks: TokenBlockApplyInput[],
    onBlockReplayed?: () => void,
): Promise<void> {
    if (blocks.length === 0) {
        return;
    }

    const state = createState();
    let anyEvents = false;
    for (const block of blocks) {
        if (block.events.length > 0) {
            anyEvents = true;
        }
        replayTokenUtxoEvents(state, block.height, block.events);
        onBlockReplayed?.();
    }
    if (!anyEvents && state.unresolvedSpends.length === 0) {
        return;
    }
    await flushTokenApplyState(client, state);
}

/**
 * Apply ordered token creates/spends for one block inside an open transaction.
 * Maintains `token_utxos` and incremental `token_balances`.
 */
export async function applyTokenUtxoEvents(
    client: PgClient,
    blockHeight: number,
    events: TokenUtxoEvent[],
): Promise<void> {
    await applyTokenUtxoEventsBatch(client, [{ height: blockHeight, events }]);
}

// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { UtxoEvent, utxoOutpointKey } from './utxoTypes';

export const rawScriptHex = (
    outputScript: string | Uint8Array | undefined,
): string => {
    if (!outputScript) {
        return '';
    }
    return typeof outputScript === 'string'
        ? outputScript
        : Buffer.from(outputScript).toString('hex');
};

/** Collect UTXO events for one block (mirrors ChronikService.collectUtxoEvents).
 *
 * eCash blocks use CTOR (txid sort), so a child tx can appear *before* its
 * parent in `blockTxs`. Emit all creates before spends so same-block
 * create→spend still resolves via the in-memory pending map.
 */
export function collectUtxoEventsFromBlockTxs(blockTxs: any[]): UtxoEvent[] {
    const creates: UtxoEvent[] = [];
    const spends: UtxoEvent[] = [];

    for (const tx of blockTxs) {
        const txid =
            typeof tx.txid === 'string'
                ? tx.txid
                : Buffer.from(tx.txid).toString('hex');

        if (!tx.isCoinbase && tx.inputs) {
            for (const input of tx.inputs) {
                if (!input.prevOut) {
                    continue;
                }
                const prevTxid =
                    typeof input.prevOut.txid === 'string'
                        ? input.prevOut.txid
                        : Buffer.from(input.prevOut.txid).toString('hex');
                spends.push({
                    type: 'spend',
                    prevTxid,
                    prevVout: Number(input.prevOut.outIdx),
                });
            }
        }

        if (tx.outputs) {
            let vout = 0;
            for (const output of tx.outputs) {
                const rawHex = rawScriptHex(output.outputScript);
                if (rawHex.startsWith('6a')) {
                    vout++;
                    continue;
                }
                creates.push({
                    type: 'create',
                    txid,
                    vout,
                    script: rawHex,
                    sats: BigInt(output.sats ?? 0),
                });
                vout++;
            }
        }
    }

    return [...creates, ...spends];
}

export interface EmptyScriptUtxoCreate {
    txid: string;
    vout: number;
    sats: bigint;
}

/**
 * Empty-script outputs that should exist in `utxos` after this block is applied
 * (excludes outputs spent later in the same block).
 */
export function emptyScriptUtxosAtBlockEnd(
    blockTxs: any[],
): EmptyScriptUtxoCreate[] {
    const events = collectUtxoEventsFromBlockTxs(blockTxs);
    const blockPending = new Map<string, EmptyScriptUtxoCreate>();

    for (const event of events) {
        if (event.type === 'spend') {
            blockPending.delete(
                utxoOutpointKey(event.prevTxid, event.prevVout),
            );
            continue;
        }
        if (event.script !== '') {
            continue;
        }
        blockPending.set(utxoOutpointKey(event.txid, event.vout), {
            txid: event.txid,
            vout: event.vout,
            sats: event.sats,
        });
    }

    return [...blockPending.values()];
}

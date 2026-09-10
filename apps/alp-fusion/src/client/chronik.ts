// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Chronik helpers for a wire fusion round: load P2PKH UTXOs into
 * {@link WireContribution} inputs, and broadcast a signed fused tx.
 *
 * Live wallet selection policy stays thin — callers pick keys and outputs.
 * Tests use MockChronikClient.
 */
import type { ScriptUtxo } from 'chronik-client';
import { Script, shaRmd160, toHex } from 'ecash-lib';

import type { WireFuelInput, WireTokenInput } from '../protocol/components.js';
import type { FusionInputKey } from '../tx/sign.js';

/** Chronik-shaped broadcast used by the coordinator and client. */
export interface FusionBroadcaster {
    broadcastTx(
        rawTx: Uint8Array | string,
        skipTokenChecks?: boolean,
    ): Promise<{ txid: string }>;
}

/** Chronik-shaped script UTXO fetch (ChronikClient / MockChronikClient). */
export interface FusionChronik extends FusionBroadcaster {
    script(
        type: 'p2pkh',
        hash: string,
    ): { utxos: () => Promise<{ utxos: ScriptUtxo[] }> };
}

/**
 * Broadcast a signed fused tx. Hex form matches MockChronikClient keys.
 *
 * @param chronik - ChronikClient or MockChronikClient
 * @param rawTx - Signed tx bytes
 */
export async function broadcastFusionTx(
    chronik: FusionBroadcaster,
    rawTx: Uint8Array,
): Promise<{ txid: string }> {
    if (rawTx.length === 0) {
        throw new Error('broadcastFusionTx: empty rawTx');
    }
    return chronik.broadcastTx(toHex(rawTx));
}

/**
 * Fetch P2PKH UTXOs for `keys` and split ALP `tokenId` coins from pure XEC
 * fuel. Mint batons, other token IDs, and non-ALP (e.g. SLP) coins are skipped.
 *
 * @param chronik - ChronikClient or MockChronikClient
 * @param keys - P2PKH keypairs to query
 * @param tokenId - 64-char hex ALP token id
 */
export async function loadWireInputsFromChronik(
    chronik: FusionChronik,
    keys: FusionInputKey[],
    tokenId: string,
): Promise<{ tokenInputs: WireTokenInput[]; fuelInputs: WireFuelInput[] }> {
    if (keys.length === 0) {
        throw new Error('loadWireInputsFromChronik: no keys');
    }
    const tokenInputs: WireTokenInput[] = [];
    const fuelInputs: WireFuelInput[] = [];
    const want = tokenId.toLowerCase();
    for (const key of keys) {
        if (key.pubkey.length !== 33) {
            throw new Error(
                'loadWireInputsFromChronik: pubkey must be 33 bytes',
            );
        }
        const pkh = toHex(shaRmd160(key.pubkey));
        const { utxos } = await chronik.script('p2pkh', pkh).utxos();
        const script = Script.p2pkh(shaRmd160(key.pubkey));
        for (const utxo of utxos) {
            const prevOut = {
                txid: utxo.outpoint.txid.toLowerCase(),
                outIdx: utxo.outpoint.outIdx,
            };
            const token = utxo.token;
            if (token === undefined) {
                fuelInputs.push({
                    prevOut,
                    sats: utxo.sats,
                    script,
                    atoms: 0n,
                    pubkey: key.pubkey,
                    sk: key.sk,
                });
                continue;
            }
            if (
                token.isMintBaton ||
                token.tokenId.toLowerCase() !== want ||
                token.tokenType.protocol !== 'ALP'
            ) {
                continue;
            }
            tokenInputs.push({
                prevOut,
                sats: utxo.sats,
                script,
                tokenId: want,
                atoms: token.atoms,
                pubkey: key.pubkey,
                sk: key.sk,
            });
        }
    }
    return { tokenInputs, fuelInputs };
}

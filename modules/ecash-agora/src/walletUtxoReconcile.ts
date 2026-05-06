// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Tx, TokenType } from 'ecash-lib';
import {
    Wallet,
    getWalletUtxoFromOutput,
    removeSpentUtxos,
} from 'ecash-wallet';

/** Metadata for a wallet-owned token output created by an Agora tx. */
export type AgoraReconcileTokenOut = {
    txIndex: number;
    outIdx: number;
    tokenId: string;
    atoms: bigint;
    tokenType: TokenType;
    isMintBaton?: boolean;
};

/**
 * After a successful Chronik broadcast, update {@link Wallet.utxos} in-memory
 * from the mined/broadcast txs (no `sync()`): remove spent coins and append
 * new wallet outputs.
 *
 * @param wallet - Wallet that signed / funded the txs
 * @param txs - Txs as broadcast (same order as `broadcastedTxids`)
 * @param broadcastedTxids - Txids returned from broadcast (same length as txs)
 * @param tokenOutputs - Explicit token outputs to wallet (`getWalletUtxoFromOutput` needs token metadata)
 * @param options.skipAddOutputsForTxIndices - Do not append outputs for these tx indexes
 * (e.g. tx already applied by `wallet.action(...).build()` optimistic update)
 */
export function reconcileWalletUtxosAfterBroadcasts(
    wallet: Wallet,
    txs: Tx[],
    broadcastedTxids: string[],
    tokenOutputs: AgoraReconcileTokenOut[],
    options?: {
        skipAddOutputsForTxIndices?: Set<number>;
    },
): void {
    if (broadcastedTxids.length !== txs.length) {
        throw new Error(
            `broadcastedTxids length ${broadcastedTxids.length} != txs length ${txs.length}`,
        );
    }
    const skipAdds = options?.skipAddOutputsForTxIndices ?? new Set();

    const tokenKey = (txIndex: number, outIdx: number) =>
        `${txIndex}:${outIdx}`;
    const explicitTokenOuts = new Set(
        tokenOutputs.map(t => tokenKey(t.txIndex, t.outIdx)),
    );
    const tokenMetaByKey = new Map(
        tokenOutputs.map(t => [tokenKey(t.txIndex, t.outIdx), t]),
    );

    for (let txIndex = 0; txIndex < txs.length; txIndex++) {
        const tx = txs[txIndex];
        const txid = broadcastedTxids[txIndex];
        removeSpentUtxos(wallet, tx);

        if (skipAdds.has(txIndex)) {
            continue;
        }

        for (let i = 0; i < tx.outputs.length; i++) {
            const output = tx.outputs[i];
            if (output.sats === 0n || !wallet.isWalletScript(output.script)) {
                continue;
            }

            const tKey = tokenKey(txIndex, i);
            const tokenMeta = tokenMetaByKey.get(tKey);

            if (explicitTokenOuts.has(tKey)) {
                const meta = tokenMeta!;
                wallet.utxos.push(
                    getWalletUtxoFromOutput(
                        {
                            sats: output.sats,
                            script: output.script,
                            tokenId: meta.tokenId,
                            atoms: meta.atoms,
                            isMintBaton: meta.isMintBaton ?? false,
                        },
                        txid,
                        i,
                        output.script.toHex(),
                        meta.tokenType,
                        wallet.prefix,
                    ),
                );
            } else {
                wallet.utxos.push(
                    getWalletUtxoFromOutput(
                        output,
                        txid,
                        i,
                        output.script.toHex(),
                        undefined,
                        wallet.prefix,
                    ),
                );
            }
        }
    }

    wallet.updateBalance();
}

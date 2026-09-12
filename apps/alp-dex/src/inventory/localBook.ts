// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    ALP_TOKEN_TYPE_STANDARD,
    DEFAULT_DUST_SATS,
    toHex,
    type Tx,
} from 'ecash-lib';
import type { Wallet, WalletUtxo } from 'ecash-wallet';
import type { ParsedPartiallySignedSwap } from '../settle/parseSwap';
import type { TradedTokens } from '../tokens/tradedTokens';

export type Outpoint = {
    txid: string;
    outIdx: number;
};

export type LocalFill = {
    slushUtxos: WalletUtxo[];
    sellerSpent: Outpoint[];
};

/**
 * Normalize a prev-out txid to the hex string Chronik / WalletUtxo use.
 */
export const outpointTxidHex = (txid: string | Uint8Array): string =>
    typeof txid === 'string' ? txid : toHex(txid);

const outpointKey = (txid: string, outIdx: number): string =>
    `${txid}:${outIdx}`;

const sellerHasOutpoint = (seller: Wallet, spent: Outpoint): boolean =>
    seller.utxos.some(
        utxo =>
            utxo.outpoint.txid === spent.txid &&
            utxo.outpoint.outIdx === spent.outIdx,
    );

/**
 * Slush token outs from a parsed settle tx, addressed with the broadcast
 * txid so seller+slush atom sums stay current before Chronik indexes.
 */
export const slushUtxosFromFill = (
    tx: Tx,
    txid: string,
    slush: Wallet,
    slushScriptHex: string,
    parsedSwap: ParsedPartiallySignedSwap,
    tradedTokens: TradedTokens,
): WalletUtxo[] => {
    const used = new Set<number>();
    const utxos: WalletUtxo[] = [];
    for (const output of parsedSwap.outputs) {
        if (output.script !== slushScriptHex || output.atoms <= 0n) {
            continue;
        }
        const outIdx = tx.outputs.findIndex((txOut, index) => {
            if (used.has(index)) {
                return false;
            }
            return txOut.script.toHex() === slushScriptHex;
        });
        if (outIdx < 0) {
            continue;
        }
        used.add(outIdx);
        const tokenType =
            tradedTokens.get(output.tokenId)?.tokenType ??
            ALP_TOKEN_TYPE_STANDARD;
        utxos.push({
            outpoint: { txid, outIdx },
            blockHeight: -1,
            isCoinbase: false,
            sats: tx.outputs[outIdx]?.sats ?? DEFAULT_DUST_SATS,
            isFinal: false,
            token: {
                tokenId: output.tokenId,
                tokenType,
                atoms: output.atoms,
                isMintBaton: false,
            },
            address: slush.address,
        });
    }
    return utxos;
};

/**
 * Append slush UTXOs that are not already in the wallet set.
 */
export const applySlushUtxos = (slush: Wallet, utxos: WalletUtxo[]): void => {
    const have = new Set(
        slush.utxos.map(utxo =>
            outpointKey(utxo.outpoint.txid, utxo.outpoint.outIdx),
        ),
    );
    for (const utxo of utxos) {
        const key = outpointKey(utxo.outpoint.txid, utxo.outpoint.outIdx);
        if (have.has(key)) {
            continue;
        }
        slush.utxos.push(utxo);
        have.add(key);
    }
    slush.updateBalance();
};

/**
 * Drop seller UTXOs spent by a local fill.
 */
export const removeSellerOutpoints = (
    seller: Wallet,
    spent: Outpoint[],
): void => {
    if (spent.length === 0) {
        return;
    }
    const drop = new Set(
        spent.map(outpoint => outpointKey(outpoint.txid, outpoint.outIdx)),
    );
    seller.utxos = seller.utxos.filter(
        utxo =>
            !drop.has(outpointKey(utxo.outpoint.txid, utxo.outpoint.outIdx)),
    );
    seller.updateBalance();
};

/**
 * In-memory fills Chronik has not shown as seller spends yet.
 *
 * Quotes and settle price from seller+slush atom sums. Postage removes
 * seller spends but does not credit slush, and `sync()` can restore a
 * pre-fill UTXO set until Chronik indexes the tx.
 */
export class LocalBook {
    private fills: LocalFill[] = [];

    /**
     * Credit slush from this fill. Seller spends are already removed by
     * `addFuelAndSign`.
     */
    record(fill: LocalFill, slush: Wallet): void {
        applySlushUtxos(slush, fill.slushUtxos);
        this.fills.push(fill);
    }

    /**
     * After seller+slush `sync()`, keep fills Chronik has not spent yet.
     *
     * Indexed signal is spent seller outpoints missing after sync — not
     * leftover slush UTXOs (maintain may have already moved those).
     */
    afterSync(seller: Wallet, slush: Wallet): void {
        this.fills = this.fills.filter(fill => {
            const stillUnindexed = fill.sellerSpent.some(outpoint =>
                sellerHasOutpoint(seller, outpoint),
            );
            if (!stillUnindexed) {
                return false;
            }
            removeSellerOutpoints(seller, fill.sellerSpent);
            applySlushUtxos(slush, fill.slushUtxos);
            return true;
        });
    }
}

/**
 * Chronik refresh of both LP wallets, then re-apply local fills.
 */
export const syncLpWallets = async (
    seller: Wallet,
    slush: Wallet,
    localBook?: LocalBook,
): Promise<void> => {
    await Promise.all([seller.sync(), slush.sync()]);
    localBook?.afterSync(seller, slush);
};

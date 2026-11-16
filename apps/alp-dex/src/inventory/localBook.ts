// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChronikError, type ChronikClient } from 'chronik-client';
import {
    ALP_TOKEN_TYPE_STANDARD,
    DEFAULT_DUST_SATS,
    toHex,
    type Tx,
} from 'ecash-lib';
import type { Wallet, WalletUtxo } from 'ecash-wallet';
import { SETTLE_PENDING_UNSEEN_MS } from '../constants';
import { ValidationError } from '../methods/errors';
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
 * A settle Chronik accepted whose tx is not avalanche-final yet.
 *
 * Seller coins stay out of the wallet so the next settle and maintain
 * cannot spend them. Slush is credited only once the tx is final.
 */
export type PendingSettle = {
    txid: string;
    slushUtxos: WalletUtxo[];
    sellerSpent: Outpoint[];
    /** Chronik has returned this tx at least once. */
    seen: boolean;
    heldAtMs: number;
    /**
     * Tokens this hold has only half-applied: seller inventory is gone
     * and the slush deposit is not credited yet.
     */
    tokenIds: string[];
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
            // Recorded only after the settle tx is avalanche-final, so the
            // atoms stay in the quoted book if Chronik sync is a step behind.
            isFinal: true,
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
    const index = new Map(
        slush.utxos.map(utxo => [
            outpointKey(utxo.outpoint.txid, utxo.outpoint.outIdx),
            utxo,
        ]),
    );
    let changed = false;
    for (const utxo of utxos) {
        const key = outpointKey(utxo.outpoint.txid, utxo.outpoint.outIdx);
        const existing = index.get(key);
        if (existing === undefined) {
            slush.utxos.push(utxo);
            index.set(key, utxo);
            changed = true;
            continue;
        }
        // Chronik may have indexed this out as unfinal before we book
        // the fill. Leaving isFinal false drops the atoms from reserves
        // after the overlay is removed.
        if (utxo.isFinal === true && existing.isFinal !== true) {
            existing.isFinal = true;
            changed = true;
        }
    }
    if (changed) {
        slush.updateBalance();
    }
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
const lookupPendingTx = async (
    chronik: Pick<ChronikClient, 'tx'>,
    txid: string,
): Promise<'final' | 'open' | 'missing'> => {
    try {
        const tx = await chronik.tx(txid);
        if (tx == null) {
            return 'missing';
        }
        return tx.isFinal === true ? 'final' : 'open';
    } catch (err) {
        if (err instanceof ChronikError && err.status === 404) {
            return 'missing';
        }
        throw err;
    }
};

export class LocalBook {
    private fills: LocalFill[] = [];
    private pending: PendingSettle[] = [];

    /**
     * Credit slush from this fill. Seller spends are already removed by
     * `addFuelAndSign`.
     */
    record(fill: LocalFill, slush: Wallet): void {
        applySlushUtxos(slush, fill.slushUtxos);
        this.fills.push(fill);
    }

    /**
     * Remember a broadcast Chronik accepted that did not finalize in time.
     * Seller spends are already removed; this does not credit slush.
     */
    hold(pending: PendingSettle): void {
        this.pending.push(pending);
    }

    /**
     * True when `tokenId` is only half-applied by a pending settle.
     */
    pricingPaused(tokenId: string): boolean {
        const id = tokenId.toLowerCase();
        return this.pending.some(held =>
            held.tokenIds.some(token => token.toLowerCase() === id),
        );
    }

    /**
     * Refuse a price on a pair whose pending fill has debited inventory
     * without crediting the deposit.
     */
    assertPricingOpen(fromTokenId: string, toTokenId: string): void {
        if (this.pricingPaused(fromTokenId) || this.pricingPaused(toTokenId)) {
            throw new ValidationError(
                'A fill on this pair is pending finality',
            );
        }
    }

    /**
     * Book a pending settle once its tx is final, or drop the hold once
     * the tx is gone and its seller coins are unspent. Otherwise keep
     * those coins withheld.
     */
    async reconcilePending(
        chronik: Pick<ChronikClient, 'tx'>,
        seller: Wallet,
        slush: Wallet,
    ): Promise<void> {
        if (this.pending.length === 0) {
            return;
        }
        const now = Date.now();
        const still: PendingSettle[] = [];
        for (const held of this.pending) {
            const state = await lookupPendingTx(chronik, held.txid);
            if (state === 'final') {
                this.record(
                    {
                        slushUtxos: held.slushUtxos,
                        sellerSpent: held.sellerSpent,
                    },
                    slush,
                );
                continue;
            }
            const allPresent = held.sellerSpent.every(outpoint =>
                sellerHasOutpoint(seller, outpoint),
            );
            const expiredUnseen =
                !held.seen && now - held.heldAtMs >= SETTLE_PENDING_UNSEEN_MS;
            if (
                state === 'missing' &&
                allPresent &&
                (held.seen || expiredUnseen)
            ) {
                continue;
            }
            if (state === 'open') {
                held.seen = true;
            }
            removeSellerOutpoints(seller, held.sellerSpent);
            still.push(held);
        }
        this.pending = still;
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
    if (localBook !== undefined) {
        await localBook.reconcilePending(seller.chronik, seller, slush);
        localBook.afterSync(seller, slush);
    }
};

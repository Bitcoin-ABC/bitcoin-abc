// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChronikClient, Tx } from 'chronik-client';

const DEFAULT_POLL_INTERVAL_MS = 500;
const DEFAULT_POLL_TIMEOUT_MS = 90_000;

type RedeemResolver = (redeemTxid: string) => void;

const pendingResolvers = new Map<string, RedeemResolver>();
const pendingPromises = new Map<string, Promise<string>>();

/** Offer and sale txids for instant redeems that already completed. */
const recentRedeemOfferTxids: string[] = [];
const recentRedeemSaleTxids: string[] = [];
const MAX_RECENT_INSTANT_REDEEMS = 20;

const rememberInstantRedeem = (offerTxid: string, saleTxid: string): void => {
    if (!recentRedeemOfferTxids.includes(offerTxid)) {
        recentRedeemOfferTxids.push(offerTxid);
    }
    if (!recentRedeemSaleTxids.includes(saleTxid)) {
        recentRedeemSaleTxids.push(saleTxid);
    }
    while (recentRedeemOfferTxids.length > MAX_RECENT_INSTANT_REDEEMS) {
        recentRedeemOfferTxids.shift();
    }
    while (recentRedeemSaleTxids.length > MAX_RECENT_INSTANT_REDEEMS) {
        recentRedeemSaleTxids.shift();
    }
};

const isRecentInstantRedeemSale = (tx: Tx): boolean => {
    if (recentRedeemSaleTxids.includes(tx.txid)) {
        return true;
    }
    for (const input of tx.inputs) {
        const prevTxid = input.prevOut?.txid;
        if (
            typeof prevTxid === 'string' &&
            recentRedeemOfferTxids.includes(prevTxid)
        ) {
            return true;
        }
    }
    return false;
};

/**
 * Register an Agora listing txid that we expect the XECX/FIRMA hot wallet
 * to take. Resolves with the redeem (accept) txid when
 * {@link resolvePendingRedeem} or {@link completePendingRedeemFromTx} runs.
 */
export const createPendingRedeem = (offerTxid: string): Promise<string> => {
    const existing = pendingPromises.get(offerTxid);
    if (typeof existing !== 'undefined') {
        return existing;
    }
    let resolve!: RedeemResolver;
    const promise = new Promise<string>(res => {
        resolve = res;
    });
    pendingResolvers.set(offerTxid, resolve);
    pendingPromises.set(offerTxid, promise);
    return promise;
};

/**
 * Resolve a pending instant redeem. Returns true if this offer was waiting.
 */
export const resolvePendingRedeem = (
    offerTxid: string,
    redeemTxid: string,
): boolean => {
    const resolve = pendingResolvers.get(offerTxid);
    if (typeof resolve === 'undefined') {
        return false;
    }
    pendingResolvers.delete(offerTxid);
    pendingPromises.delete(offerTxid);
    rememberInstantRedeem(offerTxid, redeemTxid);
    resolve(redeemTxid);
    return true;
};

/**
 * If this tx spends a pending redeem offer, complete that redeem.
 */
export const completePendingRedeemFromTx = (tx: Tx): boolean => {
    for (const input of tx.inputs) {
        const prevTxid = input.prevOut?.txid;
        if (
            typeof prevTxid === 'string' &&
            resolvePendingRedeem(prevTxid, tx.txid)
        ) {
            return true;
        }
    }
    return false;
};

/**
 * True if this Agora sale is the take of an in-flight or just-completed
 * instant XECX/FIRMA redeem. Used to skip the generic "Sold ..." toast
 * even when the poll marked the redeem done before the websocket arrives.
 */
export const shouldSuppressInstantRedeemSaleToast = (tx: Tx): boolean => {
    if (isRecentInstantRedeemSale(tx)) {
        return true;
    }
    return completePendingRedeemFromTx(tx);
};

/**
 * Drop a pending redeem without resolving (toast dismissed, test cleanup).
 */
export const clearPendingRedeem = (offerTxid: string): void => {
    pendingResolvers.delete(offerTxid);
    pendingPromises.delete(offerTxid);
};

/**
 * Drop all pending redeems. For tests only.
 */
export const clearAllPendingRedeems = (): void => {
    pendingResolvers.clear();
    pendingPromises.clear();
    recentRedeemOfferTxids.length = 0;
    recentRedeemSaleTxids.length = 0;
};

/**
 * True when we know the XECX or FIRMA hot wallet can cover this redeem.
 */
export const isHotWalletCoveredRedeem = ({
    isXecxRedeem,
    isFirmaRedeem,
    offeredAtoms,
    askedSats,
    xecxSweeperBalanceSats,
    maxFirmaRedeemSats,
}: {
    isXecxRedeem: boolean;
    isFirmaRedeem: boolean;
    offeredAtoms: bigint;
    askedSats: bigint;
    xecxSweeperBalanceSats: bigint | null;
    maxFirmaRedeemSats: bigint | null;
}): boolean => {
    if (isXecxRedeem) {
        return (
            xecxSweeperBalanceSats !== null &&
            offeredAtoms <= xecxSweeperBalanceSats
        );
    }
    if (isFirmaRedeem) {
        return maxFirmaRedeemSats !== null && maxFirmaRedeemSats > askedSats;
    }
    return false;
};

const sleep = (ms: number, signal?: AbortSignal): Promise<void> => {
    return new Promise(resolve => {
        const timer = setTimeout(resolve, ms);
        if (typeof signal === 'undefined') {
            return;
        }
        const onAbort = () => {
            clearTimeout(timer);
            resolve();
        };
        if (signal.aborted) {
            onAbort();
            return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
    });
};

/**
 * Poll chronik until a token output of the listing tx is spent (hot wallet
 * accepted) or we time out / abort.
 *
 * @returns redeem txid, or null on timeout/abort
 */
export const waitForAgoraOfferRedeemed = async (
    chronik: ChronikClient,
    offerTxid: string,
    options?: {
        intervalMs?: number;
        timeoutMs?: number;
        signal?: AbortSignal;
    },
): Promise<string | null> => {
    const intervalMs = options?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const timeoutMs = options?.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS;
    const signal = options?.signal;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (signal?.aborted) {
            return null;
        }
        try {
            const tx = await chronik.tx(offerTxid);
            for (const output of tx.outputs) {
                if (
                    typeof output.token !== 'undefined' &&
                    typeof output.spentBy !== 'undefined'
                ) {
                    return output.spentBy.txid;
                }
            }
        } catch {
            // Listing may not be indexed yet
        }
        await sleep(intervalMs, signal);
    }
    return null;
};

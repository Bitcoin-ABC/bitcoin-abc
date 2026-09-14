// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/** Matches apps/alp-dex/SPEC.md Spec version. */
export const SPEC_VERSION = 1;

/**
 * Postage stamp size in sats (10 XEC).
 *
 * Settle uses the postage protocol: the LP attaches exact-size XEC fuel
 * UTXOs so takers (including gasless wallets) do not need to fund miner
 * fees. 1000 sats is the conventional stamp size on eCash — large enough
 * for typical settle fees, small enough to mint many stamps from slush
 * without awkward change. Inventory automation should convert loose slush
 * XEC into this denomination.
 */
export const POSTAGE_SATS = 1000n;

/**
 * Max age of a queued settle before the node refuses to process or
 * broadcast it (20s).
 */
export const SETTLE_MAX_QUEUE_AGE_MS = 20_000;

/** WebSocket path for the in-memory seller+slush book. */
export const BOOK_WS_PATH = '/api/v1/book';

/** Server ping interval so dead Cashtab tabs drop. */
export const BOOK_WS_PING_MS = 30_000;

/**
 * Max inbound WebSocket frame size. `/api/v1/book` is server-push
 * only; clients should not send application data.
 */
export const BOOK_WS_MAX_PAYLOAD = 1024;

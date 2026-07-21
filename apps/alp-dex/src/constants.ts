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

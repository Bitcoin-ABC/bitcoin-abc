// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/** Default dust limit on the eCash network. */
export const DEFAULT_DUST_SATS = 546n;
/** Default fee per kB on the eCash network. */
export const DEFAULT_FEE_SATS_PER_KB = 1000n;

/** Derivation path for non-HD token aware XEC wallets, like ecash-wallet or Cashtab */
export const XEC_TOKEN_AWARE_DERIVATION_PATH = `m/44'/1899'/0'/0/0`;

/**
 * Confirmations required before coinbase utxos
 * are spendable
 *
 * On eCash, coinbase utxos may be
 *
 * - mining rewards
 * - staking rewards
 * - IFP rewards
 */
export const COINBASE_MATURITY = 100;
/**
 * As of May 5, 2025, the max bytes permitted in an OP_RETURN
 * output on the eCash (XEC) network
 *
 * NB SLP spec works within this limit, ALP spec supports actions
 * beyond this limit. For now, ecash-wallet is written accounting
 * for this limit in ALP token action validation.
 */
export const OP_RETURN_MAX_BYTES = 223;

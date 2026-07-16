// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { strToBytes } from 'ecash-lib';

export { CURVE_ORDER } from 'ecash-lib';

/**
 * Protocol constants for alp-fusion.
 *
 * Values marked **Electrum** match Electrum ABC CashFusion
 * (`electrumabc_plugins/fusion/`). Values marked **ALP-only** are unique to
 * this token fusion implementation.
 *
 * Crypto primitives (Pedersen, blind Schnorr, secp256k1 scalars, byte helpers)
 * live in `ecash-lib`.
 */

/** ALP-only: wire / session-hash version tag. Electrum uses `b"alpha13"`. */
export const PROTOCOL_VERSION = strToBytes('alp01');

/**
 * Electrum: Pedersen H for XEC (sats) amounts — exact match of
 * `Protocol.PEDERSEN = PedersenSetup(b"\x02CashFusion gives us fungibility.")`.
 * Leading 0x02 makes this a valid compressed secp256k1 pubkey (nothing-up-my-sleeve).
 */
export const PEDERSEN_H_SATS = strToBytes(
    '\x02CashFusion gives us fungibility.',
);

/**
 * ALP-only: second Pedersen H for token atom amounts. Electrum has no token
 * commitments; domain-separated from `PEDERSEN_H_SATS` so sats and atoms cannot
 * be mixed in a sum check.
 */
export const PEDERSEN_H_TOKEN = strToBytes(
    '\x02ALP Fusion gives us fungibility.',
);

/**
 * Electrum: soft floor for components per player (`fusion.py`
 * `MIN_TX_COMPONENTS = 11`). Servers with `num_components < MIN_TX_COMPONENTS * 1.5`
 * are rejected by the Electrum client.
 */
export const MIN_TX_COMPONENTS = 11;

/** Electrum: hard cap on components per player (`fusion.py` `MAX_COMPONENTS = 40`). */
export const MAX_COMPONENTS = 40;

/**
 * Electrum: default components per player — inputs + outputs + blanks
 * (`server.Params.num_components = 23`).
 */
export const NUM_COMPONENTS = 23;

/**
 * ALP-only: max token outputs per ALP `SEND` (`ecash-lib`
 * `ALP_POLICY_MAX_OUTPUTS`). Irrelevant to XEC CashFusion (no ALP coloring).
 */
export const ALP_MAX_OUTPUTS = 29;

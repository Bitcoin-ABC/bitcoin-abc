// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Transaction fee constants for Cashtab
 */

// Minimum fee rate for XEC transactions (1 sat/byte)
export const FEE_SATS_PER_KB_XEC_MINIMUM = 1000;

// Legacy fee rate used in older Cashtab versions and some tests (2.01 sat/byte)
export const FEE_SATS_PER_KB_CASHTAB_LEGACY = 2010;

// Maximum fee rate placeholder for future user-facing fee setting (12 sat/byte)
// NB this is an arbitrary selection, for now it just shows we can set and validate a max
// There is no user-facing fee setting in the Cashtab UI
export const FEE_SATS_PER_KB_MAXIMUM = 12_000;

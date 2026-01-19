// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Token ID for rewards token
 * HP - Hit Points
 * 0 decimals
 */
export const REWARDS_TOKEN_ID =
    '2d97651979009d535a6832f326c09a3178939ea31ad0f738f11928414a2fb8ef';

/**
 * Registration reward amount in atoms (100 HP, no decimals)
 * NB, as decimals are 0, atoms === token qty
 */
export const REGISTRATION_REWARD_ATOMS = 100n;

/**
 * Registration reward sats
 * Amount of sats we send to a new user on registering
 * NB users are not able to claim or withdraw sats, only tokens
 * We keep sats at all addresses to support onchain user actions
 *
 * Going forward, we could probably work out a better system to handle this
 * with mature HD wallet methods
 */
export const REGISTRATION_REWARD_SATS = 1000_00n; // 1,000.00 XEC

/**
 * LOKAD_ID for EMPP (eCash Message Push Protocol) data pushes
 * Used in all bot transactions for on-chain analytics
 * See README.md for EMPP spec
 */
export const LOKAD_ID = 'XOVM';

/**
 * Target XEC balance for all users (1000 XEC = 100,000 sats)
 * Used by the daily topup cron job to maintain user balances
 */
export const TARGET_XEC_SATS = 1000_00n; // 1,000.00 XEC

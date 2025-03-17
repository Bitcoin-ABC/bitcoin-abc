// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { strToBytes } from '../io/str.js';
import { AlpTokenType } from './alp.js';
import { SlpTokenType } from './slp.js';

/** GENESIS tx type: Creates a new token ID */
export const GENESIS_STR = 'GENESIS';
export const GENESIS = strToBytes(GENESIS_STR);

/** MINT tx type: Mints more of a token ID */
export const MINT_STR = 'MINT';
export const MINT = strToBytes(MINT_STR);

/** SEND tx type: Moves existing tokens to different outputs */
export const SEND_STR = 'SEND';
export const SEND = strToBytes(SEND_STR);

/** BURN tx type: Destroys existing tokens */
export const BURN_STR = 'BURN';
export const BURN = strToBytes(BURN_STR);

/**
 * UNKNOWN: Placeholder for unknown token types.
 * Note: These may hold valuable tokens, but which aren't recognized.
 * They should be excluded from UTXO selection.
 **/
export const UNKNOWN_STR = 'UNKNOWN';

/** Number of bytes in a token ID */
export const TOKEN_ID_NUM_BYTES = 32;

/** How many decimals a token can have at most (SLP/ALP) */
export const MAX_DECIMALS = 9;

/** Genesis info found in GENESIS txs of tokens */
export interface GenesisInfo {
    /** token_ticker of the token */
    tokenTicker?: string;
    /** token_name of the token */
    tokenName?: string;
    /** URL of the token */
    url?: string;
    /** token_document_hash of the token (only on SLP) */
    hash?: string;
    /** mint_vault_scripthash (only on SLP V2 Mint Vault) */
    mintVaultScripthash?: string;
    /** Arbitray payload data of the token (only on ALP) */
    data?: string;
    /** auth_pubkey of the token (only on ALP) */
    authPubkey?: string;
    /** decimals of the token, i.e. how many decimal places the token should be displayed with. */
    decimals?: number;
}

/**
 * SLP/ALP token type.
 *
 * See `TokenType` in chronik-client.
 */
export type TokenType = SlpTokenType | AlpTokenType | UnknownTokenType;

export interface UnknownTokenType {
    protocol: 'UNKNOWN';
    type: 'UNKNOWN';
    number: 0;
}

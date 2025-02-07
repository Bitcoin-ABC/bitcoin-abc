// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { strToBytes } from '../io/str.js';

export const GENESIS = strToBytes('GENESIS');
export const MINT = strToBytes('MINT');
export const SEND = strToBytes('SEND');
export const BURN = strToBytes('BURN');

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

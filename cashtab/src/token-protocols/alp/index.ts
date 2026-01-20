// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { SlpDecimals } from 'wallet';
import { GenesisInfo } from 'chronik-client';

/**
 * Cashtab methods to support ALP tx construction
 * Ref spec at https://ecashbuilders.notion.site/ALP-a862a4130877448387373b9e6a93dd97
 */

// Cashtab creates ALP tokens with user pub key as authPubkey
// Cashtab does not include information for the available ALP "data" key
export type CashtabAlpGenesisInfo = GenesisInfo & {
    authPubkey: string;
};

export const MAX_OUTPUT_AMOUNT_ALP_ATOMS = 0xffffffffffffn;
/**
 * Get the maximum (decimalized) qty of ALP tokens that can be
 * represented in a single ALP output (mint, send, burn, or agora partial list)
 * @param decimals
 * @returns decimalized max amount
 */
export const getMaxDecimalizedAlpQty = (decimals: SlpDecimals): string => {
    const MAX_OUTPUT_AMOUNT_ALP_ATOMS_STRING =
        MAX_OUTPUT_AMOUNT_ALP_ATOMS.toString();
    // The max amount depends on token decimals
    // e.g. if decimals are 0, it's 281474976710655
    // if decimals are 9, it's 281474.976710655
    if (decimals === 0) {
        return MAX_OUTPUT_AMOUNT_ALP_ATOMS_STRING;
    }
    const stringBeforeDecimalPoint = MAX_OUTPUT_AMOUNT_ALP_ATOMS_STRING.slice(
        0,
        MAX_OUTPUT_AMOUNT_ALP_ATOMS_STRING.length - decimals,
    );
    const stringAfterDecimalPoint = MAX_OUTPUT_AMOUNT_ALP_ATOMS_STRING.slice(
        -1 * decimals,
    );
    return `${stringBeforeDecimalPoint}.${stringAfterDecimalPoint}`;
};

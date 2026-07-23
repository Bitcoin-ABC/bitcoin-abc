// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import type { AlpTokenType, ChronikClient } from 'chronik-client';
import {
    tokenIdsFromConfig,
    type ParsedTradedConfig,
} from '../config/tradedConfig';
import { assertDecimals, decimalizedQtyToAtoms } from '../methods/atoms';

export type TradedToken = {
    tokenId: string;
    decimals: number;
    /** Inventory UTXO size in human units (from config). */
    utxoQty: number;
    /** Inventory UTXO size in base atoms. */
    utxoAtoms: bigint;
    tokenTicker: string;
    tokenName: string;
    tokenType: AlpTokenType;
};

export type TradedTokens = Map<string, TradedToken>;

/**
 * Fetch Chronik genesis for every allowlisted token and join with config
 * utxo sizes. Rejects non-ALP tokens and Chronik errors.
 */
export const loadTradedTokens = async (
    chronik: ChronikClient,
    config: ParsedTradedConfig,
): Promise<TradedTokens> => {
    const tokenIds = tokenIdsFromConfig(config);
    const out: TradedTokens = new Map();

    for (const tokenId of tokenIds) {
        let info;
        try {
            info = await chronik.token(tokenId);
        } catch (error) {
            throw new Error(
                `Failed to fetch Chronik genesis for ${tokenId}: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }

        if (info.tokenType.protocol !== 'ALP') {
            throw new Error(
                `Token ${tokenId} is ${info.tokenType.protocol}, expected ALP`,
            );
        }

        const decimals = info.genesisInfo.decimals;
        try {
            assertDecimals(decimals);
        } catch (error) {
            throw new Error(
                `Token ${tokenId}: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }

        const utxoQty = config.utxoQtyByToken.get(tokenId);
        if (utxoQty === undefined) {
            throw new Error(`Token ${tokenId} missing utxoQty in config`);
        }

        let utxoAtoms: bigint;
        try {
            utxoAtoms = decimalizedQtyToAtoms(String(utxoQty), decimals);
        } catch (error) {
            throw new Error(
                `Token ${tokenId}: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }

        out.set(tokenId, {
            tokenId,
            decimals,
            utxoQty,
            utxoAtoms,
            tokenTicker: info.genesisInfo.tokenTicker,
            tokenName: info.genesisInfo.tokenName,
            tokenType: info.tokenType,
        });
    }

    return out;
};

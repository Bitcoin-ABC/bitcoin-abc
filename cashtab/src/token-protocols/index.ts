// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { SlpDecimals, CashtabUtxo, TokenUtxo } from 'wallet';
import { getMaxDecimalizedAlpQty } from 'token-protocols/alp';
import { getMaxDecimalizedSlpQty } from 'token-protocols/slpv1';
import { Script } from 'ecash-lib';
import appConfig from 'config/app';
import { TokenType } from 'chronik-client';

// Cashtab spec
// This is how Cashtab defines a token utxo to be received
// by the wallet broadcasting this transaction.
export const TOKEN_DUST_CHANGE_OUTPUT = { sats: BigInt(appConfig.dustSats) };


export interface TokenTargetOutput {
    sats: bigint;
    script?: Script;
}

/**
 * Get all available non-mintbaton token utxos in wallet by token ID
 * @param utxos array of utxos from an in-node instance of chronik
 * @param tokenId
 * @returns tokenUtxos. mint batons are intentionally excluded
 */
export const getAllSendUtxos = (
    utxos: CashtabUtxo[],
    tokenId: string,
): TokenUtxo[] => {
    // From an array of chronik utxos, return only token utxos related to a given tokenId
    return utxos.filter(
        utxo =>
            utxo.token?.tokenId === tokenId && // UTXO matches the token ID.
            utxo.token?.isMintBaton === false, // UTXO is not a minting baton.
    ) as TokenUtxo[];
};

export const getMaxDecimalizedQty = (
    decimals: SlpDecimals,
    tokenProtocol: 'SLP' | 'ALP',
): string => {
    return tokenProtocol === 'SLP'
        ? getMaxDecimalizedSlpQty(decimals)
        : getMaxDecimalizedAlpQty(decimals);
};

export enum RenderedTokenType {
    NFT = 'NFT',
    SLP = 'SLP',
    COLLECTION = 'Collection',
    MINTVAULT = 'Mint Vault',
    ALP = 'ALP',
    ALP_UNKNOWN = 'Unknown ALP',
    SLP_UNKNOWN = 'Unknown SLP',
    UNKNOWN_UNKNOWN = 'Unknown Token Type',
    FAN_OUT = 'Fan Output Tx',
}
/**
 * Get a human-readable name for a token by its type
 * e.g. "NFT" for "SLP1_CHILD"
 */
export const getRenderedTokenType = (
    tokenType: TokenType,
): RenderedTokenType => {
    const { protocol, type } = tokenType;
    if (protocol === 'ALP') {
        switch (type) {
            case 'ALP_TOKEN_TYPE_STANDARD': {
                return RenderedTokenType.ALP;
            }
            case 'ALP_TOKEN_TYPE_UNKNOWN': {
                return RenderedTokenType.ALP_UNKNOWN;
            }
            default: {
                return RenderedTokenType.ALP_UNKNOWN;
            }
        }
    } else if (protocol === 'SLP') {
        switch (type) {
            case 'SLP_TOKEN_TYPE_FUNGIBLE': {
                return RenderedTokenType.SLP;
            }
            case 'SLP_TOKEN_TYPE_MINT_VAULT': {
                return RenderedTokenType.MINTVAULT;
            }
            case 'SLP_TOKEN_TYPE_NFT1_GROUP': {
                return RenderedTokenType.COLLECTION;
            }
            case 'SLP_TOKEN_TYPE_NFT1_CHILD': {
                return RenderedTokenType.NFT;
            }
            case 'SLP_TOKEN_TYPE_UNKNOWN': {
                return RenderedTokenType.SLP_UNKNOWN;
            }
            default: {
                return RenderedTokenType.SLP_UNKNOWN;
            }
        }
    } else {
        return RenderedTokenType.UNKNOWN_UNKNOWN;
    }
};

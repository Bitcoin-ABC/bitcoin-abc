// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { SlpDecimals, CashtabUtxo, TokenUtxo } from 'wallet';
import { getMaxDecimalizedAlpQty } from 'token-protocols/alp';
import { getMaxDecimalizedSlpQty } from 'token-protocols/slpv1';
import { decimalizeTokenAmount, undecimalizeTokenAmount } from 'wallet';
import { Script } from 'ecash-lib';
import appConfig from 'config/app';
import { TokenType } from 'chronik-client';

// Cashtab spec
// This is how Cashtab defines a token utxo to be received
// by the wallet broadcasting this transaction.
export const TOKEN_DUST_CHANGE_OUTPUT = { value: appConfig.dustSats };

export interface TokenInputInfo {
    tokenInputs: TokenUtxo[];
    sendAmounts: bigint[];
    tokenId: string;
}

export interface TokenTargetOutput {
    value: number;
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

/**
 * Get utxos for a token transaction
 * Supports all types of token as utxos are selected by tokenId
 * @param utxos
 * @param tokenId tokenId of the token you want to send
 * @param sendQty
 * @param decimals 0-9 inclusive, integer. Decimals of this token.
 * Note: you need to get decimals from cache or from chronik.
 */
export const getSendTokenInputs = (
    utxos: CashtabUtxo[],
    tokenId: string,
    sendQty: string,
    decimals: -1 | SlpDecimals = -1,
): TokenInputInfo => {
    if (sendQty === '') {
        throw new Error(
            'Invalid sendQty empty string. sendQty must be a decimalized number as a string.',
        );
    }

    // Get all slp send utxos for this tokenId
    const allSendUtxos = getAllSendUtxos(utxos, tokenId);

    if (allSendUtxos.length === 0) {
        throw new Error(`No token utxos for tokenId "${tokenId}"`);
    }

    if (!Number.isInteger(decimals) || decimals > 9 || decimals < 0) {
        // We get there if we call this function without specifying decimals
        throw new Error(
            `Invalid decimals ${decimals} for tokenId ${tokenId}. Decimals must be an integer 0-9.`,
        );
    }

    // Convert user input (decimalized string)
    const sendQtyBigInt = BigInt(
        undecimalizeTokenAmount(sendQty, decimals as SlpDecimals),
    );

    // We calculate totalTokenInputUtxoQty with the same basis (token satoshis) -- no adjustment for decimals
    // as the value of this token utxo is already indexed at this basis
    let totalTokenInputUtxoQty = 0n;

    const tokenInputs = [];
    for (const utxo of allSendUtxos) {
        totalTokenInputUtxoQty =
            totalTokenInputUtxoQty + BigInt(utxo.token.amount);

        tokenInputs.push(utxo);
        if (totalTokenInputUtxoQty >= sendQtyBigInt) {
            // If we have enough to send what we want, no more input utxos
            break;
        }
    }

    if (totalTokenInputUtxoQty < sendQtyBigInt) {
        throw new Error(
            `tokenUtxos have insufficient balance ${decimalizeTokenAmount(
                totalTokenInputUtxoQty.toString(),
                decimals as SlpDecimals,
            )} to send ${decimalizeTokenAmount(
                sendQtyBigInt.toString(),
                decimals as SlpDecimals,
            )}`,
        );
    }

    const sendAmounts = [sendQtyBigInt];
    const change = totalTokenInputUtxoQty - sendQtyBigInt;
    if (change > 0n) {
        sendAmounts.push(change);
    }

    // We return this interesting object due to expected input shape of slp-mdm
    // NB sendAmounts must be an array of BNs, each one decimalized to the tokens decimal places
    return { tokenInputs, tokenId, sendAmounts };
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

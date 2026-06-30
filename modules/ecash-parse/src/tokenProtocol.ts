// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { TokenType } from 'chronik-client';

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

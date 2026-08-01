// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { CryptoTicker } from 'ecash-price';
import { ALP_TOKEN_TYPE_STANDARD, type TokenType } from 'ecash-lib';

/**
 * Built-in asset definitions for Marlin.
 */
export interface AssetDefinition {
    key: string;
    ticker: string;
    /** Human-readable name for UI (e.g. asset menu as `name (ticker)`). */
    displayName: string;
    decimals: number;
    /** Set for tokens (e.g. ALP); omitted for XEC. */
    tokenId?: string;
    /** Protocol token type for sends; required when `tokenId` is set. */
    tokenType?: TokenType;
    /**
     * ecash-price source for fiat (or other) quotation. When unset, the asset
     * has no configured price and fiat secondary amounts are hidden.
     */
    quoteCurrency?: CryptoTicker;
}

export const XEC_ASSET: AssetDefinition = {
    key: 'xec',
    ticker: 'XEC',
    displayName: 'eCash',
    decimals: 2,
    quoteCurrency: CryptoTicker.XEC,
};

export const FIRMA_TOKEN: AssetDefinition = {
    key: 'firma',
    ticker: 'FIRMA',
    displayName: 'Firma',
    decimals: 4,
    tokenId: '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
    tokenType: ALP_TOKEN_TYPE_STANDARD,
    // Firma is a USD stablecoin. We use USDT as the quote currency because we
    // can't use USD directly as it's not supported by ecash-price.
    quoteCurrency: CryptoTicker.USDT,
};

export const SUPPORTED_ASSETS: AssetDefinition[] = [XEC_ASSET, FIRMA_TOKEN];

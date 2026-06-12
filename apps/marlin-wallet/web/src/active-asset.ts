// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    CryptoTicker,
    formatPrice,
    type PriceFormatterConfig,
} from 'ecash-price';
import { XEC_ASSET, type AssetDefinition } from './supported-assets';

type ActiveAsset = { def: AssetDefinition };

let current: ActiveAsset = { def: XEC_ASSET };

export function setActiveAsset(asset: ActiveAsset): void {
    current = asset;
}

export function activeAssetTicker(): string {
    return current.def.ticker;
}

export function activeCryptoTicker(): CryptoTicker {
    return new CryptoTicker(current.def.ticker.toLowerCase());
}

export function activeTokenId(): string | null {
    return current.def.tokenId ?? null;
}

export function activeAssetDefinition(): AssetDefinition {
    return current.def;
}

export function activeAssetDecimals(): number {
    return current.def.decimals;
}

export function activeQuoteCurrency(): CryptoTicker | undefined {
    return current.def.quoteCurrency ?? undefined;
}

export function allowFiatForActiveAsset(): boolean {
    return current.def.quoteCurrency !== undefined;
}

/** formatPrice uppercases crypto tickers; swap in the asset's display ticker. */
function withDisplayTickerSuffix(
    formatted: string,
    displayTicker: string,
    cryptoTicker: CryptoTicker,
): string {
    const upperSuffix = ` ${cryptoTicker.toString().toUpperCase()}`;
    const displaySuffix = ` ${displayTicker}`;
    if (formatted.endsWith(upperSuffix)) {
        return formatted.slice(0, -upperSuffix.length) + displaySuffix;
    }
    return formatted;
}

/** Format an amount in the active asset using its display ticker (preserves case). */
export function formatActiveAssetAmount(
    amount: number,
    config?: PriceFormatterConfig,
): string {
    const cryptoTicker = activeCryptoTicker();
    const formatted = formatPrice(amount, cryptoTicker, config);
    return withDisplayTickerSuffix(
        formatted,
        activeAssetTicker(),
        cryptoTicker,
    );
}

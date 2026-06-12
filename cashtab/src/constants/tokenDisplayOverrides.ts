// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { GenesisInfo } from 'chronik-client';
import { CashtabCachedTokenInfo } from 'config/CashtabCache';
import { FIRMA } from 'constants/tokens';

export interface TokenDisplayOverride {
    tokenName?: string;
    tokenTicker?: string;
    url?: string;
}

/** On-chain genesis metadata is immutable; UI apps apply display overrides here. */
export const TOKEN_DISPLAY_OVERRIDES: Record<string, TokenDisplayOverride> = {
    [FIRMA.tokenId]: {
        tokenName: 'Firma Alpha',
        tokenTicker: 'FIRMA ALPHA',
        url: 'firmaprotocol.com',
    },
};

export const FIRMA_DISPLAY_NAME =
    TOKEN_DISPLAY_OVERRIDES[FIRMA.tokenId].tokenName!;
export const FIRMA_DISPLAY_TICKER =
    TOKEN_DISPLAY_OVERRIDES[FIRMA.tokenId].tokenTicker!;
/** Shown in wallet balance headers (not on the token details page). */
export const FIRMA_BALANCE_LABEL = 'USD';

export const applyTokenDisplayOverrides = (
    tokenId: string,
    genesisInfo: GenesisInfo,
): GenesisInfo => {
    const override = TOKEN_DISPLAY_OVERRIDES[tokenId];
    if (!override) {
        return genesisInfo;
    }
    return {
        ...genesisInfo,
        ...(override.tokenName !== undefined && {
            tokenName: override.tokenName,
        }),
        ...(override.tokenTicker !== undefined && {
            tokenTicker: override.tokenTicker,
        }),
        ...(override.url !== undefined && { url: override.url }),
    };
};

export const applyDisplayOverridesToCachedTokenInfo = (
    tokenId: string,
    cachedInfo: CashtabCachedTokenInfo,
): CashtabCachedTokenInfo => ({
    ...cachedInfo,
    genesisInfo: applyTokenDisplayOverrides(tokenId, cachedInfo.genesisInfo),
});

export const applyDisplayOverridesToTokenCache = (
    tokens: Map<string, CashtabCachedTokenInfo>,
): Map<string, CashtabCachedTokenInfo> => {
    const patched = new Map<string, CashtabCachedTokenInfo>();
    for (const [tokenId, cachedInfo] of tokens.entries()) {
        patched.set(
            tokenId,
            applyDisplayOverridesToCachedTokenInfo(tokenId, cachedInfo),
        );
    }
    return patched;
};

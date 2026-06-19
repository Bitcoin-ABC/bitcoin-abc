// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { GenesisInfo } from 'chronik-client';

export const FIRMA_TOKEN_ID =
    '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0';

export interface TokenDisplayOverride {
    tokenName?: string;
    tokenTicker?: string;
    url?: string;
}

/** On-chain genesis metadata is immutable; UI apps apply display overrides here. */
export const TOKEN_DISPLAY_OVERRIDES: Record<string, TokenDisplayOverride> = {
    [FIRMA_TOKEN_ID]: {
        tokenName: 'Firma Alpha',
        tokenTicker: 'FIRMA α',
        url: 'firmaprotocol.com',
    },
};

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

export const applyDisplayOverridesToTokenInfoMap = (
    tokenInfoMap: Map<string, GenesisInfo>,
): Map<string, GenesisInfo> => {
    const patched = new Map<string, GenesisInfo>();
    for (const [tokenId, genesisInfo] of tokenInfoMap.entries()) {
        patched.set(tokenId, applyTokenDisplayOverrides(tokenId, genesisInfo));
    }
    return patched;
};

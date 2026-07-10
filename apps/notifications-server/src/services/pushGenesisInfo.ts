// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChronikClient, type GenesisInfo } from 'chronik-client';

export const getGenesisInfoForTokenId = async (
    chronik: ChronikClient,
    tokenId: string,
): Promise<GenesisInfo | undefined> => {
    try {
        const tokenInfo = await chronik.token(tokenId);
        return tokenInfo.genesisInfo;
    } catch (error) {
        console.error(
            `[push] chronik.token failed for ${tokenId.slice(0, 8)}...:`,
            error,
        );
        return undefined;
    }
};

export const buildGenesisInfoMapForTokenIds = async (
    chronik: ChronikClient,
    tokenIds: string[],
): Promise<Map<string, GenesisInfo>> => {
    const map = new Map<string, GenesisInfo>();
    const uniqueIds = [...new Set(tokenIds.filter(id => id.length > 0))];

    await Promise.all(
        uniqueIds.map(async tokenId => {
            const genesisInfo = await getGenesisInfoForTokenId(
                chronik,
                tokenId,
            );
            if (genesisInfo !== undefined) {
                map.set(tokenId, genesisInfo);
            }
        }),
    );

    return map;
};

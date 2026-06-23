// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import config from '../config';
import { Pool } from 'pg';
import { existsSync, renameSync } from 'fs';
import { IFs } from 'memfs';
import {
    getOneBlacklistEntry,
    insertBlacklistEntry,
    removeBlacklistEntry,
} from './db';

export interface FsLikeModeration {
    existsSync: typeof existsSync;
    renameSync: typeof renameSync;
}

const largestIconSize = (): number =>
    config.iconSizes[config.iconSizes.length - 1];

export const iconExistsInServedDir = (
    fs: FsLikeModeration | IFs,
    tokenId: string,
): boolean =>
    fs.existsSync(`${config.imageDir}/${largestIconSize()}/${tokenId}.png`);

export const iconExistsInRejectedDir = (
    fs: FsLikeModeration | IFs,
    tokenId: string,
): boolean =>
    fs.existsSync(`${config.rejectedDir}/${largestIconSize()}/${tokenId}.png`);

const moveIconFiles = (
    fs: FsLikeModeration | IFs,
    tokenId: string,
    sourceDir: string,
    destDir: string,
): void => {
    for (const size of config.iconSizes) {
        const sourcePath = `${sourceDir}/${size}/${tokenId}.png`;
        const destPath = `${destDir}/${size}/${tokenId}.png`;
        fs.renameSync(sourcePath, destPath);
    }
};

/**
 * Deny a token icon: blacklist entry + move files to rejectedDir.
 * Returns false instead of throwing so callers cannot crash the server.
 */
export const denyTokenIcon = async (
    pool: Pool,
    fs: FsLikeModeration | IFs,
    tokenId: string,
    addedBy: string,
    reason = 'report from icon archon',
): Promise<boolean> => {
    if (!iconExistsInServedDir(fs, tokenId)) {
        console.error(
            `No served icon found for ${tokenId} at ${config.imageDir}/${largestIconSize()}/${tokenId}.png`,
        );
        return false;
    }

    try {
        const existingEntry = await getOneBlacklistEntry(pool, tokenId);
        if (!existingEntry) {
            await insertBlacklistEntry(pool, tokenId, {
                reason,
                timestamp: Math.round(Date.now() / 1000),
                addedBy,
            });
        }

        moveIconFiles(fs, tokenId, config.imageDir, config.rejectedDir);
        return true;
    } catch (err) {
        console.error(`Error denying token icon ${tokenId}`, err);
        return false;
    }
};

/**
 * Restore a denied token icon: remove blacklist entry + move files to imageDir.
 * Returns false instead of throwing so callers cannot crash the server.
 */
export const restoreTokenIcon = async (
    pool: Pool,
    fs: FsLikeModeration | IFs,
    tokenId: string,
): Promise<boolean> => {
    if (!iconExistsInRejectedDir(fs, tokenId)) {
        console.error(
            `No rejected icon found for ${tokenId} at ${config.rejectedDir}/${largestIconSize()}/${tokenId}.png`,
        );
        return false;
    }

    try {
        await removeBlacklistEntry(pool, tokenId);
        moveIconFiles(fs, tokenId, config.rejectedDir, config.imageDir);
        return true;
    } catch (err) {
        console.error(`Error restoring token icon ${tokenId}`, err);
        return false;
    }
};

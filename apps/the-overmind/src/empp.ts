// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { strToBytes, WriterBytes } from 'ecash-lib';
import { LOKAD_ID } from './constants';

/**
 * EMPP action codes for The Overmind
 */
export enum EmppAction {
    CLAIM = 0x00,
    LIKE = 0x01,
    DISLIKE = 0x02,
    DISLIKED = 0x03,
    RESPAWN = 0x04,
}

/**
 * Generate EMPP (eCash Message Push Protocol) data push for The Overmind
 * Format: <lokadId (4 bytes)><versionByte (1 byte)><actionCode (1 byte)><msgId (4 bytes, u32 little-endian)?>
 * For CLAIM action, msgId is omitted entirely (no bytes)
 * @param action - The EMPP action code
 * @param msgId - Optional message ID (required for LIKE, DISLIKE, DISLIKED; omitted for CLAIM)
 * @returns The EMPP data as a Uint8Array
 */
export const getOvermindEmpp = (
    action: EmppAction,
    msgId?: number,
): Uint8Array => {
    const lokadIdBytes = strToBytes(LOKAD_ID);

    // CLAIM and RESPAWN actions have no msgId bytes
    const includeMsgId =
        action !== EmppAction.CLAIM && action !== EmppAction.RESPAWN;
    const writer = new WriterBytes(4 + 1 + 1 + (includeMsgId ? 4 : 0)); // lokadId + version + action + (optional msgId)

    writer.putBytes(lokadIdBytes);
    writer.putU8(0x00); // versionByte
    writer.putU8(action);

    if (includeMsgId) {
        if (msgId === undefined) {
            throw new Error(`msgId is required for action ${action}`);
        }
        writer.putU32(msgId);
    }

    return writer.data;
};

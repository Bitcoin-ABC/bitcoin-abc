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
    WITHDRAW = 0x05,
    BOTTLE_REPLY = 0x06,
    BOTTLE_REPLIED = 0x07,
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

    // CLAIM, RESPAWN, and WITHDRAW actions have no msgId bytes
    const includeMsgId =
        action !== EmppAction.CLAIM &&
        action !== EmppAction.RESPAWN &&
        action !== EmppAction.WITHDRAW;
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

/**
 * Parse EMPP data push to extract action code
 * Format: <lokadId (4 bytes)><versionByte (1 byte)><actionCode (1 byte)><msgId (4 bytes, optional)>
 * Returns action code or null if parsing fails
 * @param emppData - EMPP data as Uint8Array
 * @returns Action code (number) or null if invalid
 */
export const parseEmppActionCode = (emppData: Uint8Array): number | null => {
    try {
        // Minimum length: 4 (lokadId) + 1 (version) + 1 (action) = 6 bytes
        // Actions without msgId (CLAIM, RESPAWN, WITHDRAW) are 6 bytes
        // Actions with msgId (LIKE, DISLIKE, DISLIKED, BOTTLE_REPLY, BOTTLE_REPLIED) are 10 bytes
        if (emppData.length < 6) {
            return null;
        }

        // Check LOKAD_ID (first 4 bytes)
        const lokadIdBytes = strToBytes(LOKAD_ID);
        if (emppData.length < lokadIdBytes.length) {
            return null;
        }

        for (let i = 0; i < lokadIdBytes.length; i++) {
            if (emppData[i] !== lokadIdBytes[i]) {
                return null; // Not our LOKAD_ID
            }
        }

        // Version byte at index 4 (should be 0x00)
        if (emppData[4] !== 0x00) {
            return null;
        }

        // Action code is at index 5
        return emppData[5];
    } catch {
        return null;
    }
};

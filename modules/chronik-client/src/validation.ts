// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { WsSubScriptClient } from './ChronikClientNode';

const VALID_HEX_REGEX = new RegExp(/^[a-f0-9]+$/);
const VALID_LOKADID_REGEX = new RegExp(/^[a-f0-9]{8}$/);
const VALID_TOKENID_REGEX = new RegExp(/^[a-f0-9]{64}$/);

export const isValidWsSubscription = (
    subscription: WsSubScriptClient,
): string | boolean => {
    const { scriptType, payload } = subscription;
    // Test for odd length
    if (payload.length % 2 !== 0) {
        return `Odd hex length: ${payload}`;
    }
    // Test for valid hex
    if (!VALID_HEX_REGEX.test(payload)) {
        return `Invalid hex: "${payload}". Payload must be lowercase hex string.`;
    }
    // 20 bytes
    const SUPPORTED_HASH_BYTES_P2PKH_P2SH = 20;
    const SUPPORTED_HASH_BYTES_P2PK = [33, 65];
    const payloadBytes = payload.length / 2;

    switch (scriptType) {
        case 'p2pkh':
        case 'p2sh': {
            // Test for length
            if (payloadBytes !== SUPPORTED_HASH_BYTES_P2PKH_P2SH) {
                return `Invalid length, expected 20 bytes but got ${payloadBytes} bytes`;
            }
            return true;
        }
        case 'p2pk': {
            if (!SUPPORTED_HASH_BYTES_P2PK.includes(payloadBytes)) {
                return `Invalid length, expected one of [33, 65] but got ${payloadBytes} bytes`;
            }
            return true;
        }
        case 'other': {
            // Only tests here are for odd length and valid hex, already performed
            return true;
        }
        default:
            // Unsupported type
            return `Invalid scriptType: ${scriptType}`;
    }
};

export const verifyLokadId = (lokadId: string) => {
    if (!VALID_LOKADID_REGEX.test(lokadId)) {
        throw new Error(
            `Invalid lokadId: "${lokadId}". lokadId must be 4 bytes (8 chars) of lowercase hex.`,
        );
    }
};

export const verifyTokenId = (tokenId: string) => {
    if (!VALID_TOKENID_REGEX.test(tokenId)) {
        throw new Error(
            `Invalid tokenId: "${tokenId}". tokenId must be 64 characters of lowercase hex.`,
        );
    }
};

// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Request } from 'express';
import { isValidCashAddress } from 'ecashaddrjs';
import { SupplyType } from './cashtabTokens';

// Match if input is a string that ends with a 64-char lowercase hex string and .png extension
const TOKEN_ICON_REQUEST_REGEX = new RegExp(/^\/([0-9]+)\/[a-f0-9]{64}.png$/);

// TokenId regex
const TOKEN_ID_REGEX = new RegExp(/^[a-f0-9]{64}$/);

/**
 * Determine if a request caught by 404 was for a token icon
 * @param req express request, e.g. /slpv1/512/3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109.png
 * @returns
 */
export const isTokenImageRequest = (req: Request): boolean => {
    return TOKEN_ICON_REQUEST_REGEX.test(req.url);
};

export const isValidTokenId = (tokenId: string): boolean => {
    return TOKEN_ID_REGEX.test(tokenId);
};

// Keep in sync with chronik-client AlpTokenType_Type | SlpTokenType_Type
const VALID_TOKEN_TYPES = new Set([
    'ALP_TOKEN_TYPE_STANDARD',
    'ALP_TOKEN_TYPE_UNKNOWN',
    'SLP_TOKEN_TYPE_FUNGIBLE',
    'SLP_TOKEN_TYPE_MINT_VAULT',
    'SLP_TOKEN_TYPE_NFT1_GROUP',
    'SLP_TOKEN_TYPE_NFT1_CHILD',
    'SLP_TOKEN_TYPE_UNKNOWN',
]);

export const isValidMinterAddress = (minterAddress: string): boolean => {
    return isValidCashAddress(minterAddress, 'ecash');
};

export const isValidTokenType = (tokenType: string): boolean => {
    return VALID_TOKEN_TYPES.has(tokenType);
};

export const isValidSupplyType = (
    supplyType: string,
): supplyType is SupplyType => {
    return supplyType === 'FIXED' || supplyType === 'VARIABLE';
};

// PNG file signature: 89 50 4E 47 0D 0A 1A 0A
const PNG_MAGIC_BYTES = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/**
 * Validate upload content by PNG magic bytes, not client-provided MIME type.
 */
export const isValidPngBuffer = (data: Buffer | Uint8Array): boolean => {
    if (data.length < PNG_MAGIC_BYTES.length) {
        return false;
    }
    return PNG_MAGIC_BYTES.equals(
        Buffer.from(data.subarray(0, PNG_MAGIC_BYTES.length)),
    );
};

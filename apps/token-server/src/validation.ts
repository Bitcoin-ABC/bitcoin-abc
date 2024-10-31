// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Request } from 'express';

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

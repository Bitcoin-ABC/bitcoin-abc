// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Firma username (Patron handle) lookup.
 * Same public GET as apps/firma handleService.resolveHandleToAddress.
 * Patron CORS is open for this read-only path.
 */
export const FIRMA_PATRON_API_URL = 'https://patron.firma.cash/api';

/** Send-time usernames may be shorter than registration (apps/firma). */
export const FIRMA_HANDLE_MAX_LENGTH = 21;

/** Patron GET timeout. Same budget as apps/firma handle availability. */
export const FIRMA_HANDLE_LOOKUP_TIMEOUT_MS = 8000;

export const FIRMA_USERNAME_NOT_FOUND = 'Username does not exist. Try again.';

export const FIRMA_USERNAME_SERVICE_ERROR =
    'Error communicating with the username service. Please try again or use an ecash: address';

export const FIRMA_USERNAME_TOKEN_ONLY =
    'Usernames can only be used when sending FIRMA, fCHF, or fEUR';

/**
 * Patron handle-resolution URL for a username (no @).
 */
export const getFirmaHandleLookupUrl = (handle: string): string =>
    `${FIRMA_PATRON_API_URL}/handles/handle/${encodeURIComponent(handle)}`;

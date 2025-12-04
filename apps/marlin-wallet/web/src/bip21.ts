// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { config } from './config';
import { isValidECashAddress } from './address';
import { satsToXec } from './amount';

/**
 * Result of parsing a BIP21 URI
 */
export interface Bip21ParseResult {
    address: string;
    sats?: number;
    // OP_RETURN data in hex (without 6a OP_RETURN opcode)
    opReturnRaw?: string;
}

/**
 * Create a BIP21 URI from an address and optional amount
 *
 * @param address - The eCash address (may include network prefix like "ectest:" or "ecash:")
 * @param amountSats - Optional amount in satoshis (will be converted to XEC in the URI)
 * @returns A BIP21 URI string (e.g., "ecash:address" or "ecash:address?amount=100.00")
 */
export function createBip21Uri(address: string, amountSats?: number): string {
    // Strip any existing prefix to get the raw address
    const rawAddress = address.includes(':') ? address.split(':')[1] : address;

    // Build BIP21 URI with config prefix
    let bip21Uri = config.bip21Prefix + rawAddress;

    // Add amount parameter if provided and positive
    if (amountSats && amountSats > 0) {
        // Convert satoshis to XEC using the standard conversion function
        const amountXec = satsToXec(amountSats);
        // Format with 2 decimal places
        bip21Uri += `?amount=${amountXec.toFixed(2)}`;
    }

    return bip21Uri;
}

/**
 * Parse a BIP21 URI string
 *
 * Supports simplified BIP21 format for eCash:
 * - always starts with ecash: even for other prefixed addresses
 * - Optional amount parameter (e.g., ?amount=100.42)
 * - All other query parameters are ignored
 *
 * @param uri - The URI string to parse (e.g., "ecash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07?amount=100.42")
 * @returns Parsed result with address and optional amount, or null if invalid
 */
export function parseBip21Uri(uri: string): Bip21ParseResult | null {
    try {
        // Parse the URI using URL API
        const url = new URL(uri);

        // Validate that the protocol matches the expected BIP21 prefix
        if (url.protocol !== config.bip21Prefix) {
            return null;
        }

        // Check if the pathname already has the expected prefix (e.g., "ectest:address")
        // If not, add the configured prefix
        let addressPart = url.pathname;
        if (!addressPart.startsWith(config.addressPrefix + ':')) {
            addressPart = config.addressPrefix + ':' + addressPart;
        }

        // Validate the address (this will catch invalid formats like ecash://address with leading slash)
        if (!isValidECashAddress(addressPart)) {
            return null;
        }

        const result: Bip21ParseResult = {
            address: addressPart,
        };

        // Parse the amount parameter if present. This is the only parameter supported by this wallet.
        // Amount in BIP21 is specified in XEC, we convert to satoshis (1 XEC = 100 sats)
        const amountParam = url.searchParams.get('amount');
        if (amountParam) {
            // Parse as floating point number (XEC)
            const amountXec = parseFloat(amountParam);

            // Validate that it's a valid number and positive
            if (!isNaN(amountXec) && amountXec > 0) {
                // Convert XEC to satoshis (1 XEC = 100 sats) and ensure it's an integer
                result.sats = Math.round(amountXec * 100);
            }
        }

        // Parse op_return_raw parameter if present
        const opReturnRaw = url.searchParams.get('op_return_raw');
        if (opReturnRaw) {
            // Validate it's a valid hex string with even number of characters
            const cleanHex = opReturnRaw.trim().toUpperCase();
            if (/^[0-9A-F]+$/.test(cleanHex) && cleanHex.length % 2 === 0) {
                result.opReturnRaw = cleanHex;
            }
        }

        return result;
    } catch {
        return null;
    }
}

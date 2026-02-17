// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * PayButton protocol detection and decoding
 *
 * PayButton spec: https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/paybutton.md
 *
 * The PayButton protocol identifier is: 0450415900
 * - 04: Pushdata opcode for 4 bytes
 * - 50415900: "PAY" + null byte (0x00) in ASCII
 */

/**
 * PayButton protocol identifier in hex (without OP_RETURN opcode)
 * This is what appears in the op_return_raw field of a BIP21 URI
 */
const PAYBUTTON_PROTOCOL_ID = '0450415900';

/**
 * Check if an op_return_raw hex string is a PayButton transaction
 *
 * @param opReturnRaw - Hex string of the OP_RETURN data (without 6a OP_RETURN opcode)
 * @returns true if it's a PayButton transaction
 */
export function isPayButtonTransaction(opReturnRaw: string): boolean {
    return opReturnRaw.startsWith(PAYBUTTON_PROTOCOL_ID);
}

export interface PaybuttonDeepLinkToBip21UriResult {
    bip21Uri: string;
    returnToBrowser: boolean;
}

export function paybuttonDeepLinkToBip21Uri(
    deepLink: string,
): PaybuttonDeepLinkToBip21UriResult {
    try {
        const url = new URL(deepLink);

        if (
            url.protocol !== 'https:' ||
            (url.hostname !== 'paybutton.org' &&
                url.hostname !== 'api.paybutton.org') ||
            url.pathname !== '/app'
        ) {
            return { bip21Uri: deepLink, returnToBrowser: false };
        }

        const address = url.searchParams.get('address');
        if (!address) {
            return { bip21Uri: deepLink, returnToBrowser: false };
        }
        url.searchParams.delete('address');

        // b=1 means return to browser
        const b = url.searchParams.get('b');
        if (b !== null) {
            url.searchParams.delete('b');
        }

        return {
            bip21Uri: address + '?' + url.searchParams.toString(),
            returnToBrowser: b === '1',
        };
    } catch {
        return { bip21Uri: deepLink, returnToBrowser: false };
    }
}

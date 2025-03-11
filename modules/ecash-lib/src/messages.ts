// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { sha256d, shaRmd160 } from './hash';
import { Ecc } from './ecc';
import { WriterBytes } from './io/writerbytes';
import { writeVarSize } from './io/varsize';
import { toHex } from './io/hex';
import { Address } from './address/address';

/**
 * messages.ts
 *
 * Sign and verify messages
 */

const ECASH_MSG_SIGNING_PREFIX = '\x16eCash Signed Message:\n';

/**
 * Messages are prepared in a standard way before signing and verifying
 *
 * - The raw message (e.g., "Hello, world!") is encoded as a UTF-8 byte array
 * - The prefixed message is constructed as:
 *
 *   [prefix][message_length][message]
 *
 *   where message_length is a variable-length integer (varint) encoding the
 *   byte length of the message
 *
 * We keep the "magicHash" name used in bitcoinjs-message as we do the same thing here
 * with eCash tools
 *
 * ref https://github.com/bitcoinjs/bitcoinjs-message/blob/master/index.js#L57
 */
export const magicHash = (
    message: string,
    messagePrefix = ECASH_MSG_SIGNING_PREFIX,
): Uint8Array => {
    const encoder = new TextEncoder();

    // Convert prefix to Uint8Array
    const prefixBytes = encoder.encode(messagePrefix);

    // Convert message to Uint8Array
    const messageBytes = encoder.encode(message);

    // Calculate the maximum possible size of the varint for message length
    const maxVarintSize =
        messageBytes.length <= 0xfc
            ? 1
            : messageBytes.length <= 0xffff
            ? 3
            : messageBytes.length <= 0xffffffff
            ? 5
            : 9;

    // Create a WriterBytes instance with enough capacity
    const writer = new WriterBytes(
        prefixBytes.length + maxVarintSize + messageBytes.length,
    );

    // Write the prefix
    writer.putBytes(prefixBytes);

    // Write the message length as a varint
    writeVarSize(messageBytes.length, writer);

    // Write the message
    writer.putBytes(messageBytes);

    // Return double SHA-256 hash
    return sha256d(writer.data);
};

/**
 * Sign a message
 *
 * While there is not an official BIP or spec here, there is
 * a de facto standard
 *
 * See implementation in bitcoinjs-lib and electrum
 */
export const signMsg = (
    msg: string,
    sk: Uint8Array,
    prefix = ECASH_MSG_SIGNING_PREFIX,
): string => {
    const preparedMsg = magicHash(msg, prefix);
    const sig = new Ecc().signRecoverable(sk, preparedMsg);

    // Convert Uint8Array to binary string and encode with btoa
    const binaryString = String.fromCharCode(...sig);
    return btoa(binaryString);
};

/**
 * Verify that a given message and signature
 * came from a given address
 */
export const verifyMsg = (
    msg: string,
    signature: string,
    address: string,
    prefix = ECASH_MSG_SIGNING_PREFIX,
): boolean => {
    try {
        const preparedMsg = magicHash(msg, prefix);

        // Decode base64 signature to binary string and convert to Uint8Array
        const binaryString = atob(signature);
        const sig = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            sig[i] = binaryString.charCodeAt(i);
        }
        const recoveredPk = new Ecc().recoverSig(sig, preparedMsg);
        // Get recovered hash as a hex string and compare to tested hash
        const recoveredHash = toHex(shaRmd160(recoveredPk));
        const testedHash = Address.fromCashAddress(address).hash;
        return recoveredHash === testedHash;
    } catch (err) {
        console.error(`Error verifying signature`, err);
        return false;
    }
};

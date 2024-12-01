// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { sha256d } from '../hash';
import { encodeBase58, decodeBase58 } from 'b58-ts';
import { AddressType } from './address';
import { toHex } from '../io/hex';

/**
 * Base 58 Check
 */

export const encodeBase58Check = (data: Uint8Array): string => {
    const checksum = sha256d(data);
    const dataWithChecksum = new Uint8Array(data.length + 4);
    dataWithChecksum.set(data, 0);
    dataWithChecksum.set(checksum.subarray(0, 4), data.length);
    return encodeBase58(dataWithChecksum);
};

export const decodeBase58Check = (str: string): Uint8Array => {
    const dataWithChecksum = decodeBase58(str);
    const payload = dataWithChecksum.slice(0, -4);
    const checksum = dataWithChecksum.slice(-4);
    const expectedChecksum = sha256d(payload);

    // Ensure the two checksums are equal
    if (
        (checksum[0] ^ expectedChecksum[0]) |
        (checksum[1] ^ expectedChecksum[1]) |
        (checksum[2] ^ expectedChecksum[2]) |
        (checksum[3] ^ expectedChecksum[3])
    ) {
        throw new Error('Invalid checksum');
    }

    return payload;
};

type NetworkType = 'mainnet' | 'testnet';
export interface DecodedLegacyAddress {
    type: AddressType;
    hash: string;
    network: NetworkType;
}
// Length of a valid base58check encoding payload: 1 byte for
// the version byte plus 20 bytes for a RIPEMD - 160 hash.
const BASE_58_CHECK_PAYLOAD_LENGTH = 21;

interface NetworkVersionBytes {
    p2pkh: number;
    p2sh: number;
}
interface VersionByteReference {
    legacy: {
        mainnet: NetworkVersionBytes;
        testnet: NetworkVersionBytes;
    };
}
export const LEGACY_VERSION_BYTES: VersionByteReference = {
    legacy: {
        mainnet: { p2pkh: 0, p2sh: 5 },
        testnet: { p2pkh: 111, p2sh: 196 },
    },
};

// Modeled from https://github.com/ealmansi/bchaddrjs/blob/master/src/bchaddr.js#L193
export const decodeLegacyAddress = (address: string): DecodedLegacyAddress => {
    try {
        const payload = decodeBase58Check(address);
        if (payload.length !== BASE_58_CHECK_PAYLOAD_LENGTH) {
            throw new Error(
                `Invalid legacy address: payload length must be ${BASE_58_CHECK_PAYLOAD_LENGTH}`,
            );
        }
        const versionByte = payload[0];
        const hash = toHex(new Uint8Array(payload.slice(1)));
        switch (versionByte) {
            case LEGACY_VERSION_BYTES.legacy.mainnet.p2pkh:
                return {
                    hash,
                    type: 'p2pkh',
                    network: 'mainnet',
                };
            case LEGACY_VERSION_BYTES.legacy.mainnet.p2sh:
                return {
                    hash,
                    type: 'p2sh',
                    network: 'mainnet',
                };
            case LEGACY_VERSION_BYTES.legacy.testnet.p2pkh:
                return {
                    hash,
                    type: 'p2pkh',
                    network: 'testnet',
                };
            case LEGACY_VERSION_BYTES.legacy.testnet.p2sh:
                return {
                    hash,
                    type: 'p2sh',
                    network: 'testnet',
                };
            default: {
                throw new Error(
                    `Invalid legacy address: unrecognized version byte "${versionByte}"`,
                );
            }
        }
    } catch {
        throw new Error(`Invalid legacy address`);
    }
};

/**
 * Encode a legacy address given type and hash
 * For now, this is a stub method that supports only BTC p2pkh and p2sh
 */
export const encodeLegacyAddress = (
    hash: Uint8Array,
    type: 'p2pkh' | 'p2sh',
    network: NetworkType = 'mainnet',
) => {
    const versionByte = LEGACY_VERSION_BYTES.legacy[network][type];
    const combined = new Uint8Array(1 + hash.length);
    combined[0] = versionByte;
    combined.set(hash, 1);
    return encodeBase58Check(combined);
};

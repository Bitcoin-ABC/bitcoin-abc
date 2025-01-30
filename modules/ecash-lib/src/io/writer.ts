// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Endian } from './bytes.js';
import { Int } from './int.js';

/** Writer interface to abstract over writing Bitcoin objects */
export interface Writer {
    /** Write a single byte */
    putU8(value: Int): void;
    /** Write a 2-byte little-endian integer (uint16_t) */
    putU16(value: Int, endian?: Endian): void;
    /** Write a 4-byte little-endian integer (uint32_t) */
    putU32(value: Int, endian?: Endian): void;
    /** Write an 8-byte little-endian integer (uint64_t) */
    putU64(value: Int, endian?: Endian): void;
    /** Write the given bytes */
    putBytes(bytes: Uint8Array): void;
}

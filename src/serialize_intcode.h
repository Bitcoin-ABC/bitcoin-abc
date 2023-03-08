// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SERIALIZE_INTCODE_H
#define BITCOIN_SERIALIZE_INTCODE_H

#include <crypto/common.h>
#include <serialize.h>
#include <tinyformat.h>

#include <cstdint>
#include <ios>

const uint64_t VALID_RANGE[] = {
    0,
    0x80,
    0x4000,
    0x20'0000,
    0x1000'0000,
    0x08'0000'0000,
    0x0400'0000'0000,
    0x02'0000'0000'0000,
    0x0100'0000'0000'0000,
};

/**
 * Write a 64-bit integer in intcode encoding:
 *
 * Similar to UTF-8, except data bytes don't have a 10xx'xxxx prefix
 *
 * Specification & rationale can be found here:
 * https://ecashbuilders.notion.site/eCash-Mitra-Integer-Encoding-Spec-2ff596494dcf4d12b75c763464df39de?pvs=4
 *
 * Examples:
 * 0x0000'0000'0000'007f (7) -> "7f"
 * 0x0000'0000'0000'3fff (14) -> "bfff"
 * 0x0000'0000'001f'ffff (21) -> "dfffff"
 * 0x0000'0000'0fff'ffff (28) -> "efffffff"
 * 0x0000'0007'ffff'ffff (35) -> "f7ffffffff"
 * 0x0000'03ff'ffff'ffff (42) -> "fbffffffffff"
 * 0x0001'ffff'ffff'ffff (49) -> "fdffffffffffff"
 * 0x00ff'ffff'ffff'ffff (56) -> "feffffffffffffff"
 * 0xffff'ffff'ffff'ffff (63) -> "ffffffffffffffffff"
 */
template <typename Stream> void WriteIntcode(Stream &os, uint64_t value) {
    // Integers below 0x80 are just represented by themselves
    if (value < 0x80) {
        ser_writedata8(os, value);
        return;
    }

    // Number of bits required to represent `value`
    const uint64_t numBits = CountBits(value);
    // Number of bytes required to represent `value`
    uint64_t numBytes = (numBits - 1) / 7;
    if (numBytes >= 8) {
        // For 0xff headers, the formula breaks, as it's not followed by a 0 bit
        ser_writedata8(os, 0xff);
        numBytes = 8;
    } else {
        // Bits to represent how many bytes are used for the data
        const uint64_t header = (0xff << (8 - numBytes)) & 0xff;
        // Prepend the header
        value |= header << (8 * numBytes);
        // Header adds 1 leading byte
        numBytes++;
        // Left align
        value <<= 8 * (8 - numBytes);
    }

    // Write remaining bytes as big-endian
    for (size_t i = 0; i < numBytes; ++i) {
        ser_writedata8(os, value >> 56);
        value <<= 8;
    }
}

/**
 * Read a 64-bit integer as intcode, see WriteIntcode.
 * Specification & rationale can be found here:
 * https://ecashbuilders.notion.site/eCash-Mitra-Integer-Encoding-Spec-2ff596494dcf4d12b75c763464df39de?pvs=4
 */
template <typename Stream> uint64_t ReadIntcode(Stream &is) {
    // Read the header byte
    const uint8_t header = ser_readdata8(is);

    // If the first bit is not set, the number is the first byte itself
    if (header < 0x80) {
        return header;
    }

    // Number of leading ones in header (represents the number of extra bytes)
    const uint64_t leadingOnes = 8 - CountBits(uint8_t(~header));

    // Read the data bits from the header
    const uint8_t mask = 0xff >> leadingOnes;
    uint64_t result = header & mask;

    // Read remaining bytes as big-endian
    for (size_t i = 0; i < leadingOnes; ++i) {
        result <<= 8;
        result |= ser_readdata8(is);
    }

    if (result < VALID_RANGE[leadingOnes]) {
        throw std::ios_base::failure(strprintf(
            "non-canonical ReadMitraInt(): 0x%016x out of range for %d "
            "leading ones",
            result, leadingOnes));
    }

    return result;
}

#endif // BITCOIN_SERIALIZE_INTCODE_H

// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Utilities for converting data from/to strings.
 */
#ifndef BITCOIN_UTILSTRENCODINGS_H
#define BITCOIN_UTILSTRENCODINGS_H

#include <cstdint>
#include <string>
#include <vector>

#define BEGIN(a) ((char *)&(a))
#define END(a) ((char *)&((&(a))[1]))
#define UBEGIN(a) ((uint8_t *)&(a))
#define UEND(a) ((uint8_t *)&((&(a))[1]))
#define ARRAYLEN(array) (sizeof(array) / sizeof((array)[0]))

/** Used by SanitizeString() */
enum SafeChars {
    //!< The full set of allowed chars
    SAFE_CHARS_DEFAULT,
    //!< BIP-0014 subset
    SAFE_CHARS_UA_COMMENT,
};

/**
 * Remove unsafe chars. Safe chars chosen to allow simple messages/URLs/email
 * addresses, but avoid anything even possibly remotely dangerous like & or >
 * @param[in] str    The string to sanitize
 * @param[in] rule   The set of safe chars to choose (default: least
 * restrictive)
 * @return           A new string without unsafe chars
 */
std::string SanitizeString(const std::string &str,
                           int rule = SAFE_CHARS_DEFAULT);
std::vector<uint8_t> ParseHex(const char *psz);
std::vector<uint8_t> ParseHex(const std::string &str);
signed char HexDigit(char c);
bool IsHex(const std::string &str);
std::vector<uint8_t> DecodeBase64(const char *p, bool *pfInvalid = nullptr);
std::string DecodeBase64(const std::string &str);
std::string EncodeBase64(const uint8_t *pch, size_t len);
std::string EncodeBase64(const std::string &str);
std::vector<uint8_t> DecodeBase32(const char *p, bool *pfInvalid = nullptr);
std::string DecodeBase32(const std::string &str);
std::string EncodeBase32(const uint8_t *pch, size_t len);
std::string EncodeBase32(const std::string &str);

std::string i64tostr(int64_t n);
std::string itostr(int n);
int64_t atoi64(const char *psz);
int64_t atoi64(const std::string &str);
int atoi(const std::string &str);

/**
 * Convert string to signed 32-bit integer with strict parse error feedback.
 * @returns true if the entire string could be parsed as valid integer, false if
 * not the entire string could be parsed or when overflow or underflow occurred.
 */
bool ParseInt32(const std::string &str, int32_t *out);

/**
 * Convert string to signed 64-bit integer with strict parse error feedback.
 * @returns true if the entire string could be parsed as valid integer, false if
 * not the entire string could be parsed or when overflow or underflow occurred.
 */
bool ParseInt64(const std::string &str, int64_t *out);

/**
 * Convert decimal string to unsigned 32-bit integer with strict parse error
 * feedback.
 * @returns true if the entire string could be parsed as valid integer, false if
 * not the entire string could be parsed or when overflow or underflow occurred.
 */
bool ParseUInt32(const std::string &str, uint32_t *out);

/**
 * Convert decimal string to unsigned 64-bit integer with strict parse error
 * feedback.
 * @returns true if the entire string could be parsed as valid integer, false if
 * not the entire string could be parsed or when overflow or underflow occurred.
 */
bool ParseUInt64(const std::string &str, uint64_t *out);

/**
 * Convert string to double with strict parse error feedback.
 * @returns true if the entire string could be parsed as valid double, false if
 * not the entire string could be parsed or when overflow or underflow occurred.
 */
bool ParseDouble(const std::string &str, double *out);

template <typename T>
std::string HexStr(const T itbegin, const T itend, bool fSpaces = false) {
    std::string rv;
    static const char hexmap[16] = {'0', '1', '2', '3', '4', '5', '6', '7',
                                    '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'};
    rv.reserve((itend - itbegin) * 3);
    for (T it = itbegin; it < itend; ++it) {
        uint8_t val = uint8_t(*it);
        if (fSpaces && it != itbegin) rv.push_back(' ');
        rv.push_back(hexmap[val >> 4]);
        rv.push_back(hexmap[val & 15]);
    }

    return rv;
}

template <typename T>
inline std::string HexStr(const T &vch, bool fSpaces = false) {
    return HexStr(vch.begin(), vch.end(), fSpaces);
}

/**
 * Format a paragraph of text to a fixed width, adding spaces for indentation to
 * any added line.
 */
std::string FormatParagraph(const std::string &in, size_t width = 79,
                            size_t indent = 0);

/**
 * Timing-attack-resistant comparison.
 * Takes time proportional to length of first argument.
 */
template <typename T> bool TimingResistantEqual(const T &a, const T &b) {
    if (b.size() == 0) return a.size() == 0;
    size_t accumulator = a.size() ^ b.size();
    for (size_t i = 0; i < a.size(); i++)
        accumulator |= a[i] ^ b[i % b.size()];
    return accumulator == 0;
}

/**
 * Parse number as fixed point according to JSON number syntax.
 * See http://json.org/number.gif
 * @returns true on success, false on error.
 * @note The result must be in the range (-10^18,10^18), otherwise an overflow
 * error will trigger.
 */
bool ParseFixedPoint(const std::string &val, int decimals, int64_t *amount_out);

/**
 * Convert from one power-of-2 number base to another.
 *
 * If padding is enabled, this always return true. If not, then it returns true
 * of all the bits of the input are encoded in the output.
 */
template <int frombits, int tobits, bool pad, typename O, typename I>
bool ConvertBits(O &out, I it, I end) {
    size_t acc = 0;
    size_t bits = 0;
    constexpr size_t maxv = (1 << tobits) - 1;
    constexpr size_t max_acc = (1 << (frombits + tobits - 1)) - 1;
    while (it != end) {
        acc = ((acc << frombits) | *it) & max_acc;
        bits += frombits;
        while (bits >= tobits) {
            bits -= tobits;
            out.push_back((acc >> bits) & maxv);
        }
        ++it;
    }

    // We have remaining bits to encode but do not pad.
    if (!pad && bits) {
        return false;
    }

    // We have remaining bits to encode so we do pad.
    if (pad && bits) {
        out.push_back((acc << (tobits - bits)) & maxv);
    }

    return true;
}

#endif // BITCOIN_UTILSTRENCODINGS_H

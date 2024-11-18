// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Utilities for converting data from/to strings.
 */
#ifndef BITCOIN_UTIL_STRENCODINGS_H
#define BITCOIN_UTIL_STRENCODINGS_H

#include <span.h>

#include <charconv>
#include <cstdint>
#include <iterator>
#include <optional>
#include <string>
#include <vector>

/** Used by SanitizeString() */
enum SafeChars {
    //! The full set of allowed chars
    SAFE_CHARS_DEFAULT,
    //! BIP-0014 subset
    SAFE_CHARS_UA_COMMENT,
    //! Chars allowed in filenames
    SAFE_CHARS_FILENAME,
    //! Chars allowed in URIs (RFC 3986)
    SAFE_CHARS_URI,
};

/**
 * Remove unsafe chars. Safe chars chosen to allow simple messages/URLs/email
 * addresses, but avoid anything even possibly remotely dangerous like & or >
 * @param[in] str    The string to sanitize
 * @param[in] rule   The set of safe chars to choose (default: least
 * restrictive)
 * @return           A new string without unsafe chars
 */
std::string SanitizeString(std::string_view str, int rule = SAFE_CHARS_DEFAULT);
std::vector<uint8_t> ParseHex(std::string_view str);
signed char HexDigit(char c);
/**
 * Returns true if each character in str is a hex character, and has an even
 * number of hex digits.
 */
bool IsHex(std::string_view str);
/**
 * Return true if the string is a hex number, optionally prefixed with "0x"
 */
bool IsHexNumber(std::string_view str);
std::optional<std::vector<uint8_t>> DecodeBase64(const char *p);
std::optional<std::vector<uint8_t>> DecodeBase64(const std::string &str);
std::string EncodeBase64(Span<const uint8_t> input);
inline std::string EncodeBase64(Span<const std::byte> input) {
    return EncodeBase64(MakeUCharSpan(input));
}
inline std::string EncodeBase64(const std::string &str) {
    return EncodeBase64(MakeUCharSpan(str));
}
std::optional<std::vector<uint8_t>> DecodeBase32(const char *p);
std::optional<std::vector<uint8_t>> DecodeBase32(const std::string &str);

/**
 * Base32 encode.
 * If `pad` is true, then the output will be padded with '=' so that its length
 * is a multiple of 8.
 */
std::string EncodeBase32(Span<const uint8_t> input, bool pad = true);

/**
 * Base32 encode.
 * If `pad` is true, then the output will be padded with '=' so that its length
 * is a multiple of 8.
 */
std::string EncodeBase32(const std::string &str, bool pad = true);

void SplitHostPort(std::string in, uint16_t &portOut, std::string &hostOut);
int64_t atoi64(const std::string &str);
int atoi(const std::string &str);

/**
 * Tests if the given character is a decimal digit.
 * @param[in] c     character to test
 * @return          true if the argument is a decimal digit; otherwise false.
 */
constexpr bool IsDigit(char c) {
    return c >= '0' && c <= '9';
}

/**
 * Tests if the given character is a whitespace character. The whitespace
 * characters are: space, form-feed ('\f'), newline ('\n'), carriage return
 * ('\r'), horizontal tab ('\t'), and vertical tab ('\v').
 *
 * This function is locale independent. Under the C locale this function gives
 * the same result as std::isspace.
 *
 * @param[in] c     character to test
 * @return          true if the argument is a whitespace character; otherwise
 * false
 */
constexpr inline bool IsSpace(char c) noexcept {
    return c == ' ' || c == '\f' || c == '\n' || c == '\r' || c == '\t' ||
           c == '\v';
}

/**
 * Convert string to integral type T. Leading whitespace, a leading +, or any
 * trailing character fail the parsing. The required format expressed as regex
 * is `-?[0-9]+`.
 *
 * @returns std::nullopt if the entire string could not be parsed, or if the
 *   parsed value is not in the range representable by the type T.
 */
template <typename T> std::optional<T> ToIntegral(const std::string &str) {
    static_assert(std::is_integral<T>::value);
    T result;
    const auto [first_nonmatching, error_condition] =
        std::from_chars(str.data(), str.data() + str.size(), result);
    if (first_nonmatching != str.data() + str.size() ||
        error_condition != std::errc{}) {
        return std::nullopt;
    }
    return result;
}

/**
 * Convert string to signed 32-bit integer with strict parse error feedback.
 * @returns true if the entire string could be parsed as valid integer, false if
 * not the entire string could be parsed or when overflow or underflow occurred.
 */
[[nodiscard]] bool ParseInt32(const std::string &str, int32_t *out);

/**
 * Convert string to signed 64-bit integer with strict parse error feedback.
 * @returns true if the entire string could be parsed as valid integer, false if
 * not the entire string could be parsed or when overflow or underflow occurred.
 */
[[nodiscard]] bool ParseInt64(const std::string &str, int64_t *out);

/**
 * Convert decimal string to unsigned 8-bit integer with strict parse error
 * feedback.
 * @returns true if the entire string could be parsed as valid integer,
 *   false if not the entire string could be parsed or when overflow or
 * underflow occurred.
 */
[[nodiscard]] bool ParseUInt8(const std::string &str, uint8_t *out);

/**
 * Convert decimal string to unsigned 16-bit integer with strict parse error
 * feedback.
 * @returns true if the entire string could be parsed as valid integer,
 *   false if the entire string could not be parsed or if overflow or underflow
 *   occurred.
 */
[[nodiscard]] bool ParseUInt16(const std::string &str, uint16_t *out);

/**
 * Convert decimal string to unsigned 32-bit integer with strict parse error
 * feedback.
 * @returns true if the entire string could be parsed as valid integer, false if
 * not the entire string could be parsed or when overflow or underflow occurred.
 */
[[nodiscard]] bool ParseUInt32(const std::string &str, uint32_t *out);

/**
 * Convert decimal string to unsigned 64-bit integer with strict parse error
 * feedback.
 * @returns true if the entire string could be parsed as valid integer, false if
 * not the entire string could be parsed or when overflow or underflow occurred.
 */
[[nodiscard]] bool ParseUInt64(const std::string &str, uint64_t *out);

/**
 * Convert a span of bytes to a lower-case hexadecimal string.
 */
std::string HexStr(const Span<const uint8_t> s);
inline std::string HexStr(const Span<const char> s) {
    return HexStr(MakeUCharSpan(s));
}
inline std::string HexStr(const Span<const std::byte> s) {
    return HexStr(MakeUCharSpan(s));
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
    if (b.size() == 0) {
        return a.size() == 0;
    }
    size_t accumulator = a.size() ^ b.size();
    for (size_t i = 0; i < a.size(); i++) {
        accumulator |= size_t(a[i] ^ b[i % b.size()]);
    }
    return accumulator == 0;
}

/**
 * Parse number as fixed point according to JSON number syntax.
 * See http://json.org/number.gif
 * @returns true on success, false on error.
 * @note The result must be in the range (-10^18,10^18), otherwise an overflow
 * error will trigger.
 */
[[nodiscard]] bool ParseFixedPoint(const std::string &val, int decimals,
                                   int64_t *amount_out);

/**
 * Convert from one power-of-2 number base to another.
 *
 * If padding is enabled, this always return true. If not, then it returns true
 * of all the bits of the input are encoded in the output.
 */
template <int frombits, int tobits, bool pad, typename O, typename I>
bool ConvertBits(const O &outfn, I it, I end) {
    size_t acc = 0;
    size_t bits = 0;
    constexpr size_t maxv = (1 << tobits) - 1;
    constexpr size_t max_acc = (1 << (frombits + tobits - 1)) - 1;
    while (it != end) {
        acc = ((acc << frombits) | *it) & max_acc;
        bits += frombits;
        while (bits >= tobits) {
            bits -= tobits;
            outfn((acc >> bits) & maxv);
        }
        ++it;
    }

    if (pad) {
        if (bits) {
            outfn((acc << (tobits - bits)) & maxv);
        }
    } else if (bits >= frombits || ((acc << (tobits - bits)) & maxv)) {
        return false;
    }

    return true;
}

/**
 * Converts the given character to its lowercase equivalent.
 * This function is locale independent. It only converts uppercase
 * characters in the standard 7-bit ASCII range.
 * This is a feature, not a limitation.
 *
 * @param[in] c     the character to convert to lowercase.
 * @return          the lowercase equivalent of c; or the argument
 *                  if no conversion is possible.
 */
constexpr char ToLower(char c) {
    return (c >= 'A' && c <= 'Z' ? (c - 'A') + 'a' : c);
}

/**
 * Returns the lowercase equivalent of the given string.
 * This function is locale independent. It only converts uppercase
 * characters in the standard 7-bit ASCII range.
 * This is a feature, not a limitation.
 *
 * @param[in] str   the string to convert to lowercase.
 * @returns         lowercased equivalent of str
 */
std::string ToLower(const std::string &str);

/**
 * Converts the given character to its uppercase equivalent.
 * This function is locale independent. It only converts lowercase
 * characters in the standard 7-bit ASCII range.
 * This is a feature, not a limitation.
 *
 * @param[in] c     the character to convert to uppercase.
 * @return          the uppercase equivalent of c; or the argument
 *                  if no conversion is possible.
 */
constexpr char ToUpper(char c) {
    return (c >= 'a' && c <= 'z' ? (c - 'a') + 'A' : c);
}

/**
 * Returns the uppercase equivalent of the given string.
 * This function is locale independent. It only converts lowercase
 * characters in the standard 7-bit ASCII range.
 * This is a feature, not a limitation.
 *
 * @param[in] str   the string to convert to uppercase.
 * @returns         UPPERCASED EQUIVALENT OF str
 */
std::string ToUpper(const std::string &str);

/**
 * Capitalizes the first character of the given string.
 * This function is locale independent. It only converts lowercase
 * characters in the standard 7-bit ASCII range.
 * This is a feature, not a limitation.
 *
 * @param[in] str   the string to capitalize.
 * @returns         string with the first letter capitalized.
 */
std::string Capitalize(std::string str);

#endif // BITCOIN_UTIL_STRENCODINGS_H

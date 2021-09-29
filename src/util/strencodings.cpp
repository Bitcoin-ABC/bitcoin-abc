// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <util/strencodings.h>
#include <util/string.h>

#include <tinyformat.h>

#include <algorithm>
#include <cerrno>
#include <cstdlib>
#include <cstring>
#include <limits>

static const std::string CHARS_ALPHA_NUM =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

static const std::string SAFE_CHARS[] = {
    // SAFE_CHARS_DEFAULT
    CHARS_ALPHA_NUM + " .,;-_/:?@()",
    // SAFE_CHARS_UA_COMMENT
    CHARS_ALPHA_NUM + " .,;-_?@",
    // SAFE_CHARS_FILENAME
    CHARS_ALPHA_NUM + ".-_",
    // SAFE_CHARS_URI
    CHARS_ALPHA_NUM + "!*'();:@&=+$,/?#[]-_.~%",
};

std::string SanitizeString(const std::string &str, int rule) {
    std::string strResult;
    for (std::string::size_type i = 0; i < str.size(); i++) {
        if (SAFE_CHARS[rule].find(str[i]) != std::string::npos) {
            strResult.push_back(str[i]);
        }
    }
    return strResult;
}

const signed char p_util_hexdigit[256] = {
    -1, -1,  -1,  -1,  -1,  -1,  -1,  -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1,  -1,  -1,  -1,  -1,  -1,  -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1,  -1,  -1,  -1,  -1,  -1,  -1, -1, -1, -1, -1, -1, -1, -1, -1,
    0,  1,   2,   3,   4,   5,   6,   7,  8,  9,  -1, -1, -1, -1, -1, -1,
    -1, 0xa, 0xb, 0xc, 0xd, 0xe, 0xf, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1,  -1,  -1,  -1,  -1,  -1,  -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, 0xa, 0xb, 0xc, 0xd, 0xe, 0xf, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1,  -1,  -1,  -1,  -1,  -1,  -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1,  -1,  -1,  -1,  -1,  -1,  -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1,  -1,  -1,  -1,  -1,  -1,  -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1,  -1,  -1,  -1,  -1,  -1,  -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1,  -1,  -1,  -1,  -1,  -1,  -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1,  -1,  -1,  -1,  -1,  -1,  -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1,  -1,  -1,  -1,  -1,  -1,  -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1,  -1,  -1,  -1,  -1,  -1,  -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1,  -1,  -1,  -1,  -1,  -1,  -1, -1, -1, -1, -1, -1, -1, -1, -1,
};

signed char HexDigit(char c) {
    return p_util_hexdigit[(uint8_t)c];
}

bool IsHex(const std::string &str) {
    for (std::string::const_iterator it(str.begin()); it != str.end(); ++it) {
        if (HexDigit(*it) < 0) {
            return false;
        }
    }
    return (str.size() > 0) && (str.size() % 2 == 0);
}

bool IsHexNumber(const std::string &str) {
    size_t starting_location = 0;
    if (str.size() > 2 && *str.begin() == '0' && *(str.begin() + 1) == 'x') {
        starting_location = 2;
    }
    for (auto c : str.substr(starting_location)) {
        if (HexDigit(c) < 0) {
            return false;
        }
    }
    // Return false for empty string or "0x".
    return (str.size() > starting_location);
}

std::vector<uint8_t> ParseHex(const char *psz) {
    // convert hex dump to vector
    std::vector<uint8_t> vch;
    while (true) {
        while (IsSpace(*psz)) {
            psz++;
        }
        signed char c = HexDigit(*psz++);
        if (c == (signed char)-1) {
            break;
        }
        uint8_t n = (c << 4);
        c = HexDigit(*psz++);
        if (c == (signed char)-1) {
            break;
        }
        n |= c;
        vch.push_back(n);
    }
    return vch;
}

std::vector<uint8_t> ParseHex(const std::string &str) {
    return ParseHex(str.c_str());
}

void SplitHostPort(std::string in, int &portOut, std::string &hostOut) {
    size_t colon = in.find_last_of(':');
    // if a : is found, and it either follows a [...], or no other : is in the
    // string, treat it as port separator
    bool fHaveColon = colon != in.npos;
    // if there is a colon, and in[0]=='[', colon is not 0, so in[colon-1] is
    // safe
    bool fBracketed = fHaveColon && (in[0] == '[' && in[colon - 1] == ']');
    bool fMultiColon =
        fHaveColon && (in.find_last_of(':', colon - 1) != in.npos);
    if (fHaveColon && (colon == 0 || fBracketed || !fMultiColon)) {
        int32_t n;
        if (ParseInt32(in.substr(colon + 1), &n) && n > 0 && n < 0x10000) {
            in = in.substr(0, colon);
            portOut = n;
        }
    }
    if (in.size() > 0 && in[0] == '[' && in[in.size() - 1] == ']') {
        hostOut = in.substr(1, in.size() - 2);
    } else {
        hostOut = in;
    }
}

std::string EncodeBase64(Span<const uint8_t> input) {
    static const char *pbase64 =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    std::string str;
    str.reserve(((input.size() + 2) / 3) * 4);
    ConvertBits<8, 6, true>([&](int v) { str += pbase64[v]; }, input.begin(),
                            input.end());
    while (str.size() % 4) {
        str += '=';
    }
    return str;
}

std::string EncodeBase64(const std::string &str) {
    return EncodeBase64(MakeUCharSpan(str));
}

std::vector<uint8_t> DecodeBase64(const char *p, bool *pf_invalid) {
    static const int decode64_table[256] = {
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63, 52, 53, 54, 55, 56, 57,
        58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1, 0,  1,  2,  3,  4,  5,  6,
        7,  8,  9,  10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
        25, -1, -1, -1, -1, -1, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
        37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1};

    const char *e = p;
    std::vector<uint8_t> val;
    val.reserve(strlen(p));
    while (*p != 0) {
        int x = decode64_table[(uint8_t)*p];
        if (x == -1) {
            break;
        }
        val.push_back(x);
        ++p;
    }

    std::vector<uint8_t> ret;
    ret.reserve((val.size() * 3) / 4);
    bool valid = ConvertBits<6, 8, false>([&](uint8_t c) { ret.push_back(c); },
                                          val.begin(), val.end());

    const char *q = p;
    while (valid && *p != 0) {
        if (*p != '=') {
            valid = false;
            break;
        }
        ++p;
    }
    valid = valid && (p - e) % 4 == 0 && p - q < 4;
    if (pf_invalid) {
        *pf_invalid = !valid;
    }

    return ret;
}

std::string DecodeBase64(const std::string &str, bool *pf_invalid) {
    if (!ValidAsCString(str)) {
        if (pf_invalid) {
            *pf_invalid = true;
        }
        return {};
    }
    std::vector<uint8_t> vchRet = DecodeBase64(str.c_str(), pf_invalid);
    return std::string((const char *)vchRet.data(), vchRet.size());
}

std::string EncodeBase32(Span<const uint8_t> input, bool pad) {
    static const char *pbase32 = "abcdefghijklmnopqrstuvwxyz234567";

    std::string str;
    str.reserve(((input.size() + 4) / 5) * 8);
    ConvertBits<8, 5, true>([&](int v) { str += pbase32[v]; }, input.begin(),
                            input.end());
    if (pad) {
        while (str.size() % 8) {
            str += '=';
        }
    }
    return str;
}

std::string EncodeBase32(const std::string &str, bool pad) {
    return EncodeBase32(MakeUCharSpan(str), pad);
}

std::vector<uint8_t> DecodeBase32(const char *p, bool *pf_invalid) {
    static const int decode32_table[256] = {
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 26, 27, 28, 29,
        30, 31, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0,  1,  2,  3,  4,  5,  6,
        7,  8,  9,  10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
        25, -1, -1, -1, -1, -1, -1, 0,  1,  2,  3,  4,  5,  6,  7,  8,  9,  10,
        11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1};

    const char *e = p;
    std::vector<uint8_t> val;
    val.reserve(strlen(p));
    while (*p != 0) {
        int x = decode32_table[(uint8_t)*p];
        if (x == -1) {
            break;
        }
        val.push_back(x);
        ++p;
    }

    std::vector<uint8_t> ret;
    ret.reserve((val.size() * 5) / 8);
    bool valid = ConvertBits<5, 8, false>([&](uint8_t c) { ret.push_back(c); },
                                          val.begin(), val.end());

    const char *q = p;
    while (valid && *p != 0) {
        if (*p != '=') {
            valid = false;
            break;
        }
        ++p;
    }
    valid = valid && (p - e) % 8 == 0 && p - q < 8;
    if (pf_invalid) {
        *pf_invalid = !valid;
    }

    return ret;
}

std::string DecodeBase32(const std::string &str, bool *pf_invalid) {
    if (!ValidAsCString(str)) {
        if (pf_invalid) {
            *pf_invalid = true;
        }
        return {};
    }
    std::vector<uint8_t> vchRet = DecodeBase32(str.c_str(), pf_invalid);
    return std::string((const char *)vchRet.data(), vchRet.size());
}

NODISCARD static bool ParsePrechecks(const std::string &str) {
    // No empty string allowed
    if (str.empty()) {
        return false;
    }
    // No padding allowed
    if (str.size() >= 1 && (IsSpace(str[0]) || IsSpace(str[str.size() - 1]))) {
        return false;
    }
    // No embedded NUL characters allowed
    if (!ValidAsCString(str)) {
        return false;
    }
    return true;
}

bool ParseInt32(const std::string &str, int32_t *out) {
    if (!ParsePrechecks(str)) {
        return false;
    }
    char *endp = nullptr;
    // strtol will not set errno if valid
    errno = 0;
    long int n = strtol(str.c_str(), &endp, 10);
    if (out) {
        *out = (int32_t)n;
    }
    // Note that strtol returns a *long int*, so even if strtol doesn't report
    // an over/underflow we still have to check that the returned value is
    // within the range of an *int32_t*. On 64-bit platforms the size of these
    // types may be different.
    return endp && *endp == 0 && !errno &&
           n >= std::numeric_limits<int32_t>::min() &&
           n <= std::numeric_limits<int32_t>::max();
}

bool ParseInt64(const std::string &str, int64_t *out) {
    if (!ParsePrechecks(str)) {
        return false;
    }
    char *endp = nullptr;
    // strtoll will not set errno if valid
    errno = 0;
    long long int n = strtoll(str.c_str(), &endp, 10);
    if (out) {
        *out = (int64_t)n;
    }
    // Note that strtoll returns a *long long int*, so even if strtol doesn't
    // report an over/underflow we still have to check that the returned value
    // is within the range of an *int64_t*.
    return endp && *endp == 0 && !errno &&
           n >= std::numeric_limits<int64_t>::min() &&
           n <= std::numeric_limits<int64_t>::max();
}

bool ParseUInt8(const std::string &str, uint8_t *out) {
    uint32_t u32;
    if (!ParseUInt32(str, &u32) || u32 > std::numeric_limits<uint8_t>::max()) {
        return false;
    }
    if (out != nullptr) {
        *out = static_cast<uint8_t>(u32);
    }
    return true;
}

bool ParseUInt32(const std::string &str, uint32_t *out) {
    if (!ParsePrechecks(str)) {
        return false;
    }
    // Reject negative values, unfortunately strtoul accepts these by default if
    // they fit in the range
    if (str.size() >= 1 && str[0] == '-') {
        return false;
    }
    char *endp = nullptr;
    // strtoul will not set errno if valid
    errno = 0;
    unsigned long int n = strtoul(str.c_str(), &endp, 10);
    if (out) {
        *out = (uint32_t)n;
    }
    // Note that strtoul returns a *unsigned long int*, so even if it doesn't
    // report an over/underflow we still have to check that the returned value
    // is within the range of an *uint32_t*. On 64-bit platforms the size of
    // these types may be different.
    return endp && *endp == 0 && !errno &&
           n <= std::numeric_limits<uint32_t>::max();
}

bool ParseUInt64(const std::string &str, uint64_t *out) {
    if (!ParsePrechecks(str)) {
        return false;
    }
    // Reject negative values, unfortunately strtoull accepts these by default
    // if they fit in the range
    if (str.size() >= 1 && str[0] == '-') {
        return false;
    }
    char *endp = nullptr;
    // strtoull will not set errno if valid
    errno = 0;
    unsigned long long int n = strtoull(str.c_str(), &endp, 10);
    if (out) {
        *out = (uint64_t)n;
    }
    // Note that strtoull returns a *unsigned long long int*, so even if it
    // doesn't report an over/underflow we still have to check that the returned
    // value is within the range of an *uint64_t*.
    return endp && *endp == 0 && !errno &&
           n <= std::numeric_limits<uint64_t>::max();
}

bool ParseDouble(const std::string &str, double *out) {
    if (!ParsePrechecks(str)) {
        return false;
    }
    // No hexadecimal floats allowed
    if (str.size() >= 2 && str[0] == '0' && str[1] == 'x') {
        return false;
    }
    std::istringstream text(str);
    text.imbue(std::locale::classic());
    double result;
    text >> result;
    if (out) {
        *out = result;
    }
    return text.eof() && !text.fail();
}

std::string FormatParagraph(const std::string &in, size_t width,
                            size_t indent) {
    std::stringstream out;
    size_t ptr = 0;
    size_t indented = 0;
    while (ptr < in.size()) {
        size_t lineend = in.find_first_of('\n', ptr);
        if (lineend == std::string::npos) {
            lineend = in.size();
        }
        const size_t linelen = lineend - ptr;
        const size_t rem_width = width - indented;
        if (linelen <= rem_width) {
            out << in.substr(ptr, linelen + 1);
            ptr = lineend + 1;
            indented = 0;
        } else {
            size_t finalspace = in.find_last_of(" \n", ptr + rem_width);
            if (finalspace == std::string::npos || finalspace < ptr) {
                // No place to break; just include the entire word and move on
                finalspace = in.find_first_of("\n ", ptr);
                if (finalspace == std::string::npos) {
                    // End of the string, just add it and break
                    out << in.substr(ptr);
                    break;
                }
            }
            out << in.substr(ptr, finalspace - ptr) << "\n";
            if (in[finalspace] == '\n') {
                indented = 0;
            } else if (indent) {
                out << std::string(indent, ' ');
                indented = indent;
            }
            ptr = finalspace + 1;
        }
    }
    return out.str();
}

int64_t atoi64(const std::string &str) {
#ifdef _MSC_VER
    return _atoi64(str.c_str());
#else
    return strtoll(str.c_str(), nullptr, 10);
#endif
}

int atoi(const std::string &str) {
    return atoi(str.c_str());
}

/**
 * Upper bound for mantissa.
 * 10^18-1 is the largest arbitrary decimal that will fit in a signed 64-bit
 * integer. Larger integers cannot consist of arbitrary combinations of 0-9:
 *
 *   999999999999999999  1^18-1
 *  9223372036854775807  (1<<63)-1  (max int64_t)
 *  9999999999999999999  1^19-1     (would overflow)
 */
static const int64_t UPPER_BOUND = 1000000000000000000LL - 1LL;

/** Helper function for ParseFixedPoint */
static inline bool ProcessMantissaDigit(char ch, int64_t &mantissa,
                                        int &mantissa_tzeros) {
    if (ch == '0') {
        ++mantissa_tzeros;
    } else {
        for (int i = 0; i <= mantissa_tzeros; ++i) {
            // overflow
            if (mantissa > (UPPER_BOUND / 10LL)) {
                return false;
            }
            mantissa *= 10;
        }
        mantissa += ch - '0';
        mantissa_tzeros = 0;
    }
    return true;
}

bool ParseFixedPoint(const std::string &val, int decimals,
                     int64_t *amount_out) {
    int64_t mantissa = 0;
    int64_t exponent = 0;
    int mantissa_tzeros = 0;
    bool mantissa_sign = false;
    bool exponent_sign = false;
    int ptr = 0;
    int end = val.size();
    int point_ofs = 0;

    if (ptr < end && val[ptr] == '-') {
        mantissa_sign = true;
        ++ptr;
    }
    if (ptr < end) {
        if (val[ptr] == '0') {
            // pass single 0
            ++ptr;
        } else if (val[ptr] >= '1' && val[ptr] <= '9') {
            while (ptr < end && IsDigit(val[ptr])) {
                if (!ProcessMantissaDigit(val[ptr], mantissa,
                                          mantissa_tzeros)) {
                    // overflow
                    return false;
                }
                ++ptr;
            }
        } else {
            // missing expected digit
            return false;
        }
    } else {
        // empty string or loose '-'
        return false;
    }
    if (ptr < end && val[ptr] == '.') {
        ++ptr;
        if (ptr < end && IsDigit(val[ptr])) {
            while (ptr < end && IsDigit(val[ptr])) {
                if (!ProcessMantissaDigit(val[ptr], mantissa,
                                          mantissa_tzeros)) {
                    // overflow
                    return false;
                }
                ++ptr;
                ++point_ofs;
            }
        } else {
            // missing expected digit
            return false;
        }
    }
    if (ptr < end && (val[ptr] == 'e' || val[ptr] == 'E')) {
        ++ptr;
        if (ptr < end && val[ptr] == '+') {
            ++ptr;
        } else if (ptr < end && val[ptr] == '-') {
            exponent_sign = true;
            ++ptr;
        }
        if (ptr < end && IsDigit(val[ptr])) {
            while (ptr < end && IsDigit(val[ptr])) {
                if (exponent > (UPPER_BOUND / 10LL)) {
                    // overflow
                    return false;
                }
                exponent = exponent * 10 + val[ptr] - '0';
                ++ptr;
            }
        } else {
            // missing expected digit
            return false;
        }
    }
    if (ptr != end) {
        // trailing garbage
        return false;
    }
    // finalize exponent
    if (exponent_sign) {
        exponent = -exponent;
    }
    exponent = exponent - point_ofs + mantissa_tzeros;

    // finalize mantissa
    if (mantissa_sign) {
        mantissa = -mantissa;
    }

    // convert to one 64-bit fixed-point value
    exponent += decimals;
    if (exponent < 0) {
        // cannot represent values smaller than 10^-decimals
        return false;
    }
    if (exponent >= 18) {
        // cannot represent values larger than or equal to 10^(18-decimals)
        return false;
    }

    for (int i = 0; i < exponent; ++i) {
        if (mantissa > (UPPER_BOUND / 10LL) ||
            mantissa < -(UPPER_BOUND / 10LL)) {
            // overflow
            return false;
        }
        mantissa *= 10;
    }
    if (mantissa > UPPER_BOUND || mantissa < -UPPER_BOUND) {
        // overflow
        return false;
    }

    if (amount_out) {
        *amount_out = mantissa;
    }

    return true;
}

std::string ToLower(const std::string &str) {
    std::string r;
    for (auto ch : str) {
        r += ToLower(ch);
    }
    return r;
}

std::string ToUpper(const std::string &str) {
    std::string r;
    for (auto ch : str) {
        r += ToUpper(ch);
    }
    return r;
}

std::string Capitalize(std::string str) {
    if (str.empty()) {
        return str;
    }
    str[0] = ToUpper(str.front());
    return str;
}

std::string HexStr(const Span<const uint8_t> s) {
    std::string rv;
    static constexpr char hexmap[16] = {'0', '1', '2', '3', '4', '5', '6', '7',
                                        '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'};
    rv.reserve(s.size() * 2);
    for (uint8_t v : s) {
        rv.push_back(hexmap[v >> 4]);
        rv.push_back(hexmap[v & 15]);
    }
    return rv;
}

// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "utilstrencodings.h"

#include "tinyformat.h"

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
    bool fBracketed =
        fHaveColon &&
        (in[0] == '[' && in[colon - 1] == ']'); // if there is a colon, and
                                                // in[0]=='[', colon is not 0,
                                                // so in[colon-1] is safe
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

std::string EncodeBase64(const uint8_t *pch, size_t len) {
    static const char *pbase64 =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    std::string strRet = "";
    strRet.reserve((len + 2) / 3 * 4);

    int mode = 0, left = 0;
    const uint8_t *pchEnd = pch + len;

    while (pch < pchEnd) {
        int enc = *(pch++);
        switch (mode) {
            case 0: // we have no bits
                strRet += pbase64[enc >> 2];
                left = (enc & 3) << 4;
                mode = 1;
                break;

            case 1: // we have two bits
                strRet += pbase64[left | (enc >> 4)];
                left = (enc & 15) << 2;
                mode = 2;
                break;

            case 2: // we have four bits
                strRet += pbase64[left | (enc >> 6)];
                strRet += pbase64[enc & 63];
                mode = 0;
                break;
        }
    }

    if (mode) {
        strRet += pbase64[left];
        strRet += '=';
        if (mode == 1) {
            strRet += '=';
        }
    }

    return strRet;
}

std::string EncodeBase64(const std::string &str) {
    return EncodeBase64((const uint8_t *)str.c_str(), str.size());
}

std::vector<uint8_t> DecodeBase64(const char *p, bool *pfInvalid) {
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

    if (pfInvalid) {
        *pfInvalid = false;
    }

    std::vector<uint8_t> vchRet;
    vchRet.reserve(strlen(p) * 3 / 4);

    int mode = 0;
    int left = 0;

    while (1) {
        int dec = decode64_table[(uint8_t)*p];
        if (dec == -1) {
            break;
        }
        p++;
        switch (mode) {
            case 0: // we have no bits and get 6
                left = dec;
                mode = 1;
                break;

            case 1: // we have 6 bits and keep 4
                vchRet.push_back((left << 2) | (dec >> 4));
                left = dec & 15;
                mode = 2;
                break;

            case 2: // we have 4 bits and get 6, we keep 2
                vchRet.push_back((left << 4) | (dec >> 2));
                left = dec & 3;
                mode = 3;
                break;

            case 3: // we have 2 bits and get 6
                vchRet.push_back((left << 6) | dec);
                mode = 0;
                break;
        }
    }

    if (pfInvalid) {
        switch (mode) {
            case 0: // 4n base64 characters processed: ok
                break;

            case 1: // 4n+1 base64 character processed: impossible
                *pfInvalid = true;
                break;

            case 2: // 4n+2 base64 characters processed: require '=='
                if (left || p[0] != '=' || p[1] != '=' ||
                    decode64_table[(uint8_t)p[2]] != -1) {
                    *pfInvalid = true;
                }
                break;

            case 3: // 4n+3 base64 characters processed: require '='
                if (left || p[0] != '=' ||
                    decode64_table[(uint8_t)p[1]] != -1) {
                    *pfInvalid = true;
                }
                break;
        }
    }

    return vchRet;
}

std::string DecodeBase64(const std::string &str) {
    std::vector<uint8_t> vchRet = DecodeBase64(str.c_str());
    return (vchRet.size() == 0)
               ? std::string()
               : std::string((const char *)&vchRet[0], vchRet.size());
}

std::string EncodeBase32(const uint8_t *pch, size_t len) {
    static const char *pbase32 = "abcdefghijklmnopqrstuvwxyz234567";

    std::string strRet = "";
    strRet.reserve((len + 4) / 5 * 8);

    int mode = 0, left = 0;
    const uint8_t *pchEnd = pch + len;

    while (pch < pchEnd) {
        int enc = *(pch++);
        switch (mode) {
            case 0: // we have no bits
                strRet += pbase32[enc >> 3];
                left = (enc & 7) << 2;
                mode = 1;
                break;

            case 1: // we have three bits
                strRet += pbase32[left | (enc >> 6)];
                strRet += pbase32[(enc >> 1) & 31];
                left = (enc & 1) << 4;
                mode = 2;
                break;

            case 2: // we have one bit
                strRet += pbase32[left | (enc >> 4)];
                left = (enc & 15) << 1;
                mode = 3;
                break;

            case 3: // we have four bits
                strRet += pbase32[left | (enc >> 7)];
                strRet += pbase32[(enc >> 2) & 31];
                left = (enc & 3) << 3;
                mode = 4;
                break;

            case 4: // we have two bits
                strRet += pbase32[left | (enc >> 5)];
                strRet += pbase32[enc & 31];
                mode = 0;
        }
    }

    static const int nPadding[5] = {0, 6, 4, 3, 1};
    if (mode) {
        strRet += pbase32[left];
        for (int n = 0; n < nPadding[mode]; n++) {
            strRet += '=';
        }
    }

    return strRet;
}

std::string EncodeBase32(const std::string &str) {
    return EncodeBase32((const uint8_t *)str.c_str(), str.size());
}

std::vector<uint8_t> DecodeBase32(const char *p, bool *pfInvalid) {
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

    if (pfInvalid) {
        *pfInvalid = false;
    }

    std::vector<uint8_t> vchRet;
    vchRet.reserve((strlen(p)) * 5 / 8);

    int mode = 0;
    int left = 0;

    while (1) {
        int dec = decode32_table[(uint8_t)*p];
        if (dec == -1) {
            break;
        }
        p++;
        switch (mode) {
            case 0: // we have no bits and get 5
                left = dec;
                mode = 1;
                break;

            case 1: // we have 5 bits and keep 2
                vchRet.push_back((left << 3) | (dec >> 2));
                left = dec & 3;
                mode = 2;
                break;

            case 2: // we have 2 bits and keep 7
                left = left << 5 | dec;
                mode = 3;
                break;

            case 3: // we have 7 bits and keep 4
                vchRet.push_back((left << 1) | (dec >> 4));
                left = dec & 15;
                mode = 4;
                break;

            case 4: // we have 4 bits, and keep 1
                vchRet.push_back((left << 4) | (dec >> 1));
                left = dec & 1;
                mode = 5;
                break;

            case 5: // we have 1 bit, and keep 6
                left = left << 5 | dec;
                mode = 6;
                break;

            case 6: // we have 6 bits, and keep 3
                vchRet.push_back((left << 2) | (dec >> 3));
                left = dec & 7;
                mode = 7;
                break;

            case 7: // we have 3 bits, and keep 0
                vchRet.push_back((left << 5) | dec);
                mode = 0;
                break;
        }
    }

    if (pfInvalid) switch (mode) {
            case 0: // 8n base32 characters processed: ok
                break;

            case 1: // 8n+1 base32 characters processed: impossible
            case 3: //   +3
            case 6: //   +6
                *pfInvalid = true;
                break;

            case 2: // 8n+2 base32 characters processed: require '======'
                if (left || p[0] != '=' || p[1] != '=' || p[2] != '=' ||
                    p[3] != '=' || p[4] != '=' || p[5] != '=' ||
                    decode32_table[(uint8_t)p[6]] != -1) {
                    *pfInvalid = true;
                }
                break;

            case 4: // 8n+4 base32 characters processed: require '===='
                if (left || p[0] != '=' || p[1] != '=' || p[2] != '=' ||
                    p[3] != '=' || decode32_table[(uint8_t)p[4]] != -1) {
                    *pfInvalid = true;
                }
                break;

            case 5: // 8n+5 base32 characters processed: require '==='
                if (left || p[0] != '=' || p[1] != '=' || p[2] != '=' ||
                    decode32_table[(uint8_t)p[3]] != -1) {
                    *pfInvalid = true;
                }
                break;

            case 7: // 8n+7 base32 characters processed: require '='
                if (left || p[0] != '=' ||
                    decode32_table[(uint8_t)p[1]] != -1) {
                    *pfInvalid = true;
                }
                break;
        }

    return vchRet;
}

std::string DecodeBase32(const std::string &str) {
    std::vector<uint8_t> vchRet = DecodeBase32(str.c_str());
    return (vchRet.size() == 0)
               ? std::string()
               : std::string((const char *)&vchRet[0], vchRet.size());
}

static bool ParsePrechecks(const std::string &str) {
    // No empty string allowed
    if (str.empty()) {
        return false;
    }
    // No padding allowed
    if (str.size() >= 1 && (IsSpace(str[0]) || IsSpace(str[str.size() - 1]))) {
        return false;
    }
    // No embedded NUL characters allowed
    if (str.size() != strlen(str.c_str())) {
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
    // Note that strtol returns a *long int*, so even if strtol doesn't report a
    // over/underflow we still have to check that the returned value is within
    // the range of an *int32_t*. On 64-bit platforms the size of these types
    // may be different.
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
    // report a over/underflow we still have to check that the returned value is
    // within the range of an *int64_t*.
    return endp && *endp == 0 && !errno &&
           n >= std::numeric_limits<int64_t>::min() &&
           n <= std::numeric_limits<int64_t>::max();
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
    // report a over/underflow we still have to check that the returned value is
    // within the range of an *uint32_t*. On 64-bit platforms the size of these
    // types may be different.
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
    // doesn't report a over/underflow we still have to check that the returned
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

std::string i64tostr(int64_t n) {
    return strprintf("%d", n);
}

std::string itostr(int n) {
    return strprintf("%d", n);
}

int64_t atoi64(const char *psz) {
#ifdef _MSC_VER
    return _atoi64(psz);
#else
    return strtoll(psz, nullptr, 10);
#endif
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
            while (ptr < end && val[ptr] >= '0' && val[ptr] <= '9') {
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
        if (ptr < end && val[ptr] >= '0' && val[ptr] <= '9') {
            while (ptr < end && val[ptr] >= '0' && val[ptr] <= '9') {
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
        if (ptr < end && val[ptr] >= '0' && val[ptr] <= '9') {
            while (ptr < end && val[ptr] >= '0' && val[ptr] <= '9') {
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

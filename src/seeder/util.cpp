#include "util.h"
#include <stdio.h>

using namespace std;

string vstrprintf(const std::string &format, va_list ap) {
    char buffer[50000];
    char *p = buffer;
    int limit = sizeof(buffer);
    int ret;
    loop {
        va_list arg_ptr;
        va_copy(arg_ptr, ap);
        ret = vsnprintf(p, limit, format.c_str(), arg_ptr);
        va_end(arg_ptr);
        if (ret >= 0 && ret < limit) break;
        if (p != buffer) delete[] p;
        limit *= 2;
        p = new char[limit];
        if (p == NULL) throw std::bad_alloc();
    }
    string str(p, p + ret);
    if (p != buffer) delete[] p;
    return str;
}

string EncodeBase32(const unsigned char *pch, size_t len) {
    static const char *pbase32 = "abcdefghijklmnopqrstuvwxyz234567";

    string strRet = "";
    strRet.reserve((len + 4) / 5 * 8);

    int mode = 0, left = 0;
    const unsigned char *pchEnd = pch + len;

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
        for (int n = 0; n < nPadding[mode]; n++)
            strRet += '=';
    }

    return strRet;
}

string EncodeBase32(const string &str) {
    return EncodeBase32((const unsigned char *)str.c_str(), str.size());
}

vector<unsigned char> DecodeBase32(const char *p, bool *pfInvalid) {
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

    if (pfInvalid) *pfInvalid = false;

    vector<unsigned char> vchRet;
    vchRet.reserve((strlen(p)) * 5 / 8);

    int mode = 0;
    int left = 0;

    while (1) {
        int dec = decode32_table[(unsigned char)*p];
        if (dec == -1) break;
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
                    decode32_table[(unsigned char)p[6]] != -1)
                    *pfInvalid = true;
                break;

            case 4: // 8n+4 base32 characters processed: require '===='
                if (left || p[0] != '=' || p[1] != '=' || p[2] != '=' ||
                    p[3] != '=' || decode32_table[(unsigned char)p[4]] != -1)
                    *pfInvalid = true;
                break;

            case 5: // 8n+5 base32 characters processed: require '==='
                if (left || p[0] != '=' || p[1] != '=' || p[2] != '=' ||
                    decode32_table[(unsigned char)p[3]] != -1)
                    *pfInvalid = true;
                break;

            case 7: // 8n+7 base32 characters processed: require '='
                if (left || p[0] != '=' ||
                    decode32_table[(unsigned char)p[1]] != -1)
                    *pfInvalid = true;
                break;
        }

    return vchRet;
}

string DecodeBase32(const string &str) {
    vector<unsigned char> vchRet = DecodeBase32(str.c_str());
    return string((const char *)&vchRet[0], vchRet.size());
}

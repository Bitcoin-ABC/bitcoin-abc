// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "test/sigutil.h"

#include <cassert>

void NegateSignatureS(std::vector<uint8_t> &vchSig) {
    // Parse the signature.
    std::vector<uint8_t> r, s;
    r = std::vector<uint8_t>(vchSig.begin() + 4,
                             vchSig.begin() + 4 + vchSig[3]);
    s = std::vector<uint8_t>(vchSig.begin() + 6 + vchSig[3],
                             vchSig.begin() + 6 + vchSig[3] +
                                 vchSig[5 + vchSig[3]]);

    // Really ugly to implement mod-n negation here, but it would be feature
    // creep to expose such functionality from libsecp256k1.
    static const uint8_t order[33] = {
        0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFE, 0xBA, 0xAE, 0xDC, 0xE6, 0xAF,
        0x48, 0xA0, 0x3B, 0xBF, 0xD2, 0x5E, 0x8C, 0xD0, 0x36, 0x41, 0x41};
    while (s.size() < 33) {
        s.insert(s.begin(), 0x00);
    }

    int carry = 0;
    for (int p = 32; p >= 1; p--) {
        int n = (int)order[p] - s[p] - carry;
        s[p] = (n + 256) & 0xFF;
        carry = (n < 0);
    }

    assert(carry == 0);
    if (s.size() > 1 && s[0] == 0 && s[1] < 0x80) {
        s.erase(s.begin());
    }

    // Reconstruct the signature.
    vchSig.clear();
    vchSig.push_back(0x30);
    vchSig.push_back(4 + r.size() + s.size());
    vchSig.push_back(0x02);
    vchSig.push_back(r.size());
    vchSig.insert(vchSig.end(), r.begin(), r.end());
    vchSig.push_back(0x02);
    vchSig.push_back(s.size());
    vchSig.insert(vchSig.end(), s.begin(), s.end());
}

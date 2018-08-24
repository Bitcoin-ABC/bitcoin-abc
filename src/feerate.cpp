// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "feerate.h"
#include "amount.h"

#include "tinyformat.h"

CFeeRate::CFeeRate(const Amount nFeePaid, size_t nBytes_) {
    assert(nBytes_ <= uint64_t(std::numeric_limits<int64_t>::max()));
    int64_t nSize = int64_t(nBytes_);

    if (nSize > 0) {
        nSatoshisPerK = 1000 * nFeePaid / nSize;
    } else {
        nSatoshisPerK = Amount(0);
    }
}

template <bool ceil>
static Amount GetFee(size_t nBytes_, Amount nSatoshisPerK) {
    assert(nBytes_ <= uint64_t(std::numeric_limits<int64_t>::max()));
    int64_t nSize = int64_t(nBytes_);

    // Ensure fee is rounded up when truncated if ceil is true.
    Amount nFee(0);
    if (ceil) {
        nFee = Amount(nSize * nSatoshisPerK % 1000 > Amount(0)
                          ? nSize * nSatoshisPerK / 1000 + Amount(1)
                          : nSize * nSatoshisPerK / 1000);
    } else {
        nFee = nSize * nSatoshisPerK / 1000;
    }

    if (nFee == Amount(0) && nSize != 0) {
        if (nSatoshisPerK > Amount(0)) {
            nFee = Amount(1);
        }
        if (nSatoshisPerK < Amount(0)) {
            nFee = Amount(-1);
        }
    }

    return nFee;
}

Amount CFeeRate::GetFee(size_t nBytes) const {
    return ::GetFee<false>(nBytes, nSatoshisPerK);
}

Amount CFeeRate::GetFeeCeiling(size_t nBytes) const {
    return ::GetFee<true>(nBytes, nSatoshisPerK);
}

std::string CFeeRate::ToString() const {
    return strprintf("%d.%08d %s/kB", nSatoshisPerK / COIN,
                     nSatoshisPerK % COIN, CURRENCY_UNIT);
}

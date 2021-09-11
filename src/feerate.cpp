// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <feerate.h>

#include <tinyformat.h>

CFeeRate::CFeeRate(const Amount nFeePaid, size_t nBytes_) {
    assert(nBytes_ <= uint64_t(std::numeric_limits<int64_t>::max()));
    int64_t nSize = int64_t(nBytes_);

    if (nSize > 0) {
        nSatoshisPerK = 1000 * nFeePaid / nSize;
    } else {
        nSatoshisPerK = Amount::zero();
    }
}

Amount CFeeRate::GetFee(size_t nBytes_) const {
    assert(nBytes_ <= uint64_t(std::numeric_limits<int64_t>::max()));
    int64_t nSize = int64_t(nBytes_);

    // Ensure fee is rounded up
    Amount nFee = Amount(nSize * nSatoshisPerK % 1000 > Amount::zero()
                             ? nSize * nSatoshisPerK / 1000 + SATOSHI
                             : nSize * nSatoshisPerK / 1000);

    // Special case introduced in core#7796 for symetry around 0.
    // A fee had to be at least + or -1 satoshi for any non-zero transaction
    // size. The symetry was broken when the code was switched to always round
    // up fees (core#22949), but the special case was kept. We keep it to
    // make later backports easier.
    if (nFee == Amount::zero() && nSize != 0 &&
        nSatoshisPerK < Amount::zero()) {
        nFee = -SATOSHI;
    }
    return nFee;
}

std::string CFeeRate::ToString() const {
    const auto &currency = Currency::get();
    return strprintf("%d.%0*d %s/kB", nSatoshisPerK / currency.baseunit,
                     currency.decimals,
                     (nSatoshisPerK % currency.baseunit) / currency.subunit,
                     Currency::getTicker());
}

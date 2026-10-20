// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <feerate.h>

#include <consensus/amount.h>
#include <tinyformat.h>
#include <util/feefrac.h>

#include <cstdint>

CFeeRate::CFeeRate(const Amount nFeePaid, int32_t virtual_bytes) {
    if (virtual_bytes > 0) {
        m_feerate = FeePerVSize(nFeePaid / SATOSHI, virtual_bytes);
    } else {
        m_feerate = FeePerVSize();
    }
}

Amount CFeeRate::GetFee(int32_t virtual_bytes) const {
    Assume(virtual_bytes >= 0);
    if (m_feerate.IsEmpty()) {
        return Amount::zero();
    }

    // Ensure fee is rounded up
    auto nFee = Amount(m_feerate.EvaluateFeeUp(virtual_bytes) * SATOSHI);

    // Special case introduced in core#7796 for symetry around 0.
    // A fee had to be at least + or -1 satoshi for any non-zero transaction
    // size. The symetry was broken when the code was switched to always round
    // up fees (core#22949), but the special case was kept. We keep it to
    // make later backports easier.
    if (nFee == Amount::zero() && virtual_bytes != 0 && m_feerate.fee < 0) {
        return -SATOSHI;
    }
    return nFee;
}

std::string CFeeRate::ToString() const {
    const Amount feerate_per_kvb = GetFeePerK();
    const auto &currency = Currency::get();
    return strprintf("%d.%0*d %s/kB", feerate_per_kvb / currency.baseunit,
                     currency.decimals,
                     (feerate_per_kvb % currency.baseunit) / currency.subunit,
                     Currency::getTicker());
}

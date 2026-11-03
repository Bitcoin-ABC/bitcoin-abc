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

Amount CFeeRate::GetFeePerK() const {
    if (m_feerate.IsEmpty()) {
        return Amount::zero();
    }
    return m_feerate.EvaluateFeeDown(1000) * SATOSHI;
}

Amount CFeeRate::GetFee(int32_t virtual_bytes) const {
    Assume(virtual_bytes >= 0);
    if (m_feerate.IsEmpty()) {
        return Amount::zero();
    }

    return m_feerate.EvaluateFeeUp(virtual_bytes) * SATOSHI;
}

std::string CFeeRate::ToString() const {
    const Amount feerate_per_kvb = GetFeePerK();
    const auto &currency = Currency::get();
    return strprintf("%d.%0*d %s/kB", feerate_per_kvb / currency.baseunit,
                     currency.decimals,
                     (feerate_per_kvb % currency.baseunit) / currency.subunit,
                     Currency::getTicker());
}

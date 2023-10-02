// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <policy/fees.h>

#include <feerate.h>

static std::set<Amount> MakeFeeSet(const CFeeRate &min_incremental_fee,
                                   const Amount &max_filter_fee_rate,
                                   const double fee_filter_spacing) {
    std::set<Amount> fee_set;

    Amount min_fee_limit =
        std::max(SATOSHI, min_incremental_fee.GetFeePerK() / 2);
    fee_set.insert(Amount::zero());
    for (double bucket_boundary = min_fee_limit / SATOSHI;
         bucket_boundary <= double(max_filter_fee_rate / SATOSHI);
         bucket_boundary *= fee_filter_spacing) {
        fee_set.insert(int64_t(bucket_boundary) * SATOSHI);
    }

    return fee_set;
}

FeeFilterRounder::FeeFilterRounder(const CFeeRate &minIncrementalFee,
                                   FastRandomContext &rng)
    : m_fee_set{MakeFeeSet(minIncrementalFee, MAX_FEERATE, FEE_SPACING)},
      insecure_rand{rng} {}

Amount FeeFilterRounder::round(const Amount currentMinFee) {
    AssertLockNotHeld(m_insecure_rand_mutex);

    auto it = m_fee_set.lower_bound(currentMinFee);
    if (it == m_fee_set.end() ||
        (it != m_fee_set.begin() &&
         WITH_LOCK(m_insecure_rand_mutex, return insecure_rand.rand32()) % 3 !=
             0)) {
        --it;
    }

    return *it;
}

// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-present The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_FEERATE_H
#define BITCOIN_FEERATE_H

#include <consensus/amount.h>
#include <serialize.h>
#include <util/feefrac.h>

#include <cstdint>
#include <cstdlib>
#include <ostream>
#include <string>
#include <type_traits>

/**
 * Fee rate in satoshis per virtualbyte: Amount / vB
 * the feerate is represented internally as FeeFrac
 */
class CFeeRate {
private:
    // unit is satoshis-per-N-vbytes
    FeePerVSize m_feerate;

public:
    CFeeRate() = delete;
    explicit CFeeRate(const Amount m_feerate_kvb)
        : m_feerate(FeePerVSize(m_feerate_kvb / SATOSHI, 1000)) {}

    /**
     * Construct a fee rate from a fee in satoshis and a size in B.
     *
     * param@[in]   nFeePaid      The fee paid by a transaction
     * param@[in]   virtual_bytes The vsize of a transaction, in vbytes
     *
     * Passing any virtual_bytes less than or equal to 0 will result in 0 fee
     * rate per 0 size.
     */
    CFeeRate(const Amount nFeePaid, int32_t virtual_bytes);

    /**
     * Return the fee in satoshis for the given size in bytes.
     * If the calculated fee would have fractional satoshis, then the returned
     * fee will always be rounded up to the nearest satoshi.
     */
    Amount GetFee(int32_t virtual_bytes) const;

    /**
     * Return the fee in satoshis for a size of 1000 bytes
     */
    Amount GetFeePerK() const {
        return m_feerate.EvaluateFeeDown(1000) * SATOSHI;
    }

    friend std::weak_ordering operator<=>(const CFeeRate &a,
                                          const CFeeRate &b) noexcept {
        return FeeRateCompare(a.m_feerate, b.m_feerate);
    }
    friend bool operator==(const CFeeRate &a, const CFeeRate &b) noexcept {
        return FeeRateCompare(a.m_feerate, b.m_feerate) ==
               std::weak_ordering::equivalent;
    }
    CFeeRate &operator+=(const CFeeRate &a) {
        m_feerate =
            FeePerVSize((GetFeePerK() + a.GetFeePerK()) / SATOSHI, 1000);
        return *this;
    }

    std::string ToString() const;

    SERIALIZE_METHODS(CFeeRate, obj) {
        READWRITE(obj.m_feerate.fee, obj.m_feerate.size);
    }
};

#endif // BITCOIN_FEERATE_H

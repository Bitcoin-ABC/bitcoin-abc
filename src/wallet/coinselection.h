// Copyright (c) 2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_COINSELECTION_H
#define BITCOIN_WALLET_COINSELECTION_H

#include <consensus/amount.h>
#include <primitives/transaction.h>
#include <random.h>

//! target minimum change amount
static constexpr Amount MIN_CHANGE{COIN / 100};
//! final minimum change amount after paying for fees
static const Amount MIN_FINAL_CHANGE = MIN_CHANGE / 2;

class CInputCoin {
public:
    CInputCoin(const CTransactionRef &tx, unsigned int i) {
        if (!tx) {
            throw std::invalid_argument("tx should not be null");
        }
        if (i >= tx->vout.size()) {
            throw std::out_of_range("The output index is out of range");
        }

        outpoint = COutPoint(tx->GetId(), i);
        txout = tx->vout[i];
        effective_value = txout.nValue;
    }

    CInputCoin(const CTransactionRef &tx, unsigned int i, int input_bytes)
        : CInputCoin(tx, i) {
        m_input_bytes = input_bytes;
    }

    COutPoint outpoint;
    CTxOut txout;
    Amount effective_value;
    Amount m_fee{Amount::zero()};
    Amount m_long_term_fee{Amount::zero()};

    /**
     * Pre-computed estimated size of this output as a fully-signed input in a
     * transaction. Can be -1 if it could not be calculated.
     */
    int m_input_bytes{-1};

    bool operator<(const CInputCoin &rhs) const {
        return outpoint < rhs.outpoint;
    }

    bool operator!=(const CInputCoin &rhs) const {
        return outpoint != rhs.outpoint;
    }

    bool operator==(const CInputCoin &rhs) const {
        return outpoint == rhs.outpoint;
    }
};

struct CoinEligibilityFilter {
    const int conf_mine;
    /**
     * Minimum number of confirmations for outputs received from a different
     * wallet.
     */
    const int conf_theirs;
    /// Include partial destination groups when avoid_reuse and there are full
    /// groups
    const bool m_include_partial_groups{false};

    CoinEligibilityFilter(int conf_mine_, int conf_theirs_)
        : conf_mine(conf_mine_), conf_theirs(conf_theirs_) {}
    CoinEligibilityFilter(int conf_mine_, int conf_theirs_,
                          bool include_partial_groups)
        : conf_mine(conf_mine_), conf_theirs(conf_theirs_),
          m_include_partial_groups(include_partial_groups) {}
};

struct OutputGroup {
    std::vector<CInputCoin> m_outputs;
    bool m_from_me{true};
    Amount m_value = Amount::zero();
    int m_depth{999};
    Amount effective_value = Amount::zero();
    Amount fee = Amount::zero();
    CFeeRate m_effective_feerate{Amount::zero()};
    Amount long_term_fee = Amount::zero();
    CFeeRate m_long_term_feerate{Amount::zero()};

    OutputGroup() {}
    OutputGroup(const CFeeRate &effective_feerate,
                const CFeeRate &long_term_feerate)
        : m_effective_feerate(effective_feerate),
          m_long_term_feerate(long_term_feerate) {}

    void Insert(const CInputCoin &output, int depth, bool from_me,
                bool positive_only);
    bool
    EligibleForSpending(const CoinEligibilityFilter &eligibility_filter) const;
};

bool SelectCoinsBnB(std::vector<OutputGroup> &utxo_pool,
                    const Amount &target_value, const Amount &cost_of_change,
                    std::set<CInputCoin> &out_set, Amount &value_ret,
                    const Amount not_input_fees);

// Original coin selection algorithm as a fallback
bool KnapsackSolver(const Amount nTargetValue, std::vector<OutputGroup> &groups,
                    std::set<CInputCoin> &setCoinsRet, Amount &nValueRet);

#endif // BITCOIN_WALLET_COINSELECTION_H

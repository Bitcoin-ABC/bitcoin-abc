// Copyright (c) 2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_COINSELECTION_H
#define BITCOIN_WALLET_COINSELECTION_H

#include <amount.h>
#include <primitives/transaction.h>
#include <random.h>

//! target minimum change amount
static const Amount MIN_CHANGE = CENT;
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
    const int conf_theirs;
    const uint64_t max_ancestors;
    const uint64_t max_descendants;

    CoinEligibilityFilter(int conf_mine_, int conf_theirs_,
                          uint64_t max_ancestors_)
        : conf_mine(conf_mine_), conf_theirs(conf_theirs_),
          max_ancestors(max_ancestors_), max_descendants(max_ancestors_) {}
    CoinEligibilityFilter(int conf_mine_, int conf_theirs_,
                          uint64_t max_ancestors_, uint64_t max_descendants_)
        : conf_mine(conf_mine_), conf_theirs(conf_theirs_),
          max_ancestors(max_ancestors_), max_descendants(max_descendants_) {}
};

struct OutputGroup {
    std::vector<CInputCoin> m_outputs;
    bool m_from_me{true};
    Amount m_value = Amount::zero();
    int m_depth{999};
    size_t m_ancestors{0};
    size_t m_descendants{0};
    Amount effective_value = Amount::zero();
    Amount fee = Amount::zero();
    Amount long_term_fee = Amount::zero();

    OutputGroup() {}
    OutputGroup(std::vector<CInputCoin> &&outputs, bool from_me, Amount value,
                int depth, size_t ancestors, size_t descendants)
        : m_outputs(std::move(outputs)), m_from_me(from_me), m_value(value),
          m_depth(depth), m_ancestors(ancestors), m_descendants(descendants) {}
    OutputGroup(const CInputCoin &output, int depth, bool from_me,
                size_t ancestors, size_t descendants)
        : OutputGroup() {
        Insert(output, depth, from_me, ancestors, descendants);
    }
    void Insert(const CInputCoin &output, int depth, bool from_me,
                size_t ancestors, size_t descendants);
    std::vector<CInputCoin>::iterator Discard(const CInputCoin &output);
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

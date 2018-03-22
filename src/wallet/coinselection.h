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

    COutPoint outpoint;
    CTxOut txout;
    Amount effective_value;
    Amount fee = Amount::zero();
    Amount long_term_fee = Amount::zero();

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

bool SelectCoinsBnB(std::vector<CInputCoin> &utxo_pool,
                    const Amount &target_value, const Amount &cost_of_change,
                    std::set<CInputCoin> &out_set, Amount &value_ret,
                    const Amount not_input_fees);

// Original coin selection algorithm as a fallback
bool KnapsackSolver(const Amount nTargetValue, std::vector<CInputCoin> &vCoins,
                    std::set<CInputCoin> &setCoinsRet, Amount &nValueRet);

#endif // BITCOIN_WALLET_COINSELECTION_H

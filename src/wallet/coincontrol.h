// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_COINCONTROL_H
#define BITCOIN_WALLET_COINCONTROL_H

#include <primitives/transaction.h>
#include <wallet/wallet.h>

#include <boost/optional.hpp>

/** Coin Control Features. */
class CCoinControl {
public:
    CTxDestination destChange;
    //! If false, allows unselected inputs, but requires all selected inputs be
    //! used
    bool fAllowOtherInputs;
    //! Includes watch only addresses which match the ISMINE_WATCH_SOLVABLE
    //! criteria
    bool fAllowWatchOnly;
    //! Override automatic min/max checks on fee, m_feerate must be set if true
    bool fOverrideFeeRate;
    //! Override the default payTxFee if set
    boost::optional<CFeeRate> m_feerate;
    //! Override the default confirmation target if set
    boost::optional<unsigned int> m_confirm_target;

    CCoinControl() { SetNull(); }

    void SetNull() {
        destChange = CNoDestination();
        fAllowOtherInputs = false;
        fAllowWatchOnly = false;
        setSelected.clear();
        m_feerate.reset();
        fOverrideFeeRate = false;
        m_confirm_target.reset();
    }

    bool HasSelected() const { return (setSelected.size() > 0); }

    bool IsSelected(const COutPoint &output) const {
        return (setSelected.count(output) > 0);
    }

    void Select(const COutPoint &output) { setSelected.insert(output); }

    void UnSelect(const COutPoint &output) { setSelected.erase(output); }

    void UnSelectAll() { setSelected.clear(); }

    void ListSelected(std::vector<COutPoint> &vOutpoints) const {
        vOutpoints.assign(setSelected.begin(), setSelected.end());
    }

private:
    std::set<COutPoint> setSelected;
};

#endif // BITCOIN_WALLET_COINCONTROL_H

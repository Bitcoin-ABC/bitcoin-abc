// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <wallet/receive.h>

#include <consensus/validation.h>
#include <wallet/transaction.h>
#include <wallet/wallet.h>

isminetype CWallet::IsMine(const CTxIn &txin) const {
    AssertLockHeld(cs_wallet);
    std::map<TxId, CWalletTx>::const_iterator mi =
        mapWallet.find(txin.prevout.GetTxId());
    if (mi != mapWallet.end()) {
        const CWalletTx &prev = (*mi).second;
        if (txin.prevout.GetN() < prev.tx->vout.size()) {
            return IsMine(prev.tx->vout[txin.prevout.GetN()]);
        }
    }

    return ISMINE_NO;
}

bool CWallet::IsAllFromMe(const CTransaction &tx,
                          const isminefilter &filter) const {
    LOCK(cs_wallet);

    for (const CTxIn &txin : tx.vin) {
        auto mi = mapWallet.find(txin.prevout.GetTxId());
        if (mi == mapWallet.end()) {
            // Any unknown inputs can't be from us.
            return false;
        }

        const CWalletTx &prev = (*mi).second;

        if (txin.prevout.GetN() >= prev.tx->vout.size()) {
            // Invalid input!
            return false;
        }

        if (!(IsMine(prev.tx->vout[txin.prevout.GetN()]) & filter)) {
            return false;
        }
    }

    return true;
}

Amount CWallet::GetCredit(const CTxOut &txout,
                          const isminefilter &filter) const {
    if (!MoneyRange(txout.nValue)) {
        throw std::runtime_error(std::string(__func__) +
                                 ": value out of range");
    }
    LOCK(cs_wallet);
    return (IsMine(txout) & filter) ? txout.nValue : Amount::zero();
}

Amount CWallet::GetCredit(const CTransaction &tx,
                          const isminefilter &filter) const {
    Amount nCredit = Amount::zero();
    for (const CTxOut &txout : tx.vout) {
        nCredit += GetCredit(txout, filter);
        if (!MoneyRange(nCredit)) {
            throw std::runtime_error(std::string(__func__) +
                                     ": value out of range");
        }
    }

    return nCredit;
}

bool CWallet::IsChange(const CScript &script) const {
    // TODO: fix handling of 'change' outputs. The assumption is that any
    // payment to a script that is ours, but is not in the address book is
    // change. That assumption is likely to break when we implement
    // multisignature wallets that return change back into a
    // multi-signature-protected address; a better way of identifying which
    // outputs are 'the send' and which are 'the change' will need to be
    // implemented (maybe extend CWalletTx to remember which output, if any, was
    // change).
    AssertLockHeld(cs_wallet);
    if (IsMine(script)) {
        CTxDestination address;
        if (!ExtractDestination(script, address)) {
            return true;
        }
        if (!FindAddressBookEntry(address)) {
            return true;
        }
    }

    return false;
}

bool CWallet::IsChange(const CTxOut &txout) const {
    return IsChange(txout.scriptPubKey);
}

Amount CWallet::GetChange(const CTxOut &txout) const {
    AssertLockHeld(cs_wallet);
    if (!MoneyRange(txout.nValue)) {
        throw std::runtime_error(std::string(__func__) +
                                 ": value out of range");
    }

    return (IsChange(txout) ? txout.nValue : Amount::zero());
}

Amount CWallet::GetChange(const CTransaction &tx) const {
    LOCK(cs_wallet);
    Amount nChange = Amount::zero();
    for (const CTxOut &txout : tx.vout) {
        nChange += GetChange(txout);
        if (!MoneyRange(nChange)) {
            throw std::runtime_error(std::string(__func__) +
                                     ": value out of range");
        }
    }

    return nChange;
}

Amount CWalletTx::GetCachableAmount(AmountType type, const isminefilter &filter,
                                    bool recalculate) const {
    auto &amount = m_amounts[type];
    if (recalculate || !amount.m_cached[filter]) {
        amount.Set(filter, type == DEBIT ? pwallet->GetDebit(*tx, filter)
                                         : pwallet->GetCredit(*tx, filter));
        m_is_cache_empty = false;
    }
    return amount.m_value[filter];
}

Amount CWalletTx::GetCredit(const isminefilter &filter) const {
    // Must wait until coinbase is safely deep enough in the chain before
    // valuing it.
    if (IsImmatureCoinBase()) {
        return Amount::zero();
    }

    Amount credit = Amount::zero();
    if (filter & ISMINE_SPENDABLE) {
        // GetBalance can assume transactions in mapWallet won't change.
        credit += GetCachableAmount(CREDIT, ISMINE_SPENDABLE);
    }

    if (filter & ISMINE_WATCH_ONLY) {
        credit += GetCachableAmount(CREDIT, ISMINE_WATCH_ONLY);
    }

    return credit;
}

Amount CWalletTx::GetDebit(const isminefilter &filter) const {
    if (tx->vin.empty()) {
        return Amount::zero();
    }

    Amount debit = Amount::zero();
    if (filter & ISMINE_SPENDABLE) {
        debit += GetCachableAmount(DEBIT, ISMINE_SPENDABLE);
    }
    if (filter & ISMINE_WATCH_ONLY) {
        debit += GetCachableAmount(DEBIT, ISMINE_WATCH_ONLY);
    }

    return debit;
}

Amount CWalletTx::GetChange() const {
    if (fChangeCached) {
        return nChangeCached;
    }

    nChangeCached = pwallet->GetChange(*tx);
    fChangeCached = true;
    return nChangeCached;
}

Amount CWalletTx::GetImmatureCredit(bool fUseCache) const {
    if (IsImmatureCoinBase() && IsInMainChain()) {
        return GetCachableAmount(IMMATURE_CREDIT, ISMINE_SPENDABLE, !fUseCache);
    }

    return Amount::zero();
}

Amount CWalletTx::GetImmatureWatchOnlyCredit(const bool fUseCache) const {
    if (IsImmatureCoinBase() && IsInMainChain()) {
        return GetCachableAmount(IMMATURE_CREDIT, ISMINE_WATCH_ONLY,
                                 !fUseCache);
    }

    return Amount::zero();
}

Amount CWalletTx::GetAvailableCredit(bool fUseCache,
                                     const isminefilter &filter) const {
    if (pwallet == nullptr) {
        return Amount::zero();
    }

    // Avoid caching ismine for NO or ALL cases (could remove this check and
    // simplify in the future).
    bool allow_cache =
        (filter & ISMINE_ALL) && (filter & ISMINE_ALL) != ISMINE_ALL;

    // Must wait until coinbase is safely deep enough in the chain before
    // valuing it.
    if (IsImmatureCoinBase()) {
        return Amount::zero();
    }

    if (fUseCache && allow_cache &&
        m_amounts[AVAILABLE_CREDIT].m_cached[filter]) {
        return m_amounts[AVAILABLE_CREDIT].m_value[filter];
    }

    bool allow_used_addresses =
        (filter & ISMINE_USED) ||
        !pwallet->IsWalletFlagSet(WALLET_FLAG_AVOID_REUSE);
    Amount nCredit = Amount::zero();
    const TxId &txid = GetId();
    for (uint32_t i = 0; i < tx->vout.size(); i++) {
        if (!pwallet->IsSpent(COutPoint(txid, i)) &&
            (allow_used_addresses || !pwallet->IsSpentKey(txid, i))) {
            const CTxOut &txout = tx->vout[i];
            nCredit += pwallet->GetCredit(txout, filter);
            if (!MoneyRange(nCredit)) {
                throw std::runtime_error(std::string(__func__) +
                                         " : value out of range");
            }
        }
    }

    if (allow_cache) {
        m_amounts[AVAILABLE_CREDIT].Set(filter, nCredit);
        m_is_cache_empty = false;
    }

    return nCredit;
}

void CWalletTx::GetAmounts(std::list<COutputEntry> &listReceived,
                           std::list<COutputEntry> &listSent, Amount &nFee,
                           const isminefilter &filter) const {
    nFee = Amount::zero();
    listReceived.clear();
    listSent.clear();

    // Compute fee:
    Amount nDebit = GetDebit(filter);
    // debit>0 means we signed/sent this transaction.
    if (nDebit > Amount::zero()) {
        Amount nValueOut = tx->GetValueOut();
        nFee = (nDebit - nValueOut);
    }

    LOCK(pwallet->cs_wallet);
    // Sent/received.
    for (unsigned int i = 0; i < tx->vout.size(); ++i) {
        const CTxOut &txout = tx->vout[i];
        isminetype fIsMine = pwallet->IsMine(txout);
        // Only need to handle txouts if AT LEAST one of these is true:
        //   1) they debit from us (sent)
        //   2) the output is to us (received)
        if (nDebit > Amount::zero()) {
            // Don't report 'change' txouts
            if (pwallet->IsChange(txout)) {
                continue;
            }
        } else if (!(fIsMine & filter)) {
            continue;
        }

        // In either case, we need to get the destination address.
        CTxDestination address;

        if (!ExtractDestination(txout.scriptPubKey, address) &&
            !txout.scriptPubKey.IsUnspendable()) {
            pwallet->WalletLogPrintf("CWalletTx::GetAmounts: Unknown "
                                     "transaction type found, txid %s\n",
                                     this->GetId().ToString());
            address = CNoDestination();
        }

        COutputEntry output = {address, txout.nValue, (int)i};

        // If we are debited by the transaction, add the output as a "sent"
        // entry.
        if (nDebit > Amount::zero()) {
            listSent.push_back(output);
        }

        // If we are receiving the output, add it as a "received" entry.
        if (fIsMine & filter) {
            listReceived.push_back(output);
        }
    }
}

bool CWallet::IsTrusted(const CWalletTx &wtx,
                        std::set<TxId> &trusted_parents) const {
    AssertLockHeld(cs_wallet);
    // Quick answer in most cases
    TxValidationState state;
    if (!chain().contextualCheckTransactionForCurrentBlock(*wtx.tx, state)) {
        return false;
    }

    int nDepth = wtx.GetDepthInMainChain();
    if (nDepth >= 1) {
        return true;
    }

    if (nDepth < 0) {
        return false;
    }

    // using wtx's cached debit
    if (!m_spend_zero_conf_change || !wtx.IsFromMe(ISMINE_ALL)) {
        return false;
    }

    // Don't trust unconfirmed transactions from us unless they are in the
    // mempool.
    if (!wtx.InMempool()) {
        return false;
    }

    // Trusted if all inputs are from us and are in the mempool:
    for (const CTxIn &txin : wtx.tx->vin) {
        // Transactions not sent by us: not trusted
        const CWalletTx *parent = GetWalletTx(txin.prevout.GetTxId());
        if (parent == nullptr) {
            return false;
        }

        const CTxOut &parentOut = parent->tx->vout[txin.prevout.GetN()];
        // Check that this specific input being spent is trusted
        if (IsMine(parentOut) != ISMINE_SPENDABLE) {
            return false;
        }
        // If we've already trusted this parent, continue
        if (trusted_parents.count(parent->GetId())) {
            continue;
        }
        // Recurse to check that the parent is also trusted
        if (!IsTrusted(*parent, trusted_parents)) {
            return false;
        }
        trusted_parents.insert(parent->GetId());
    }

    return true;
}

bool CWalletTx::IsTrusted() const {
    std::set<TxId> trusted_parents;
    LOCK(pwallet->cs_wallet);
    return pwallet->IsTrusted(*this, trusted_parents);
}

CWallet::Balance CWallet::GetBalance(const int min_depth,
                                     bool avoid_reuse) const {
    Balance ret;
    isminefilter reuse_filter = avoid_reuse ? ISMINE_NO : ISMINE_USED;
    LOCK(cs_wallet);
    std::set<TxId> trusted_parents;
    for (const auto &entry : mapWallet) {
        const CWalletTx &wtx = entry.second;
        const bool is_trusted{IsTrusted(wtx, trusted_parents)};
        const int tx_depth{wtx.GetDepthInMainChain()};
        const Amount tx_credit_mine{wtx.GetAvailableCredit(
            /* fUseCache */ true, ISMINE_SPENDABLE | reuse_filter)};
        const Amount tx_credit_watchonly{wtx.GetAvailableCredit(
            /* fUseCache */ true, ISMINE_WATCH_ONLY | reuse_filter)};
        if (is_trusted && tx_depth >= min_depth) {
            ret.m_mine_trusted += tx_credit_mine;
            ret.m_watchonly_trusted += tx_credit_watchonly;
        }
        if (!is_trusted && tx_depth == 0 && wtx.InMempool()) {
            ret.m_mine_untrusted_pending += tx_credit_mine;
            ret.m_watchonly_untrusted_pending += tx_credit_watchonly;
        }
        ret.m_mine_immature += wtx.GetImmatureCredit();
        ret.m_watchonly_immature += wtx.GetImmatureWatchOnlyCredit();
    }
    return ret;
}

std::map<CTxDestination, Amount> CWallet::GetAddressBalances() const {
    std::map<CTxDestination, Amount> balances;

    LOCK(cs_wallet);
    std::set<TxId> trusted_parents;
    for (const auto &walletEntry : mapWallet) {
        const CWalletTx &wtx = walletEntry.second;

        if (!IsTrusted(wtx, trusted_parents)) {
            continue;
        }

        if (wtx.IsImmatureCoinBase()) {
            continue;
        }

        int nDepth = wtx.GetDepthInMainChain();
        if (nDepth < (wtx.IsFromMe(ISMINE_ALL) ? 0 : 1)) {
            continue;
        }

        for (uint32_t i = 0; i < wtx.tx->vout.size(); i++) {
            CTxDestination addr;
            if (!IsMine(wtx.tx->vout[i])) {
                continue;
            }

            if (!ExtractDestination(wtx.tx->vout[i].scriptPubKey, addr)) {
                continue;
            }

            Amount n = IsSpent(COutPoint(walletEntry.first, i))
                           ? Amount::zero()
                           : wtx.tx->vout[i].nValue;
            balances[addr] += n;
        }
    }

    return balances;
}

std::set<std::set<CTxDestination>> CWallet::GetAddressGroupings() const {
    AssertLockHeld(cs_wallet);
    std::set<std::set<CTxDestination>> groupings;
    std::set<CTxDestination> grouping;

    for (const auto &walletEntry : mapWallet) {
        const CWalletTx &wtx = walletEntry.second;

        if (wtx.tx->vin.size() > 0) {
            bool any_mine = false;
            // Group all input addresses with each other.
            for (const auto &txin : wtx.tx->vin) {
                CTxDestination address;
                // If this input isn't mine, ignore it.
                if (!IsMine(txin)) {
                    continue;
                }

                if (!ExtractDestination(mapWallet.at(txin.prevout.GetTxId())
                                            .tx->vout[txin.prevout.GetN()]
                                            .scriptPubKey,
                                        address)) {
                    continue;
                }

                grouping.insert(address);
                any_mine = true;
            }

            // Group change with input addresses.
            if (any_mine) {
                for (const auto &txout : wtx.tx->vout) {
                    if (IsChange(txout)) {
                        CTxDestination txoutAddr;
                        if (!ExtractDestination(txout.scriptPubKey,
                                                txoutAddr)) {
                            continue;
                        }

                        grouping.insert(txoutAddr);
                    }
                }
            }

            if (grouping.size() > 0) {
                groupings.insert(grouping);
                grouping.clear();
            }
        }

        // Group lone addrs by themselves.
        for (const auto &txout : wtx.tx->vout) {
            if (IsMine(txout)) {
                CTxDestination address;
                if (!ExtractDestination(txout.scriptPubKey, address)) {
                    continue;
                }

                grouping.insert(address);
                groupings.insert(grouping);
                grouping.clear();
            }
        }
    }

    // A set of pointers to groups of addresses.
    std::set<std::set<CTxDestination> *> uniqueGroupings;
    // Map addresses to the unique group containing it.
    std::map<CTxDestination, std::set<CTxDestination> *> setmap;
    for (std::set<CTxDestination> _grouping : groupings) {
        // Make a set of all the groups hit by this new group.
        std::set<std::set<CTxDestination> *> hits;
        std::map<CTxDestination, std::set<CTxDestination> *>::iterator it;
        for (const CTxDestination &address : _grouping) {
            if ((it = setmap.find(address)) != setmap.end()) {
                hits.insert((*it).second);
            }
        }

        // Merge all hit groups into a new single group and delete old groups.
        std::set<CTxDestination> *merged =
            new std::set<CTxDestination>(_grouping);
        for (std::set<CTxDestination> *hit : hits) {
            merged->insert(hit->begin(), hit->end());
            uniqueGroupings.erase(hit);
            delete hit;
        }
        uniqueGroupings.insert(merged);

        // Update setmap.
        for (const CTxDestination &element : *merged) {
            setmap[element] = merged;
        }
    }

    std::set<std::set<CTxDestination>> ret;
    for (const std::set<CTxDestination> *uniqueGrouping : uniqueGroupings) {
        ret.insert(*uniqueGrouping);
        delete uniqueGrouping;
    }

    return ret;
}

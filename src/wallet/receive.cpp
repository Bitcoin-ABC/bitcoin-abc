// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <wallet/receive.h>

#include <consensus/validation.h>
#include <wallet/transaction.h>
#include <wallet/wallet.h>

isminetype InputIsMine(const CWallet &wallet, const CTxIn &txin) {
    AssertLockHeld(wallet.cs_wallet);
    std::map<TxId, CWalletTx>::const_iterator mi =
        wallet.mapWallet.find(txin.prevout.GetTxId());
    if (mi != wallet.mapWallet.end()) {
        const CWalletTx &prev = (*mi).second;
        if (txin.prevout.GetN() < prev.tx->vout.size()) {
            return wallet.IsMine(prev.tx->vout[txin.prevout.GetN()]);
        }
    }

    return ISMINE_NO;
}

bool AllInputsMine(const CWallet &wallet, const CTransaction &tx,
                   const isminefilter &filter) {
    LOCK(wallet.cs_wallet);

    for (const CTxIn &txin : tx.vin) {
        auto mi = wallet.mapWallet.find(txin.prevout.GetTxId());
        if (mi == wallet.mapWallet.end()) {
            // Any unknown inputs can't be from us.
            return false;
        }

        const CWalletTx &prev = (*mi).second;

        if (txin.prevout.GetN() >= prev.tx->vout.size()) {
            // Invalid input!
            return false;
        }

        if (!(wallet.IsMine(prev.tx->vout[txin.prevout.GetN()]) & filter)) {
            return false;
        }
    }

    return true;
}

Amount OutputGetCredit(const CWallet &wallet, const CTxOut &txout,
                       const isminefilter &filter) {
    if (!MoneyRange(txout.nValue)) {
        throw std::runtime_error(std::string(__func__) +
                                 ": value out of range");
    }
    LOCK(wallet.cs_wallet);
    return ((wallet.IsMine(txout) & filter) ? txout.nValue : Amount::zero());
}

Amount TxGetCredit(const CWallet &wallet, const CTransaction &tx,
                   const isminefilter &filter) {
    Amount nCredit = Amount::zero();
    for (const CTxOut &txout : tx.vout) {
        nCredit += OutputGetCredit(wallet, txout, filter);
        if (!MoneyRange(nCredit)) {
            throw std::runtime_error(std::string(__func__) +
                                     ": value out of range");
        }
    }

    return nCredit;
}

bool ScriptIsChange(const CWallet &wallet, const CScript &script) {
    // TODO: fix handling of 'change' outputs. The assumption is that any
    // payment to a script that is ours, but is not in the address book is
    // change. That assumption is likely to break when we implement
    // multisignature wallets that return change back into a
    // multi-signature-protected address; a better way of identifying which
    // outputs are 'the send' and which are 'the change' will need to be
    // implemented (maybe extend CWalletTx to remember which output, if any, was
    // change).
    AssertLockHeld(wallet.cs_wallet);
    if (wallet.IsMine(script)) {
        CTxDestination address;
        if (!ExtractDestination(script, address)) {
            return true;
        }
        if (!wallet.FindAddressBookEntry(address)) {
            return true;
        }
    }

    return false;
}

bool OutputIsChange(const CWallet &wallet, const CTxOut &txout) {
    return ScriptIsChange(wallet, txout.scriptPubKey);
}

Amount OutputGetChange(const CWallet &wallet, const CTxOut &txout) {
    AssertLockHeld(wallet.cs_wallet);
    if (!MoneyRange(txout.nValue)) {
        throw std::runtime_error(std::string(__func__) +
                                 ": value out of range");
    }
    return (OutputIsChange(wallet, txout) ? txout.nValue : Amount::zero());
}

Amount TxGetChange(const CWallet &wallet, const CTransaction &tx) {
    LOCK(wallet.cs_wallet);
    Amount nChange = Amount::zero();
    for (const CTxOut &txout : tx.vout) {
        nChange += OutputGetChange(wallet, txout);
        if (!MoneyRange(nChange)) {
            throw std::runtime_error(std::string(__func__) +
                                     ": value out of range");
        }
    }

    return nChange;
}

static Amount GetCachableAmount(const CWallet &wallet, const CWalletTx &wtx,
                                CWalletTx::AmountType type,
                                const isminefilter &filter,
                                bool recalculate = false) {
    auto &amount = wtx.m_amounts[type];
    if (recalculate || !amount.m_cached[filter]) {
        amount.Set(filter, type == CWalletTx::DEBIT
                               ? wallet.GetDebit(*wtx.tx, filter)
                               : TxGetCredit(wallet, *wtx.tx, filter));
        wtx.m_is_cache_empty = false;
    }
    return amount.m_value[filter];
}

Amount CachedTxGetCredit(const CWallet &wallet, const CWalletTx &wtx,
                         const isminefilter &filter) {
    AssertLockHeld(wallet.cs_wallet);

    // Must wait until coinbase is safely deep enough in the chain before
    // valuing it.
    if (wallet.IsTxImmatureCoinBase(wtx)) {
        return Amount::zero();
    }

    Amount credit = Amount::zero();
    if (filter & ISMINE_SPENDABLE) {
        // GetBalance can assume transactions in mapWallet won't change.
        credit +=
            GetCachableAmount(wallet, wtx, CWalletTx::CREDIT, ISMINE_SPENDABLE);
    }

    if (filter & ISMINE_WATCH_ONLY) {
        credit += GetCachableAmount(wallet, wtx, CWalletTx::CREDIT,
                                    ISMINE_WATCH_ONLY);
    }

    return credit;
}

Amount CachedTxGetDebit(const CWallet &wallet, const CWalletTx &wtx,
                        const isminefilter &filter) {
    if (wtx.tx->vin.empty()) {
        return Amount::zero();
    }

    Amount debit = Amount::zero();
    if (filter & ISMINE_SPENDABLE) {
        debit +=
            GetCachableAmount(wallet, wtx, CWalletTx::DEBIT, ISMINE_SPENDABLE);
    }
    if (filter & ISMINE_WATCH_ONLY) {
        debit +=
            GetCachableAmount(wallet, wtx, CWalletTx::DEBIT, ISMINE_WATCH_ONLY);
    }

    return debit;
}

Amount CachedTxGetChange(const CWallet &wallet, const CWalletTx &wtx) {
    if (wtx.fChangeCached) {
        return wtx.nChangeCached;
    }
    wtx.nChangeCached = TxGetChange(wallet, *wtx.tx);
    wtx.fChangeCached = true;
    return wtx.nChangeCached;
}

Amount CachedTxGetImmatureCredit(const CWallet &wallet, const CWalletTx &wtx,
                                 bool fUseCache) {
    AssertLockHeld(wallet.cs_wallet);

    if (wallet.IsTxImmatureCoinBase(wtx) && wallet.IsTxInMainChain(wtx)) {
        return GetCachableAmount(wallet, wtx, CWalletTx::IMMATURE_CREDIT,
                                 ISMINE_SPENDABLE, !fUseCache);
    }

    return Amount::zero();
}

Amount CachedTxGetImmatureWatchOnlyCredit(const CWallet &wallet,
                                          const CWalletTx &wtx,
                                          const bool fUseCache) {
    AssertLockHeld(wallet.cs_wallet);

    if (wallet.IsTxImmatureCoinBase(wtx) && wallet.IsTxInMainChain(wtx)) {
        return GetCachableAmount(wallet, wtx, CWalletTx::IMMATURE_CREDIT,
                                 ISMINE_WATCH_ONLY, !fUseCache);
    }

    return Amount::zero();
}

Amount CachedTxGetAvailableCredit(const CWallet &wallet, const CWalletTx &wtx,
                                  bool fUseCache, const isminefilter &filter) {
    AssertLockHeld(wallet.cs_wallet);

    // Avoid caching ismine for NO or ALL cases (could remove this check and
    // simplify in the future).
    bool allow_cache =
        (filter & ISMINE_ALL) && (filter & ISMINE_ALL) != ISMINE_ALL;

    // Must wait until coinbase is safely deep enough in the chain before
    // valuing it.
    if (wallet.IsTxImmatureCoinBase(wtx)) {
        return Amount::zero();
    }

    if (fUseCache && allow_cache &&
        wtx.m_amounts[CWalletTx::AVAILABLE_CREDIT].m_cached[filter]) {
        return wtx.m_amounts[CWalletTx::AVAILABLE_CREDIT].m_value[filter];
    }

    bool allow_used_addresses =
        (filter & ISMINE_USED) ||
        !wallet.IsWalletFlagSet(WALLET_FLAG_AVOID_REUSE);
    Amount nCredit = Amount::zero();
    const TxId txid = wtx.GetId();
    for (uint32_t i = 0; i < wtx.tx->vout.size(); i++) {
        if (!wallet.IsSpent(COutPoint(txid, i)) &&
            (allow_used_addresses || !wallet.IsSpentKey(txid, i))) {
            const CTxOut &txout = wtx.tx->vout[i];
            nCredit += OutputGetCredit(wallet, txout, filter);
            if (!MoneyRange(nCredit)) {
                throw std::runtime_error(std::string(__func__) +
                                         " : value out of range");
            }
        }
    }

    if (allow_cache) {
        wtx.m_amounts[CWalletTx::AVAILABLE_CREDIT].Set(filter, nCredit);
        wtx.m_is_cache_empty = false;
    }

    return nCredit;
}

void CachedTxGetAmounts(const CWallet &wallet, const CWalletTx &wtx,
                        std::list<COutputEntry> &listReceived,
                        std::list<COutputEntry> &listSent, Amount &nFee,
                        const isminefilter &filter) {
    nFee = Amount::zero();
    listReceived.clear();
    listSent.clear();

    // Compute fee:
    Amount nDebit = CachedTxGetDebit(wallet, wtx, filter);
    // debit>0 means we signed/sent this transaction
    if (nDebit > Amount::zero()) {
        Amount nValueOut = wtx.tx->GetValueOut();
        nFee = nDebit - nValueOut;
    }

    LOCK(wallet.cs_wallet);
    // Sent/received.
    for (unsigned int i = 0; i < wtx.tx->vout.size(); ++i) {
        const CTxOut &txout = wtx.tx->vout[i];
        isminetype fIsMine = wallet.IsMine(txout);
        // Only need to handle txouts if AT LEAST one of these is true:
        //   1) they debit from us (sent)
        //   2) the output is to us (received)
        if (nDebit > Amount::zero()) {
            // Don't report 'change' txouts
            if (OutputIsChange(wallet, txout)) {
                continue;
            }
        } else if (!(fIsMine & filter)) {
            continue;
        }

        // In either case, we need to get the destination address.
        CTxDestination address;

        if (!ExtractDestination(txout.scriptPubKey, address) &&
            !txout.scriptPubKey.IsUnspendable()) {
            wallet.WalletLogPrintf("CWalletTx::GetAmounts: Unknown transaction "
                                   "type found, txid %s\n",
                                   wtx.GetId().ToString());
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

bool CachedTxIsFromMe(const CWallet &wallet, const CWalletTx &wtx,
                      const isminefilter &filter) {
    return CachedTxGetDebit(wallet, wtx, filter) > Amount::zero();
}

bool CachedTxIsTrusted(const CWallet &wallet, const CWalletTx &wtx,
                       std::set<TxId> &trusted_parents) {
    AssertLockHeld(wallet.cs_wallet);

    int nDepth = wallet.GetTxDepthInMainChain(wtx);
    if (nDepth >= 1) {
        return true;
    }

    if (nDepth < 0) {
        return false;
    }

    // using wtx's cached debit
    if (!wallet.m_spend_zero_conf_change ||
        !CachedTxIsFromMe(wallet, wtx, ISMINE_ALL)) {
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
        const CWalletTx *parent = wallet.GetWalletTx(txin.prevout.GetTxId());
        if (parent == nullptr) {
            return false;
        }

        const CTxOut &parentOut = parent->tx->vout[txin.prevout.GetN()];
        // Check that this specific input being spent is trusted
        if (wallet.IsMine(parentOut) != ISMINE_SPENDABLE) {
            return false;
        }
        // If we've already trusted this parent, continue
        if (trusted_parents.count(parent->GetId())) {
            continue;
        }
        // Recurse to check that the parent is also trusted
        if (!CachedTxIsTrusted(wallet, *parent, trusted_parents)) {
            return false;
        }
        trusted_parents.insert(parent->GetId());
    }

    return true;
}

bool CachedTxIsTrusted(const CWallet &wallet, const CWalletTx &wtx) {
    std::set<TxId> trusted_parents;
    LOCK(wallet.cs_wallet);
    return CachedTxIsTrusted(wallet, wtx, trusted_parents);
}

Balance GetBalance(const CWallet &wallet, const int min_depth,
                   bool avoid_reuse) {
    Balance ret;
    isminefilter reuse_filter = avoid_reuse ? ISMINE_NO : ISMINE_USED;
    LOCK(wallet.cs_wallet);
    std::set<TxId> trusted_parents;
    for (const auto &entry : wallet.mapWallet) {
        const CWalletTx &wtx = entry.second;
        const bool is_trusted{CachedTxIsTrusted(wallet, wtx, trusted_parents)};
        const int tx_depth{wallet.GetTxDepthInMainChain(wtx)};
        const Amount tx_credit_mine{CachedTxGetAvailableCredit(
            wallet, wtx, /*fUseCache=*/true, ISMINE_SPENDABLE | reuse_filter)};
        const Amount tx_credit_watchonly{CachedTxGetAvailableCredit(
            wallet, wtx, /*fUseCache=*/true, ISMINE_WATCH_ONLY | reuse_filter)};
        if (is_trusted && tx_depth >= min_depth) {
            ret.m_mine_trusted += tx_credit_mine;
            ret.m_watchonly_trusted += tx_credit_watchonly;
        }
        if (!is_trusted && tx_depth == 0 && wtx.InMempool()) {
            ret.m_mine_untrusted_pending += tx_credit_mine;
            ret.m_watchonly_untrusted_pending += tx_credit_watchonly;
        }
        ret.m_mine_immature += CachedTxGetImmatureCredit(wallet, wtx);
        ret.m_watchonly_immature +=
            CachedTxGetImmatureWatchOnlyCredit(wallet, wtx);
    }
    return ret;
}

std::map<CTxDestination, Amount> GetAddressBalances(const CWallet &wallet) {
    std::map<CTxDestination, Amount> balances;

    LOCK(wallet.cs_wallet);
    std::set<TxId> trusted_parents;
    for (const auto &walletEntry : wallet.mapWallet) {
        const CWalletTx &wtx = walletEntry.second;

        if (!CachedTxIsTrusted(wallet, wtx, trusted_parents)) {
            continue;
        }

        if (wallet.IsTxImmatureCoinBase(wtx)) {
            continue;
        }

        int nDepth = wallet.GetTxDepthInMainChain(wtx);
        if (nDepth < (CachedTxIsFromMe(wallet, wtx, ISMINE_ALL) ? 0 : 1)) {
            continue;
        }

        for (uint32_t i = 0; i < wtx.tx->vout.size(); i++) {
            CTxDestination addr;
            if (!wallet.IsMine(wtx.tx->vout[i])) {
                continue;
            }
            if (!ExtractDestination(wtx.tx->vout[i].scriptPubKey, addr)) {
                continue;
            }

            Amount n = wallet.IsSpent(COutPoint(walletEntry.first, i))
                           ? Amount::zero()
                           : wtx.tx->vout[i].nValue;
            balances[addr] += n;
        }
    }

    return balances;
}

std::set<std::set<CTxDestination>> GetAddressGroupings(const CWallet &wallet) {
    AssertLockHeld(wallet.cs_wallet);
    std::set<std::set<CTxDestination>> groupings;
    std::set<CTxDestination> grouping;

    for (const auto &walletEntry : wallet.mapWallet) {
        const CWalletTx &wtx = walletEntry.second;

        if (wtx.tx->vin.size() > 0) {
            bool any_mine = false;
            // Group all input addresses with each other.
            for (const auto &txin : wtx.tx->vin) {
                CTxDestination address;
                // If this input isn't mine, ignore it.
                if (!InputIsMine(wallet, txin)) {
                    continue;
                }

                if (!ExtractDestination(
                        wallet.mapWallet.at(txin.prevout.GetTxId())
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
                    if (OutputIsChange(wallet, txout)) {
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
            if (wallet.IsMine(txout)) {
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
    for (const std::set<CTxDestination> &_grouping : groupings) {
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

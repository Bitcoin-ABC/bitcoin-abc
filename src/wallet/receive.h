// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_RECEIVE_H
#define BITCOIN_WALLET_RECEIVE_H

#include <consensus/amount.h>
#include <wallet/ismine.h>
#include <wallet/transaction.h>
#include <wallet/wallet.h>

isminetype InputIsMine(const CWallet &wallet, const CTxIn &txin)
    EXCLUSIVE_LOCKS_REQUIRED(wallet.cs_wallet);

/** Returns whether all of the inputs match the filter */
bool AllInputsMine(const CWallet &wallet, const CTransaction &tx,
                   const isminefilter &filter);

Amount OutputGetCredit(const CWallet &wallet, const CTxOut &txout,
                       const isminefilter &filter);
Amount TxGetCredit(const CWallet &wallet, const CTransaction &tx,
                   const isminefilter &filter);

bool ScriptIsChange(const CWallet &wallet, const CScript &script)
    EXCLUSIVE_LOCKS_REQUIRED(wallet.cs_wallet);
bool OutputIsChange(const CWallet &wallet, const CTxOut &txout)
    EXCLUSIVE_LOCKS_REQUIRED(wallet.cs_wallet);
Amount OutputGetChange(const CWallet &wallet, const CTxOut &txout)
    EXCLUSIVE_LOCKS_REQUIRED(wallet.cs_wallet);
Amount TxGetChange(const CWallet &wallet, const CTransaction &tx);

Amount CachedTxGetCredit(const CWallet &wallet, const CWalletTx &wtx,
                         const isminefilter &filter)
    EXCLUSIVE_LOCKS_REQUIRED(wallet.cs_wallet);
//! filter decides which addresses will count towards the debit
Amount CachedTxGetDebit(const CWallet &wallet, const CWalletTx &wtx,
                        const isminefilter &filter);
Amount CachedTxGetChange(const CWallet &wallet, const CWalletTx &wtx);
Amount CachedTxGetImmatureCredit(const CWallet &wallet, const CWalletTx &wtx,
                                 bool fUseCache = true)
    EXCLUSIVE_LOCKS_REQUIRED(wallet.cs_wallet);
Amount CachedTxGetImmatureWatchOnlyCredit(const CWallet &wallet,
                                          const CWalletTx &wtx,
                                          const bool fUseCache = true)
    EXCLUSIVE_LOCKS_REQUIRED(wallet.cs_wallet);
Amount CachedTxGetAvailableCredit(const CWallet &wallet, const CWalletTx &wtx,
                                  bool fUseCache = true,
                                  const isminefilter &filter = ISMINE_SPENDABLE)
    EXCLUSIVE_LOCKS_REQUIRED(wallet.cs_wallet);
;

struct COutputEntry {
    CTxDestination destination;
    Amount amount;
    int vout;
};
void CachedTxGetAmounts(const CWallet &wallet, const CWalletTx &wtx,
                        std::list<COutputEntry> &listReceived,
                        std::list<COutputEntry> &listSent, Amount &nFee,
                        const isminefilter &filter);
bool CachedTxIsFromMe(const CWallet &wallet, const CWalletTx &wtx,
                      const isminefilter &filter);
bool CachedTxIsTrusted(const CWallet &wallet, const CWalletTx &wtx,
                       std::set<TxId> &trusted_parents)
    EXCLUSIVE_LOCKS_REQUIRED(wallet.cs_wallet);
bool CachedTxIsTrusted(const CWallet &wallet, const CWalletTx &wtx);

struct Balance {
    //! Trusted, at depth=GetBalance.min_depth or more
    Amount m_mine_trusted{Amount::zero()};
    //! Untrusted, but in mempool (pending)
    Amount m_mine_untrusted_pending{Amount::zero()};
    //! Immature coinbases in the main chain
    Amount m_mine_immature{Amount::zero()};
    Amount m_watchonly_trusted{Amount::zero()};
    Amount m_watchonly_untrusted_pending{Amount::zero()};
    Amount m_watchonly_immature{Amount::zero()};
};

Balance GetBalance(const CWallet &wallet, int min_depth = 0,
                   bool avoid_reuse = true);

std::map<CTxDestination, Amount> GetAddressBalances(const CWallet &wallet);
std::set<std::set<CTxDestination>> GetAddressGroupings(const CWallet &wallet)
    EXCLUSIVE_LOCKS_REQUIRED(wallet.cs_wallet);

#endif // BITCOIN_WALLET_RECEIVE_H

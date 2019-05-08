// Copyright (c) 2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <interfaces/wallet.h>

#include <amount.h>
#include <chain.h>
#include <consensus/validation.h>
#include <interfaces/handler.h>
#include <net.h>
#include <policy/policy.h>
#include <primitives/transaction.h>
#include <script/ismine.h>
#include <script/standard.h>
#include <support/allocators/secure.h>
#include <sync.h>
#include <timedata.h>
#include <ui_interface.h>
#include <validation.h>
#include <wallet/finaltx.h>
#include <wallet/wallet.h>

#include <memory>

namespace interfaces {
namespace {

    class PendingWalletTxImpl : public PendingWalletTx {
    public:
        PendingWalletTxImpl(CWallet &wallet)
            : m_wallet(wallet), m_key(&wallet) {}

        const CTransaction &get() override { return *m_tx; }

        bool commit(WalletValueMap value_map, WalletOrderForm order_form,
                    std::string from_account,
                    std::string &reject_reason) override {
            LOCK2(cs_main, m_wallet.cs_wallet);
            CValidationState state;
            if (!m_wallet.CommitTransaction(
                    m_tx, std::move(value_map), std::move(order_form),
                    std::move(from_account), m_key, g_connman.get(), state)) {
                reject_reason = state.GetRejectReason();
                return false;
            }
            return true;
        }

        CTransactionRef m_tx;
        CWallet &m_wallet;
        CReserveKey m_key;
    };

    //! Construct wallet tx struct.
    WalletTx MakeWalletTx(CWallet &wallet, const CWalletTx &wtx) {
        WalletTx result;
        result.tx = wtx.tx;
        result.txin_is_mine.reserve(wtx.tx->vin.size());
        for (const auto &txin : wtx.tx->vin) {
            result.txin_is_mine.emplace_back(wallet.IsMine(txin));
        }
        result.txout_is_mine.reserve(wtx.tx->vout.size());
        result.txout_address.reserve(wtx.tx->vout.size());
        result.txout_address_is_mine.reserve(wtx.tx->vout.size());
        for (const auto &txout : wtx.tx->vout) {
            result.txout_is_mine.emplace_back(wallet.IsMine(txout));
            result.txout_address.emplace_back();
            result.txout_address_is_mine.emplace_back(
                ExtractDestination(txout.scriptPubKey,
                                   result.txout_address.back())
                    ? IsMine(wallet, result.txout_address.back())
                    : ISMINE_NO);
        }
        result.credit = wtx.GetCredit(ISMINE_ALL);
        result.debit = wtx.GetDebit(ISMINE_ALL);
        result.change = wtx.GetChange();
        result.time = wtx.GetTxTime();
        result.value_map = wtx.mapValue;
        result.is_coinbase = wtx.IsCoinBase();
        return result;
    }

    //! Construct wallet tx status struct.
    WalletTxStatus MakeWalletTxStatus(const CWalletTx &wtx) {
        WalletTxStatus result;
        CBlockIndex *block = LookupBlockIndex(wtx.hashBlock);
        result.block_height =
            (block ? block->nHeight : std::numeric_limits<int>::max()),
        result.blocks_to_maturity = wtx.GetBlocksToMaturity();
        result.depth_in_main_chain = wtx.GetDepthInMainChain();
        result.request_count = wtx.GetRequestCount();
        result.time_received = wtx.nTimeReceived;
        result.lock_time = wtx.tx->nLockTime;
        result.is_final = CheckFinalTx(*wtx.tx);
        result.is_trusted = wtx.IsTrusted();
        result.is_abandoned = wtx.isAbandoned();
        result.is_coinbase = wtx.IsCoinBase();
        result.is_in_main_chain = wtx.IsInMainChain();
        return result;
    }

    //! Construct wallet TxOut struct.
    WalletTxOut MakeWalletTxOut(CWallet &wallet, const CWalletTx &wtx, int n,
                                int depth) {
        WalletTxOut result;
        result.txout = wtx.tx->vout[n];
        result.time = wtx.GetTxTime();
        result.depth_in_main_chain = depth;
        result.is_spent = wallet.IsSpent(wtx.GetId(), n);
        return result;
    }

    class WalletImpl : public Wallet {
    public:
        WalletImpl(CWallet &wallet) : m_wallet(wallet) {}

        bool encryptWallet(const SecureString &wallet_passphrase) override {
            return m_wallet.EncryptWallet(wallet_passphrase);
        }
        bool isCrypted() override { return m_wallet.IsCrypted(); }
        bool lock() override { return m_wallet.Lock(); }
        bool unlock(const SecureString &wallet_passphrase) override {
            return m_wallet.Unlock(wallet_passphrase);
        }
        bool isLocked() override { return m_wallet.IsLocked(); }
        bool changeWalletPassphrase(
            const SecureString &old_wallet_passphrase,
            const SecureString &new_wallet_passphrase) override {
            return m_wallet.ChangeWalletPassphrase(old_wallet_passphrase,
                                                   new_wallet_passphrase);
        }
        bool backupWallet(const std::string &filename) override {
            return m_wallet.BackupWallet(filename);
        }
        std::string getWalletName() override { return m_wallet.GetName(); }
        std::set<CTxDestination>
        getLabelAddresses(const std::string &label) override {
            return m_wallet.GetLabelAddresses(label);
        };
        bool getKeyFromPool(bool internal, CPubKey &pub_key) override {
            return m_wallet.GetKeyFromPool(pub_key, internal);
        }
        const CChainParams &getChainParams() override {
            return m_wallet.chainParams;
        }
        bool getPubKey(const CKeyID &address, CPubKey &pub_key) override {
            return m_wallet.GetPubKey(address, pub_key);
        }
        bool getPrivKey(const CKeyID &address, CKey &key) override {
            return m_wallet.GetKey(address, key);
        }
        bool isSpendable(const CTxDestination &dest) override {
            return IsMine(m_wallet, dest) & ISMINE_SPENDABLE;
        }
        bool haveWatchOnly() override { return m_wallet.HaveWatchOnly(); };
        bool setAddressBook(const CTxDestination &dest, const std::string &name,
                            const std::string &purpose) override {
            return m_wallet.SetAddressBook(dest, name, purpose);
        }
        bool delAddressBook(const CTxDestination &dest) override {
            return m_wallet.DelAddressBook(dest);
        }
        bool getAddress(const CTxDestination &dest, std::string *name,
                        isminetype *is_mine) override {
            LOCK(m_wallet.cs_wallet);
            auto it = m_wallet.mapAddressBook.find(dest);
            if (it == m_wallet.mapAddressBook.end()) {
                return false;
            }
            if (name) {
                *name = it->second.name;
            }
            if (is_mine) {
                *is_mine = IsMine(m_wallet, dest);
            }
            return true;
        }
        std::vector<WalletAddress> getAddresses() override {
            LOCK(m_wallet.cs_wallet);
            std::vector<WalletAddress> result;
            for (const auto &item : m_wallet.mapAddressBook) {
                result.emplace_back(item.first, IsMine(m_wallet, item.first),
                                    item.second.name, item.second.purpose);
            }
            return result;
        }
        bool addDestData(const CTxDestination &dest, const std::string &key,
                         const std::string &value) override {
            LOCK(m_wallet.cs_wallet);
            return m_wallet.AddDestData(dest, key, value);
        }
        bool eraseDestData(const CTxDestination &dest,
                           const std::string &key) override {
            LOCK(m_wallet.cs_wallet);
            return m_wallet.EraseDestData(dest, key);
        }
        std::vector<std::string>
        getDestValues(const std::string &prefix) override {
            return m_wallet.GetDestValues(prefix);
        }
        void lockCoin(const COutPoint &output) override {
            LOCK2(cs_main, m_wallet.cs_wallet);
            return m_wallet.LockCoin(output);
        }
        void unlockCoin(const COutPoint &output) override {
            LOCK2(cs_main, m_wallet.cs_wallet);
            return m_wallet.UnlockCoin(output);
        }
        bool isLockedCoin(const COutPoint &output) override {
            LOCK2(cs_main, m_wallet.cs_wallet);
            return m_wallet.IsLockedCoin(output.GetTxId(), output.GetN());
        }
        void listLockedCoins(std::vector<COutPoint> &outputs) override {
            LOCK2(cs_main, m_wallet.cs_wallet);
            return m_wallet.ListLockedCoins(outputs);
        }
        std::unique_ptr<PendingWalletTx>
        createTransaction(const std::vector<CRecipient> &recipients,
                          const CCoinControl &coin_control, bool sign,
                          int &change_pos, Amount &fee,
                          std::string &fail_reason) override {
            LOCK2(cs_main, m_wallet.cs_wallet);
            auto pending = std::make_unique<PendingWalletTxImpl>(m_wallet);
            if (!m_wallet.CreateTransaction(recipients, pending->m_tx,
                                            pending->m_key, fee, change_pos,
                                            fail_reason, coin_control, sign)) {
                return {};
            }
            return std::move(pending);
        }
        bool transactionCanBeAbandoned(const TxId &txid) override {
            return m_wallet.TransactionCanBeAbandoned(txid);
        }
        bool abandonTransaction(const TxId &txid) override {
            LOCK2(cs_main, m_wallet.cs_wallet);
            return m_wallet.AbandonTransaction(txid);
        }
        CTransactionRef getTx(const TxId &txid) override {
            LOCK2(::cs_main, m_wallet.cs_wallet);
            auto mi = m_wallet.mapWallet.find(txid);
            if (mi != m_wallet.mapWallet.end()) {
                return mi->second.tx;
            }
            return {};
        }
        WalletTx getWalletTx(const TxId &txid) override {
            LOCK2(::cs_main, m_wallet.cs_wallet);
            auto mi = m_wallet.mapWallet.find(txid);
            if (mi != m_wallet.mapWallet.end()) {
                return MakeWalletTx(m_wallet, mi->second);
            }
            return {};
        }
        std::vector<WalletTx> getWalletTxs() override {
            LOCK2(::cs_main, m_wallet.cs_wallet);
            std::vector<WalletTx> result;
            result.reserve(m_wallet.mapWallet.size());
            for (const auto &entry : m_wallet.mapWallet) {
                result.emplace_back(MakeWalletTx(m_wallet, entry.second));
            }
            return result;
        }
        bool tryGetTxStatus(const TxId &txid,
                            interfaces::WalletTxStatus &tx_status,
                            int &num_blocks, int64_t &adjusted_time) override {
            TRY_LOCK(::cs_main, locked_chain);
            if (!locked_chain) {
                return false;
            }
            TRY_LOCK(m_wallet.cs_wallet, locked_wallet);
            if (!locked_wallet) {
                return false;
            }
            auto mi = m_wallet.mapWallet.find(txid);
            if (mi == m_wallet.mapWallet.end()) {
                return false;
            }
            num_blocks = ::chainActive.Height();
            adjusted_time = GetAdjustedTime();
            tx_status = MakeWalletTxStatus(mi->second);
            return true;
        }
        WalletTx getWalletTxDetails(const TxId &txid, WalletTxStatus &tx_status,
                                    WalletOrderForm &order_form,
                                    bool &in_mempool, int &num_blocks,
                                    int64_t &adjusted_time) override {
            LOCK2(::cs_main, m_wallet.cs_wallet);
            auto mi = m_wallet.mapWallet.find(txid);
            if (mi != m_wallet.mapWallet.end()) {
                num_blocks = ::chainActive.Height();
                adjusted_time = GetAdjustedTime();
                in_mempool = mi->second.InMempool();
                order_form = mi->second.vOrderForm;
                tx_status = MakeWalletTxStatus(mi->second);
                return MakeWalletTx(m_wallet, mi->second);
            }
            return {};
        }
        WalletBalances getBalances() override {
            WalletBalances result;
            result.balance = m_wallet.GetBalance();
            result.unconfirmed_balance = m_wallet.GetUnconfirmedBalance();
            result.immature_balance = m_wallet.GetImmatureBalance();
            result.have_watch_only = m_wallet.HaveWatchOnly();
            if (result.have_watch_only) {
                result.watch_only_balance = m_wallet.GetWatchOnlyBalance();
                result.unconfirmed_watch_only_balance =
                    m_wallet.GetUnconfirmedWatchOnlyBalance();
                result.immature_watch_only_balance =
                    m_wallet.GetImmatureWatchOnlyBalance();
            }
            return result;
        }
        bool tryGetBalances(WalletBalances &balances,
                            int &num_blocks) override {
            TRY_LOCK(cs_main, locked_chain);
            if (!locked_chain) {
                return false;
            }
            TRY_LOCK(m_wallet.cs_wallet, locked_wallet);
            if (!locked_wallet) {
                return false;
            }
            balances = getBalances();
            num_blocks = ::chainActive.Height();
            return true;
        }
        Amount getBalance() override { return m_wallet.GetBalance(); }
        Amount getAvailableBalance(const CCoinControl &coin_control) override {
            return m_wallet.GetAvailableBalance(&coin_control);
        }
        isminetype txinIsMine(const CTxIn &txin) override {
            LOCK2(::cs_main, m_wallet.cs_wallet);
            return m_wallet.IsMine(txin);
        }
        isminetype txoutIsMine(const CTxOut &txout) override {
            LOCK2(::cs_main, m_wallet.cs_wallet);
            return m_wallet.IsMine(txout);
        }
        Amount getDebit(const CTxIn &txin, isminefilter filter) override {
            LOCK2(::cs_main, m_wallet.cs_wallet);
            return m_wallet.GetDebit(txin, filter);
        }
        Amount getCredit(const CTxOut &txout, isminefilter filter) override {
            LOCK2(::cs_main, m_wallet.cs_wallet);
            return m_wallet.GetCredit(txout, filter);
        }
        CoinsList listCoins() override {
            LOCK2(::cs_main, m_wallet.cs_wallet);
            CoinsList result;
            for (const auto &entry : m_wallet.ListCoins()) {
                auto &group = result[entry.first];
                for (const auto &coin : entry.second) {
                    group.emplace_back(COutPoint(coin.tx->GetId(), coin.i),
                                       MakeWalletTxOut(m_wallet, *coin.tx,
                                                       coin.i, coin.nDepth));
                }
            }
            return result;
        }
        std::vector<WalletTxOut>
        getCoins(const std::vector<COutPoint> &outputs) override {
            LOCK2(::cs_main, m_wallet.cs_wallet);
            std::vector<WalletTxOut> result;
            result.reserve(outputs.size());
            for (const auto &output : outputs) {
                result.emplace_back();
                auto it = m_wallet.mapWallet.find(output.GetTxId());
                if (it != m_wallet.mapWallet.end()) {
                    int depth = it->second.GetDepthInMainChain();
                    if (depth >= 0) {
                        result.back() = MakeWalletTxOut(m_wallet, it->second,
                                                        output.GetN(), depth);
                    }
                }
            }
            return result;
        }
        bool hdEnabled() override { return m_wallet.IsHDEnabled(); }
        std::unique_ptr<Handler>
        handleShowProgress(ShowProgressFn fn) override {
            return MakeHandler(m_wallet.ShowProgress.connect(fn));
        }
        std::unique_ptr<Handler>
        handleStatusChanged(StatusChangedFn fn) override {
            return MakeHandler(m_wallet.NotifyStatusChanged.connect(
                [fn](CCryptoKeyStore *) { fn(); }));
        }
        std::unique_ptr<Handler>
        handleAddressBookChanged(AddressBookChangedFn fn) override {
            return MakeHandler(m_wallet.NotifyAddressBookChanged.connect(
                [fn](CWallet *, const CTxDestination &address,
                     const std::string &label, bool is_mine,
                     const std::string &purpose, ChangeType status) {
                    fn(address, label, is_mine, purpose, status);
                }));
        }
        std::unique_ptr<Handler>
        handleTransactionChanged(TransactionChangedFn fn) override {
            return MakeHandler(m_wallet.NotifyTransactionChanged.connect(
                [fn, this](CWallet *, const TxId &txid, ChangeType status) {
                    fn(txid, status);
                }));
        }
        std::unique_ptr<Handler>
        handleWatchOnlyChanged(WatchOnlyChangedFn fn) override {
            return MakeHandler(m_wallet.NotifyWatchonlyChanged.connect(fn));
        }

        CWallet &m_wallet;
    };

} // namespace

std::unique_ptr<Wallet> MakeWallet(CWallet &wallet) {
    return std::make_unique<WalletImpl>(wallet);
}

} // namespace interfaces
